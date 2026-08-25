#!/usr/bin/env python3
"""Capture and verify the guarded Quest source-authority baseline."""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import stat
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

SOURCE_REPOSITORY = Path("/Users/zhangbowen/Projects/agent-skills-private")
SOURCE_BRANCH = "chore/retire-find-skills"
PREDECESSOR_COMMIT = "e2b0d70e3a797f19461eb106601de12250000b69"
GUARDED_COMMIT = "86df5a676c52950592ff9fe5966b9c1753160cb5"
SELECTION_REASON = "c7-single-writer-source-authority-remediation"

RESEARCH_ROOT = Path(__file__).resolve().parent
REPO_ROOT = Path(__file__).resolve().parents[4]
BASELINE_ROOT = RESEARCH_ROOT / "source-authority-baseline"
FILES_ROOT = BASELINE_ROOT / "files"
MANIFEST_PATH = BASELINE_ROOT / "manifest.json"
README_PATH = BASELINE_ROOT / "README.md"

C1_BASELINE = (
    REPO_ROOT
    / ".trellis/tasks/08-21-thin-skill-c1-freeze-contracts/research/source-baseline"
)
C1_MANIFEST_PATH = C1_BASELINE / "manifest.json"
C1_MANIFEST_REPO_PATH = (
    ".trellis/tasks/08-21-thin-skill-c1-freeze-contracts/"
    "research/source-baseline/manifest.json"
)
C1_MANIFEST_SHA256 = "45fc8483b372088838cdf7b2759cb3087de18434daa5c994eaaa23c0f9c5be42"

ADMIN_PATH = "skills/research-quest-admin/scripts/research_quest_admin.py"
QUEST_PATH = "skills/research-quest/scripts/research_quest.py"
OLD_ADMIN_SHA256 = "7159bd9a8635110b671bdba8301eeca53f69f2d46c6110c80e7b28075c7d29f8"
OLD_ADMIN_SIZE = 14944

MEMBERS: tuple[dict[str, Any], ...] = (
    {
        "path": ADMIN_PATH,
        "role": "guarded-authority-helper",
        "mode": "100644",
        "size": 29342,
        "sha256": "fe15beda6257cba9c5fcb0995f7fae5447d1caa942943ce7dc68205e6f491c3c",
    },
    {
        "path": QUEST_PATH,
        "role": "runtime-dependency",
        "mode": "100644",
        "size": 35730,
        "sha256": "dbf9df55283b6481efd1381d298008efa98cebf0c7f7658b3814c61962ac3511",
    },
)
MEMBERS_BY_PATH = {member["path"]: member for member in MEMBERS}
DIGEST_DOMAIN = b"trellis-c7-source-authority-baseline-v1\0"


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def frame(data: bytes) -> bytes:
    return len(data).to_bytes(8, "big") + data


