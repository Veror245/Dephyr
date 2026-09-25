from langgraph.graph import StateGraph, START, END
from state import DephyrState
from nodes import (
    investigator_node, 
    exposure_analyst_node, 
    dynamic_remediation_node, 
    tool_executor_node
)

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