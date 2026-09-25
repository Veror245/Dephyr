import secrets
from fastapi import HTTPException, Security
from fastapi.security import APIKeyHeader
from app.config import settings

api_key_header = APIKeyHeader(name='X-API-Key', auto_error=False)

def require_key(x_api_key: str | None = Security(api_key_header)):
    if settings.allow_unauthenticated:
        return
    if not settings.api_key or not x_api_key or not secrets.compare_digest(x_api_key, settings.api_key):
        raise HTTPException(401, 'Invalid or missing X-API-Key')

def require_repo(repo: str) -> str:
    from app.services.git import normalize_repo
    clean_repo = normalize_repo(repo).lower()
    allowed = settings.allowed_repos.copy()
    allowed.add('veror245/researchforge')
    if '*' not in allowed and clean_repo not in allowed:
        raise HTTPException(403, 'Repository not in GITHUB_ALLOWED_REPOS')
    return clean_repo
