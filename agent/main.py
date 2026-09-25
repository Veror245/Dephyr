import os
import re
import json
import time
import logging
from datetime import datetime, timezone
from typing import TypedDict, Optional, List, Dict, Any, Literal, Generator, Annotated
from dotenv import load_dotenv
from pydantic import BaseModel, Field
import requests

from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import BaseMessage, SystemMessage, HumanMessage
from langchain_core.tools import tool
from langgraph.graph.message import add_messages
from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode

load_dotenv()
logger = logging.getLogger("dephyr.agent")

# ============================================================================
# CONFIGURATION
# ============================================================================
BACKEND_BASE_URL = os.getenv("DEPHYR_BACKEND_URL", "http://localhost:8000")
BACKEND_TIMEOUT_S = float(os.getenv("DEPHYR_BACKEND_TIMEOUT_S", "15"))
MOCK_MODE = os.getenv("DEPHYR_MOCK_MODE", "true").lower() == "true"
EMIT_HTTP = os.getenv("DEPHYR_EMIT_HTTP", "false").lower() == "true"

def _post(path: str, payload: dict) -> dict:
    if MOCK_MODE and "agent-events" not in path:
        return {"status": "mock_success", "path": path}
    url = f"{BACKEND_BASE_URL}{path}"
    try:
        resp = requests.post(url, json=payload, timeout=BACKEND_TIMEOUT_S)
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException as e:
        logger.error(f"POST {url} failed: {e}")
        raise

def _get(path: str) -> dict:
    if MOCK_MODE:
        return {"status": "mock_success", "diff": "- old code\n+ new code"}
    url = f"{BACKEND_BASE_URL}{path}"
    try:
        resp = requests.get(url, timeout=BACKEND_TIMEOUT_S)
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException as e:
        logger.error(f"GET {url} failed: {e}")
        raise

# ============================================================================
# SCHEMAS & EVENTS
# ============================================================================
class ExposureReport(BaseModel):
    exposure_level: Literal["SAFE", "LOW", "MEDIUM", "CRITICAL"] = Field(...)
    is_reachable: bool = Field(...)
    vulnerable_call_sites: List[str] = Field(default_factory=list)
    remediation_required: bool = Field(...)
    risk_summary: str = Field(...)

class AgentEvent(BaseModel):
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).strftime("%H:%M:%S"))
    node: str
    event_type: str = Field(...)
    message: str
    data: Dict[str, Any] = Field(default_factory=dict)

    def emit(self) -> None:
        if MOCK_MODE and not EMIT_HTTP:
            return
        try:
            _post("/agent-events", self.model_dump())
        except Exception:
            pass

class DephyrState(TypedDict):
    repo_name: str
    repo_path: str
    cve_id: str
    package_name: str
    vulnerable_symbol: str
    scan_results: Optional[dict]
    exposure_report: Optional[ExposureReport]
    messages: Annotated[list[BaseMessage], add_messages] # Tracks dynamic ReAct loop
    pr_id: Optional[str]
    ci_passed: bool

# ============================================================================
# DYNAMIC TOOLS
# ============================================================================
@tool
def create_branch(repo_name: str, branch_name: str) -> str:
    """Creates a new Git branch for the remediation."""
    _post("/repository/branch", {"repo_name": repo_name, "branch_name": branch_name})
    return f"Branch {branch_name} created successfully."

@tool
def bump_dependency(repo_name: str, package: str, target_version: str) -> str:
    """Upgrades a vulnerable dependency to a safe version."""
    _post("/repository/dependency/bump", {"repo_name": repo_name, "package": package, "version": target_version})
    return f"Bumped {package} to {target_version}."

@tool
def apply_known_migration(repo_name: str, file_path: str, migration_type: str) -> str:
    """Applies a standard API migration if the dependency bump introduced breaking changes."""
    _post("/repository/migration/apply", {"repo_name": repo_name, "file_path": file_path, "migration_type": migration_type})
    return f"Applied {migration_type} migration to {file_path}."

