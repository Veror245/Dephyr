import secrets
from fastapi import HTTPException, Security
from fastapi.security import APIKeyHeader
from app.config import settings

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def require_key(x_api_key: str | None = Security(api_key_header)):
    if settings.allow_unauthenticated:
        return
    if not settings.api_key:
        raise HTTPException(500, "Server misconfiguration: API_KEY is not configured on the backend while allow_unauthenticated is False")
    if not x_api_key or not secrets.compare_digest(x_api_key, settings.api_key):
        raise HTTPException(401, "Invalid or missing X-API-Key")


def require_repo(repo: str) -> str:
    from app.services.git import normalize_repo
    clean_repo = normalize_repo(repo).strip("/").removesuffix(".git")
    allowed = settings.allowed_repos.copy()
    if '*' not in allowed and clean_repo.lower() not in allowed:
        raise HTTPException(403, 'Repository not in GITHUB_ALLOWED_REPOS')
    return clean_repo
