#!/usr/bin/env python3
"""Forward-only C9 evaluation preparation, ledger, and deterministic proof tools.

No provider process is started by validation, summary, decision, or proof commands.
The future live-attempt API requires an explicit authorization acknowledgement and
records an append-only reservation before calling the process executor.
"""

from __future__ import annotations

import argparse
import fcntl
import hashlib
import json
import os
import re
import shutil
import subprocess
import tempfile
import uuid
from collections.abc import Callable, Iterable, Mapping, Sequence
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from auth_preflight import (
    AUTH_STATUS_COMMAND,
    REQUIRED_STATUS,
    AuthPreflightError,
    load_auth_artifact,
)
from claude_runner import (
    EXPECTED_MODEL,
    EXPECTED_PROVIDER,
    SANITIZED_ENVIRONMENT_KEYS,
    ProcessExecution,
    ProcessExecutor,
    RunnerValidationError,
    build_command,
    classify_execution,
    execute_process,
    normalize_usable_result,
)

RESEARCH_ROOT = Path(__file__).resolve().parents[1]
EVALUATION_ID = "thin-skill-c9-first-party-migration"
PROOF_ID = "thin-skill-c9-deterministic-proof-v1"
AUTHORIZATION_REF = "c9-first-party-claude-sonnet-5-18-plus-6-infrastructure-retries"
CASE_IDS = (
    "literature-01",
    "literature-02",
    "literature-03",
    "ideation-01",
    "ideation-02",
    "evaluation-01",
    "quest-admin-01",
    "quest-admin-02",
    "quest-admin-03",
)
LIVE_CASE_IDS = CASE_IDS[:6]
DETERMINISTIC_CASE_IDS = CASE_IDS[6:]
ARMS = ("A", "B", "C")
EXPECTED_ARM_C = {
    "literature-01": ("research-literature", "lightweight", ()),
    "literature-02": ("research-literature", "lightweight", ("templates/note-template.md",)),
    "literature-03": ("research-literature", "managed", ("templates/note-template.md",)),
    "ideation-01": ("research-ideation", "lightweight", ()),
    "ideation-02": ("research-ideation", "lightweight", ("templates/opportunity-board-template.md",)),
    "evaluation-01": ("research-idea-evaluation", "managed", ("templates/attack-template.md",)),
    "quest-admin-01": ("research-quest-admin", "root-command", ()),
    "quest-admin-02": ("research-quest-admin", "root-command", ()),
    "quest-admin-03": ("research-quest-admin", "root-command", ()),
}
ZERO_TOLERANCE_IDS = (
    "managed-state-exact-recovery",
    "no-auto-next-stage",
    "no-inferred-h1-h2",
    "no-worker-canonical-mutation",
    "no-worker-nested-execution",
    "package-replay-identity-stable",
    "scientific-ownership-preserved",
    "selected-or-blocked",
    "single-quest-writer",
)
LOGICAL_RUN_RE = re.compile(r"^[a-z0-9][a-z0-9._-]{0,95}$")
SHA256_RE = re.compile(r"^[0-9a-f]{64}$")


class HarnessError(ValueError):
    """Raised when frozen evidence or append-only state violates the C9 contract."""