@tool
def create_pull_request(repo_name: str, branch_name: str, title: str) -> str:
    """Opens a formal Pull Request on GitHub so the CI tests can start."""
    _post("/pull-requests", {"repo_name": repo_name, "branch_name": branch_name, "title": title})
    return f"Pull request '{title}' opened successfully for branch {branch_name}."

@tool
def inspect_diff(pr_id: str) -> str:
    """Retrieves the Git diff of the current proposed changes to verify correctness."""
    res = _get(f"/pull-requests/{pr_id}/diff")
    return json.dumps(res)

@tool
def apply_followup_patch(pr_id: str, file_path: str, replacement_code: str) -> str:
    """Pushes a custom code patch to fix a failing CI build."""
    _post(f"/pull-requests/{pr_id}/retry", {"file_path": file_path, "replacement_code": replacement_code})
    return "Patch pushed successfully."

@tool
def rerun_verification(pr_id: str) -> str:
    """Triggers CI pipeline to run again. Call this after bumping, creating a PR, or patching to check if tests pass."""
    if MOCK_MODE:
        return json.dumps({"passed": True, "raw_logs": ""})
    res = _post(f"/pull-requests/{pr_id}/verify", {})
    return json.dumps(res)

agent_tools = [
    create_branch, bump_dependency, apply_known_migration, 
    create_pull_request, inspect_diff, apply_followup_patch, rerun_verification
]

# ============================================================================
# LLM & STATIC NODES
# ============================================================================
groq_llm = ChatGroq(
    model="llama3-70b-8192", 
    temperature=0.0,
    max_retries=2
)

analyst_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are Dephyr's Security Analyst. Evaluate the Rust AST scan. Output an ExposureReport."),
    ("human", "Package: {package}\nSymbol: {symbol}\nScan Findings:\n{findings}")
])
analyst_chain = analyst_prompt | groq_llm.with_structured_output(ExposureReport)

def investigator_node(state: DephyrState) -> dict:
    if MOCK_MODE:
        findings = {"reachable": True, "input_tainted": True, "call_sites": ["src/api/query.js"]}
    else:
        findings = _post("/repositories/scan", {
            "repo_path": state["repo_path"],
            "package": state["package_name"],
            "symbol": state["vulnerable_symbol"]
        })
    return {"scan_results": findings}

def exposure_analyst_node(state: DephyrState) -> dict:
    report: ExposureReport = analyst_chain.invoke({
        "package": state["package_name"],
        "symbol": state["vulnerable_symbol"],
        "findings": json.dumps(state["scan_results"])
    })
    return {"exposure_report": report}

# ============================================================================
# DYNAMIC REACT AGENT NODE
# ============================================================================
dynamic_prompt = ChatPromptTemplate.from_messages([
    ("system", (
        "You are Dephyr's Autonomous Remediation Engineer. You must fix {cve_id} in repository {repo_name}. "
        "The exposure report is: {report}. "
        "Use your tools to create a branch, bump the dependency, open a Pull Request, patch breaking changes if tests fail, and verify via CI. "
        "Do not stop until `rerun_verification` confirms tests pass. If tests pass, stop calling tools and summarize your success."
    )),
    # Critical Fix: Groq requires at least one human message to not crash when {messages} is empty.
    ("human", "Begin or continue the remediation process. Check your tool results to decide the next step."),
    ("placeholder", "{messages}")
])

dynamic_chain = dynamic_prompt | groq_llm.bind_tools(agent_tools)

def dynamic_remediation_node(state: DephyrState) -> dict:
    """Evaluates the current state and decides which tool to call next."""
    response = dynamic_chain.invoke({
        "cve_id": state["cve_id"],
        "repo_name": state["repo_name"],
        "report": state["exposure_report"].model_dump_json(),
        "messages": state.get("messages", [])
    })
    return {"messages": [response]}

