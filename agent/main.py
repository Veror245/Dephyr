import time
import json
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
    print(f"      MOCK_MODE={MOCK_MODE}   BACKEND={BACKEND_BASE_URL}")
    print("=" * 70)

    for event in stream_dephyr_agent(test_scenario):
        print(f"[{event.timestamp}] [{event.event_type:<14}] {event.message}")
        time.sleep(0.3)