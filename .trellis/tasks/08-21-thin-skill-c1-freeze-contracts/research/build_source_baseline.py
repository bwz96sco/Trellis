#!/usr/bin/env python3
"""Capture and verify the immutable thin-skill pilot source baseline."""

from __future__ import annotations

import argparse
import hashlib
import json
import stat
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

SOURCE_ROOT = Path("/Users/zhangbowen/Projects/agent-skills-private")
EXPECTED_BRANCH = "chore/retire-find-skills"
EXPECTED_HEAD = "e2b0d70e3a797f19461eb106601de12250000b69"
BASELINE_ROOT = Path(__file__).resolve().parent / "source-baseline"
FILES_ROOT = BASELINE_ROOT / "files"
MANIFEST_PATH = BASELINE_ROOT / "manifest.json"
README_PATH = BASELINE_ROOT / "README.md"

INVENTORY: tuple[tuple[str, str], ...] = (
    ("skills/research-literature/SKILL.md", "instruction"),
    ("skills/research-literature/agents/openai.yaml", "host-projection"),
    ("skills/research-literature/note-template.md", "template"),
    ("skills/research-ideation/SKILL.md", "instruction"),
    ("skills/research-ideation/agents/openai.yaml", "host-projection"),
    ("skills/research-ideation/opportunity-board-template.md", "template"),
    ("scripts/validate-research-gates.py", "validator"),
    ("skills/research-idea-evaluation/SKILL.md", "instruction"),
    ("skills/research-idea-evaluation/agents/openai.yaml", "host-projection"),
    ("skills/research-idea-evaluation/attack-template.md", "template"),
    ("skills/research-quest/SKILL.md", "instruction"),
    ("skills/research-quest/agents/openai.yaml", "host-projection"),
    ("skills/research-quest/scripts/research_quest.py", "helper"),
    ("skills/research-quest-admin/SKILL.md", "instruction"),
    ("skills/research-quest-admin/agents/openai.yaml", "host-projection"),
    ("skills/research-quest-admin/references/quest-pack.md", "reference"),
    ("skills/research-quest-admin/references/campaign-index.md", "reference"),
    ("skills/research-quest-admin/references/task-forest-bridge.md", "reference"),
    ("skills/research-quest-admin/scripts/research_quest_admin.py", "helper"),
)

EXCLUSIONS: tuple[tuple[str, str, str], ...] = (
    ("README.md", "unrelated-dirty", "Repository documentation is not a pilot runtime dependency."),
    ("scripts/audit-installed-links.sh", "unrelated-dirty", "Host-link audit is outside Research runtime inputs."),
    ("scripts/install-links.sh", "unrelated-dirty", "Host-link installation is outside Research runtime inputs."),
    ("scripts/manage-external-specialists.py", "unrelated-dirty", "External-specialist management is outside pilot scope."),
    ("tests/test_manage_external_specialists.py", "unrelated-dirty", "External-specialist test is outside pilot scope."),
    ("registry/source-io-contracts.md", "registry-wide", "Registry-wide policy is evidence, not a direct package member."),
    ("scripts/validate-research-skills.py", "registry-wide", "Registry validator is not invoked by pilot skills at runtime."),
    ("evals/research-skills/test_research_skill_contracts.py", "test-only", "Source tests are not runtime package members."),
    ("evals/research-skills/test_research_gates.py", "test-only", "Source tests are not runtime package members."),
    ("skills/research-opportunity-mining/SKILL.md", "non-pilot", "Opportunity mining is not a named pilot package."),
    ("skills/research-opportunity-mining/opportunity-template.md", "non-pilot", "Opportunity mining is not a named pilot package."),
    ("scripts/validate-research-opportunities.py", "non-pilot", "Opportunity validator is not invoked by frozen pilot packages."),
    ("evals/research-skills/test_research_opportunities.py", "non-pilot", "Non-pilot source test."),
    ("skills/research-synthesis/SKILL.md", "non-pilot", "Synthesis is not a named pilot package."),
    ("skills/research-synthesis/problem-checkpoint-template.md", "non-pilot", "Synthesis is not a named pilot package."),
    ("skills/research-quest-admin/templates/research-quest.yaml", "unreferenced-example", "Admin helper constructs state programmatically and does not reference this file."),
    ("skills/research-quest-admin/templates/research-event.json", "unreferenced-example", "Admin helper constructs events programmatically and does not reference this file."),
)

EXPECTED_GIT_STATES = {
    "scripts/validate-research-gates.py": "tracked-modified",
    "skills/research-ideation/SKILL.md": "tracked-modified",
    "skills/research-ideation/opportunity-board-template.md": "untracked",
    "skills/research-literature/SKILL.md": "tracked-modified",
}