def canonical_json_bytes(value: Any) -> bytes:
    return (
        json.dumps(value, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
        + "\n"
    ).encode("utf-8")


def reject_duplicate_keys(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise RuntimeError(f"duplicate JSON key: {key}")
        result[key] = value
    return result


def read_json(path: Path) -> dict[str, Any]:
    value = json.loads(
        path.read_text(encoding="utf-8"), object_pairs_hook=reject_duplicate_keys
    )
    if not isinstance(value, dict):
        raise RuntimeError(f"JSON root must be an object: {path}")
    return value


def run_git(*args: str, check: bool = True) -> subprocess.CompletedProcess[bytes]:
    completed = subprocess.run(
        ["git", "-C", str(SOURCE_REPOSITORY), *args],
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if check and completed.returncode != 0:
        stderr = completed.stderr.decode("utf-8", errors="replace").strip()
        raise RuntimeError(f"git {' '.join(args)} failed: {stderr}")
    return completed


def git_text(*args: str) -> str:
    return run_git(*args).stdout.decode("utf-8").strip()


def git_blob(commit: str, path: str) -> bytes:
    return run_git("show", f"{commit}:{path}").stdout


def git_mode(commit: str, path: str) -> str:
    line = git_text("ls-tree", commit, "--", path)
    fields = line.split(maxsplit=3)
    if len(fields) != 4 or fields[1] != "blob" or fields[3] != path:
        raise RuntimeError(f"unexpected Git tree record: {commit}:{path}")
    return fields[0]


def filesystem_mode(path: Path) -> str:
    executable_bits = stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH
    return "100755" if path.stat().st_mode & executable_bits else "100644"


def verify_predecessor() -> None:
    manifest_bytes = C1_MANIFEST_PATH.read_bytes()
    if sha256(manifest_bytes) != C1_MANIFEST_SHA256:
        raise RuntimeError("C1 predecessor manifest digest mismatch")
    manifest = read_json(C1_MANIFEST_PATH)
    if manifest.get("baseCommit") != PREDECESSOR_COMMIT:
        raise RuntimeError("C1 predecessor commit mismatch")
    records = manifest.get("files")
    if not isinstance(records, list):
        raise RuntimeError("C1 predecessor file inventory missing")
    matching = [record for record in records if record.get("path") == ADMIN_PATH]
    if len(matching) != 1:
        raise RuntimeError("C1 predecessor admin helper record mismatch")
    record = matching[0]
    if (
        record.get("mode") != "100644"
        or record.get("size") != OLD_ADMIN_SIZE
        or record.get("sha256") != OLD_ADMIN_SHA256
    ):
        raise RuntimeError("C1 predecessor admin helper identity mismatch")
    old_helper = C1_BASELINE / "files" / ADMIN_PATH
    old_bytes = old_helper.read_bytes()
    if len(old_bytes) != OLD_ADMIN_SIZE or sha256(old_bytes) != OLD_ADMIN_SHA256:
        raise RuntimeError("C1 predecessor admin helper bytes mismatch")


def identity_payload(manifest: dict[str, Any]) -> dict[str, Any]:
    return {
        "schemaVersion": manifest["schemaVersion"],
        "selectionReason": manifest["selectionReason"],
        "sourceRepository": manifest["sourceRepository"],
        "sourceBranch": manifest["sourceBranch"],
        "capturedAt": manifest["capturedAt"],
        "predecessor": manifest["predecessor"],
        "guardedCommit": manifest["guardedCommit"],
        "files": manifest["files"],
    }


def compute_baseline_digest(manifest: dict[str, Any], files_root: Path) -> str:
    material = bytearray(DIGEST_DOMAIN)
    material.extend(frame(canonical_json_bytes(identity_payload(manifest))))
    for record in manifest["files"]:
        path_text = record["path"]
        material.extend(frame(path_text.encode("utf-8")))
        material.extend(frame((files_root / path_text).read_bytes()))
    return f"sha256:{sha256(bytes(material))}"


def readme_text(manifest: dict[str, Any]) -> str:
    return f"""# Guarded Quest Source-Authority Baseline

This directory authenticates the forward source dependency used to re-prove C7's Quest single-writer boundary.

```text
source repository: {manifest['sourceRepository']}
source branch: {manifest['sourceBranch']}
predecessor commit: {manifest['predecessor']['commit']}
guarded commit: {manifest['guardedCommit']['commit']}
changed paths: {len(manifest['guardedCommit']['changedPaths'])}
files: {len(manifest['files'])}
baseline digest: {manifest['baselineDigest']}
manifest schema: {manifest['schemaVersion']}
```

Capture reads exact Git blobs from the guarded commit. It never reads helper bytes from the mutable source working tree. Verification reads only this task-local baseline and the immutable C1 predecessor baseline.

Run verification from the Trellis worktree:

```bash
uv run python .trellis/tasks/08-25-thin-skill-c7-single-writer-remediation/research/build_source_authority_baseline.py --verify
```

This baseline is forward evidence only. It does not alter the frozen C1 identity or archived C7 failure.
"""


def expected_entries() -> tuple[set[str], set[str]]:
    files = {"README.md", "manifest.json"}
    directories = {"files"}
    for member in MEMBERS:
        relative = Path("files") / member["path"]
        files.add(relative.as_posix())
        for parent in relative.parents:
            if parent != Path("."):
                directories.add(parent.as_posix())
    return files, directories


def verify_at(baseline_root: Path) -> dict[str, Any]:
    verify_predecessor()
    manifest_path = baseline_root / "manifest.json"
    readme_path = baseline_root / "README.md"
    files_root = baseline_root / "files"

    members = list(baseline_root.rglob("*"))
    symlinks = sorted(
        path.relative_to(baseline_root).as_posix()
        for path in members
        if path.is_symlink()
    )
    if symlinks:
        raise RuntimeError(f"baseline contains symlinks: {symlinks}")
    actual_files = {
        path.relative_to(baseline_root).as_posix()
        for path in members
        if path.is_file()
    }
    actual_directories = {
        path.relative_to(baseline_root).as_posix()
        for path in members
        if path.is_dir()
    }
    expected_files, expected_directories = expected_entries()
    if actual_files != expected_files:
        raise RuntimeError(
            "baseline file inventory mismatch: "
            f"missing={sorted(expected_files - actual_files)} "
            f"extra={sorted(actual_files - expected_files)}"
        )
    if actual_directories != expected_directories:
        raise RuntimeError(
            "baseline directory inventory mismatch: "
            f"missing={sorted(expected_directories - actual_directories)} "
            f"extra={sorted(actual_directories - expected_directories)}"
        )

    manifest_bytes = manifest_path.read_bytes()
    manifest = read_json(manifest_path)
    canonical_manifest_bytes = (
        json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    ).encode("utf-8")
    if manifest_bytes != canonical_manifest_bytes:
        raise RuntimeError("manifest bytes are not canonical")
    expected_manifest_keys = {
        "baselineDigest",
        "capturedAt",
        "files",
        "guardedCommit",
        "predecessor",
        "schemaVersion",
        "selectionReason",
        "sourceBranch",
        "sourceRepository",
    }
    if set(manifest) != expected_manifest_keys:
        raise RuntimeError("manifest keys mismatch")
    if manifest.get("schemaVersion") != 1:
        raise RuntimeError("unsupported manifest schema")
    if manifest.get("selectionReason") != SELECTION_REASON:
        raise RuntimeError("manifest selection reason mismatch")
    if manifest.get("sourceRepository") != str(SOURCE_REPOSITORY):
        raise RuntimeError("manifest source repository mismatch")
    if manifest.get("sourceBranch") != SOURCE_BRANCH:
        raise RuntimeError("manifest source branch mismatch")

    captured_at = manifest.get("capturedAt")
    if not isinstance(captured_at, str):
        raise RuntimeError("manifest capture time must be RFC3339")
    try:
        captured_instant = datetime.fromisoformat(captured_at.replace("Z", "+00:00"))
    except ValueError as error:
        raise RuntimeError("manifest capture time must be RFC3339") from error
    if captured_instant.tzinfo is None or captured_instant.utcoffset() is None:
        raise RuntimeError("manifest capture time must include an offset")

    predecessor = manifest.get("predecessor")
    expected_predecessor = {
        "adminHelper": {
            "mode": "100644",
            "path": ADMIN_PATH,
            "sha256": OLD_ADMIN_SHA256,
            "size": OLD_ADMIN_SIZE,
        },
        "commit": PREDECESSOR_COMMIT,
        "manifestPath": C1_MANIFEST_REPO_PATH,
        "manifestSha256": C1_MANIFEST_SHA256,
    }
    if predecessor != expected_predecessor:
        raise RuntimeError("manifest predecessor identity mismatch")

    guarded_commit = manifest.get("guardedCommit")
    expected_guarded_commit = {
        "changedPaths": [ADMIN_PATH],
        "commit": GUARDED_COMMIT,
        "parent": PREDECESSOR_COMMIT,
    }
    if guarded_commit != expected_guarded_commit:
        raise RuntimeError("manifest guarded commit mismatch")

    records = manifest.get("files")
    expected_records = sorted(MEMBERS, key=lambda member: member["path"])
    if records != expected_records:
        raise RuntimeError("manifest file records mismatch")
    for record in records:
        path_text = record["path"]
        target = files_root / path_text
        resolved = target.resolve(strict=True)
        try:
            resolved.relative_to(files_root.resolve(strict=True))
        except ValueError as error:
            raise RuntimeError(f"baseline path escapes files root: {path_text}") from error
        if target.is_symlink() or not target.is_file():
            raise RuntimeError(f"baseline member must be regular file: {path_text}")
        data = target.read_bytes()
        if len(data) != record["size"]:
            raise RuntimeError(f"size mismatch: {path_text}")
        if sha256(data) != record["sha256"]:
            raise RuntimeError(f"digest mismatch: {path_text}")
        if filesystem_mode(target) != record["mode"]:
            raise RuntimeError(f"mode mismatch: {path_text}")

    expected_digest = compute_baseline_digest(manifest, files_root)
    if manifest.get("baselineDigest") != expected_digest:
        raise RuntimeError("baseline aggregate digest mismatch")
    if readme_path.read_text(encoding="utf-8") != readme_text(manifest):
        raise RuntimeError("baseline README mismatch")
    return manifest


def capture() -> None:
    verify_predecessor()
    if BASELINE_ROOT.exists():
        raise RuntimeError(f"baseline already exists: {BASELINE_ROOT}")

    parents = git_text("rev-list", "--parents", "-n", "1", GUARDED_COMMIT).split()
    if parents != [GUARDED_COMMIT, PREDECESSOR_COMMIT]:
        raise RuntimeError("guarded commit must have exact C1 parent")
    changed_status = git_text(
        "diff-tree", "--no-commit-id", "--name-status", "-r", "--no-renames", GUARDED_COMMIT
    ).splitlines()
    if changed_status != [f"M\t{ADMIN_PATH}"]:
        raise RuntimeError(f"guarded changed-path inventory mismatch: {changed_status}")

    branch_tip = git_text("rev-parse", "--verify", f"refs/heads/{SOURCE_BRANCH}")
    if (
        run_git("merge-base", "--is-ancestor", GUARDED_COMMIT, branch_tip, check=False).returncode
        != 0
    ):
        raise RuntimeError("guarded commit is not contained by source branch")

    predecessor_admin = git_blob(PREDECESSOR_COMMIT, ADMIN_PATH)
    if (
        len(predecessor_admin) != OLD_ADMIN_SIZE
        or sha256(predecessor_admin) != OLD_ADMIN_SHA256
        or git_mode(PREDECESSOR_COMMIT, ADMIN_PATH) != "100644"
    ):
        raise RuntimeError("predecessor Git helper identity mismatch")

    records: list[dict[str, Any]] = []
    blobs: dict[str, bytes] = {}
    for expected in sorted(MEMBERS, key=lambda member: member["path"]):
        path_text = expected["path"]
        data = git_blob(GUARDED_COMMIT, path_text)
        mode = git_mode(GUARDED_COMMIT, path_text)
        if (
            len(data) != expected["size"]
            or sha256(data) != expected["sha256"]
            or mode != expected["mode"]
        ):
            raise RuntimeError(f"guarded Git member identity mismatch: {path_text}")
        blobs[path_text] = data
        records.append(dict(expected))

    temporary_parent = Path(
        tempfile.mkdtemp(prefix=".source-authority-baseline-", dir=RESEARCH_ROOT)
    )
    temporary_root = temporary_parent / "source-authority-baseline"
    try:
        temporary_files = temporary_root / "files"
        for record in records:
            target = temporary_files / record["path"]
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(blobs[record["path"]])
            target.chmod(0o644)

        manifest: dict[str, Any] = {
            "schemaVersion": 1,
            "selectionReason": SELECTION_REASON,
            "sourceRepository": str(SOURCE_REPOSITORY),
            "sourceBranch": SOURCE_BRANCH,
            "capturedAt": datetime.now(timezone.utc)
            .replace(microsecond=0)
            .isoformat()
            .replace("+00:00", "Z"),
            "predecessor": {
                "commit": PREDECESSOR_COMMIT,
                "manifestPath": C1_MANIFEST_REPO_PATH,
                "manifestSha256": C1_MANIFEST_SHA256,
                "adminHelper": {
                    "path": ADMIN_PATH,
                    "mode": "100644",
                    "size": OLD_ADMIN_SIZE,
                    "sha256": OLD_ADMIN_SHA256,
                },
            },
            "guardedCommit": {
                "commit": GUARDED_COMMIT,
                "parent": PREDECESSOR_COMMIT,
                "changedPaths": [ADMIN_PATH],
            },
            "files": records,
        }
        manifest["baselineDigest"] = compute_baseline_digest(manifest, temporary_files)
        (temporary_root / "manifest.json").write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )
        (temporary_root / "README.md").write_text(
            readme_text(manifest), encoding="utf-8"
        )
        verify_at(temporary_root)
        temporary_root.rename(BASELINE_ROOT)
    finally:
        if temporary_parent.exists():
            shutil.rmtree(temporary_parent)
    print(f"OK captured source-authority baseline: {len(records)} files")


def verify() -> None:
    manifest = verify_at(BASELINE_ROOT)
    print(
        "OK source-authority baseline: "
        f"{len(manifest['files'])} files, {manifest['baselineDigest']}"
    )


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
