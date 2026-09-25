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