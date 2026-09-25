from typing import Any
from pydantic import BaseModel, Field

class Patch(BaseModel):
    path: str
    old: str
    new: str

class Event(BaseModel):
    id: int | None = None
    job_id: str
    type: str
    message: str
    data: dict[str, Any] = Field(default_factory=dict)
    timestamp: str

class RepoRef(BaseModel):
    repo: str

class ScanRequest(BaseModel):
    repo: str
    package: str
    version: str | None = None
    vulnerable_function: str | None = None
    cve_id: str | None = None

class RemediationRequest(BaseModel):
    repo: str
    cve_id: str
    patches: list[Patch]
    title: str
    description: str = ""
    base_branch: str = "main"

class FollowupRequest(BaseModel):
    repo: str
    branch: str
    patches: list[Patch]
    message: str = "Dephyr follow-up remediation"

class ImportFinding(BaseModel):
    module: str
    name: str | None = None
    alias: str | None = None
    start: int
    end: int

class CallFinding(BaseModel):
    function: str
    attribute: str | None = None
    args: str | None = None
    start: int
    end: int

class FileScanResult(BaseModel):
    file: str
    imports: list[ImportFinding] = Field(default_factory=list)
    calls: list[CallFinding] = Field(default_factory=list)

class RustScanResponse(BaseModel):
    res: list[FileScanResult] = Field(default_factory=list)

    @property
    def total_imports(self) -> int:
        return sum(len(f.imports) for f in self.res)

    @property
    def total_calls(self) -> int:
        return sum(len(f.calls) for f in self.res)

    @property
    def call_sites(self) -> list[str]:
        sites: list[str] = []
        for f in self.res:
            for c in f.calls:
                sites.append(f"{f.file}:{c.start}")
        return sites

    def to_summary(self) -> dict[str, Any]:
        total_imp = self.total_imports
        total_cl = self.total_calls
        return {
            'res': [f.model_dump() for f in self.res],
            'package_found': total_imp > 0 or total_cl > 0,
            'imports': total_imp,
            'vulnerable_calls': total_cl,
            'call_sites': self.call_sites,
            'analysis_complete': True,
        }