CommandRunner = Callable[[Sequence[str], Path], subprocess.CompletedProcess[bytes]]


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def canonical_json(value: Any) -> bytes:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode(
        "utf-8"
    )


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _reject_duplicate_keys(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise HarnessError(f"duplicate JSON key: {key}")
        result[key] = value
    return result


def _reject_non_json_number(value: str) -> None:
    raise HarnessError(f"non-JSON numeric constant: {value}")


def strict_json_object(data: bytes, label: str) -> dict[str, Any]:
    try:
        value = json.loads(
            data.decode("utf-8"),
            object_pairs_hook=_reject_duplicate_keys,
            parse_constant=_reject_non_json_number,
        )
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise HarnessError(f"{label} is not one UTF-8 JSON object: {error}") from error
    if not isinstance(value, dict):
        raise HarnessError(f"{label} must be a JSON object")
    return value


def strict_json_file(path: Path) -> dict[str, Any]:
    if not path.is_file() or path.is_symlink():
        raise HarnessError(f"required regular file is missing: {path}")
    return strict_json_object(path.read_bytes(), str(path))


def repository_root(research_root: Path) -> Path:
    try:
        root = research_root.resolve().parents[3]
    except IndexError as error:
        raise HarnessError(f"cannot derive repository root from {research_root}") from error
    if not (root / ".trellis").is_dir():
        raise HarnessError(f"derived repository root has no .trellis directory: {root}")
    return root


def _require_exact_keys(value: Mapping[str, Any], keys: Iterable[str], label: str) -> None:
    expected = set(keys)
    actual = set(value)
    if actual != expected:
        missing = sorted(expected - actual)
        extra = sorted(actual - expected)
        raise HarnessError(f"{label} keys differ; missing={missing}, extra={extra}")


def _require_sha256(value: Any, label: str) -> str:
    if not isinstance(value, str) or SHA256_RE.fullmatch(value) is None:
        raise HarnessError(f"{label} must be a lowercase SHA-256 hex digest")
    return value


def _require_uuid(value: Any, label: str) -> str:
    if not isinstance(value, str):
        raise HarnessError(f"{label} must be a UUID string")
    try:
        parsed = uuid.UUID(value)
    except ValueError as error:
        raise HarnessError(f"{label} must be a UUID string") from error
    if str(parsed) != value.lower():
        raise HarnessError(f"{label} must use canonical UUID spelling")
    return value


def _require_timestamp(value: Any, label: str) -> str:
    if not isinstance(value, str) or not value.endswith("Z"):
        raise HarnessError(f"{label} must be a UTC date-time ending in Z")
    try:
        datetime.fromisoformat(value.removesuffix("Z") + "+00:00")
    except ValueError as error:
        raise HarnessError(f"{label} must be a valid date-time") from error
    return value


def _relative_path(value: Any, label: str) -> Path:
    if not isinstance(value, str) or not value:
        raise HarnessError(f"{label} must be a nonempty relative path")
    path = Path(value)
    if path.is_absolute() or ".." in path.parts or "." in path.parts:
        raise HarnessError(f"{label} must not escape its evidence root")
    return path


def _verified_file(path: Path, expected_sha256: str, expected_bytes: int, label: str) -> bytes:
    if not path.is_file() or path.is_symlink():
        raise HarnessError(f"{label} is not a regular file: {path}")
    data = path.read_bytes()
    if len(data) != expected_bytes or sha256_bytes(data) != expected_sha256:
        raise HarnessError(f"{label} identity drifted: {path}")
    return data


def load_plan(research_root: Path = RESEARCH_ROOT) -> dict[str, Any]:
    plan = strict_json_file(research_root / "evaluation-plan.json")
    if plan.get("schemaVersion") != 1 or plan.get("evaluationId") != EVALUATION_ID:
        raise HarnessError("evaluation-plan.json is not the forward C9 plan")
    if tuple(plan.get("cases", ())) != CASE_IDS:
        raise HarnessError("evaluation plan must list the exact nine C9 cases once in order")
    modes = plan.get("caseModes")
    if not isinstance(modes, dict):
        raise HarnessError("evaluation plan caseModes must be an object")
    if tuple(modes.get("liveProviderCases", ())) != LIVE_CASE_IDS:
        raise HarnessError("evaluation plan must list the exact six live cases")
    if tuple(modes.get("deterministicCases", ())) != DETERMINISTIC_CASE_IDS:
        raise HarnessError("evaluation plan must list the exact three deterministic cases")

    authorization = plan.get("providerAuthorization")
    expected_authorization = {
        "authorizationRef": AUTHORIZATION_REF,
        "status": "authorized-not-started",
        "host": "Claude",
        "provider": EXPECTED_PROVIDER,
        "model": EXPECTED_MODEL,
        "plannedCalls": 18,
        "infrastructureOnlyRetryLimit": 6,
        "hardCapAttempts": 24,
        "modelSubstitutionAllowed": False,
        "providerExpansionAllowed": False,
        "managedWorkerExpansionAllowed": False,
        "nestedWorkersAllowed": False,
        "automaticContinuationAllowed": False,
        "oneProcessPerAttempt": True,
        "oneModelTurnPerAttempt": True,
        "retryRule": "Only an infrastructure failure with no usable model output may consume one of six retries.",
    }
    if authorization != expected_authorization:
        raise HarnessError("provider authorization differs from the exact 18+6 Claude contract")

    expected_first_party_routing = {
        "command": list(AUTH_STATUS_COMMAND),
        "evidencePath": "first-party-auth.json",
        "requiredStatus": REQUIRED_STATUS,
        "sanitizedEnvironmentKeys": list(SANITIZED_ENVIRONMENT_KEYS),
    }
    if plan.get("firstPartyRouting") != expected_first_party_routing:
        raise HarnessError("first-party routing plan differs from the exact sanitized auth contract")

    expected_live_gate = {
        "allApplicableAssertionsMustPass": True,
        "mayPassBeforeRequiredCalls": False,
        "requiredArmCounts": {"A": 6, "B": 6, "C": 6},
        "requiredUsableCalls": 18,
    }
    if plan.get("liveGate") != expected_live_gate:
        raise HarnessError("live gate must require all 18 calls and every applicable assertion")

    zero_checks = plan.get("zeroToleranceChecks")
    if not isinstance(zero_checks, list):
        raise HarnessError("zeroToleranceChecks must be a list")
    if tuple(item.get("id") for item in zero_checks if isinstance(item, dict)) != ZERO_TOLERANCE_IDS:
        raise HarnessError("evaluation plan must contain the exact nine zero-tolerance checks")

    source = plan.get("sourceBaseline")
    if not isinstance(source, dict):
        raise HarnessError("sourceBaseline must be an object")
    manifest_relative = _relative_path(source.get("manifest"), "source manifest path")
    manifest_path = research_root / manifest_relative
    manifest_data = manifest_path.read_bytes()
    if sha256_bytes(manifest_data) != source.get("manifestSha256"):
        raise HarnessError("C8 source manifest SHA-256 drifted")
    manifest = strict_json_object(manifest_data, str(manifest_path))
    expected_source = {
        "aggregateDigest": manifest.get("aggregateDigest"),
        "commit": manifest.get("source", {}).get("commit"),
        "tree": manifest.get("source", {}).get("tree"),
        "parent": manifest.get("source", {}).get("parent"),
        "branch": manifest.get("source", {}).get("branch"),
        "fileCount": manifest.get("inventory", {}).get("fileCount"),
        "skillCount": manifest.get("inventory", {}).get("skillCount"),
    }
    for key, expected in expected_source.items():
        if source.get(key) != expected:
            raise HarnessError(f"sourceBaseline.{key} differs from the frozen manifest")
    if source.get("mutableExternalSourceReadAllowed") is not False:
        raise HarnessError("source verification must remain offline")

    guarded = plan.get("guardedSingleWriterEvidence")
    if not isinstance(guarded, dict):
        raise HarnessError("guardedSingleWriterEvidence must be an object")
    proof_relative = _relative_path(guarded.get("proofPath"), "single-writer proof path")
    proof_path = repository_root(research_root) / proof_relative
    proof_data = proof_path.read_bytes()
    if sha256_bytes(proof_data) != guarded.get("proofSha256"):
        raise HarnessError("guarded single-writer proof identity drifted")
    guarded_proof = strict_json_object(proof_data, str(proof_path))
    if guarded.get("proofId") != "c7-single-writer-remediation-v1" or guarded_proof.get("proofId") != guarded.get("proofId"):
        raise HarnessError("guarded single-writer proof ID drifted")
    if guarded.get("sourceCommit") != source.get("commit"):
        raise HarnessError("guarded single-writer source commit differs from the C8 baseline")
    source_admin = research_root / _relative_path(
        guarded.get("sourceAdminPath"), "guarded source-admin path"
    )
    source_admin_data = source_admin.read_bytes()
    if sha256_bytes(source_admin_data) != guarded.get("sourceAdminSha256"):
        raise HarnessError("guarded C8 source-admin helper identity drifted")

    accepted = plan.get("acceptedPackages")
    if not isinstance(accepted, dict) or set(accepted) != {
        "research-literature",
        "research-ideation",
        "research-idea-evaluation",
        "research-quest-admin",
    }:
        raise HarnessError("acceptedPackages must contain exactly the four accepted packages")
    return plan


def _predecessor_evidence(research_root: Path) -> dict[str, Any]:
    path = research_root / "predecessor.json"
    data = path.read_bytes()
    manifest = strict_json_object(data, str(path))
    predecessor = manifest.get("predecessor")
    if (
        manifest.get("evaluationId") != EVALUATION_ID
        or not isinstance(predecessor, dict)
        or predecessor.get("commit")
        != "715512230fee792377567c9cbba46319f2569c07"
        or predecessor.get("evaluationId") != "thin-skill-c8-full-migration"
        or predecessor.get("status") != "blocked-nonretryable-provider-failure"
    ):
        raise HarnessError("predecessor.json does not bind the exact blocked C8 identity")
    return {
        "path": "predecessor.json",
        "sha256": sha256_bytes(data),
        "bytes": len(data),
        "commit": predecessor["commit"],
        "evaluationId": predecessor["evaluationId"],
        "status": predecessor["status"],
    }


def _first_party_routing_evidence(
    research_root: Path,
    plan: Mapping[str, Any],
) -> dict[str, Any]:
    relative = _relative_path(
        plan["firstPartyRouting"]["evidencePath"],
        "first-party auth evidence path",
    )
    path = research_root / relative
    try:
        artifact = load_auth_artifact(path)
    except AuthPreflightError as error:
        raise HarnessError(f"first-party auth evidence is invalid: {error}") from error
    data = path.read_bytes()
    return {
        "path": relative.as_posix(),
        "sha256": sha256_bytes(data),
        "bytes": len(data),
        "checkedAt": artifact["checkedAt"],
        "status": artifact["status"],
        "rawStatusSha256": artifact["rawStatusSha256"],
        "rawStatusBytes": artifact["rawStatusBytes"],
    }


def _validate_input_file(research_root: Path, record: Mapping[str, Any], case_id: str) -> None:
    _require_exact_keys(record, ("bytes", "path", "role", "sha256", "workspacePath"), "input file")
    relative = _relative_path(record["path"], "input path")
    expected_prefix = Path("cases") / "inputs" / case_id
    if tuple(relative.parts[:3]) != tuple(expected_prefix.parts):
        raise HarnessError(f"{case_id} input path is outside its frozen case directory")
    workspace = _relative_path(record["workspacePath"], "input workspace path")
    if not workspace.parts or workspace.parts[0] != "input":
        raise HarnessError("input workspace path must remain under input/")
    _verified_file(
        research_root / relative,
        _require_sha256(record["sha256"], "input SHA-256"),
        record["bytes"],
        f"{case_id} input",
    )


def load_cases(
    research_root: Path = RESEARCH_ROOT,
    plan: dict[str, Any] | None = None,
) -> dict[str, dict[str, Any]]:
    plan = plan or load_plan(research_root)
    result: dict[str, dict[str, Any]] = {}
    seen_zero: set[str] = set()
    for case_id in plan["cases"]:
        path = research_root / "cases" / f"{case_id}.json"
        case = strict_json_file(path)
        if case.get("schemaVersion") != 1 or case.get("caseId") != case_id:
            raise HarnessError(f"case identity mismatch: {path}")
        if case.get("applicableArms") != list(ARMS):
            raise HarnessError(f"{case_id} must have exactly A/B/C arms")
        units = case.get("plannedInvocationUnits")
        expected_units = {arm: 1 for arm in ARMS} if case_id in LIVE_CASE_IDS else {arm: 0 for arm in ARMS}
        if units != expected_units:
            raise HarnessError(f"{case_id} planned invocation units must equal {expected_units}")
        expected_mode = "live-provider" if case_id in LIVE_CASE_IDS else "deterministic"
        if case.get("mode") != expected_mode:
            raise HarnessError(f"{case_id} mode must be {expected_mode}")

        inputs = case.get("inputFiles")
        if not isinstance(inputs, list) or not inputs:
            raise HarnessError(f"{case_id} must freeze at least one input")
        input_paths: set[str] = set()
        workspace_paths: set[str] = set()
        for item in inputs:
            if not isinstance(item, dict):
                raise HarnessError(f"{case_id} input record must be an object")
            _validate_input_file(research_root, item, case_id)
            if item["path"] in input_paths or item["workspacePath"] in workspace_paths:
                raise HarnessError(f"{case_id} has a duplicate input path")
            input_paths.add(item["path"])
            workspace_paths.add(item["workspacePath"])

        arm_c = case.get("armC")
        if not isinstance(arm_c, dict):
            raise HarnessError(f"{case_id} armC must be an object")
        package = arm_c.get("executionPackage")
        if not isinstance(package, dict):
            raise HarnessError(f"{case_id} armC executionPackage must be an object")
        package_id = package.get("id")
        accepted_entry = plan["acceptedPackages"].get(package_id)
        if not isinstance(accepted_entry, dict) or package != accepted_entry.get("identity"):
            raise HarnessError(f"{case_id} armC does not bind an accepted package identity")
        expected_package_id, expected_profile, expected_members = EXPECTED_ARM_C[case_id]
        if package_id != expected_package_id or arm_c.get("profile") != expected_profile:
            raise HarnessError(f"{case_id} Arm C package/profile drifted")
        requested_members = arm_c.get("requestedMembers")
        if not isinstance(requested_members, list) or tuple(requested_members) != expected_members:
            raise HarnessError(f"{case_id} Arm C requested members drifted")
        package_files = {item["path"] for item in accepted_entry.get("files", ()) if isinstance(item, dict)}
        if not set(requested_members) <= package_files:
            raise HarnessError(f"{case_id} requests a member absent from its accepted package")

        assertions = case.get("assertions")
        if not isinstance(assertions, list) or not assertions:
            raise HarnessError(f"{case_id} assertions must be a nonempty list")
        assertion_ids: set[str] = set()
        for assertion in assertions:
            if not isinstance(assertion, dict):
                raise HarnessError(f"{case_id} assertion must be an object")
            _require_exact_keys(assertion, ("description", "id", "zeroTolerance"), "case assertion")
            assertion_id = assertion["id"]
            if not isinstance(assertion_id, str) or assertion_id in assertion_ids:
                raise HarnessError(f"{case_id} assertion IDs must be unique strings")
            assertion_ids.add(assertion_id)
            if assertion["zeroTolerance"] is True:
                seen_zero.add(assertion_id)
        result[case_id] = case
    if seen_zero != set(ZERO_TOLERANCE_IDS):
        raise HarnessError("case assertions do not cover the exact nine zero-tolerance checks")
    return result


def _validate_source_sets(research_root: Path, plan: Mapping[str, Any]) -> None:
    manifest = strict_json_file(research_root / plan["sourceBaseline"]["manifest"])
    by_path = {record["path"]: record for record in manifest["files"]}
    source_sets = plan.get("arms", {}).get("B", {}).get("sourceSets")
    if not isinstance(source_sets, dict) or set(source_sets) != {
        "literature",
        "ideation",
        "evaluation",
        "quest-admin",
    }:
        raise HarnessError("Arm B must define the exact four C8 source sets")
    for set_name, records in source_sets.items():
        if not isinstance(records, list) or not records:
            raise HarnessError(f"Arm B source set {set_name} must be nonempty")
        seen: set[str] = set()
        for record in records:
            if not isinstance(record, dict):
                raise HarnessError(f"Arm B source record in {set_name} must be an object")
            _require_exact_keys(record, ("blobOid", "mode", "path", "role", "sha256", "size"), "source record")
            path = record["path"]
            manifest_record = by_path.get(path)
            if path in seen or not isinstance(manifest_record, dict) or any(
                manifest_record.get(key) != value for key, value in record.items()
            ):
                raise HarnessError(f"Arm B source record differs from manifest: {path}")
            seen.add(path)
            _verified_file(
                research_root / "source-baseline" / "files" / path,
                _require_sha256(record["sha256"], "source SHA-256"),
                record["size"],
                f"Arm B {set_name} source",
            )


def _validate_package_files(research_root: Path, plan: Mapping[str, Any]) -> None:
    root = repository_root(research_root)
    for package_id, entry in plan["acceptedPackages"].items():
        if not isinstance(entry, dict):
            raise HarnessError(f"accepted package {package_id} entry must be an object")
        package_root = root / _relative_path(entry.get("root"), "package root")
        files = entry.get("files")
        if not isinstance(files, list) or not files:
            raise HarnessError(f"accepted package {package_id} must freeze its member bytes")
        actual_paths = {
            path.relative_to(package_root).as_posix()
            for path in package_root.rglob("*")
            if path.is_file() and not path.is_symlink()
        }
        expected_paths: set[str] = set()
        for record in files:
            if not isinstance(record, dict):
                raise HarnessError(f"accepted package {package_id} file record must be an object")
            _require_exact_keys(record, ("bytes", "path", "sha256"), "package file")
            relative = _relative_path(record["path"], "package file path")
            expected_paths.add(relative.as_posix())
            _verified_file(
                package_root / relative,
                _require_sha256(record["sha256"], "package file SHA-256"),
                record["bytes"],
                f"accepted package {package_id}",
            )
        if actual_paths != expected_paths:
            raise HarnessError(f"accepted package {package_id} file inventory drifted")


def validate_static_evidence(
    research_root: Path = RESEARCH_ROOT,
) -> tuple[dict[str, Any], dict[str, dict[str, Any]]]:
    plan = load_plan(research_root)
    cases = load_cases(research_root, plan)
    _validate_source_sets(research_root, plan)
    _validate_package_files(research_root, plan)
    schema = strict_json_file(research_root / "run-record.schema.json")
    if schema.get("$schema") != "https://json-schema.org/draft/2020-12/schema":
        raise HarnessError("run-record.schema.json must use JSON Schema draft 2020-12")
    if (
        schema.get("$id") != "https://trellis.local/schemas/c9-run-record.schema.json"
        or schema.get("title") != "C9 append-only evaluation ledger record"
        or schema.get("$defs", {})
        .get("attemptReservation", {})
        .get("properties", {})
        .get("authorizationRef", {})
        .get("const")
        != AUTHORIZATION_REF
    ):
        raise HarnessError("run-record.schema.json does not carry the exact C9 identity")
    runs_path = research_root / "runs.jsonl"
    if not runs_path.is_file() or runs_path.is_symlink():
        raise HarnessError("runs.jsonl must be a regular append-only ledger file")
    read_runs(research_root, plan=plan, cases=cases)
    return plan, cases


def _case_sha256(research_root: Path, case_id: str) -> str:
    return sha256_bytes((research_root / "cases" / f"{case_id}.json").read_bytes())


def identity_snapshot(
    research_root: Path,
    plan: Mapping[str, Any],
    case: Mapping[str, Any],
    arm: str,
) -> dict[str, Any]:
    input_digest = sha256_bytes(canonical_json(case["inputFiles"]))
    if arm == "A":
        method = {"kind": "bare", "identity": None}
    elif arm == "B":
        source_set = case["armBSourceSet"]
        method = {
            "kind": "c8-source-baseline",
            "identity": {
                "aggregateDigest": plan["sourceBaseline"]["aggregateDigest"],
                "commit": plan["sourceBaseline"]["commit"],
                "tree": plan["sourceBaseline"]["tree"],
                "manifestSha256": plan["sourceBaseline"]["manifestSha256"],
                "sourceSet": source_set,
                "sourceSetSha256": sha256_bytes(canonical_json(plan["arms"]["B"]["sourceSets"][source_set])),
            },
        }
    elif arm == "C":
        method = {
            "kind": "schema-v3-execution-package",
            "identity": {
                "executionPackage": case["armC"]["executionPackage"],
                "profile": case["armC"]["profile"],
                "requestedMembers": case["armC"]["requestedMembers"],
            },
        }
    else:
        raise HarnessError(f"unknown arm: {arm}")
    return {
        "caseSha256": _case_sha256(research_root, case["caseId"]),
        "inputInventorySha256": input_digest,
        "methodIdentity": method,
    }


def _render_files(title: str, files: list[tuple[str, bytes]]) -> str:
    sections = [f"# {title}"]
    for relative, data in files:
        try:
            text = data.decode("utf-8")
        except UnicodeDecodeError as error:
            raise HarnessError(f"prompt material must be UTF-8 text: {relative}") from error
        sections.extend((f"\n## `{relative}`\n", text.rstrip(), ""))
    return "\n".join(sections).rstrip() + "\n"


def _workspace_manifest(root: Path) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for path in sorted(item for item in root.rglob("*") if item.is_file() and not item.is_symlink()):
        data = path.read_bytes()
        records.append(
            {
                "path": path.relative_to(root).as_posix(),
                "sha256": sha256_bytes(data),
                "bytes": len(data),
            }
        )
    return records


def prepare_run(
    run_id: str,
    case_id: str,
    arm: str,
    research_root: Path = RESEARCH_ROOT,
) -> Path:
    """Materialize one isolated future live workspace without launching a provider."""

    plan, cases = validate_static_evidence(research_root)
    _first_party_routing_evidence(research_root, plan)
    if LOGICAL_RUN_RE.fullmatch(run_id) is None:
        raise HarnessError("run ID must match the frozen lowercase path-safe grammar")
    if case_id not in LIVE_CASE_IDS:
        raise HarnessError("provider workspaces are forbidden for deterministic Quest cases")
    if arm not in ARMS:
        raise HarnessError("arm must be A, B, or C")
    case = cases[case_id]
    output_root = research_root / "outputs" / run_id
    if output_root.exists():
        raise HarnessError(f"output path already exists and is immutable: {output_root}")
    records = read_runs(research_root, plan=plan, cases=cases)
    if any(record.get("logicalRunId") == run_id for record in records):
        raise HarnessError(f"run ID already exists in the append-only ledger: {run_id}")

    outputs_root = research_root / "outputs"
    outputs_root.mkdir(parents=True, exist_ok=True)
    temp_root = Path(tempfile.mkdtemp(prefix=f".{run_id}-", dir=outputs_root))
    try:
        workspace = temp_root / "workspace"
        workspace.mkdir()
        input_prompt_files: list[tuple[str, bytes]] = []
        for record in case["inputFiles"]:
            source = research_root / record["path"]
            data = _verified_file(source, record["sha256"], record["bytes"], f"{case_id} input")
            target = workspace / record["workspacePath"]
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
            if record["role"] in {"task", "evidence"}:
                input_prompt_files.append((record["workspacePath"], data))

        method_files: list[tuple[str, bytes]] = []
        if arm == "B":
            source_set = case["armBSourceSet"]
            for record in plan["arms"]["B"]["sourceSets"][source_set]:
                source = research_root / "source-baseline" / "files" / record["path"]
                data = _verified_file(source, record["sha256"], record["size"], "Arm B source")
                relative = Path("method") / "source" / record["path"]
                target = workspace / relative
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(data)
                method_files.append((relative.as_posix(), data))
        elif arm == "C":
            package_id = case["armC"]["executionPackage"]["id"]
            package_entry = plan["acceptedPackages"][package_id]
            package_root = repository_root(research_root) / package_entry["root"]
            selected = {"skill.json", "SKILL.md", *case["armC"]["requestedMembers"]}
            records_by_path = {record["path"]: record for record in package_entry["files"]}
            if not selected <= set(records_by_path):
                raise HarnessError(f"{case_id} requests a package member absent from the frozen package")
            for relative_string in sorted(selected):
                record = records_by_path[relative_string]
                data = _verified_file(
                    package_root / relative_string,
                    record["sha256"],
                    record["bytes"],
                    "Arm C package member",
                )
                relative = Path("method") / "package" / relative_string
                target = workspace / relative
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(data)
                method_files.append((relative.as_posix(), data))

        prompts = workspace / "prompts"
        prompts.mkdir()
        method_header = {
            "A": "Bare arm: no Skill, source method, or package instructions are supplied.",
            "B": "Source arm: follow only the exact frozen C8 source method below.",
            "C": "Package arm: follow only the exact accepted schema-v3 package method below.",
        }[arm]
        system_parts = [
            "# C9 isolated single-turn execution",
            "",
            method_header,
            "Complete exactly one bounded case unit. Do not invoke a Skill, Workflow, capability, Procedure, Dispatch, worker, provider, model, tool, or automatic continuation. Do not mutate canonical Quest, gate, Workflow, Dispatch, Approval, Result, Proposal, or writer state. Return only the requested case output. You cannot inspect sibling-arm outputs.",
        ]
        if method_files:
            system_parts.extend(("", _render_files("Frozen method material", method_files).rstrip()))
        (prompts / "system.md").write_text("\n".join(system_parts).rstrip() + "\n", encoding="utf-8")
        (prompts / "task.md").write_text(
            _render_files("Frozen case input", input_prompt_files), encoding="utf-8"
        )

        manifest = {
            "schemaVersion": 1,
            "logicalRunId": run_id,
            "caseId": case_id,
            "arm": arm,
            "identitySnapshot": identity_snapshot(research_root, plan, case, arm),
            "files": _workspace_manifest(workspace),
        }
        (temp_root / "workspace-manifest.json").write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )
        os.replace(temp_root, output_root)
    except BaseException:
        shutil.rmtree(temp_root, ignore_errors=True)
        raise
    return output_root


