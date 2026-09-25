import json
from datetime import datetime, timezone
import aiosqlite
from app.config import settings

def now() -> str:
    return datetime.now(timezone.utc).isoformat()

class Store:
    def __init__(self):
        self.db: aiosqlite.Connection | None = None

    async def open(self):
        settings.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.db = await aiosqlite.connect(settings.db_path)
        self.db.row_factory = aiosqlite.Row
        await self.db.execute('PRAGMA journal_mode=WAL')
        await self.db.execute('PRAGMA busy_timeout=5000')
        await self.db.executescript('''
          CREATE TABLE IF NOT EXISTS jobs (
            id TEXT PRIMARY KEY, kind TEXT NOT NULL, status TEXT NOT NULL,
            repo TEXT, cve_id TEXT, result TEXT, error TEXT, created TEXT NOT NULL, updated TEXT NOT NULL
          );
          CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT, job_id TEXT NOT NULL, type TEXT NOT NULL,
            message TEXT NOT NULL, data TEXT NOT NULL, timestamp TEXT NOT NULL
          );
          CREATE INDEX IF NOT EXISTS events_job_idx ON events(job_id, id);
        ''')
        await self.db.commit()

    async def close(self):
        if self.db:
            await self.db.close()

    async def create_job(self, job_id, kind, repo=None, cve_id=None):
        await self.db.execute('INSERT INTO jobs(id,kind,status,repo,cve_id,created,updated) VALUES(?,?,?,?,?,?,?)',
                              (job_id, kind, 'queued', repo, cve_id, now(), now()))
        await self.db.commit()

    async def update_job(self, job_id, status, result=None, error=None):
        await self.db.execute('UPDATE jobs SET status=?,result=?,error=?,updated=? WHERE id=?',
                              (status, json.dumps(result) if result is not None else None, error, now(), job_id))
        await self.db.commit()

    async def get_job(self, job_id):
        async with self.db.execute('SELECT * FROM jobs WHERE id=?', (job_id,)) as cur:
            row = await cur.fetchone()
        if not row:
            return None
        d = dict(row)
        d['result'] = json.loads(d['result']) if d['result'] else None
        return d

    async def add_event(self, event):
        await self.db.execute('INSERT INTO events(job_id,type,message,data,timestamp) VALUES(?,?,?,?,?)',
                              (event.job_id, event.type, event.message, json.dumps(event.data), event.timestamp))
        await self.db.commit()

    async def events(self, job_id, after=0, limit=200):
        async with self.db.execute('SELECT * FROM events WHERE job_id=? AND id>? ORDER BY id LIMIT ?',
                                   (job_id, after, limit)) as cur:
            rows = await cur.fetchall()
        return [{**dict(row), 'data': json.loads(row['data'])} for row in rows]

store = Store()
