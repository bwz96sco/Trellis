#!/usr/bin/env python3
"""Generate and verify the immutable dormant Procedure 2.0.7 family packages."""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import subprocess
import sys
from pathlib import Path
from typing import Any, Iterable

REPO = Path(__file__).resolve().parents[3]
PROCEDURE_ROOT = REPO / "packages/cli/src/templates/research/procedures"
TASK = REPO / ".trellis/tasks/08-12-project-procedure-2-0-7-family-packages"
T0 = ".trellis/tasks/08-12-govern-evaluation-contract-v1-3-1-technical-successor"
T0_INVENTORY = f"{T0}/research/g0-topology-ownership-and-stage-inventories.json"
T0_ATTESTATION = f"{T0}/research/g0-accepted-semantic-input-attestation.json"
T0_VERSION_INVENTORY = f"{T0}/research/g0-procedure-version-inventory.json"
T1_RESULT = ".trellis/tasks/08-12-conform-core-runtime-to-evaluation-contract-v1-3-1/research/core-conformance-result.json"
T2_RESULT = ".trellis/tasks/08-12-conform-cli-to-evaluation-contract-v1-3-1/research/cli-conformance-result.json"

PREDECESSOR_COMMIT = "3ff308c2befe574512a8eb173eebbe6d3141c6d9"
PREDECESSOR_TREE = "2830c1415ae282e99c3539eb155a4af19cb7bcb9"
A133_COMMIT = "5a038a87531c3dbfa7b52ba82eaa59d856ab1ea3"
A133_TREE = "47633d69ffb68b7e225e01e502fe133616a1078b"
B133_COMMIT = "56277b874217a3b8a01b63a4905cf6b22708cb05"
B133_TREE = "3873721fe9208644e856f857a2c34e9651c96edc"
O133_COMMIT = "2253df9fb67f8ee84d470da23205e9610f8a4e3e"
O133_TREE = "7e5430197841776a6d8d7f31e8b82517473f082f"
CONTRACT_VERSION = "evaluation-contract-v1.3.1"
CONTRACT_DIGEST = "sha256:8e2cd20dd8e12caab318852f82a100116a28d405113f654efbda7b3646f666af"
CANDIDATE_MANIFEST_SHA256 = "e3d4322ee5b73a319a3d777d38877345f82efdc253f1ca825df538a1300ecf1a"
MEMBER_AGGREGATE = "sha256:718d7ecec808199148b63ce64208e60d52be18575b175df67ef620596107fa34"
COMPLETE_OUTPUT_SET_DIGEST = "sha256:514b7c99450c0703ebacef8b16fc0a3658b8ea5c87ef05bf371166916597d642"
MAPPING_ROWS_DIGEST = "sha256:6f63481078b8b49b8645b2b4f3cdf7b4b6a6c0155958c6b9713a0da38bdf462f"
PROCEDURE_VERSION = "2.0.7"
LIVE_SELECTION = "1.0.0"
PROCEDURE_DIGEST_DOMAIN = b"trellis-research-procedure-digest-v2\0"
MEMBER_AGGREGATE_DOMAIN = b"trellis-accepted-v13-pack-members\0"
HISTORICAL_DIGEST_DOMAIN = b"trellis-procedure-history-v1\0"
PACKAGE_DIGEST_DOMAIN = b"trellis-procedure-207-package-set-v1\0"

MEMBER_NAMES = (
    "durable-output-disposition-v1.3.1.json",
    "artifact-lifecycle-contract-v1.3.1.json",
    "validator-registry-v1.3.1.json",
    "validator-binding-matrix-v1.3.1.json",
    "differential-test-matrix-v1.3.1.json",
    "derivability-provenance-matrix-v1.3.1.json",
    "closure-contract-v1.3.1.json",
)
A133_ROOT = ".trellis/tasks/08-10-author-evaluation-contract-v1-3-1-attempt-3/research"

FAMILIES = (
    "computation-case-v1",
    "experiment-campaign-v1",
    "experiment-round-v1",
    "figure-v1",
    "idea-evaluation-v1",
    "idea-generation-v1",
    "literature-review-v1",
    "literature-scan-v1",
    "project-setup-v1",
    "quest-admin-v1",
    "quest-framing-v1",
    "review-campaign-v1",
    "review-case-v1",
    "slides-v1",
    "survey-v1",
    "theory-case-v1",
    "writing-case-v1",
)
HISTORICAL_VERSIONS = (
    "1.0.0",
    "2.0.0",
    "2.0.1",
    "2.0.2",
    "2.0.3",
    "2.0.4",
    "2.0.5",
    "2.0.6",
)

CLOSURE_PROCEDURES = {
    "literature-scan-v1": "research-literature",
    "literature-review-v1": "research-literature",
    "idea-generation-v1": "research-ideation",
    "idea-evaluation-v1": "research-idea-evaluation",
    "experiment-campaign-v1": "research-experiment",
    "experiment-round-v1": "research-experiment",
}
CLOSURE_NOT_APPLICABLE_CODES = {
    "project-setup-v1": "V13_CLOSURE_NOT_APPLICABLE_PROJECT_SETUP",
    "quest-framing-v1": "V13_CLOSURE_NOT_APPLICABLE_QUEST_FRAMING",
    "quest-admin-v1": "V13_CLOSURE_NOT_APPLICABLE_QUEST_ADMIN",
    "survey-v1": "V13_CLOSURE_NOT_APPLICABLE_SURVEY",
    "computation-case-v1": "V13_CLOSURE_NOT_APPLICABLE_COMPUTATION",
    "theory-case-v1": "V13_CLOSURE_NOT_APPLICABLE_THEORY",
    "review-case-v1": "V13_CLOSURE_NOT_APPLICABLE_REVIEW_CASE",
    "review-campaign-v1": "V13_CLOSURE_NOT_APPLICABLE_REVIEW_CAMPAIGN",
    "writing-case-v1": "V13_CLOSURE_NOT_APPLICABLE_WRITING",
    "figure-v1": "V13_CLOSURE_NOT_APPLICABLE_FIGURE",
    "slides-v1": "V13_CLOSURE_NOT_APPLICABLE_SLIDES",
}
CLOSURE_NOT_APPLICABLE_RATIONALE = (
    "This Procedure has no canonical closure artifact under the accepted "
    "evaluation-contract-v1.3.1 closure contract; closure is explicitly "
    "notApplicable and must never be inferred from Result.status."
)

