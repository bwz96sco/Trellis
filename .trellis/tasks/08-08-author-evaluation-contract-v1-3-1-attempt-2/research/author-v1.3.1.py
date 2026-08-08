#!/usr/bin/env python3
"""Deterministically author and verify evaluation-contract-v1.3.1 attempt 2."""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import re
import subprocess
import sys
import tempfile
from copy import deepcopy
from pathlib import Path
from typing import Any

REPO = Path(__file__).resolve().parents[4]
RESEARCH = Path(__file__).resolve().parent
A1320_COMMIT = "17cd058c47f73cbb85605a94aecdb81f40c09a3e"
A1320_TREE = "b15b229ec9d7cddafab15793c5dc6704526ab5b6"
G132_COMMIT = "9bb7ae65bc8118ce4e6d79b87dd0c952481fdf57"
G131_COMMIT = "15de62625685c32f00edf9aef8f2c1cf5a05d7bb"
A11_COMMIT = "3534529a36a10ea8015a51f71a93e2b78300a563"
ACCEPTED_COMMIT = "916be0a877725f7f91836a3a97e480c1e104e533"
PROCEDURE_COMMIT = "0afef5adaea2a58c8c6cc5a3f1a51a054fa1a39d"
ASSIGNMENT_PATH = (
    ".trellis/tasks/08-08-author-evaluation-contract-v1-3-1-attempt-2/"
    "research/a132-0-author-assignment-and-input-authorization.json"
)
OUTPUT_ROOT = (
    ".trellis/tasks/08-08-author-evaluation-contract-v1-3-1-attempt-2/research"
)
BASE_ROOT = ".trellis/tasks/08-04-author-evaluation-contract-v1-3-attempt-3/research"
G131_ALLOWLIST = (
    ".trellis/tasks/08-08-correct-evaluation-contract-v1-3-1-semantic-defects/"
    "research/g131-correction-and-propagation-allowlist.json"
)
G132_ROOT = (
    ".trellis/tasks/08-08-correct-evaluation-contract-v1-3-1-semantic-defects-attempt-2/"
    "research"
)
G132_SUPERSESSION = f"{G132_ROOT}/g132-g131-finding-004-supersession.json"

LEAF_TRANSITIONS = (
    ("durable-output-disposition-v1.3.json", "durable-output-disposition-v1.3.1.json"),
    ("artifact-lifecycle-contract-v1.3.json", "artifact-lifecycle-contract-v1.3.1.json"),
    ("validator-registry-v1.3.json", "validator-registry-v1.3.1.json"),
    ("validator-binding-matrix-v1.3.json", "validator-binding-matrix-v1.3.1.json"),
    ("differential-test-matrix-v1.3.json", "differential-test-matrix-v1.3.1.json"),
    ("derivability-provenance-matrix-v1.3.json", "derivability-provenance-matrix-v1.3.1.json"),
    ("closure-contract-v1.3.json", "closure-contract-v1.3.1.json"),
)
LEAF_NAMES = tuple(new for _, new in LEAF_TRANSITIONS)
EVIDENCE_NAMES = (
    "contract-candidate-manifest-v1.3.1.json",
    "frozen-semantic-target-v1.3.1.json",
    "four-finding-correction-ledger-v1.3.1.json",
    "semantic-diff-ledger-v1.3.0-to-v1.3.1.json",
    "assurance-corpus-v1.3.1.json",
    "author-validation.json",
)
SCRIPT_NAME = "author-v1.3.1.py"
OUTPUT_MANIFEST_NAME = "author-output-manifest-v1.3.1.json"
OUTPUT_NAMES = LEAF_NAMES + EVIDENCE_NAMES + (SCRIPT_NAME, OUTPUT_MANIFEST_NAME)
ABSENT = {"$trellisAbsent": True}
VALUE_DIGEST_DOMAIN = b"trellis-g131-json-value-v1\0"
MEMBER_AGGREGATE_DOMAIN = b"trellis-accepted-v13-pack-members\0"
REPORT_DIGEST_DOMAIN = b"trellis-evaluation-report-v2\0"