def verify_prepared_workspace(
    run_id: str,
    case_id: str,
    arm: str,
    research_root: Path,
    plan: Mapping[str, Any],
    case: Mapping[str, Any],
) -> Path:
    root = research_root / "outputs" / run_id
    manifest = strict_json_file(root / "workspace-manifest.json")
    if manifest.get("logicalRunId") != run_id or manifest.get("caseId") != case_id or manifest.get("arm") != arm:
        raise HarnessError("prepared workspace identity differs from the requested logical run")
    expected_snapshot = identity_snapshot(research_root, plan, case, arm)
    if manifest.get("identitySnapshot") != expected_snapshot:
        raise HarnessError("prepared workspace identity snapshot drifted")
    workspace = root / "workspace"
    if manifest.get("files") != _workspace_manifest(workspace):
        raise HarnessError("prepared workspace bytes drifted")
    allowed_top = {"input", "method", "prompts"}
    if any(path.name not in allowed_top for path in workspace.iterdir()):
        raise HarnessError("prepared workspace contains an unbound top-level path")
    return workspace


def _validate_reservation_shape(record: Mapping[str, Any]) -> None:
    _require_exact_keys(
        record,
        (
            "schemaVersion",
            "recordKind",
            "recordId",
            "createdAt",
            "logicalRunId",
            "attemptId",
            "caseId",
            "arm",
            "attemptNumber",
            "retryNumber",
            "authorizationRef",
            "provider",
            "model",
            "sessionId",
            "outputDirectory",
            "identitySnapshot",
        ),
        "attempt reservation",
    )
    if record["schemaVersion"] != 1 or record["recordKind"] != "attempt-reservation":
        raise HarnessError("attempt reservation version or kind is invalid")
    _require_uuid(record["recordId"], "reservation recordId")
    _require_uuid(record["attemptId"], "reservation attemptId")
    _require_uuid(record["sessionId"], "reservation sessionId")
    _require_timestamp(record["createdAt"], "reservation createdAt")
    if not isinstance(record["logicalRunId"], str) or LOGICAL_RUN_RE.fullmatch(record["logicalRunId"]) is None:
        raise HarnessError("reservation logicalRunId is invalid")
    if record["caseId"] not in LIVE_CASE_IDS or record["arm"] not in ARMS:
        raise HarnessError("provider attempts are allowed only for live A/B/C slots")
    if isinstance(record["attemptNumber"], bool) or not isinstance(record["attemptNumber"], int) or record["attemptNumber"] < 1:
        raise HarnessError("attemptNumber must be a positive integer")
    if record["retryNumber"] != record["attemptNumber"] - 1 or not 0 <= record["retryNumber"] <= 6:
        raise HarnessError("retryNumber must equal attemptNumber - 1 and remain within six")
    if record["authorizationRef"] != AUTHORIZATION_REF:
        raise HarnessError("reservation authorizationRef is not the finite C9 authorization")
    if record["provider"] != EXPECTED_PROVIDER or record["model"] != EXPECTED_MODEL:
        raise HarnessError("reservation provider/model substitution is forbidden")
    expected_output = f"outputs/{record['logicalRunId']}/attempts/{record['attemptId']}"
    if record["outputDirectory"] != expected_output:
        raise HarnessError("reservation outputDirectory is not unique to its run and attempt")
    _relative_path(record["outputDirectory"], "reservation outputDirectory")


