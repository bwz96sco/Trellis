#!/usr/bin/env python3
"""Validate and append task-scoped C7 comparative-evaluation evidence."""

from __future__ import annotations

import argparse
import copy
import fcntl
import hashlib
import json
import os
import re
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

RESEARCH_ROOT = Path(__file__).resolve().parents[1]
TASK_ROOT = RESEARCH_ROOT.parent
REPO_ROOT = TASK_ROOT.parents[2]
C1_BASELINE = REPO_ROOT / ".trellis/tasks/08-21-thin-skill-c1-freeze-contracts/research/source-baseline"
C6_EVIDENCE = REPO_ROOT / ".trellis/tasks/archive/2026-08/08-21-thin-skill-c6-migrate-pilot-packages/research/c6-migration-evidence.json"
BUNDLED_SKILLS = REPO_ROOT / "packages/cli/src/templates/research/skills"
RUN_ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]{2,79}$")
SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
REQUIRED_ZERO_TOLERANCE = {
    "managed-state-exact-recovery",
    "no-auto-next-stage",
    "no-inferred-h1-h2",
    "no-worker-canonical-mutation",
    "no-worker-nested-execution",
    "package-replay-identity-stable",
    "scientific-ownership-preserved",
    "selected-or-blocked",
    "single-quest-writer",
}
RUN_KEYS = {
    "schemaVersion",
    "recordKind",
    "runId",
    "caseId",
    "boundary",
    "arm",
    "supersedesRunId",
    "input",
    "declaredAssertions",
    "identity",
    "execution",
    "overhead",
    "completion",
    "assertionEvidence",
    "corrections",
    "reworkSteps",
    "missedGates",
    "authorityViolations",
    "recovery",
    "changedPaths",
    "artifactRefs",
    "outputRefs",
    "isolation",
    "evaluatorNotes",
}
EXECUTION_KEYS = {
    "profile",
    "host",
    "provider",
    "model",
    "startedAt",
    "endedAt",
    "wallClockMs",
    "tokenUsage",
    "contextUsage",
    "lifecycleRefs",
    "providerAuthorizationRef",
}
OVERHEAD_KEYS = {
    "modelCalls",
    "approvalRounds",
    "subagents",
    "workers",
    "durableArtifacts",
}


class EvidenceError(RuntimeError):
    """Raised when evaluation evidence violates the frozen contract."""


def strict_json_object(data: bytes, label: str) -> dict[str, Any]:
    duplicates: list[str] = []

    def pairs(items: list[tuple[str, Any]]) -> dict[str, Any]:
        result: dict[str, Any] = {}
        for key, value in items:
            if key in result:
                duplicates.append(key)
            result[key] = value
        return result

    try:
        value = json.loads(data.decode("utf-8"), object_pairs_hook=pairs)
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise EvidenceError(f"invalid JSON: {label}") from error
    if duplicates:
        raise EvidenceError(f"duplicate JSON keys in {label}: {sorted(set(duplicates))}")
    if not isinstance(value, dict):
        raise EvidenceError(f"expected JSON object: {label}")
    return value


def strict_json_bytes(path: Path) -> tuple[dict[str, Any], bytes]:
    data = path.read_bytes()
    return strict_json_object(data, str(path)), data


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def ensure_relative(path_text: str, label: str) -> Path:
    if not isinstance(path_text, str) or not path_text or "\\" in path_text:
        raise EvidenceError(f"{label} must be a non-empty POSIX-relative path")
    path = Path(path_text)
    if path.is_absolute() or any(part in {"", ".", ".."} for part in path.parts):
        raise EvidenceError(f"{label} must be a contained POSIX-relative path: {path_text}")
    return path


def contained_file(root: Path, relative: str, label: str) -> Path:
    rel = ensure_relative(relative, label)
    target = root / rel
    if target.is_symlink() or not target.is_file():
        raise EvidenceError(f"{label} must name a regular non-symlink file: {relative}")
    resolved_root = root.resolve(strict=True)
    resolved = target.resolve(strict=True)
    try:
        resolved.relative_to(resolved_root)
    except ValueError as error:
        raise EvidenceError(f"{label} escapes its root: {relative}") from error
    return target


def exact_keys(value: dict[str, Any], expected: set[str], label: str) -> None:
    actual = set(value)
    if actual != expected:
        raise EvidenceError(
            f"{label} keys mismatch: missing={sorted(expected - actual)} extra={sorted(actual - expected)}"
        )


def require_list(value: Any, label: str) -> list[Any]:
    if not isinstance(value, list):
        raise EvidenceError(f"{label} must be an array")
    return value


