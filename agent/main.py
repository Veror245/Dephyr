import time
from typing import Generator
import uvicorn
from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel

from config import MOCK_MODE, BACKEND_BASE_URL
from state import DephyrState, AgentEvent, ExposureReport
from graph import dephyr_agent

# ============================================================================
# STREAMING ENGINE (Remains exactly the same)
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
# MICROSERVICE LISTENER (Replaces the hardcoded console harness)
# ============================================================================
app = FastAPI(title="Dephyr Agent")

class AgentPayload(BaseModel):
    repo_name: str
    cve_id: str
    package_name: str
    vulnerable_symbol: str

def run_react_loop(payload: AgentPayload):
    state: DephyrState = {
        "repo_name": payload.repo_name,
        "repo_path": "./workspace",
        "cve_id": payload.cve_id,
        "package_name": payload.package_name,
        "vulnerable_symbol": payload.vulnerable_symbol,
        "scan_results": None,
        "exposure_report": None,
        "messages": [],
        "pr_id": None,
        "ci_passed": False
    }
    
    print(f"\n>>> AGENT DEPLOYED: Commencing remediation for {payload.cve_id} on {payload.repo_name}")
    for event in stream_dephyr_agent(state):
        print(f"[{event.timestamp}] [{event.event_type:<14}] {event.message}")
        time.sleep(0.1)

@app.post("/trigger")
async def trigger_agent(payload: AgentPayload, bg_tasks: BackgroundTasks):
    # Runs the LLM loop in the background so the HTTP request doesn't hang
    bg_tasks.add_task(run_react_loop, payload)
    return {"status": "Agent dispatched successfully", "target": payload.cve_id}

if __name__ == "__main__":
    print("=" * 70)
    print("      DEPHYR AUTONOMOUS SECURITY AGENT - LISTENING ON PORT 8001")
    print(f"      MOCK_MODE={MOCK_MODE}   BACKEND={BACKEND_BASE_URL}")
    print("=" * 70)
    # Agent runs on 8001 so it doesn't collide with Person 2's backend on 8000
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="warning")