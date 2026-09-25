import json
import re
import shutil
from pathlib import Path
from fastapi import APIRouter, Request
from app.models import RepoRef, ScanRequest, RustScanResponse
from app.security import require_repo
from app.services.github import GitHub
from app.services.git import clone, normalize_repo
from app.services.rust import RustClient
from app.runtime import runtime

router = APIRouter(prefix='/repositories', tags=['Repositories'])

def detect_package_version(root: Path, package: str) -> str | None:
    """Attempt to detect installed or declared package version from common package manifests."""
    pkg_lower = package.lower()

    # 1. Check package.json / package-lock.json (Node.js)
    pkg_json = root / "package.json"
    if pkg_json.is_file():
        try:
            data = json.loads(pkg_json.read_text(encoding="utf-8"))
            deps = {**data.get("dependencies", {}), **data.get("devDependencies", {})}
            for k, v in deps.items():
                if k.lower() == pkg_lower:
                    return str(v).lstrip("^~>=<")
        except Exception:
            pass

    pkg_lock = root / "package-lock.json"
    if pkg_lock.is_file():
        try:
            data = json.loads(pkg_lock.read_text(encoding="utf-8"))
            packages = data.get("packages", {})
            for k, v in packages.items():
                if k.endswith(f"node_modules/{package}") and "version" in v:
                    return v["version"]
            dependencies = data.get("dependencies", {})
            if package in dependencies and "version" in dependencies[package]:
                return dependencies[package]["version"]
        except Exception:
            pass

    # 2. Check requirements.txt (Python)
    req_txt = root / "requirements.txt"
    if req_txt.is_file():
        try:
            content = req_txt.read_text(encoding="utf-8")
            m = re.search(rf"^{re.escape(package)}[=~><]+([0-9a-zA-Z\.\-]+)", content, re.M | re.I)
            if m:
                return m.group(1)
        except Exception:
            pass

    # 3. Check Cargo.lock / Cargo.toml (Rust)
    cargo_lock = root / "Cargo.lock"
    if cargo_lock.is_file():
        try:
            content = cargo_lock.read_text(encoding="utf-8")
            m = re.search(rf'name\s*=\s*"{re.escape(package)}"\s*\nversion\s*=\s*"([^"]+)"', content, re.I)
            if m:
                return m.group(1)
        except Exception:
            pass

    # 4. Check pyproject.toml (Python)
    pyproject = root / "pyproject.toml"
    if pyproject.is_file():
        try:
            content = pyproject.read_text(encoding="utf-8")
            m = re.search(rf'"{re.escape(package)}[=~><]+([0-9a-zA-Z\.\-]+)"', content, re.I)
            if m:
                return m.group(1)
        except Exception:
            pass

    return None

@router.post('/metadata')
async def metadata(body: RepoRef, request: Request):
    clean_repo = require_repo(body.repo)
    data = await GitHub(request.app.state.http).repo(clean_repo)
    return {
        'full_name': data.get('full_name', clean_repo),
        'default_branch': data.get('default_branch', 'main'),
        'private': data.get('private', False),
        'html_url': data.get('html_url', f'https://github.com/{clean_repo}')
    }

@router.post('/scan', status_code=202)
async def scan(body: ScanRequest, request: Request):
    clean_repo = require_repo(body.repo)
    http = request.app.state.http

    async def worker(job_id):
        # Resolve default branch safely
        default_branch = 'main'
        try:
            repo_info = await GitHub(http).repo(clean_repo)
            default_branch = repo_info.get('default_branch', 'main')
        except Exception:
            default_branch = 'main'

        root = await clone(clean_repo, default_branch)
        try:
            await runtime.emit(job_id, 'REPOSITORY_CLONED', f'Repository {clean_repo} cloned', {'path': str(root)})
            
            # Resolve version (from request body or auto-detected from repository files)
            version = body.version or detect_package_version(root, body.package) or 'unknown'
            await runtime.emit(job_id, 'DEPENDENCY_RESOLVED', f'Identified {body.package} version: {version}', {'version': version})
            
            # Dispatch scan to Rust engine with { repo, package, version }
            result = await RustClient(http).scan(
                repo_path=root,
                package=body.package,
                version=version
            )
            await runtime.emit(job_id, 'SCAN_RESULT', 'Rust analysis completed', result)
            print(result)
            return result
        finally:
            shutil.rmtree(root, ignore_errors=True)

    return await runtime.submit('scan', clean_repo, worker, git_job=True)

@router.post('/scan/callback', status_code=200)
async def scan_callback(payload: RustScanResponse, job_id: str | None = None):
    """Webhook endpoint to receive AST scan results from the Rust engine."""
    summary = payload.to_summary()
    if job_id:
        await runtime.emit(job_id, 'SCAN_RESULT', 'Rust analysis received via callback', summary)
    return {
        'status': 'received',
        'files_scanned': len(payload.res),
        'total_imports': payload.total_imports,
        'total_calls': payload.total_calls,
        'summary': summary
    }