def _validate_file_capture(
    capture: Mapping[str, Any],
    *,
    expected_path: str,
    research_root: Path,
    label: str,
) -> bytes:
    _require_exact_keys(capture, ("bytes", "path", "sha256"), label)
    if capture["path"] != expected_path:
        raise HarnessError(f"{label} path differs from the reserved attempt path")
    if isinstance(capture["bytes"], bool) or not isinstance(capture["bytes"], int) or capture["bytes"] < 0:
        raise HarnessError(f"{label} byte length must be a nonnegative integer")
    return _verified_file(
        research_root / _relative_path(capture["path"], f"{label} path"),
        _require_sha256(capture["sha256"], f"{label} SHA-256"),
        capture["bytes"],
        label,
    )


def _validate_result_shape(
    record: Mapping[str, Any],
    reservation: Mapping[str, Any],
    research_root: Path,
) -> None:
    _require_exact_keys(
        record,
        (
            "schemaVersion",
            "recordKind",
            "recordId",
            "createdAt",
            "supersedesRecordId",
            "logicalRunId",
            "attemptId",
            "caseId",
            "arm",
            "attemptNumber",
            "retryNumber",
            "identitySnapshot",
            "startedAt",
            "finishedAt",
            "process",
            "stdout",
            "stderr",
            "outcome",
            "providerResult",
        ),
        "attempt result",
    )
    if record["schemaVersion"] != 1 or record["recordKind"] != "attempt-result":
        raise HarnessError("attempt result version or kind is invalid")
    _require_uuid(record["recordId"], "result recordId")
    _require_timestamp(record["createdAt"], "result createdAt")
    _require_timestamp(record["startedAt"], "result startedAt")
    _require_timestamp(record["finishedAt"], "result finishedAt")
    if record["supersedesRecordId"] != reservation["recordId"]:
        raise HarnessError("attempt result must supersede its exact reservation")
    for key in (
        "logicalRunId",
        "attemptId",
        "caseId",
        "arm",
        "attemptNumber",
        "retryNumber",
        "identitySnapshot",
    ):
        if record[key] != reservation[key]:
            raise HarnessError(f"attempt result changed immutable reservation field: {key}")

    process = record["process"]
    if not isinstance(process, dict):
        raise HarnessError("attempt process must be an object")
    _require_exact_keys(
        process,
        ("command", "cwd", "exitCode", "launched", "pid", "signal", "spawnError", "timedOut"),
        "attempt process",
    )
    if not isinstance(process["launched"], bool):
        raise HarnessError("process.launched must be boolean")
    if process["pid"] is not None and (
        isinstance(process["pid"], bool)
        or not isinstance(process["pid"], int)
        or process["pid"] < 1
    ):
        raise HarnessError("process.pid must be a positive integer or null")
    if process["launched"] is False and process["pid"] is not None:
        raise HarnessError("a process that did not launch cannot have a PID")
    if process["exitCode"] is not None and (
        isinstance(process["exitCode"], bool) or not isinstance(process["exitCode"], int)
    ):
        raise HarnessError("process.exitCode must be an integer or null")
    if process["signal"] is not None and not isinstance(process["signal"], str):
        raise HarnessError("process.signal must be a string or null")
    if not isinstance(process["timedOut"], bool):
        raise HarnessError("process.timedOut must be boolean")
    if process["spawnError"] is not None and not isinstance(process["spawnError"], str):
        raise HarnessError("process.spawnError must be a string or null")
    if process["launched"] is True and process["spawnError"] is not None:
        raise HarnessError("a launched process cannot also report a spawn error")
    if (
        not isinstance(process["command"], list)
        or not process["command"]
        or any(not isinstance(argument, str) for argument in process["command"])
    ):
        raise HarnessError("attempt result does not record a valid provider command")
    workspace = research_root / "outputs" / record["logicalRunId"] / "workspace"
    expected_command = build_command(
        (workspace / "prompts" / "task.md").read_text(encoding="utf-8"),
        (workspace / "prompts" / "system.md").read_text(encoding="utf-8"),
        reservation["sessionId"],
    )
    if process["command"] != expected_command:
        raise HarnessError("attempt result command differs from the exact authorized Claude contract")
    if process["cwd"] != f"outputs/{record['logicalRunId']}/workspace":
        raise HarnessError("provider process cwd must be its isolated workspace")
    _relative_path(process["cwd"], "process cwd")

    base = record["outputDirectory"] if "outputDirectory" in record else reservation["outputDirectory"]
    stdout_bytes = _validate_file_capture(
        record["stdout"],
        expected_path=f"{base}/stdout.json",
        research_root=research_root,
        label="stdout capture",
    )
    stderr_bytes = _validate_file_capture(
        record["stderr"],
        expected_path=f"{base}/stderr.log",
        research_root=research_root,
        label="stderr capture",
    )

    outcome = record["outcome"]
    if not isinstance(outcome, dict):
        raise HarnessError("attempt outcome must be an object")
    _require_exact_keys(outcome, ("classification", "reason", "retryEligible", "usableModelResult"), "attempt outcome")
    classification = outcome["classification"]
    if classification not in {"usable-completion", "infrastructure-failure", "nonretryable-failure"}:
        raise HarnessError("attempt outcome classification is invalid")
    if not isinstance(outcome["usableModelResult"], bool) or not isinstance(
        outcome["retryEligible"], bool
    ):
        raise HarnessError("attempt outcome booleans must be explicit")
    if not isinstance(outcome["reason"], str) or not outcome["reason"]:
        raise HarnessError("attempt outcome reason must be nonempty")
    expected_retry = classification == "infrastructure-failure" and outcome["usableModelResult"] is False
    if outcome["retryEligible"] is not expected_retry:
        raise HarnessError("only no-output infrastructure failure may be retry eligible")
    provider_result = record["providerResult"]
    if provider_result is not None:
        if outcome["usableModelResult"] is not True or not isinstance(provider_result, dict):
            raise HarnessError("accepted provider metadata requires usable model output")
        raw_result = provider_result.get("rawResult")
        if not isinstance(raw_result, dict):
            raise HarnessError("provider metadata must preserve its complete raw result object")
        try:
            normalized = normalize_usable_result(
                raw_result,
                expected_session_id=reservation["sessionId"],
            )
        except RunnerValidationError as error:
            raise HarnessError(f"provider metadata violates runner contract: {error}") from error
        if normalized != provider_result:
            raise HarnessError("normalized provider metadata differs from its preserved raw result")
    if classification == "usable-completion" and provider_result is None:
        raise HarnessError("usable completion must preserve one usable provider result")
    if outcome["usableModelResult"] is False and provider_result is not None:
        raise HarnessError("an unusable attempt cannot attach accepted provider metadata")

    derived = classify_execution(
        ProcessExecution(
            launched=process["launched"],
            pid=process["pid"],
            exit_code=process["exitCode"],
            signal=process["signal"],
            stdout=stdout_bytes,
            stderr=stderr_bytes,
            timed_out=process["timedOut"],
            spawn_error=process["spawnError"],
        ),
        expected_session_id=reservation["sessionId"],
    )
    derived_outcome = {
        "classification": derived.classification,
        "usableModelResult": derived.usable_model_result,
        "retryEligible": derived.retry_eligible,
        "reason": derived.reason,
    }
    if outcome != derived_outcome or provider_result != derived.provider_result:
        raise HarnessError("attempt outcome/provider metadata are not derived from captured process bytes")


