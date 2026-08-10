#!/usr/bin/env python3
"""Deterministically author and verify evaluation-contract-v1.3.1 attempt 3."""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import subprocess
import sys
import tempfile
from copy import deepcopy
from pathlib import Path
from typing import Any, Iterable

REPO = Path(__file__).resolve().parents[4]
RESEARCH = Path(__file__).resolve().parent
A1330_COMMIT = "45af4bc13838193d43dc5f59ddd5f1d304da0dc8"
A1330_PARENT = "599eadbae29764ae332fd7ef4dbe2e8bde6edc8f"
A1330_TREE = "b512c9c0ea4cd4e38599f1d1ea26a7ec91eaab84"
A1330_ASSIGNMENT_SHA256 = "eacf6d039af05f07bff2b272f315d16d221a3a74c8fe0b307a517dcf78917634"
A1330_ASSIGNMENT_LENGTH = 44614
A1321_COMMIT = "322b471f7a8ba00914f008f0dd5d8a01dbe01862"
A132_ROOT = ".trellis/tasks/08-08-author-evaluation-contract-v1-3-1-attempt-2/research"
OUTPUT_ROOT = ".trellis/tasks/08-10-author-evaluation-contract-v1-3-1-attempt-3/research"
ASSIGNMENT_PATH = f"{OUTPUT_ROOT}/a133-0-author-assignment-and-input-authorization.json"
SCRIPT_NAME = "author-v1.3.1.py"
OUTPUT_MANIFEST_NAME = "author-output-manifest-v1.3.1.json"

INVARIANT_NAMES = (
    "durable-output-disposition-v1.3.1.json",
    "artifact-lifecycle-contract-v1.3.1.json",
    "validator-registry-v1.3.1.json",
    "validator-binding-matrix-v1.3.1.json",
    "differential-test-matrix-v1.3.1.json",
    "derivability-provenance-matrix-v1.3.1.json",
    "closure-contract-v1.3.1.json",
    "contract-candidate-manifest-v1.3.1.json",
    "four-finding-correction-ledger-v1.3.1.json",
    "semantic-diff-ledger-v1.3.0-to-v1.3.1.json",
)
CHANGED_NAMES = (
    "frozen-semantic-target-v1.3.1.json",
    "assurance-corpus-v1.3.1.json",
    "author-validation.json",
    SCRIPT_NAME,
    OUTPUT_MANIFEST_NAME,
)
OUTPUT_NAMES = (
    *INVARIANT_NAMES[:8],
    "frozen-semantic-target-v1.3.1.json",
    INVARIANT_NAMES[8],
    INVARIANT_NAMES[9],
    "assurance-corpus-v1.3.1.json",
    "author-validation.json",
    SCRIPT_NAME,
    OUTPUT_MANIFEST_NAME,
)
TARGET_POINTERS = (
    "/authoringCommit",
    "/candidateManifest",
    "/candidateStatus",
    "/compatibility",
    "/contractVersion",
    "/differentialDomains",
    "/digestTopology",
    "/infrastructureReference",
    "/liveSelection",
    "/privateSourceUse",
    "/provenanceClasses",
    "/schemaVersion",
    "/sourceAuthority",
    "/workerAuthority",
)
TARGET_KEYS = (
    "acceptedBaseline",
    "authoringCommit",
    "candidateManifest",
    "candidateMemberAggregate",
    "candidateStatus",
    "compatibility",
    "contractIdentity",
    "contractVersion",
    "differentialDomains",
    "digestTopology",
    "governance",
    "infrastructureReference",
    "liveSelection",
    "privateSourceUse",
    "provenanceClasses",
    "recordKind",
    "schemaVersion",
    "sourceAuthority",
    "workerAuthority",
)
WRAPPED_FIELDS = (
    "compatibility",
    "differentialDomains",
    "digestTopology",
    "infrastructureReference",
    "liveSelection",
    "workerAuthority",
)
PLAIN_TARGET_FIELDS = (
    "authoringCommit",
    "candidateStatus",
    "contractVersion",
    "privateSourceUse",
    "provenanceClasses",
)
EXPECTED_MANIFEST_SHA256 = "e3d4322ee5b73a319a3d777d38877345f82efdc253f1ca825df538a1300ecf1a"
EXPECTED_MEMBER_AGGREGATE = "sha256:718d7ecec808199148b63ce64208e60d52be18575b175df67ef620596107fa34"
EXPECTED_COUNTS = {
    "lifecycleDecisions": 14365,
    "negativeLifecycleDecisions": 13390,
    "positiveLifecycleDecisions": 975,
    "provenanceRows": 3343,
    "semanticDiffRows": 9515,
}


class AuthoringError(RuntimeError):
    """Raised when immutable authority or generated evidence fails closed."""


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def canonical_value(value: Any) -> bytes:
    return json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
        allow_nan=False,
    ).encode("utf-8")


def canonical_file(value: Any) -> bytes:
    return canonical_value(value) + b"\n"


def reject_constant(value: str) -> None:
    raise AuthoringError(f"non-finite JSON number: {value}")


