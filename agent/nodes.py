# nodes.py
import json
from langchain_core.prompts import ChatPromptTemplate
from langgraph.prebuilt import ToolNode

from config import _post_and_wait, MOCK_MODE
from state import DephyrState, ExposureReport
from tools import agent_tools
from langchain_ollama import ChatOllama

# ============================================================================
# LLM & STATIC NODES
# ============================================================================
# Initialize the local Ollama model
ollama_llm = ChatOllama(
    model="gemma4:31b-cloud",
    temperature=0.0,
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
analyst_chain = analyst_prompt | ollama_llm.with_structured_output(ExposureReport)

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
        "CRITICAL RULES: \n"
        "- NEVER call more than one tool at a time.\n"
        "- NEVER hallucinate or guess a tool name.\n"
        "- You MUST follow this exact strict sequence:\n"
        "  Step 1. Call `trigger_remediation` first. WAIT for the result.\n"
        "  Step 2. Call `check_ci_status` using the PR number from Step 1. WAIT for the result.\n"
        "  Step 3. If CI failed, call `get_ci_logs`. If CI passed, STOP and summarize.\n"
        "  Step 4. If you got logs, call `apply_followup_patch` to fix the code.\n"
    )),
    ("placeholder", "{messages}"),
    ("human", "Review the history above. If the CI passed, STOP and summarize. Otherwise, what is your EXACT next step? ONLY call one tool.")
])

dynamic_chain = dynamic_prompt | ollama_llm.bind_tools(agent_tools)

def dynamic_remediation_node(state: DephyrState) -> dict:
    print("\n[LLM DEBUG] ----- ENTERING REACT LOOP -----")
    print(f"[LLM DEBUG] Current Message History Length: {len(state.get('messages', []))}")
    
    response = dynamic_chain.invoke({
        "cve_id": state["cve_id"],
        "repo_name": state["repo_name"],
        "report": state["exposure_report"].model_dump_json(),
        "messages": state.get("messages", [])
    })
    
    print(f"[LLM DEBUG] Raw Text Output: {response.content}")
    
    if hasattr(response, 'tool_calls') and response.tool_calls:
        print(f"[LLM DEBUG] Tool Calls Detected: {response.tool_calls}")
    else:
        print("[LLM DEBUG] NO TOOL CALLS DETECTED. The model is responding with text only.")
        
    print("[LLM DEBUG] ---------------------------------")
    return {"messages": [response]}

tool_executor_node = ToolNode(agent_tools)