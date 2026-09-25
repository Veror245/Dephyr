import time
from typing import Generator

from config import MOCK_MODE, BACKEND_BASE_URL
from state import DephyrState, AgentEvent, ExposureReport
from graph import dephyr_agent

# ============================================================================
# STREAMING ENGINE
# ============================================================================
def stream_dephyr_agent(initial_state: DephyrState) -> Generator[AgentEvent, None, None]:
    start_event = AgentEvent(
        node="lifecycle", event_type="START",
        message=f"Autonomous response triggered for {initial_state['cve_id']}.",
        data={"cve": initial_state['cve_id']}
    )
    yield start_event

    for chunk in dephyr_agent.stream(initial_state, stream_mode="updates"):
        for node_name, updates in chunk.items():
            if node_name == "investigator":
                yield AgentEvent(node=node_name, event_type="SCAN", message="AST scan complete.", data=updates["scan_results"])

            elif node_name == "exposure_analyst":
                report: ExposureReport = updates["exposure_report"]
                yield AgentEvent(node=node_name, event_type="RISK", message=f"Risk: {report.exposure_level}", data=report.model_dump())

            elif node_name == "dynamic_agent":
                last_msg = updates["messages"][-1]
                if hasattr(last_msg, 'tool_calls') and last_msg.tool_calls:
                    for tc in last_msg.tool_calls:
                        yield AgentEvent(node=node_name, event_type="DECISION", message=f"Calling: {tc['name']}", data=tc)
                elif last_msg.content:
                    yield AgentEvent(node=node_name, event_type="REASONING", message=last_msg.content, data={})

            elif node_name == "execute_tools":
                for msg in updates.get("messages", []):
                    yield AgentEvent(node=node_name, event_type="ACTION_RESULT", message=f"Tool {msg.name} executed.", data={"result": msg.content})

    yield AgentEvent(node="lifecycle", event_type="COMPLETE", message="Workflow concluded.", data={})

# ============================================================================
# CONSOLE HARNESS
# ============================================================================
if __name__ == "__main__":
    test_scenario: DephyrState = {
        "repo_name": "dephyr-demo/repo-c", # Ensure this is in your allowed list
        "repo_path": "./workspace",
        "cve_id": "CVE-2024-3012",
        "package_name": "requests",
        "vulnerable_symbol": "process_data",
        "scan_results": None,
        "exposure_report": None,
        "messages": [],
        "pr_id": None,
        "ci_passed": False
    }

    print("=" * 70)
    print("      DEPHYR AUTONOMOUS SECURITY AGENT - DYNAMIC REACT LOOP")
    print(f"      MOCK_MODE={MOCK_MODE}   BACKEND={BACKEND_BASE_URL}")
    print("=" * 70)

    for event in stream_dephyr_agent(test_scenario):
        print(f"[{event.timestamp}] [{event.event_type:<14}] {event.message}")
        time.sleep(0.1)