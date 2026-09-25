import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix='/agent', tags=['Agent Orchestration'])

class AgentPayload(BaseModel):
    repo_name: str
    cve_id: str
    package_name: str
    vulnerable_symbol: str

@router.post('/dispatch')
async def dispatch_agent(payload: AgentPayload):
    """Forwards the fix request to the locally running Dephyr Agent on port 8001."""
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            # Hitting your agent's /trigger endpoint
            response = await client.post("http://127.0.0.1:8001/trigger", json=payload.model_dump())
            response.raise_for_status()
            return response.json()
        except httpx.RequestError as exc:
            raise HTTPException(502, f"Failed to wake up the Agent: {exc}")