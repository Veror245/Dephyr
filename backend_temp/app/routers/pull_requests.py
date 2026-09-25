from fastapi import APIRouter, Request, Query
from app.models import RepoRef
from app.security import require_repo
from app.services.github import GitHub
router = APIRouter(prefix='/pull-requests', tags=['Pull requests and CI'])

@router.post('/details')
async def details(body: RepoRef, request: Request, number: int = Query(ge=1)):
    clean_repo = require_repo(body.repo)
    pr = await GitHub(request.app.state.http).pull(clean_repo, number)
    return {'number': pr['number'], 'state': pr['state'], 'url': pr['html_url'],
            'head_sha': pr['head']['sha'], 'branch': pr['head']['ref']}

@router.post('/ci')
async def ci(body: RepoRef, request: Request, number: int = Query(ge=1)):
    clean_repo = require_repo(body.repo)
    return await GitHub(request.app.state.http).ci(clean_repo, number)

@router.post('/logs')
async def logs(body: RepoRef, request: Request, run_id: int = Query(ge=1)):
    clean_repo = require_repo(body.repo)
    return await GitHub(request.app.state.http).ci_logs(clean_repo, run_id)