def _validate_assessment(
    assessment: Mapping[str, Any],
    *,
    case: Mapping[str, Any],
    result: Mapping[str, Any],
    allowed_evidence_roots: tuple[str, ...],
) -> None:
    _require_exact_keys(assessment, ("assertions", "outputSha256", "resultRecordId"), "arm assessment")
    if assessment["resultRecordId"] != result["recordId"]:
        raise HarnessError("arm assessment must cite the exact active result record")
    expected_output_sha = sha256_bytes(result["providerResult"]["result"].encode("utf-8"))
    if assessment["outputSha256"] != expected_output_sha:
        raise HarnessError("arm assessment output digest differs from provider result text")
    assertions = assessment["assertions"]
    expected_ids = [item["id"] for item in case["assertions"]]
    if not isinstance(assertions, list) or [item.get("assertionId") for item in assertions if isinstance(item, dict)] != expected_ids:
        raise HarnessError("arm assessment must cover every case assertion exactly once in case order")
    for item in assertions:
        _require_exact_keys(item, ("assertionId", "evidence", "status"), "assertion assessment")
        if item["status"] not in {"pass", "fail", "not-assessed"}:
            raise HarnessError("assertion assessment status is invalid")
        if not isinstance(item["evidence"], list):
            raise HarnessError("assertion evidence must be a list")
        for evidence in item["evidence"]:
            relative = _relative_path(evidence, "assertion evidence path").as_posix()
            if not any(relative == root or relative.startswith(root + "/") for root in allowed_evidence_roots):
                raise HarnessError("case evaluator cited evidence outside the three unblinded arm outputs")


def _validate_case_evaluation(
    record: Mapping[str, Any],
    *,
    cases: Mapping[str, Mapping[str, Any]],
    usable_by_pair: Mapping[tuple[str, str], Mapping[str, Any]],
    reservations: Mapping[str, Mapping[str, Any]],
) -> None:
    _require_exact_keys(
        record,
        ("arms", "caseId", "createdAt", "evaluator", "notes", "recordId", "recordKind", "schemaVersion", "zeroTolerancePass"),
        "case evaluation",
    )
    if record["schemaVersion"] != 1 or record["recordKind"] != "case-evaluation":
        raise HarnessError("case evaluation version or kind is invalid")
    _require_uuid(record["recordId"], "case evaluation recordId")
    _require_timestamp(record["createdAt"], "case evaluation createdAt")
    case_id = record["caseId"]
    if case_id not in LIVE_CASE_IDS:
        raise HarnessError("case-evaluation records are only for the six live cases")
    evaluator = record["evaluator"]
    if not isinstance(evaluator, dict) or set(evaluator) != {"kind", "id"} or evaluator["kind"] != "root" or not isinstance(evaluator["id"], str) or not evaluator["id"]:
        raise HarnessError("case evaluator must be an explicit root identity")
    if not isinstance(record["arms"], dict) or set(record["arms"]) != set(ARMS):
        raise HarnessError("case evaluator barrier requires exact A/B/C assessments")

    active_results: dict[str, Mapping[str, Any]] = {}
    evidence_roots: list[str] = []
    for arm in ARMS:
        result = usable_by_pair.get((case_id, arm))
        if result is None:
            raise HarnessError(f"evaluator barrier is closed until {case_id}/{arm} has a usable completion")
        active_results[arm] = result
        reservation = reservations[result["attemptId"]]
        evidence_roots.append(reservation["outputDirectory"])
    for arm in ARMS:
        _validate_assessment(
            record["arms"][arm],
            case=cases[case_id],
            result=active_results[arm],
            allowed_evidence_roots=tuple(evidence_roots),
        )

    zero_ids = {item["id"] for item in cases[case_id]["assertions"] if item["zeroTolerance"]}
    zero_pass = all(
        assertion["status"] == "pass"
        for arm in ARMS
        for assertion in record["arms"][arm]["assertions"]
        if assertion["assertionId"] in zero_ids
    )
    if record["zeroTolerancePass"] is not zero_pass:
        raise HarnessError("case evaluation zeroTolerancePass is not derived from all applicable arm assessments")
    if not isinstance(record["notes"], str):
        raise HarnessError("case evaluation notes must be a string")


