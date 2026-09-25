import shutil
import uuid
from fastapi import APIRouter, Request
from app.models import RemediationRequest, FollowupRequest
from app.security import require_repo
from app.services.github import GitHub
from app.services.git import clone, git, commit_and_push
from app.runtime import runtime

router = APIRouter(prefix='/remediation', tags=['Remediation'])

@router.post('/apply', status_code=202)
async def apply(body: RemediationRequest, request: Request):
    clean_repo = require_repo(body.repo)
    http = request.app.state.http
    async def worker(job_id):
        root = await clone(clean_repo, body.base_branch)
        branch = 'dephyr/' + body.cve_id.lower() + '-' + uuid.uuid4().hex[:8]
        try:
            await git('checkout', '-b', branch, cwd=root)
            sha = await commit_and_push(root, branch, body.patches, f'Dephyr: fix {body.cve_id}')
            await runtime.emit(job_id, 'COMMIT_PUSHED', 'Remediation commit pushed', {'sha': sha})
            pr = await GitHub(http).create_pr(clean_repo, body.title, branch, body.base_branch, body.description)
            result = {'pull_request': pr['number'], 'url': pr['html_url'], 'branch': branch, 'sha': sha}
            await runtime.emit(job_id, 'PR_CREATED', 'Pull request opened', result)
            return result
        finally:
            shutil.rmtree(root, ignore_errors=True)
    return await runtime.submit('remediation', clean_repo, body.cve_id, worker, git_job=True)

@router.post('/followup', status_code=202)
async def followup(body: FollowupRequest):
    clean_repo = require_repo(body.repo)
    async def worker(job_id):
        root = await clone(clean_repo, body.branch)
        try:
            sha = await commit_and_push(root, body.branch, body.patches, body.message)
            result = {'sha': sha, 'branch': body.branch}
            await runtime.emit(job_id, 'FOLLOWUP_PUSHED', 'Follow-up commit pushed', result)
            return result
        finally:
            shutil.rmtree(root, ignore_errors=True)
    return await runtime.submit('followup', clean_repo, None, worker, git_job=True)
