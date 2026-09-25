import asyncio
import logging
from contextlib import asynccontextmanager
import sys
from pathlib import Path

# Ensure dephyr-backend directory is on sys.path
_backend_dir = Path(__file__).resolve().parent.parent
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

import httpx
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.db import store
from app.runtime import runtime
from app.security import require_key
from app.routers import cves, repositories, remediation, pull_requests, jobs

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(name)s %(message)s')

@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.workspace.mkdir(parents=True, exist_ok=True)
    await store.open()
    # Jobs interrupted by a previous restart cannot be resumed automatically.
    await store.db.execute("UPDATE jobs SET status='interrupted', error='Server restarted' WHERE status IN ('running','queued')")
    await store.db.commit()
    async with httpx.AsyncClient(limits=httpx.Limits(max_connections=30, max_keepalive_connections=15),
                                 timeout=httpx.Timeout(20)) as client:
        app.state.http = client
        runtime.client = client
        yield
        for task in list(runtime.tasks):
            task.cancel()
        if runtime.tasks:
            await asyncio.gather(*runtime.tasks, return_exceptions=True)
    await store.close()

app = FastAPI(title='Dephyr Backend', version='1.0.0', lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[x.strip() for x in settings.allowed_origins.split(',') if x.strip()],
    allow_credentials=True,
    allow_methods=['GET', 'POST', 'OPTIONS'],
    allow_headers=['X-API-Key', 'Content-Type', 'Authorization', 'Accept'],
)

@app.get('/health')
async def health():
    return {'status': 'ok', 'service': 'dephyr-backend'}

for router in (cves.router, repositories.router, remediation.router, pull_requests.router, jobs.router):
    app.include_router(router, dependencies=[Depends(require_key)])
