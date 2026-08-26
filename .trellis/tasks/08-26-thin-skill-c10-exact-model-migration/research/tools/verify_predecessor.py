#!/usr/bin/env python3
"""Verify that C10 reusable inputs come only from the committed blocked C9 predecessor."""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
from collections.abc import Iterable, Mapping, Sequence
from pathlib import Path
from typing import Any

from auth_preflight import AuthPreflightError, load_auth_artifact

RESEARCH_ROOT = Path(__file__).resolve().parents[1]
C10_EVALUATION_ID = "thin-skill-c10-exact-model-migration"
C9_COMMIT = "cacbd39cf8ae30783e2f0383ba9153502ebb12f3"
C9_TASK_PATH = ".trellis/tasks/08-25-thin-skill-c9-first-party-migration"
C9_RESEARCH_PATH = f"{C9_TASK_PATH}/research"
C9_EVALUATION_ID = "thin-skill-c9-first-party-migration"
C9_STATUS = "blocked-nonretryable-provider-failure"
AUTH_EVIDENCE_PATH = "first-party-auth.json"

COPIED_DIRECTORY_MAPPINGS = (
    ("case-sources", f"{C9_RESEARCH_PATH}/case-sources"),
    ("cases", f"{C9_RESEARCH_PATH}/cases"),
    ("source-baseline", f"{C9_RESEARCH_PATH}/source-baseline"),
)
COPIED_FILE_MAPPINGS = (
    ("build_source_baseline.py", f"{C9_RESEARCH_PATH}/build_source_baseline.py"),
    ("migration-matrix.json", f"{C9_RESEARCH_PATH}/migration-matrix.json"),
    ("package-blueprints.json", f"{C9_RESEARCH_PATH}/package-blueprints.json"),
    ("package-blueprints.md", f"{C9_RESEARCH_PATH}/package-blueprints.md"),
    (
        "pilot-semantic-alignment.json",
        f"{C9_RESEARCH_PATH}/pilot-semantic-alignment.json",
    ),
    (
        "pilot-semantic-alignment.md",
        f"{C9_RESEARCH_PATH}/pilot-semantic-alignment.md",
    ),
)
IMMUTABLE_EVALUATION_ARTIFACTS = (
    ("ledger", f"{C9_RESEARCH_PATH}/runs.jsonl"),
    ("summary", f"{C9_RESEARCH_PATH}/summary.json"),
    ("decision", f"{C9_RESEARCH_PATH}/decision.md"),
    ("deterministic-proof", f"{C9_RESEARCH_PATH}/deterministic-proof.json"),
    ("auth-route", f"{C9_RESEARCH_PATH}/first-party-auth.json"),
)
FIXED_EXCLUDED_PATHS = (
    f"{C9_RESEARCH_PATH}/runs.jsonl",
    f"{C9_RESEARCH_PATH}/summary.json",
    f"{C9_RESEARCH_PATH}/decision.md",
    f"{C9_RESEARCH_PATH}/deterministic-proof.json",
    f"{C9_RESEARCH_PATH}/first-party-auth.json",
)
DERIVED_FILES = (
    (
        "evaluation-plan.json",
        f"{C9_RESEARCH_PATH}/evaluation-plan.json",
        "C10 evaluation, authorization, and first-party routing identity",
    ),
    (
        "run-record.schema.json",
        f"{C9_RESEARCH_PATH}/run-record.schema.json",
        "C10 schema identity and authorization reference",
    ),
    (
        "runs.jsonl",
        f"{C9_RESEARCH_PATH}/runs.jsonl",
        "fresh empty C10 append-only ledger",
    ),
    (
        "tools/claude_runner.py",
        f"{C9_RESEARCH_PATH}/tools/claude_runner.py",
        "C10 first-party child environment contract",
    ),
    (
        "tools/evaluation_harness.py",
        f"{C9_RESEARCH_PATH}/tools/evaluation_harness.py",
        "C10 identities, predecessor proof, and auth gate",
    ),
    (
        "tests/test_claude_runner.py",
        f"{C9_RESEARCH_PATH}/tests/test_claude_runner.py",
        "C10 sanitized-environment regression coverage",
    ),
    (
        "tests/test_evaluation_harness.py",
        f"{C9_RESEARCH_PATH}/tests/test_evaluation_harness.py",
        "C10 identity, predecessor, and auth integration coverage",
    ),
    (
        "predecessor.json",
        None,
        "new C10 predecessor provenance manifest",
    ),
    (
        "tools/auth_preflight.py",
        f"{C9_RESEARCH_PATH}/tools/auth_preflight.py",
        "C10 direct-executable authentication preflight",
    ),
    (
        "tools/verify_predecessor.py",
        f"{C9_RESEARCH_PATH}/tools/verify_predecessor.py",
        "C10 Git-object predecessor verifier",
    ),
    (
        "tests/test_auth_preflight.py",
        f"{C9_RESEARCH_PATH}/tests/test_auth_preflight.py",
        "C10 direct route authentication coverage",
    ),
    (
        "tests/test_verify_predecessor.py",
        f"{C9_RESEARCH_PATH}/tests/test_verify_predecessor.py",
        "C10 predecessor provenance coverage",
    ),
)


