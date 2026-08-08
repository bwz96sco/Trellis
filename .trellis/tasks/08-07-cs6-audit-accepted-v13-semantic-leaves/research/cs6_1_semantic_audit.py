#!/usr/bin/env python3
"""Deterministic CS6-1 semantic audit over exact committed A3 v1.3 leaves."""
from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import re
import subprocess
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

REPO = Path(__file__).resolve().parents[4]
TASK_REL = Path(".trellis/tasks/08-07-cs6-audit-accepted-v13-semantic-leaves")
TASK = REPO / TASK_REL
RESEARCH = TASK / "research"
A3_REL = Path(".trellis/tasks/08-04-author-evaluation-contract-v1-3-attempt-3/research")
CS5_LEDGER_REL = Path(".trellis/tasks/08-06-cs5-assure-complete-system-mal1-attempt-10/research/accepted-member-ledger.json")
ASSIGNMENT = RESEARCH / "cs6-1-independent-auditor-assignment.json"
PRE_SNAPSHOT = RESEARCH / "pre-audit-scope-snapshot.json"
MEMBER_NAMES = [
    "durable-output-disposition-v1.3.json",
    "artifact-lifecycle-contract-v1.3.json",
    "validator-registry-v1.3.json",
    "validator-binding-matrix-v1.3.json",
    "differential-test-matrix-v1.3.json",
    "derivability-provenance-matrix-v1.3.json",
    "closure-contract-v1.3.json",
]
SUPPORT_NAMES = [
    "public-evidence-index-v1.3.json",
    "normative-decision-ledger-v1.3.json",
    "contract-candidate-manifest-v1.3.json",
    "frozen-migration-target-v1.3.json",
]
EXPECTED_AUTHORITY_KEYS = [
    "humanReviewed",
    "humanEquivalent",
    "repairAuthority",
    "completeSystemMachineAssuranceAccepted",
    "operatorDecisionReceived",
    "activationAuthorized",
    "archiveAuthorized",
    "releaseAuthorized",
    "publicationAuthorized",
    "pushAuthorized",
]
AUTHORITY_FALSE = {key: False for key in EXPECTED_AUTHORITY_KEYS}
DATE = "2026-08-08"
CONTRACT = "evaluation-contract-v1.3.0"
AGGREGATE_DOMAIN = b"trellis-accepted-v13-pack-members\0"
GLOBAL_MUTATION_RE = re.compile(r"^global:[a-z0-9-]+:(positive|base|critical-negative|inapplicable)$")


class AuditError(RuntimeError):
    pass


class DuplicateKeyError(ValueError):
    pass


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def false_authority() -> dict[str, bool]:
    return dict(AUTHORITY_FALSE)


def reject_constant(value: str) -> None:
    raise ValueError(f"non-JSON numeric constant: {value}")


