import httpx
from fastapi import HTTPException
from app.config import settings
from app.models import RustScanResponse

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
            if not isinstance(data, dict):
                raise ValueError('Invalid Rust response: payload is not a JSON object')

            if 'res' in data:
                scan_resp = RustScanResponse.model_validate(data)
                return scan_resp.model_dump()
            return data
        except (httpx.RequestError, httpx.HTTPStatusError, ValueError) as exc:
            raise HTTPException(502, f'Rust scan failed or returned invalid data: {exc}') from exc