tool_executor_node = ToolNode(agent_tools)
# ============================================================================
# GRAPH ROUTING
# ============================================================================
def route_after_exposure(state: DephyrState) -> str:
    report = state.get("exposure_report")
    if not report or not report.remediation_required:
        return END
    return "dynamic_agent"

def route_tool_calls(state: DephyrState) -> str:
    last_message = state["messages"][-1]
    if hasattr(last_message, 'tool_calls') and last_message.tool_calls:
        return "execute_tools"
    return END

builder = StateGraph(DephyrState)
builder.add_node("investigator", investigator_node)
builder.add_node("exposure_analyst", exposure_analyst_node)
builder.add_node("dynamic_agent", dynamic_remediation_node)
builder.add_node("execute_tools", tool_executor_node)

builder.add_edge(START, "investigator")
builder.add_edge("investigator", "exposure_analyst")
builder.add_conditional_edges("exposure_analyst", route_after_exposure, ["dynamic_agent", END])

# The ReAct Loop
builder.add_conditional_edges("dynamic_agent", route_tool_calls, ["execute_tools", END])
builder.add_edge("execute_tools", "dynamic_agent")

dephyr_agent = builder.compile()


# ============================================================================
# STREAMING ENGINE
# ============================================================================
def stream_dephyr_agent(initial_state: DephyrState) -> Generator[AgentEvent, None, None]:
    start_event = AgentEvent(
        node="lifecycle", event_type="START",
        message=f"Autonomous response triggered for {initial_state['cve_id']}.",
        data={"cve": initial_state["cve_id"]}
    )
    start_event.emit()
    yield start_event

    for chunk in dephyr_agent.stream(initial_state, stream_mode="updates"):
        for node_name, updates in chunk.items():
            if node_name == "investigator":
                ev = AgentEvent(node=node_name, event_type="SCAN", message="AST scan complete.", data=updates["scan_results"])
                ev.emit(); yield ev

            elif node_name == "exposure_analyst":
                report: ExposureReport = updates["exposure_report"]
                ev = AgentEvent(node=node_name, event_type="RISK", message=f"Risk: {report.exposure_level}", data=report.model_dump())
                ev.emit(); yield ev

            elif node_name == "dynamic_agent":
                last_msg = updates["messages"][-1]
                if hasattr(last_msg, 'tool_calls') and last_msg.tool_calls:
                    for tc in last_msg.tool_calls:
                        ev = AgentEvent(node=node_name, event_type="DECISION", message=f"Calling: {tc['name']}", data=tc)
                        ev.emit(); yield ev
                elif last_msg.content:
                    ev = AgentEvent(node=node_name, event_type="REASONING", message=last_msg.content, data={})
                    ev.emit(); yield ev

            elif node_name == "execute_tools":
                for msg in updates.get("messages", []):
                    ev = AgentEvent(node=node_name, event_type="ACTION_RESULT", message=f"Tool {msg.name} executed.", data={"result": msg.content})
                    ev.emit(); yield ev

    end_event = AgentEvent(node="lifecycle", event_type="COMPLETE", message="Workflow concluded.", data={})
    end_event.emit()
    yield end_event

# ============================================================================
# CONSOLE HARNESS
# ============================================================================
if __name__ == "__main__":
    test_scenario: DephyrState = {
        "repo_name": "repo-critical",
        "repo_path": "./mock_repos/repo-critical",
        "cve_id": "CVE-2024-3012",
        "package_name": "example-lib",
        "vulnerable_symbol": "parseQuery",
        "scan_results": None,
        "exposure_report": None,
        "messages": [],
        "pr_id": "pr-42",
        "ci_passed": False
    }

    print("=" * 70)
    print("      DEPHYR AUTONOMOUS SECURITY AGENT - DYNAMIC REACT LOOP")
    print("=" * 70)

    for event in stream_dephyr_agent(test_scenario):
        print(f"[{event.timestamp}] [{event.event_type:<14}] {event.message}")
        time.sleep(0.3)