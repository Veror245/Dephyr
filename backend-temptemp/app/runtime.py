import asyncio
import logging
import uuid
from collections import defaultdict
from datetime import datetime, timezone
from fastapi import HTTPException
from app.config import settings
from app.db import store
from app.models import Event

logger = logging.getLogger('dephyr')

class Runtime:
    def __init__(self):
        self.scan_limit = asyncio.Semaphore(settings.max_active_scans)
        self.git_limit = asyncio.Semaphore(settings.max_active_git_jobs)
        self.tasks: set[asyncio.Task] = set()
        self.listeners: dict[str, set[asyncio.Queue]] = defaultdict(set)
        self.client = None

    async def emit(self, job_id, kind, message, data=None):
        event = Event(job_id=job_id, type=kind, message=message, data=data or {},
                      timestamp=datetime.now(timezone.utc).isoformat())
        await store.add_event(event)
        for q in list(self.listeners[job_id]):
            try:
                q.put_nowait(event.model_dump())
            except asyncio.QueueFull:
                # Client can reconnect and replay durable events from SQLite.
                self.listeners[job_id].discard(q)

    async def submit(self, kind, repo, cve_id, worker=None, *, git_job=False):
        if callable(cve_id) and worker is None:
            worker = cve_id
            cve_id = None
        if len(self.tasks) >= 100:
            raise HTTPException(503, 'Job queue is full')
        job_id = uuid.uuid4().hex
        await store.create_job(job_id, kind, repo, cve_id)
        async def runner():
            limit = self.git_limit if git_job else self.scan_limit
            async with limit:
                await store.update_job(job_id, 'running')
                await self.emit(job_id, 'STARTED', f'{kind} started')
                try:
                    result = await worker(job_id)
                    await store.update_job(job_id, 'completed', result=result)
                    await self.emit(job_id, 'COMPLETED', f'{kind} completed', {'result': result})
                except asyncio.CancelledError:
                    await store.update_job(job_id, 'interrupted', error='Server shutting down')
                    raise
                except Exception as exc:
                    logger.exception('Job %s failed', job_id)
                    await store.update_job(job_id, 'failed', error='Operation failed; check server logs')
                    await self.emit(job_id, 'FAILED', f'{kind} failed', {'error': 'Operation failed'})
        task = asyncio.create_task(runner(), name=f'{kind}-{job_id}')
        self.tasks.add(task)
        task.add_done_callback(self.tasks.discard)
        return {'job_id': job_id, 'status': 'queued'}

runtime = Runtime()
