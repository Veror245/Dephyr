import json
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langgraph.prebuilt import ToolNode

from config import _post, MOCK_MODE
from state import DephyrState, ExposureReport
from tools import agent_tools

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