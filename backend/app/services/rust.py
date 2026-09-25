import httpx
from fastapi import HTTPException
from app.config import settings
from app.models import RustScanResponse

class RustClient:
    def __init__(self, client: httpx.AsyncClient):
        self.client = client

    async def scan(self, repo_path, package: str, version: str | None = None, vulnerable_function: str | None = None) -> dict:
        payload = {
            'repo': str(repo_path),
            'package': package,
            'version': version or 'latest',
        }
        if vulnerable_function:
            payload['vulnerable_function'] = vulnerable_function

        if settings.rust_mock:
            # Simulated AST scan results using the exact Rust engine JSON schema
            mock_data = {
                "res": [
                    {
                        "file": "src/index.py",
                        "imports": [
                            {
                                "module": package,
                                "name": None,
                                "alias": None,
                                "start": 10,
                                "end": 25
                            }
                        ],
                        "calls": [
                            {
                                "function": vulnerable_function or "process_data",
                                "attribute": None,
                                "args": "req.params",
                                "start": 84,
                                "end": 105
                            }
                        ]
                    }
                ]
            }
            scan_resp = RustScanResponse.model_validate(mock_data)
            summary = scan_resp.to_summary()
            summary.update({
                'mock': True,
                'repo': payload['repo'],
                'package': payload['package'],
                'version': payload['version'],
                'external_input_detected': False,
                'risk_indicators': [],
            })
            return summary

        try:
            response = await self.client.post(
                settings.rust_url.rstrip('/') + '/scan',
                json=payload,
                timeout=90
            )
            response.raise_for_status()
            data = response.json()
            if not isinstance(data, dict):
                raise ValueError('Invalid Rust response: payload is not a JSON object')

            # Parse and validate the response structure
            if 'res' in data:
                scan_resp = RustScanResponse.model_validate(data)
                parsed = scan_resp.to_summary()
                parsed.update({
                    'repo': payload['repo'],
                    'package': payload['package'],
                    'version': payload['version'],
                })
                return parsed
            elif 'package_found' in data:
                return data
            else:
                raise ValueError("Rust response missing 'res' field")
        except (httpx.RequestError, httpx.HTTPStatusError, ValueError) as exc:
            raise HTTPException(502, f'Rust scan failed or returned invalid data: {exc}') from exc
