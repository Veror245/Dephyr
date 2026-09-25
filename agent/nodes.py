import json
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langgraph.prebuilt import ToolNode

from config import _post_and_wait, MOCK_MODE
from state import DephyrState, ExposureReport
from tools import agent_tools

# ============================================================================
# LLM & STATIC NODES
# ============================================================================
groq_llm = ChatGroq(
   model="openai/gpt-oss-120b",
    temperature=0.0,
    max_retries=2
)

analyst_prompt = ChatPromptTemplate.from_messages([
    ("system", (
        "You are Dephyr's Security Analyst. Evaluate the following Rust AST JSON scan. "
        "The JSON contains a 'res' array. If the array has items, the symbol IS reachable. "
        "Look at the 'args' field in the 'calls' array to determine how the function is used. "
        "Classify the exposure and output an ExposureReport."
    )),
    ("human", "Package: {package}\nSymbol: {symbol}\nAST Scan JSON:\n{findings}")
])
analyst_chain = analyst_prompt | groq_llm.with_structured_output(ExposureReport)

def investigator_node(state: DephyrState) -> dict:
    if MOCK_MODE:
        findings = {"res": [{"file": "src/index.py", "calls": [{"function": state["vulnerable_symbol"], "args": "req.params"}]}]}
    else:
        # Uses _post_and_wait because /repositories/scan returns a job_id
        findings = _post_and_wait("/repositories/scan", {
            "repo": state["repo_name"],
            "package": state["package_name"],
            "version": "" 
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
        "Your workflow: \n"
        "1. Use `trigger_remediation` to bump the dependency and open a PR.\n"
        "2. Use `check_ci_status` with the returned PR number to see if tests pass.\n"
        "3. If CI fails, use `get_ci_logs` with the run_id to read the errors.\n"
        "4. Use `apply_followup_patch` to fix the broken code on the branch.\n"
        "5. Repeat CI checking until successful. Stop and summarize once CI passes."
    )),
    ("human", "Begin or continue the remediation process. Check your tool results to decide the next step."),
    ("placeholder", "{messages}")
])

dynamic_chain = dynamic_prompt | groq_llm.bind_tools(agent_tools)

def dynamic_remediation_node(state: DephyrState) -> dict:
    response = dynamic_chain.invoke({
        "cve_id": state["cve_id"],
        "repo_name": state["repo_name"],
        "report": state["exposure_report"].model_dump_json(),
        "messages": state.get("messages", [])
    })
    return {"messages": [response]}

tool_executor_node = ToolNode(agent_tools)