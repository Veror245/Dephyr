import httpx
from fastapi import HTTPException
from app.config import settings

class RustClient:
    def __init__(self, client: httpx.AsyncClient):
        self.client = client

    async def scan(self, repo_path, package: str, version: str | None = None) -> dict:
        payload = {
            'repo': str(repo_path),
            'package': package,
            'version': version or 'latest',
        }

        if settings.rust_mock:
            return {"res": []}

        target_url = settings.rust_url if settings.rust_url.endswith('/scan') else settings.rust_url.rstrip('/') + '/scan'

        try:
            response = await self.client.post(
                target_url,
                json=payload,
                timeout=90
            )
            response.raise_for_status()
            data = response.json()
            print(f"[RustClient] Raw response from {target_url}:", data)
            return data
        except httpx.ConnectError as exc:
            print(f"[RustClient] Connection error reaching {target_url}:", exc)
            raise HTTPException(502, f'Cannot connect to Rust engine at {target_url}. Is the Rust server running on port 3000?') from exc
        except httpx.HTTPStatusError as exc:
            print(f"[RustClient] HTTP status error from {target_url}:", exc.response.status_code, exc.response.text)
            raise HTTPException(502, f'Rust engine returned HTTP {exc.response.status_code}') from exc
        except Exception as exc:
            print(f"[RustClient] Unexpected error calling {target_url}:", exc)
            raise HTTPException(502, f'Rust scan error: {exc}') from exc
