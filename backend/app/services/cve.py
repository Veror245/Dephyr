import re
from datetime import datetime, timedelta, timezone
import httpx
from fastapi import HTTPException
from app.config import settings

CVE_RE = re.compile(r'^CVE-\d{4}-\d{4,}$', re.I)

class CVEService:
    def __init__(self, client: httpx.AsyncClient):
        self.client = client

    async def fetch(self, cve_id: str):
        if not CVE_RE.fullmatch(cve_id):
            raise HTTPException(422, 'Invalid CVE identifier')
        headers = {'apiKey': settings.nvd_api_key} if settings.nvd_api_key else {}
        try:
            r = await self.client.get('https://services.nvd.nist.gov/rest/json/cves/2.0',
                                      params={'cveId': cve_id.upper()}, headers=headers, timeout=20)
            r.raise_for_status()
            data = r.json().get('vulnerabilities', [])
        except (httpx.RequestError, httpx.HTTPStatusError, ValueError) as exc:
            raise HTTPException(502, 'NVD request failed') from exc
        if not data:
            raise HTTPException(404, 'CVE not found')
        c = data[0]['cve']
        descriptions = c.get('descriptions', [])
        english = next((d['value'] for d in descriptions if d.get('lang') == 'en'), '')
        metrics = c.get('metrics', {})
        scores = [entry['cvssData'] for key, entries in metrics.items() if key.startswith('cvssMetric')
                  for entry in entries if 'cvssData' in entry]
        score = scores[0] if scores else {}
        return {'id': c['id'], 'description': english,
                'severity': score.get('baseSeverity', 'UNKNOWN'),
                'cvss_score': score.get('baseScore'),
                'published': c.get('published'),
                'references': [ref['url'] for ref in c.get('references', [])[:10]],
                'configurations': c.get('configurations', [])}

    async def latest(self, limit: int = 10):
        # NVD does not guarantee that unfiltered results are ordered newest-first.
        end = datetime.now(timezone.utc)
        start = end - timedelta(days=7)
        fmt = lambda dt: dt.strftime('%Y-%m-%dT%H:%M:%S.000')
        try:
            r = await self.client.get('https://services.nvd.nist.gov/rest/json/cves/2.0',
                                      params={'pubStartDate': fmt(start), 'pubEndDate': fmt(end),
                                              'resultsPerPage': min(2000, max(100, limit))},
                                      headers={'apiKey': settings.nvd_api_key} if settings.nvd_api_key else {},
                                      timeout=20)
            r.raise_for_status()
            entries = [{'id': x['cve']['id'], 'published': x['cve'].get('published')}
                       for x in r.json().get('vulnerabilities', [])]
            return sorted(entries, key=lambda x: x['published'] or '', reverse=True)[:limit]
        except (httpx.RequestError, httpx.HTTPStatusError, ValueError) as exc:
            raise HTTPException(502, 'NVD request failed') from exc