class PredecessorError(ValueError):
    """Raised when C9 Git-object provenance or C10 copied bytes drift."""


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _reject_duplicate_keys(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise PredecessorError(f"duplicate JSON key: {key}")
        result[key] = value
    return result


def _reject_non_json_number(value: str) -> None:
    raise PredecessorError(f"non-JSON numeric constant: {value}")


def strict_json_object(data: bytes, label: str) -> dict[str, Any]:
    try:
        value = json.loads(
            data.decode("utf-8"),
            object_pairs_hook=_reject_duplicate_keys,
            parse_constant=_reject_non_json_number,
        )
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise PredecessorError(f"{label} is not one UTF-8 JSON object: {error}") from error
    if not isinstance(value, dict):
        raise PredecessorError(f"{label} must be a JSON object")
    return value


def _require_exact_keys(value: Mapping[str, Any], keys: Iterable[str], label: str) -> None:
    expected = set(keys)
    actual = set(value)
    if actual != expected:
        raise PredecessorError(
            f"{label} keys differ; missing={sorted(expected - actual)}, extra={sorted(actual - expected)}"
        )


def _git(
    repo_root: Path,
    arguments: Sequence[str],
    *,
    text: bool = False,
) -> subprocess.CompletedProcess[Any]:
    completed = subprocess.run(
        ["git", "-C", str(repo_root), *arguments],
        capture_output=True,
        check=False,
        text=text,
    )
    if completed.returncode != 0:
        raise PredecessorError(f"Git object command failed: git {' '.join(arguments[:2])}")
    return completed


def git_show(repo_root: Path, path: str) -> bytes:
    return _git(repo_root, ["show", f"{C9_COMMIT}:{path}"]).stdout


def git_paths(repo_root: Path, prefix: str) -> list[str]:
    completed = _git(
        repo_root,
        ["ls-tree", "-r", "--name-only", C9_COMMIT, prefix],
        text=True,
    )
    return sorted(line for line in completed.stdout.splitlines() if line)


def _file_record(path: str, data: bytes, **extra: Any) -> dict[str, Any]:
    return {
        **extra,
        "c9Path": path,
        "sha256": sha256_bytes(data),
        "bytes": len(data),
    }


def expected_copied_records(repo_root: Path) -> list[dict[str, Any]]:
    mappings = list(COPIED_FILE_MAPPINGS)
    for c10_root, c9_root in COPIED_DIRECTORY_MAPPINGS:
        for c9_path in git_paths(repo_root, c9_root):
            relative = c9_path.removeprefix(c9_root + "/")
            mappings.append((f"{c10_root}/{relative}", c9_path))
    records = []
    for c10_path, c9_path in sorted(mappings):
        records.append(_file_record(c9_path, git_show(repo_root, c9_path), c10Path=c10_path))
    return records


def _excluded_category(path: str) -> str:
    if path.startswith(f"{C9_RESEARCH_PATH}/outputs/"):
        return "provider-output"
    if path.endswith(("/runs.jsonl", "/summary.json", "/decision.md")):
        return "terminal-evaluation"
    if path.endswith("/deterministic-proof.json"):
        return "predecessor-deterministic-proof"
    return "provider-failure-evidence"


def expected_excluded_records(repo_root: Path) -> list[dict[str, Any]]:
    paths = [
        *FIXED_EXCLUDED_PATHS,
        *git_paths(repo_root, f"{C9_RESEARCH_PATH}/outputs"),
    ]
    records = []
    for path in sorted(paths):
        records.append(
            _file_record(
                path,
                git_show(repo_root, path),
                category=_excluded_category(path),
            )
        )
    return records


def _verify_repository(repo_root: Path) -> None:
    top_level = _git(repo_root, ["rev-parse", "--show-toplevel"], text=True).stdout.strip()
    if Path(top_level).resolve() != repo_root.resolve():
        raise PredecessorError("repository root does not match git --show-toplevel")
    resolved = _git(repo_root, ["rev-parse", f"{C9_COMMIT}^{{commit}}"], text=True).stdout.strip()
    if resolved != C9_COMMIT:
        raise PredecessorError("C9 predecessor commit does not resolve exactly")


def _verify_predecessor_identity(
    predecessor: Mapping[str, Any],
    *,
    repo_root: Path,
) -> None:
    _require_exact_keys(
        predecessor,
        (
            "commit",
            "taskPath",
            "evaluationId",
            "status",
            "sourceAggregateDigest",
            "acceptedPackageIdentities",
        ),
        "predecessor identity",
    )
    plan_path = f"{C9_RESEARCH_PATH}/evaluation-plan.json"
    plan = strict_json_object(git_show(repo_root, plan_path), plan_path)
    summary_path = f"{C9_RESEARCH_PATH}/summary.json"
    summary = strict_json_object(git_show(repo_root, summary_path), summary_path)
    expected = {
        "commit": C9_COMMIT,
        "taskPath": C9_TASK_PATH,
        "evaluationId": C9_EVALUATION_ID,
        "status": C9_STATUS,
        "sourceAggregateDigest": plan["sourceBaseline"]["aggregateDigest"],
        "acceptedPackageIdentities": {
            package_id: entry["identity"]
            for package_id, entry in plan["acceptedPackages"].items()
        },
    }
    if predecessor != expected:
        raise PredecessorError("predecessor identity differs from committed C9 authority")
    if summary.get("evaluationId") != C9_EVALUATION_ID:
        raise PredecessorError("committed C9 summary evaluation identity drifted")
    live_gate = summary.get("liveGate")
    if not isinstance(live_gate, dict) or live_gate.get("status") != C9_STATUS:
        raise PredecessorError("committed C9 summary is not the blocked predecessor")
    if live_gate.get("fullMigrationClaimAllowed") is not False:
        raise PredecessorError("committed C9 summary unexpectedly permits migration")


def _verify_immutable_artifacts(
    records: Any,
    *,
    repo_root: Path,
) -> None:
    if not isinstance(records, list):
        raise PredecessorError("immutableEvaluationArtifacts must be a list")
    expected = [
        _file_record(path, git_show(repo_root, path), role=role)
        for role, path in IMMUTABLE_EVALUATION_ARTIFACTS
    ]
    if records != expected:
        raise PredecessorError("C9 ledger, summary, or decision digest drifted")


def _verify_copied_inputs(
    records: Any,
    *,
    research_root: Path,
    repo_root: Path,
) -> None:
    if not isinstance(records, list):
        raise PredecessorError("copiedInputs must be a list")
    expected = expected_copied_records(repo_root)
    if records != expected:
        raise PredecessorError("copied input provenance inventory is incomplete or drifted")
    expected_paths = {record["c10Path"] for record in expected}
    actual_directory_paths = {
        path.relative_to(research_root).as_posix()
        for c10_root, _ in COPIED_DIRECTORY_MAPPINGS
        for path in (research_root / c10_root).rglob("*")
        if path.is_file() or path.is_symlink()
    }
    expected_directory_paths = {
        path
        for path in expected_paths
        if any(
            path.startswith(f"{root}/")
            for root, _ in COPIED_DIRECTORY_MAPPINGS
        )
    }
    if actual_directory_paths != expected_directory_paths:
        raise PredecessorError("copied C10 directory inventory contains missing or unbound paths")
    for record in expected:
        path = research_root / record["c10Path"]
        if not path.is_file() or path.is_symlink():
            raise PredecessorError(f"copied C10 input is not a regular file: {record['c10Path']}")
        data = path.read_bytes()
        if len(data) != record["bytes"] or sha256_bytes(data) != record["sha256"]:
            raise PredecessorError(f"copied C10 input differs from C9 Git bytes: {record['c10Path']}")


def _verify_excluded_artifacts(
    records: Any,
    *,
    research_root: Path,
    repo_root: Path,
) -> None:
    if not isinstance(records, list):
        raise PredecessorError("excludedPredecessorArtifacts must be a list")
    expected = expected_excluded_records(repo_root)
    if records != expected:
        raise PredecessorError("excluded C9 output/failure inventory is incomplete or drifted")
    if (research_root / "runs.jsonl").read_bytes() != b"":
        raise PredecessorError("fresh C10 ledger must remain empty during predecessor verification")
    outputs = research_root / "outputs"
    if any(path.is_file() for path in outputs.rglob("*")):
        raise PredecessorError("C9 provider outputs must not be copied into C10")
    for relative in (
        "summary.json",
        "decision.md",
        "deterministic-proof.json",
        "claude-cli-runner-evidence.md",
        "provider-unavailable.json",
        "provider-unavailable.md",
    ):
        if (research_root / relative).exists():
            raise PredecessorError(f"excluded C9 result artifact is present in C10: {relative}")


def _verify_derived_files(
    records: Any,
    *,
    research_root: Path,
    repo_root: Path,
) -> None:
    expected = [
        {"c10Path": c10_path, "c9Path": c9_path, "reason": reason}
        for c10_path, c9_path, reason in DERIVED_FILES
    ]
    if records != expected:
        raise PredecessorError("derived C10 file inventory is incomplete or drifted")
    for record in expected:
        path = research_root / record["c10Path"]
        if not path.is_file() or path.is_symlink():
            raise PredecessorError(f"derived C10 file is not a regular file: {record['c10Path']}")
        c9_path = record["c9Path"]
        if c9_path is not None and path.read_bytes() == git_show(repo_root, c9_path):
            raise PredecessorError(f"derived C10 file unexpectedly equals C9 bytes: {record['c10Path']}")


def _verify_c10_static_inventory(
    manifest: Mapping[str, Any],
    *,
    research_root: Path,
) -> None:
    auth_path = research_root / AUTH_EVIDENCE_PATH
    if auth_path.exists() or auth_path.is_symlink():
        try:
            load_auth_artifact(auth_path)
        except AuthPreflightError as error:
            raise PredecessorError(
                f"C10 first-party auth runtime evidence is invalid: {error}"
            ) from error

    expected = {
        record["c10Path"]
        for section in ("copiedInputs", "derivedFiles")
        for record in manifest[section]
    }
    actual = {
        path.relative_to(research_root).as_posix()
        for path in research_root.rglob("*")
        if (path.is_file() or path.is_symlink())
        and path.relative_to(research_root).as_posix() != AUTH_EVIDENCE_PATH
    }
    if actual != expected:
        raise PredecessorError(
            "C10 static inventory differs from copied plus explicitly derived files"
        )


def verify_predecessor(
    research_root: Path = RESEARCH_ROOT,
    *,
    repo_root: Path | None = None,
) -> dict[str, Any]:
    research_root = research_root.resolve()
    repo_root = (repo_root or research_root.parents[3]).resolve()
    _verify_repository(repo_root)
    path = research_root / "predecessor.json"
    if not path.is_file() or path.is_symlink():
        raise PredecessorError(f"predecessor manifest is not a regular file: {path}")
    manifest = strict_json_object(path.read_bytes(), str(path))
    _require_exact_keys(
        manifest,
        (
            "schemaVersion",
            "evaluationId",
            "predecessor",
            "immutableEvaluationArtifacts",
            "copiedInputs",
            "excludedPredecessorArtifacts",
            "derivedFiles",
        ),
        "predecessor manifest",
    )
    if manifest["schemaVersion"] != 1 or manifest["evaluationId"] != C10_EVALUATION_ID:
        raise PredecessorError("predecessor manifest is not the C10 schema-v1 identity")
    predecessor = manifest["predecessor"]
    if not isinstance(predecessor, dict):
        raise PredecessorError("predecessor identity must be an object")
    _verify_predecessor_identity(predecessor, repo_root=repo_root)
    _verify_immutable_artifacts(manifest["immutableEvaluationArtifacts"], repo_root=repo_root)
    _verify_copied_inputs(
        manifest["copiedInputs"],
        research_root=research_root,
        repo_root=repo_root,
    )
    _verify_excluded_artifacts(
        manifest["excludedPredecessorArtifacts"],
        research_root=research_root,
        repo_root=repo_root,
    )
    _verify_derived_files(
        manifest["derivedFiles"],
        research_root=research_root,
        repo_root=repo_root,
    )
    _verify_c10_static_inventory(manifest, research_root=research_root)
    return manifest


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--research-root", type=Path, default=RESEARCH_ROOT)
    return parser


def main() -> int:
    args = _build_parser().parse_args()
    manifest = verify_predecessor(args.research_root)
    print(
        f"OK {manifest['evaluationId']}: "
        f"{len(manifest['copiedInputs'])} copied inputs authenticated from {C9_COMMIT}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