def read_runs(
    research_root: Path = RESEARCH_ROOT,
    *,
    plan: dict[str, Any] | None = None,
    cases: dict[str, dict[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    path = research_root / "runs.jsonl"
    if not path.is_file() or path.is_symlink():
        raise HarnessError("runs.jsonl must be a regular file")
    records: list[dict[str, Any]] = []
    with path.open("rb") as stream:
        for line_number, line in enumerate(stream, 1):
            if not line.endswith(b"\n"):
                raise HarnessError(f"runs.jsonl line {line_number} is not newline-terminated")
            if not line.strip():
                raise HarnessError(f"runs.jsonl line {line_number} is blank")
            records.append(strict_json_object(line, f"runs.jsonl line {line_number}"))
    if records:
        plan = plan or load_plan(research_root)
        cases = cases or load_cases(research_root, plan)
        validate_ledger(records, research_root=research_root, plan=plan, cases=cases)
    return records


def validate_ledger(
    records: Sequence[dict[str, Any]],
    *,
    research_root: Path,
    plan: Mapping[str, Any],
    cases: Mapping[str, Mapping[str, Any]],
) -> None:
    by_record_id: dict[str, dict[str, Any]] = {}
    effective_by_owner: dict[str, dict[str, Any]] = {}
    superseded: set[str] = set()
    reservations: dict[str, dict[str, Any]] = {}
    result_owner_by_attempt: dict[str, str] = {}
    logical_by_pair: dict[tuple[str, str], str] = {}
    pair_by_logical: dict[str, tuple[str, str]] = {}
    evaluation_owner_by_case: dict[str, str] = {}

    def active_results() -> dict[tuple[str, str], dict[str, Any]]:
        result: dict[tuple[str, str], dict[str, Any]] = {}
        for owner_id in result_owner_by_attempt.values():
            effective = effective_by_owner[owner_id]
            if effective["outcome"]["classification"] == "usable-completion":
                pair = (effective["caseId"], effective["arm"])
                if pair in result:
                    raise HarnessError(f"multiple usable completions exist for logical slot {pair}")
                result[pair] = effective
        return result

    for index, record in enumerate(records, 1):
        if not isinstance(record, dict):
            raise HarnessError(f"ledger record {index} must be an object")
        kind = record.get("recordKind")
        record_id = record.get("recordId")
        _require_uuid(record_id, f"ledger record {index} recordId")
        if record_id in by_record_id:
            raise HarnessError(f"duplicate ledger recordId: {record_id}")

        if kind == "attempt-reservation":
            _validate_reservation_shape(record)
            if any(attempt_id not in result_owner_by_attempt for attempt_id in reservations):
                raise HarnessError("a dangling attempt reservation blocks every later provider attempt")
            if len(reservations) >= plan["providerAuthorization"]["hardCapAttempts"]:
                raise HarnessError("provider attempt hard cap exceeded")
            attempt_id = record["attemptId"]
            if attempt_id in reservations:
                raise HarnessError(f"duplicate attemptId: {attempt_id}")
            pair = (record["caseId"], record["arm"])
            logical = record["logicalRunId"]
            if record["attemptNumber"] == 1:
                if pair in logical_by_pair or logical in pair_by_logical:
                    raise HarnessError("each live case/arm permits exactly one logical run")
                logical_by_pair[pair] = logical
                pair_by_logical[logical] = pair
            else:
                if logical_by_pair.get(pair) != logical or pair_by_logical.get(logical) != pair:
                    raise HarnessError("retry changed its immutable logical case/arm slot")
                previous_attempt = next(
                    (
                        item
                        for item in reservations.values()
                        if item["logicalRunId"] == logical
                        and item["attemptNumber"] == record["attemptNumber"] - 1
                    ),
                    None,
                )
                if previous_attempt is None:
                    raise HarnessError("retry sequence has a missing predecessor")
                previous_owner = result_owner_by_attempt.get(previous_attempt["attemptId"])
                if previous_owner is None:
                    raise HarnessError("retry predecessor has no accounted result")
                previous = effective_by_owner[previous_owner]
                if previous["outcome"] != {
                    "classification": "infrastructure-failure",
                    "usableModelResult": False,
                    "retryEligible": True,
                    "reason": previous["outcome"]["reason"],
                }:
                    raise HarnessError("retry is permitted only after a no-output infrastructure failure")
            if record["identitySnapshot"] != identity_snapshot(
                research_root, plan, cases[record["caseId"]], record["arm"]
            ):
                raise HarnessError("reservation input/source/package identity snapshot drifted")
            reservations[attempt_id] = record
            initial_count = len(logical_by_pair)
            retry_count = len(reservations) - initial_count
            if initial_count > plan["providerAuthorization"]["plannedCalls"] or retry_count > plan["providerAuthorization"]["infrastructureOnlyRetryLimit"]:
                raise HarnessError("planned-call or infrastructure-retry authorization exceeded")
            effective_by_owner[record_id] = record

        elif kind == "attempt-result":
            attempt_id = record.get("attemptId")
            reservation = reservations.get(attempt_id)
            if reservation is None:
                raise HarnessError("attempt result has no preceding reservation")
            if attempt_id in result_owner_by_attempt:
                raise HarnessError("attempt already has a result; append a correction instead")
            _validate_result_shape(record, reservation, research_root)
            result_owner_by_attempt[attempt_id] = record_id
            effective_by_owner[record_id] = record

        elif kind == "case-evaluation":
            case_id = record.get("caseId")
            if case_id in evaluation_owner_by_case:
                raise HarnessError("case already has an evaluation; append a correction instead")
            _validate_case_evaluation(
                record,
                cases=cases,
                usable_by_pair=active_results(),
                reservations=reservations,
            )
            evaluation_owner_by_case[case_id] = record_id
            effective_by_owner[record_id] = record

        elif kind == "correction":
            _require_exact_keys(
                record,
                ("createdAt", "reason", "recordId", "recordKind", "replacement", "schemaVersion", "supersedesRecordId"),
                "correction",
            )
            if record["schemaVersion"] != 1 or not isinstance(record["reason"], str) or not record["reason"]:
                raise HarnessError("correction version/reason is invalid")
            _require_timestamp(record["createdAt"], "correction createdAt")
            target_id = record["supersedesRecordId"]
            if target_id not in by_record_id or target_id in superseded:
                raise HarnessError("correction target is missing or already superseded")
            target_owner = target_id
            target_effective = effective_by_owner.get(target_owner)
            if by_record_id[target_id].get("recordKind") == "correction":
                target_effective = by_record_id[target_id]["replacement"]
            if target_effective is None or target_effective.get("recordKind") not in {"attempt-result", "case-evaluation"}:
                raise HarnessError("attempt reservations and unknown records cannot be corrected")
            replacement = record["replacement"]
            if not isinstance(replacement, dict) or replacement.get("recordKind") != target_effective["recordKind"]:
                raise HarnessError("correction replacement must preserve record kind")
            if replacement.get("recordId") != record_id or replacement.get("createdAt") != record["createdAt"]:
                raise HarnessError("correction replacement must use its outer record ID and timestamp")
            if replacement["recordKind"] == "attempt-result":
                immutable = (
                    "logicalRunId",
                    "attemptId",
                    "caseId",
                    "arm",
                    "attemptNumber",
                    "retryNumber",
                    "identitySnapshot",
                    "process",
                    "stdout",
                    "stderr",
                )
                if any(replacement.get(key) != target_effective.get(key) for key in immutable):
                    raise HarnessError("correction changed immutable provider-attempt accounting")
                reservation = reservations[replacement["attemptId"]]
                _validate_result_shape(replacement, reservation, research_root)
                prior_owner = result_owner_by_attempt[replacement["attemptId"]]
                if effective_by_owner[prior_owner] is not target_effective:
                    raise HarnessError("correction does not target the active attempt result")
                result_owner_by_attempt[replacement["attemptId"]] = record_id
            else:
                if replacement.get("caseId") != target_effective.get("caseId"):
                    raise HarnessError("correction changed immutable case identity")
                _validate_case_evaluation(
                    replacement,
                    cases=cases,
                    usable_by_pair=active_results(),
                    reservations=reservations,
                )
                case_id = replacement["caseId"]
                if effective_by_owner[evaluation_owner_by_case[case_id]] is not target_effective:
                    raise HarnessError("correction does not target the active case evaluation")
                evaluation_owner_by_case[case_id] = record_id
            superseded.add(target_id)
            effective_by_owner[record_id] = replacement
        else:
            raise HarnessError(f"unknown ledger recordKind at record {index}: {kind}")

        by_record_id[record_id] = record


def append_run(
    record_path: Path,
    research_root: Path = RESEARCH_ROOT,
) -> str:
    record = strict_json_file(record_path)
    plan, cases = validate_static_evidence(research_root)
    runs_path = research_root / "runs.jsonl"
    with runs_path.open("a+b") as stream:
        fcntl.flock(stream.fileno(), fcntl.LOCK_EX)
        stream.seek(0)
        existing_bytes = stream.read()
        records: list[dict[str, Any]] = []
        if existing_bytes:
            for line_number, line in enumerate(existing_bytes.splitlines(keepends=True), 1):
                if not line.endswith(b"\n") or not line.strip():
                    raise HarnessError(f"runs.jsonl line {line_number} is malformed")
                records.append(strict_json_object(line, f"runs.jsonl line {line_number}"))
        validate_ledger([*records, record], research_root=research_root, plan=plan, cases=cases)
        encoded = canonical_json(record) + b"\n"
        stream.seek(0, os.SEEK_END)
        stream.write(encoded)
        stream.flush()
        os.fsync(stream.fileno())
        fcntl.flock(stream.fileno(), fcntl.LOCK_UN)
    return record["recordId"]


def _append_record_object(record: Mapping[str, Any], research_root: Path) -> str:
    with tempfile.NamedTemporaryFile(
        mode="wb", suffix=".json", prefix="c9-record-", delete=False, dir=research_root
    ) as stream:
        path = Path(stream.name)
        stream.write(canonical_json(record))
    try:
        return append_run(path, research_root)
    finally:
        path.unlink(missing_ok=True)


def _file_capture(path: Path, research_root: Path) -> dict[str, Any]:
    data = path.read_bytes()
    return {
        "path": path.relative_to(research_root).as_posix(),
        "sha256": sha256_bytes(data),
        "bytes": len(data),
    }


def run_live_attempt(
    *,
    run_id: str,
    case_id: str,
    arm: str,
    authorization_ref: str,
    acknowledge_provider_launch: bool,
    timeout_seconds: float = 300.0,
    research_root: Path = RESEARCH_ROOT,
    executor: ProcessExecutor = execute_process,
) -> dict[str, Any]:
    """Run exactly one future provider attempt; never retries or continues automatically."""

    if authorization_ref != AUTHORIZATION_REF or acknowledge_provider_launch is not True:
        raise HarnessError("explicit finite provider authorization acknowledgement is required")
    plan, cases = validate_static_evidence(research_root)
    _first_party_routing_evidence(research_root, plan)
    if case_id not in LIVE_CASE_IDS or arm not in ARMS:
        raise HarnessError("provider attempts are allowed only for the six live A/B/C slots")
    workspace = verify_prepared_workspace(run_id, case_id, arm, research_root, plan, cases[case_id])
    records = read_runs(research_root, plan=plan, cases=cases)
    prior = [record for record in records if record.get("recordKind") == "attempt-reservation" and record.get("logicalRunId") == run_id]
    attempt_number = len(prior) + 1
    attempt_id = str(uuid.uuid4())
    session_id = str(uuid.uuid4())
    reservation = {
        "schemaVersion": 1,
        "recordKind": "attempt-reservation",
        "recordId": str(uuid.uuid4()),
        "createdAt": utc_now(),
        "logicalRunId": run_id,
        "attemptId": attempt_id,
        "caseId": case_id,
        "arm": arm,
        "attemptNumber": attempt_number,
        "retryNumber": attempt_number - 1,
        "authorizationRef": AUTHORIZATION_REF,
        "provider": EXPECTED_PROVIDER,
        "model": EXPECTED_MODEL,
        "sessionId": session_id,
        "outputDirectory": f"outputs/{run_id}/attempts/{attempt_id}",
        "identitySnapshot": identity_snapshot(research_root, plan, cases[case_id], arm),
    }
    _append_record_object(reservation, research_root)

    attempt_root = research_root / reservation["outputDirectory"]
    attempt_root.mkdir(parents=True, exist_ok=False)
    task_prompt = (workspace / "prompts" / "task.md").read_text(encoding="utf-8")
    system_prompt = (workspace / "prompts" / "system.md").read_text(encoding="utf-8")
    command = build_command(task_prompt, system_prompt, session_id)
    started_at = utc_now()
    execution = executor(command, workspace, timeout_seconds)
    finished_at = utc_now()
    stdout_path = attempt_root / "stdout.json"
    stderr_path = attempt_root / "stderr.log"
    stdout_path.write_bytes(execution.stdout)
    stderr_path.write_bytes(execution.stderr)
    with stdout_path.open("rb") as stream:
        os.fsync(stream.fileno())
    with stderr_path.open("rb") as stream:
        os.fsync(stream.fileno())

    classified = classify_execution(execution, expected_session_id=session_id)
    result = {
        "schemaVersion": 1,
        "recordKind": "attempt-result",
        "recordId": str(uuid.uuid4()),
        "createdAt": utc_now(),
        "supersedesRecordId": reservation["recordId"],
        "logicalRunId": run_id,
        "attemptId": attempt_id,
        "caseId": case_id,
        "arm": arm,
        "attemptNumber": attempt_number,
        "retryNumber": attempt_number - 1,
        "identitySnapshot": reservation["identitySnapshot"],
        "startedAt": started_at,
        "finishedAt": finished_at,
        "process": {
            "launched": execution.launched,
            "command": command,
            "cwd": workspace.relative_to(research_root).as_posix(),
            "pid": execution.pid,
            "exitCode": execution.exit_code,
            "signal": execution.signal,
            "timedOut": execution.timed_out,
            "spawnError": execution.spawn_error,
        },
        "stdout": _file_capture(stdout_path, research_root),
        "stderr": _file_capture(stderr_path, research_root),
        "outcome": {
            "classification": classified.classification,
            "usableModelResult": classified.usable_model_result,
            "retryEligible": classified.retry_eligible,
            "reason": classified.reason,
        },
        "providerResult": classified.provider_result,
    }
    _append_record_object(result, research_root)
    return result


def evaluator_inputs(
    case_id: str,
    research_root: Path = RESEARCH_ROOT,
) -> dict[str, dict[str, Any]]:
    """Open the evaluator barrier only after all A/B/C outputs are usable."""

    plan, cases = validate_static_evidence(research_root)
    if case_id not in LIVE_CASE_IDS:
        raise HarnessError("live evaluator inputs exist only for provider-backed cases")
    records = read_runs(research_root, plan=plan, cases=cases)
    reservations = {
        record["attemptId"]: record
        for record in records
        if record.get("recordKind") == "attempt-reservation"
    }
    results = [
        record
        for record in _active_records(records)
        if record.get("recordKind") == "attempt-result"
    ]
    output: dict[str, dict[str, Any]] = {}
    for arm in ARMS:
        usable = [
            record
            for record in results
            if record["caseId"] == case_id
            and record["arm"] == arm
            and record["outcome"]["classification"] == "usable-completion"
        ]
        if len(usable) != 1:
            raise HarnessError(f"evaluator barrier closed: {case_id}/{arm} lacks exactly one usable completion")
        result = usable[0]
        reservation = reservations[result["attemptId"]]
        output[arm] = {
            "resultRecordId": result["recordId"],
            "outputDirectory": reservation["outputDirectory"],
            "outputSha256": sha256_bytes(result["providerResult"]["result"].encode("utf-8")),
        }
    return output


def _active_records(records: Sequence[dict[str, Any]]) -> list[dict[str, Any]]:
    superseded = {record["supersedesRecordId"] for record in records if record.get("recordKind") == "correction"}
    active: list[dict[str, Any]] = []
    for record in records:
        if record["recordId"] in superseded:
            continue
        if record.get("recordKind") == "correction":
            active.append(record["replacement"])
        else:
            active.append(record)
    return active


def _harness_artifact_inventory(research_root: Path) -> list[dict[str, Any]]:
    paths = [
        research_root / "predecessor.json",
        research_root / "first-party-auth.json",
        research_root / "evaluation-plan.json",
        research_root / "run-record.schema.json",
        *sorted(path for path in (research_root / "cases").rglob("*") if path.is_file()),
        *sorted(path for path in (research_root / "tools").glob("*.py") if path.is_file()),
        *sorted(path for path in (research_root / "tests").glob("*.py") if path.is_file()),
    ]
    records: list[dict[str, Any]] = []
    for path in paths:
        if path.is_symlink():
            raise HarnessError(f"deterministic harness artifact must not be a symlink: {path}")
        data = path.read_bytes()
        records.append(
            {
                "path": path.relative_to(research_root).as_posix(),
                "sha256": sha256_bytes(data),
                "bytes": len(data),
            }
        )
    return records


def validate_deterministic_proof(
    proof: Mapping[str, Any],
    *,
    research_root: Path,
    plan: Mapping[str, Any],
) -> None:
    if proof.get("schemaVersion") != 1 or proof.get("proofId") != PROOF_ID or proof.get("status") != "passed":
        raise HarnessError("deterministic proof identity/status is invalid")
    expected_source = {
        "commit": plan["sourceBaseline"]["commit"],
        "tree": plan["sourceBaseline"]["tree"],
        "aggregateDigest": plan["sourceBaseline"]["aggregateDigest"],
        "manifestSha256": plan["sourceBaseline"]["manifestSha256"],
    }
    if proof.get("sourceBaseline") != expected_source:
        raise HarnessError("deterministic proof source identity is stale")
    expected_packages = {
        package_id: entry["identity"] for package_id, entry in plan["acceptedPackages"].items()
    }
    if proof.get("acceptedPackageIdentities") != expected_packages:
        raise HarnessError("deterministic proof package identities are stale")
    if proof.get("predecessorEvidence") != _predecessor_evidence(research_root):
        raise HarnessError("deterministic proof predecessor evidence is stale")
    if proof.get("firstPartyRoutingEvidence") != _first_party_routing_evidence(
        research_root, plan
    ):
        raise HarnessError("deterministic proof first-party routing evidence is stale")
    if proof.get("harnessArtifacts") != _harness_artifact_inventory(research_root):
        raise HarnessError("deterministic proof harness artifact identities are stale")
    checks = proof.get("checks")
    if not isinstance(checks, list) or not checks:
        raise HarnessError("deterministic proof must contain executed checks")
    for check in checks:
        if not isinstance(check, dict) or check.get("status") != "passed" or check.get("exitCode") != 0:
            raise HarnessError("deterministic proof contains a failed or malformed check")
        command = check.get("command")
        if not isinstance(command, list) or not command:
            raise HarnessError("deterministic proof check command is missing")
        if Path(command[0]).name.lower() in {"claude", "codex", "gemini"}:
            raise HarnessError("deterministic proof contains a provider/model executable")
    if proof.get("providerBoundary") != {
        "providerProcessLaunched": False,
        "modelProcessLaunched": False,
        "runsJsonlBytes": 0,
        "liveEvaluationStarted": False,
    }:
        raise HarnessError("deterministic proof provider boundary is invalid")
    if proof.get("liveGate") != {
        "status": "live-not-started",
        "usableCalls": 0,
        "requiredUsableCalls": 18,
        "fullMigrationClaimAllowed": False,
    }:
        raise HarnessError("deterministic proof overclaims the live/full-migration gate")


def build_summary(research_root: Path = RESEARCH_ROOT) -> dict[str, Any]:
    plan, cases = validate_static_evidence(research_root)
    records = read_runs(research_root, plan=plan, cases=cases)
    active = _active_records(records)
    reservations = [record for record in records if record["recordKind"] == "attempt-reservation"]
    results = [record for record in active if record["recordKind"] == "attempt-result"]
    evaluations = [record for record in active if record["recordKind"] == "case-evaluation"]
    usable_pairs = {
        (record["caseId"], record["arm"])
        for record in results
        if record["outcome"]["classification"] == "usable-completion"
    }
    initial_attempts = sum(1 for record in reservations if record["attemptNumber"] == 1)
    retries = len(reservations) - initial_attempts
    nonretryable = sum(
        1 for record in results if record["outcome"]["classification"] == "nonretryable-failure"
    )
    all_evaluated = len(evaluations) == len(LIVE_CASE_IDS)
    all_zero_pass = all(record["zeroTolerancePass"] for record in evaluations) and all_evaluated
    all_assertions_pass = (
        all(
            assertion["status"] == "pass"
            for evaluation in evaluations
            for arm in ARMS
            for assertion in evaluation["arms"][arm]["assertions"]
        )
        and all_evaluated
    )
    if not reservations:
        gate_status = "live-not-started"
    elif nonretryable:
        gate_status = "blocked-nonretryable-provider-failure"
    elif len(usable_pairs) < 18:
        gate_status = "live-incomplete"
    elif not all_evaluated:
        gate_status = "evaluation-pending"
    elif not all_zero_pass:
        gate_status = "failed-zero-tolerance"
    elif not all_assertions_pass:
        gate_status = "failed-quality"
    else:
        gate_status = "passed"

    proof_path = research_root / "deterministic-proof.json"
    deterministic_status = "not-generated"
    proof_sha256 = None
    if proof_path.is_file() and not proof_path.is_symlink():
        proof = strict_json_file(proof_path)
        validate_deterministic_proof(
            proof,
            research_root=research_root,
            plan=plan,
        )
        deterministic_status = proof["status"]
        proof_sha256 = sha256_bytes(proof_path.read_bytes())
    return {
        "schemaVersion": 1,
        "evaluationId": plan["evaluationId"],
        "generatedAt": utc_now(),
        "deterministicProof": {"status": deterministic_status, "sha256": proof_sha256},
        "providerAuthorization": {
            "provider": EXPECTED_PROVIDER,
            "model": EXPECTED_MODEL,
            "plannedCalls": 18,
            "retryLimit": 6,
            "hardCapAttempts": 24,
        },
        "ledger": {
            "records": len(records),
            "reservedAttempts": len(reservations),
            "launchedProcesses": sum(
                1 for record in results if record["process"]["launched"] is True
            ),
            "infrastructureRetriesReserved": retries,
            "usableLogicalCalls": len(usable_pairs),
            "caseEvaluations": len(evaluations),
            "nonretryableFailures": nonretryable,
        },
        "liveGate": {
            "status": gate_status,
            "requiredUsableCalls": 18,
            "usableCalls": len(usable_pairs),
            "requiredCaseEvaluations": 6,
            "completedCaseEvaluations": len(evaluations),
            "zeroTolerancePassed": all_zero_pass,
            "qualityAndOverheadPassed": all_assertions_pass,
            "fullMigrationClaimAllowed": gate_status == "passed",
        },
        "deterministicCases": {
            "count": 3,
            "providerInvocationUnits": 0,
            "status": "machinery-validated-not-run-as-live-evaluation",
        },
    }


def write_summary_and_decision(research_root: Path = RESEARCH_ROOT) -> tuple[Path, Path]:
    summary = build_summary(research_root)
    summary_path = research_root / "summary.json"
    summary_path.write_text(
        json.dumps(summary, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    gate = summary["liveGate"]
    if gate["status"] == "passed":
        decision = "PASS"
        reason = "all 18 authorized logical calls and all six case evaluations passed every assertion"
    else:
        decision = "PENDING"
        reason = (
            f"live/full-migration gate is {gate['status']}; "
            f"{gate['usableCalls']}/18 usable calls and "
            f"{gate['completedCaseEvaluations']}/6 case evaluations exist"
        )
    decision_text = "\n".join(
        (
            "# C9 first-party migration decision",
            "",
            f"Decision: **{decision}**",
            "",
            f"Reason: {reason}.",
            "",
            f"Deterministic proof: `{summary['deterministicProof']['status']}`.",
            "",
            "No live/full-migration pass is claimed unless the append-only ledger contains all 18 usable A/B/C calls and every applicable assertion passes.",
            "",
        )
    )
    decision_path = research_root / "decision.md"
    decision_path.write_text(decision_text, encoding="utf-8")
    return summary_path, decision_path


def _default_command_runner(
    command: Sequence[str], cwd: Path
) -> subprocess.CompletedProcess[bytes]:
    if Path(command[0]).name.lower() in {"claude", "codex", "gemini"}:
        raise HarnessError("deterministic proof refuses provider/model executables")
    environment = os.environ.copy()
    environment["PYTHONDONTWRITEBYTECODE"] = "1"
    return subprocess.run(
        list(command),
        cwd=cwd,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        check=False,
        timeout=600,
        env=environment,
    )


def _proof_commands(research_root: Path) -> list[tuple[str, list[str], Path]]:
    root = repository_root(research_root)
    return [
        (
            "predecessor-git-object-verification",
            ["uv", "run", "python", str(research_root / "tools/verify_predecessor.py")],
            root,
        ),
        (
            "first-party-auth-artifact-verification",
            [
                "uv",
                "run",
                "python",
                str(research_root / "tools/auth_preflight.py"),
                "--verify",
                "--output",
                str(research_root / "first-party-auth.json"),
            ],
            root,
        ),
        (
            "source-baseline-offline-verification",
            ["uv", "run", "python", str(research_root / "build_source_baseline.py"), "--verify"],
            root,
        ),
        (
            "core-build-before-package-resolution",
            ["pnpm", "--filter", "@mindfoldhq/trellis-core", "build"],
            root,
        ),
        (
            "cli-template-build-before-package-resolution",
            ["pnpm", "--filter", "@mindfoldhq/trellis", "build"],
            root,
        ),
        (
            "production-package-identity-resolution",
            [
                "node",
                str(root / "packages/cli/bin/trellis.js"),
                "research",
                "skill",
                "list",
                "--root",
                str(root),
                "--json",
            ],
            root,
        ),
        (
            "focused-cli-contract-tests",
            [
                "pnpm",
                "--filter",
                "@mindfoldhq/trellis",
                "exec",
                "vitest",
                "run",
                "test/commands/research-execution-package-resolution.integration.test.ts",
                "test/commands/research-managed-skill-lifecycle.integration.test.ts",
                "test/commands/research-workflow-state.integration.test.ts",
                "test/commands/research-gate.integration.test.ts",
                "test/commands/research-quest-source-admin.integration.test.ts",
                "test/commands/research-methodology-closure-cs4.test.ts",
            ],
            root,
        ),
        (
            "focused-core-contract-tests",
            [
                "pnpm",
                "--filter",
                "@mindfoldhq/trellis-core",
                "exec",
                "vitest",
                "run",
                "test/research/methodology-runtime.test.ts",
            ],
            root,
        ),
        (
            "task-local-harness-tests",
            [
                "uv",
                "run",
                "python",
                "-m",
                "unittest",
                "discover",
                "-s",
                str(research_root / "tests"),
                "-p",
                "test_*.py",
            ],
            root,
        ),
    ]


def _verify_resolver_output(
    stdout: bytes,
    plan: Mapping[str, Any],
) -> None:
    payload = strict_json_object(stdout, "production research skill list output")
    skills = payload.get("skills")
    if not isinstance(skills, list):
        raise HarnessError("production research skill list output has no skills array")
    resolved = {
        (item.get("id"), item.get("version")): item.get("identity")
        for item in skills
        if isinstance(item, dict) and item.get("source") == "bundled"
    }
    for package_id, entry in plan["acceptedPackages"].items():
        identity = entry["identity"]
        key = (package_id, identity["version"])
        if resolved.get(key) != identity:
            raise HarnessError(f"production resolver identity differs for {package_id}@{identity['version']}")


def generate_deterministic_proof(
    research_root: Path = RESEARCH_ROOT,
    *,
    command_runner: CommandRunner = _default_command_runner,
) -> Path:
    """Run deterministic checks and atomically write proof only after every pass."""

    runs_path = research_root / "runs.jsonl"
    if runs_path.read_bytes() != b"":
        raise HarnessError("deterministic proof requires the live ledger to remain exactly empty")
    plan, _ = validate_static_evidence(research_root)
    predecessor_evidence = _predecessor_evidence(research_root)
    first_party_routing_evidence = _first_party_routing_evidence(research_root, plan)
    proof_path = research_root / "deterministic-proof.json"
    if proof_path.exists():
        raise HarnessError("deterministic-proof.json already exists and is immutable")

    checks: list[dict[str, Any]] = []
    for name, command, cwd in _proof_commands(research_root):
        started = utc_now()
        completed = command_runner(command, cwd)
        finished = utc_now()
        check = {
            "id": name,
            "command": list(command),
            "cwd": cwd.relative_to(repository_root(research_root)).as_posix() or ".",
            "startedAt": started,
            "finishedAt": finished,
            "exitCode": completed.returncode,
            "stdoutSha256": sha256_bytes(completed.stdout),
            "stdoutBytes": len(completed.stdout),
            "stderrSha256": sha256_bytes(completed.stderr),
            "stderrBytes": len(completed.stderr),
            "status": "passed" if completed.returncode == 0 else "failed",
        }
        checks.append(check)
        if completed.returncode != 0:
            raise HarnessError(
                f"deterministic check failed before proof creation: {name}\n"
                + completed.stderr.decode("utf-8", errors="replace")[-4000:]
            )
        if name == "production-package-identity-resolution":
            _verify_resolver_output(completed.stdout, plan)

    validate_static_evidence(research_root)
    if runs_path.read_bytes() != b"":
        raise HarnessError("a deterministic check changed runs.jsonl")
    proof = {
        "schemaVersion": 1,
        "proofId": PROOF_ID,
        "evaluationId": plan["evaluationId"],
        "generatedAt": utc_now(),
        "status": "passed",
        "sourceBaseline": {
            "commit": plan["sourceBaseline"]["commit"],
            "tree": plan["sourceBaseline"]["tree"],
            "aggregateDigest": plan["sourceBaseline"]["aggregateDigest"],
            "manifestSha256": plan["sourceBaseline"]["manifestSha256"],
        },
        "acceptedPackageIdentities": {
            package_id: entry["identity"] for package_id, entry in plan["acceptedPackages"].items()
        },
        "predecessorEvidence": predecessor_evidence,
        "firstPartyRoutingEvidence": first_party_routing_evidence,
        "harnessArtifacts": _harness_artifact_inventory(research_root),
        "checks": checks,
        "providerBoundary": {
            "providerProcessLaunched": False,
            "modelProcessLaunched": False,
            "runsJsonlBytes": 0,
            "liveEvaluationStarted": False,
        },
        "liveGate": {
            "status": "live-not-started",
            "usableCalls": 0,
            "requiredUsableCalls": 18,
            "fullMigrationClaimAllowed": False,
        },
    }
    temporary = proof_path.with_suffix(".json.tmp")
    temporary.write_text(
        json.dumps(proof, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    with temporary.open("rb") as stream:
        os.fsync(stream.fileno())
    os.replace(temporary, proof_path)
    return proof_path


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--research-root", type=Path, default=RESEARCH_ROOT)
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("validate")
    prepare = subparsers.add_parser("prepare")
    prepare.add_argument("--run-id", required=True)
    prepare.add_argument("--case", required=True, choices=CASE_IDS)
    prepare.add_argument("--arm", required=True, choices=ARMS)
    append = subparsers.add_parser("append")
    append.add_argument("--record", required=True, type=Path)
    evaluator = subparsers.add_parser("evaluator-inputs")
    evaluator.add_argument("--case", required=True, choices=LIVE_CASE_IDS)
    subparsers.add_parser("summary")
    subparsers.add_parser("proof")
    live = subparsers.add_parser("run-attempt")
    live.add_argument("--run-id", required=True)
    live.add_argument("--case", required=True, choices=LIVE_CASE_IDS)
    live.add_argument("--arm", required=True, choices=ARMS)
    live.add_argument("--authorization-ref", required=True)
    live.add_argument("--acknowledge-provider-launch", action="store_true")
    live.add_argument("--timeout-seconds", type=float, default=300.0)
    return parser


def main() -> int:
    args = _build_parser().parse_args()
    research_root = args.research_root.resolve()
    if args.command == "validate":
        plan, cases = validate_static_evidence(research_root)
        proof_path = research_root / "deterministic-proof.json"
        if proof_path.is_file() and not proof_path.is_symlink():
            validate_deterministic_proof(
                strict_json_file(proof_path),
                research_root=research_root,
                plan=plan,
            )
        print(f"OK {plan['evaluationId']}: {len(cases)} cases; ledger and proof valid")
    elif args.command == "prepare":
        print(prepare_run(args.run_id, args.case, args.arm, research_root))
    elif args.command == "append":
        print(append_run(args.record.resolve(), research_root))
    elif args.command == "evaluator-inputs":
        print(json.dumps(evaluator_inputs(args.case, research_root), indent=2, sort_keys=True))
    elif args.command == "summary":
        summary_path, decision_path = write_summary_and_decision(research_root)
        print(summary_path)
        print(decision_path)
    elif args.command == "proof":
        print(generate_deterministic_proof(research_root))
    elif args.command == "run-attempt":
        result = run_live_attempt(
            run_id=args.run_id,
            case_id=args.case,
            arm=args.arm,
            authorization_ref=args.authorization_ref,
            acknowledge_provider_launch=args.acknowledge_provider_launch,
            timeout_seconds=args.timeout_seconds,
            research_root=research_root,
        )
        print(json.dumps(result, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
