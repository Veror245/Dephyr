from datetime import datetime, timezone
from typing import TypedDict, Optional, List, Dict, Any, Literal, Annotated
from pydantic import BaseModel, Field
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages

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

class DephyrState(TypedDict):
    repo_name: str
    repo_path: str
    cve_id: str
    package_name: str
    vulnerable_symbol: str
    scan_results: Optional[dict]
    exposure_report: Optional[ExposureReport]
    messages: Annotated[list[BaseMessage], add_messages]
    pr_id: Optional[str]
    ci_passed: bool