PACKAGE_RELATIVE_PATHS = (
    "PROCEDURE.md",
    "procedure.json",
    "methodology/artifacts/artifact-contract.json",
    "methodology/bindings/bindings.json",
    "methodology/digests.json",
    "methodology/instructions/checkpoints.md",
    "methodology/lifecycle/lifecycle-rows.json",
    "methodology/pack.json",
    "methodology/pack.json.sha256",
    "methodology/package-contract.json",
    "methodology/validators/validators.json",
)
EVIDENCE_NAMES = (
    "projection-input-attestation.json",
    "procedure-version-recheck.json",
    "package-inventory.json",
    "generation-evidence-ledger.json",
    "historical-procedure-audit.json",
    "package-verification.json",
)


class DuplicateKeyError(ValueError):
    """Raised when strict JSON contains a duplicate object key."""


def _pairs(items: list[tuple[str, Any]]) -> dict[str, Any]:
    value: dict[str, Any] = {}
    for key, item in items:
        if key in value:
            raise DuplicateKeyError(key)
        value[key] = item
    return value


def _bad_constant(value: str) -> None:
    raise ValueError(f"non-finite number: {value}")


def parse_json_bytes(data: bytes) -> Any:
    text = data.decode("utf-8", errors="strict")
    value = json.loads(
        text,
        object_pairs_hook=_pairs,
        parse_constant=_bad_constant,
    )

    def walk(item: Any) -> None:
        if isinstance(item, float) and not math.isfinite(item):
            raise ValueError("non-finite number")
        if isinstance(item, dict):
            for key, nested in item.items():
                if any(0xD800 <= ord(char) <= 0xDFFF for char in key):
                    raise ValueError("surrogate key")
                walk(nested)
        elif isinstance(item, list):
            for nested in item:
                walk(nested)
        elif isinstance(item, str) and any(
            0xD800 <= ord(char) <= 0xDFFF for char in item
        ):
            raise ValueError("surrogate string")

    walk(value)
    return value


def canonical_json(value: Any) -> bytes:
    return (
        json.dumps(
            value,
            sort_keys=True,
            separators=(",", ":"),
            ensure_ascii=False,
            allow_nan=False,
        )
        + "\n"
    ).encode("utf-8")


def ordered_json(value: Any) -> bytes:
    return (
        json.dumps(
            value,
            separators=(",", ":"),
            ensure_ascii=False,
            allow_nan=False,
        )
        + "\n"
    ).encode("utf-8")


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_prefixed(data: bytes) -> str:
    return f"sha256:{sha256_hex(data)}"


def run(args: list[str], check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        args,
        cwd=REPO,
        check=check,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="strict",
    )


def git_text(args: list[str], check: bool = True) -> str:
    return run(
        ["git", "-c", "i18n.logOutputEncoding=UTF-8", *args],
        check=check,
    ).stdout


def git_bytes(commit: str, path: str) -> bytes:
    return subprocess.run(
        ["git", "-C", str(REPO), "show", f"{commit}:{path}"],
        check=True,
        capture_output=True,
    ).stdout


def object_record(commit: str, path: str) -> dict[str, Any]:
    data = git_bytes(commit, path)
    oid = git_text(["rev-parse", f"{commit}:{path}"]).strip()
    return {
        "blobOid": oid,
        "byteLength": len(data),
        "mode": "100644",
        "objectType": "blob",
        "path": path,
        "sha256": sha256_hex(data),
    }


def unwrap(value: Any) -> Any:
    return value["value"] if isinstance(value, dict) and "value" in value else value


