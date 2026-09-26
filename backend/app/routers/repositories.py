import json
import re
import shutil
from pathlib import Path
from fastapi import APIRouter, Request
from app.models import RepoRef, ScanRequest, RustScanResponse
from app.security import require_repo
from app.services.github import GitHub
from app.services.git import temporary_clone
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

import httpx
import asyncio
from fastapi import APIRouter, Request
# ... (keep your existing imports) ...

@router.post('/scan', status_code=200)
async def scan(body: ScanRequest, request: Request):
    """Clone a GitHub repository temporarily and forward its local path to Rust."""
    clean_repo = require_repo(body.repo)
    async with temporary_clone(clean_repo) as root:
        result = await RustClient(request.app.state.http).scan(
            repo_path=root,
            package=body.package,
            version=body.version,
        )
        print('Rust Engine Response:', result, flush=True)

        # --- NEW: Dispatch the Dephyr Agent Asynchronously ---
        async def dispatch_agent():
            try:
                async with httpx.AsyncClient() as client:
                    await client.post("http://127.0.0.1:8001/trigger", json={
                        "repo_name": clean_repo,
                        "cve_id": body.cve_id,
                        "package_name": body.package or "unknown",
                        "vulnerable_symbol": body.vulnerable_symbol
                    }, timeout=5.0)
            except Exception as e:
                print(f"Failed to dispatch agent: {e}")

        # Fire and forget: triggers the agent loop in the background
        asyncio.create_task(dispatch_agent())
        # -----------------------------------------------------

        return result

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
