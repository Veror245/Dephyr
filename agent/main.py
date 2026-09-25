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