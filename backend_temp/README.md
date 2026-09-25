# Dephyr Backend

FastAPI service powering autonomous vulnerability scanning, CVE enrichment, and Git remediation workflows.

---

## Architecture Overview

```
backend/
├── app/
│   ├── config.py           # Pydantic Settings & environment variables
│   ├── db.py               # Asynchronous SQLite storage via aiosqlite
│   ├── main.py             # FastAPI app, lifespan, CORS, and router registration
│   ├── models.py           # Pydantic request/response & event schemas
│   ├── runtime.py          # Job worker queues, concurrency semaphores & event emitter
│   ├── security.py         # API key validation and repository authorization
│   ├── routers/
│   │   ├── cves.py         # /cves/latest, /cves/{cve_id}
│   │   ├── jobs.py         # /jobs/{job_id}, /jobs/{job_id}/events, /jobs/{job_id}/stream (SSE)
│   │   ├── pull_requests.py# /pull-requests/details, /pull-requests/ci, /pull-requests/logs
│   │   ├── remediation.py  # /remediation/apply, /remediation/followup
│   │   └── repositories.py # /repositories/metadata, /repositories/scan
│   └── services/
│       ├── cve.py          # NVD NIST CVE lookup service
│       ├── git.py          # Async subprocess Git operations (clone, patch, push)
│       ├── github.py       # GitHub REST API client (PRs, CI runs, logs)
│       └── rust.py         # Rust static analysis client (with mock support)
├── tests/
│   └── test_api.py         # Pytest test suite
├── Dockerfile              # Container deployment recipe
├── .env.example            # Environment configuration template
└── pyproject.toml          # Project metadata and dependencies
```

---

## Quickstart & Local Hosting

### 1. Prerequisites
- Python 3.12+
- [`uv`](https://docs.astral.sh/uv/) package manager
- `git` installed and available in `PATH`

### 2. Install Dependencies
```bash
cd backend
uv sync
```

### 3. Environment Configuration
Copy the template and adjust secrets:
```bash
cp .env.example .env
```

### 4. Start the Development Server
```bash
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- Swagger API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)
- Health Check: [http://localhost:8000/health](http://localhost:8000/health)

---

## Production Hosting

### Option A: Docker Container
Build and run the container:
```bash
docker build -t dephyr-backend .
docker run -d -p 8000:8000 --env-file .env --name dephyr-backend dephyr-backend
```

### Option B: Cloud Hosting (Render / Railway / Fly.io)
1. Set the root directory or build directory to `backend`.
2. Build command:
   ```bash
   pip install uv && uv sync --frozen --no-dev
   ```
3. Start command:
   ```bash
   uv run uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
4. Configure environment variables in the cloud dashboard (refer to `.env.example`).

---

## Running Automated Tests
```bash
uv run pytest
```

## Updated temporary-clone scan flow

Run `uv sync` then `uv run python -m uvicorn app.main:app --reload` from this directory.
Set `RUST_URL=http://127.0.0.1:4000/scan`, `RUST_MOCK=false`, and set
`GITHUB_ALLOWED_REPOS` to your authorized GitHub owner/repo values in `.env`.
Set `API_KEY` to a strong secret and send it as `X-API-Key` on protected routes.

`POST /repositories/scan` takes exactly:

```json
{"repo":"https://github.com/your-owner/your-repo","package":"axios","version":"1.6.0"}
```

It shallow-clones the default branch into an OS temporary directory, POSTs
`{"repo":"<absolute cloned directory>","package":"axios","version":"1.6.0"}`
to the Rust endpoint, prints Rust's JSON response, returns the JSON unchanged,
and removes the temporary directory even if Rust returns an error.

**Rust must run on the same machine / shared filesystem and be able to access
that temporary path.** If Rust runs in a separate container or remote machine,
a local path alone will not work; use a shared volume or send a repository URL
instead (which requires a matching Rust contract). No Docker is used by this
Python scan flow.

Test the scan integration with `uv run pytest tests/test_scan_flow.py -q`.
The original tests may assume mock scans never clone; adapt them to mock the
clone when running the full suite.
