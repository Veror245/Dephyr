import httpx
from fastapi import HTTPException
from app.config import settings

class RustClient:
    def __init__(self, client: httpx.AsyncClient):
        self.client = client

    async def scan(self, repo_path, package, vulnerable_function):
        if settings.rust_mock:
            return {'mock': True, 'package_found': True, 'imports': 1, 'vulnerable_calls': 1,
                    'call_sites': ['src/index.js:10'], 'external_input_detected': False,
                    'risk_indicators': [], 'analysis_complete': False}
        try:
            response = await self.client.post(settings.rust_url.rstrip('/') + '/scan',
                                              json={'repo': str(repo_path), 'package': package,
                                                    'vulnerable_function': vulnerable_function},
                                              timeout=90)
            response.raise_for_status()
            data = response.json()
            if not isinstance(data, dict) or 'package_found' not in data:
                raise ValueError('Unexpected Rust response')
            return data
        except (httpx.RequestError, httpx.HTTPStatusError, ValueError) as exc:
            raise HTTPException(502, 'Rust scan failed or returned invalid data') from exc