class AuthoringError(RuntimeError):
    """Raised when immutable authority or generated evidence fails closed."""


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def canonical_value(value: Any) -> bytes:
    return json.dumps(
        value, ensure_ascii=False, sort_keys=True, separators=(",", ":")
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


def verify_record(commit: str, record: dict[str, Any]) -> bytes:
    data = object_bytes(commit, record["path"])
    if len(data) != record["byteLength"]:
        raise AuthoringError(f"byte length mismatch: {record['path']}")
    if sha256(data) != record["sha256"]:
        raise AuthoringError(f"SHA-256 mismatch: {record['path']}")
    blob_oid = git_text("rev-parse", f"{commit}:{record['path']}").strip()
    if blob_oid != record["blobOid"]:
        raise AuthoringError(f"blob OID mismatch: {record['path']}")
    if record["path"].endswith(".json"):
        strict_json(data)
    return data


def verify_tree(commit: str, expected: str) -> None:
    actual = git_text("rev-parse", f"{commit}^{{tree}}").strip()
    if actual != expected:
        raise AuthoringError(f"tree mismatch for {commit}: {actual}")


def authenticate_inputs(*, check_worktree: bool) -> dict[str, Any]:
    verify_tree(A1320_COMMIT, A1320_TREE)
    parent = git_text("show", "-s", "--format=%P", A1320_COMMIT).strip().split()
    if parent != [G132_COMMIT]:
        raise AuthoringError("A132-0 parent mismatch")
    assignment_bytes = object_bytes(A1320_COMMIT, ASSIGNMENT_PATH)
    assignment = strict_json(assignment_bytes, canonical_required=True)
    expected_identity = {
        "agentId": "a132-author-sol-01",
        "assignedRole": "evaluation-contract-v1.3.1-attempt-2-contract-author",
        "assignmentId": "a132-0-author-assignment-20260808-a",
        "assignmentTimestamp": "2026-08-08T11:34:01Z",
        "modelClass": "gpt-5.6-sol",
        "runtimeClass": "claude-agent-sdk",
        "sessionId": "a132-author-sol-session-01",
        "status": "assigned-for-a132-1-after-committed-a132-0",
    }
    if assignment["assignment"] != expected_identity:
        raise AuthoringError("author identity mismatch")
    if assignment["authority"]["taskExecutionAuthorized"] is not True:
        raise AuthoringError("A132-1 execution is not authorized")
    if assignment["authorizationBoundary"]["authorizedBoundary"] != "A132-1":
        raise AuthoringError("authorization boundary mismatch")

    exact_inputs = assignment["exactInputs"]
    for key in ("a11", "a1310", "g131"):
        section = exact_inputs[key]
        verify_tree(section["commit"], section["tree"])
        for record in section["records"]:
            verify_record(section["commit"], record)

    accepted = exact_inputs["acceptedContract"]
    verify_tree(accepted["acceptedSubjectCommit"], accepted["acceptedSubjectTree"])
    for record in accepted["members"]:
        verify_record(accepted["acceptedSubjectCommit"], record)

    procedure = exact_inputs["procedure206"]
    verify_tree(procedure["commit"], procedure["tree"])
    for record in procedure["projections"] + [procedure["closureEvidence"]]:
        verify_record(procedure["commit"], record)

    g132 = exact_inputs["g132"]
    verify_tree(g132["commit"], g132["tree"])
    first_parent = git_text("show", "-s", "--format=%P", g132["commit"]).strip().split()[0]
    if first_parent != g132["firstParent"]:
        raise AuthoringError("G132 first-parent mismatch")
    governance_bytes: dict[str, bytes] = {}
    for record in g132["governanceRecords"]:
        data = verify_record(g132["commit"], record)
        governance_bytes[record["path"]] = data
        if record["path"].endswith(".json"):
            strict_json(data, canonical_required=True)
    for record in g132["authorPlanningContext"]:
        verify_record(g132["commit"], record)

    aggregate = hashlib.sha256()
    aggregate.update(b"trellis-g132-governance-records-v1\0")
    for record in g132["governanceRecords"]:
        aggregate.update(record["path"].encode("utf-8"))
        aggregate.update(b"\0")
        aggregate.update(governance_bytes[record["path"]])
        aggregate.update(b"\0")
    if f"sha256:{aggregate.hexdigest()}" != g132["governanceAggregate"]["digest"]:
        raise AuthoringError("G132 governance aggregate mismatch")
    if g132["validationVerdict"] != "pass":
        raise AuthoringError("G132 validation verdict is not pass")

    supersession = object_json(G132_COMMIT, G132_SUPERSESSION, canonical_required=True)
    semantic_digests = assignment["mappingAuthorization"]["semanticDigests"]
    for field in ("mappingRows", "replacementRowSchema", "projectionEvidence"):
        digest = f"sha256:{sha256(canonical_value(supersession[field]))}"
        if digest != semantic_digests[field]:
            raise AuthoringError(f"G132 semantic digest mismatch: {field}")
    output_paths = assignment["outputAuthorization"]["exactOutputPaths"]
    output_digest = f"sha256:{sha256(canonical_value(output_paths))}"
    if output_digest != semantic_digests["outputPaths"]:
        raise AuthoringError("A132-1 output-path digest mismatch")
    expected_paths = [f"{OUTPUT_ROOT}/{name}" for name in OUTPUT_NAMES]
    if output_paths != expected_paths or len(output_paths) != 15:
        raise AuthoringError("A132-1 exact output inventory mismatch")

    rows = supersession["mappingRows"]
    if len(rows) != 17 or len({(r["procedureId"], r["capabilityId"]) for r in rows}) != 17:
        raise AuthoringError("G132 mapping identity population mismatch")
    if sum(row["disposition"] == "applicable" for row in rows) != 13:
        raise AuthoringError("G132 applicable-row partition mismatch")
    if sum(row["disposition"] == "notApplicable" for row in rows) != 4:
        raise AuthoringError("G132 not-applicable-row partition mismatch")

    if check_worktree:
        head = git_text("rev-parse", "HEAD").strip()
        if head != A1320_COMMIT:
            raise AuthoringError("write/working-tree verification requires HEAD at A132-0")
        if git_text("diff", "--cached", "--name-only").strip():
            raise AuthoringError("staged set must remain empty")
        for record in assignment["protectedBaseline"]["files"]:
            data = (REPO / record["path"]).read_bytes()
            if len(data) != record["byteLength"] or sha256(data) != record["sha256"]:
                raise AuthoringError(f"protected inherited file drift: {record['path']}")
        for record in assignment["protectedBaseline"]["submodules"]:
            submodule = REPO / record["path"]
            actual_commit = subprocess.run(
                ["git", "-c", "i18n.logOutputEncoding=UTF-8", "rev-parse", "HEAD"],
                cwd=submodule,
                check=True,
                stdout=subprocess.PIPE,
                text=True,
                encoding="utf-8",
                errors="strict",
            ).stdout.strip()
            actual_status = subprocess.run(
                ["git", "-c", "i18n.logOutputEncoding=UTF-8", "status", "--short"],
                cwd=submodule,
                check=True,
                stdout=subprocess.PIPE,
                text=True,
                encoding="utf-8",
                errors="strict",
            ).stdout.splitlines()
            if actual_commit != record["commit"] or actual_status != record["statusShort"]:
                raise AuthoringError(f"protected submodule drift: {record['path']}")
        untracked = assignment["protectedBaseline"]["untrackedCs5Decision"]
        untracked_data = (REPO / untracked["path"]).read_bytes()
        if len(untracked_data) != untracked["byteLength"] or sha256(untracked_data) != untracked["sha256"]:
            raise AuthoringError("protected CS5 record drift")
        allowed_inventory = {"a132-0-author-assignment-and-input-authorization.json", *OUTPUT_NAMES}
        unexpected_inventory = sorted(
            path.name
            for path in RESEARCH.iterdir()
            if path.name not in allowed_inventory or not path.is_file() or path.is_symlink()
        )
        if unexpected_inventory:
            raise AuthoringError(
                f"unexpected file, directory, cache, or symlink in A132 research directory: {unexpected_inventory}"
            )
        tracked_dirty = {
            path
            for path in git_text("diff", "--name-only", "HEAD").splitlines()
            if path
        }
        untracked_dirty = {
            path
            for path in git_text(
                "ls-files", "--others", "--exclude-standard"
            ).splitlines()
            if path
        }
        actual_dirty = tracked_dirty | untracked_dirty
        inherited_dirty = {
            *(record["path"] for record in assignment["protectedBaseline"]["files"]),
            *(record["path"] for record in assignment["protectedBaseline"]["submodules"]),
            assignment["protectedBaseline"]["untrackedCs5Decision"]["path"],
        }
        present_outputs = {
            f"{OUTPUT_ROOT}/{name}"
            for name in OUTPUT_NAMES
            if (RESEARCH / name).is_file()
        }
        expected_dirty = inherited_dirty | present_outputs
        if actual_dirty != expected_dirty:
            raise AuthoringError(
                "complete dirty-path mismatch: "
                f"extra={sorted(actual_dirty - expected_dirty)} "
                f"missing={sorted(expected_dirty - actual_dirty)}"
            )

    return {
        "assignment": assignment,
        "supersession": supersession,
        "mappingRowsDigest": semantic_digests["mappingRows"],
        "verifiedRecordCount": 41,
    }


def pointer_tokens(pointer: str) -> list[str]:
    if pointer == "":
        return []
    if not pointer.startswith("/"):
        raise AuthoringError(f"invalid JSON pointer: {pointer}")
    return [token.replace("~1", "/").replace("~0", "~") for token in pointer[1:].split("/")]


def pointer_get(document: Any, pointer: str) -> Any:
    node = document
    for token in pointer_tokens(pointer):
        if isinstance(node, list):
            node = node[int(token)]
        elif isinstance(node, dict):
            node = node[token]
        else:
            raise AuthoringError(f"pointer does not resolve: {pointer}")
    return node


def pointer_set(document: Any, pointer: str, value: Any) -> None:
    tokens = pointer_tokens(pointer)
    if not tokens:
        raise AuthoringError("root replacement is not allowed")
    node = document
    for token in tokens[:-1]:
        node = node[int(token)] if isinstance(node, list) else node[token]
    final = tokens[-1]
    if isinstance(node, list):
        node[int(final)] = value
    else:
        node[final] = value


def value_digest(value: Any) -> str:
    return f"sha256:{sha256(VALUE_DIGEST_DOMAIN + canonical_value(value))}"


def apply_propagation(leaves: dict[str, Any], allowlist: dict[str, Any]) -> None:
    for rule in allowlist["propagationRules"]:
        for match in rule["matches"]:
            leaf = leaves[match["leafPath"]]
            guard = match["oldNewGuard"]
            for pointer in match["pointerPaths"]:
                old = pointer_get(leaf, pointer)
                if guard["kind"] == "exact-value":
                    if old != guard["oldValue"]:
                        raise AuthoringError(f"propagation old-value mismatch: {pointer}")
                    new = guard["newValue"]
                elif guard["kind"] == "exact-prefix-replacement-preserve-suffix":
                    if not isinstance(old, str):
                        raise AuthoringError(f"prefix propagation requires string: {pointer}")
                    matches = [
                        transition
                        for transition in guard["transitions"]
                        if old.startswith(transition["oldPrefix"])
                    ]
                    if len(matches) != 1:
                        raise AuthoringError(f"prefix propagation mismatch: {pointer}")
                    transition = matches[0]
                    new = transition["newPrefix"] + old[len(transition["oldPrefix"]):]
                elif guard["kind"] == "finding-bound-record-ref":
                    if old not in guard["oldValues"]:
                        raise AuthoringError(f"finding-bound propagation mismatch: {pointer}")
                    new = guard["newValue"]
                else:
                    raise AuthoringError(f"unknown propagation guard: {guard['kind']}")
                pointer_set(leaf, pointer, new)


def closed_object(properties: dict[str, Any], required: list[str]) -> dict[str, Any]:
    return {
        "additionalProperties": False,
        "properties": properties,
        "required": required,
        "type": "object",
    }


def bounded_array(
    items: dict[str, Any], *, min_items: int, max_items: int, unique: bool = True
) -> dict[str, Any]:
    return {
        "items": items,
        "maxItems": max_items,
        "minItems": min_items,
        "type": "array",
        "uniqueItems": unique,
    }


def report_v2_schema(codomain: list[str]) -> dict[str, Any]:
    digest = {"pattern": "^sha256:[0-9a-f]{64}$", "type": "string"}
    hex_digest = {"pattern": "^[0-9a-f]{64}$", "type": "string"}
    nonempty = {"minLength": 1, "type": "string"}
    mapping_union = {
        "oneOf": [
            closed_object(
                {
                    "artifactFamily": {"enum": codomain},
                    "disposition": {"const": "applicable"},
                },
                ["artifactFamily", "disposition"],
            ),
            closed_object(
                {
                    "artifactFamily": {"type": "null"},
                    "disposition": {"const": "notApplicable"},
                },
                ["artifactFamily", "disposition"],
            ),
        ]
    }
    artifact_binding = closed_object(
        {
            "applicable": {"type": "boolean"},
            "artifactId": nonempty,
            "bindingId": {"pattern": "^binding-", "type": "string"},
            "mapping": mapping_union,
            "targetArtifactFamily": {"enum": codomain},
            "targetId": nonempty,
        },
        ["applicable", "artifactId", "bindingId", "mapping", "targetArtifactFamily", "targetId"],
    )
    closure_source = closed_object(
        {
            "digest": digest,
            "family": {"enum": ["research-literature", "research-quest", "research-computation", "research-experiment"]},
            "sourceId": nonempty,
        },
        ["digest", "family", "sourceId"],
    )
    validator_triple = closed_object(
        {
            "id": nonempty,
            "severity": {"enum": ["critical", "error", "warning"]},
            "version": nonempty,
        },
        ["id", "severity", "version"],
    )
    finding = closed_object(
        {
            "factPointer": {"pattern": "^/", "type": "string"},
            "stableError": {"pattern": "^V13_", "type": "string"},
            "targetId": nonempty,
            "validator": validator_triple,
        },
        ["factPointer", "stableError", "targetId", "validator"],
    )
    applicability = closed_object(
        {
            "applies": {"type": "boolean"},
            "bindingId": {"pattern": "^binding-", "type": "string"},
            "reason": {"enum": ["family-match", "mapping-not-applicable", "family-mismatch", "global", "closure"]},
        },
        ["applies", "bindingId", "reason"],
    )
    blocked_fact = closed_object(
        {
            "factPointer": {"pattern": "^/", "type": "string"},
            "reason": {"enum": ["missing", "unknown", "contradictory", "aliased", "ambiguous", "unauthenticated"]},
        },
        ["factPointer", "reason"],
    )
    properties = {
        "$schema": {"const": "https://json-schema.org/draft/2020-12/schema"},
        "activationId": {"pattern": "^act_", "type": "string"},
        "applicability": bounded_array(applicability, min_items=0, max_items=876),
        "approvalId": {"pattern": "^apr_", "type": "string"},
        "artifactBindings": bounded_array(artifact_binding, min_items=0, max_items=876),
        "blockedFacts": bounded_array(blocked_fact, min_items=0, max_items=876),
        "closureSources": bounded_array(closure_source, min_items=0, max_items=4),
        "dispatchId": {"pattern": "^dsp_", "type": "string"},
        "methodologyDigest": hex_digest,
        "methodologyIdentity": nonempty,
        "orderedFindings": bounded_array(finding, min_items=0, max_items=876),
        "orderedValidatorTriples": bounded_array(
            validator_triple, min_items=20, max_items=20
        ),
        "procedureDigest": digest,
        "procedureId": nonempty,
        "procedureVersion": nonempty,
        "questId": {"pattern": "^qst_", "type": "string"},
        "schemaVersion": {"const": 2},
        "supportInventoryDigest": digest,
        "zeroWriteDisposition": {"enum": ["validation-complete-before-write", "rejected-before-write", "validator-not-run-no-write"]},
    }
    return {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        **closed_object(properties, list(properties)),
    }


def predicate_operand(kind: str, value: Any) -> dict[str, Any]:
    return {"kind": kind, "value": value}


def predicate_node(operation: str, *operands: dict[str, Any]) -> dict[str, Any]:
    return {"op": operation, "operands": list(operands)}


def rule_fact_fields(rule_kind: str) -> tuple[str, str]:
    parts = re.split(r"[^A-Za-z0-9]+", rule_kind)
    prefix = parts[0] + "".join(part[:1].upper() + part[1:] for part in parts[1:])
    return f"{prefix}AuthorityCanonicalJson", f"{prefix}ObservedCanonicalJson"


def rule_authority_source(rule_kind: str) -> dict[str, Any]:
    if rule_kind.startswith("artifact."):
        dimension = rule_kind.split(".", 1)[1]
        return {
            "leafPath": "artifact-lifecycle-contract-v1.3.1.json",
            "selector": f"exact artifactId == binding.targetId, then /dimensions/{dimension}/value",
        }
    closure_selectors = {
        "closure.schema": "/families/{targetId}/closureArtifact/value/closedSchema",
        "closure.evidence": "/families/{targetId}/{selected,blocked}/value",
        "closure.xor": "/families/{targetId}/crossRelation/value",
        "closure.status-inference": "/genericResultStatusInference/value",
        "closure.worker-boundary": "/families/{targetId}/{preRecordReader,visibility,zeroWriteBoundary}/value",
    }
    if rule_kind in closure_selectors:
        return {
            "leafPath": "closure-contract-v1.3.1.json",
            "selector": closure_selectors[rule_kind],
        }
    global_sources = {
        "authority.worker-boundary": ("closure-contract-v1.3.1.json", "/rootDecisionBoundary/value"),
        "contract.blocked-output-kind": ("durable-output-disposition-v1.3.1.json", "/outputs/{targetId}"),
        "contract.candidate-authority": ("validator-binding-matrix-v1.3.1.json", "/bindings/{bindingId}"),
        "contract.canonical-bytes": ("validator-binding-matrix-v1.3.1.json", "/reportV2Contract/{byteRules,canonicalization,constructionProcedure,ordering}"),
        "contract.closure-applicability": ("closure-contract-v1.3.1.json", "/applicableFamilies"),
        "contract.compatibility": ("seven authenticated leaves", "/{contractVersion,schemaVersion}"),
        "contract.conditional-artifacts": ("closure-contract-v1.3.1.json", "/families/{applicability,closureArtifact}"),
        "contract.differential-domains": ("differential-test-matrix-v1.3.1.json", "/domains"),
        "contract.output-disposition": ("durable-output-disposition-v1.3.1.json", "/{allowedDispositions,outputs}"),
        "report.v2-binding": ("validator-binding-matrix-v1.3.1.json", "/reportV2Contract"),
        "validator.binding-integrity": ("validator-binding-matrix-v1.3.1.json", "/bindings/{bindingId}"),
    }
    leaf_path, selector = global_sources[rule_kind]
    return {"leafPath": leaf_path, "selector": selector}


def validator_fact_schema(rule_kinds: list[str], error_by_rule: dict[str, list[str]]) -> dict[str, Any]:
    common_properties = {
        "aliasesAbsent": {"type": "boolean"},
        "authorityComplete": {"type": "boolean"},
        "bindingId": {"pattern": "^binding-", "type": "string"},
        "contradictionFree": {"type": "boolean"},
        "expectedStableErrors": {
            "items": {"enum": sorted({error for errors in error_by_rule.values() for error in errors})},
            "minItems": 1,
            "type": "array",
        },
        "factState": {"enum": ["present", "missing", "unknown", "contradictory", "aliased", "ambiguous"]},
        "ruleKind": {"enum": rule_kinds},
        "targetId": {"minLength": 1, "type": "string"},
    }
    common_required = list(common_properties)
    properties = deepcopy(common_properties)
    rule_branches = []
    for rule_kind in rule_kinds:
        authority_field, observed_field = rule_fact_fields(rule_kind)
        value_properties = {
            authority_field: {"minLength": 1, "type": "string"},
            observed_field: {"minLength": 1, "type": "string"},
        }
        properties.update(value_properties)
        rule_branches.append(
            closed_object(
                {
                    **common_properties,
                    **value_properties,
                    "aliasesAbsent": {"const": True},
                    "authorityComplete": {"const": True},
                    "contradictionFree": {"const": True},
                    "expectedStableErrors": {"const": error_by_rule[rule_kind]},
                    "factState": {"const": "present"},
                    "ruleKind": {"const": rule_kind},
                },
                [*common_required, authority_field, observed_field],
            )
        )
    return {
        "additionalProperties": False,
        "oneOf": rule_branches,
        "properties": properties,
        "required": common_required,
        "type": "object",
    }


def binding_authority_value(binding: dict[str, Any], leaves: dict[str, Any]) -> Any:
    rule_kind = binding["ruleKind"]
    target_id = binding["targetId"]
    lifecycle = leaves["artifact-lifecycle-contract-v1.3.1.json"]
    artifact = next(
        (item for item in lifecycle["artifacts"] if item["artifactId"] == target_id),
        None,
    )
    if artifact is not None:
        dimension = rule_kind.split(".", 1)[1]
        return artifact["dimensions"][dimension]["value"]

    closure = leaves["closure-contract-v1.3.1.json"]
    family = next(
        (item for item in closure["families"] if item["familyId"] == target_id),
        None,
    )
    if rule_kind == "closure.status-inference":
        return closure["genericResultStatusInference"]["value"]
    if family is not None:
        if rule_kind == "closure.schema":
            return family["closureArtifact"]["value"]["closedSchema"]
        if rule_kind == "closure.evidence":
            return {
                "blocked": family["blocked"]["value"],
                "selected": family["selected"]["value"],
            }
        if rule_kind == "closure.xor":
            return family["crossRelation"]["value"]
        if rule_kind == "closure.worker-boundary":
            return {
                "preRecordReader": family["preRecordReader"]["value"],
                "visibility": family["visibility"]["value"],
                "zeroWriteBoundary": family["zeroWriteBoundary"]["value"],
            }

    binding_leaf = leaves["validator-binding-matrix-v1.3.1.json"]
    durable = leaves["durable-output-disposition-v1.3.1.json"]
    differential = leaves["differential-test-matrix-v1.3.1.json"]
    if rule_kind in {"validator.binding-integrity", "contract.candidate-authority"}:
        return binding
    if rule_kind == "report.v2-binding":
        return binding_leaf["reportV2Contract"]
    if rule_kind == "authority.worker-boundary":
        return closure["rootDecisionBoundary"]["value"]
    if rule_kind == "contract.output-disposition":
        return {
            "allowedDispositions": durable["allowedDispositions"],
            "outputs": durable["outputs"],
        }
    if rule_kind == "contract.blocked-output-kind":
        return next(item for item in durable["outputs"] if item["outputId"] == target_id)
    if rule_kind == "contract.closure-applicability":
        return closure["applicableFamilies"]
    if rule_kind == "contract.canonical-bytes":
        report = binding_leaf["reportV2Contract"]
        return {
            key: report[key]
            for key in ("byteRules", "canonicalization", "constructionProcedure", "ordering")
        }
    if rule_kind == "contract.compatibility":
        return {
            name: {
                "contractVersion": leaf["contractVersion"],
                "schemaVersion": leaf["schemaVersion"],
            }
            for name, leaf in sorted(leaves.items())
        }
    if rule_kind == "contract.differential-domains":
        return differential["domains"]
    if rule_kind == "contract.conditional-artifacts":
        return [
            {
                "applicability": item["applicability"]["value"],
                "closureArtifact": item["closureArtifact"]["value"],
            }
            for item in closure["families"]
        ]
    raise AuthoringError(f"missing rule-specific authority selector: {rule_kind}")


def add_report_correction(binding_leaf: dict[str, Any], codomain: list[str]) -> None:
    contract = binding_leaf["reportV2Contract"]
    contract["reportSchema"] = report_v2_schema(codomain)
    contract["byteRules"] = {
        "duplicateDecodedKeys": "reject",
        "encoding": "strict-utf8",
        "finalLfCount": 1,
        "nonFiniteNumbers": "reject",
        "unpairedSurrogates": "reject",
    }
    contract["nullability"] = {
        "default": "forbidden",
        "exceptions": ["artifactBindings[].mapping.artifactFamily only when disposition is notApplicable"],
    }
    contract["ordering"] = {
        "arrays": "preserve-schema-defined-input-order",
        "findings": ["validator.id", "validator.version", "targetId", "stableError", "factPointer"],
        "objects": "recursive-unicode-code-point-key-sort",
    }
    contract["constructionProcedure"] = {
        "digestInput": "canonical report JSON without final LF; digest is stored outside the report object",
        "language": "closed-json-schema-2020-12-and-canonical-json-v1",
        "unknownOrMissingFieldDisposition": "reject-before-digest-and-write",
    }


def error_map_for_validators(
    registry: dict[str, Any], binding_leaf: dict[str, Any]
) -> list[dict[str, list[str]]]:
    by_identity: dict[tuple[str, str], dict[str, list[str]]] = {}
    for binding in binding_leaf["bindings"]:
        key = (binding["validator"]["id"], binding["validator"]["version"])
        rule_map = by_identity.setdefault(key, {})
        errors = binding["stableErrors"]
        previous = rule_map.setdefault(binding["ruleKind"], errors)
        if previous != errors:
            raise AuthoringError("non-deterministic stable-error binding")
    result = []
    for validator in registry["validators"]:
        identity = validator["identity"]["value"]
        key = (identity["id"], identity["version"])
        rule_map = by_identity.get(key, {})
        if set(rule_map) != set(validator["applicableRuleKinds"]["value"]):
            raise AuthoringError(f"validator rule-kind binding mismatch: {identity['id']}")
        result.append(rule_map)
    return result


def add_validator_corrections(
    registry: dict[str, Any],
    binding_leaf: dict[str, Any],
    codomain: list[str],
    row_schema: dict[str, Any],
    mapping_digest: str,
) -> None:
    error_maps = error_map_for_validators(registry, binding_leaf)
    lifecycle_context_schema = closed_object(
        {
            "applicabilityDecision": {"type": "boolean"},
            "mappingDigest": {"const": mapping_digest},
            "mappingRow": row_schema,
            "targetArtifactFamily": {"enum": codomain},
        },
        ["applicabilityDecision", "mappingDigest", "mappingRow", "targetArtifactFamily"],
    )
    for index, validator in enumerate(registry["validators"]):
        rule_kinds = validator["applicableRuleKinds"]["value"]
        error_by_rule = error_maps[index]
        schema = validator["inputFactSchema"]["value"]
        schema["properties"]["facts"] = validator_fact_schema(rule_kinds, error_by_rule)
        schema["properties"]["authoritySnapshot"]["properties"][
            "lifecycleApplicabilityContext"
        ] = lifecycle_context_schema
        validator["factDerivationSources"] = {
            "binding": {
                "lookup": ["ruleId", "targetId", "validator.id", "validator.version"],
                "source": "validator-binding-matrix-v1.3.1.json#/bindings",
                "uniqueness": "exactly-one",
            },
            "canonicalJson": {
                "encoding": "strict-utf8",
                "framing": "canonical compact JSON value without final LF",
                "objectKeyOrder": "recursive-unicode-code-point",
                "arrayOrder": "preserved",
            },
            "ruleSpecificCanonicalValues": {
                rule_kind: {
                    "authorityFact": rule_fact_fields(rule_kind)[0],
                    "authoritySource": rule_authority_source(rule_kind),
                    "observedFact": rule_fact_fields(rule_kind)[1],
                    "observedSource": "the authenticated invocation value selected by the same exact rule and target selector",
                }
                for rule_kind in rule_kinds
            },
            "unknownMissingDuplicateAliasedConflicting": "factState is not present and validation fails closed before write",
        }
        base_applicability = predicate_node(
            "in-set",
            predicate_operand("exact-json-pointer", "/facts/ruleKind"),
            predicate_operand("literal", rule_kinds),
        )
        if index <= 11:
            applicability = {
                "language": "trellis-predicate-v1",
                "predicate": {
                    "op": "all",
                    "operands": [
                        base_applicability,
                        predicate_node(
                            "exists",
                            predicate_operand("exact-json-pointer", "/authoritySnapshot/lifecycleApplicabilityContext"),
                        ),
                        predicate_node(
                            "equals",
                            predicate_operand("exact-json-pointer", "/authoritySnapshot/lifecycleApplicabilityContext/applicabilityDecision"),
                            predicate_operand("literal", True),
                        ),
                    ],
                },
            }
        else:
            applicability = {"language": "trellis-predicate-v1", "predicate": base_applicability}
        validator["applicability"] = applicability
        rule_predicates = []
        for rule_kind in rule_kinds:
            authority_field, observed_field = rule_fact_fields(rule_kind)
            rule_predicates.append(
                predicate_node(
                    "all",
                    predicate_node(
                        "equals",
                        predicate_operand("exact-json-pointer", "/facts/ruleKind"),
                        predicate_operand("literal", rule_kind),
                    ),
                    predicate_node(
                        "equals",
                        predicate_operand("exact-json-pointer", f"/facts/{authority_field}"),
                        predicate_operand("exact-json-pointer", f"/facts/{observed_field}"),
                    ),
                )
            )
        validator["predicate"] = {
            "language": "trellis-predicate-v1",
            "predicate": {
                "op": "all",
                "operands": [
                    predicate_node("equals", predicate_operand("exact-json-pointer", "/facts/factState"), predicate_operand("literal", "present")),
                    predicate_node("equals", predicate_operand("exact-json-pointer", "/facts/authorityComplete"), predicate_operand("literal", True)),
                    predicate_node("equals", predicate_operand("exact-json-pointer", "/facts/aliasesAbsent"), predicate_operand("literal", True)),
                    predicate_node("equals", predicate_operand("exact-json-pointer", "/facts/contradictionFree"), predicate_operand("literal", True)),
                    predicate_node("equals", predicate_operand("exact-json-pointer", "/targetId"), predicate_operand("exact-json-pointer", "/facts/targetId")),
                    predicate_node("any", *rule_predicates),
                ],
            },
        }
        validator["decisionTable"] = [
            {
                "applicableWhen": {"ruleKind": rule_kind},
                "failWhen": "predicate-is-false",
                "orderedStableErrors": error_by_rule[rule_kind],
                "passWhen": "predicate-is-true",
            }
            for rule_kind in rule_kinds
        ]
        validator["orderedFindings"] = {
            "order": validator["stableErrors"]["value"],
            "severity": validator["severity"]["value"]["fixed"],
            "zeroWriteOnFailure": True,
        }


def build_lifecycle_mapping(
    lifecycle: dict[str, Any],
    binding_leaf: dict[str, Any],
    supersession: dict[str, Any],
    mapping_digest: str,
) -> None:
    family_by_artifact = {
        artifact["artifactId"]: artifact["family"]["value"]
        for artifact in lifecycle["artifacts"]
    }
    lifecycle_bindings = binding_leaf["bindings"][:845]
    if len(lifecycle_bindings) != 845:
        raise AuthoringError("lifecycle binding population mismatch")
    decisions = []
    positive = 0
    not_applicable_positive = 0
    for row_index, row in enumerate(supersession["mappingRows"]):
        for binding in lifecycle_bindings:
            target_family = family_by_artifact.get(binding["targetId"])
            if target_family is None:
                raise AuthoringError(f"lifecycle binding target missing: {binding['targetId']}")
            applies = (
                row["disposition"] == "applicable"
                and target_family == row["artifactFamily"]
            )
            positive += int(applies)
            if row["disposition"] == "notApplicable" and applies:
                not_applicable_positive += 1
            decisions.append(
                {
                    "applies": applies,
                    "artifactFamily": row["artifactFamily"],
                    "bindingId": binding["bindingId"],
                    "capabilityId": row["capabilityId"],
                    "disposition": row["disposition"],
                    "mappingRowIndex": row_index,
                    "procedureId": row["procedureId"],
                    "targetArtifactFamily": target_family,
                    "targetId": binding["targetId"],
                }
            )
    negative = len(decisions) - positive
    expected = supersession["completeLifecycleMatrix"]
    actual = {
        "lifecycleBindingsPerRow": 845,
        "mappingRows": 17,
        "negativeDecisions": negative,
        "notApplicablePositiveDecisions": not_applicable_positive,
        "notApplicableRows": 4,
        "positiveDecisions": positive,
        "totalDecisions": len(decisions),
    }
    if actual != expected:
        raise AuthoringError(f"lifecycle matrix mismatch: {actual}")
    lifecycle["procedureCapabilityArtifactFamilyMappingSchema"] = deepcopy(
        supersession["replacementRowSchema"]
    )
    lifecycle["mappingFailureDisposition"] = {
        "classes": [
            "unknown-identity",
            "missing-identity",
            "duplicate-identity",
            "aliased-identity",
            "conflicting-identity",
            "out-of-codomain-family",
            "invalid-disposition",
            "invalid-conditional-nullability",
        ],
        "stableErrors": [
            "V131_MAPPING_IDENTITY_INVALID",
            "V131_MAPPING_DISPOSITION_INVALID",
            "V131_MAPPING_ARTIFACT_FAMILY_INVALID",
        ],
        "writeDisposition": "reject-before-any-canonical-write",
    }
    lifecycle["procedureCapabilityArtifactFamilyMapping"] = {
        "applicabilityEquation": supersession["applicabilityEquation"],
        "artifactFamilyCodomain": supersession["mappingArtifactFamilyCodomain"],
        "completeLifecycleMatrix": {**actual, "decisions": decisions},
        "experimentFamilySeparation": supersession["experimentFamilySeparation"],
        "mappingRowsDigest": mapping_digest,
        "rows": deepcopy(supersession["mappingRows"]),
    }


def global_authority_snapshot(capability_id: str) -> dict[str, Any]:
    return {
        "activationId": "act_global_contract_validation",
        "approvalId": "apr_global_contract_validation",
        "capabilityId": capability_id,
        "dispatchId": "dsp_global_contract_validation",
        "methodologyDigest": "0" * 64,
        "methodologyIdentity": "evaluation-contract-v1.3.1",
        "procedureDigest": "sha256:" + "1" * 64,
        "procedureId": "contract-validation-v1",
        "procedureVersion": "1.0.0",
        "questId": "qst_global_contract_validation",
        "repositoryId": "rep_global_contract_validation",
    }


def global_fixture(
    case: dict[str, Any],
    index: int,
    binding_by_id: dict[str, dict[str, Any]],
    leaves: dict[str, Any],
) -> tuple[dict[str, Any], dict[str, Any]]:
    if len(case["bindingIds"]) != 1:
        raise AuthoringError(f"global case must bind exactly one rule: {case['caseId']}")
    binding = binding_by_id.get(case["bindingIds"][0])
    if binding is None:
        raise AuthoringError(f"global case binding is missing: {case['caseId']}")
    if (
        binding["ruleKind"] != case["ruleKind"]
        or binding["targetId"] not in case["ruleTargets"]
        or binding["validator"] != case["validator"]
        or binding["stableErrors"] != case["expectedStableErrors"]
        and case["fixtureClass"] == "critical-negative"
    ):
        raise AuthoringError(f"global case authority mismatch: {case['caseId']}")

    authority_value = canonical_value(binding_authority_value(binding, leaves)).decode("utf-8")
    authority_field, observed_field = rule_fact_fields(binding["ruleKind"])
    fixture_class = case["fixtureClass"]
    incorrect_value = '{"trellisInjectedMismatch":true}'
    if authority_value == incorrect_value:
        incorrect_value = '{"trellisInjectedMismatch":false}'
    observed = incorrect_value if fixture_class == "positive" else authority_value
    capability_id = (
        "unrelated-contract-validation"
        if fixture_class == "inapplicable"
        else "global-contract-validation"
    )
    fixture = {
        "authoritySnapshot": global_authority_snapshot(capability_id),
        "facts": {
            "aliasesAbsent": True,
            "authorityComplete": True,
            authority_field: authority_value,
            "bindingId": binding["bindingId"],
            "contradictionFree": True,
            "expectedStableErrors": binding["stableErrors"],
            "factState": "present",
            observed_field: observed,
            "ruleKind": binding["ruleKind"],
            "targetId": binding["targetId"],
        },
        "ruleId": binding["ruleId"],
        "targetId": binding["targetId"],
    }
    fixture_digest = f"sha256:{sha256(canonical_value(fixture))}"
    if fixture_class == "positive":
        operation = "json-replace"
        target = f"/facts/{observed_field}"
        value: Any = authority_value
        precondition = {"equals": incorrect_value}
    elif fixture_class == "base":
        operation = "json-test"
        target = f"/facts/{observed_field}"
        value = authority_value
        precondition = {"equals": authority_value}
    elif fixture_class == "critical-negative":
        operation = "json-replace"
        target = f"/facts/{observed_field}"
        value = incorrect_value
        precondition = {"equals": authority_value}
    elif fixture_class == "inapplicable":
        operation = "json-replace"
        target = "/authoritySnapshot/capabilityId"
        value = "still-unrelated-contract-validation"
        precondition = {"equals": "unrelated-contract-validation"}
    else:
        raise AuthoringError(f"unknown global fixture class: {fixture_class}")
    applicability = {
        "language": "trellis-predicate-v1",
        "predicate": {
            "op": "all",
            "operands": [
                predicate_node(
                    "equals",
                    predicate_operand("exact-json-pointer", "/facts/ruleKind"),
                    predicate_operand("literal", case["ruleKind"]),
                ),
                predicate_node(
                    "equals",
                    predicate_operand(
                        "exact-json-pointer", "/authoritySnapshot/capabilityId"
                    ),
                    predicate_operand("literal", "global-contract-validation"),
                ),
            ],
        },
    }
    expected_run = "not-run" if fixture_class == "inapplicable" else "run"
    mutation = {
        "applicability": applicability,
        "baseFixtureDigest": fixture_digest,
        "evaluationOrder": [
            "authenticate-base-fixture-digest",
            "check-mutation-precondition",
            "apply-ordered-mutation",
            "evaluate-applicability-on-mutated-fixture",
            "when-applicable-validate-input-schema-and-predicate",
            "compare-verdict-errors-and-write-observation",
        ],
        "expectedOrderedErrors": case["expectedStableErrors"],
        "expectedRunState": expected_run,
        "expectedVerdict": case["expected"],
        "language": "trellis-mutation-v1",
        "operation": operation,
        "precondition": precondition,
        "sequence": index - 71,
        "target": target,
        "value": value,
        "writeObservation": case["zeroWriteExpectation"],
    }
    return (
        {"digest": fixture_digest, "fixture": fixture, "fixtureId": f"global-fixture-{index:03d}"},
        mutation,
    )


def add_differential_corrections(
    differential: dict[str, Any],
    binding_leaf: dict[str, Any],
    leaves: dict[str, Any],
) -> None:
    differential["globalFixtureAuthority"] = {
        "caseIndexRange": [72, 115],
        "digestFraming": "sha256 of canonical compact embedded fixture JSON without final LF",
        "executionOrder": [
            "authenticate-base-fixture-digest",
            "check-mutation-precondition",
            "apply-ordered-mutation",
            "evaluate-applicability-on-mutated-fixture",
            "when-applicable-validate-input-schema-and-predicate",
            "compare-verdict-errors-and-write-observation",
        ],
        "fixtureCount": 44,
        "fixtureStorage": "embedded-per-case-no-external-file",
        "mutationLanguage": "trellis-mutation-v1",
        "predicateLanguage": "trellis-predicate-v1",
    }
    binding_by_id = {
        binding["bindingId"]: binding for binding in binding_leaf["bindings"]
    }
    for index in range(72, 116):
        case = differential["v13DeltaCases"][index]
        base_fixture, mutation = global_fixture(case, index, binding_by_id, leaves)
        case["baseFixture"] = base_fixture
        case["syntheticMutation"] = mutation
        case["mutationPreconditions"] = [
            {"onFailure": "case-fails-closed", "target": mutation["target"], **mutation["precondition"]}
        ]
        case["applicability"] = mutation["applicability"]
        case["expectedExecution"] = {
            "orderedStableErrors": case["expectedStableErrors"],
            "runState": mutation["expectedRunState"],
            "verdict": case["expected"],
        }
        case["expectedObservation"] = {
            "findingOrder": case["expectedStableErrors"],
            "write": case["zeroWriteExpectation"],
        }


def diff_values(old: Any, new: Any, pointer: str = "") -> list[tuple[str, Any, Any]]:
    if type(old) is not type(new):
        return [(pointer, old, new)]
    if isinstance(old, dict):
        rows: list[tuple[str, Any, Any]] = []
        for key in sorted(set(old) | set(new)):
            escaped = key.replace("~", "~0").replace("/", "~1")
            child_pointer = f"{pointer}/{escaped}"
            if key not in old:
                rows.append((child_pointer, ABSENT, new[key]))
            elif key not in new:
                rows.append((child_pointer, old[key], ABSENT))
            else:
                rows.extend(diff_values(old[key], new[key], child_pointer))
        return rows
    if isinstance(old, list):
        rows = []
        common = min(len(old), len(new))
        for index in range(common):
            rows.extend(diff_values(old[index], new[index], f"{pointer}/{index}"))
        for index in range(common, len(old)):
            rows.append((f"{pointer}/{index}", old[index], ABSENT))
        for index in range(common, len(new)):
            rows.append((f"{pointer}/{index}", ABSENT, new[index]))
        return rows
    return [] if old == new else [(pointer, old, new)]


def propagation_index(allowlist: dict[str, Any]) -> dict[tuple[str, str], tuple[str, dict[str, Any]]]:
    result: dict[tuple[str, str], tuple[str, dict[str, Any]]] = {}
    for rule in allowlist["propagationRules"]:
        for match in rule["matches"]:
            for pointer in match["pointerPaths"]:
                key = (match["leafPath"], pointer)
                if key in result:
                    raise AuthoringError(f"duplicate propagation pointer: {key}")
                result[key] = (rule["ruleId"], match["oldNewGuard"])
    return result


def guard_matches(old: Any, new: Any, guard: dict[str, Any]) -> bool:
    if guard["kind"] == "exact-value":
        return old == guard["oldValue"] and new == guard["newValue"]
    if guard["kind"] == "exact-prefix-replacement-preserve-suffix":
        if not isinstance(old, str) or not isinstance(new, str):
            return False
        for transition in guard["transitions"]:
            if old.startswith(transition["oldPrefix"]):
                suffix = old[len(transition["oldPrefix"]):]
                return new == transition["newPrefix"] + suffix
    if guard["kind"] == "finding-bound-record-ref":
        return old in guard["oldValues"] and new == guard["newValue"]
    return False


def direct_patterns(allowlist: dict[str, Any]) -> list[tuple[str, str, re.Pattern[str]]]:
    patterns = []
    for region in allowlist["directCorrectionRegions"]:
        finding = region["findingId"]
        if "leafPath" in region:
            for pattern in region["pointerPatterns"]:
                patterns.append((finding, region["leafPath"], re.compile(pattern)))
        else:
            for leaf, leaf_patterns in region["pointerPatternsByLeaf"].items():
                for pattern in leaf_patterns:
                    patterns.append((finding, leaf, re.compile(pattern)))
    return patterns


def semantic_diff_ledger(
    baselines: dict[str, Any],
    leaves: dict[str, Any],
    allowlist: dict[str, Any],
) -> tuple[dict[str, Any], dict[str, int]]:
    propagation = propagation_index(allowlist)
    patterns = direct_patterns(allowlist)
    rows = []
    counts: dict[str, int] = {}
    for old_name, new_name in LEAF_TRANSITIONS:
        for pointer, old, new in diff_values(baselines[old_name], leaves[new_name]):
            propagation_match = propagation.get((new_name, pointer))
            if propagation_match and guard_matches(old, new, propagation_match[1]):
                classification = propagation_match[0]
                proof = f"{G131_ALLOWLIST}#/propagationRules/{classification}"
            else:
                direct = sorted(
                    {
                        finding
                        for finding, leaf, pattern in patterns
                        if leaf == new_name and pattern.fullmatch(pointer)
                    }
                )
                if len(direct) != 1:
                    raise AuthoringError(
                        f"unauthorized or ambiguous semantic change: {new_name}#{pointer}: {direct}"
                    )
                classification = direct[0]
                proof = f"{G131_ALLOWLIST}#/directCorrectionRegions/{classification}"
                if classification == "CS6-1-CONTRACT-004":
                    proof = f"{G132_SUPERSESSION}#/scope"
            counts[classification] = counts.get(classification, 0) + 1
            rows.append(
                {
                    "classification": classification,
                    "jsonPointer": pointer,
                    "leafPath": new_name,
                    "newValueDigest": value_digest(new),
                    "oldValueDigest": value_digest(old),
                    "proofSource": proof,
                }
            )
    rows.sort(key=lambda row: (LEAF_NAMES.index(row["leafPath"]), row["jsonPointer"]))
    return (
        {
            "classificationCounts": counts,
            "contractFrom": "evaluation-contract-v1.3.0",
            "contractTo": "evaluation-contract-v1.3.1",
            "g131Allowlist": {
                "commit": G131_COMMIT,
                "path": G131_ALLOWLIST,
                "sha256": sha256(object_bytes(G131_COMMIT, G131_ALLOWLIST)),
            },
            "g132Finding004Supersession": {
                "commit": G132_COMMIT,
                "path": G132_SUPERSESSION,
                "sha256": sha256(object_bytes(G132_COMMIT, G132_SUPERSESSION)),
            },
            "noFifthSemanticChange": True,
            "recordKind": "semantic-diff-ledger-v1.3.0-to-v1.3.1",
            "rowCount": len(rows),
            "rows": rows,
            "schemaVersion": 1,
        },
        counts,
    )


def strings_with_prefix(node: Any, pointer: str = "") -> list[tuple[str, str]]:
    result = []
    if isinstance(node, str) and node.startswith(("DEC-", "EV-", "SRC-")):
        result.append((pointer, node))
    elif isinstance(node, dict):
        for key, value in node.items():
            escaped = key.replace("~", "~0").replace("/", "~1")
            result.extend(strings_with_prefix(value, f"{pointer}/{escaped}"))
    elif isinstance(node, list):
        for index, value in enumerate(node):
            result.extend(strings_with_prefix(value, f"{pointer}/{index}"))
    return result


def verify_historical_guards(leaves: dict[str, Any], allowlist: dict[str, Any]) -> int:
    guard_count = 0
    for guard in allowlist["directRegionImmutableReferenceGuards"]:
        leaf = leaves[guard["leafPath"]]
        for pointer in guard["pointerPaths"]:
            if pointer_get(leaf, pointer) != guard["oldValue"]:
                raise AuthoringError(f"historical reference guard changed: {pointer}")
            guard_count += 1
    if guard_count != 71:
        raise AuthoringError("historical DEC guard population mismatch")
    for finding, leaf_name, pattern in direct_patterns(allowlist):
        del finding
        leaf = leaves[leaf_name]
        for pointer, value in strings_with_prefix(leaf):
            if pattern.fullmatch(pointer) and value.startswith(("EV-", "SRC-")):
                raise AuthoringError(f"direct-region EV/SRC reference added: {leaf_name}#{pointer}")
    return guard_count


def member_aggregate(leaf_bytes: dict[str, bytes]) -> str:
    digest = hashlib.sha256()
    digest.update(MEMBER_AGGREGATE_DOMAIN)
    for name in LEAF_NAMES:
        digest.update(name.encode("utf-8"))
        digest.update(b"\0")
        digest.update(leaf_bytes[name])
        digest.update(b"\0")
    return f"sha256:{digest.hexdigest()}"


def walk_schema_nodes(node: Any, pointer: str = "") -> list[tuple[str, dict[str, Any]]]:
    result = []
    if isinstance(node, dict):
        if any(key in node for key in ("type", "oneOf", "anyOf", "allOf", "enum", "const")):
            result.append((pointer, node))
        for key, child in node.items():
            escaped = key.replace("~", "~0").replace("/", "~1")
            result.extend(walk_schema_nodes(child, f"{pointer}/{escaped}"))
    elif isinstance(node, list):
        for index, child in enumerate(node):
            result.extend(walk_schema_nodes(child, f"{pointer}/{index}"))
    return result


def report_base_fixture(leaves: dict[str, Any]) -> dict[str, Any]:
    lifecycle = leaves["artifact-lifecycle-contract-v1.3.1.json"]
    binding_leaf = leaves["validator-binding-matrix-v1.3.1.json"]
    registry = leaves["validator-registry-v1.3.1.json"]
    binding = binding_leaf["bindings"][0]
    artifact = next(
        item for item in lifecycle["artifacts"] if item["artifactId"] == binding["targetId"]
    )
    family = artifact["family"]["value"]
    mapping_row = next(
        row
        for row in lifecycle["procedureCapabilityArtifactFamilyMapping"]["rows"]
        if row["disposition"] == "applicable" and row["artifactFamily"] == family
    )
    validator_triples = [
        {
            "id": validator["identity"]["value"]["id"],
            "severity": validator["severity"]["value"]["fixed"],
            "version": validator["identity"]["value"]["version"],
        }
        for validator in registry["validators"]
    ]
    return {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "activationId": "act_report_v2_fixture",
        "applicability": [
            {
                "applies": True,
                "bindingId": binding["bindingId"],
                "reason": "family-match",
            }
        ],
        "approvalId": "apr_report_v2_fixture",
        "artifactBindings": [
            {
                "applicable": True,
                "artifactId": artifact["artifactId"],
                "bindingId": binding["bindingId"],
                "mapping": {
                    "artifactFamily": mapping_row["artifactFamily"],
                    "disposition": mapping_row["disposition"],
                },
                "targetArtifactFamily": family,
                "targetId": binding["targetId"],
            }
        ],
        "blockedFacts": [{"factPointer": "/facts/example", "reason": "missing"}],
        "closureSources": [
            {
                "digest": "sha256:" + "2" * 64,
                "family": "research-literature",
                "sourceId": "closure-source-example",
            }
        ],
        "dispatchId": "dsp_report_v2_fixture",
        "methodologyDigest": "3" * 64,
        "methodologyIdentity": "evaluation-contract-v1.3.1",
        "orderedFindings": [
            {
                "factPointer": "/facts/example",
                "stableError": binding["stableErrors"][0],
                "targetId": binding["targetId"],
                "validator": binding["validator"],
            }
        ],
        "orderedValidatorTriples": validator_triples,
        "procedureDigest": "sha256:" + "4" * 64,
        "procedureId": mapping_row["procedureId"],
        "procedureVersion": mapping_row["procedureVersion"],
        "questId": "qst_report_v2_fixture",
        "schemaVersion": 2,
        "supportInventoryDigest": "sha256:" + "5" * 64,
        "zeroWriteDisposition": "validation-complete-before-write",
    }


def schema_pointer_to_instance_pointer(schema_pointer: str) -> str:
    tokens = pointer_tokens(schema_pointer)
    result: list[str] = []
    index = 0
    while index < len(tokens):
        token = tokens[index]
        if token == "properties" and index + 1 < len(tokens):
            result.append(tokens[index + 1])
            index += 2
            continue
        if token in {"items", "prefixItems"}:
            result.append("0")
            index += 1
            continue
        if token in {"oneOf", "anyOf", "allOf"}:
            index += 2
            continue
        index += 1
    return "" if not result else "/" + "/".join(
        token.replace("~", "~0").replace("/", "~1") for token in result
    )


def invalid_schema_value(schema_node: dict[str, Any]) -> Any:
    if "const" in schema_node:
        value = schema_node["const"]
        return "__invalid_const__" if value != "__invalid_const__" else None
    if "enum" in schema_node:
        return "__invalid_enum__"
    if "oneOf" in schema_node or "anyOf" in schema_node:
        return {"artifactFamily": None, "disposition": "applicable"}
    expected_type = schema_node.get("type")
    if isinstance(expected_type, list):
        return {}
    return {
        "array": {},
        "boolean": "not-a-boolean",
        "integer": "not-an-integer",
        "null": "not-null",
        "number": "not-a-number",
        "object": [],
        "string": 0,
    }.get(expected_type, None)


def validator_fixture(
    validator: dict[str, Any],
    binding: dict[str, Any],
    leaves: dict[str, Any],
    lifecycle: dict[str, Any],
    mapping_digest: str,
    *,
    lifecycle_validator: bool,
) -> dict[str, Any]:
    authority_value = canonical_value(binding_authority_value(binding, leaves)).decode("utf-8")
    authority_field, observed_field = rule_fact_fields(binding["ruleKind"])
    snapshot = global_authority_snapshot("global-contract-validation")
    if lifecycle_validator:
        family_by_artifact = {
            artifact["artifactId"]: artifact["family"]["value"]
            for artifact in lifecycle["artifacts"]
        }
        family = family_by_artifact[binding["targetId"]]
        row = next(
            item
            for item in lifecycle["procedureCapabilityArtifactFamilyMapping"]["rows"]
            if item["disposition"] == "applicable" and item["artifactFamily"] == family
        )
        snapshot["lifecycleApplicabilityContext"] = {
            "applicabilityDecision": True,
            "mappingDigest": mapping_digest,
            "mappingRow": row,
            "targetArtifactFamily": family,
        }
    return {
        "authoritySnapshot": snapshot,
        "facts": {
            "aliasesAbsent": True,
            "authorityComplete": True,
            authority_field: authority_value,
            "bindingId": binding["bindingId"],
            "contradictionFree": True,
            "expectedStableErrors": binding["stableErrors"],
            "factState": "present",
            observed_field: authority_value,
            "ruleKind": binding["ruleKind"],
            "targetId": binding["targetId"],
        },
        "ruleId": binding["ruleId"],
        "targetId": binding["targetId"],
    }


def assurance_corpus(
    leaves: dict[str, Any], diff_ledger: dict[str, Any]
) -> dict[str, Any]:
    report_schema = leaves["validator-binding-matrix-v1.3.1.json"]["reportV2Contract"]["reportSchema"]
    report_fixture = report_base_fixture(leaves)
    report_fixture_bytes = canonical_file(report_fixture)
    report_cases = []
    for index, (pointer, schema_node) in enumerate(walk_schema_nodes(report_schema), 1):
        instance_pointer = schema_pointer_to_instance_pointer(pointer)
        operation = "json-replace"
        target = instance_pointer
        value = invalid_schema_value(schema_node)
        if not instance_pointer:
            operation = "json-add"
            target = "/unexpectedRootProperty"
            value = True
        report_cases.append(
            {
                "baseFixtureId": "report-v2-valid",
                "caseId": f"REPORT-SCHEMA-{index:04d}",
                "expected": "reject-invalid",
                "mutation": {
                    "operation": operation,
                    "target": target,
                    "value": value,
                },
                "schemaKeywords": sorted(schema_node),
                "schemaPointer": pointer,
            }
        )
    report_cases.extend(
        [
            {
                "baseFixtureId": "report-v2-valid",
                "caseId": "REPORT-NULLABILITY-NOT-APPLICABLE-NULL-VALID",
                "expected": "accept",
                "mutation": {
                    "operation": "json-replace",
                    "target": "/artifactBindings/0/mapping",
                    "value": {"artifactFamily": None, "disposition": "notApplicable"},
                },
            },
            {
                "baseFixtureId": "report-v2-valid",
                "caseId": "REPORT-NULLABILITY-APPLICABLE-NULL-INVALID",
                "expected": "reject",
                "mutation": {
                    "operation": "json-replace",
                    "target": "/artifactBindings/0/mapping/artifactFamily",
                    "value": None,
                },
            },
            {
                "baseFixtureId": "report-v2-valid",
                "caseId": "REPORT-CARDINALITY-VALIDATOR-TRIPLES-TOO-FEW",
                "expected": "reject",
                "mutation": {
                    "operation": "json-remove",
                    "target": "/orderedValidatorTriples/19",
                },
            },
            {
                "baseFixtureId": "report-v2-valid",
                "caseId": "REPORT-NESTED-UNKNOWN-KEY",
                "expected": "reject",
                "mutation": {
                    "operation": "json-add",
                    "target": "/artifactBindings/0/mapping/unknown",
                    "value": True,
                },
            },
        ]
    )
    byte_inputs = {
        "invalid-utf8": b"\xff\n",
        "duplicate-decoded-key": b'{"schemaVersion":2,"schemaVersion":2}\n',
        "non-finite-number": b'{"schemaVersion":NaN}\n',
        "unpaired-surrogate": b'{"schemaVersion":"\\ud800"}\n',
        "missing-final-lf": report_fixture_bytes[:-1],
        "multiple-final-lf": report_fixture_bytes + b"\n",
        "cr-byte": report_fixture_bytes[:-1] + b"\r\n",
    }
    for byte_class, data in byte_inputs.items():
        report_cases.append(
            {
                "caseId": f"REPORT-BYTES-{byte_class.upper()}",
                "expected": "reject",
                "inputBytesHex": data.hex(),
                "invalidClass": byte_class,
            }
        )
    noncanonical_report_bytes = (
        json.dumps(
            dict(reversed(list(report_fixture.items()))),
            ensure_ascii=False,
            sort_keys=False,
            separators=(",", ":"),
        ).encode("utf-8")
        + b"\n"
    )
    report_cases.extend(
        [
            {
                "baseFixtureId": "report-v2-valid",
                "caseId": "REPORT-BYTES-UNKNOWN-KEY",
                "expected": "reject",
                "invalidClass": "unknown-key",
                "mutation": {
                    "operation": "json-add",
                    "target": "/unknown",
                    "value": True,
                },
            },
            {
                "baseFixtureId": "report-v2-valid",
                "caseId": "REPORT-BYTES-MISSING-REQUIRED-KEY",
                "expected": "reject",
                "invalidClass": "missing-required-key",
                "mutation": {
                    "operation": "json-remove",
                    "target": "/schemaVersion",
                },
            },
            {
                "caseId": "REPORT-BYTES-NON-CANONICAL-KEY-ORDER",
                "expected": "reject",
                "inputBytesHex": noncanonical_report_bytes.hex(),
                "invalidClass": "non-canonical-key-order",
            },
            {
                "baseFixtureId": "report-v2-valid",
                "caseId": "REPORT-BYTES-ARRAY-ORDER-CHANGE",
                "expected": "reject",
                "invalidClass": "array-order-change",
                "mutation": {
                    "operation": "json-replace",
                    "target": "/orderedValidatorTriples",
                    "value": list(reversed(report_fixture["orderedValidatorTriples"])),
                },
            },
            {
                "baseFixtureId": "report-v2-valid",
                "caseId": "REPORT-BYTES-DIGEST-SELF-FIELD",
                "expected": "reject",
                "invalidClass": "digest-self-field",
                "mutation": {
                    "operation": "json-add",
                    "target": "/digest",
                    "value": "sha256:" + "0" * 64,
                },
            },
        ]
    )

    validator_cases = []
    validator_fixtures: list[dict[str, Any]] = []
    invalid_classes = [
        "predicate-false",
        "missing",
        "unknown",
        "contradictory",
        "aliased",
        "ambiguous",
        "inapplicable",
    ]
    registry = leaves["validator-registry-v1.3.1.json"]
    binding_leaf = leaves["validator-binding-matrix-v1.3.1.json"]
    lifecycle = leaves["artifact-lifecycle-contract-v1.3.1.json"]
    mapping_digest = lifecycle["procedureCapabilityArtifactFamilyMapping"]["mappingRowsDigest"]
    for validator_index, validator in enumerate(registry["validators"]):
        identity = validator["identity"]["value"]
        for rule_index, rule_kind in enumerate(validator["applicableRuleKinds"]["value"]):
            binding = next(
                item
                for item in binding_leaf["bindings"]
                if item["ruleKind"] == rule_kind
                and item["validator"]["id"] == identity["id"]
                and item["validator"]["version"] == identity["version"]
            )
            fixture_id = f"validator-{validator_index:02d}-rule-{rule_index:02d}"
            fixture = validator_fixture(
                validator,
                binding,
                leaves,
                lifecycle,
                mapping_digest,
                lifecycle_validator=validator_index <= 11,
            )
            validator_fixtures.append(
                {"fixture": fixture, "fixtureId": fixture_id, "validator": identity}
            )
            base_id = f"{identity['id']}@{identity['version']}:{rule_kind}"
            validator_cases.append(
                {
                    "baseFixtureId": fixture_id,
                    "caseId": f"VALIDATOR-{base_id}-VALID",
                    "expected": "pass",
                    "expectedStableErrors": [],
                    "mutation": {"operation": "none"},
                    "validator": identity,
                }
            )
            mutations = {
                "predicate-false": {
                    "operation": "json-replace",
                    "target": f"/facts/{rule_fact_fields(rule_kind)[1]}",
                    "value": '{"trellisInjectedMismatch":true}',
                },
                "missing": {
                    "operation": "json-remove",
                    "target": "/facts/authorityComplete",
                },
                "unknown": {
                    "operation": "json-add",
                    "target": "/facts/unknown",
                    "value": True,
                },
                "contradictory": {
                    "operation": "json-replace",
                    "target": "/facts/contradictionFree",
                    "value": False,
                },
                "aliased": {
                    "operation": "json-replace",
                    "target": "/facts/aliasesAbsent",
                    "value": False,
                },
                "ambiguous": {
                    "operation": "json-replace",
                    "target": "/facts/factState",
                    "value": "ambiguous",
                },
                "inapplicable": (
                    {
                        "operation": "json-replace",
                        "target": "/authoritySnapshot/lifecycleApplicabilityContext/applicabilityDecision",
                        "value": False,
                    }
                    if validator_index <= 11
                    else {
                        "operation": "json-replace",
                        "target": "/facts/ruleKind",
                        "value": "inapplicable.rule",
                    }
                ),
            }
            for invalid_class in invalid_classes:
                validator_cases.append(
                    {
                        "baseFixtureId": fixture_id,
                        "caseId": f"VALIDATOR-{base_id}-{invalid_class.upper()}",
                        "expected": (
                            "not-run" if invalid_class == "inapplicable" else "fail-closed"
                        ),
                        "expectedStableErrors": (
                            [] if invalid_class == "inapplicable" else binding["stableErrors"]
                        ),
                        "invalidClass": invalid_class,
                        "mutation": mutations[invalid_class],
                        "validator": identity,
                    }
                )

    differential_leaf = leaves["differential-test-matrix-v1.3.1.json"]
    global_cases = [
        {
            "applicability": case["applicability"],
            "baseFixture": case["baseFixture"],
            "caseId": f"GLOBAL-{case['caseId']}",
            "expected": case["expectedExecution"],
            "expectedObservation": case["expectedObservation"],
            "sourceCaseIndex": index,
            "syntheticMutation": case["syntheticMutation"],
            "validator": case["validator"],
        }
        for index, case in enumerate(differential_leaf["v13DeltaCases"][72:116], 72)
    ]
    inapplicability_cases = [
        {
            "baseFixture": differential_leaf["v13DeltaCases"][index]["baseFixture"],
            "caseId": f"GLOBAL-INAPPLICABILITY-{index}",
            "expected": "not-run",
            "predicate": differential_leaf["v13DeltaCases"][index]["applicability"],
            "sourceCaseIndex": index,
            "syntheticMutation": differential_leaf["v13DeltaCases"][index]["syntheticMutation"],
        }
        for index in (75, 79, 83, 87, 91, 95, 99, 103, 107, 111, 115)
    ]

    matrix = leaves["artifact-lifecycle-contract-v1.3.1.json"][
        "procedureCapabilityArtifactFamilyMapping"
    ]["completeLifecycleMatrix"]
    lifecycle_cases = [
        {
            "caseId": f"LIFECYCLE-{decision['mappingRowIndex']:02d}-{decision['bindingId']}",
            "expectedApplies": decision["applies"],
            "mappingRowIndex": decision["mappingRowIndex"],
            "targetArtifactFamily": decision["targetArtifactFamily"],
        }
        for decision in matrix["decisions"]
    ]
    mapping_rows = leaves["artifact-lifecycle-contract-v1.3.1.json"][
        "procedureCapabilityArtifactFamilyMapping"
    ]["rows"]
    not_applicable_index = next(
        index
        for index, row in enumerate(mapping_rows)
        if row["disposition"] == "notApplicable"
    )
    mapping_invalid = {
        "unknown-identity": {
            "operation": "json-replace",
            "target": "/0/procedureId",
            "value": "unknown-procedure-v1",
        },
        "missing-identity": {
            "operation": "json-remove",
            "target": "/0/capabilityId",
        },
        "duplicate-identity": {
            "operation": "json-add",
            "target": f"/{len(mapping_rows)}",
            "value": mapping_rows[0],
        },
        "aliased-identity": {
            "operation": "json-replace",
            "target": "/0/capabilityId",
            "value": "alias-of-" + mapping_rows[0]["capabilityId"],
        },
        "conflicting-identity": {
            "operation": "json-replace",
            "target": "/0/artifactFamily",
            "value": next(
                family
                for family in leaves["artifact-lifecycle-contract-v1.3.1.json"][
                    "procedureCapabilityArtifactFamilyMapping"
                ]["artifactFamilyCodomain"]
                if family != mapping_rows[0]["artifactFamily"]
            ),
        },
        "out-of-codomain-family": {
            "operation": "json-replace",
            "target": "/0/artifactFamily",
            "value": "outside-authorized-codomain",
        },
        "applicable-null-family": {
            "operation": "json-replace",
            "target": "/0/artifactFamily",
            "value": None,
        },
        "not-applicable-non-null-family": {
            "operation": "json-replace",
            "target": f"/{not_applicable_index}/artifactFamily",
            "value": mapping_rows[0]["artifactFamily"],
        },
        "unknown-disposition": {
            "operation": "json-replace",
            "target": "/0/disposition",
            "value": "unknown",
        },
    }
    for invalid_class, mutation in mapping_invalid.items():
        lifecycle_cases.append(
            {
                "baseFixtureId": "g132-mapping-rows-valid",
                "caseId": f"LIFECYCLE-INVALID-{invalid_class.upper()}",
                "expected": "fail-closed-zero-write",
                "invalidClass": invalid_class,
                "mutation": mutation,
            }
        )

    authority_cases = []
    authority_elements = [
        ("report-v2-complete-schema", "validator-binding-matrix-v1.3.1.json", "/reportV2Contract/reportSchema"),
        ("twenty-validator-fact-schemas", "validator-registry-v1.3.1.json", "/validators/0/inputFactSchema/value/properties/facts"),
        ("twenty-validator-predicates", "validator-registry-v1.3.1.json", "/validators/0/predicate"),
        ("forty-four-global-fixtures", "differential-test-matrix-v1.3.1.json", "/v13DeltaCases/72/baseFixture"),
        ("eleven-global-inapplicability-predicates", "differential-test-matrix-v1.3.1.json", "/v13DeltaCases/75/applicability"),
        ("seventeen-g132-mapping-rows", "artifact-lifecycle-contract-v1.3.1.json", "/procedureCapabilityArtifactFamilyMapping/rows"),
        ("conditional-nullability-row-schema", "artifact-lifecycle-contract-v1.3.1.json", "/procedureCapabilityArtifactFamilyMappingSchema"),
        ("fourteen-thousand-three-hundred-sixty-five-lifecycle-decisions", "artifact-lifecycle-contract-v1.3.1.json", "/procedureCapabilityArtifactFamilyMapping/completeLifecycleMatrix/decisions"),
        ("experiment-lifecycle-closure-family-separation", "artifact-lifecycle-contract-v1.3.1.json", "/procedureCapabilityArtifactFamilyMapping/experimentFamilySeparation"),
        ("g131-propagation-allowlist", "semantic-diff-ledger-v1.3.0-to-v1.3.1.json", "/g131Allowlist"),
        ("seventy-one-historical-dec-guards", "semantic-diff-ledger-v1.3.0-to-v1.3.1.json", "/rows"),
    ]
    for element, leaf_path, pointer in authority_elements:
        authority_cases.extend(
            [
                {
                    "caseId": f"AUTHORITY-REMOVE-{element.upper()}",
                    "expected": "reject",
                    "leafPath": leaf_path,
                    "mutation": {"operation": "json-remove", "target": pointer},
                },
                {
                    "caseId": f"AUTHORITY-CONTRADICT-{element.upper()}",
                    "expected": "reject",
                    "leafPath": leaf_path,
                    "mutation": {
                        "operation": "json-replace",
                        "target": pointer,
                        "value": {"contradiction": True},
                    },
                },
            ]
        )

    diff_cases = [
        {
            "caseId": f"DIFF-{index:06d}",
            "classification": row["classification"],
            "expected": "exactly-one-authorized-classification",
            "leafPath": row["leafPath"],
            "pointer": row["jsonPointer"],
        }
        for index, row in enumerate(diff_ledger["rows"], 1)
    ]
    return {
        "authorityMutationCases": authority_cases,
        "contractIdentity": "evaluation-contract-v1.3.1",
        "coverageCounts": {
            "authorityMutationCases": len(authority_cases),
            "globalCases": len(global_cases),
            "globalInapplicabilityCases": len(inapplicability_cases),
            "lifecycleCases": len(lifecycle_cases),
            "reportCases": len(report_cases),
            "semanticDiffCases": len(diff_cases),
            "validatorCases": len(validator_cases),
        },
        "globalCases": global_cases,
        "globalInapplicabilityCases": inapplicability_cases,
        "lifecycleBaseFixtures": [
            {
                "fixture": mapping_rows,
                "fixtureId": "g132-mapping-rows-valid",
                "sha256": f"sha256:{sha256(canonical_value(mapping_rows))}",
            }
        ],
        "lifecycleCases": lifecycle_cases,
        "recordKind": "assurance-corpus-v1.3.1",
        "reportBaseFixtures": [
            {
                "canonicalBytesSha256": f"sha256:{sha256(report_fixture_bytes)}",
                "fixture": report_fixture,
                "fixtureId": "report-v2-valid",
            }
        ],
        "reportCases": report_cases,
        "schemaVersion": 1,
        "semanticDiffCases": diff_cases,
        "validatorBaseFixtures": validator_fixtures,
        "validatorCases": validator_cases,
    }


def adversarial_results(
    leaves: dict[str, Any],
    diff_ledger: dict[str, Any],
    corpus: dict[str, Any],
) -> list[dict[str, Any]]:
    results = []

    def record(test_id: str, passed: bool) -> None:
        if not passed:
            raise AuthoringError(f"adversarial test failed: {test_id}")
        results.append({"expected": "reject-mutation", "result": "pass", "testId": test_id})

    invalid_json = {
        "ADV-JSON-DUPLICATE": b'{"a":1,"a":2}\n',
        "ADV-JSON-NONFINITE": b'{"a":NaN}\n',
        "ADV-JSON-SURROGATE": b'{"a":"\\ud800"}\n',
        "ADV-JSON-CR": b'{"a":1}\r\n',
        "ADV-JSON-NO-LF": b'{"a":1}',
        "ADV-JSON-DOUBLE-LF": b'{"a":1}\n\n',
        "ADV-JSON-NONCANONICAL": b'{"b":1,"a":2}\n',
    }
    for test_id, data in invalid_json.items():
        rejected = False
        try:
            strict_json(data, canonical_required=True)
        except AuthoringError:
            rejected = True
        record(test_id, rejected)

    mapping = leaves["artifact-lifecycle-contract-v1.3.1.json"]["procedureCapabilityArtifactFamilyMapping"]
    expected_rows = mapping["rows"]
    codomain = set(mapping["artifactFamilyCodomain"])

    def mapping_rows_valid(rows: Any) -> bool:
        if not isinstance(rows, list) or len(rows) != 17 or rows != expected_rows:
            return False
        identities = set()
        for row in rows:
            if set(row) != {"artifactFamily", "capabilityId", "disposition", "procedureId", "procedureVersion"}:
                return False
            identity = (row["procedureId"], row["capabilityId"])
            if identity in identities:
                return False
            identities.add(identity)
            if row["disposition"] == "applicable":
                if row["artifactFamily"] not in codomain:
                    return False
            elif row["disposition"] == "notApplicable":
                if row["artifactFamily"] is not None:
                    return False
            else:
                return False
        return True

    record("ADV-MAPPING-ROW-COUNT", mapping_rows_valid(expected_rows))
    mapping_mutations = []
    missing = deepcopy(expected_rows)
    missing.pop()
    mapping_mutations.append(("ADV-MAPPING-MISSING-ROW", missing))
    duplicate = deepcopy(expected_rows)
    duplicate[-1] = deepcopy(duplicate[0])
    mapping_mutations.append(("ADV-MAPPING-DUPLICATE-ROW", duplicate))
    unknown = deepcopy(expected_rows)
    unknown[0]["capabilityId"] = "unknown-capability"
    mapping_mutations.append(("ADV-MAPPING-UNKNOWN-IDENTITY", unknown))
    invalid_disposition = deepcopy(expected_rows)
    invalid_disposition[0]["disposition"] = "unknown"
    mapping_mutations.append(("ADV-MAPPING-INVALID-DISPOSITION", invalid_disposition))
    applicable_null = deepcopy(expected_rows)
    applicable_index = next(index for index, row in enumerate(applicable_null) if row["disposition"] == "applicable")
    applicable_null[applicable_index]["artifactFamily"] = None
    mapping_mutations.append(("ADV-MAPPING-APPLICABLE-NULL", applicable_null))
    not_applicable_family = deepcopy(expected_rows)
    not_applicable_index = next(index for index, row in enumerate(not_applicable_family) if row["disposition"] == "notApplicable")
    not_applicable_family[not_applicable_index]["artifactFamily"] = "research-plan"
    mapping_mutations.append(("ADV-MAPPING-NOT-APPLICABLE-NON-NULL", not_applicable_family))
    outside_codomain = deepcopy(expected_rows)
    outside_codomain[applicable_index]["artifactFamily"] = "research-experiment"
    mapping_mutations.append(("ADV-MAPPING-OUT-OF-CODOMAIN", outside_codomain))
    extra_key = deepcopy(expected_rows)
    extra_key[0]["alias"] = "forbidden"
    mapping_mutations.append(("ADV-MAPPING-UNKNOWN-KEY", extra_key))
    for test_id, rows in mapping_mutations:
        record(test_id, not mapping_rows_valid(rows))

    record("ADV-MAPPING-NOT-APPLICABLE-ZERO", all(not decision["applies"] for decision in mapping["completeLifecycleMatrix"]["decisions"] if decision["disposition"] == "notApplicable"))
    record("ADV-MAPPING-TOTAL", mapping["completeLifecycleMatrix"]["totalDecisions"] == 14365)
    record("ADV-MAPPING-POSITIVE", mapping["completeLifecycleMatrix"]["positiveDecisions"] == 975)
    record("ADV-MAPPING-NEGATIVE", mapping["completeLifecycleMatrix"]["negativeDecisions"] == 13390)
    record("ADV-EXPERIMENT-FAMILY-SEPARATION", mapping["experimentFamilySeparation"]["lifecycleArtifactFamily"] == "research-experiment-campaign" and mapping["experimentFamilySeparation"]["closureFamily"] == "research-experiment")
    allowed_classes = {
        "CS6-1-CONTRACT-001",
        "CS6-1-CONTRACT-002",
        "CS6-1-CONTRACT-003",
        "CS6-1-CONTRACT-004",
        "PROP-CONTRACT-IDENTITY",
        "PROP-MEMBER-REFERENCE",
        "PROP-PROVENANCE-REFERENCE",
    }
    record("ADV-DIFF-NO-FIFTH", diff_ledger["noFifthSemanticChange"] is True and all(row["classification"] in allowed_classes for row in diff_ledger["rows"]))
    report_schema = leaves["validator-binding-matrix-v1.3.1.json"]["reportV2Contract"]["reportSchema"]

    def report_schema_valid(schema: dict[str, Any]) -> bool:
        return (
            schema.get("additionalProperties") is False
            and schema.get("type") == "object"
            and set(schema.get("required", [])) == set(schema.get("properties", {}))
            and schema.get("properties", {}).get("schemaVersion", {}).get("const") == 2
        )

    record("ADV-REPORT-ROOT-CLOSED", report_schema_valid(report_schema))
    report_arrays = [
        report_schema["properties"][name]
        for name in (
            "applicability",
            "artifactBindings",
            "blockedFacts",
            "closureSources",
            "orderedFindings",
            "orderedValidatorTriples",
        )
    ]
    record(
        "ADV-REPORT-CARDINALITIES",
        all(
            schema.get("minItems") is not None
            and schema.get("maxItems") is not None
            and schema.get("uniqueItems") is True
            for schema in report_arrays
        )
        and report_schema["properties"]["orderedValidatorTriples"]["minItems"] == 20
        and report_schema["properties"]["orderedValidatorTriples"]["maxItems"] == 20,
    )
    missing_report_requirement = deepcopy(report_schema)
    missing_report_requirement["required"].remove("schemaVersion")
    record("ADV-REPORT-MISSING-REQUIREMENT", not report_schema_valid(missing_report_requirement))
    validators = leaves["validator-registry-v1.3.1.json"]["validators"]

    def facts_schema_valid(schema: dict[str, Any]) -> bool:
        return schema.get("additionalProperties") is False and schema.get("type") == "object"

    record("ADV-VALIDATORS-TWENTY", len(validators) == 20)
    record("ADV-VALIDATOR-FACT-SCHEMAS-CLOSED", all(facts_schema_valid(validator["inputFactSchema"]["value"]["properties"]["facts"]) for validator in validators))
    record(
        "ADV-VALIDATOR-RULE-SPECIFIC-DIRECT-VALUES",
        all(
            all(
                set(rule_fact_fields(rule_kind))
                <= set(validator["inputFactSchema"]["value"]["properties"]["facts"]["properties"])
                for rule_kind in validator["applicableRuleKinds"]["value"]
            )
            and "sha256-equals" not in json.dumps(validator["predicate"], sort_keys=True)
            for validator in validators
        ),
    )
    open_facts = deepcopy(validators[0]["inputFactSchema"]["value"]["properties"]["facts"])
    open_facts["additionalProperties"] = True
    record("ADV-VALIDATOR-OPEN-FACT-SCHEMA", not facts_schema_valid(open_facts))
    global_cases = leaves["differential-test-matrix-v1.3.1.json"]["v13DeltaCases"][72:116]
    record("ADV-GLOBAL-CASES-FORTY-FOUR", len(global_cases) == 44 and all(isinstance(case["syntheticMutation"], dict) for case in global_cases))
    record("ADV-GLOBAL-NO-LABEL-ONLY-MUTATION", all(case["syntheticMutation"].get("language") == "trellis-mutation-v1" for case in global_cases))
    required_input_keys = {"authoritySnapshot", "facts", "ruleId", "targetId"}
    required_common_fact_keys = {
        "aliasesAbsent",
        "authorityComplete",
        "bindingId",
        "contradictionFree",
        "expectedStableErrors",
        "factState",
        "ruleKind",
        "targetId",
    }
    record(
        "ADV-GLOBAL-CLOSED-VALIDATOR-INPUTS",
        all(
            set(case["baseFixture"]["fixture"]) == required_input_keys
            and set(case["baseFixture"]["fixture"]["facts"])
            == required_common_fact_keys
            | set(rule_fact_fields(case["ruleKind"]))
            for case in global_cases
        ),
    )
    expected_execution_order = [
        "authenticate-base-fixture-digest",
        "check-mutation-precondition",
        "apply-ordered-mutation",
        "evaluate-applicability-on-mutated-fixture",
        "when-applicable-validate-input-schema-and-predicate",
        "compare-verdict-errors-and-write-observation",
    ]
    record(
        "ADV-GLOBAL-EXECUTION-ORDER",
        all(
            case["syntheticMutation"].get("evaluationOrder") == expected_execution_order
            for case in global_cases
        ),
    )
    record("ADV-GLOBAL-INAPPLICABILITY-ELEVEN", sum(case["fixtureClass"] == "inapplicable" and case["expectedExecution"]["runState"] == "not-run" for case in global_cases) == 11)
    record(
        "ADV-CORPUS-EXECUTABLE-REPORT-CASES",
        len(corpus.get("reportBaseFixtures", [])) == 1
        and all(
            "mutation" in case or "inputBytesHex" in case
            for case in corpus["reportCases"]
        ),
    )
    record(
        "ADV-CORPUS-EXECUTABLE-VALIDATOR-BRANCHES",
        len(corpus.get("validatorBaseFixtures", [])) == 29
        and len(corpus["validatorCases"]) == 232
        and all("mutation" in case for case in corpus["validatorCases"]),
    )
    record(
        "ADV-CORPUS-EXECUTABLE-INVALID-MAPPING-CLASSES",
        len(corpus.get("lifecycleBaseFixtures", [])) == 1
        and sum("invalidClass" in case for case in corpus["lifecycleCases"]) == 9
        and all(
            "mutation" in case and "baseFixtureId" in case
            for case in corpus["lifecycleCases"]
            if "invalidClass" in case
        ),
    )
    record(
        "ADV-CORPUS-EMBEDS-GLOBAL-REPLAY",
        len(corpus["globalCases"]) == 44
        and all(
            "baseFixture" in case and "syntheticMutation" in case
            for case in corpus["globalCases"]
        ),
    )
    return results


def build_leaves(authority: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    baselines = {
        old_name: object_json(ACCEPTED_COMMIT, f"{BASE_ROOT}/{old_name}")
        for old_name, _ in LEAF_TRANSITIONS
    }
    leaves = {
        new_name: deepcopy(baselines[old_name])
        for old_name, new_name in LEAF_TRANSITIONS
    }
    allowlist = object_json(G131_COMMIT, G131_ALLOWLIST, canonical_required=True)
    supersession = authority["supersession"]
    apply_propagation(leaves, allowlist)
    codomain = supersession["mappingArtifactFamilyCodomain"]
    add_report_correction(leaves["validator-binding-matrix-v1.3.1.json"], codomain)
    add_validator_corrections(
        leaves["validator-registry-v1.3.1.json"],
        leaves["validator-binding-matrix-v1.3.1.json"],
        codomain,
        supersession["replacementRowSchema"],
        authority["mappingRowsDigest"],
    )
    build_lifecycle_mapping(
        leaves["artifact-lifecycle-contract-v1.3.1.json"],
        leaves["validator-binding-matrix-v1.3.1.json"],
        supersession,
        authority["mappingRowsDigest"],
    )
    add_differential_corrections(
        leaves["differential-test-matrix-v1.3.1.json"],
        leaves["validator-binding-matrix-v1.3.1.json"],
        leaves,
    )
    guard_count = verify_historical_guards(leaves, allowlist)
    diff_ledger, classification_counts = semantic_diff_ledger(baselines, leaves, allowlist)
    if guard_count != 71:
        raise AuthoringError("historical guard count mismatch")
    return leaves, diff_ledger, classification_counts


def build_outputs(authority: dict[str, Any], script_bytes: bytes) -> dict[str, bytes]:
    leaves, diff_ledger, classification_counts = build_leaves(authority)
    population = authority["supersession"]["populationCounts"]
    actual_counts = {
        "closureBindings": 20,
        "closureFamilies": len(leaves["closure-contract-v1.3.1.json"]["families"]),
        "differentialCases": len(leaves["differential-test-matrix-v1.3.1.json"]["v13DeltaCases"]),
        "durableOutputs": len(leaves["durable-output-disposition-v1.3.1.json"]["outputs"]),
        "globalBindings": 11,
        "globalDifferentialCases": 44,
        "globalInapplicableCases": 11,
        "lifecycleArtifactFamilies": len({artifact["family"]["value"] for artifact in leaves["artifact-lifecycle-contract-v1.3.1.json"]["artifacts"]}),
        "lifecycleArtifacts": len(leaves["artifact-lifecycle-contract-v1.3.1.json"]["artifacts"]),
        "lifecycleBindings": 845,
        "lifecycleDimensions": len(leaves["artifact-lifecycle-contract-v1.3.1.json"]["dimensionOrder"]),
        "normativeLeaves": 7,
        "procedureCapabilityMappingRows": 17,
        "provenanceRows": len(leaves["derivability-provenance-matrix-v1.3.1.json"]["rows"]),
        "publicEvidenceFacts": 168,
        "publicEvidenceSources": 18,
        "totalBindings": len(leaves["validator-binding-matrix-v1.3.1.json"]["bindings"]),
        "validators": len(leaves["validator-registry-v1.3.1.json"]["validators"]),
    }
    if actual_counts != population:
        raise AuthoringError(f"population drift: {actual_counts}")

    output_bytes = {name: canonical_file(leaves[name]) for name in LEAF_NAMES}
    aggregate = member_aggregate(output_bytes)
    manifest = {
        "aggregate": {
            "algorithm": "sha256",
            "digest": aggregate,
            "domain": "trellis-accepted-v13-pack-members\\0",
            "framing": "ordered filename UTF-8, NUL, exact member bytes, NUL",
        },
        "candidateStatus": "unaccepted-author-candidate",
        "contractIdentity": "evaluation-contract-v1.3.1",
        "memberCount": 7,
        "members": [
            {
                "byteLength": len(output_bytes[name]),
                "filename": name,
                "sha256": sha256(output_bytes[name]),
            }
            for name in LEAF_NAMES
        ],
        "recordKind": "contract-candidate-manifest-v1.3.1",
        "schemaVersion": 1,
    }
    manifest_bytes = canonical_file(manifest)
    output_bytes[EVIDENCE_NAMES[0]] = manifest_bytes

    frozen_target = {
        "acceptedBaseline": {
            "contractIdentity": "evaluation-contract-v1.3.0",
            "memberAggregate": authority["assignment"]["semanticContinuity"]["acceptedMemberAggregate"],
            "semanticDigest": authority["assignment"]["semanticContinuity"]["acceptedSemanticDigest"],
            "subjectCommit": ACCEPTED_COMMIT,
        },
        "candidateManifest": {
            "filename": EVIDENCE_NAMES[0],
            "sha256": sha256(manifest_bytes),
        },
        "candidateMemberAggregate": aggregate,
        "candidateStatus": "unaccepted-pending-independent-assurance",
        "contractIdentity": "evaluation-contract-v1.3.1",
        "governance": {
            "a11Commit": A11_COMMIT,
            "a1320Commit": A1320_COMMIT,
            "g131Commit": G131_COMMIT,
            "g132Commit": G132_COMMIT,
            "procedureEvidenceCommit": PROCEDURE_COMMIT,
        },
        "recordKind": "frozen-semantic-target-v1.3.1",
        "schemaVersion": 1,
    }
    frozen_bytes = canonical_file(frozen_target)
    semantic_digest = f"sha256:{sha256(frozen_bytes)}"
    output_bytes[EVIDENCE_NAMES[1]] = frozen_bytes

    correction_ledger = {
        "contractIdentity": "evaluation-contract-v1.3.1",
        "findingCount": 4,
        "findings": [
            {
                "findingId": "CS6-1-CONTRACT-001",
                "leafPaths": ["validator-binding-matrix-v1.3.1.json"],
                "proof": "complete closed report-v2 schema, byte rules, ordering, nullability, and digest construction",
                "status": "corrected",
            },
            {
                "findingId": "CS6-1-CONTRACT-002",
                "leafPaths": ["validator-registry-v1.3.1.json"],
                "proof": "20 closed fact schemas, authenticated derivations, applicability predicates, predicates, decision tables, and ordered findings",
                "status": "corrected",
            },
            {
                "findingId": "CS6-1-CONTRACT-003",
                "leafPaths": ["differential-test-matrix-v1.3.1.json"],
                "proof": "44 embedded fixtures and executable mutations plus 11 exact inapplicability predicates",
                "status": "corrected",
            },
            {
                "findingId": "CS6-1-CONTRACT-004",
                "leafPaths": ["artifact-lifecycle-contract-v1.3.1.json", "validator-registry-v1.3.1.json"],
                "proof": "G132-fixed 17-row tagged mapping and complete 14,365-decision lifecycle matrix",
                "status": "corrected-by-g132-narrow-supersession",
            },
        ],
        "historicalAttemptAmended": False,
        "noFifthSemanticChange": True,
        "recordKind": "four-finding-correction-ledger-v1.3.1",
        "schemaVersion": 1,
    }
    output_bytes[EVIDENCE_NAMES[2]] = canonical_file(correction_ledger)
    output_bytes[EVIDENCE_NAMES[3]] = canonical_file(diff_ledger)

    corpus = assurance_corpus(leaves, diff_ledger)
    output_bytes[EVIDENCE_NAMES[4]] = canonical_file(corpus)
    adversarial = adversarial_results(leaves, diff_ledger, corpus)
    lifecycle_matrix = leaves["artifact-lifecycle-contract-v1.3.1.json"]["procedureCapabilityArtifactFamilyMapping"]["completeLifecycleMatrix"]
    validation = {
        "adversarialTests": {
            "allRejectedAsExpected": True,
            "count": len(adversarial),
            "results": adversarial,
        },
        "authorityAuthentication": {
            "a1320Commit": A1320_COMMIT,
            "a1320Tree": A1320_TREE,
            "g132Commit": G132_COMMIT,
            "immutableGitObjectsOnly": True,
            "verifiedRecordCount": authority["verifiedRecordCount"],
        },
        "candidateManifestSha256": sha256(manifest_bytes),
        "classificationCounts": classification_counts,
        "contractIdentity": "evaluation-contract-v1.3.1",
        "generation": {
            "byteIdentical": True,
            "cleanGenerationCount": 2,
            "outputCount": 15,
        },
        "historicalReferenceGuards": {
            "baselineDirectRegionEvSrcReferences": 0,
            "decReferenceCount": 71,
            "preserved": True,
        },
        "lifecycleMatrix": {
            key: lifecycle_matrix[key]
            for key in (
                "lifecycleBindingsPerRow",
                "mappingRows",
                "negativeDecisions",
                "notApplicablePositiveDecisions",
                "notApplicableRows",
                "positiveDecisions",
                "totalDecisions",
            )
        },
        "populationCounts": actual_counts,
        "recordKind": "a132-author-validation",
        "schemaVersion": 1,
        "semanticDigest": semantic_digest,
        "semanticDiffRowCount": diff_ledger["rowCount"],
        "sevenMemberAggregate": aggregate,
        "verdict": "pass",
        "writeScope": f"{OUTPUT_ROOT}/{{exact-15-file-allowlist}}",
    }
    output_bytes[EVIDENCE_NAMES[5]] = canonical_file(validation)
    del script_bytes
    return output_bytes


def build_complete_output_set(authority: dict[str, Any], script_bytes: bytes) -> dict[str, bytes]:
    outputs = build_outputs(authority, script_bytes)
    outputs[SCRIPT_NAME] = script_bytes
    manifest_records = []
    for name in OUTPUT_NAMES:
        if name == OUTPUT_MANIFEST_NAME:
            continue
        data = outputs[name]
        manifest_records.append(
            {
                "byteLength": len(data),
                "path": f"{OUTPUT_ROOT}/{name}",
                "sha256": sha256(data),
            }
        )
    output_manifest = {
        "contractIdentity": "evaluation-contract-v1.3.1",
        "excludedOwnHash": True,
        "outputCountExcludingManifest": 14,
        "outputs": manifest_records,
        "recordKind": "author-output-manifest-v1.3.1",
        "schemaVersion": 1,
        "subjectGitTree": None,
    }
    outputs[OUTPUT_MANIFEST_NAME] = canonical_file(output_manifest)
    if set(outputs) != set(OUTPUT_NAMES):
        raise AuthoringError("generated output inventory mismatch")
    return outputs


def output_set_digest(outputs: dict[str, bytes]) -> str:
    digest = hashlib.sha256()
    digest.update(b"trellis-a132-output-set-v1\0")
    for name in OUTPUT_NAMES:
        digest.update(name.encode("utf-8"))
        digest.update(b"\0")
        digest.update(outputs[name])
        digest.update(b"\0")
    return f"sha256:{digest.hexdigest()}"


def verify_two_generations(authority: dict[str, Any], script_bytes: bytes) -> dict[str, bytes]:
    first = build_complete_output_set(authority, script_bytes)
    second = build_complete_output_set(authority, script_bytes)
    if first != second:
        raise AuthoringError("two clean generations are not byte-identical")
    return first


def restore_generated_outputs(originals: dict[str, bytes | None]) -> None:
    with tempfile.TemporaryDirectory(prefix="trellis-a132-rollback-") as temporary:
        stage = Path(temporary)
        for name, data in originals.items():
            destination = RESEARCH / name
            if data is None:
                destination.unlink(missing_ok=True)
                continue
            staged = stage / name
            staged.write_bytes(data)
            os.replace(staged, destination)


def write_outputs(outputs: dict[str, bytes]) -> dict[str, bytes | None]:
    generated_names = [name for name in OUTPUT_NAMES if name != SCRIPT_NAME]
    originals = {
        name: (RESEARCH / name).read_bytes() if (RESEARCH / name).is_file() else None
        for name in generated_names
    }
    try:
        with tempfile.TemporaryDirectory(prefix="trellis-a132-") as temporary:
            stage = Path(temporary)
            for name in generated_names:
                path = stage / name
                path.write_bytes(outputs[name])
                if path.read_bytes() != outputs[name]:
                    raise AuthoringError(f"temporary write mismatch: {name}")
            for name in generated_names:
                os.replace(stage / name, RESEARCH / name)
    except BaseException:
        restore_generated_outputs(originals)
        raise
    return originals


def source_bytes(subject: str | None, name: str) -> bytes:
    if subject is None:
        return (RESEARCH / name).read_bytes()
    return object_bytes(subject, f"{OUTPUT_ROOT}/{name}")


def verify_subject_boundary(subject: str) -> None:
    parents = git_text("show", "-s", "--format=%P", subject).strip().split()
    if parents != [A1320_COMMIT]:
        raise AuthoringError("committed A132-1 subject parent mismatch")
    changed = git_text("diff-tree", "--no-commit-id", "--name-only", "-r", subject).splitlines()
    expected = [f"{OUTPUT_ROOT}/{name}" for name in OUTPUT_NAMES]
    if sorted(changed) != sorted(expected):
        raise AuthoringError("committed A132-1 subject path boundary mismatch")


def verify_outputs(authority: dict[str, Any], subject: str | None) -> dict[str, Any]:
    if subject is not None:
        verify_subject_boundary(subject)
    script_bytes = source_bytes(subject, SCRIPT_NAME)
    expected = verify_two_generations(authority, script_bytes)
    actual = {name: source_bytes(subject, name) for name in OUTPUT_NAMES}
    for name in OUTPUT_NAMES:
        if actual[name] != expected[name]:
            raise AuthoringError(f"generated output mismatch: {name}")
        if name.endswith(".json"):
            strict_json(actual[name], canonical_required=True)
        elif b"\r" in actual[name] or not actual[name].endswith(b"\n"):
            raise AuthoringError(f"script framing mismatch: {name}")
    manifest = strict_json(actual["contract-candidate-manifest-v1.3.1.json"], canonical_required=True)
    validation = strict_json(actual["author-validation.json"], canonical_required=True)
    hashes = {name: sha256(actual[name]) for name in OUTPUT_NAMES}
    return {
        "adversarialTestCount": validation["adversarialTests"]["count"],
        "candidateManifestSha256": hashes["contract-candidate-manifest-v1.3.1.json"],
        "fileHashes": hashes,
        "generationCount": 2,
        "lifecycleMatrix": validation["lifecycleMatrix"],
        "outputCount": len(actual),
        "outputSetDigest": output_set_digest(actual),
        "semanticDigest": validation["semanticDigest"],
        "semanticDiffRowCount": validation["semanticDiffRowCount"],
        "sevenMemberAggregate": manifest["aggregate"]["digest"],
        "verdict": "pass",
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--write", action="store_true", help="write the 14 generated files beside this script")
    mode.add_argument("--verify", action="store_true", help="verify the worktree 15-file output set")
    parser.add_argument("--subject", help="verify an immutable committed A132-1 subject")
    args = parser.parse_args()
    if args.write and args.subject:
        parser.error("--subject is valid only with --verify")
    authority = authenticate_inputs(check_worktree=args.subject is None)
    originals: dict[str, bytes | None] | None = None
    if args.write:
        script_bytes = Path(__file__).read_bytes()
        outputs = verify_two_generations(authority, script_bytes)
        originals = write_outputs(outputs)
    try:
        result = verify_outputs(authority, args.subject)
    except BaseException:
        if originals is not None:
            restore_generated_outputs(originals)
        raise
    sys.stdout.write(json.dumps(result, ensure_ascii=False, sort_keys=True) + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
