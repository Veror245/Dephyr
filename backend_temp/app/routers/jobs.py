import asyncio
import json
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from app.db import store
from app.runtime import runtime
router = APIRouter(prefix='/jobs', tags=['Jobs and events'])

@router.get('/{job_id}')
async def job(job_id: str):
    result = await store.get_job(job_id)
    if not result:
        raise HTTPException(404, 'Job not found')
    return result

@router.get('/{job_id}/events')
async def events(job_id: str, after: int = Query(0, ge=0)):
    if not await store.get_job(job_id):
        raise HTTPException(404, 'Job not found')
    return await store.events(job_id, after)

@router.get('/{job_id}/stream')
async def stream(job_id: str, after: int = Query(0, ge=0)):
    if not await store.get_job(job_id):
        raise HTTPException(404, 'Job not found')
    q = asyncio.Queue(maxsize=100)
    runtime.listeners[job_id].add(q)
    async def generate():
        cursor = after
        try:
            while True:
                history = await store.events(job_id, cursor)
                for event in history:
                    cursor = event['id']
                    yield f'id: {cursor}\nevent: {event["type"]}\ndata: {json.dumps(event)}\n\n'
                try:
                    await asyncio.wait_for(q.get(), timeout=15)
                except TimeoutError:
                    yield ': keepalive\n\n'
        finally:
            runtime.listeners[job_id].discard(q)
    return StreamingResponse(generate(), media_type='text/event-stream',
                             headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'})
