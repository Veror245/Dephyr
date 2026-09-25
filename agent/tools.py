import json
from langchain_core.tools import tool
from config import _post, _get, MOCK_MODE

# ============================================================================
# DYNAMIC TOOLS
# ============================================================================
@tool
def create_branch(repo_name: str, branch_name: str) -> str:
    """Creates a new Git branch for the remediation."""
    _post("/repository/branch", {"repo_name": repo_name, "branch_name": branch_name})
    return f"Branch {branch_name} created successfully."

@tool
def bump_dependency(repo_name: str, package: str, target_version: str) -> str:
    """Upgrades a vulnerable dependency to a safe version."""
    _post("/repository/dependency/bump", {"repo_name": repo_name, "package": package, "version": target_version})
    return f"Bumped {package} to {target_version}."

@tool
def apply_known_migration(repo_name: str, file_path: str, migration_type: str) -> str:
    """Applies a standard API migration if the dependency bump introduced breaking changes."""
    _post("/repository/migration/apply", {"repo_name": repo_name, "file_path": file_path, "migration_type": migration_type})
    return f"Applied {migration_type} migration to {file_path}."

@tool
def create_pull_request(repo_name: str, branch_name: str, title: str) -> str:
    """Opens a formal Pull Request on GitHub so the CI tests can start."""
    _post("/pull-requests", {"repo_name": repo_name, "branch_name": branch_name, "title": title})
    return f"Pull request '{title}' opened successfully for branch {branch_name}."

@tool
def inspect_diff(pr_id: str) -> str:
    """Retrieves the Git diff of the current proposed changes to verify correctness."""
    res = _get(f"/pull-requests/{pr_id}/diff")
    return json.dumps(res)

@tool
def apply_followup_patch(pr_id: str, file_path: str, replacement_code: str) -> str:
    """Pushes a custom code patch to fix a failing CI build."""
    _post(f"/pull-requests/{pr_id}/retry", {"file_path": file_path, "replacement_code": replacement_code})
    return "Patch pushed successfully."

@tool
def rerun_verification(pr_id: str) -> str:
    """Triggers CI pipeline to run again. Call this after bumping, creating a PR, or patching to check if tests pass."""
    if MOCK_MODE:
        return json.dumps({"passed": True, "raw_logs": ""})
    res = _post(f"/pull-requests/{pr_id}/verify", {})
    return json.dumps(res)

agent_tools = [
    create_branch, bump_dependency, apply_known_migration, 
    create_pull_request, inspect_diff, apply_followup_patch, rerun_verification
]