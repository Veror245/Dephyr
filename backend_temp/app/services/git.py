import asyncio
import os
import re
import uuid
import tempfile
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import HTTPException
from app.config import settings
from app.models import Patch

BRANCH_RE = re.compile(r'^[A-Za-z0-9_./-]+$')

def normalize_repo(repo: str) -> str:
    s = repo.strip()
    # Only allow GitHub HTTPS/SSH links or owner/repository slugs.
    if not (re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+(?:\.git)?', s)
            or re.fullmatch(r'(?:https://github\.com/|git@github\.com:)[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+(?:\.git)?/?', s)):
        raise HTTPException(422, 'Expected a GitHub URL or owner/repo')
    m = re.search(r'(?:github\.com[:/])([a-zA-Z0-9_.-]+)/([a-zA-Z0-9_.-]+?)(?:\.git)?/?$', s)
    if m:
        return f"{m.group(1)}/{m.group(2)}"
    parts = [p for p in s.strip('/').split('/') if p]
    if len(parts) == 2:
        return f"{parts[0]}/{parts[1].removesuffix('.git')}"
    return s

@asynccontextmanager
async def temporary_clone(repo: str):
    """Clone the default branch into an OS-managed temporary directory.

    The directory exists until the Rust HTTP request completes, and is
    removed on success, error, or request cancellation.
    """
    repo_slug = normalize_repo(repo)
    with tempfile.TemporaryDirectory(prefix='dephyr-scan-') as temp_dir:
        root = Path(temp_dir) / 'repo'
        await git('clone', '--depth', '1', '--',
                  f'https://github.com/{repo_slug}.git', str(root), timeout=150)
        yield root

async def git(*args, cwd: Path | None = None, timeout=90):
    env = os.environ.copy()
    env['GIT_TERMINAL_PROMPT'] = '0'
    env['GIT_CONFIG_NOSYSTEM'] = '1'
    if settings.github_token:
        import base64
        basic = base64.b64encode(('x-access-token:' + settings.github_token).encode()).decode()
        env.update({'GIT_CONFIG_COUNT': '1', 'GIT_CONFIG_KEY_0': 'http.https://github.com/.extraheader',
                    'GIT_CONFIG_VALUE_0': 'AUTHORIZATION: basic ' + basic})
    try:
        proc = await asyncio.create_subprocess_exec('git', *args, cwd=str(cwd) if cwd else None,
                                                     env=env, stdout=asyncio.subprocess.PIPE,
                                                     stderr=asyncio.subprocess.PIPE)
        try:
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        except TimeoutError:
            proc.kill()
            await proc.communicate()
            raise HTTPException(504, 'Git operation timed out')
    except OSError as exc:
        raise HTTPException(503, 'Git executable unavailable') from exc
    if proc.returncode:
        # Git output may include remote URLs or credentials; never expose it to clients.
        raise HTTPException(502, f'Git operation failed: {args[0]}')
    return stdout.decode(errors='replace').strip()

async def clone(repo: str, base_branch: str = 'main') -> Path:
    repo_slug = normalize_repo(repo)
    if not BRANCH_RE.fullmatch(base_branch) or base_branch.startswith('-') or '..' in base_branch:
        raise HTTPException(422, 'Invalid base branch')
    settings.workspace.mkdir(parents=True, exist_ok=True)
    target = settings.workspace.resolve() / uuid.uuid4().hex
    try:
        await git('clone', '--depth', '1', '--branch', base_branch,
                  '--', f'https://github.com/{repo_slug}.git', str(target), timeout=150)
    except HTTPException:
        if base_branch == 'main':
            await git('clone', '--depth', '1', '--branch', 'master',
                      '--', f'https://github.com/{repo_slug}.git', str(target), timeout=150)
        else:
            raise
    return target

def apply_patches(root: Path, patches: list[Patch]):
    for patch in patches:
        path = (root / patch.path).resolve()
        if not path.is_relative_to(root.resolve()) or not path.is_file() or path.is_symlink():
            raise HTTPException(422, f'Invalid patch target: {patch.path}')
        if path.stat().st_size > 1_000_000:
            raise HTTPException(413, 'Patch target too large')
        content = path.read_text(encoding='utf-8')
        if content.count(patch.old) != 1:
            raise HTTPException(409, f'Expected exactly one matching occurrence in {patch.path}')
        path.write_text(content.replace(patch.old, patch.new, 1), encoding='utf-8')

async def commit_and_push(root: Path, branch: str, patches: list[Patch], message: str):
    if not branch.startswith('dephyr/') or not BRANCH_RE.fullmatch(branch) or '..' in branch:
        raise HTTPException(422, 'Invalid Dephyr branch')
    apply_patches(root, patches)
    await git('config', 'user.name', 'Dephyr Bot', cwd=root)
    await git('config', 'user.email', 'dephyr-bot@users.noreply.github.com', cwd=root)
    for patch in patches:
        await git('add', '--', patch.path, cwd=root)
    await git('commit', '-m', message, cwd=root)
    await git('push', '-u', 'origin', branch, cwd=root, timeout=120)
    return await git('rev-parse', 'HEAD', cwd=root)