def require_dict(value: Any, label: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ValueError(f"{label} must be an object")
    return value


def require_list(value: Any, label: str) -> list[Any]:
    if not isinstance(value, list):
        raise ValueError(f"{label} must be an array")
    return value


def authenticate_inputs() -> dict[str, Any]:
    if git_text(["rev-parse", f"{PREDECESSOR_COMMIT}^{{commit}}"]).strip() != PREDECESSOR_COMMIT:
        raise ValueError("authorized T3 predecessor commit is unavailable")
    if git_text(["rev-parse", f"{PREDECESSOR_COMMIT}^{{tree}}"]).strip() != PREDECESSOR_TREE:
        raise ValueError("authorized T3 predecessor tree mismatch")
    if run(
        ["git", "merge-base", "--is-ancestor", PREDECESSOR_COMMIT, "HEAD"],
        check=False,
    ).returncode != 0:
        raise ValueError("HEAD does not descend from the authorized T3 predecessor")
    for commit, tree in (
        (A133_COMMIT, A133_TREE),
        (B133_COMMIT, B133_TREE),
        (O133_COMMIT, O133_TREE),
    ):
        if git_text(["rev-parse", f"{commit}^{{commit}}"]).strip() != commit:
            raise ValueError(f"missing immutable commit {commit}")
        if git_text(["rev-parse", f"{commit}^{{tree}}"]).strip() != tree:
            raise ValueError(f"immutable tree mismatch for {commit}")

    attestation = require_dict(
        parse_json_bytes(git_bytes(PREDECESSOR_COMMIT, T0_ATTESTATION)),
        "T0 attestation",
    )
    candidate = require_dict(attestation["semanticCandidate"], "semantic candidate")
    expected_identity = {
        "commit": A133_COMMIT,
        "tree": A133_TREE,
        "candidateManifestSha256": CANDIDATE_MANIFEST_SHA256,
        "sevenMemberAggregate": MEMBER_AGGREGATE,
        "semanticDigest": CONTRACT_DIGEST,
        "completeOutputSetDigest": COMPLETE_OUTPUT_SET_DIGEST,
    }
    for key, expected in expected_identity.items():
        if candidate.get(key) != expected:
            raise ValueError(f"semantic candidate {key} mismatch")

    member_records = require_list(candidate["members"], "semantic members")
    if len(member_records) != len(MEMBER_NAMES):
        raise ValueError("semantic candidate must contain exactly seven members")
    expected_paths = [f"{A133_ROOT}/{name}" for name in MEMBER_NAMES]
    if [record.get("path") for record in member_records] != expected_paths:
        raise ValueError("semantic member order/path mismatch")
    for record in member_records:
        if record != object_record(A133_COMMIT, str(record["path"])):
            raise ValueError(f"semantic member object mismatch: {record['path']}")

    aggregate = hashlib.sha256()
    aggregate.update(MEMBER_AGGREGATE_DOMAIN)
    member_bytes: dict[str, bytes] = {}
    member_documents: dict[str, Any] = {}
    for name in MEMBER_NAMES:
        path = f"{A133_ROOT}/{name}"
        data = git_bytes(A133_COMMIT, path)
        member_bytes[name] = data
        member_documents[name] = parse_json_bytes(data)
        aggregate.update(name.encode("utf-8"))
        aggregate.update(b"\0")
        aggregate.update(data)
        aggregate.update(b"\0")
    derived_aggregate = f"sha256:{aggregate.hexdigest()}"
    if derived_aggregate != MEMBER_AGGREGATE:
        raise ValueError("accepted seven-member aggregate mismatch")

    lifecycle = require_dict(
        member_documents["artifact-lifecycle-contract-v1.3.1.json"],
        "lifecycle contract",
    )
    mapping = require_dict(
        lifecycle["procedureCapabilityArtifactFamilyMapping"],
        "Procedure/capability mapping",
    )
    if mapping.get("mappingRowsDigest") != MAPPING_ROWS_DIGEST:
        raise ValueError("mapping rows digest mismatch")
    rows = require_list(mapping["rows"], "mapping rows")
    if len(rows) != len(FAMILIES):
        raise ValueError("mapping must contain exactly seventeen rows")
    if {require_dict(row, "mapping row").get("procedureId") for row in rows} != set(
        FAMILIES
    ):
        raise ValueError("mapping Procedure set mismatch")

    return {
        "attestation": attestation,
        "candidate": candidate,
        "memberBytes": member_bytes,
        "memberDocuments": member_documents,
        "t1": object_record(PREDECESSOR_COMMIT, T1_RESULT),
        "t2": object_record(PREDECESSOR_COMMIT, T2_RESULT),
    }


def expected_t3_paths() -> tuple[str, ...]:
    inventory = require_dict(
        parse_json_bytes(git_bytes(PREDECESSOR_COMMIT, T0_INVENTORY)),
        "T0 topology inventory",
    )
    stages = require_dict(inventory["stageInventories"], "stage inventories")
    t3 = require_dict(stages["T3"], "T3 inventory")
    paths = tuple(str(path) for path in require_list(t3["paths"], "T3 paths"))
    if t3.get("count") != 213 or len(paths) != 213 or len(set(paths)) != 213:
        raise ValueError("T3 inventory count/uniqueness mismatch")
    return paths


def collision_recheck() -> dict[str, Any]:
    history = git_text(
        [
            "log",
            PREDECESSOR_COMMIT,
            "--format=",
            "--name-only",
            "--",
            "packages/cli/src/templates/research/procedures",
        ]
    )
    history_paths = sorted({line for line in history.splitlines() if line.strip()})
    collisions = [path for path in history_paths if "/2.0.7/" in path]
    observed_versions = sorted(
        {
            parts[-2]
            for path in history_paths
            if len(parts := path.split("/")) >= 2 and parts[-2].count(".") == 2
        }
    )
    if collisions:
        raise ValueError(f"Procedure 2.0.7 collision: {collisions[0]}")
    if observed_versions != list(HISTORICAL_VERSIONS):
        raise ValueError("historical Procedure version set mismatch")
    return {
        "allocatedVersion": PROCEDURE_VERSION,
        "candidateVersionCollision": False,
        "historyObservedVersions": observed_versions,
        "historyPathContaining207": None,
        "liveSelection": LIVE_SELECTION,
        "procedure207Dormant": True,
    }


def historical_audit() -> dict[str, Any]:
    prefix = "packages/cli/src/templates/research/procedures"
    rows = git_text(["ls-tree", "-r", PREDECESSOR_COMMIT, prefix]).splitlines()
    by_version: dict[str, list[tuple[str, bytes]]] = {
        version: [] for version in HISTORICAL_VERSIONS
    }
    prefix_parts = prefix.split("/")
    for row in rows:
        _, path = row.split("\t", 1)
        parts = path.split("/")
        if parts[: len(prefix_parts)] != prefix_parts or len(parts) < 9:
            raise ValueError(f"unexpected historical Procedure path: {path}")
        version = parts[len(prefix_parts) + 1]
        if version not in by_version:
            continue
        expected = git_bytes(PREDECESSOR_COMMIT, path)
        actual_path = REPO / path
        if not actual_path.is_file():
            raise ValueError(f"historical Procedure path missing: {path}")
        actual = actual_path.read_bytes()
        if actual != expected:
            raise ValueError(f"historical Procedure byte drift: {path}")
        by_version[version].append((path, expected))

    summaries: list[dict[str, Any]] = []
    overall = hashlib.sha256()
    overall.update(HISTORICAL_DIGEST_DOMAIN)
    for version in HISTORICAL_VERSIONS:
        entries = sorted(by_version[version], key=lambda item: item[0])
        digest = hashlib.sha256()
        digest.update(HISTORICAL_DIGEST_DOMAIN)
        families: set[str] = set()
        for path, data in entries:
            path_bytes = path.encode("utf-8")
            digest.update(path_bytes)
            digest.update(b"\0")
            digest.update(data)
            digest.update(b"\0")
            overall.update(path_bytes)
            overall.update(b"\0")
            overall.update(data)
            overall.update(b"\0")
            families.add(path.split("/")[6])
        summaries.append(
            {
                "version": version,
                "blobCount": len(entries),
                "familyCount": len(families),
                "families": sorted(families),
                "contentAggregateSha256": f"sha256:{digest.hexdigest()}",
                "matchesPredecessor": True,
            }
        )
    return {
        "baselineCommit": PREDECESSOR_COMMIT,
        "baselineTree": PREDECESSOR_TREE,
        "historicalVersions": summaries,
        "overallContentAggregateSha256": f"sha256:{overall.hexdigest()}",
        "historicalBytesPreserved": True,
    }


def source_manifest(procedure_id: str) -> dict[str, Any]:
    path = f"packages/cli/src/templates/research/procedures/{procedure_id}/2.0.6/procedure.json"
    source = require_dict(parse_json_bytes(git_bytes(PREDECESSOR_COMMIT, path)), path)
    source["version"] = PROCEDURE_VERSION
    order = (
        "schemaVersion",
        "id",
        "version",
        "stage",
        "kind",
        "inputs",
        "outputs",
        "networkPolicy",
        "repositoryScope",
        "maxDurationMinutes",
        "maxDispatches",
        "replaces",
        "packageSchemaVersion",
    )
    manifest = {key: source[key] for key in order if key in source}
    if manifest.get("id") != procedure_id or manifest.get("packageSchemaVersion") != 2:
        raise ValueError(f"invalid predecessor manifest for {procedure_id}")
    return manifest


def source_checkpoints(procedure_id: str) -> bytes:
    path = (
        "packages/cli/src/templates/research/procedures/"
        f"{procedure_id}/2.0.6/methodology/instructions/checkpoints.md"
    )
    return git_bytes(PREDECESSOR_COMMIT, path)


def mapping_rows(lifecycle: dict[str, Any]) -> dict[str, dict[str, Any]]:
    mapping = require_dict(
        lifecycle["procedureCapabilityArtifactFamilyMapping"],
        "Procedure/capability mapping",
    )
    rows = require_list(mapping["rows"], "mapping rows")
    result: dict[str, dict[str, Any]] = {}
    for raw in rows:
        row = require_dict(raw, "mapping row")
        procedure_id = str(row["procedureId"])
        if row.get("procedureVersion") != PROCEDURE_VERSION:
            raise ValueError(f"mapping version mismatch for {procedure_id}")
        if procedure_id in result:
            raise ValueError(f"duplicate mapping for {procedure_id}")
        result[procedure_id] = row
    return result


def artifact_family(row: dict[str, Any]) -> str:
    value = unwrap(row["family"])
    if not isinstance(value, str):
        raise ValueError("artifact family must be a string")
    return value


def public_identity(row: dict[str, Any]) -> str:
    value = unwrap(row["publicIdentity"])
    if not isinstance(value, str):
        raise ValueError("artifact publicIdentity must be a string")
    return value


def dimension_value(row: dict[str, Any], dimension: str) -> Any:
    dimensions = require_dict(row["dimensions"], "artifact dimensions")
    value = require_dict(dimensions[dimension], f"dimension {dimension}").get("value")
    return value


def validator_binding_ids(row: dict[str, Any]) -> list[str]:
    raw = unwrap(row["validatorBindingIds"])
    return [str(value) for value in require_list(raw, "validator binding ids")]


def safe_validator_descriptors(registry: dict[str, Any]) -> list[dict[str, Any]]:
    descriptors: list[dict[str, Any]] = []
    for raw in require_list(registry["validators"], "validator registry"):
        row = require_dict(raw, "validator row")
        identity = require_dict(unwrap(row["identity"]), "validator identity")
        severity = require_dict(unwrap(row["severity"]), "validator severity")
        worker = require_dict(unwrap(row["workerDescriptor"]), "worker descriptor")
        safe_fields = require_list(worker["safeFields"], "worker safe fields")
        if safe_fields != ["id", "version", "severity", "description", "stableErrors"]:
            raise ValueError("validator worker-safe field set drift")
        if severity.get("fixed") != "critical" or severity.get("downgradeAllowed") is not False:
            raise ValueError("validator severity drift")
        descriptors.append(
            {
                "id": identity["id"],
                "version": identity["version"],
                "severity": "critical",
                "description": worker["description"],
                "stableErrors": unwrap(row["stableErrors"]),
            }
        )
    if len(descriptors) != 20:
        raise ValueError("trusted validator descriptor count must be twenty")
    return descriptors


def closure_specs(closure: dict[str, Any]) -> dict[str, dict[str, Any]]:
    specs: dict[str, dict[str, Any]] = {}
    for raw in require_list(closure["families"], "closure families"):
        row = require_dict(raw, "closure family")
        family = str(row["familyId"])
        artifact = require_dict(
            unwrap(require_dict(row["closureArtifact"], "closure artifact")),
            "closure artifact value",
        )
        specs[family] = {
            "family": family,
            "closureContractId": artifact["artifactId"],
            "exactPath": artifact["identity"],
            "mediaType": artifact["mediaType"],
            "closedSchema": artifact["closedSchema"],
            "validatorBindingIds": unwrap(row["validatorBindingIds"]),
        }
    if set(specs) != {
        "research-literature",
        "research-ideation",
        "research-idea-evaluation",
        "research-experiment",
    }:
        raise ValueError("closure family set mismatch")
    return specs


def selected_bindings(
    procedure_id: str,
    mapping: dict[str, Any],
    lifecycle: dict[str, Any],
    binding_matrix: dict[str, Any],
) -> list[dict[str, Any]]:
    decisions = require_list(
        require_dict(
            require_dict(
                lifecycle["procedureCapabilityArtifactFamilyMapping"], "mapping"
            )["completeLifecycleMatrix"],
            "complete lifecycle matrix",
        )["decisions"],
        "lifecycle decisions",
    )
    applicable_artifact_binding_ids = {
        str(require_dict(raw, "lifecycle decision")["bindingId"])
        for raw in decisions
        if require_dict(raw, "lifecycle decision").get("procedureId") == procedure_id
        and require_dict(raw, "lifecycle decision").get("capabilityId")
        == mapping["capabilityId"]
        and require_dict(raw, "lifecycle decision").get("applies") is True
    }
    closure_family = CLOSURE_PROCEDURES.get(procedure_id)
    selected: list[dict[str, Any]] = []
    for raw in require_list(binding_matrix["bindings"], "binding matrix"):
        binding = require_dict(raw, "binding")
        kind = str(binding["ruleKind"])
        if kind.startswith("artifact."):
            if binding["bindingId"] in applicable_artifact_binding_ids:
                selected.append(binding)
        elif kind.startswith("closure."):
            if closure_family is not None and binding["targetId"] == closure_family:
                selected.append(binding)
        else:
            selected.append(binding)
    return selected


def procedure_markdown(
    procedure_id: str,
    mapping: dict[str, Any],
    worker_visible: Iterable[str],
) -> bytes:
    support = "\n".join(f"- `methodology/{path}`" for path in worker_visible)
    family = mapping["artifactFamily"]
    disposition = mapping["disposition"]
    text = f"""# {procedure_id} methodology (v2.0.7)\n\n## Purpose\n\nDormant Procedure package for `{procedure_id}`, projected from the exact accepted `{CONTRACT_VERSION}` semantics.\n\n## Exact mapping\n\n- Capability: `{mapping['capabilityId']}`\n- Lifecycle disposition: `{disposition}`\n- Artifact family: `{family if family is not None else 'notApplicable'}`\n\n## Authority\n\nThe worker is Proposal-only. It may produce only declared artifacts within allowed write paths. Root-owned validation, canonical recording, Decision, activation, and publication authority do not move to the worker.\n\n## Worker-visible support files\n\n{support}\n\nThis list is complete. Do not discover additional methodology files dynamically. Validator files contain descriptors only and never executable validator bodies.\n\n## Stop conditions\n\nStop on missing, unknown, contradictory, aliased, ambiguous, or unauthenticated facts; support-file drift; undeclared output; invalid closure evidence; or any attempted authority widening.\n\n## Methodology binding\n\nBound to `{CONTRACT_VERSION}` semantic digest `{CONTRACT_DIGEST}`, A133 commit `{A133_COMMIT}`, and seven-member aggregate `{MEMBER_AGGREGATE}`. The package is dormant; live Procedure selection remains `{LIVE_SELECTION}`.\n"""
    return text.encode("utf-8")


def support_entry(
    path: str,
    role: str,
    media_type: str,
    visibility: str,
    procedure_id: str,
    data: bytes,
) -> dict[str, Any]:
    return {
        "path": path,
        "role": role,
        "mediaType": media_type,
        "contractVersion": CONTRACT_VERSION,
        "provenanceId": f"A133-T3-207-{procedure_id}-{path.replace('/', '-')}",
        "sha256": sha256_hex(data),
        "maxBytes": len(data),
        "workerVisibility": visibility,
    }


def inventory_json(entries: list[dict[str, Any]], files: dict[str, bytes]) -> bytes:
    rows: list[dict[str, Any]] = []
    for entry in sorted(entries, key=lambda item: str(item["path"])):
        path = str(entry["path"])
        rows.append(
            {
                "path": path,
                "role": entry["role"],
                "mediaType": entry["mediaType"],
                "contractVersion": entry["contractVersion"],
                "provenanceId": entry["provenanceId"],
                "sha256": entry["sha256"],
                "byteLength": len(files[path]),
                "workerVisibility": entry["workerVisibility"],
            }
        )
    return ordered_json(rows)


def procedure_digest(
    manifest_bytes: bytes,
    instruction_bytes: bytes,
    pack_bytes: bytes,
    entries: list[dict[str, Any]],
    files: dict[str, bytes],
) -> str:
    digest = hashlib.sha256()
    digest.update(PROCEDURE_DIGEST_DOMAIN)
    digest.update(manifest_bytes[:-1])
    digest.update(b"\n")
    digest.update(instruction_bytes)
    digest.update(b"\0")
    digest.update(pack_bytes[:-1])
    digest.update(b"\n")
    digest.update(inventory_json(entries, files))
    for entry in sorted(entries, key=lambda item: str(item["path"])):
        digest.update(b"\0")
        digest.update(files[str(entry["path"])])
    return f"sha256:{digest.hexdigest()}"


def render_packages(inputs: dict[str, Any]) -> dict[str, bytes]:
    documents = require_dict(inputs["memberDocuments"], "member documents")
    lifecycle = require_dict(
        documents["artifact-lifecycle-contract-v1.3.1.json"], "lifecycle"
    )
    registry = require_dict(
        documents["validator-registry-v1.3.1.json"], "validator registry"
    )
    binding_matrix = require_dict(
        documents["validator-binding-matrix-v1.3.1.json"], "binding matrix"
    )
    closure = require_dict(
        documents["closure-contract-v1.3.1.json"], "closure contract"
    )
    mappings = mapping_rows(lifecycle)
    closure_by_family = closure_specs(closure)
    validators = safe_validator_descriptors(registry)
    all_artifacts = [
        require_dict(row, "artifact row")
        for row in require_list(lifecycle["artifacts"], "artifacts")
    ]
    candidate = require_dict(inputs["candidate"], "semantic candidate")
    source_members = require_list(candidate["members"], "source members")
    rendered: dict[str, bytes] = {}

    for procedure_id in FAMILIES:
        mapping = mappings[procedure_id]
        family = mapping["artifactFamily"]
        rows = (
            [row for row in all_artifacts if artifact_family(row) == family]
            if isinstance(family, str)
            else []
        )
        bindings = selected_bindings(
            procedure_id, mapping, lifecycle, binding_matrix
        )
        contracts: list[dict[str, Any]] = []
        for row in rows:
            producer = dimension_value(row, "producer")
            consumers = dimension_value(row, "consumers")
            terminal = dimension_value(row, "terminalApplicability")
            media_type = dimension_value(row, "mediaType")
            cardinality = dimension_value(row, "cardinality")
            contracts.append(
                {
                    "id": public_identity(row),
                    "version": "1",
                    "pathPattern": public_identity(row),
                    "mediaType": media_type,
                    "requiredness": "required",
                    "cardinality": cardinality,
                    "producer": producer.get("authority", "worker-proposal-only")
                    if isinstance(producer, dict)
                    else producer,
                    "consumers": consumers,
                    "terminalApplicability": terminal,
                    "validatorIds": validator_binding_ids(row),
                }
            )

        artifact_contract = {
            "schemaVersion": 1,
            "procedureId": procedure_id,
            "procedureVersion": PROCEDURE_VERSION,
            "contractVersion": CONTRACT_VERSION,
            "acceptedA133Commit": A133_COMMIT,
            "mapping": mapping,
            "checkpoints": [public_identity(row) for row in rows],
            "contracts": contracts,
        }
        lifecycle_document = {
            "schemaVersion": 1,
            "procedureId": procedure_id,
            "procedureVersion": PROCEDURE_VERSION,
            "mapping": mapping,
            "rowCount": len(rows),
            "rows": rows,
        }
        bindings_document = {
            "schemaVersion": 1,
            "procedureId": procedure_id,
            "procedureVersion": PROCEDURE_VERSION,
            "capabilityId": mapping["capabilityId"],
            "mappingDisposition": mapping["disposition"],
            "bindingCount": len(bindings),
            "bindings": bindings,
        }
        validators_document = {
            "schemaVersion": 1,
            "procedureVersion": PROCEDURE_VERSION,
            "methodologyContractVersion": CONTRACT_VERSION,
            "methodologyContractDigest": CONTRACT_DIGEST,
            "descriptorOnly": True,
            "executableValidatorBodiesIncluded": False,
            "unknownValidatorDisposition": "critical-fail-closed",
            "validatorCount": len(validators),
            "validators": validators,
        }

        if procedure_id in CLOSURE_PROCEDURES:
            closure_family = CLOSURE_PROCEDURES[procedure_id]
            closure_spec = closure_by_family[closure_family]
            closure_relative = str(closure_spec["exactPath"]).replace(
                "methodology/", "", 1
            )
            closure_document = {
                "schemaVersion": 1,
                "family": closure_family,
                "selected": {
                    "value": True,
                    "evidenceArtifactIds": [
                        "art_00000000-0000-4000-8000-000000000000"
                    ],
                },
                "blocked": {"value": False, "evidenceArtifactIds": []},
            }
            closure_disposition = {
                "kind": "required",
                "family": closure_family,
                "closureContractId": closure_spec["closureContractId"],
                "exactPath": closure_spec["exactPath"],
                "mediaType": closure_spec["mediaType"],
                "validatorBindingIds": closure_spec["validatorBindingIds"],
            }
        else:
            closure_relative = "closure/disposition.json"
            closure_document = {
                "schemaVersion": 1,
                "kind": "notApplicable",
                "procedureId": procedure_id,
                "code": CLOSURE_NOT_APPLICABLE_CODES[procedure_id],
                "rationale": CLOSURE_NOT_APPLICABLE_RATIONALE,
            }
            closure_disposition = {
                "kind": "notApplicable",
                "code": CLOSURE_NOT_APPLICABLE_CODES[procedure_id],
                "rationale": CLOSURE_NOT_APPLICABLE_RATIONALE,
            }

        support_files: dict[str, bytes] = {
            "artifacts/artifact-contract.json": canonical_json(artifact_contract),
            "bindings/bindings.json": canonical_json(bindings_document),
            closure_relative: canonical_json(closure_document),
            "instructions/checkpoints.md": source_checkpoints(procedure_id),
            "lifecycle/lifecycle-rows.json": canonical_json(lifecycle_document),
            "validators/validators.json": canonical_json(validators_document),
        }
        visibility = {
            "artifacts/artifact-contract.json": "worker-visible",
            "bindings/bindings.json": "root-only",
            closure_relative: "worker-visible",
            "instructions/checkpoints.md": "worker-visible",
            "lifecycle/lifecycle-rows.json": "root-only",
            "validators/validators.json": "worker-visible",
        }
        roles = {
            "artifacts/artifact-contract.json": "artifacts",
            "bindings/bindings.json": "other",
            closure_relative: "artifacts"
            if procedure_id in CLOSURE_PROCEDURES
            else "other",
            "instructions/checkpoints.md": "instructions",
            "lifecycle/lifecycle-rows.json": "other",
            "validators/validators.json": "validators",
        }
        media_types = {
            path: "text/markdown" if path.endswith(".md") else "application/json"
            for path in support_files
        }
        worker_visible_without_contract = sorted(
            path for path, value in visibility.items() if value == "worker-visible"
        )
        root_only_without_contract = sorted(
            path for path, value in visibility.items() if value == "root-only"
        )
        package_contract = {
            "schemaVersion": 1,
            "kind": "trellis-procedure-2.0.7-package-contract",
            "procedureId": procedure_id,
            "procedureVersion": PROCEDURE_VERSION,
            "capabilityId": mapping["capabilityId"],
            "methodologyContractVersion": CONTRACT_VERSION,
            "acceptedContractDigest": CONTRACT_DIGEST,
            "candidateManifestSha256": CANDIDATE_MANIFEST_SHA256,
            "acceptedMemberAggregateSha256": MEMBER_AGGREGATE,
            "completeOutputSetDigest": COMPLETE_OUTPUT_SET_DIGEST,
            "acceptedA133": {"commit": A133_COMMIT, "tree": A133_TREE},
            "sourceMembers": source_members,
            "mapping": mapping,
            "closureDisposition": closure_disposition,
            "supportInventory": {
                "workerVisible": worker_visible_without_contract,
                "rootOnly": [*root_only_without_contract, "package-contract.json"],
                "discoveryAuthorized": False,
                "complete": True,
            },
            "validatorDescriptorsExecutable": False,
            "authorityFlags": {
                "activationAuthorized": False,
                "releaseAuthorized": False,
                "publicationAuthorized": False,
                "pushAuthorized": False,
                "workerAuthorityChangeAuthorized": False,
            },
            "workerAuthority": "proposal-only",
            "rootAuthority": ["validation", "recording", "decision", "publication"],
            "liveSelection": LIVE_SELECTION,
            "dormant": True,
            "noFallbackTo": "2.0.6",
        }
        support_files["package-contract.json"] = canonical_json(package_contract)
        visibility["package-contract.json"] = "root-only"
        roles["package-contract.json"] = "other"
        media_types["package-contract.json"] = "application/json"

        entries = [
            support_entry(
                path,
                roles[path],
                media_types[path],
                visibility[path],
                procedure_id,
                support_files[path],
            )
            for path in sorted(support_files)
        ]
        pack = {
            "schemaVersion": 1,
            "procedureId": procedure_id,
            "procedureVersion": PROCEDURE_VERSION,
            "methodologyContractVersion": CONTRACT_VERSION,
            "methodologyContractDigest": CONTRACT_DIGEST,
            "entries": entries,
        }
        pack_bytes = ordered_json(pack)
        manifest_bytes = ordered_json(source_manifest(procedure_id))
        instruction_bytes = procedure_markdown(
            procedure_id,
            mapping,
            sorted(
                path
                for path, value in visibility.items()
                if value == "worker-visible"
            ),
        )
        inventory_bytes = inventory_json(entries, support_files)
        digest_document = {
            "schemaVersion": 1,
            "procedureId": procedure_id,
            "procedureVersion": PROCEDURE_VERSION,
            "procedureDigest": procedure_digest(
                manifest_bytes,
                instruction_bytes,
                pack_bytes,
                entries,
                support_files,
            ),
            "packJsonSha256": sha256_prefixed(pack_bytes),
            "inventoryDigest": sha256_prefixed(inventory_bytes),
        }

        root = (
            "packages/cli/src/templates/research/procedures/"
            f"{procedure_id}/{PROCEDURE_VERSION}"
        )
        rendered[f"{root}/PROCEDURE.md"] = instruction_bytes
        rendered[f"{root}/procedure.json"] = manifest_bytes
        for relative, data in support_files.items():
            rendered[f"{root}/methodology/{relative}"] = data
        rendered[f"{root}/methodology/pack.json"] = pack_bytes
        rendered[f"{root}/methodology/pack.json.sha256"] = (
            f"{sha256_hex(pack_bytes)}\n".encode("ascii")
        )
        rendered[f"{root}/methodology/digests.json"] = canonical_json(
            digest_document
        )

        package_paths = [path for path in rendered if path.startswith(f"{root}/")]
        if len(package_paths) != 12:
            raise ValueError(f"{procedure_id} rendered {len(package_paths)} files")
    return rendered


def package_records(rendered: dict[str, bytes]) -> list[dict[str, Any]]:
    return [
        {
            "path": path,
            "byteLength": len(rendered[path]),
            "sha256": sha256_hex(rendered[path]),
        }
        for path in sorted(rendered)
    ]


def package_set_digest(rendered: dict[str, bytes]) -> str:
    digest = hashlib.sha256()
    digest.update(PACKAGE_DIGEST_DOMAIN)
    for path in sorted(rendered):
        digest.update(path.encode("utf-8"))
        digest.update(b"\0")
        digest.update(rendered[path])
        digest.update(b"\0")
    return f"sha256:{digest.hexdigest()}"


def local_file_record(path: str) -> dict[str, Any]:
    data = (REPO / path).read_bytes()
    return {"path": path, "byteLength": len(data), "sha256": sha256_hex(data)}


def render_evidence(
    inputs: dict[str, Any],
    rendered: dict[str, bytes],
    collision: dict[str, Any],
    historical: dict[str, Any],
    t3_paths: tuple[str, ...],
) -> dict[str, bytes]:
    candidate = require_dict(inputs["candidate"], "semantic candidate")
    package_digest = package_set_digest(rendered)
    records = package_records(rendered)
    expected_package_paths = sorted(
        path
        for path in t3_paths
        if "/2.0.7/" in path
        and path.startswith("packages/cli/src/templates/research/procedures/")
    )
    if sorted(rendered) != expected_package_paths:
        missing = sorted(set(expected_package_paths) - set(rendered))
        extra = sorted(set(rendered) - set(expected_package_paths))
        raise ValueError(f"rendered package inventory mismatch missing={missing} extra={extra}")
    if len(rendered) != 204:
        raise ValueError("rendered package count must be 204")
    first_render_digest = package_digest
    second_render_digest = package_set_digest(render_packages(inputs))
    if first_render_digest != second_render_digest:
        raise ValueError("in-memory deterministic regeneration mismatch")

    projection = {
        "schemaVersion": 1,
        "recordKind": "t3-projection-input-attestation",
        "stage": "T3",
        "predecessor": {"commit": PREDECESSOR_COMMIT, "tree": PREDECESSOR_TREE},
        "semanticCandidate": {
            "contractIdentity": CONTRACT_VERSION,
            "commit": A133_COMMIT,
            "tree": A133_TREE,
            "candidateManifestSha256": CANDIDATE_MANIFEST_SHA256,
            "sevenMemberAggregate": MEMBER_AGGREGATE,
            "semanticDigest": CONTRACT_DIGEST,
            "completeOutputSetDigest": COMPLETE_OUTPUT_SET_DIGEST,
            "members": candidate["members"],
        },
        "machineAssurance": {
            "commit": B133_COMMIT,
            "tree": B133_TREE,
            "verdict": "pass",
            "findingCount": 0,
            "humanReviewed": False,
            "humanEquivalent": False,
        },
        "operatorAcceptance": {
            "commit": O133_COMMIT,
            "tree": O133_TREE,
            "decision": "accept-with-rationale",
            "semanticUseOnly": True,
        },
        "technicalInterfaces": {"T1": inputs["t1"], "T2": inputs["t2"]},
        "mutableWorktreeSemanticInputUsed": False,
        "verdict": "authenticated",
    }
    version_recheck = {
        "schemaVersion": 1,
        "recordKind": "t3-procedure-version-recheck",
        "stage": "T3",
        **collision,
        "historyCommand": [
            "git",
            "log",
            PREDECESSOR_COMMIT,
            "--format=",
            "--name-only",
            "--",
            "packages/cli/src/templates/research/procedures",
        ],
        "predecessor": {"commit": PREDECESSOR_COMMIT, "tree": PREDECESSOR_TREE},
        "verdict": "collision-free",
    }
    package_inventory = {
        "schemaVersion": 1,
        "recordKind": "t3-package-inventory",
        "stage": "T3",
        "procedureVersion": PROCEDURE_VERSION,
        "familyCount": len(FAMILIES),
        "filesPerFamily": 12,
        "packageFileCount": len(records),
        "families": list(FAMILIES),
        "packageSetDigest": package_digest,
        "files": records,
        "extraPackagePaths": [],
        "missingPackagePaths": [],
        "verdict": "exact",
    }
    generator_path = "packages/cli/scripts/research-methodology-207-generate.py"
    test_path = "packages/cli/test/commands/research-procedure-207-packages.test.ts"
    generation = {
        "schemaVersion": 1,
        "recordKind": "t3-generation-evidence-ledger",
        "stage": "T3",
        "generator": local_file_record(generator_path),
        "packageTest": local_file_record(test_path),
        "packageSetDigest": package_digest,
        "secondInMemoryRenderDigest": second_render_digest,
        "byteIdenticalRegeneration": True,
        "python": {
            "minimumVersion": "3.9",
            "standardLibraryOnly": True,
            "bytecodeDisabledForAuthorizedRuns": True,
        },
        "generatedPackageFiles": len(records),
        "verdict": "deterministic",
    }
    historical_record = {
        "schemaVersion": 1,
        "recordKind": "t3-historical-procedure-audit",
        "stage": "T3",
        **historical,
        "verdict": "preserved",
    }
    package_verification = {
        "schemaVersion": 1,
        "recordKind": "t3-package-verification",
        "stage": "T3",
        "procedureVersion": PROCEDURE_VERSION,
        "assertions": [
            "immutable-predecessor-and-A133-git-objects-authenticated",
            "exact-seventeen-family-mapping-resolved",
            "exact-204-package-file-inventory-rendered",
            "exact-twelve-files-per-family",
            "support-pack-paths-unique-sorted-and-byte-authenticated",
            "worker-visible-support-inventory-explicit-and-complete",
            "validator-descriptors-contain-no-executable-bodies",
            "proposal-only-worker-and-root-authority-boundaries-preserved",
            "all-packages-dormant-and-live-selection-1.0.0",
            "historical-procedure-bytes-match-predecessor",
            "byte-identical-in-memory-regeneration",
        ],
        "assertionCount": 11,
        "packageSetDigest": package_digest,
        "historicalContentAggregateSha256": historical[
            "overallContentAggregateSha256"
        ],
        "t3InventoryCount": len(t3_paths),
        "packageFileCount": len(rendered),
        "liveSelection": LIVE_SELECTION,
        "dormant": True,
        "verdict": "pass",
    }
    evidence_values = {
        "projection-input-attestation.json": projection,
        "procedure-version-recheck.json": version_recheck,
        "package-inventory.json": package_inventory,
        "generation-evidence-ledger.json": generation,
        "historical-procedure-audit.json": historical_record,
        "package-verification.json": package_verification,
    }
    return {
        f".trellis/tasks/08-12-project-procedure-2-0-7-family-packages/research/{name}": canonical_json(
            evidence_values[name]
        )
        for name in EVIDENCE_NAMES
    }


def verify_closed_inventory(
    t3_paths: tuple[str, ...], package_outputs: dict[str, bytes]
) -> None:
    expected = set(t3_paths)
    package_actual: set[str] = set()
    for family in FAMILIES:
        root = PROCEDURE_ROOT / family / PROCEDURE_VERSION
        if not root.is_dir():
            continue
        for path in root.rglob("*"):
            if path.is_file():
                package_actual.add(path.relative_to(REPO).as_posix())
    expected_package = {path for path in expected if "/2.0.7/" in path}
    if package_actual != expected_package:
        missing = sorted(expected_package - package_actual)
        extra = sorted(package_actual - expected_package)
        raise ValueError(f"on-disk package inventory mismatch missing={missing} extra={extra}")
    if set(package_outputs) != expected_package:
        raise ValueError("rendered package paths do not equal frozen inventory")
    for path in t3_paths:
        if not (REPO / path).is_file():
            raise ValueError(f"frozen T3 output missing: {path}")


def write_outputs(outputs: dict[str, bytes]) -> None:
    for path, data in outputs.items():
        target = REPO / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)


