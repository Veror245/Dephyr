from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', extra='ignore')
    api_key: str = ''
    allow_unauthenticated: bool = True
    github_token: str = ''
    github_allowed_repos: str = 'dephyr-demo/repo-c,dephyr-demo/gateway-proxy,dephyr-demo/repo-a'
    github_api: str = 'https://api.github.com'
    nvd_api_key: str = ''
    rust_url: str = 'http://127.0.0.1:3000/scan'
    rust_mock: bool = True
    workspace: Path = Path('./workspace')
    db_path: Path = Path('./dephyr.sqlite3')
    max_active_scans: int = Field(3, ge=1, le=32)
    max_active_git_jobs: int = Field(2, ge=1, le=16)
    # Frontend origins permitted for CORS (extend for production)
    allowed_origins: str = 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173'

    @property
    def allowed_repos(self) -> set[str]:
        return {x.strip().lower() for x in self.github_allowed_repos.split(',') if x.strip()}

settings = Settings()
