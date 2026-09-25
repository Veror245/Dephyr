"""Run with: uv run pytest tests/test_scan_flow.py -q"""
from pathlib import Path
from unittest.mock import AsyncMock

import httpx
import pytest
from fastapi import HTTPException

from app.config import settings
from app.services.git import normalize_repo, temporary_clone
from app.services.rust import RustClient


def test_normalize_github_url():
    assert normalize_repo('https://github.com/example/demo.git') == 'example/demo'
    with pytest.raises(HTTPException):
        normalize_repo('https://evil.example/example/demo')


@pytest.mark.asyncio
async def test_temporary_clone_cleanup(monkeypatch):
    from app.services import git as git_service
    clone_command = AsyncMock(return_value='')
    monkeypatch.setattr(git_service, 'git', clone_command)
    async with temporary_clone('example/demo') as path:
        assert path.parent.is_dir()
        assert path.name == 'repo'
        clone_command.assert_awaited_once()
        assert 'https://github.com/example/demo.git' in clone_command.await_args.args
        temp_parent = path.parent
    assert not temp_parent.exists()


@pytest.mark.asyncio
async def test_rust_receives_exact_three_fields(monkeypatch, tmp_path):
    monkeypatch.setattr(settings, 'rust_mock', False)
    monkeypatch.setattr(settings, 'rust_url', 'http://127.0.0.1:4000/scan')
    received = {}

    def handler(request: httpx.Request):
        import json
        received.update(json.loads(request.content))
        return httpx.Response(200, json={'res': [{'file': 'src/a.py', 'imports': [], 'calls': []}]})

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        result = await RustClient(client).scan(tmp_path, 'axios', '1.6.0')
    assert received == {'repo': str(tmp_path), 'package': 'axios', 'version': '1.6.0'}
    assert result['res'][0]['file'] == 'src/a.py'