def verify_outputs(outputs: dict[str, bytes]) -> None:
    for path, expected in outputs.items():
        target = REPO / path
        if not target.is_file():
            raise ValueError(f"generated output missing: {path}")
        actual = target.read_bytes()
        if actual != expected:
            raise ValueError(f"generated output drift: {path}")


def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--write", action="store_true")
    mode.add_argument("--verify", action="store_true")
    args = parser.parse_args()

    if os.environ.get("PYTHONDONTWRITEBYTECODE") != "1":
        raise ValueError("PYTHONDONTWRITEBYTECODE=1 is required")
    t3_paths = expected_t3_paths()
    inputs = authenticate_inputs()
    collision = collision_recheck()
    historical = historical_audit()
    packages = render_packages(inputs)

    if args.write:
        write_outputs(packages)
    else:
        verify_outputs(packages)

    evidence = render_evidence(inputs, packages, collision, historical, t3_paths)
    if args.write:
        write_outputs(evidence)
    else:
        verify_outputs(evidence)
    verify_closed_inventory(t3_paths, packages)

    result = {
        "familyCount": len(FAMILIES),
        "packageFileCount": len(packages),
        "evidenceFileCount": len(evidence),
        "t3InventoryCount": len(t3_paths),
        "packageSetDigest": package_set_digest(packages),
        "mode": "write" if args.write else "verify",
        "verdict": "pass",
    }
    sys.stdout.buffer.write(canonical_json(result))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(
            json.dumps(
                {"error": str(error), "verdict": "fail"},
                sort_keys=True,
                separators=(",", ":"),
            ),
            file=sys.stderr,
        )
        raise
