import shutil
from fastapi import APIRouter, Request
from app.models import RepoRef, ScanRequest
from app.security import require_repo
from app.services.github import GitHub
from app.services.git import clone
from app.services.rust import RustClient
from app.runtime import runtime

router = APIRouter(prefix='/repositories', tags=['Repositories'])

@router.post('/metadata')
async def metadata(body: RepoRef, request: Request):
    require_repo(body.repo)
    data = await GitHub(request.app.state.http).repo(body.repo)
    return {'full_name': data['full_name'], 'default_branch': data['default_branch'],
            'private': data['private'], 'html_url': data['html_url']}

@router.post('/scan', status_code=202)
async def scan(body: ScanRequest, request: Request):
    require_repo(body.repo)
    http = request.app.state.http
    async def worker(job_id):
        root = await clone(body.repo, (await GitHub(http).repo(body.repo))['default_branch'])
        try:
            await runtime.emit(job_id, 'REPOSITORY_CLONED', 'Repository cloned')
            result = await RustClient(http).scan(root, body.package, body.vulnerable_function)
            await runtime.emit(job_id, 'SCAN_RESULT', 'Rust analysis received', result)
            return result
        finally:
            shutil.rmtree(root, ignore_errors=True)
    return await runtime.submit('scan', body.repo, body.cve_id, worker, git_job=True)