def reject_duplicates(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise DuplicateKeyError(f"duplicate JSON key: {key}")
        result[key] = value
    return result


def strict_load_bytes(data: bytes, label: str) -> Any:
    try:
        text = data.decode("utf-8", errors="strict")
        return json.loads(
            text,
            object_pairs_hook=reject_duplicates,
            parse_constant=reject_constant,
        )
    except (UnicodeDecodeError, json.JSONDecodeError, DuplicateKeyError, ValueError) as exc:
        raise AuditError(f"strict JSON parse failed for {label}: {exc}") from exc


def strict_load_path(path: Path) -> Any:
    return strict_load_bytes(path.read_bytes(), path.relative_to(REPO).as_posix())


def canonical_json_bytes(value: Any) -> bytes:
    return (
        json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        + "\n"
    ).encode("utf-8")


def git(args: list[str], *, text: bool = False, cwd: Path = REPO) -> bytes | str:
    completed = subprocess.run(
        ["git", "-c", "i18n.logOutputEncoding=UTF-8", *args],
        cwd=cwd,
        capture_output=True,
        text=text,
        encoding="utf-8" if text else None,
        errors="replace" if text else None,
        check=False,
    )
    if completed.returncode != 0:
        stderr = completed.stderr if text else completed.stderr.decode("utf-8", errors="replace")
        raise AuditError(f"git {' '.join(args)} failed: {stderr.strip()}")
    return completed.stdout


def git_blob(commit: str, rel: str | Path) -> bytes:
    path = rel.as_posix() if isinstance(rel, Path) else rel
    output = git(["show", f"{commit}:{path}"], text=False)
    assert isinstance(output, bytes)
    return output


def json_pointer_get(document: Any, pointer: str) -> Any:
    if pointer == "":
        return document
    if not pointer.startswith("/"):
        raise AuditError(f"invalid JSON pointer: {pointer}")
    current = document
    for raw in pointer[1:].split("/"):
        token = raw.replace("~1", "/").replace("~0", "~")
        if isinstance(current, list):
            current = current[int(token)]
        elif isinstance(current, dict):
            current = current[token]
        else:
            raise AuditError(f"pointer traverses scalar: {pointer}")
    return current


def pointer_escape(token: str) -> str:
    return token.replace("~", "~0").replace("/", "~1")


def walk_normative(value: Any, pointer: str = "") -> list[tuple[str, dict[str, Any]]]:
    found: list[tuple[str, dict[str, Any]]] = []
    if isinstance(value, dict):
        if "provenance" in value and "value" in value and isinstance(value["provenance"], dict):
            found.append((pointer, value))
            return found
        for key, child in value.items():
            found.extend(walk_normative(child, f"{pointer}/{pointer_escape(key)}"))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            found.extend(walk_normative(child, f"{pointer}/{index}"))
    return found


def value_of(value: Any) -> Any:
    if isinstance(value, dict) and "provenance" in value and "value" in value:
        return value["value"]
    return value


def sorted_counter(counter: Counter[Any]) -> dict[str, int]:
    return {str(key): counter[key] for key in sorted(counter, key=lambda item: str(item))}


def write_json(path: Path, value: Any) -> None:
    path.write_bytes(canonical_json_bytes(value))


def check(condition: bool, check_id: str, details: Any, checks: list[dict[str, Any]]) -> None:
    checks.append({"checkId": check_id, "passed": bool(condition), "details": details})


def tree_entries(path: Path) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    if not path.exists():
        return entries
    for file_path in sorted(item for item in path.rglob("*") if item.is_file() and ".git" not in item.parts):
        data = file_path.read_bytes()
        entries.append(
            {
                "path": file_path.relative_to(REPO).as_posix(),
                "byteLength": len(data),
                "sha256": sha256(data),
            }
        )
    return entries


def verify_pre_snapshot(snapshot: dict[str, Any]) -> dict[str, Any]:
    results: list[dict[str, Any]] = []
    for item in snapshot["inheritedFiles"]:
        path = REPO / item["path"]
        actual = {"byteLength": path.stat().st_size, "sha256": sha256(path.read_bytes())}
        results.append({"path": item["path"], "expected": {"byteLength": item["byteLength"], "sha256": item["sha256"]}, "actual": actual, "matches": actual["byteLength"] == item["byteLength"] and actual["sha256"] == item["sha256"]})
    assignment_item = snapshot["assignmentRecord"]
    assignment_path = REPO / assignment_item["path"]
    assignment_actual = {"byteLength": assignment_path.stat().st_size, "sha256": sha256(assignment_path.read_bytes())}
    assignment_matches = assignment_actual["byteLength"] == assignment_item["byteLength"] and assignment_actual["sha256"] == assignment_item["sha256"]
    submodule_results: list[dict[str, Any]] = []
    for item in snapshot["submodules"]:
        path = REPO / item["path"]
        worktree_commit = str(git(["rev-parse", "HEAD"], text=True, cwd=path)).strip()
        status = str(git(["status", "--short"], text=True, cwd=path)).strip().splitlines()
        submodule_results.append({"path": item["path"], "worktreeCommit": worktree_commit, "statusShort": status, "matches": worktree_commit == item["worktreeCommit"] and status == item["statusShort"]})
    cs5_tree = tree_entries(REPO / ".trellis/tasks/08-06-cs5-decide-complete-system-attempt-10/research")
    return {
        "inheritedFiles": results,
        "inheritedFilesUnchanged": all(item["matches"] for item in results),
        "assignmentRecord": {"expected": assignment_item, "actual": assignment_actual, "matches": assignment_matches},
        "submodules": submodule_results,
        "submodulesUnchanged": all(item["matches"] for item in submodule_results),
        "untrackedCs5DecisionTreeMatches": cs5_tree == snapshot["untrackedCs5DecisionTree"],
    }


def build_audit() -> dict[str, Any]:
    assignment = strict_load_path(ASSIGNMENT)
    ledger = strict_load_path(REPO / CS5_LEDGER_REL)
    pre_snapshot = strict_load_path(PRE_SNAPSHOT)
    source_commit = ledger["subjectCommit"]
    authoring_commit = str(git(["log", "-1", "--format=%H", source_commit, "--", (A3_REL / MEMBER_NAMES[0]).as_posix()], text=True)).strip()
    expected_digest = assignment["auditInputs"]["semanticDigest"]
    expected_aggregate = assignment["auditInputs"]["memberAggregate"]
    current_head = str(git(["rev-parse", "HEAD"], text=True)).strip()

    if assignment["assignmentId"] != "cs6-1-auditor-20260808-a":
        raise AuditError("assignment identity mismatch")
    if assignment["assignedRole"] != "independent-semantic-auditor":
        raise AuditError("assignment role mismatch")
    if assignment["independenceBasis"]["ownedWriteScope"] != f"{TASK_REL.as_posix()}/research/**":
        raise AuditError("assignment write scope mismatch")
    if assignment["authority"] != AUTHORITY_FALSE:
        raise AuditError("assignment authority flags are not all false")

    duplicate_rejection = False
    try:
        strict_load_bytes(b'{"duplicate":1,"duplicate":2}', "duplicate-key-self-test")
    except AuditError:
        duplicate_rejection = True
    if not duplicate_rejection:
        raise AuditError("duplicate-key rejection self-test failed")

    docs: dict[str, Any] = {}
    member_attestations: list[dict[str, Any]] = []
    aggregate = hashlib.sha256(AGGREGATE_DOMAIN)
    ledger_members = {item["path"]: item for item in ledger["members"]}
    exact_mismatch = False
    for name in MEMBER_NAMES:
        rel = A3_REL / name
        committed = git_blob(source_commit, rel)
        head_blob = git_blob(current_head, rel)
        worktree = (REPO / rel).read_bytes()
        parsed = strict_load_bytes(committed, f"{source_commit}:{rel.as_posix()}")
        docs[name] = parsed
        actual_hash = sha256(committed)
        actual_length = len(committed)
        expected = ledger_members[name]
        canonical = canonical_json_bytes(parsed) == committed
        item_matches = (
            actual_hash == expected["sha256"]
            and actual_length == expected["byteLength"]
            and head_blob == committed
            and worktree == committed
            and canonical
        )
        exact_mismatch = exact_mismatch or not item_matches
        member_attestations.append(
            {
                "path": rel.as_posix(),
                "ledgerPath": name,
                "byteLength": actual_length,
                "expectedByteLength": expected["byteLength"],
                "sha256": actual_hash,
                "expectedSha256": expected["sha256"],
                "strictJsonParsed": True,
                "duplicateKeysAbsent": True,
                "canonicalUtf8SortedCompactOneFinalLf": canonical,
                "headBlobMatchesAcceptedCommit": head_blob == committed,
                "worktreeMatchesAcceptedCommit": worktree == committed,
                "matches": item_matches,
            }
        )
        aggregate.update(name.encode("utf-8"))
        aggregate.update(b"\0")
        aggregate.update(committed)
        aggregate.update(b"\0")

    aggregate_value = f"sha256:{aggregate.hexdigest()}"
    if aggregate_value != expected_aggregate or aggregate_value != ledger["aggregateExpected"]:
        exact_mismatch = True

    support: dict[str, Any] = {}
    for name in SUPPORT_NAMES:
        data = git_blob(source_commit, A3_REL / name)
        support[name] = strict_load_bytes(data, f"{source_commit}:{(A3_REL / name).as_posix()}")
    manifest_bytes = git_blob(source_commit, A3_REL / "contract-candidate-manifest-v1.3.json")
    target_bytes = git_blob(source_commit, A3_REL / "frozen-migration-target-v1.3.json")
    manifest_hash = sha256(manifest_bytes)
    semantic_digest = f"sha256:{sha256(target_bytes)}"
    target = support["frozen-migration-target-v1.3.json"]
    manifest = support["contract-candidate-manifest-v1.3.json"]
    manifest_members = {item["filename"]: item for item in manifest["members"]}
    seven_manifest_matches = all(
        name in manifest_members
        and manifest_members[name]["sha256"] == ledger_members[name]["sha256"]
        and manifest_members[name]["byteLength"] == ledger_members[name]["byteLength"]
        for name in MEMBER_NAMES
    )
    semantic_matches = (
        semantic_digest == expected_digest
        and target["candidateManifest"]["sha256"] == manifest_hash
        and seven_manifest_matches
    )
    exact_mismatch = exact_mismatch or not semantic_matches

    exact_input_attestation = {
        "schemaVersion": 1,
        "recordKind": "cs6-1-exact-input-attestation",
        "date": DATE,
        "assignmentId": assignment["assignmentId"],
        "assignedRole": assignment["assignedRole"],
        "ownedWriteScope": assignment["independenceBasis"]["ownedWriteScope"],
        "source": {
            "acceptedA3Task": A3_REL.parent.as_posix(),
            "cs5Ledger": CS5_LEDGER_REL.as_posix(),
            "acceptedCommit": source_commit,
            "acceptedA3AuthoringCommit": authoring_commit,
            "currentHead": current_head,
            "readSource": "git committed blobs from CS5 ledger subjectCommit",
            "procedurePackageCopiesUsed": False,
            "runtimeProjectionUsed": False,
            "privateSourceUsed": False,
            "externalNetworkOrModelCallsUsed": False,
        },
        "strictJson": {
            "utf8Strict": True,
            "duplicateKeyRejection": True,
            "nonFiniteNumberRejection": True,
            "duplicateKeySelfTestPassed": duplicate_rejection,
        },
        "memberCount": len(member_attestations),
        "members": member_attestations,
        "aggregate": {
            "domain": "sha256(domain trellis-accepted-v13-pack-members\\0 + ordered path\\0bytes\\0)",
            "orderedMemberNames": MEMBER_NAMES,
            "actual": aggregate_value,
            "expected": expected_aggregate,
            "matches": aggregate_value == expected_aggregate,
        },
        "semanticDigest": {
            "role": "sha256 of exact frozen-migration-target-v1.3.json committed bytes; separate from seven-member aggregate",
            "actual": semantic_digest,
            "expected": expected_digest,
            "matches": semantic_matches,
            "candidateManifestSha256": manifest_hash,
            "targetBindsManifest": target["candidateManifest"]["sha256"] == manifest_hash,
            "manifestBindsAllSevenLedgerMembers": seven_manifest_matches,
        },
        "exactInputMismatch": exact_mismatch,
        "status": "fail" if exact_mismatch else "pass",
        "authority": false_authority(),
    }

    durable = docs["durable-output-disposition-v1.3.json"]
    lifecycle = docs["artifact-lifecycle-contract-v1.3.json"]
    registry = docs["validator-registry-v1.3.json"]
    bindings_doc = docs["validator-binding-matrix-v1.3.json"]
    differential = docs["differential-test-matrix-v1.3.json"]
    provenance = docs["derivability-provenance-matrix-v1.3.json"]
    closure = docs["closure-contract-v1.3.json"]

    checks: list[dict[str, Any]] = []
    outputs = durable["outputs"]
    artifacts = lifecycle["artifacts"]
    validators = registry["validators"]
    bindings = bindings_doc["bindings"]
    cases = differential["v13DeltaCases"]
    prov_rows = provenance["rows"]
    closure_families = closure["families"]

    output_ids = [item["outputId"] for item in outputs]
    artifact_ids = [item["artifactId"] for item in artifacts]
    binding_ids = [item["bindingId"] for item in bindings]
    rule_ids = [item["ruleId"] for item in bindings]
    case_ids = [item["caseId"] for item in cases]
    validator_keys = [
        (value_of(item["identity"])["id"], value_of(item["identity"])["version"])
        for item in validators
    ]
    validator_by_key = {key: item for key, item in zip(validator_keys, validators)}
    binding_by_id = {item["bindingId"]: item for item in bindings}

    check(len(outputs) == 64, "durable-output-count", len(outputs), checks)
    check(len(set(output_ids)) == 64, "durable-output-id-uniqueness", len(set(output_ids)), checks)
    family_counts = Counter(value_of(item["family"]) for item in outputs)
    check(dict(sorted(family_counts.items())) == dict(sorted(durable["familyTotals"].items())), "durable-family-totals", sorted_counter(family_counts), checks)
    omission_count = sum(bool(item["omittedByLater50"]) for item in outputs)
    check(omission_count == durable["later50OmissionCount"] == 14, "durable-later50-omission-count", omission_count, checks)
    disposition_counts = Counter(value_of(item["disposition"]) for item in outputs)
    check(set(disposition_counts).issubset(set(durable["allowedDispositions"])), "durable-disposition-enum", sorted_counter(disposition_counts), checks)

    enforceable_outputs = [item for item in outputs if value_of(item["disposition"]) in {"include", "pattern"}]
    non_enforceable_outputs = [item for item in outputs if value_of(item["disposition"]) in {"container", "alias", "blocked-by-contract"}]
    source_artifacts = [item for item in artifacts if value_of(item["sourceKind"]) == "public-durable-output"]
    control_artifacts = [item for item in artifacts if value_of(item["sourceKind"]) == "v1.3-control-artifact"]
    enforceable_source_ids = {item["outputId"] for item in enforceable_outputs}
    lifecycle_source_ids = {item["sourceOutputId"] for item in source_artifacts}
    check(len(artifacts) == lifecycle["enforceableArtifactCount"] == 65, "lifecycle-artifact-count", len(artifacts), checks)
    check(len(set(artifact_ids)) == 65, "lifecycle-artifact-id-uniqueness", len(set(artifact_ids)), checks)
    check(len(source_artifacts) == 61 and len(control_artifacts) == 4, "lifecycle-source-control-split", {"publicDurable": len(source_artifacts), "control": len(control_artifacts)}, checks)
    check(enforceable_source_ids == lifecycle_source_ids, "durable-to-lifecycle-cross-reference", {"missing": sorted(enforceable_source_ids - lifecycle_source_ids), "extra": sorted(lifecycle_source_ids - enforceable_source_ids)}, checks)
    check(all(item["outputId"] not in lifecycle_source_ids for item in non_enforceable_outputs), "non-material-dispositions-excluded-from-lifecycle", [item["outputId"] for item in non_enforceable_outputs], checks)
    dimension_order = lifecycle["dimensionOrder"]
    check(len(dimension_order) == 13 and len(set(dimension_order)) == 13, "lifecycle-dimension-count", dimension_order, checks)
    dimension_key_errors = [item["artifactId"] for item in artifacts if set(item["dimensions"]) != set(dimension_order)]
    check(not dimension_key_errors, "lifecycle-all-13-dimensions", dimension_key_errors, checks)
    stable_id_inapplicable = sum(item["dimensions"]["stableId"]["provenance"]["class"] == "inapplicable" for item in artifacts)
    check(stable_id_inapplicable == 58, "lifecycle-explicit-stable-id-inapplicability", stable_id_inapplicable, checks)
    terminal_values = [value_of(item["dimensions"]["terminalApplicability"]) for item in artifacts]
    terminal_exact = all(value == {"appliesOn": "every-root-recording-attempt", "familyTerminalInference": False, "resultStatusIndependent": True} for value in terminal_values)
    check(terminal_exact, "lifecycle-terminal-status-independence", terminal_values[0] if terminal_values else None, checks)

    closure_artifact_ids = {value_of(item["closureArtifact"])["artifactId"] for item in closure_families}
    control_artifact_ids = {item["artifactId"] for item in control_artifacts}
    check(closure["applicableFamilies"] == [item["familyId"] for item in closure_families] and len(closure_families) == 4, "closure-family-cardinality-and-order", closure["applicableFamilies"], checks)
    check(closure_artifact_ids == control_artifact_ids, "closure-to-lifecycle-artifact-cross-reference", {"missing": sorted(closure_artifact_ids - control_artifact_ids), "extra": sorted(control_artifact_ids - closure_artifact_ids)}, checks)
    closure_semantics_errors: list[str] = []
    required_closure_fields = {"schemaVersion", "family", "selected", "blocked"}
    for family in closure_families:
        artifact = value_of(family["closureArtifact"])
        schema = artifact["closedSchema"]
        selected = value_of(family["selected"])
        blocked = value_of(family["blocked"])
        cross = value_of(family["crossRelation"])
        if set(schema["required"]) != required_closure_fields or schema.get("additionalProperties") is not False:
            closure_semantics_errors.append(f"{family['familyId']}:schema")
        if selected.get("absence") != "invalid" or selected.get("null") != "invalid" or selected.get("falseEvidence") != "empty-array" or not str(selected.get("trueEvidence", "")).startswith("one-or-more-bound-non-closure"):
            closure_semantics_errors.append(f"{family['familyId']}:selected")
        if blocked.get("absence") != "invalid" or blocked.get("null") != "invalid" or blocked.get("falseEvidence") != "empty-array" or not str(blocked.get("trueEvidence", "")).startswith("one-or-more-bound-non-closure"):
            closure_semantics_errors.append(f"{family['familyId']}:blocked")
        if cross.get("rule") != "exactly-one-true":
            closure_semantics_errors.append(f"{family['familyId']}:xor")
    check(not closure_semantics_errors, "closure-exact-fields-evidence-xor", closure_semantics_errors, checks)
    status_rule = value_of(closure["genericResultStatusInference"])
    check(status_rule == {"allowed": False, "forbiddenPointers": ["/result/status", "/status"], "mapping": None, "stableError": "V13_CLOSURE_STATUS_INFERENCE_FORBIDDEN"}, "closure-generic-result-status-prohibited", status_rule, checks)

    check(len(validators) == 20, "validator-count", len(validators), checks)
    check(len(set(validator_keys)) == 20, "validator-identity-version-uniqueness", len(set(validator_keys)), checks)
    validator_triples: list[dict[str, Any]] = []
    validator_errors: list[str] = []
    for item in validators:
        identity = value_of(item["identity"])
        severity = value_of(item["severity"])
        triple = {"id": identity["id"], "version": identity["version"], "severity": severity["fixed"]}
        validator_triples.append(triple)
        if severity != {"downgradeAllowed": False, "fixed": "critical", "supportPackMayChange": False}:
            validator_errors.append(identity["id"])
    check(not validator_errors, "validator-fixed-critical-severity", validator_errors, checks)

    check(len(bindings) == 876, "binding-count", len(bindings), checks)
    check(len(set(binding_ids)) == 876 and len(set(rule_ids)) == 876, "binding-and-rule-id-uniqueness", {"bindingIds": len(set(binding_ids)), "ruleIds": len(set(rule_ids))}, checks)
    binding_xref_errors: list[dict[str, Any]] = []
    for binding in bindings:
        key = (binding["validator"]["id"], binding["validator"]["version"])
        validator = validator_by_key.get(key)
        if validator is None:
            binding_xref_errors.append({"bindingId": binding["bindingId"], "reason": "unknown-validator"})
            continue
        severity = value_of(validator["severity"])["fixed"]
        applicable_rules = set(value_of(validator["applicableRuleKinds"]))
        stable_errors = set(value_of(validator["stableErrors"]))
        if binding["validator"]["severity"] != severity:
            binding_xref_errors.append({"bindingId": binding["bindingId"], "reason": "severity-mismatch"})
        if binding["ruleKind"] not in applicable_rules:
            binding_xref_errors.append({"bindingId": binding["bindingId"], "reason": "rule-kind-not-registered"})
        if not set(binding["stableErrors"]).issubset(stable_errors):
            binding_xref_errors.append({"bindingId": binding["bindingId"], "reason": "stable-error-not-registered"})
    check(not binding_xref_errors, "all-876-binding-registry-cross-references", binding_xref_errors, checks)

    lifecycle_binding_errors: list[dict[str, Any]] = []
    expected_lifecycle_binding_count = 0
    for artifact in artifacts:
        listed = value_of(artifact["validatorBindingIds"])
        expected_lifecycle_binding_count += len(dimension_order)
        rows = [binding_by_id.get(binding_id) for binding_id in listed]
        if len(listed) != 13 or any(row is None for row in rows):
            lifecycle_binding_errors.append({"artifactId": artifact["artifactId"], "reason": "missing-or-count"})
            continue
        kinds = {row["ruleKind"] for row in rows if row is not None}
        expected_kinds = {f"artifact.{dimension}" for dimension in dimension_order}
        if kinds != expected_kinds or any(row["targetId"] != artifact["artifactId"] for row in rows if row is not None):
            lifecycle_binding_errors.append({"artifactId": artifact["artifactId"], "reason": "kind-or-target"})
    check(not lifecycle_binding_errors and expected_lifecycle_binding_count == 845, "lifecycle-845-binding-coverage", {"expected": expected_lifecycle_binding_count, "errors": lifecycle_binding_errors}, checks)

    closure_binding_errors: list[dict[str, Any]] = []
    for family in closure_families:
        listed = value_of(family["validatorBindingIds"])
        rows = [binding_by_id.get(binding_id) for binding_id in listed]
        expected_kinds = {"closure.schema", "closure.evidence", "closure.xor", "closure.status-inference", "closure.worker-boundary"}
        if len(listed) != 5 or any(row is None for row in rows) or {row["ruleKind"] for row in rows if row is not None} != expected_kinds or any(row["targetId"] != family["familyId"] for row in rows if row is not None):
            closure_binding_errors.append({"family": family["familyId"], "bindingIds": listed})
    check(not closure_binding_errors, "closure-20-binding-coverage", closure_binding_errors, checks)
    global_bindings = [item for item in bindings if not item["ruleKind"].startswith(("artifact.", "closure."))]
    check(len(global_bindings) == 11 and 845 + 20 + 11 == len(bindings), "binding-population-formula", {"lifecycle": 845, "closure": 20, "global": len(global_bindings), "total": len(bindings)}, checks)

    check(len(cases) == 116, "differential-case-count", len(cases), checks)
    check(len(set(case_ids)) == 116, "differential-case-id-uniqueness", len(set(case_ids)), checks)
    cases_by_kind: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for case in cases:
        cases_by_kind[case["ruleKind"]].append(case)
    fixture_set = {"positive", "base", "critical-negative", "inapplicable"}
    differential_shape_errors = [kind for kind, grouped in cases_by_kind.items() if len(grouped) != 4 or {item["fixtureClass"] for item in grouped} != fixture_set]
    check(len(cases_by_kind) == 29 and not differential_shape_errors, "differential-29-rules-x-4-fixtures", {"ruleKindCount": len(cases_by_kind), "errors": differential_shape_errors}, checks)
    differential_xref_errors: list[dict[str, Any]] = []
    for case in cases:
        rows = [binding_by_id.get(binding_id) for binding_id in case["bindingIds"]]
        if any(row is None for row in rows):
            differential_xref_errors.append({"caseId": case["caseId"], "reason": "unknown-binding"})
            continue
        triples = {(row["validator"]["id"], row["validator"]["version"], row["validator"]["severity"]) for row in rows if row is not None}
        case_triple = (case["validator"]["id"], case["validator"]["version"], case["validator"]["severity"])
        if any(row["ruleKind"] != case["ruleKind"] for row in rows if row is not None):
            differential_xref_errors.append({"caseId": case["caseId"], "reason": "rule-kind-mismatch"})
        if triples != {case_triple}:
            differential_xref_errors.append({"caseId": case["caseId"], "reason": "validator-mismatch"})
        if set(case["ruleTargets"]) != {row["targetId"] for row in rows if row is not None}:
            differential_xref_errors.append({"caseId": case["caseId"], "reason": "target-mismatch"})
        if case["fixtureClass"] == "critical-negative":
            if case["expected"] != "fail-closed" or set(case["expectedStableErrors"]) != {error for row in rows if row is not None for error in row["stableErrors"]}:
                differential_xref_errors.append({"caseId": case["caseId"], "reason": "negative-observable-mismatch"})
        elif case["expectedStableErrors"]:
            differential_xref_errors.append({"caseId": case["caseId"], "reason": "nonnegative-stable-errors"})
        if case["fixtureClass"] == "inapplicable" and case["expected"] != "not-run":
            differential_xref_errors.append({"caseId": case["caseId"], "reason": "inapplicable-observable"})
    check(not differential_xref_errors, "all-116-differential-cross-references-and-observables", differential_xref_errors, checks)

    public_index = support["public-evidence-index-v1.3.json"]
    decision_ledger = support["normative-decision-ledger-v1.3.json"]
    evidence_by_id = {item["evidenceId"]: item for item in public_index["facts"]}
    decision_ids = {item["decisionId"] for item in decision_ledger["decisions"]}
    decision_ids.update(item["decisionId"] for item in decision_ledger["conditionalArtifactDecisions"])
    inapplicable_ids = {item["recordId"] for item in decision_ledger["inapplicableRecords"]}
    blocked_ids = {item["recordId"] for item in decision_ledger["blockedRecords"]}

    source_checks: list[dict[str, Any]] = []
    source_documents: dict[str, Any] = {}
    for source in public_index["sources"]:
        data = git_blob(authoring_commit, source["path"])
        matches = len(data) == source["byteLength"] and sha256(data) == source["sha256"]
        citation_media = source["mediaType"]
        if citation_media == "application/json":
            source_documents[source["sourceId"]] = strict_load_bytes(data, f"{source_commit}:{source['path']}")
        elif citation_media == "text/csv":
            text = data.decode("utf-8", errors="strict")
            source_documents[source["sourceId"]] = {"lines": text.splitlines(), "rows": list(csv.DictReader(io.StringIO(text)))}
        else:
            source_documents[source["sourceId"]] = data.decode("utf-8", errors="strict").splitlines()
        source_checks.append({"sourceId": source["sourceId"], "path": source["path"], "sourceCommit": authoring_commit, "byteLength": len(data), "sha256": sha256(data), "matches": matches})
    check(all(item["matches"] for item in source_checks), "public-authority-source-byte-locks", source_checks, checks)

    citation_errors: list[dict[str, Any]] = []
    for fact in public_index["facts"]:
        source_doc = source_documents[fact["sourceId"]]
        citation = fact["citation"]
        try:
            if citation["kind"] == "json-pointer":
                cited = json_pointer_get(source_doc, citation["pointer"])
                if cited != fact["normalizedFact"]:
                    citation_errors.append({"evidenceId": fact["evidenceId"], "reason": "normalized-json-fact-not-exact"})
            elif citation["kind"] == "csv-row":
                row_index = citation["row"] - 2
                if row_index < 0 or row_index >= len(source_doc["rows"]):
                    citation_errors.append({"evidenceId": fact["evidenceId"], "reason": "csv-row-out-of-range"})
                else:
                    row = source_doc["rows"][row_index]
                    if any(str(row.get(key)) != str(value) for key, value in fact["normalizedFact"].items()):
                        citation_errors.append({"evidenceId": fact["evidenceId"], "reason": "normalized-csv-fact-not-subset"})
            elif citation["kind"] == "line-range":
                if citation["startLine"] < 1 or citation["endLine"] < citation["startLine"] or citation["endLine"] > len(source_doc):
                    citation_errors.append({"evidenceId": fact["evidenceId"], "reason": "line-range-out-of-range"})
            else:
                citation_errors.append({"evidenceId": fact["evidenceId"], "reason": "unknown-citation-kind"})
        except (KeyError, IndexError, TypeError, ValueError) as exc:
            citation_errors.append({"evidenceId": fact["evidenceId"], "reason": f"citation-resolution:{exc}"})
    check(not citation_errors, "all-168-public-evidence-citations-resolve", citation_errors, checks)

    pointer_documents = dict(docs)
    pointer_documents.update({
        "normative-decision-ledger-v1.3.json": decision_ledger,
        "frozen-migration-target-v1.3.json": target,
    })
    row_pointer_counts = Counter(item["normativePointer"] for item in prov_rows)
    provenance_errors: list[dict[str, Any]] = []
    inherited_derivation_errors: list[dict[str, Any]] = []
    for row in prov_rows:
        file_name, pointer = row["normativePointer"].split("#", 1)
        document = pointer_documents.get(file_name)
        if document is None:
            provenance_errors.append({"pointer": row["normativePointer"], "reason": "unknown-target-document"})
            continue
        try:
            pointed = json_pointer_get(document, pointer)
        except (KeyError, IndexError, TypeError, ValueError, AuditError) as exc:
            provenance_errors.append({"pointer": row["normativePointer"], "reason": f"unresolved:{exc}"})
            continue
        if row["class"] == "inherited-public-v1.2":
            if row["recordRef"] is not None or not row["evidenceIds"] or any(evidence_id not in evidence_by_id for evidence_id in row["evidenceIds"]):
                provenance_errors.append({"pointer": row["normativePointer"], "reason": "inherited-record-shape"})
                continue
            pointed_value = value_of(pointed)
            facts = [evidence_by_id[evidence_id]["normalizedFact"] for evidence_id in row["evidenceIds"]]
            derived = False
            for fact in facts:
                if pointed_value == fact:
                    derived = True
                elif isinstance(pointed_value, dict) and isinstance(fact, dict) and all(fact.get(key) == value for key, value in pointed_value.items()):
                    derived = True
                elif not isinstance(pointed_value, (dict, list)) and str(pointed_value) in str(fact):
                    derived = True
            if not derived:
                inherited_derivation_errors.append({"pointer": row["normativePointer"], "evidenceIds": row["evidenceIds"], "value": pointed_value})
        elif row["class"] == "trellis-native-v1.3":
            if row["evidenceIds"] or row["recordRef"] not in decision_ids:
                provenance_errors.append({"pointer": row["normativePointer"], "reason": "native-record-ref"})
        elif row["class"] == "inapplicable":
            if row["evidenceIds"] or row["recordRef"] not in inapplicable_ids:
                provenance_errors.append({"pointer": row["normativePointer"], "reason": "inapplicable-record-ref"})
        elif row["class"] == "blocked-by-contract":
            if row["evidenceIds"] or row["recordRef"] not in blocked_ids:
                provenance_errors.append({"pointer": row["normativePointer"], "reason": "blocked-record-ref"})
        else:
            provenance_errors.append({"pointer": row["normativePointer"], "reason": "unknown-provenance-class"})
    check(len(prov_rows) == 3343 and all(count == 1 for count in row_pointer_counts.values()) and not provenance_errors, "all-3343-provenance-rows-resolve-once", {"count": len(prov_rows), "duplicates": sorted(pointer for pointer, count in row_pointer_counts.items() if count != 1), "errors": provenance_errors}, checks)
    check(not inherited_derivation_errors, "all-315-inherited-facts-genuinely-derive-from-declared-evidence", inherited_derivation_errors, checks)

    normative_wrapper_errors: list[dict[str, Any]] = []
    provenance_row_by_pointer = {item["normativePointer"]: item for item in prov_rows}
    for file_name in MEMBER_NAMES:
        if file_name == "derivability-provenance-matrix-v1.3.json":
            continue
        for pointer, wrapper in walk_normative(docs[file_name]):
            full = f"{file_name}#{pointer}"
            row = provenance_row_by_pointer.get(full)
            if row is None:
                normative_wrapper_errors.append({"pointer": full, "reason": "missing-provenance-row"})
                continue
            declared_class = wrapper["provenance"].get("class")
            if row["class"] != declared_class:
                normative_wrapper_errors.append({"pointer": full, "reason": "class-mismatch"})
            declared_ref = wrapper["provenance"].get("decisionId")
            declared_evidence = wrapper["provenance"].get("evidenceIds", [])
            if declared_ref is not None and row["recordRef"] != declared_ref:
                normative_wrapper_errors.append({"pointer": full, "reason": "record-ref-mismatch"})
            if declared_evidence and row["evidenceIds"] != declared_evidence:
                normative_wrapper_errors.append({"pointer": full, "reason": "evidence-id-mismatch"})
    check(not normative_wrapper_errors, "cross-leaf-normative-wrapper-provenance-integrity", normative_wrapper_errors, checks)

    leaf_text = "\n".join(git_blob(source_commit, A3_REL / name).decode("utf-8", errors="strict") for name in MEMBER_NAMES)
    status_authority_absent = (
        value_of(closure["genericResultStatusInference"])["allowed"] is False
        and value_of(closure["genericResultStatusInference"])["mapping"] is None
        and all(value_of(item["dimensions"]["terminalApplicability"])["resultStatusIndependent"] is True for item in artifacts)
        and "completed→selected" not in leaf_text
        and "failed→blocked" not in leaf_text
        and "partial→selected" not in leaf_text
    )
    check(status_authority_absent, "absence-of-generic-result-status-authority", {"genericMapping": value_of(closure["genericResultStatusInference"])["mapping"], "resultStatusIndependentArtifacts": sum(value_of(item["dimensions"]["terminalApplicability"])["resultStatusIndependent"] is True for item in artifacts)}, checks)

    report_contract = bindings_doc["reportV2Contract"]
    report_required = value_of(report_contract["requiredBindings"])
    report_has_closed_schema = any(key in report_contract for key in ("closedSchema", "jsonSchema", "schema"))
    report_schema_defect = not report_has_closed_schema and isinstance(report_required, list)

    generic_fact_pointers: list[str] = []
    for index, validator in enumerate(validators):
        facts_schema = value_of(validator["inputFactSchema"])["properties"]["facts"]
        if facts_schema == {"additionalProperties": True, "minProperties": 1, "type": "object"}:
            generic_fact_pointers.append(f"/validators/{index}/inputFactSchema/value/properties/facts")
    validator_fact_defect = len(generic_fact_pointers) == 20

    global_mutation_pointers = [
        f"/v13DeltaCases/{index}/syntheticMutation"
        for index, case in enumerate(cases)
        if GLOBAL_MUTATION_RE.fullmatch(case["syntheticMutation"])
    ]
    global_inapplicable_pointers = [
        f"/v13DeltaCases/{index}"
        for index, case in enumerate(cases)
        if case["fixtureClass"] == "inapplicable" and GLOBAL_MUTATION_RE.fullmatch(case["syntheticMutation"])
    ]
    differential_definition_defect = len(global_mutation_pointers) == 44 and len(global_inapplicable_pointers) == 11

    authority_snapshot_properties = value_of(validators[0]["inputFactSchema"])["properties"]["authoritySnapshot"]["properties"]
    family_map_declared = any(key in document for document in docs.values() if isinstance(document, dict) for key in ("procedureFamilyMap", "procedureToFamily", "capabilityFamilyMap"))
    artifact_inapplicable_case_pointers = [
        f"/v13DeltaCases/{index}/syntheticMutation"
        for index, case in enumerate(cases)
        if case["fixtureClass"] == "inapplicable" and case["ruleKind"].startswith("artifact.") and case["syntheticMutation"] == "different-exact-procedure-family"
    ]
    applicability_defect = not family_map_declared and "family" not in authority_snapshot_properties and len(artifact_inapplicable_case_pointers) == 13

    findings: list[dict[str, Any]] = []
    if report_schema_defect:
        findings.append(
            {
                "findingId": "CS6-1-CONTRACT-001",
                "classification": "accepted-contract-defect",
                "severity": "critical",
                "file": "validator-binding-matrix-v1.3.json",
                "jsonPointer": "/reportV2Contract",
                "relatedPointers": [
                    "/reportV2Contract/canonicalization/value/unknownKeys",
                    "/reportV2Contract/requiredBindings/value",
                    "/reportV2Contract/digest/value",
                ],
                "reason": "Report v2 lists required binding names and says unknown keys are rejected, but supplies no closed object schema, field types, nested structures, cardinalities, or enums. Multiple incompatible JSON shapes satisfy the same names, so trellis.report.v2-binding@1.0.0 cannot be implemented or independently checked from accepted authority without invention.",
                "ambiguity": True,
                "downstreamAuthorizationBlocked": True,
            }
        )
    if validator_fact_defect:
        findings.append(
            {
                "findingId": "CS6-1-CONTRACT-002",
                "classification": "accepted-contract-defect",
                "severity": "critical",
                "file": "validator-registry-v1.3.json",
                "jsonPointer": "/validators/0/inputFactSchema/value/properties/facts",
                "affectedPointers": generic_fact_pointers,
                "reason": "All 20 validators declare facts only as an arbitrary non-empty object with additionalProperties=true. No rule-specific fact names, types, required fields, or pass/fail predicate are authorized. Exact identities, versions, severities, and stable errors exist, but two trusted implementations can disagree on the same invocation while both conforming to this schema.",
                "ambiguity": True,
                "downstreamAuthorizationBlocked": True,
            }
        )
    if differential_definition_defect:
        findings.append(
            {
                "findingId": "CS6-1-CONTRACT-003",
                "classification": "accepted-contract-defect",
                "severity": "critical",
                "file": "differential-test-matrix-v1.3.json",
                "jsonPointer": global_mutation_pointers[0],
                "affectedPointers": global_mutation_pointers,
                "inapplicableCasePointers": global_inapplicable_pointers,
                "reason": "All 44 global differential cases use only self-referential labels of form global:<rule>:<fixture-class>; they provide no mutation payload, exact field change, fixture reference, or applicability predicate. The 11 global inapplicable cases likewise do not state when global integrity validation is inapplicable. Expected pass/fail/error labels therefore are not independently reproducible obligations.",
                "ambiguity": True,
                "downstreamAuthorizationBlocked": True,
            }
        )
    if applicability_defect:
        findings.append(
            {
                "findingId": "CS6-1-CONTRACT-004",
                "classification": "accepted-contract-defect",
                "severity": "critical",
                "file": "artifact-lifecycle-contract-v1.3.json",
                "jsonPointer": "/artifacts/0/fixtureObligations/value/inapplicable",
                "relatedPointers": [
                    "/artifacts/0/family/value",
                    "/artifacts/0/dimensions/terminalApplicability/value",
                    "validator-registry-v1.3.json#/validators/0/inputFactSchema/value/properties/authoritySnapshot/properties",
                ],
                "affectedDifferentialPointers": artifact_inapplicable_case_pointers,
                "reason": "Lifecycle rules are said to be inapplicable for a different exact Procedure family, while terminalApplicability says every root recording attempt. Accepted leaves define artifact family labels but no Procedure-ID/capability-to-family mapping or family field in validator authoritySnapshot. Root validators cannot deterministically decide whether 845 lifecycle bindings run without importing undeclared package/runtime mapping authority.",
                "ambiguity": True,
                "downstreamAuthorizationBlocked": True,
            }
        )

    accepted_contract_defects = [item for item in findings if item["classification"] == "accepted-contract-defect"]
    implementation_findings = [item for item in findings if item["classification"] == "implementation-conformance-defect"]
    disposition = "contract-defect" if exact_mismatch or accepted_contract_defects else "leaves-sound"

    semantic_domain_reconciliation = {
        "schemaVersion": 1,
        "recordKind": "cs6-1-semantic-domain-reconciliation",
        "date": DATE,
        "contract": CONTRACT,
        "status": "reconciled-with-contract-defects" if accepted_contract_defects else "reconciled",
        "counts": {
            "durableOutputs": len(outputs),
            "durableDispositionCounts": sorted_counter(disposition_counts),
            "durableFamilies": len(family_counts),
            "later50Omissions": omission_count,
            "lifecycleArtifacts": len(artifacts),
            "lifecyclePublicDurableArtifacts": len(source_artifacts),
            "lifecycleControlArtifacts": len(control_artifacts),
            "lifecycleDimensions": len(dimension_order),
            "lifecycleDimensionApplications": len(artifacts) * len(dimension_order),
            "explicitStableIdInapplicability": stable_id_inapplicable,
            "closureFamilies": len(closure_families),
            "validatorTriples": len(validators),
            "bindings": len(bindings),
            "lifecycleBindings": 845,
            "closureBindings": 20,
            "globalBindings": len(global_bindings),
            "provenanceRows": len(prov_rows),
            "inheritedProvenanceRows": sum(item["class"] == "inherited-public-v1.2" for item in prov_rows),
            "nativeProvenanceRows": sum(item["class"] == "trellis-native-v1.3" for item in prov_rows),
            "inapplicableProvenanceRows": sum(item["class"] == "inapplicable" for item in prov_rows),
            "blockedProvenanceRows": sum(item["class"] == "blocked-by-contract" for item in prov_rows),
            "publicEvidenceSources": len(public_index["sources"]),
            "publicEvidenceFacts": len(public_index["facts"]),
            "differentialCases": len(cases),
            "differentialRuleKinds": len(cases_by_kind),
            "differentialFixturesPerRule": 4,
        },
        "validatorTriples": validator_triples,
        "terminalAndClosureBehavior": {
            "nullClosureField": "invalid",
            "partialResultStatus": "no closure authority; explicit closure artifact still required for applicable family; lifecycle validation cannot be bypassed",
            "failedResultStatus": "no closure authority; explicit closure artifact still required for applicable family; lifecycle validation cannot be bypassed",
            "inconclusiveResultStatus": "no closure authority; explicit closure artifact still required for applicable family; lifecycle validation cannot be bypassed",
            "selected": "only explicit /selected/value=true with bound non-closure evidence and /blocked/value=false",
            "blocked": "only explicit /blocked/value=true with bound non-closure evidence and /selected/value=false",
            "selectedBlockedExclusivity": "exactly-one-true",
            "genericResultStatusAuthority": False,
        },
        "structuralChecksPassed": all(item["passed"] for item in checks),
        "acceptedContractDefectCount": len(accepted_contract_defects),
        "implementationConformanceDefectCount": len(implementation_findings),
        "authority": false_authority(),
    }

    cross_leaf_consistency = {
        "schemaVersion": 1,
        "recordKind": "cs6-1-cross-leaf-consistency-audit",
        "date": DATE,
        "contract": CONTRACT,
        "checkCount": len(checks),
        "passedCount": sum(item["passed"] for item in checks),
        "failedCount": sum(not item["passed"] for item in checks),
        "checks": checks,
        "semanticCompletenessChallenges": [item["findingId"] for item in accepted_contract_defects],
        "status": "contract-defect" if accepted_contract_defects else "pass",
        "authority": false_authority(),
    }

    semantic_findings = {
        "schemaVersion": 1,
        "recordKind": "cs6-1-semantic-audit-findings",
        "date": DATE,
        "contract": CONTRACT,
        "classificationRule": "Ambiguity, incompleteness, internal inconsistency, or unauthorizable semantics in accepted leaves is an accepted-contract defect. Runtime/package/harness divergence alone is an implementation-conformance defect.",
        "exactInputMismatch": exact_mismatch,
        "acceptedContractDefectCount": len(accepted_contract_defects),
        "implementationConformanceDefectCount": len(implementation_findings),
        "findings": findings,
        "historicalImplementationDefectsUsedToInvalidateLeaves": False,
        "currentRuntimeUsedAsSemanticOracle": False,
        "privateAuthorityRead": False,
        "downstreamAuthorizationBlocked": exact_mismatch or bool(accepted_contract_defects),
        "authority": false_authority(),
    }

    semantic_audit_plan = {
        "schemaVersion": 1,
        "recordKind": "cs6-1-semantic-audit-plan",
        "date": DATE,
        "assignmentId": assignment["assignmentId"],
        "role": assignment["assignedRole"],
        "scope": "internal read-only semantic audit over exact committed accepted leaves plus declared public/Trellis authority",
        "orderedSteps": [
            "Authenticate assignment and false authority flags.",
            "Read exact seven leaves from CS5-ledger subject commit; strict-parse with duplicate-key rejection.",
            "Recompute seven byte lengths, SHA-256 values, aggregate, manifest binding, and semantic frozen-target digest.",
            "Reconcile 64 durable outputs, 65 lifecycle artifacts, 13 dimensions, four closure families, 20 validator triples, 876 bindings, 3343 provenance rows, and 116 differential cases.",
            "Resolve every cross-reference, provenance record, public source byte lock, and evidence citation.",
            "Challenge semantic completeness without Procedure package substitution, runtime projection, private source, network, or model calls.",
            "Classify findings and emit exactly leaves-sound or contract-defect; preserve all authority flags false.",
            "Verify inherited dirty fingerprints, protected bytes, task validator, and path-scoped diff checks.",
        ],
        "stopRules": {
            "exactInputMismatch": "contract-defect",
            "acceptedContractDefect": "contract-defect and block downstream authorization",
            "implementationConformanceDefectOnly": "may coexist with leaves-sound",
            "repair": "forbidden",
        },
        "authoritativeInputs": [f"{A3_REL.as_posix()}/{name}" for name in MEMBER_NAMES],
        "supportAuthority": [
            f"{A3_REL.as_posix()}/public-evidence-index-v1.3.json",
            f"{A3_REL.as_posix()}/normative-decision-ledger-v1.3.json",
            f"{A3_REL.as_posix()}/contract-candidate-manifest-v1.3.json",
            f"{A3_REL.as_posix()}/frozen-migration-target-v1.3.json",
            CS5_LEDGER_REL.as_posix(),
        ],
        "excludedOracles": ["Procedure package copies", "current runtime projections", "private source bodies", "external network", "external model calls"],
        "authority": false_authority(),
    }

    scope_verification = verify_pre_snapshot(pre_snapshot)
    protected_leaf_drift = [item["path"] for item in member_attestations if not item["worktreeMatchesAcceptedCommit"] or not item["headBlobMatchesAcceptedCommit"]]
    task_validation_run = subprocess.run(
        ["uv", "run", "python", str(REPO / ".trellis/scripts/task.py"), "validate", TASK_REL.as_posix()],
        cwd=REPO, capture_output=True, text=True, encoding="utf-8", errors="replace", check=False,
    )
    path_diff_run = subprocess.run(
        ["git", "diff", "--check", "--", TASK_REL.as_posix()],
        cwd=REPO, capture_output=True, text=True, encoding="utf-8", errors="replace", check=False,
    )
    protected_scopes = [
        ".trellis/tasks/08-04-author-evaluation-contract-v1-3-attempt-3",
        "packages",
        ".trellis/spec",
        ".trellis/tasks/08-06-cs5-assure-complete-system-mal1-attempt-10",
        ".trellis/research",
    ]
    protected_tracked_output = str(git(["diff", "--name-only", "HEAD", "--", *protected_scopes], text=True)).strip().splitlines()
    protected_untracked_output = str(git(["ls-files", "--others", "--exclude-standard", "--", *protected_scopes], text=True)).strip().splitlines()
    protected_diff_output = sorted(set(protected_tracked_output + protected_untracked_output))
    disposition_doc = {
        "schemaVersion": 1,
        "recordKind": "cs6-1-disposition",
        "date": DATE,
        "assignmentId": assignment["assignmentId"],
        "contract": CONTRACT,
        "disposition": disposition,
        "exactInputStatus": exact_input_attestation["status"],
        "acceptedContractDefectCount": len(accepted_contract_defects),
        "implementationConformanceDefectCount": len(implementation_findings),
        "findingIds": [item["findingId"] for item in findings],
        "reason": "Accepted leaves contain semantic ambiguity/incompleteness; downstream authorization stops." if disposition == "contract-defect" else "Exact inputs and complete accepted semantics independently reconciled.",
        "downstreamAuthorization": {
            "cs6_2Authorized": False,
            "laterChildrenAuthorized": False,
            "selfAuthorizesAnyActivation": False,
            "stopRequired": disposition == "contract-defect",
        },
        "scopeVerification": {
            "protectedAcceptedLeafDrift": protected_leaf_drift,
            "inheritedFilesUnchanged": scope_verification["inheritedFilesUnchanged"],
            "assignmentRecordUnchanged": scope_verification["assignmentRecord"]["matches"],
            "submodulesUnchanged": scope_verification["submodulesUnchanged"],
            "untrackedCs5DecisionTreeUnchanged": scope_verification["untrackedCs5DecisionTreeMatches"],
            "details": scope_verification,
        },
        "taskValidator": {
            "command": "uv run python ./.trellis/scripts/task.py validate .trellis/tasks/08-07-cs6-audit-accepted-v13-semantic-leaves",
            "exitCode": task_validation_run.returncode,
            "status": "pass" if task_validation_run.returncode == 0 else "fail",
        },
        "pathScopedDiffCheck": {
            "command": "git diff --check -- .trellis/tasks/08-07-cs6-audit-accepted-v13-semantic-leaves",
            "exitCode": path_diff_run.returncode,
            "output": path_diff_run.stdout + path_diff_run.stderr,
            "status": "pass" if path_diff_run.returncode == 0 else "fail",
        },
        "protectedPathDiffCheck": {
            "scopes": protected_scopes,
            "changedPaths": protected_diff_output,
            "status": "pass" if not protected_diff_output else "fail",
        },
        "noCommitPerformed": True,
        "authority": false_authority(),
    }

    return {
        "exact-input-attestation.json": exact_input_attestation,
        "semantic-audit-plan.json": semantic_audit_plan,
        "semantic-domain-reconciliation.json": semantic_domain_reconciliation,
        "cross-leaf-consistency-audit.json": cross_leaf_consistency,
        "semantic-audit-findings.json": semantic_findings,
        "cs6-1-disposition.json": disposition_doc,
    }


def verify_outputs(expected: dict[str, Any]) -> None:
    failures: list[str] = []
    for name, value in expected.items():
        path = RESEARCH / name
        if not path.exists():
            failures.append(f"missing:{name}")
            continue
        actual = path.read_bytes()
        wanted = canonical_json_bytes(value)
        if actual != wanted:
            failures.append(f"drift:{name}")
        strict_load_bytes(actual, path.relative_to(REPO).as_posix())
    if failures:
        raise AuditError("output verification failed: " + ", ".join(failures))


def assert_verification_gates(expected: dict[str, Any]) -> None:
    failures: list[str] = []
    reconciliation = expected["semantic-domain-reconciliation.json"]
    cross_leaf = expected["cross-leaf-consistency-audit.json"]
    disposition = expected["cs6-1-disposition.json"]
    scope = disposition["scopeVerification"]

    if not reconciliation["structuralChecksPassed"] or cross_leaf["failedCount"] != 0:
        failures.append("structural-checks")
    if disposition["taskValidator"]["status"] != "pass":
        failures.append("task-validator")
    if disposition["pathScopedDiffCheck"]["status"] != "pass":
        failures.append("path-scoped-diff-check")
    if disposition["protectedPathDiffCheck"]["status"] != "pass":
        failures.append("protected-path-drift")
    if scope["protectedAcceptedLeafDrift"]:
        failures.append("accepted-leaf-drift")
    for key in (
        "inheritedFilesUnchanged",
        "assignmentRecordUnchanged",
        "submodulesUnchanged",
        "untrackedCs5DecisionTreeUnchanged",
    ):
        if not scope[key]:
            failures.append(key)

    if failures:
        raise AuditError("verification gates failed: " + ", ".join(failures))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--verify", action="store_true", help="verify deterministic evidence without writing")
    args = parser.parse_args()
    expected = build_audit()
    assert_verification_gates(expected)
    if args.verify:
        verify_outputs(expected)
        print(json.dumps({"ok": True, "mode": "verify", "disposition": expected["cs6-1-disposition.json"]["disposition"], "files": sorted(expected)}, sort_keys=True))
        return 0
    for name, value in expected.items():
        write_json(RESEARCH / name, value)
    verify_outputs(expected)
    print(json.dumps({"ok": True, "mode": "write-and-verify", "disposition": expected["cs6-1-disposition.json"]["disposition"], "files": sorted(expected)}, sort_keys=True))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except AuditError as exc:
        print(f"AUDIT ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
