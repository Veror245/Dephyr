import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings

@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client

def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "dephyr-backend"

def test_cve_invalid_format(client):
    response = client.get("/cves/invalid-cve-id")
    assert response.status_code == 422

def test_repo_forbidden(client, monkeypatch):
    # Repos not in GITHUB_ALLOWED_REPOS should be rejected with 403
    monkeypatch.setattr(settings, "github_allowed_repos", "dephyr-demo/repo-c")
    response = client.post("/pull-requests/details?number=1", json={"repo": "unauthorized/repo"})
    assert response.status_code == 403
    assert "Repository not in GITHUB_ALLOWED_REPOS" in response.text

def test_job_not_found(client):
    response = client.get("/jobs/nonexistent-job-id")
    assert response.status_code == 404

def test_api_key_auth(client, monkeypatch):
    monkeypatch.setattr(settings, "allow_unauthenticated", False)
    monkeypatch.setattr(settings, "api_key", "secret123")

    # Request without key -> 401
    resp = client.get("/jobs/nonexistent-job-id")
    assert resp.status_code == 401

    # Request with invalid key -> 401
    resp = client.get("/jobs/nonexistent-job-id", headers={"X-API-Key": "wrong"})
    assert resp.status_code == 401

    # Request with valid key -> 404 (passes auth, hits endpoint)
    resp = client.get("/jobs/nonexistent-job-id", headers={"X-API-Key": "secret123"})
    assert resp.status_code == 404

@pytest.mark.asyncio
async def test_job_and_events_flow(client):
    import uuid
    from app.db import store
    from app.models import Event

    job_id = f"test-job-{uuid.uuid4().hex[:8]}"
    await store.create_job(job_id, "scan", "dephyr-demo/repo-c", "CVE-2024-1111")
    
    # Query job via HTTP
    resp = client.get(f"/jobs/{job_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == job_id
    assert data["status"] == "queued"
    assert data["repo"] == "dephyr-demo/repo-c"

    # Add an event
    evt = Event(job_id=job_id, type="ANALYSIS", message="AST parsed", data={"vuln": True}, timestamp="2026-09-25T12:00:00Z")
    await store.add_event(evt)

    # Query events via HTTP
    resp_ev = client.get(f"/jobs/{job_id}/events")
    assert resp_ev.status_code == 200
    events = resp_ev.json()
    assert len(events) >= 1
    assert events[-1]["type"] == "ANALYSIS"
    assert events[-1]["data"]["vuln"] is True

def test_repo_url_normalization_allowed(client):
    # Repos submitted as full GitHub URLs (e.g. https://github.com/dephyr-demo/repo-c)
    # should be normalized to slug and allowed through require_repo
    from app.security import require_repo
    slug = require_repo("https://github.com/dephyr-demo/repo-c.git")
    assert slug == "dephyr-demo/repo-c"

@pytest.mark.asyncio
async def test_rust_client_payload(client, monkeypatch):
    import httpx
    from pathlib import Path
    from app.services.rust import RustClient

    monkeypatch.setattr(settings, "rust_mock", True)
    async with httpx.AsyncClient() as http_client:
        rust = RustClient(http_client)
        res = await rust.scan(
            repo_path=Path("./workspace/dummy"),
            package="express",
            version="4.18.2"
        )
        assert res["mock"] is True
        assert res["package"] == "express"
        assert res["version"] == "4.18.2"
        assert "dummy" in res["repo"]

def test_repositories_scan_endpoint_accepts_github_url(client, monkeypatch):
    monkeypatch.setattr(settings, "rust_mock", True)
    payload = {
        "repo": "https://github.com/dephyr-demo/repo-c",
        "package": "axios",
        "version": "1.6.0"
    }
    response = client.post("/repositories/scan", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "package" in data

def test_parse_rust_engine_json_response(client):
    from app.models import RustScanResponse

    sample_rust_json = {
        "res": [
            {
                "file": "src/api/query.py",
                "imports": [
                    {
                        "module": "numpy",
                        "name": "array",
                        "alias": "np_arr",
                        "start": 12,
                        "end": 38
                    }
                ],
                "calls": [
                    {
                        "function": "parseQuery",
                        "attribute": "query",
                        "args": "req.params",
                        "start": 140,
                        "end": 175
                    }
                ]
            }
        ]
    }

    parsed = RustScanResponse.model_validate(sample_rust_json)
    assert len(parsed.res) == 1
    assert parsed.res[0].file == "src/api/query.py"
    assert parsed.res[0].imports[0].module == "numpy"
    assert parsed.res[0].imports[0].alias == "np_arr"
    assert parsed.res[0].calls[0].function == "parseQuery"
    assert parsed.res[0].calls[0].start == 140
    assert parsed.total_imports == 1
    assert parsed.total_calls == 1
    assert parsed.call_sites == ["src/api/query.py:140"]

    summary = parsed.to_summary()
    assert summary["package_found"] is True
    assert summary["imports"] == 1
    assert summary["vulnerable_calls"] == 1

def test_rust_scan_callback_endpoint(client):
    sample_rust_json = {
        "res": [
            {
                "file": "lib/server.js",
                "imports": [
                    {
                        "module": "express",
                        "name": None,
                        "alias": None,
                        "start": 5,
                        "end": 20
                    }
                ],
                "calls": [
                    {
                        "function": "listen",
                        "attribute": "app",
                        "args": "3000",
                        "start": 50,
                        "end": 65
                    }
                ]
            }
        ]
    }
    response = client.post("/repositories/scan/callback", json=sample_rust_json)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "received"
    assert data["files_scanned"] == 1
    assert data["total_imports"] == 1
    assert data["total_calls"] == 1
    assert data["summary"]["package_found"] is True
