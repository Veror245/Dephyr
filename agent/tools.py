# tools.py
import json
from typing import List, Dict
from langchain_core.tools import tool
from config import _post, _post_and_wait

# ============================================================================
# DYNAMIC TOOLS
# ============================================================================
@tool
def trigger_remediation(repo_name: str, cve_id: str, title: str, description: str, patches: List[Dict[str, str]]) -> str:
    """
    Clones the repo, creates a branch, applies patches, and opens a PR.
    `patches` format: [{"path": "requirements.txt", "old": "requests==2.20", "new": "requests==2.31"}]
    Returns the PR number and branch name.
    """
    print(f"\n[TOOL DEBUG] 🛠️ EXECUTING: trigger_remediation")
    print(f"[TOOL DEBUG] Target: {cve_id} on {repo_name}")
    print(f"[TOOL DEBUG] Patches to apply: {patches}")
    
    res = _post_and_wait("/remediation/apply", {
        "repo": repo_name,
        "base_branch": "main",
        "cve_id": cve_id,
        "title": title,
        "description": description,
        "patches": patches
    })
    return json.dumps(res)

@tool
def check_ci_status(repo_name: str, pr_number: int) -> str:
    """
    Checks the GitHub Actions CI status for a specific PR.
    Returns status (success, failed, pending) and run_id.
    """
    print(f"\n[TOOL DEBUG] 🛠️ EXECUTING: check_ci_status for PR #{pr_number}")
    res = _post(f"/pull-requests/ci?number={pr_number}", {"repo": repo_name})
    return json.dumps(res)

@tool
def get_ci_logs(repo_name: str, run_id: int) -> str:
    """Downloads raw CI failure logs for a specific run_id."""
    print(f"\n[TOOL DEBUG] 🛠️ EXECUTING: get_ci_logs for Run ID {run_id}")
    res = _post(f"/pull-requests/logs?run_id={run_id}", {"repo": repo_name})
    return json.dumps(res)

@tool
def apply_followup_patch(repo_name: str, branch: str, message: str, patches: List[Dict[str, str]]) -> str:
    """
    Applies custom code fixes to an existing branch if CI tests fail.
    `patches` format: [{"path": "src/main.py", "old": "broken()", "new": "fixed()"}]
    """
    print(f"\n[TOOL DEBUG] 🛠️ EXECUTING: apply_followup_patch on branch {branch}")
    print(f"[TOOL DEBUG] Followup Patches: {patches}")
    res = _post_and_wait("/remediation/followup", {
        "repo": repo_name,
        "branch": branch,
        "message": message,
        "patches": patches
    })
    return json.dumps(res)

agent_tools = [trigger_remediation, check_ci_status, get_ci_logs, apply_followup_patch]