def strict_json(data: bytes, *, canonical_required: bool = False) -> Any:
    if b"\r" in data:
        raise AuthoringError("CR byte rejected")
    if not data.endswith(b"\n") or data.endswith(b"\n\n"):
        raise AuthoringError("exactly one final LF required")
    try:
        text = data.decode("utf-8", errors="strict")
    except UnicodeDecodeError as exc:
        raise AuthoringError("invalid UTF-8") from exc

    def pairs_hook(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
        result: dict[str, Any] = {}
        for key, value in pairs:
            if key in result:
                raise AuthoringError(f"duplicate decoded JSON key: {key}")
            result[key] = value
        return result

    try:
        value = json.loads(
            text,
            object_pairs_hook=pairs_hook,
            parse_constant=reject_constant,
        )
    except (json.JSONDecodeError, UnicodeError) as exc:
        raise AuthoringError("strict JSON parse failed") from exc

    def inspect(node: Any) -> None:
        if isinstance(node, str):
            if any(0xD800 <= ord(character) <= 0xDFFF for character in node):
                raise AuthoringError("unpaired surrogate rejected")
        elif isinstance(node, float) and not math.isfinite(node):
            raise AuthoringError("non-finite number rejected")
        elif isinstance(node, dict):
            for key, child in node.items():
                inspect(key)
                inspect(child)
        elif isinstance(node, list):
            for child in node:
                inspect(child)

    inspect(value)
    if canonical_required and canonical_file(value) != data:
        raise AuthoringError("non-canonical JSON bytes")
    return value


def git_bytes(*args: str) -> bytes:
    result = subprocess.run(
        ["git", "-c", "i18n.logOutputEncoding=UTF-8", *args],
        cwd=REPO,
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if result.returncode != 0:
        message = result.stderr.decode("utf-8", errors="replace").strip()
        raise AuthoringError(f"git command failed: {' '.join(args)}: {message}")
    return result.stdout


def git_text(*args: str) -> str:
    return git_bytes(*args).decode("utf-8", errors="strict")


def object_bytes(commit: str, path: str) -> bytes:
    return git_bytes("show", f"{commit}:{path}")


def object_json(commit: str, path: str, *, canonical_required: bool = False) -> Any:
    return strict_json(object_bytes(commit, path), canonical_required=canonical_required)


def verify_tree(commit: str, expected: str) -> None:
    actual = git_text("rev-parse", f"{commit}^{{tree}}").strip()
    if actual != expected:
        raise AuthoringError(f"tree mismatch for {commit}: {actual}")


def verify_record(commit: str, record: dict[str, Any]) -> bytes:
    if set(record) != {"blobOid", "byteLength", "path", "sha256"}:
        raise AuthoringError(f"record schema mismatch: {record.get('path')}")
    data = object_bytes(commit, record["path"])
    if len(data) != record["byteLength"]:
        raise AuthoringError(f"byte length mismatch: {record['path']}")
    if sha256(data) != record["sha256"]:
        raise AuthoringError(f"SHA-256 mismatch: {record['path']}")
    blob = git_text("rev-parse", f"{commit}:{record['path']}").strip()
    if blob != record["blobOid"]:
        raise AuthoringError(f"blob mismatch: {record['path']}")
    if record["path"].endswith(".json"):
        strict_json(data)
    return data


def iter_input_sections(exact_inputs: dict[str, Any]) -> Iterable[tuple[str, dict[str, Any]]]:
    for group_name, group in exact_inputs.items():
        if group_name == "stageAuthorities":
            for section_name, section in group.items():
                yield f"stageAuthorities.{section_name}", section
        else:
            yield group_name, group


def verify_path_identity_aggregate(section_name: str, section: dict[str, Any]) -> None:
    value = section.get("pathIdentityAggregate")
    if not isinstance(value, str) or not value.startswith("sha256:") or len(value) != 71:
        raise AuthoringError(f"invalid path identity aggregate: {section_name}")
    records = section.get("records")
    if not isinstance(records, list) or not records:
        raise AuthoringError(f"empty exact record set: {section_name}")
    paths = [record.get("path") for record in records]
    if len(paths) != len(set(paths)) or any(not isinstance(path, str) for path in paths):
        raise AuthoringError(f"duplicate or invalid exact path: {section_name}")


def verify_protected_baseline(assignment: dict[str, Any]) -> set[str]:
    protected = assignment["protectedBaseline"]
    inherited: set[str] = set()
    for record in protected["files"]:
        path = REPO / record["path"]
        data = path.read_bytes()
        if len(data) != record["byteLength"] or sha256(data) != record["sha256"]:
            raise AuthoringError(f"protected inherited file drift: {record['path']}")
        inherited.add(record["path"])
    for record in protected["submodules"]:
        path = REPO / record["path"]
        commit = subprocess.run(
            ["git", "-c", "i18n.logOutputEncoding=UTF-8", "rev-parse", "HEAD"],
            cwd=path,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="strict",
        ).stdout.strip()
        status = subprocess.run(
            ["git", "-c", "i18n.logOutputEncoding=UTF-8", "status", "--short"],
            cwd=path,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="strict",
        ).stdout.splitlines()
        if commit != record["commit"] or status != record["statusShort"]:
            raise AuthoringError(f"protected inherited submodule drift: {record['path']}")
        inherited.add(record["path"])
    record = protected["untrackedCs5Decision"]
    data = (REPO / record["path"]).read_bytes()
    if len(data) != record["byteLength"] or sha256(data) != record["sha256"]:
        raise AuthoringError("protected CS5 decision drift")
    inherited.add(record["path"])
    return inherited


def worktree_paths() -> tuple[set[str], set[str]]:
    tracked = {
        path
        for path in git_text("diff", "--name-only", "HEAD").splitlines()
        if path
    }
    untracked = {
        path
        for path in git_text("ls-files", "--others", "--exclude-standard").splitlines()
        if path
    }
    staged = {
        path
        for path in git_text("diff", "--cached", "--name-only").splitlines()
        if path
    }
    return tracked | untracked, staged


def authenticate_inputs(*, check_worktree: bool) -> dict[str, Any]:
    verify_tree(A1330_COMMIT, A1330_TREE)
    parents = git_text("show", "-s", "--format=%P", A1330_COMMIT).strip().split()
    if parents != [A1330_PARENT]:
        raise AuthoringError("A133-0 parent mismatch")
    assignment_bytes = object_bytes(A1330_COMMIT, ASSIGNMENT_PATH)
    if len(assignment_bytes) != A1330_ASSIGNMENT_LENGTH:
        raise AuthoringError("A133-0 assignment length mismatch")
    if sha256(assignment_bytes) != A1330_ASSIGNMENT_SHA256:
        raise AuthoringError("A133-0 assignment SHA-256 mismatch")
    assignment = strict_json(assignment_bytes, canonical_required=True)
    expected_identity = {
        "agentId": "a133-author-claude-01",
        "assignedRole": "evaluation-contract-v1.3.1-attempt-3-contract-author",
        "assignmentId": "a133-0-author-assignment-20260810-a",
        "assignmentTimestamp": "2026-08-10T03:38:59Z",
        "modelClass": "gpt-5.6-sol",
        "runtimeClass": "claude-code-fork",
        "sessionId": "a133-author-claude-session-01",
        "status": "assigned-for-a133-1-after-committed-a133-0",
    }
    if assignment.get("assignment") != expected_identity:
        raise AuthoringError("A133 author identity mismatch")
    if assignment["authority"]["taskExecutionAuthorized"] is not True:
        raise AuthoringError("A133-1 execution not authorized")
    forbidden_true = {
        key
        for key, value in assignment["authority"].items()
        if key != "taskExecutionAuthorized" and value is True
    }
    if forbidden_true:
        raise AuthoringError(f"authority widened: {sorted(forbidden_true)}")
    boundary = assignment["authorizationBoundary"]
    if boundary["authorizedBoundary"] != "A133-1":
        raise AuthoringError("A133 authorization boundary mismatch")
    expected_paths = [f"{OUTPUT_ROOT}/{name}" for name in OUTPUT_NAMES]
    if boundary["exactA1331OutputPaths"] != expected_paths:
        raise AuthoringError("A133 exact output order/path mismatch")
    if boundary["exactA1331OutputCount"] != 15:
        raise AuthoringError("A133 exact output count mismatch")
    input_policy = assignment["inputPolicy"]
    if input_policy != {
        "closedCommitTreePathBlobLengthSha256Allowlist": True,
        "mutableWorktreeInputAuthorized": False,
        "networkInputAuthorized": False,
        "privateSourceInputAuthorized": False,
        "readRule": "Read exact committed Git objects only; mutable worktree overlays, shared scratch, runtime behavior, package bytes, and harness results are not semantic authority.",
        "runtimePackageHarnessInputAuthorized": False,
        "unlistedPathUseAsAuthoringInputAuthorized": False,
    }:
        raise AuthoringError("A133 input policy mismatch")

    verified_records = 0
    authenticated: dict[str, dict[str, Any]] = {}
    for section_name, section in iter_input_sections(assignment["exactInputs"]):
        verify_path_identity_aggregate(section_name, section)
        commit = section["commit"]
        verify_tree(commit, section["tree"])
        for record in section["records"]:
            verify_record(commit, record)
            verified_records += 1
        authenticated[section_name] = section
    if verified_records != 113:
        raise AuthoringError(f"exact input record count mismatch: {verified_records}")

    historical = authenticated["stageAuthorities.a1321HistoricalCandidate"]
    if historical["commit"] != A1321_COMMIT or len(historical["records"]) != 15:
        raise AuthoringError("A132 historical candidate authority mismatch")
    correction = assignment["correctionContract"]
    if correction["correctionClass"] != "candidate-evidence/provenance-target-closure":
        raise AuthoringError("correction class mismatch")
    if correction["normativeSemanticCorrection"] is not False:
        raise AuthoringError("unauthorized normative semantic correction")

    inherited: set[str] = set()
    if check_worktree:
        if git_text("rev-parse", "HEAD").strip() != A1330_COMMIT:
            raise AuthoringError("worktree verification requires HEAD at A133-0")
        inherited = verify_protected_baseline(assignment)
        actual_dirty, staged = worktree_paths()
        if staged:
            raise AuthoringError(f"staged set must remain empty: {sorted(staged)}")
        allowed_inventory = {Path(ASSIGNMENT_PATH).name, *OUTPUT_NAMES}
        unexpected = sorted(
            path.name
            for path in RESEARCH.iterdir()
            if path.name not in allowed_inventory or not path.is_file() or path.is_symlink()
        )
        if unexpected:
            raise AuthoringError(f"unexpected A133 research inventory: {unexpected}")
        present_outputs = {
            f"{OUTPUT_ROOT}/{name}"
            for name in OUTPUT_NAMES
            if (RESEARCH / name).is_file()
        }
        expected_dirty = inherited | present_outputs
        if actual_dirty != expected_dirty:
            raise AuthoringError(
                "complete dirty-path mismatch: "
                f"extra={sorted(actual_dirty - expected_dirty)} "
                f"missing={sorted(expected_dirty - actual_dirty)}"
            )

    return {
        "assignment": assignment,
        "authenticated": authenticated,
        "inheritedDirty": sorted(inherited),
        "verifiedRecordCount": verified_records,
    }


def record_by_suffix(section: dict[str, Any], suffix: str) -> dict[str, Any]:
    matches = [record for record in section["records"] if record["path"].endswith(suffix)]
    if len(matches) != 1:
        raise AuthoringError(f"expected one authenticated record ending in {suffix}")
    return matches[0]


def authenticated_json(authority: dict[str, Any], section_name: str, suffix: str) -> Any:
    section = authority["authenticated"][section_name]
    record = record_by_suffix(section, suffix)
    return object_json(section["commit"], record["path"], canonical_required=True)


def pointer_tokens(pointer: str) -> list[str]:
    if pointer == "":
        return []
    if not pointer.startswith("/"):
        raise AuthoringError(f"invalid JSON pointer: {pointer}")
    return [token.replace("~1", "/").replace("~0", "~") for token in pointer[1:].split("/")]


def pointer_get(document: Any, pointer: str) -> Any:
    current = document
    for token in pointer_tokens(pointer):
        if isinstance(current, list):
            try:
                current = current[int(token)]
            except (ValueError, IndexError) as exc:
                raise AuthoringError(f"unresolved JSON pointer: {pointer}") from exc
        elif isinstance(current, dict) and token in current:
            current = current[token]
        else:
            raise AuthoringError(f"unresolved JSON pointer: {pointer}")
    return current


def native_wrapper(source: dict[str, Any]) -> dict[str, Any]:
    wrapped = deepcopy(source)
    provenance = wrapped.get("provenance")
    if not isinstance(provenance, dict) or provenance.get("class") != "trellis-native-v1.3":
        raise AuthoringError("accepted wrapper provenance mismatch")
    provenance["class"] = "trellis-native-v1.3.1"
    return wrapped


def attempt3_governance(
    authority: dict[str, Any],
    a132_target: dict[str, Any],
) -> dict[str, str]:
    authenticated = authority["authenticated"]
    previous = a132_target.get("governance")
    expected_previous = {
        "a11Commit": "3534529a36a10ea8015a51f71a93e2b78300a563",
        "a1320Commit": authenticated["stageAuthorities.a1320AuthorAssignment"]["commit"],
        "g131Commit": authenticated["stageAuthorities.g131Governance"]["commit"],
        "g132Commit": authenticated["stageAuthorities.g132Governance"]["commit"],
        "procedureEvidenceCommit": authenticated["procedure206Authority"]["commit"],
    }
    if previous != expected_previous:
        raise AuthoringError("A132 governance authority mismatch")
    governance = {
        "a11Commit": previous["a11Commit"],
        "a1330Commit": A1330_COMMIT,
        "g131Commit": authenticated["stageAuthorities.g131Governance"]["commit"],
        "g133Commit": authenticated["stageAuthorities.g133Governance"]["commit"],
        "procedureEvidenceCommit": authenticated["procedure206Authority"]["commit"],
    }
    if set(governance) != {
        "a11Commit",
        "a1330Commit",
        "g131Commit",
        "g133Commit",
        "procedureEvidenceCommit",
    }:
        raise AuthoringError("Attempt-3 governance schema mismatch")
    if governance["g133Commit"] != A1330_PARENT:
        raise AuthoringError("G133 governance does not match A133-0 parent")
    return governance


def build_target(authority: dict[str, Any], copied: dict[str, bytes]) -> dict[str, Any]:
    assignment = authority["assignment"]
    accepted = authenticated_json(
        authority,
        "acceptedV13TemplateAuthority",
        "frozen-migration-target-v1.3.json",
    )
    a132_target = strict_json(
        object_bytes(A1321_COMMIT, f"{A132_ROOT}/frozen-semantic-target-v1.3.1.json"),
        canonical_required=True,
    )
    manifest_sha = sha256(copied["contract-candidate-manifest-v1.3.1.json"])
    if manifest_sha != EXPECTED_MANIFEST_SHA256:
        raise AuthoringError("candidate manifest SHA-256 drift")
    compatibility = native_wrapper(accepted["compatibility"])
    compatibility["value"]["methodologyContract"]["candidate"]["identity"] = (
        "evaluation-contract-v1.3.1"
    )
    target = {
        "acceptedBaseline": deepcopy(a132_target["acceptedBaseline"]),
        "authoringCommit": None,
        "candidateManifest": {
            "filename": "contract-candidate-manifest-v1.3.1.json",
            "sha256": manifest_sha,
        },
        "candidateMemberAggregate": EXPECTED_MEMBER_AGGREGATE,
        "candidateStatus": "unaccepted-pending-independent-assurance",
        "compatibility": compatibility,
        "contractIdentity": "evaluation-contract-v1.3.1",
        "contractVersion": "evaluation-contract-v1.3.1",
        "differentialDomains": native_wrapper(accepted["differentialDomains"]),
        "digestTopology": native_wrapper(accepted["digestTopology"]),
        "governance": attempt3_governance(authority, a132_target),
        "infrastructureReference": deepcopy(accepted["infrastructureReference"]),
        "liveSelection": native_wrapper(accepted["liveSelection"]),
        "privateSourceUse": False,
        "provenanceClasses": [
            "inherited-public-v1.2",
            "trellis-native-v1.3.1",
            "inapplicable",
            "blocked-by-contract",
        ],
        "recordKind": "frozen-semantic-target-v1.3.1",
        "schemaVersion": 1,
        "sourceAuthority": deepcopy(accepted["sourceAuthority"]),
        "workerAuthority": native_wrapper(accepted["workerAuthority"]),
    }
    target["digestTopology"]["value"] = deepcopy(
        assignment["correctionContract"]["target"]["digestTopology"]
    )
    target["infrastructureReference"]["value"] = assignment["correctionContract"][
        "target"
    ]["infrastructureReference"]
    if list(sorted(target)) != list(sorted(TARGET_KEYS)) or len(target) != 19:
        raise AuthoringError("target top-level key mismatch")
    if target["contractVersion"] != "evaluation-contract-v1.3.1":
        raise AuthoringError("target contract version mismatch")
    return target


def source_ids(authority: dict[str, Any]) -> dict[str, set[str]]:
    decision = authenticated_json(
        authority,
        "normativeDecisionLedgerAuthority",
        "normative-decision-ledger-v1.3.json",
    )
    correction = strict_json(
        object_bytes(
            A1321_COMMIT,
            f"{A132_ROOT}/four-finding-correction-ledger-v1.3.1.json",
        ),
        canonical_required=True,
    )
    evidence = authenticated_json(
        authority,
        "publicEvidenceAuthority",
        "public-evidence-index-v1.3.json",
    )
    return {
        "DEC": {
            row["decisionId"]
            for key in ("decisions", "conditionalArtifactDecisions")
            for row in decision[key]
        },
        "NA": {row["recordId"] for row in decision["inapplicableRecords"]},
        "BLK": {row["recordId"] for row in decision["blockedRecords"]},
        "CS6": {row["findingId"] for row in correction["findings"]},
        "EV": {row["evidenceId"] for row in evidence["facts"]},
    }


def validate_provenance(
    authority: dict[str, Any],
    target: dict[str, Any],
    copied: dict[str, bytes],
) -> dict[str, Any]:
    provenance = strict_json(
        copied["derivability-provenance-matrix-v1.3.1.json"],
        canonical_required=True,
    )
    rows = provenance["rows"]
    if len(rows) != EXPECTED_COUNTS["provenanceRows"]:
        raise AuthoringError("provenance population drift")
    target_rows = [
        row
        for row in rows
        if row["normativePointer"].startswith(
            "frozen-semantic-target-v1.3.1.json#"
        )
    ]
    by_pointer: dict[str, dict[str, Any]] = {}
    for row in target_rows:
        pointer = row["normativePointer"].split("#", 1)[1]
        if pointer in by_pointer:
            raise AuthoringError(f"duplicate target provenance pointer: {pointer}")
        by_pointer[pointer] = row
    if set(by_pointer) != set(TARGET_POINTERS) or len(target_rows) != 14:
        raise AuthoringError("target provenance pointer population mismatch")

    namespaces = source_ids(authority)
    referenced = {key: set() for key in namespaces}
    for row in rows:
        record_ref = row.get("recordRef")
        if record_ref is not None:
            prefix = record_ref.split("-", 1)[0]
            if prefix not in {"DEC", "NA", "BLK", "CS6"}:
                raise AuthoringError(f"unknown provenance record namespace: {record_ref}")
            if record_ref not in namespaces[prefix]:
                raise AuthoringError(f"unresolved provenance record: {record_ref}")
            referenced[prefix].add(record_ref)
        for evidence_id in row.get("evidenceIds", []):
            if not evidence_id.startswith("EV-") or evidence_id not in namespaces["EV"]:
                raise AuthoringError(f"unresolved public evidence ID: {evidence_id}")
            referenced["EV"].add(evidence_id)

    cases = []
    for pointer in TARGET_POINTERS:
        value = pointer_get(target, pointer)
        row = by_pointer[pointer]
        provenance_value = value.get("provenance") if pointer[1:] in WRAPPED_FIELDS else None
        if provenance_value is not None:
            if provenance_value.get("class") != row["class"]:
                raise AuthoringError(f"wrapper class mismatch: {pointer}")
            if row["recordRef"] is not None:
                if provenance_value.get("decisionId") != row["recordRef"]:
                    raise AuthoringError(f"wrapper decision mismatch: {pointer}")
            elif provenance_value.get("evidenceIds") != row["evidenceIds"]:
                raise AuthoringError(f"wrapper evidence mismatch: {pointer}")
        cases.append(
            {
                "caseId": f"TARGET-CLOSURE-{len(cases) + 1:02d}",
                "evidenceIds": row["evidenceIds"],
                "expected": "resolve-exactly-once-with-authoritative-source",
                "expectedClass": row["class"],
                "pointer": pointer,
                "recordRef": row["recordRef"],
                "valueSha256": f"sha256:{sha256(canonical_value(value))}",
                "wrapped": pointer[1:] in WRAPPED_FIELDS,
            }
        )
    return {
        "cases": cases,
        "namespaceAuthority": {
            "BLK-*": "normative-decision-ledger-v1.3.json",
            "CS6-*": "four-finding-correction-ledger-v1.3.1.json",
            "DEC-*": "normative-decision-ledger-v1.3.json",
            "EV-*": "public-evidence-index-v1.3.json",
            "NA-*": "normative-decision-ledger-v1.3.json",
        },
        "namespaceReferencedCounts": {
            key: len(value) for key, value in sorted(referenced.items())
        },
        "targetRows": target_rows,
    }


def validate_frozen_populations(copied: dict[str, bytes]) -> dict[str, Any]:
    manifest = strict_json(
        copied["contract-candidate-manifest-v1.3.1.json"],
        canonical_required=True,
    )
    if sha256(copied["contract-candidate-manifest-v1.3.1.json"]) != EXPECTED_MANIFEST_SHA256:
        raise AuthoringError("candidate manifest frozen SHA mismatch")
    if manifest["aggregate"]["digest"] != EXPECTED_MEMBER_AGGREGATE:
        raise AuthoringError("seven-member aggregate drift")
    diff = strict_json(
        copied["semantic-diff-ledger-v1.3.0-to-v1.3.1.json"],
        canonical_required=True,
    )
    lifecycle = strict_json(
        copied["artifact-lifecycle-contract-v1.3.1.json"],
        canonical_required=True,
    )["procedureCapabilityArtifactFamilyMapping"]["completeLifecycleMatrix"]
    actual = {
        "lifecycleDecisions": lifecycle["totalDecisions"],
        "negativeLifecycleDecisions": lifecycle["negativeDecisions"],
        "positiveLifecycleDecisions": lifecycle["positiveDecisions"],
        "provenanceRows": len(
            strict_json(
                copied["derivability-provenance-matrix-v1.3.1.json"],
                canonical_required=True,
            )["rows"]
        ),
        "semanticDiffRows": diff["rowCount"],
    }
    if actual != EXPECTED_COUNTS:
        raise AuthoringError(f"frozen population mismatch: {actual}")
    return actual


def load_invariants(authority: dict[str, Any]) -> dict[str, bytes]:
    historical = authority["authenticated"]["stageAuthorities.a1321HistoricalCandidate"]
    by_name = {Path(record["path"]).name: record for record in historical["records"]}
    copied = {}
    for name in INVARIANT_NAMES:
        record = by_name.get(name)
        if record is None:
            raise AuthoringError(f"missing authenticated A132 invariant: {name}")
        copied[name] = verify_record(historical["commit"], record)
        if name.endswith(".json"):
            strict_json(copied[name], canonical_required=True)
    return copied


def build_assurance_corpus(
    authority: dict[str, Any],
    copied: dict[str, bytes],
    target: dict[str, Any],
    closure: dict[str, Any],
) -> dict[str, Any]:
    historical = strict_json(
        object_bytes(A1321_COMMIT, f"{A132_ROOT}/assurance-corpus-v1.3.1.json"),
        canonical_required=True,
    )
    corpus = deepcopy(historical)
    target_contract_cases = [
        {
            "baseFixtureId": "a133-target-closure-valid",
            "caseId": "TARGET-SCHEMA-UNKNOWN-TOP-LEVEL-KEY",
            "expected": "reject-mutation",
            "mutation": {
                "operation": "json-add",
                "target": "/frozenTarget/unexpected",
                "value": True,
            },
            "validationRule": "exact-19-key-closed-target-object",
        },
        {
            "baseFixtureId": "a133-target-closure-valid",
            "caseId": "TARGET-REPRESENTATION-MISSING-WRAPPED-PROVENANCE",
            "expected": "reject-mutation",
            "mutation": {
                "operation": "json-remove",
                "target": "/frozenTarget/compatibility/provenance",
            },
            "validationRule": "six-fields-use-exact-provenance-value-wrapper",
        },
        {
            "baseFixtureId": "a133-target-closure-valid",
            "caseId": "TARGET-REPRESENTATION-WRAPPED-PLAIN-FIELD",
            "expected": "reject-mutation",
            "mutation": {
                "operation": "json-replace",
                "target": "/frozenTarget/authoringCommit",
                "value": {"provenance": {}, "value": None},
            },
            "validationRule": "required-plain-fields-remain-unwrapped",
        },
        {
            "baseFixtureId": "a133-target-closure-valid",
            "caseId": "TARGET-NAMESPACE-UNKNOWN-DECISION",
            "expected": "reject-mutation",
            "mutation": {
                "operation": "json-replace",
                "target": "/targetProvenanceRows/0/recordRef",
                "value": "DEC-UNKNOWN",
            },
            "validationRule": "all-source-namespaces-resolve-through-exact-authority",
        },
        {
            "baseFixtureId": "a133-target-closure-valid",
            "caseId": "TARGET-PARTITION-INVARIANT-ALSO-CHANGED",
            "expected": "reject-mutation",
            "mutation": {
                "operation": "json-add",
                "target": "/outputPartition/mustChangeFromA132/5",
                "value": INVARIANT_NAMES[0],
            },
            "validationRule": "exact-disjoint-ten-invariant-five-changed-partition",
        },
        {
            "baseFixtureId": "a133-target-closure-valid",
            "caseId": "TARGET-DIGEST-TOPOLOGY-MANIFEST-SELF-HASH",
            "expected": "reject-mutation",
            "mutation": {
                "operation": "json-replace",
                "target": "/frozenTarget/digestTopology/value/manifestSelfHash",
                "value": True,
            },
            "validationRule": "exact-acyclic-digest-topology",
        },
    ]
    corpus["coverageCounts"] = deepcopy(historical["coverageCounts"])
    corpus["coverageCounts"]["targetClosureCases"] = len(closure["cases"])
    corpus["coverageCounts"]["targetContractCases"] = len(target_contract_cases)
    corpus["targetClosureCases"] = [
        {**case, "baseFixtureId": "a133-target-closure-valid"}
        for case in closure["cases"]
    ]
    corpus["targetContractCases"] = target_contract_cases
    corpus["targetClosureFixture"] = {
        "correctionClass": "candidate-evidence/provenance-target-closure",
        "digestTopology": deepcopy(target["digestTopology"]),
        "expectedPlainFields": list(PLAIN_TARGET_FIELDS),
        "expectedTopLevelKeys": list(TARGET_KEYS),
        "fixtureId": "a133-target-closure-valid",
        "frozenPopulations": {
            "candidateManifestSha256": EXPECTED_MANIFEST_SHA256,
            "lifecycleDecisions": EXPECTED_COUNTS["lifecycleDecisions"],
            "negativeLifecycleDecisions": EXPECTED_COUNTS["negativeLifecycleDecisions"],
            "positiveLifecycleDecisions": EXPECTED_COUNTS["positiveLifecycleDecisions"],
            "provenanceRows": EXPECTED_COUNTS["provenanceRows"],
            "semanticDiffRows": EXPECTED_COUNTS["semanticDiffRows"],
            "sevenMemberAggregate": EXPECTED_MEMBER_AGGREGATE,
        },
        "frozenTarget": target,
        "frozenTargetSha256": f"sha256:{sha256(canonical_file(target))}",
        "namespaceAuthority": closure["namespaceAuthority"],
        "namespaceReferencedCounts": closure["namespaceReferencedCounts"],
        "normativeSemanticCorrection": False,
        "outputPartition": {
            "byteIdenticalToA132": list(INVARIANT_NAMES),
            "mustChangeFromA132": list(CHANGED_NAMES),
        },
        "targetPointers": list(TARGET_POINTERS),
        "targetProvenanceRows": closure["targetRows"],
        "wrappedFields": list(WRAPPED_FIELDS),
    }
    if len(corpus["globalCases"]) != 44 or len(corpus["globalInapplicabilityCases"]) != 11:
        raise AuthoringError("historical assurance population drift")
    if len(corpus["lifecycleCases"]) != 14374 or len(corpus["semanticDiffCases"]) != 9515:
        raise AuthoringError("historical assurance case drift")
    return corpus


def build_validation(
    authority: dict[str, Any],
    copied: dict[str, bytes],
    target_bytes: bytes,
    corpus_bytes: bytes,
    closure: dict[str, Any],
    populations: dict[str, Any],
) -> dict[str, Any]:
    historical = strict_json(
        object_bytes(A1321_COMMIT, f"{A132_ROOT}/author-validation.json"),
        canonical_required=True,
    )
    return {
        "adversarialTests": deepcopy(historical["adversarialTests"]),
        "authorIdentity": deepcopy(authority["assignment"]["assignment"]),
        "authorityAuthentication": {
            "a1330Commit": A1330_COMMIT,
            "a1330Tree": A1330_TREE,
            "g133Commit": authority["authenticated"]["stageAuthorities.g133Governance"][
                "commit"
            ],
            "closedImmutableAllowlist": True,
            "immutableGitObjectsOnly": True,
            "verifiedAuthorityGroupCount": len(authority["authenticated"]),
            "verifiedRecordCount": authority["verifiedRecordCount"],
        },
        "candidateManifestSha256": EXPECTED_MANIFEST_SHA256,
        "canonicalBytes": {
            "arrayOrderPreserved": True,
            "byteDriftRejected": True,
            "duplicateKeysRejected": True,
            "exactlyOneFinalLf": True,
            "nonFiniteRejected": True,
            "sortedCompactUtf8": True,
            "unknownFieldsRejectedWhereApplicable": True,
            "unpairedSurrogatesRejected": True,
        },
        "classificationCounts": deepcopy(historical["classificationCounts"]),
        "contractIdentity": "evaluation-contract-v1.3.1",
        "correction": {
            "class": "candidate-evidence/provenance-target-closure",
            "normativeSemanticCorrection": False,
        },
        "generation": {
            "byteIdentical": True,
            "cleanGenerationCount": 2,
            "cleanTemporaryDirectories": 2,
            "outputCount": 15,
        },
        "frozenPopulations": {
            "candidateManifestSha256": EXPECTED_MANIFEST_SHA256,
            "lifecycleDecisions": populations["lifecycleDecisions"],
            "negativeLifecycleDecisions": populations["negativeLifecycleDecisions"],
            "positiveLifecycleDecisions": populations["positiveLifecycleDecisions"],
            "provenanceRows": populations["provenanceRows"],
            "semanticDiffRows": populations["semanticDiffRows"],
            "sevenMemberAggregate": EXPECTED_MEMBER_AGGREGATE,
        },
        "historicalReferenceGuards": deepcopy(historical["historicalReferenceGuards"]),
        "lifecycleMatrix": deepcopy(historical["lifecycleMatrix"]),
        "outputPartition": {
            "byteIdenticalCount": 10,
            "byteIdenticalToA132": list(INVARIANT_NAMES),
            "changedCount": 5,
            "changedFromA132": list(CHANGED_NAMES),
            "verified": True,
        },
        "populationCounts": deepcopy(historical["populationCounts"]),
        "recordKind": "a133-author-validation",
        "schemaVersion": 1,
        "semanticDiffRowCount": populations["semanticDiffRows"],
        "semanticDigest": f"sha256:{sha256(target_bytes)}",
        "sevenMemberAggregate": EXPECTED_MEMBER_AGGREGATE,
        "sourceNamespaces": {
            "authority": closure["namespaceAuthority"],
            "referencedCounts": closure["namespaceReferencedCounts"],
            "verified": True,
        },
        "targetClosure": {
            "assuranceCorpusSha256": f"sha256:{sha256(corpus_bytes)}",
            "allPointersResolve": True,
            "attempt3GovernanceVerified": True,
            "contractCaseCount": 6,
            "digestTopologyVerified": True,
            "immutablePartitionVerified": True,
            "plainFieldCount": len(PLAIN_TARGET_FIELDS),
            "pointerCount": 14,
            "representationFormsVerified": True,
            "targetKeyCount": 19,
            "targetSha256": f"sha256:{sha256(target_bytes)}",
            "wrappedFieldCount": 6,
        },
        "verdict": "pass",
        "writeScope": f"{OUTPUT_ROOT}/{{exact-15-file-allowlist}}",
    }


def build_outputs(authority: dict[str, Any], script_bytes: bytes) -> dict[str, bytes]:
    copied = load_invariants(authority)
    populations = validate_frozen_populations(copied)
    target = build_target(authority, copied)
    closure = validate_provenance(authority, target, copied)
    target_bytes = canonical_file(target)
    corpus = build_assurance_corpus(authority, copied, target, closure)
    corpus_bytes = canonical_file(corpus)
    validation = build_validation(
        authority,
        copied,
        target_bytes,
        corpus_bytes,
        closure,
        populations,
    )
    outputs = dict(copied)
    outputs["frozen-semantic-target-v1.3.1.json"] = target_bytes
    outputs["assurance-corpus-v1.3.1.json"] = corpus_bytes
    outputs["author-validation.json"] = canonical_file(validation)
    outputs[SCRIPT_NAME] = script_bytes

    records = []
    for name in OUTPUT_NAMES:
        if name == OUTPUT_MANIFEST_NAME:
            continue
        data = outputs[name]
        records.append(
            {
                "byteLength": len(data),
                "path": f"{OUTPUT_ROOT}/{name}",
                "sha256": sha256(data),
            }
        )
    outputs[OUTPUT_MANIFEST_NAME] = canonical_file(
        {
            "contractIdentity": "evaluation-contract-v1.3.1",
            "excludedOwnHash": True,
            "outputCountExcludingManifest": 14,
            "outputs": records,
            "recordKind": "author-output-manifest-v1.3.1",
            "schemaVersion": 1,
            "subjectGitTree": None,
        }
    )
    if set(outputs) != set(OUTPUT_NAMES):
        raise AuthoringError("generated output inventory mismatch")
    return outputs


def materialize_generation(directory: Path, outputs: dict[str, bytes]) -> None:
    for name in OUTPUT_NAMES:
        path = directory / name
        path.write_bytes(outputs[name])
        if path.read_bytes() != outputs[name]:
            raise AuthoringError(f"temporary generation write mismatch: {name}")


def verify_two_clean_generations(
    authority: dict[str, Any], script_bytes: bytes
) -> dict[str, bytes]:
    first = build_outputs(authority, script_bytes)
    second = build_outputs(authority, script_bytes)
    with tempfile.TemporaryDirectory(prefix="trellis-a133-first-") as first_dir:
        with tempfile.TemporaryDirectory(prefix="trellis-a133-second-") as second_dir:
            first_path = Path(first_dir)
            second_path = Path(second_dir)
            materialize_generation(first_path, first)
            materialize_generation(second_path, second)
            for name in OUTPUT_NAMES:
                if (first_path / name).read_bytes() != (second_path / name).read_bytes():
                    raise AuthoringError(f"two clean generations differ: {name}")
    if first != second:
        raise AuthoringError("two clean generations are not byte-identical")
    return first


def verify_partition(outputs: dict[str, bytes]) -> None:
    for name in INVARIANT_NAMES:
        historical = object_bytes(A1321_COMMIT, f"{A132_ROOT}/{name}")
        if outputs[name] != historical:
            raise AuthoringError(f"required invariant output changed: {name}")
    for name in CHANGED_NAMES:
        historical = object_bytes(A1321_COMMIT, f"{A132_ROOT}/{name}")
        if outputs[name] == historical:
            raise AuthoringError(f"required changed output remained identical: {name}")


def restore_generated(originals: dict[str, bytes | None]) -> None:
    with tempfile.TemporaryDirectory(prefix="trellis-a133-restore-") as temporary:
        stage = Path(temporary)
        for name, data in originals.items():
            destination = RESEARCH / name
            if data is None:
                destination.unlink(missing_ok=True)
            else:
                staged = stage / name
                staged.write_bytes(data)
                os.replace(staged, destination)


def write_outputs(outputs: dict[str, bytes]) -> dict[str, bytes | None]:
    names = [name for name in OUTPUT_NAMES if name != SCRIPT_NAME]
    originals = {
        name: (RESEARCH / name).read_bytes() if (RESEARCH / name).is_file() else None
        for name in names
    }
    try:
        with tempfile.TemporaryDirectory(prefix="trellis-a133-write-") as temporary:
            stage = Path(temporary)
            for name in names:
                (stage / name).write_bytes(outputs[name])
            for name in names:
                os.replace(stage / name, RESEARCH / name)
    except BaseException:
        restore_generated(originals)
        raise
    return originals


def verify_outputs(authority: dict[str, Any]) -> dict[str, Any]:
    script_bytes = (RESEARCH / SCRIPT_NAME).read_bytes()
    if b"\r" in script_bytes or not script_bytes.endswith(b"\n"):
        raise AuthoringError("script byte framing mismatch")
    expected = verify_two_clean_generations(authority, script_bytes)
    actual = {name: (RESEARCH / name).read_bytes() for name in OUTPUT_NAMES}
    for name in OUTPUT_NAMES:
        if actual[name] != expected[name]:
            raise AuthoringError(f"generated output mismatch: {name}")
        if name.endswith(".json"):
            strict_json(actual[name], canonical_required=True)
    verify_partition(actual)
    target = strict_json(
        actual["frozen-semantic-target-v1.3.1.json"],
        canonical_required=True,
    )
    validation = strict_json(actual["author-validation.json"], canonical_required=True)
    expected_governance = {
        "a11Commit": "3534529a36a10ea8015a51f71a93e2b78300a563",
        "a1330Commit": A1330_COMMIT,
        "g131Commit": authority["authenticated"]["stageAuthorities.g131Governance"][
            "commit"
        ],
        "g133Commit": authority["authenticated"]["stageAuthorities.g133Governance"][
            "commit"
        ],
        "procedureEvidenceCommit": authority["authenticated"]["procedure206Authority"][
            "commit"
        ],
    }
    if target.get("governance") != expected_governance:
        raise AuthoringError("Attempt-3 target governance mismatch")
    if {"a1320Commit", "g132Commit"} & set(target["governance"]):
        raise AuthoringError("stale Attempt-2 governance key retained")
    if validation["authorityAuthentication"].get("g133Commit") != A1330_PARENT:
        raise AuthoringError("author validation G133 identity mismatch")
    if validation["targetClosure"].get("attempt3GovernanceVerified") is not True:
        raise AuthoringError("author validation lacks Attempt-3 governance assertion")
    dirty, staged = worktree_paths()
    if staged:
        raise AuthoringError(f"staged set must remain empty: {sorted(staged)}")
    inherited = set(authority["inheritedDirty"])
    expected_dirty = inherited | {f"{OUTPUT_ROOT}/{name}" for name in OUTPUT_NAMES}
    if dirty != expected_dirty:
        raise AuthoringError(
            "final dirty-path mismatch: "
            f"extra={sorted(dirty - expected_dirty)} "
            f"missing={sorted(expected_dirty - dirty)}"
        )
    return {
        "candidateManifestSha256": EXPECTED_MANIFEST_SHA256,
        "changedOutputCount": 5,
        "cleanGenerationCount": 2,
        "dirtyPaths": sorted(dirty),
        "invariantOutputCount": 10,
        "namespaceReferencedCounts": validation["sourceNamespaces"]["referencedCounts"],
        "outputCount": 15,
        "populations": EXPECTED_COUNTS,
        "sevenMemberAggregate": EXPECTED_MEMBER_AGGREGATE,
        "stagedPaths": sorted(staged),
        "targetKeyCount": len(target),
        "targetPointerCount": validation["targetClosure"]["pointerCount"],
        "verdict": "pass",
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--write", action="store_true")
    mode.add_argument("--verify", action="store_true")
    args = parser.parse_args()
    authority = authenticate_inputs(check_worktree=True)
    script_bytes = Path(__file__).read_bytes()
    originals: dict[str, bytes | None] | None = None
    if args.write:
        outputs = verify_two_clean_generations(authority, script_bytes)
        verify_partition(outputs)
        originals = write_outputs(outputs)
    try:
        result = verify_outputs(authority)
    except BaseException:
        if originals is not None:
            restore_generated(originals)
        raise
    sys.stdout.write(json.dumps(result, ensure_ascii=False, sort_keys=True) + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
