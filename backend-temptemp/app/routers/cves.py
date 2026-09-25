from fastapi import APIRouter, Query, Request
from app.services.cve import CVEService
router = APIRouter(prefix='/cves', tags=['CVEs'])

@router.get('/latest')
async def latest(request: Request, limit: int = Query(10, ge=1, le=50)):
    return {'cves': await CVEService(request.app.state.http).latest(limit)}

@router.get('/{cve_id}')
async def details(cve_id: str, request: Request):
    return await CVEService(request.app.state.http).fetch(cve_id)
