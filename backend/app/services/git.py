import asyncio
import os
import re
import uuid
from pathlib import Path
from fastapi import HTTPException
from app.config import settings
from app.models import Patch

BRANCH_RE = re.compile(r'^[A-Za-z0-9_./-]+$')

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
    if not BRANCH_RE.fullmatch(base_branch) or base_branch.startswith('-') or '..' in base_branch:
        raise HTTPException(422, 'Invalid base branch')
    settings.workspace.mkdir(parents=True, exist_ok=True)
    target = settings.workspace.resolve() / uuid.uuid4().hex
    await git('clone', '--depth', '1', '--branch', base_branch,
              '--', f'https://github.com/{repo}.git', str(target), timeout=150)
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