def require_nonnegative_int(value: Any, label: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        raise EvidenceError(f"{label} must be a non-negative integer")
    return value


def parse_instant(value: Any, label: str) -> datetime:
    if not isinstance(value, str) or not value:
        raise EvidenceError(f"{label} must be an RFC3339 timestamp")
    try:
        instant = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as error:
        raise EvidenceError(f"{label} must be an RFC3339 timestamp") from error
    if instant.tzinfo is None or instant.utcoffset() is None:
        raise EvidenceError(f"{label} must include a timezone offset")
    return instant


def reject_scores(value: Any, location: str = "record") -> None:
    if isinstance(value, dict):
        for key, nested in value.items():
            normalized = key.lower().replace("_", "-")
            is_score_field = "weighted" in normalized or normalized in {
                "score",
                "aggregate-score",
                "quality-score",
            }
            if is_score_field and not normalized.endswith("forbidden"):
                raise EvidenceError(f"weighted/generic score field is forbidden at {location}.{key}")
            reject_scores(nested, f"{location}.{key}")
    elif isinstance(value, list):
        for index, nested in enumerate(value):
            reject_scores(nested, f"{location}[{index}]")


def load_plan(research_root: Path) -> dict[str, Any]:
    plan, _ = strict_json_bytes(research_root / "evaluation-plan.json")
    if plan.get("schemaVersion") != 1:
        raise EvidenceError("unsupported evaluation-plan schema")
    return plan


def load_cases(research_root: Path, plan: dict[str, Any]) -> dict[str, dict[str, Any]]:
    case_ids = require_list(plan.get("cases"), "evaluation-plan.cases")
    if not all(isinstance(case_id, str) for case_id in case_ids):
        raise EvidenceError("evaluation-plan.cases must contain strings")
    if len(case_ids) != len(set(case_ids)):
        raise EvidenceError("evaluation-plan.cases contains duplicates")
    cases: dict[str, dict[str, Any]] = {}
    for case_id in case_ids:
        case, _ = strict_json_bytes(research_root / "cases" / f"{case_id}.json")
        if case.get("schemaVersion") != 1 or case.get("caseId") != case_id:
            raise EvidenceError(f"case identity mismatch: {case_id}")
        cases[case_id] = case
    discovered = sorted(path.stem for path in (research_root / "cases").glob("*.json"))
    if discovered != sorted(case_ids):
        raise EvidenceError("case manifest inventory differs from evaluation-plan.cases")
    return cases


def validate_frozen_inputs(research_root: Path, plan: dict[str, Any]) -> None:
    frozen = plan.get("frozenInputs")
    if not isinstance(frozen, dict):
        raise EvidenceError("evaluation-plan.frozenInputs must be an object")
    c1 = frozen.get("c1")
    c6 = frozen.get("c6")
    if not isinstance(c1, dict) or not isinstance(c6, dict):
        raise EvidenceError("frozen C1 and C6 identities are required")

    c1_manifest_path = contained_file(REPO_ROOT, c1.get("manifest"), "C1 manifest")
    c1_manifest, c1_bytes = strict_json_bytes(c1_manifest_path)
    if sha256_bytes(c1_bytes) != c1.get("manifestSha256"):
        raise EvidenceError("C1 manifest digest drift")
    if c1_manifest.get("baseCommit") != c1.get("baseCommit"):
        raise EvidenceError("C1 base commit drift")
    c1_commit = c1.get("baseCommit")
    if not isinstance(c1_commit, str) or re.fullmatch(r"[0-9a-f]{40}", c1_commit) is None:
        raise EvidenceError("C1 base commit must be an exact lowercase commit ID")
    records = require_list(c1_manifest.get("files"), "C1 manifest files")
    if len(records) != c1.get("fileCount"):
        raise EvidenceError("C1 file count drift")
    if c1.get("mutableExternalSourceReadAllowed") is not False:
        raise EvidenceError("mutable external source reads must remain forbidden")
    for record in records:
        if not isinstance(record, dict):
            raise EvidenceError("invalid C1 file record")
        target = contained_file(C1_BASELINE / "files", record.get("path"), "C1 copied file")
        data = target.read_bytes()
        if len(data) != record.get("size") or sha256_bytes(data) != record.get("sha256"):
            raise EvidenceError(f"C1 copied file identity drift: {record.get('path')}")

    c6_evidence_path = contained_file(REPO_ROOT, c6.get("evidence"), "C6 evidence")
    c6_evidence, c6_bytes = strict_json_bytes(c6_evidence_path)
    if c6_evidence_path != C6_EVIDENCE:
        raise EvidenceError("C6 evidence must use the archived task path")
    if sha256_bytes(c6_bytes) != c6.get("evidenceSha256"):
        raise EvidenceError("C6 evidence digest drift")
    c6_commit = c6.get("archiveCommit")
    if not isinstance(c6_commit, str) or re.fullmatch(r"[0-9a-f]{40}", c6_commit) is None:
        raise EvidenceError("C6 archive commit must be an exact lowercase commit ID")
    committed_evidence = subprocess.run(
        ["git", "-C", str(REPO_ROOT), "show", f"{c6_commit}:{c6['evidence']}"],
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        check=False,
    )
    if committed_evidence.returncode != 0 or committed_evidence.stdout != c6_bytes:
        raise EvidenceError("C6 evidence does not match the archived commit")
    evidence_packages = {
        entry["manifest"]["id"]: entry for entry in require_list(c6_evidence.get("packages"), "C6 packages")
    }
    if c6.get("packages") != {
        package_id: entry["identity"] for package_id, entry in sorted(evidence_packages.items())
    }:
        raise EvidenceError("C6 package identity inventory drift")
    package_file_inventory = c6.get("packageFileInventory")
    if not isinstance(package_file_inventory, dict) or set(package_file_inventory) != set(evidence_packages):
        raise EvidenceError("C6 raw package file inventory mismatch")
    for package_id, entry in evidence_packages.items():
        package_root = BUNDLED_SKILLS / package_id / entry["manifest"]["version"]
        expected_files = package_file_inventory[package_id]
        actual_paths = sorted(
            str(path.relative_to(package_root))
            for path in package_root.rglob("*")
            if path.is_file() and not path.is_symlink()
        )
        if actual_paths != [record.get("path") for record in expected_files]:
            raise EvidenceError(f"bundled package file inventory drift: {package_id}")
        for record in expected_files:
            package_file = contained_file(package_root, record.get("path"), f"{package_id} package file")
            data = package_file.read_bytes()
            if len(data) != record.get("bytes") or sha256_bytes(data) != record.get("sha256"):
                raise EvidenceError(f"bundled package file digest drift: {package_id}/{record.get('path')}")
        manifest_path = contained_file(package_root, "skill.json", f"{package_id} manifest")
        manifest, manifest_bytes = strict_json_bytes(manifest_path)
        expected_manifest_bytes = (
            json.dumps(manifest, ensure_ascii=False, separators=(",", ":")) + "\n"
        ).encode("utf-8")
        if manifest_bytes != expected_manifest_bytes:
            raise EvidenceError(f"noncanonical bundled manifest bytes: {package_id}")
        if manifest != entry["manifest"]:
            raise EvidenceError(f"bundled manifest differs from archived C6 evidence: {package_id}")
        contained_file(package_root, manifest["instructionFile"], f"{package_id} instructions")
        for member in manifest["members"]:
            member_path = contained_file(package_root, member["path"], f"{package_id} member")
            data = member_path.read_bytes()
            if len(data) != member["maxBytes"] or sha256_bytes(data) != member["sha256"]:
                raise EvidenceError(f"member identity drift: {package_id}/{member['path']}")


def validate_cases(research_root: Path, plan: dict[str, Any], cases: dict[str, dict[str, Any]]) -> None:
    boundaries = plan.get("boundaries")
    if not isinstance(boundaries, dict):
        raise EvidenceError("evaluation-plan.boundaries must be an object")
    seen: list[str] = []
    minimum = plan.get("minimumCoverage", {}).get("minimumCasesPerBoundary")
    for boundary, case_ids in boundaries.items():
        case_ids = require_list(case_ids, f"boundary {boundary}")
        if len(case_ids) < minimum:
            raise EvidenceError(f"boundary {boundary} has fewer than {minimum} cases")
        for case_id in case_ids:
            if case_id not in cases or cases[case_id].get("boundary") != boundary:
                raise EvidenceError(f"boundary/case mismatch: {boundary}/{case_id}")
            seen.append(case_id)
    if sorted(seen) != sorted(cases) or len(seen) != len(set(seen)):
        raise EvidenceError("every case must belong to exactly one boundary")

    c6_packages = plan["frozenInputs"]["c6"]["packages"]
    source_sets = plan["arms"]["B"]["sourceSets"]
    c1_manifest, _ = strict_json_bytes(C1_BASELINE / "manifest.json")
    c1_records = {entry["path"]: entry for entry in c1_manifest["files"]}
    actual_zero_tolerance: dict[str, set[str]] = {}
    for case_id, case in cases.items():
        input_path = contained_file(research_root, case.get("inputRef"), f"{case_id} input")
        if sha256_bytes(input_path.read_bytes()) != case.get("inputSha256"):
            raise EvidenceError(f"case input digest drift: {case_id}")
        if case.get("applicableArms") != ["A", "B", "C"]:
            raise EvidenceError(f"all A/B/C arms must be applicable: {case_id}")
        profile = case.get("requiredProfileC")
        if profile not in {"lightweight", "managed", "root-command"}:
            raise EvidenceError(f"invalid C profile: {case_id}")
        source_set = case.get("armBSourceSet")
        if source_set not in source_sets:
            raise EvidenceError(f"unknown arm-B source set: {case_id}")
        for source_record in source_sets[source_set]:
            frozen = c1_records.get(source_record.get("path"))
            if frozen is None:
                raise EvidenceError(f"arm-B source path missing from C1: {case_id}")
            expected = {key: frozen[key] for key in ("path", "role", "sha256", "size")}
            if source_record != expected:
                raise EvidenceError(f"arm-B source identity drift: {case_id}/{source_record.get('path')}")
        identity = case.get("armCExecutionPackage")
        if not isinstance(identity, dict) or c6_packages.get(identity.get("id")) != identity:
            raise EvidenceError(f"arm-C package identity drift: {case_id}")
        manifest = next(
            item["manifest"]
            for item in strict_json_bytes(C6_EVIDENCE)[0]["packages"]
            if item["identity"] == identity
        )
        members = case.get("requestedMembersC")
        if not isinstance(members, list) or len(members) != len(set(members)):
            raise EvidenceError(f"requested members must be unique: {case_id}")
        declared_members = {member["path"] for member in manifest["members"]}
        if not set(members).issubset(declared_members):
            raise EvidenceError(f"case requests undeclared C6 member: {case_id}")
        fixture_refs = require_list(case.get("fixtureRefs"), f"{case_id}.fixtureRefs")
        for fixture in fixture_refs:
            if not isinstance(fixture, dict) or set(fixture) != {"path", "sha256", "bytes"}:
                raise EvidenceError(f"invalid fixture record: {case_id}")
            fixture_path = contained_file(research_root, fixture["path"], f"{case_id} fixture")
            data = fixture_path.read_bytes()
            if len(data) != fixture["bytes"] or sha256_bytes(data) != fixture["sha256"]:
                raise EvidenceError(f"fixture identity drift: {fixture['path']}")
        assertions = require_list(case.get("assertions"), f"{case_id}.assertions")
        assertion_ids: list[str] = []
        for assertion in assertions:
            if not isinstance(assertion, dict) or set(assertion) != {"id", "description", "zeroTolerance"}:
                raise EvidenceError(f"invalid assertion record: {case_id}")
            assertion_id = assertion.get("id")
            if not isinstance(assertion_id, str) or not assertion_id:
                raise EvidenceError(f"invalid assertion ID: {case_id}")
            assertion_ids.append(assertion_id)
            if assertion.get("zeroTolerance") is True:
                actual_zero_tolerance.setdefault(assertion_id, set()).add(case_id)
        if len(assertion_ids) != len(set(assertion_ids)):
            raise EvidenceError(f"duplicate assertion ID: {case_id}")
        planned = case.get("plannedInvocationUnits")
        if not isinstance(planned, dict) or set(planned) != {"A", "B", "C"}:
            raise EvidenceError(f"planned invocation units must cover A/B/C: {case_id}")
        for arm, count in planned.items():
            if require_nonnegative_int(count, f"{case_id}.plannedInvocationUnits.{arm}") < 1:
                raise EvidenceError(f"every applicable arm requires at least one invocation unit: {case_id}/{arm}")

    declared_zero_tolerance: dict[str, set[str]] = {}
    for check in require_list(plan.get("zeroToleranceChecks"), "zeroToleranceChecks"):
        if not isinstance(check, dict) or set(check) != {"id", "description", "applicableCases"}:
            raise EvidenceError("invalid zero-tolerance check")
        declared_zero_tolerance[check["id"]] = set(check["applicableCases"])
    if set(declared_zero_tolerance) != REQUIRED_ZERO_TOLERANCE:
        raise EvidenceError(
            "zero-tolerance inventory mismatch: "
            f"missing={sorted(REQUIRED_ZERO_TOLERANCE - set(declared_zero_tolerance))} "
            f"extra={sorted(set(declared_zero_tolerance) - REQUIRED_ZERO_TOLERANCE)}"
        )
    if declared_zero_tolerance != actual_zero_tolerance:
        raise EvidenceError("zero-tolerance case applicability differs from case assertions")


def read_runs(research_root: Path) -> list[dict[str, Any]]:
    path = research_root / "runs.jsonl"
    if path.is_symlink() or not path.is_file():
        raise EvidenceError("runs.jsonl must be a regular non-symlink file")
    records: list[dict[str, Any]] = []
    for line_number, line in enumerate(path.read_bytes().splitlines(), start=1):
        if not line.strip():
            raise EvidenceError(f"runs.jsonl contains blank line {line_number}")
        records.append(strict_json_object(line, f"runs.jsonl line {line_number}"))
    return records


def validate_usage(value: Any, label: str) -> None:
    if not isinstance(value, dict) or value.get("status") not in {"unavailable", "reported"}:
        raise EvidenceError(f"{label} must explicitly be unavailable or reported")
    if value["status"] == "unavailable":
        if set(value) != {"status"}:
            raise EvidenceError(f"{label} unavailable form has extra fields")
    else:
        if set(value) != {"status", "value"}:
            raise EvidenceError(f"{label} reported form requires value")
        require_nonnegative_int(value["value"], f"{label}.value")


def validate_run_record(
    record: dict[str, Any],
    research_root: Path,
    plan: dict[str, Any],
    cases: dict[str, dict[str, Any]],
    prior_records: Iterable[dict[str, Any]],
    require_workspace: bool,
) -> None:
    reject_scores(record)
    exact_keys(record, RUN_KEYS, "run record")
    if record.get("schemaVersion") != 1 or record.get("recordKind") != "run":
        raise EvidenceError("unsupported run record identity")
    run_id = record.get("runId")
    if not isinstance(run_id, str) or RUN_ID_RE.fullmatch(run_id) is None:
        raise EvidenceError("runId must be a lowercase stable slug")
    prior = list(prior_records)
    prior_by_id = {item.get("runId"): item for item in prior}
    if run_id in prior_by_id:
        raise EvidenceError(f"duplicate runId: {run_id}")
    case_id = record.get("caseId")
    case = cases.get(case_id)
    if case is None:
        raise EvidenceError(f"unknown caseId: {case_id}")
    if record.get("boundary") != case["boundary"]:
        raise EvidenceError("run boundary differs from case")
    arm = record.get("arm")
    if arm not in case["applicableArms"]:
        raise EvidenceError("run arm is not applicable")
    supersedes = record.get("supersedesRunId")
    if supersedes is not None:
        predecessor = prior_by_id.get(supersedes)
        if predecessor is None:
            raise EvidenceError("supersedesRunId does not identify a prior record")
        if predecessor.get("caseId") != case_id or predecessor.get("arm") != arm:
            raise EvidenceError("a correction may supersede only the same case and arm")

    expected_input = {"ref": case["inputRef"], "sha256": case["inputSha256"]}
    if record.get("input") != expected_input:
        raise EvidenceError("run input identity differs from case")
    assertion_ids = [assertion["id"] for assertion in case["assertions"]]
    if record.get("declaredAssertions") != assertion_ids:
        raise EvidenceError("declared assertions differ from frozen case order")

    identity = record.get("identity")
    if not isinstance(identity, dict):
        raise EvidenceError("run identity must be an object")
    if arm == "A":
        if identity != {"kind": "none"}:
            raise EvidenceError("arm A must record no Skill identity")
    elif arm == "B":
        expected = {
            "kind": "c1-source",
            "baselineManifestSha256": plan["frozenInputs"]["c1"]["manifestSha256"],
            "sourceSet": case["armBSourceSet"],
            "files": plan["arms"]["B"]["sourceSets"][case["armBSourceSet"]],
        }
        if identity != expected:
            raise EvidenceError("arm B identity differs from the frozen C1 source set")
    else:
        expected = {
            "kind": "c6-execution-package",
            "executionPackage": case["armCExecutionPackage"],
            "requestedMembers": case["requestedMembersC"],
        }
        if identity != expected:
            raise EvidenceError("arm C identity differs from the frozen C6 package")

    execution = record.get("execution")
    if not isinstance(execution, dict):
        raise EvidenceError("execution must be an object")
    exact_keys(execution, EXECUTION_KEYS, "execution")
    expected_profile = case["requiredProfileC"] if arm == "C" else ("bare" if arm == "A" else "source")
    if execution["profile"] != expected_profile:
        raise EvidenceError("execution profile differs from the arm contract")
    if execution["host"] not in {"none", "manual", "claude", "codex"}:
        raise EvidenceError("invalid execution host")
    start = parse_instant(execution["startedAt"], "execution.startedAt")
    end = parse_instant(execution["endedAt"], "execution.endedAt")
    wall_clock = require_nonnegative_int(execution["wallClockMs"], "execution.wallClockMs")
    actual_ms = round((end - start).total_seconds() * 1000)
    if actual_ms < 0 or abs(actual_ms - wall_clock) > 1:
        raise EvidenceError("wallClockMs differs from start/end timestamps")
    validate_usage(execution["tokenUsage"], "tokenUsage")
    validate_usage(execution["contextUsage"], "contextUsage")
    lifecycle_refs = execution["lifecycleRefs"]
    if not isinstance(lifecycle_refs, dict):
        raise EvidenceError("lifecycleRefs must be an object")
    if arm == "C" and case["requiredProfileC"] == "managed":
        required_lifecycle_refs = {
            "workflowInstanceId",
            "workflowNodeId",
            "capabilityId",
            "activationId",
            "approvalId",
        }
        exact_keys(lifecycle_refs, required_lifecycle_refs, "managed lifecycleRefs")
        if not all(isinstance(value, str) and value.strip() for value in lifecycle_refs.values()):
            raise EvidenceError("managed lifecycleRefs must contain non-empty identities")
        c6_evidence, _ = strict_json_bytes(C6_EVIDENCE)
        package_id = case["armCExecutionPackage"]["id"]
        manifest = next(entry["manifest"] for entry in c6_evidence["packages"] if entry["manifest"]["id"] == package_id)
        if lifecycle_refs["capabilityId"] != manifest["managedBinding"]["capabilityId"]:
            raise EvidenceError("managed lifecycle capability differs from the package binding")
    elif lifecycle_refs != {}:
        raise EvidenceError("non-managed run must not claim managed lifecycle references")

    overhead = record.get("overhead")
    if not isinstance(overhead, dict):
        raise EvidenceError("overhead must be an object")
    exact_keys(overhead, OVERHEAD_KEYS, "overhead")
    for key, value in overhead.items():
        require_nonnegative_int(value, f"overhead.{key}")
    authorization = plan["providerAuthorization"]
    provider_activity = (
        overhead["modelCalls"] > 0
        or execution["host"] in {"claude", "codex"}
        or execution["provider"] is not None
        or execution["model"] is not None
    )
    if provider_activity:
        if overhead["modelCalls"] < 1:
            raise EvidenceError("provider/model activity must count at least one model call attempt")
        if execution["host"] not in {"claude", "codex"}:
            raise EvidenceError("provider/model activity requires a provider host")
        if not isinstance(execution["provider"], str) or not execution["provider"].strip():
            raise EvidenceError("provider/model activity requires a provider identity")
        if not isinstance(execution["model"], str) or not execution["model"].strip():
            raise EvidenceError("provider/model activity requires a model identity")
        auth_ref = execution["providerAuthorizationRef"]
        if authorization.get("status") != "authorized":
            raise EvidenceError("provider/model run cannot be appended before explicit authorization")
        if auth_ref != authorization.get("authorizationRef"):
            raise EvidenceError("provider authorization reference mismatch")
        authorized_run_ids = authorization.get("authorizedRunIds")
        if authorized_run_ids and run_id not in authorized_run_ids:
            raise EvidenceError("runId is outside the explicitly authorized provider boundary")
    else:
        if execution["host"] not in {"none", "manual"}:
            raise EvidenceError("no-model run must use the none or manual host")
        if execution["providerAuthorizationRef"] is not None:
            raise EvidenceError("no-model run must not claim provider authorization")

    completion = record.get("completion")
    if not isinstance(completion, dict) or set(completion) != {"outcome", "summary"}:
        raise EvidenceError("completion must contain outcome and summary")
    if completion["outcome"] not in {"pass", "partial", "fail", "unavailable"}:
        raise EvidenceError("invalid completion outcome")
    if not isinstance(completion["summary"], str) or not completion["summary"].strip():
        raise EvidenceError("completion summary must be non-empty")

    evidence = require_list(record.get("assertionEvidence"), "assertionEvidence")
    if [item.get("assertionId") for item in evidence if isinstance(item, dict)] != assertion_ids:
        raise EvidenceError("assertion evidence must cover every frozen assertion in order")
    for item in evidence:
        if not isinstance(item, dict) or set(item) != {"assertionId", "status", "evidenceRefs", "note"}:
            raise EvidenceError("invalid assertion evidence entry")
        if item["status"] not in {"pass", "partial", "fail", "not-evaluated"}:
            raise EvidenceError("invalid assertion status")
        require_list(item["evidenceRefs"], "assertion evidence refs")
        if not isinstance(item["note"], str):
            raise EvidenceError("assertion note must be text")

    for field in ("corrections", "reworkSteps", "missedGates", "authorityViolations", "changedPaths", "artifactRefs", "outputRefs", "evaluatorNotes"):
        require_list(record.get(field), field)
    recovery = record.get("recovery")
    if not isinstance(recovery, dict) or set(recovery) != {"attempted", "exactStateRestored", "evidenceRefs"}:
        raise EvidenceError("invalid recovery evidence")
    if not isinstance(recovery["attempted"], bool) or recovery["exactStateRestored"] not in {True, False, None}:
        raise EvidenceError("invalid recovery flags")
    require_list(recovery["evidenceRefs"], "recovery.evidenceRefs")

    output_prefix = f"outputs/{run_id}/"
    scoped_refs = {
        "changedPaths": record["changedPaths"],
        "artifactRefs": record["artifactRefs"],
        "outputRefs": record["outputRefs"],
        "recovery.evidenceRefs": recovery["evidenceRefs"],
    }
    for index, item in enumerate(evidence):
        scoped_refs[f"assertionEvidence[{index}].evidenceRefs"] = item["evidenceRefs"]
    for field, refs in scoped_refs.items():
        for path_text in refs:
            ensure_relative(path_text, field)
            if not path_text.startswith(output_prefix):
                raise EvidenceError(f"{field} path escapes the run output root: {path_text}")
            if require_workspace and field != "changedPaths":
                contained_file(research_root, path_text, field)
    isolation = record.get("isolation")
    if not isinstance(isolation, dict) or set(isolation) != {
        "workspaceRef",
        "siblingOutputsRead",
        "evaluatorAccessAfterAllArmsComplete",
    }:
        raise EvidenceError("invalid isolation evidence")
    if isolation["workspaceRef"] != f"outputs/{run_id}/workspace":
        raise EvidenceError("workspaceRef differs from the isolated run workspace")
    if isolation["siblingOutputsRead"] is not False:
        raise EvidenceError("a run must not read sibling-arm outputs")
    if not isinstance(isolation["evaluatorAccessAfterAllArmsComplete"], bool):
        raise EvidenceError("evaluator isolation flag must be boolean")

    if require_workspace:
        context_path = research_root / "outputs" / run_id / "run-context.json"
        context, _ = strict_json_bytes(context_path)
        if context.get("runId") != run_id or context.get("caseId") != case_id or context.get("arm") != arm:
            raise EvidenceError("prepared run context differs from the run record")


def validate_outputs(research_root: Path, cases: dict[str, dict[str, Any]]) -> None:
    outputs = research_root / "outputs"
    contained_file(outputs, "layout-contract.json", "outputs layout contract")
    for entry in outputs.iterdir():
        if entry.name == "layout-contract.json":
            continue
        if entry.is_symlink() or not entry.is_dir() or RUN_ID_RE.fullmatch(entry.name) is None:
            raise EvidenceError(f"invalid outputs entry: {entry.name}")
        for descendant in entry.rglob("*"):
            if descendant.is_symlink():
                raise EvidenceError(f"run output contains symlink: {descendant.relative_to(research_root)}")
        context, _ = strict_json_bytes(entry / "run-context.json")
        if context.get("runId") != entry.name or context.get("caseId") not in cases:
            raise EvidenceError(f"invalid run context: {entry.name}")
        case = cases[context["caseId"]]
        copied_input = contained_file(entry / "workspace", "input/case.md", "copied case input")
        if sha256_bytes(copied_input.read_bytes()) != case["inputSha256"]:
            raise EvidenceError(f"prepared input digest drift: {entry.name}")
        copied_fixtures = context.get("fixtures")
        if not isinstance(copied_fixtures, list) or len(copied_fixtures) != len(case["fixtureRefs"]):
            raise EvidenceError(f"invalid copied fixture inventory: {entry.name}")
        for copied, frozen in zip(copied_fixtures, case["fixtureRefs"], strict=True):
            source_relative = Path(frozen["path"]).relative_to(Path("cases/fixtures") / case["caseId"])
            expected = {
                "path": str(Path("workspace/fixtures") / source_relative),
                "sha256": frozen["sha256"],
                "bytes": frozen["bytes"],
            }
            if copied != expected:
                raise EvidenceError(f"copied fixture inventory drift: {entry.name}")
            copied_file = contained_file(entry, copied["path"], "copied fixture")
            data = copied_file.read_bytes()
            if len(data) != copied["bytes"] or sha256_bytes(data) != copied["sha256"]:
                raise EvidenceError(f"copied fixture byte drift: {entry.name}/{copied['path']}")


def validate_proof(research_root: Path, plan: dict[str, Any]) -> None:
    proof, _ = strict_json_bytes(research_root / "deterministic-proof.json")
    if proof.get("schemaVersion") != 1 or proof.get("status") not in {
        "pending-verification",
        "passed",
        "failed-zero-tolerance",
    }:
        raise EvidenceError("invalid deterministic proof status")
    frozen = proof.get("frozenIdentity")
    if not isinstance(frozen, dict):
        raise EvidenceError("deterministic proof lacks frozen identity")
    if frozen.get("c1ManifestSha256") != plan["frozenInputs"]["c1"]["manifestSha256"]:
        raise EvidenceError("deterministic proof C1 identity drift")
    if frozen.get("c1BaseCommit") != plan["frozenInputs"]["c1"]["baseCommit"]:
        raise EvidenceError("deterministic proof C1 commit drift")
    if frozen.get("c6EvidenceSha256") != plan["frozenInputs"]["c6"]["evidenceSha256"]:
        raise EvidenceError("deterministic proof C6 identity drift")
    if frozen.get("c6ArchiveCommit") != plan["frozenInputs"]["c6"]["archiveCommit"]:
        raise EvidenceError("deterministic proof C6 commit drift")
    if frozen.get("c6ExecutionPackages") != plan["frozenInputs"]["c6"]["packages"]:
        raise EvidenceError("deterministic proof C6 package identity drift")
    no_provider = proof.get("noProvider")
    if not isinstance(no_provider, dict):
        raise EvidenceError("deterministic proof lacks no-provider evidence")
    if no_provider.get("authorizationStatus") != plan["providerAuthorization"]["status"]:
        raise EvidenceError("no-provider authorization status drift")
    if no_provider.get("runRecordsAtProof") != 0:
        raise EvidenceError("deterministic proof must record zero live runs at proof time")
    for field in (
        "providerProcessesInvoked",
        "modelInvocations",
        "managedWorkersInvoked",
        "canonicalResearchMutationsForEvaluationTelemetry",
    ):
        if no_provider.get(field) != 0:
            raise EvidenceError(f"deterministic no-provider proof must keep {field}=0")
    proofs = require_list(proof.get("proofs"), "deterministic proofs")
    required = {
        "c1-source-identity",
        "c6-packed-package-identity",
        "cross-profile-instruction-parity",
        "managed-replay-context-identity",
        "result-completion-transition-separation",
        "source-admin-refusal",
        "workflow-recovery-state",
    }
    if {item.get("id") for item in proofs if isinstance(item, dict)} != required:
        raise EvidenceError("deterministic proof inventory mismatch")
    if proof.get("status") == "passed":
        if any(item.get("status") != "pass" for item in proofs):
            raise EvidenceError("passed deterministic proof contains a non-pass item")
        parse_instant(proof.get("verifiedAt"), "deterministic-proof.verifiedAt")
    elif proof.get("status") == "failed-zero-tolerance":
        if not any(item.get("status") == "fail" for item in proofs):
            raise EvidenceError("failed deterministic proof lacks a failed item")
        if any(item.get("status") not in {"pass", "fail"} for item in proofs):
            raise EvidenceError("final failed proof contains a pending item")
        parse_instant(proof.get("verifiedAt"), "deterministic-proof.verifiedAt")


def validate_run_schema(research_root: Path) -> None:
    schema, _ = strict_json_bytes(research_root / "run-record.schema.json")
    reject_scores(schema, "run-record.schema")
    if schema.get("$schema") != "https://json-schema.org/draft/2020-12/schema":
        raise EvidenceError("run record schema must use JSON Schema 2020-12")
    if schema.get("additionalProperties") is not False or set(schema.get("required", [])) != RUN_KEYS:
        raise EvidenceError("run record schema top-level contract drift")
    properties = schema.get("properties")
    if not isinstance(properties, dict) or set(properties) != RUN_KEYS:
        raise EvidenceError("run record schema property inventory drift")
    for field, expected in (("execution", EXECUTION_KEYS), ("overhead", OVERHEAD_KEYS)):
        definition = properties.get(field)
        if not isinstance(definition, dict):
            raise EvidenceError(f"run record schema lacks {field}")
        if definition.get("additionalProperties") is not False or set(definition.get("required", [])) != expected:
            raise EvidenceError(f"run record schema {field} contract drift")
    identity = properties.get("identity")
    if not isinstance(identity, dict) or len(identity.get("oneOf", [])) != 3:
        raise EvidenceError("run record schema must define exact A/B/C identity forms")
    for field in ("artifactRefs", "assertionEvidence", "changedPaths", "outputRefs", "recovery", "isolation"):
        if field not in properties:
            raise EvidenceError(f"run record schema lacks {field}")


def require_execution_open(research_root: Path, plan: dict[str, Any]) -> None:
    proof, _ = strict_json_bytes(research_root / "deterministic-proof.json")
    if str(plan.get("status", "")).startswith("blocked-") or proof.get("status") == "failed-zero-tolerance":
        raise EvidenceError("evaluation is blocked by deterministic zero-tolerance evidence")


def validate_final_disposition(
    research_root: Path,
    plan: dict[str, Any],
    cases: dict[str, dict[str, Any]],
    records: list[dict[str, Any]],
) -> None:
    summary, _ = strict_json_bytes(research_root / "summary.json")
    reject_scores(summary, "summary")
    exact_keys(
        summary,
        {
            "schemaVersion",
            "status",
            "deterministicProofRef",
            "zeroToleranceFailure",
            "coverage",
            "providerExecution",
            "acceptanceShortfalls",
            "disposition",
            "fullMigrationBlocked",
            "nextMigrationStarted",
        },
        "summary",
    )
    if summary["schemaVersion"] != 1 or summary["status"] != "failed-zero-tolerance":
        raise EvidenceError("summary must record the final zero-tolerance stop")
    if summary["deterministicProofRef"] != "deterministic-proof.json":
        raise EvidenceError("summary deterministic proof reference drift")
    stop_reason = plan.get("stopReason")
    failure = summary.get("zeroToleranceFailure")
    if not isinstance(stop_reason, dict) or not isinstance(failure, dict):
        raise EvidenceError("summary requires the deterministic stop reason")
    if failure != {
        "checkId": stop_reason.get("checkId"),
        "proofId": stop_reason.get("proofId"),
        "status": "fail",
    }:
        raise EvidenceError("summary zero-tolerance identity drift")
    coverage = summary.get("coverage")
    expected_arm_count = sum(len(case["applicableArms"]) for case in cases.values())
    expected_units = sum(sum(case["plannedInvocationUnits"].values()) for case in cases.values())
    if coverage != {
        "frozenCases": len(cases),
        "boundaries": len(plan["boundaries"]),
        "applicableArmCount": expected_arm_count,
        "plannedInvocationUnits": expected_units,
        "completedRunRecords": len(records),
        "completedRealInvocations": 0,
        "completedArms": {"A": 0, "B": 0, "C": 0},
    }:
        raise EvidenceError("summary coverage must preserve the honest pre-run shortfall")
    if summary.get("providerExecution") != {
        "authorizationStatus": "not-authorized",
        "providerProcessesInvoked": 0,
        "modelInvocations": 0,
        "managedWorkersInvoked": 0,
    }:
        raise EvidenceError("summary provider counters must remain zero")
    shortfalls = require_list(summary.get("acceptanceShortfalls"), "summary.acceptanceShortfalls")
    if len(shortfalls) < 3 or not all(isinstance(item, str) and item.strip() for item in shortfalls):
        raise EvidenceError("summary must state the unfulfilled live-evaluation acceptance criteria")
    disposition = summary.get("disposition")
    if not isinstance(disposition, dict) or disposition != {
        "id": "retain-four-package-pilot-only",
        "supportingProofIds": ["source-admin-refusal"],
        "supportingRunIds": [],
    }:
        raise EvidenceError("summary disposition must retain only the pilot and cite no fabricated runs")
    if summary.get("fullMigrationBlocked") is not True or summary.get("nextMigrationStarted") is not False:
        raise EvidenceError("summary must block migration and automatic continuation")

    decision_path = contained_file(research_root, "decision.md", "final decision")
    decision = decision_path.read_text(encoding="utf-8")
    required_statements = (
        "Disposition: retain the four-package pilot only",
        "Zero-tolerance check: `single-quest-writer` failed",
        "Supporting run IDs: none",
        "Completed real invocations: 0",
        "Provider and model execution: not authorized and not invoked",
        "Full migration: blocked",
        "Next migration: not started",
    )
    for statement in required_statements:
        if statement not in decision:
            raise EvidenceError(f"decision.md missing required statement: {statement}")


def validate_research(research_root: Path = RESEARCH_ROOT) -> dict[str, int]:
    research_root = research_root.resolve(strict=True)
    plan = load_plan(research_root)
    reject_scores(plan, "evaluation-plan")
    validate_frozen_inputs(research_root, plan)
    cases = load_cases(research_root, plan)
    validate_cases(research_root, plan, cases)
    validate_run_schema(research_root)
    validate_outputs(research_root, cases)
    records = read_runs(research_root)
    seen: list[dict[str, Any]] = []
    for record in records:
        validate_run_record(record, research_root, plan, cases, seen, require_workspace=True)
        seen.append(record)
    validate_proof(research_root, plan)
    proof, _ = strict_json_bytes(research_root / "deterministic-proof.json")
    if proof["status"] == "failed-zero-tolerance" and not str(plan.get("status", "")).startswith("blocked-"):
        raise EvidenceError("failed deterministic proof requires a blocked evaluation plan")
    if plan["providerAuthorization"]["status"] == "not-authorized":
        if any(record["overhead"]["modelCalls"] > 0 for record in records):
            raise EvidenceError("provider/model run exists before authorization")
    validate_final_disposition(research_root, plan, cases, records)
    return {"cases": len(cases), "runs": len(records), "boundaries": len(plan["boundaries"])}


def identity_for(case: dict[str, Any], arm: str, plan: dict[str, Any]) -> dict[str, Any]:
    if arm == "A":
        return {"kind": "none"}
    if arm == "B":
        source_set = case["armBSourceSet"]
        return {
            "kind": "c1-source",
            "baselineManifestSha256": plan["frozenInputs"]["c1"]["manifestSha256"],
            "sourceSet": source_set,
            "files": plan["arms"]["B"]["sourceSets"][source_set],
        }
    return {
        "kind": "c6-execution-package",
        "executionPackage": case["armCExecutionPackage"],
        "requestedMembers": case["requestedMembersC"],
    }


def prepare_run(run_id: str, case_id: str, arm: str, research_root: Path = RESEARCH_ROOT) -> Path:
    if RUN_ID_RE.fullmatch(run_id) is None:
        raise EvidenceError("runId must be a lowercase stable slug")
    plan = load_plan(research_root)
    require_execution_open(research_root, plan)
    validate_frozen_inputs(research_root, plan)
    cases = load_cases(research_root, plan)
    validate_cases(research_root, plan, cases)
    case = cases.get(case_id)
    if case is None or arm not in case["applicableArms"]:
        raise EvidenceError("unknown case or inapplicable arm")
    target = research_root / "outputs" / run_id
    if target.exists():
        raise EvidenceError(f"run output already exists: {run_id}")
    workspace = target / "workspace"
    (workspace / "input").mkdir(parents=True)
    (workspace / "fixtures").mkdir(parents=True)
    (target / "artifacts").mkdir()
    (target / "evidence").mkdir()
    shutil.copyfile(research_root / case["inputRef"], workspace / "input" / "case.md")
    copied_fixtures: list[dict[str, Any]] = []
    for fixture in case["fixtureRefs"]:
        source = research_root / fixture["path"]
        relative = Path(fixture["path"]).relative_to(Path("cases/fixtures") / case_id)
        destination = workspace / "fixtures" / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, destination)
        copied_fixtures.append(
            {"path": str(Path("workspace/fixtures") / relative), "sha256": fixture["sha256"], "bytes": fixture["bytes"]}
        )
    created_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    context = {
        "schemaVersion": 1,
        "runId": run_id,
        "caseId": case_id,
        "arm": arm,
        "input": {"path": "workspace/input/case.md", "sha256": case["inputSha256"]},
        "fixtures": copied_fixtures,
        "createdAt": created_at,
        "providerAuthorizationRef": plan["providerAuthorization"]["authorizationRef"],
    }
    (target / "run-context.json").write_text(
        json.dumps(context, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    assertion_ids = [assertion["id"] for assertion in case["assertions"]]
    profile = case["requiredProfileC"] if arm == "C" else ("bare" if arm == "A" else "source")
    draft = {
        "schemaVersion": 1,
        "recordKind": "run",
        "runId": run_id,
        "caseId": case_id,
        "boundary": case["boundary"],
        "arm": arm,
        "supersedesRunId": None,
        "input": {"ref": case["inputRef"], "sha256": case["inputSha256"]},
        "declaredAssertions": assertion_ids,
        "identity": identity_for(case, arm, plan),
        "execution": {
            "profile": profile,
            "host": "none",
            "provider": None,
            "model": None,
            "startedAt": created_at,
            "endedAt": created_at,
            "wallClockMs": 0,
            "tokenUsage": {"status": "unavailable"},
            "contextUsage": {"status": "unavailable"},
            "lifecycleRefs": {},
            "providerAuthorizationRef": None,
        },
        "overhead": {"modelCalls": 0, "approvalRounds": 0, "subagents": 0, "workers": 0, "durableArtifacts": 0},
        "completion": {"outcome": "unavailable", "summary": "Replace with the observed run outcome."},
        "assertionEvidence": [
            {"assertionId": assertion_id, "status": "not-evaluated", "evidenceRefs": [], "note": ""}
            for assertion_id in assertion_ids
        ],
        "corrections": [],
        "reworkSteps": [],
        "missedGates": [],
        "authorityViolations": [],
        "recovery": {"attempted": False, "exactStateRestored": None, "evidenceRefs": []},
        "changedPaths": [f"outputs/{run_id}/run-context.json"],
        "artifactRefs": [],
        "outputRefs": [],
        "isolation": {
            "workspaceRef": f"outputs/{run_id}/workspace",
            "siblingOutputsRead": False,
            "evaluatorAccessAfterAllArmsComplete": False,
        },
        "evaluatorNotes": [],
    }
    (target / "run-record.draft.json").write_text(
        json.dumps(draft, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    return target


def append_run(record_path: Path, research_root: Path = RESEARCH_ROOT) -> str:
    record, _ = strict_json_bytes(record_path.resolve(strict=True))
    plan = load_plan(research_root)
    require_execution_open(research_root, plan)
    validate_frozen_inputs(research_root, plan)
    cases = load_cases(research_root, plan)
    validate_cases(research_root, plan, cases)
    runs_path = research_root / "runs.jsonl"
    with runs_path.open("a+", encoding="utf-8") as stream:
        fcntl.flock(stream.fileno(), fcntl.LOCK_EX)
        stream.seek(0)
        prior: list[dict[str, Any]] = []
        for line_number, line in enumerate(stream, start=1):
            if not line.strip():
                raise EvidenceError(f"runs.jsonl contains blank line {line_number}")
            prior.append(strict_json_object(line.encode("utf-8"), f"runs.jsonl line {line_number}"))
        validate_run_record(record, research_root, plan, cases, prior, require_workspace=True)
        stream.seek(0, os.SEEK_END)
        stream.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n")
        stream.flush()
        os.fsync(stream.fileno())
        fcntl.flock(stream.fileno(), fcntl.LOCK_UN)
    return record["runId"]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--research-root", type=Path, default=RESEARCH_ROOT)
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("validate")
    prepare = subparsers.add_parser("prepare-run")
    prepare.add_argument("--run-id", required=True)
    prepare.add_argument("--case", required=True)
    prepare.add_argument("--arm", choices=("A", "B", "C"), required=True)
    append = subparsers.add_parser("append-run")
    append.add_argument("--record", type=Path, required=True)
    args = parser.parse_args()
    research_root = args.research_root.resolve(strict=True)
    if args.command == "validate":
        counts = validate_research(research_root)
        print(
            f"OK C7 evaluation harness: {counts['cases']} cases, "
            f"{counts['boundaries']} boundaries, {counts['runs']} run records"
        )
    elif args.command == "prepare-run":
        target = prepare_run(args.run_id, args.case, args.arm, research_root)
        print(target)
    else:
        run_id = append_run(args.record, research_root)
        print(f"appended {run_id}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except EvidenceError as error:
        raise SystemExit(f"C7 evidence error: {error}") from error
