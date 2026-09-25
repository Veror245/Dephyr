import asyncio
import os
import re
import subprocess
import uuid
import tempfile
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import HTTPException
from app.config import settings
from app.models import Patch

BRANCH_RE = re.compile(r"^[A-Za-z0-9_./-]+$")


def normalize_repo(repo: str) -> str:
    s = repo.strip()
    # Only allow GitHub HTTPS/SSH links or owner/repository slugs.
    if not (
        re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+(?:\.git)?", s)
        or re.fullmatch(
            r"(?:https?://(?:www\.)?github\.com/|git@github\.com:)[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+(?:\.git)?/?",
            s,
        )
    ):
        raise HTTPException(422, "Expected a GitHub URL or owner/repo")
    m = re.search(
        r"(?:github\.com[:/])([a-zA-Z0-9_.-]+)/([a-zA-Z0-9_.-]+?)(?:\.git)?/?$", s
    )
    if m:
        return f"{m.group(1)}/{m.group(2)}"
    parts = [p for p in s.strip("/").split("/") if p]
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
    with tempfile.TemporaryDirectory(prefix="dephyr-scan-") as temp_dir:
        root = Path(temp_dir) / "repo"
        await git(
            "clone",
            "--depth",
            "1",
            "--",
            f"https://github.com/{repo_slug}.git",
            str(root),
            timeout=150,
        )
        yield root


async def git(
    *args,
    cwd: Path | None = None,
    timeout: int = 90,
):
    """
    Run a Git command without interactive authentication prompts.

    GitHub authentication is supplied through GIT_ASKPASS.
    The token stays in the environment and is not put in the GitHub URL.
    """

    env = os.environ.copy()

    # Git must never wait for keyboard input.
    env["GIT_TERMINAL_PROMPT"] = "0"

    askpass_path = None

    try:
        if not settings.github_token:
            raise HTTPException(
                status_code=500,
                detail="GITHUB_TOKEN is not configured",
            )

        # Create a temporary askpass executable.
        askpass = tempfile.NamedTemporaryFile(
            mode="w",
            prefix="dephyr-askpass-",
            suffix=".sh",
            delete=False,
        )

        askpass.write(
            """#!/bin/sh

case "$1" in
    *Username*)
        printf '%s\\n' "x-access-token"
        ;;
    *Password*)
        printf '%s\\n' "$DEPHYR_GIT_TOKEN"
        ;;
    *)
        printf '%s\\n' "$DEPHYR_GIT_TOKEN"
        ;;
esac
"""
        )

        askpass.close()

        askpass_path = askpass.name

        # Linux/macOS: make the script executable.
        os.chmod(askpass_path, 0o700)

        env["GIT_ASKPASS"] = askpass_path
        env["DEPHYR_GIT_TOKEN"] = settings.github_token

        print(
            f"[Git] running: git {args[0]}",
            flush=True,
        )

        # NOTE: asyncio.create_subprocess_exec requires a ProactorEventLoop
        # on Windows; uvicorn's default SelectorEventLoop does not support
        # async subprocesses there and raises NotImplementedError. Running
        # git synchronously in a worker thread via asyncio.to_thread avoids
        # that platform limitation while keeping this function non-blocking
        # for the rest of the app.
        def _run_git():
            return subprocess.run(
                ["git", *args],
                cwd=str(cwd) if cwd else None,
                env=env,
                capture_output=True,
                text=True,
                timeout=timeout,
            )

        try:
            res = await asyncio.to_thread(_run_git)
        except subprocess.TimeoutExpired:
            raise HTTPException(
                status_code=504,
                detail="Git operation timed out",
            )

        stdout_text = res.stdout.strip()
        stderr_text = res.stderr.strip()
        returncode = res.returncode

        if returncode != 0:
            print(
                f"[Git] command failed: git {args[0]}",
                flush=True,
            )

            if stderr_text:
                print(
                    f"[Git] stderr: {stderr_text}",
                    flush=True,
                )

            raise HTTPException(
                status_code=502,
                detail=f"Git operation failed: {args[0]}",
            )

        if stderr_text:
            # Git clone normally prints progress to stderr even on success.
            print(
                f"[Git] stderr: {stderr_text}",
                flush=True,
            )

        return stdout_text

    finally:
        if askpass_path:
            try:
                os.unlink(askpass_path)
            except FileNotFoundError:
                pass


async def clone(repo: str, base_branch: str = "main") -> Path:
    repo_slug = normalize_repo(repo)
    if (
        not BRANCH_RE.fullmatch(base_branch)
        or base_branch.startswith("-")
        or ".." in base_branch
    ):
        raise HTTPException(422, "Invalid base branch")
    settings.workspace.mkdir(parents=True, exist_ok=True)
    target = settings.workspace.resolve() / uuid.uuid4().hex
    try:
        await git(
            "clone",
            "--depth",
            "1",
            "--branch",
            base_branch,
            "--",
            f"https://github.com/{repo_slug}.git",
            str(target),
            timeout=150,
        )
    except HTTPException:
        if base_branch == "main":
            await git(
                "clone",
                "--depth",
                "1",
                "--branch",
                "master",
                "--",
                f"https://github.com/{repo_slug}.git",
                str(target),
                timeout=150,
            )
        else:
            raise
    return target


def apply_patches(root: Path, patches: list[Patch]):
    for patch in patches:
        path = (root / patch.path).resolve()
        if (
            not path.is_relative_to(root.resolve())
            or not path.is_file()
            or path.is_symlink()
        ):
            raise HTTPException(422, f"Invalid patch target: {patch.path}")
        if path.stat().st_size > 1_000_000:
            raise HTTPException(413, "Patch target too large")
        content = path.read_text(encoding="utf-8")
        if content.count(patch.old) != 1:
            raise HTTPException(
                409, f"Expected exactly one matching occurrence in {patch.path}"
            )
        path.write_text(content.replace(patch.old, patch.new, 1), encoding="utf-8")


async def commit_and_push(root: Path, branch: str, patches: list[Patch], message: str):
    if (
        not branch.startswith("dephyr/")
        or not BRANCH_RE.fullmatch(branch)
        or ".." in branch
    ):
        raise HTTPException(422, "Invalid Dephyr branch")
    apply_patches(root, patches)
    await git("config", "user.name", "Dephyr Bot", cwd=root)
    await git("config", "user.email", "dephyr-bot@users.noreply.github.com", cwd=root)
    for patch in patches:
        await git("add", "--", patch.path, cwd=root)
    await git("commit", "-m", message, cwd=root)
    await git("push", "-u", "origin", branch, cwd=root, timeout=120)
    return await git("rev-parse", "HEAD", cwd=root)