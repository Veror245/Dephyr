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