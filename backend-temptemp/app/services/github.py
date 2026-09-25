import httpx
from fastapi import HTTPException
from app.config import settings

class GitHub:
    def __init__(self, client: httpx.AsyncClient):
        self.client = client

    async def request(self, method: str, path: str, *, json=None, params=None, raw=False):
        if not settings.github_token:
            raise HTTPException(503, 'GITHUB_TOKEN not configured')
        try:
            response = await self.client.request(
                method, settings.github_api.rstrip('/') + path,
                headers={'Authorization': f'Bearer {settings.github_token}',
                         'Accept': 'application/vnd.github+json',
                         'X-GitHub-Api-Version': '2022-11-28'},
                json=json, params=params, timeout=25, follow_redirects=False)
        except httpx.RequestError as exc:
            raise HTTPException(502, 'GitHub request failed') from exc
        if response.status_code >= 400:
            # Do not return arbitrary upstream content; it could contain private details.
            raise HTTPException(502, f'GitHub returned HTTP {response.status_code}')
        return response if raw else response.json()

    async def repo(self, repo):
        return await self.request('GET', f'/repos/{repo}')

    async def create_pr(self, repo, title, head, base, body):
        return await self.request('POST', f'/repos/{repo}/pulls',
                                  json={'title': title, 'head': head, 'base': base, 'body': body})

    async def pull(self, repo, number):
        return await self.request('GET', f'/repos/{repo}/pulls/{number}')

    async def ci(self, repo, number):
        pr = await self.pull(repo, number)
        sha = pr['head']['sha']
        runs = await self.request('GET', f'/repos/{repo}/actions/runs',
                                  params={'head_sha': sha, 'per_page': 30})
        matching = [r for r in runs.get('workflow_runs', []) if r.get('head_sha') == sha]
        return {'pull_request': number, 'head_sha': sha,
                'runs': [{'id': r['id'], 'name': r['name'], 'status': r['status'],
                          'conclusion': r['conclusion'], 'html_url': r['html_url']}
                         for r in matching]}

    async def ci_logs(self, repo, run_id):
        import io, zipfile
        response = await self.request('GET', f'/repos/{repo}/actions/runs/{run_id}/logs', raw=True)
        # GitHub responds with a redirect to a short-lived archive URL. Do not follow arbitrary redirects
        # with credentials. The archive URL is requested separately, without Authorization.
        if response.status_code == 302:
            url = response.headers.get('location', '')
            if not url.startswith('https://'):
                raise HTTPException(502, 'Invalid log archive URL')
            async with httpx.AsyncClient(timeout=30, follow_redirects=False) as client:
                archive = await client.get(url)
                if archive.status_code != 200:
                    raise HTTPException(502, 'Cannot download CI logs')
                payload = archive.content
        else:
            payload = response.content
        if len(payload) > 10_000_000:
            raise HTTPException(413, 'CI log archive too large')
        try:
            with zipfile.ZipFile(io.BytesIO(payload)) as z:
                chunks, remaining = [], 150_000
                for info in z.infolist()[:30]:
                    if info.is_dir():
                        continue
                    with z.open(info) as stream:
                        data = stream.read(min(info.file_size, remaining, 50000))
                    chunks.append(f'--- {info.filename} ---\n' + data.decode('utf-8', errors='replace'))
                    remaining -= len(data)
                    if remaining <= 0:
                        break
                return {'run_id': run_id, 'logs': '\n'.join(chunks), 'truncated': remaining <= 0}
        except zipfile.BadZipFile as exc:
            raise HTTPException(502, 'Invalid CI log archive') from exc
