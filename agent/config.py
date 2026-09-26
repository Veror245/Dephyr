import os
import time
import logging
import requests
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("dephyr.agent")

# ============================================================================
# CONFIGURATION
# ============================================================================
BACKEND_BASE_URL = os.getenv("DEPHYR_BACKEND_URL", "http://localhost:8000").rstrip("/")
API_KEY = os.getenv("DEPHYR_API_KEY", "")
BACKEND_TIMEOUT_S = float(os.getenv("DEPHYR_BACKEND_TIMEOUT_S", "30"))
MOCK_MODE = os.getenv("DEPHYR_MOCK_MODE", "false").lower() == "true"

def _get_headers() -> dict:
    return {"X-API-Key": API_KEY} if API_KEY else {}

def _post(path: str, payload: dict) -> dict:
    if MOCK_MODE:
        return {"status": "mock_success", "path": path}
    url = f"{BACKEND_BASE_URL}{path}"
    try:
        resp = requests.post(url, json=payload, headers=_get_headers(), timeout=BACKEND_TIMEOUT_S)
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException as e:
        logger.error(f"POST {url} failed: {e}")
        raise

def _post_and_wait(path: str, payload: dict) -> dict:
    """Posts to an async endpoint, gets a job_id, and polls until completed."""
    if MOCK_MODE:
        return _post(path, payload)
    
    data = _post(path, payload)
    if "job_id" not in data:
        return data # Was a synchronous endpoint

    job_id = data["job_id"]
    logger.info(f"Tracking async job: {job_id}")
    
    while True:
        time.sleep(2)
        url = f"{BACKEND_BASE_URL}/jobs/{job_id}"
        try:
            resp = requests.get(url, headers=_get_headers(), timeout=BACKEND_TIMEOUT_S)
            resp.raise_for_status()
            job_data = resp.json()
            
            if job_data["status"] == "completed":
                return job_data.get("result", {})
            elif job_data["status"] in ("failed", "interrupted"):
                raise Exception(f"Backend Job {job_id} failed: {job_data.get('error')}")
        except requests.RequestException as e:
            logger.error(f"Polling job {job_id} failed: {e}")
            raise