EXPECTED_RELEVANT_SOURCE_STATUS = (
    " M README.md",
    " M evals/research-skills/test_research_gates.py",
    " M evals/research-skills/test_research_skill_contracts.py",
    " M registry/source-io-contracts.md",
    " M scripts/audit-installed-links.sh",
    " M scripts/install-links.sh",
    " M scripts/manage-external-specialists.py",
    " M scripts/validate-research-gates.py",
    " M scripts/validate-research-skills.py",
    " M skills/research-ideation/SKILL.md",
    " M skills/research-literature/SKILL.md",
    " M skills/research-opportunity-mining/SKILL.md",
    " M skills/research-opportunity-mining/opportunity-template.md",
    " M skills/research-synthesis/SKILL.md",
    " M tests/test_manage_external_specialists.py",
    "?? evals/research-skills/test_research_opportunities.py",
    "?? scripts/validate-research-opportunities.py",
    "?? skills/research-ideation/opportunity-board-template.md",
    "?? skills/research-synthesis/problem-checkpoint-template.md",
)


def run_git(*args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", "-C", str(SOURCE_ROOT), *args],
        check=check,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def git_state(path: str) -> str:
    tracked = run_git("ls-files", "--error-unmatch", "--", path, check=False).returncode == 0
    if not tracked:
        return "untracked"
    index_changed = run_git("diff", "--cached", "--quiet", "--", path, check=False).returncode == 1
    worktree_changed = run_git("diff", "--quiet", "--", path, check=False).returncode == 1
    if index_changed and worktree_changed:
        return "tracked-staged-and-modified"
    if index_changed:
        return "tracked-staged"
    if worktree_changed:
        return "tracked-modified"
    return "tracked-clean"


def git_mode(path: Path) -> str:
    return "100755" if path.stat().st_mode & stat.S_IXUSR else "100644"


def source_status(paths: list[str]) -> list[str]:
    completed = run_git("status", "--short", "--untracked-files=all", "--", *paths)
    return sorted(line for line in completed.stdout.splitlines() if line)


def source_identity() -> tuple[str, str]:
    branch = run_git("branch", "--show-current").stdout.strip()
    head = run_git("rev-parse", "HEAD").stdout.strip()
    if branch != EXPECTED_BRANCH:
        raise RuntimeError(f"source branch mismatch: expected {EXPECTED_BRANCH}, got {branch}")
    if head != EXPECTED_HEAD:
        raise RuntimeError(f"source HEAD mismatch: expected {EXPECTED_HEAD}, got {head}")
    return branch, head


def checked_source(path_text: str) -> Path:
    path = SOURCE_ROOT / path_text
    resolved = path.resolve(strict=True)
    try:
        resolved.relative_to(SOURCE_ROOT.resolve(strict=True))
    except ValueError as error:
        raise RuntimeError(f"source path escapes root: {path_text}") from error
    if path.is_symlink() or not path.is_file():
        raise RuntimeError(f"source member must be regular non-symlink file: {path_text}")
    return path


def readme_text(manifest: dict[str, Any]) -> str:
    return f"""# Frozen Thin-Skill Source Baseline

This directory preserves exact source bytes selected for C1 of the thin-skill Research orchestration pilot.

```text
source repository: {manifest['sourceRepository']}
branch: {manifest['branch']}
base commit: {manifest['baseCommit']}
files: {len(manifest['files'])}
manifest schema: {manifest['schemaVersion']}
```

The source repository was dirty. `baseCommit` identifies the committed base only; each copied file is independently authenticated from working-tree bytes by mode, size, and SHA-256. Later implementation children must consume `files/` and `manifest.json`, not mutable ambient source paths.

Run verification from the Trellis worktree:

```bash
uv run python .trellis/tasks/08-21-thin-skill-c1-freeze-contracts/research/build_source_baseline.py --verify
```

Creating another baseline requires a new forward task/version. Do not overwrite this snapshot after C1 completion.
"""


def capture() -> None:
    branch, head = source_identity()
    if FILES_ROOT.exists() and any(FILES_ROOT.rglob("*")):
        raise RuntimeError(f"baseline files already exist: {FILES_ROOT}")
    FILES_ROOT.mkdir(parents=True, exist_ok=True)

    records: list[dict[str, Any]] = []
    initial_digests: dict[str, str] = {}
    for path_text, role in INVENTORY:
        source = checked_source(path_text)
        data = source.read_bytes()
        initial_digests[path_text] = digest(data)
        target = FILES_ROOT / path_text
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        target.chmod(source.stat().st_mode & 0o777)
        records.append(
            {
                "path": path_text,
                "gitState": git_state(path_text),
                "mode": git_mode(source),
                "size": len(data),
                "sha256": digest(data),
                "role": role,
            }
        )

    for path_text, expected_digest in initial_digests.items():
        if digest(checked_source(path_text).read_bytes()) != expected_digest:
            raise RuntimeError(f"source changed during capture: {path_text}")

    relevant_paths = sorted({path for path, _ in INVENTORY} | {path for path, _, _ in EXCLUSIONS})
    manifest: dict[str, Any] = {
        "schemaVersion": 1,
        "sourceRepository": str(SOURCE_ROOT),
        "branch": branch,
        "baseCommit": head,
        "capturedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "selectionReason": "thin-skill-research-orchestration-pilot",
        "files": sorted(records, key=lambda record: record["path"]),
        "relevantSourceStatus": source_status(relevant_paths),
        "relevantExcludedPaths": [
            {"path": path, "category": category, "reason": reason}
            for path, category, reason in sorted(EXCLUSIONS)
        ],
    }
    MANIFEST_PATH.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    README_PATH.write_text(readme_text(manifest), encoding="utf-8")
    verify()


def verify() -> None:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    expected_manifest_keys = {
        "baseCommit",
        "branch",
        "capturedAt",
        "files",
        "relevantExcludedPaths",
        "relevantSourceStatus",
        "schemaVersion",
        "selectionReason",
        "sourceRepository",
    }
    if set(manifest) != expected_manifest_keys:
        raise RuntimeError("manifest keys mismatch")
    if manifest.get("schemaVersion") != 1:
        raise RuntimeError("unsupported manifest schema")
    if manifest.get("sourceRepository") != str(SOURCE_ROOT):
        raise RuntimeError("manifest source repository mismatch")
    if manifest.get("selectionReason") != "thin-skill-research-orchestration-pilot":
        raise RuntimeError("manifest selection reason mismatch")
    captured_at = manifest.get("capturedAt")
    if not isinstance(captured_at, str):
        raise RuntimeError("manifest capture time must be RFC3339")
    try:
        captured_instant = datetime.fromisoformat(captured_at.replace("Z", "+00:00"))
    except ValueError as error:
        raise RuntimeError("manifest capture time must be RFC3339") from error
    if captured_instant.tzinfo is None or captured_instant.utcoffset() is None:
        raise RuntimeError("manifest capture time must include an offset")

    records = manifest.get("files")
    if not isinstance(records, list) or len(records) != len(INVENTORY):
        raise RuntimeError("manifest inventory length mismatch")
    paths = [record.get("path") for record in records]
    expected_paths = sorted(path for path, _ in INVENTORY)
    if paths != expected_paths or len(set(paths)) != len(paths):
        raise RuntimeError("manifest paths must be exact, sorted, and unique")

    declared = set(expected_paths)
    baseline_members = list(FILES_ROOT.rglob("*"))
    symlinks = [str(path.relative_to(FILES_ROOT)) for path in baseline_members if path.is_symlink()]
    if symlinks:
        raise RuntimeError(f"baseline contains symlinks: {sorted(symlinks)}")
    actual = {
        str(path.relative_to(FILES_ROOT))
        for path in baseline_members
        if path.is_file()
    }
    if actual != declared:
        raise RuntimeError(
            f"baseline file inventory mismatch: missing={sorted(declared - actual)} extra={sorted(actual - declared)}"
        )

    roles = dict(INVENTORY)
    expected_record_keys = {"gitState", "mode", "path", "role", "sha256", "size"}
    for record in records:
        if set(record) != expected_record_keys:
            raise RuntimeError("manifest file record keys mismatch")
        path_text = record["path"]
        if record["role"] != roles[path_text]:
            raise RuntimeError(f"role mismatch: {path_text}")
        expected_git_state = EXPECTED_GIT_STATES.get(path_text, "tracked-clean")
        if record["gitState"] != expected_git_state:
            raise RuntimeError(f"git state mismatch: {path_text}")
        target = FILES_ROOT / path_text
        resolved = target.resolve(strict=True)
        try:
            resolved.relative_to(FILES_ROOT.resolve(strict=True))
        except ValueError as error:
            raise RuntimeError(f"baseline path escapes files root: {path_text}") from error
        if target.is_symlink() or not target.is_file():
            raise RuntimeError(f"baseline member must be regular non-symlink file: {path_text}")
        data = target.read_bytes()
        if len(data) != record["size"]:
            raise RuntimeError(f"size mismatch: {path_text}")
        if digest(data) != record["sha256"]:
            raise RuntimeError(f"digest mismatch: {path_text}")
        if git_mode(target) != record["mode"]:
            raise RuntimeError(f"mode mismatch: {path_text}")

    if manifest.get("branch") != EXPECTED_BRANCH or manifest.get("baseCommit") != EXPECTED_HEAD:
        raise RuntimeError("manifest source identity mismatch")
    if manifest.get("relevantSourceStatus") != list(EXPECTED_RELEVANT_SOURCE_STATUS):
        raise RuntimeError("relevant source status mismatch")
    expected_exclusions = [
        {"path": path, "category": category, "reason": reason}
        for path, category, reason in sorted(EXCLUSIONS)
    ]
    if manifest.get("relevantExcludedPaths") != expected_exclusions:
        raise RuntimeError("excluded path inventory mismatch")
    if README_PATH.read_text(encoding="utf-8") != readme_text(manifest):
        raise RuntimeError("baseline README mismatch")
    print(f"OK source baseline: {len(records)} files")


def main() -> int:
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--capture", action="store_true")
    group.add_argument("--verify", action="store_true")
    args = parser.parse_args()
    if args.capture:
        capture()
    else:
        verify()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
