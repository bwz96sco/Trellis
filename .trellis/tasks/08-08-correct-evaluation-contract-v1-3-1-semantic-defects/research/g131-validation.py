#!/usr/bin/env python3
"""Deterministically validate the exact G131 planning/governance boundary."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import subprocess
import sys
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[4]
CAMPAIGN = ".trellis/tasks/08-08-correct-evaluation-contract-v1-3-1-semantic-defects"
AUTHOR = ".trellis/tasks/08-08-author-evaluation-contract-v1-3-1"
ASSURANCE = ".trellis/tasks/08-08-assure-evaluation-contract-v1-3-1-mal1"
DECISION = ".trellis/tasks/08-08-decide-evaluation-contract-v1-3-1"
PARENT = ".trellis/tasks/07-29-migrate-research-methodology-to-procedures"
EVIDENCE_PATH = f"{CAMPAIGN}/research/g131-validation-evidence.json"
A11_COMMIT = "3534529a36a10ea8015a51f71a93e2b78300a563"
GOVERNANCE_PREDECESSOR = "27403e54fbe317b405400cbc9857a8537598130a"
ACCEPTED_SUBJECT = "916be0a877725f7f91836a3a97e480c1e104e533"
CAMPAIGN_CHILD = "08-08-correct-evaluation-contract-v1-3-1-semantic-defects"

DENIAL_FIELDS = (
    "humanReviewed",
    "humanEquivalent",
    "repairAuthority",
    "runtimeImplementationAuthorized",
    "cliImplementationAuthorized",
    "procedurePackageAuthorized",
    "harnessImplementationAuthorized",
    "liveSelectionChangeAuthorized",
    "runtimeActivationAuthorized",
    "activationAuthorized",
    "archiveAuthorized",
    "releaseAuthorized",
    "publicationAuthorized",
    "pushAuthorized",
)

PLANNING_NAMES = (
    "task.json",
    "prd.md",
    "design.md",
    "implement.md",
    "implement.jsonl",
    "check.jsonl",
)

GOVERNANCE_OUTPUT_NAMES = (
    "g131-governance-baseline-attestation.json",
    "g131-topology-and-path-ownership.json",
    "g131-correction-and-propagation-allowlist.json",
    "g131-output-inventories.json",
    "g131-authority-and-containment.json",
    "g131-validation.py",
    "g131-validation-evidence.json",
)

G131_PATHS = tuple(
    [f"{base}/{name}" for base in (CAMPAIGN, AUTHOR, ASSURANCE, DECISION) for name in PLANNING_NAMES]
    + [
        f"{PARENT}/task.json",
        f"{PARENT}/prd.md",
        f"{PARENT}/design.md",
        f"{PARENT}/implement.md",
        f"{PARENT}/research/path-ownership-map.md",
    ]
    + [f"{CAMPAIGN}/research/{name}" for name in GOVERNANCE_OUTPUT_NAMES]
)

A131_0_PATHS = (
    f"{AUTHOR}/task.json",
    f"{AUTHOR}/research/a131-0-author-assignment-and-input-authorization.json",
)
A131_1_NAMES = (
    "durable-output-disposition-v1.3.1.json",
    "artifact-lifecycle-contract-v1.3.1.json",
    "validator-registry-v1.3.1.json",
    "validator-binding-matrix-v1.3.1.json",
    "differential-test-matrix-v1.3.1.json",
    "derivability-provenance-matrix-v1.3.1.json",
    "closure-contract-v1.3.1.json",
    "contract-candidate-manifest-v1.3.1.json",
    "frozen-semantic-target-v1.3.1.json",
    "four-finding-correction-ledger-v1.3.1.json",
    "semantic-diff-ledger-v1.3.0-to-v1.3.1.json",
    "assurance-corpus-v1.3.1.json",
    "author-validation.json",
    "author-v1.3.1.py",
    "author-output-manifest-v1.3.1.json",
)
A131_1_PATHS = tuple(f"{AUTHOR}/research/{name}" for name in A131_1_NAMES)
B131_0_PATHS = (
    f"{ASSURANCE}/task.json",
    f"{ASSURANCE}/research/b131-0-independent-reviewer-assignment.json",
)
B131_1_NAMES = (
    "independent-semantic-assurance.py",
    "exact-input-attestation.json",
    "reviewer-independence.json",
    "package-integrity-and-semantic-diff-audit.json",
    "report-v2-schema-audit.json",
    "validator-semantics-audit.json",
    "differential-reproducibility-audit.json",
    "procedure-family-applicability-audit.json",
    "cross-leaf-adversarial-audit.json",
    "execution-evidence-ledger.json",
    "assurance-verdict.json",
)
B131_1_PATHS = tuple(f"{ASSURANCE}/research/{name}" for name in B131_1_NAMES)
O131_0_PATHS = (
    f"{DECISION}/task.json",
    f"{DECISION}/research/o131-0-decision-input-attestation.json",
)
O131_1_PATHS = (f"{DECISION}/research/o131-1-operator-decision.json",)

EXPECTED_INVENTORIES = {
    "A131-0": A131_0_PATHS,
    "A131-1": A131_1_PATHS,
    "B131-0": B131_0_PATHS,
    "B131-1": B131_1_PATHS,
    "G131": G131_PATHS,
    "O131-0": O131_0_PATHS,
    "O131-1": O131_1_PATHS,
}
EXPECTED_COUNTS = {key: len(paths) for key, paths in EXPECTED_INVENTORIES.items()}

ACCEPTED_MEMBERS = (
    ("durable-output-disposition-v1.3.json", 86073, "0d52d392a5da298f72b9e605b0fe2d04533e45b5674a12a7f125aa2ab95e3da9"),
    ("artifact-lifecycle-contract-v1.3.json", 1148478, "1c45fdfb347ec00466cf420433397b9418aff1ce741d950de709e8387082105a"),
    ("validator-registry-v1.3.json", 49941, "7f62559b429432b91dde8de1d6304a1873965a4dfd157e2143a8b3519cf3f83c"),
    ("validator-binding-matrix-v1.3.json", 480385, "216326d3effe0f174509576a2308acd74501a5f2c093d88698e4ba61bc411c69"),
    ("differential-test-matrix-v1.3.json", 628648, "5b5bb309466278ab6d5cb68be07e83a30a254257bce21c57a060375d29be1d3e"),
    ("derivability-provenance-matrix-v1.3.json", 592874, "d9b548b82a5cd60c6d30535a69723b5ecf6ec8ac3575bbb950c04a8d6d73b121"),
    ("closure-contract-v1.3.json", 20300, "99b5fb9711da93d2c9a3343f0769809eeec9d6c2673078cbec579aa2f9c0c9c0"),
)
ACCEPTED_BASE = ".trellis/tasks/08-04-author-evaluation-contract-v1-3-attempt-3/research"

A11_FILES = (
    (".trellis/tasks/08-07-cs6-audit-accepted-v13-semantic-leaves/research/cs6-1-disposition.json", 3440, "f1e43a4d86173cbaf9870ada5b21129f3d6172a382f3c3c3e95966d6fd3dc318"),
    (".trellis/tasks/08-07-cs6-audit-accepted-v13-semantic-leaves/research/semantic-audit-findings.json", 7540, "dfd7da29217dfab11e501c07b90f30adef4c63cc6dc85cfd32422a321937489c"),
    (".trellis/tasks/08-07-cs6-audit-accepted-v13-semantic-leaves/research/cs6-1-independent-verification.json", 10013, "0ab217ade1eac0ec8b527acfb722fdb9da4a965259188db6bcaeb5336e7e2baa"),
    (".trellis/tasks/08-07-cs6-audit-accepted-v13-semantic-leaves/research/exact-input-attestation.json", 6306, "3513a5d27ab3b72c953d2acf5e9e47845229aa5fb77e92dd395899030f150d14"),
)

PROTECTED_FILES = {
    "AGENTS.md": "46ec2da5b9077e6c351dbf13066c7d14a796ca018f32d63963feefdd62ce3d31",
    "CLAUDE.md": "707cc4e3d24165ab4cc91bc884f6b8ebf7ee2971c7f5edf2ac0b197f9f1d4f4b",
}
SUBMODULES = {
    "docs-site": {
        "commit": "be7684f2086abb9b8e24d4d35733a7dda3123a0f",
        "status": (
            " M advanced/architecture.mdx",
            " M docs.json",
            " M zh/advanced/architecture.mdx",
            "?? advanced/research-workflow.mdx",
            "?? zh/advanced/research-workflow.mdx",
        ),
    },
    "marketplace": {
        "commit": "d7a18bb5411c700237d21483d6889ac296ef0301",
        "status": (" M workflows/native/workflow.md",),
    },
}
CS5_DECISION = ".trellis/tasks/08-06-cs5-decide-complete-system-attempt-10/research/cs5-8-honest-stop-record.json"
CS5_DECISION_LENGTH = 721
CS5_DECISION_SHA256 = "3aebafbb76f6a256a9ee58fea39bca9c235e18e9df8cf36a1d057eaff6dc4282"
INHERITED_DIRTY_PATHS = frozenset({"AGENTS.md", "CLAUDE.md", "docs-site", "marketplace", CS5_DECISION})
FINDING_IDS = tuple(f"CS6-1-CONTRACT-00{i}" for i in range(1, 5))
LEAF_FILENAME_TRANSITIONS = tuple(
    (old_name, old_name.replace("-v1.3.json", "-v1.3.1.json"))
    for old_name, _, _ in ACCEPTED_MEMBERS
)
FROZEN_TARGET_TRANSITION = ("frozen-migration-target-v1.3.json#", "frozen-semantic-target-v1.3.1.json#")

GOVERNANCE_JSON_PATHS = tuple(
    f"{CAMPAIGN}/research/{name}"
    for name in GOVERNANCE_OUTPUT_NAMES
    if name.endswith(".json")
)


class ValidationError(RuntimeError):
    """Raised when an exact G131 invariant fails."""


def fail(message: str) -> None:
    raise ValidationError(message)


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def run(command: list[str], cwd: Path = REPO_ROOT) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        command,
        cwd=cwd,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=False,
    )


def git(*args: str, cwd: Path = REPO_ROOT, check: bool = True) -> str:
    result = run(["git", "-c", "i18n.logOutputEncoding=UTF-8", *args], cwd=cwd)
    if check and result.returncode != 0:
        fail(f"git {' '.join(args)} failed: {result.stderr.strip()}")
    return result.stdout


def git_bytes(commit: str, path: str) -> bytes:
    result = subprocess.run(
        ["git", "-c", "i18n.logOutputEncoding=UTF-8", "show", f"{commit}:{path}"],
        cwd=REPO_ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if result.returncode != 0:
        fail(f"cannot read {path} from {commit}: {result.stderr.decode('utf-8', errors='replace').strip()}")
    return result.stdout


def reject_constant(value: str) -> Any:
    fail(f"non-finite JSON number {value!r}")


def parse_float(value: str) -> float:
    parsed = float(value)
    if not math.isfinite(parsed):
        fail(f"non-finite JSON number {value!r}")
    return parsed


def unique_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            fail(f"duplicate JSON key {key!r}")
        result[key] = value
    return result


def validate_unicode(value: Any, location: str = "$") -> None:
    if isinstance(value, str):
        for character in value:
            if 0xD800 <= ord(character) <= 0xDFFF:
                fail(f"unpaired surrogate at {location}")
    elif isinstance(value, list):
        for index, item in enumerate(value):
            validate_unicode(item, f"{location}[{index}]")
    elif isinstance(value, dict):
        for key, item in value.items():
            validate_unicode(key, f"{location}.<key>")
            validate_unicode(item, f"{location}.{key}")


def parse_json_bytes(data: bytes, path: str) -> Any:
    try:
        text = data.decode("utf-8", errors="strict")
    except UnicodeDecodeError as exc:
        fail(f"invalid UTF-8 in {path}: {exc}")
    try:
        value = json.loads(
            text,
            object_pairs_hook=unique_object,
            parse_constant=reject_constant,
            parse_float=parse_float,
        )
    except (json.JSONDecodeError, ValueError) as exc:
        fail(f"invalid strict JSON in {path}: {exc}")
    validate_unicode(value)
    return value


def read_json(path: str) -> Any:
    return parse_json_bytes((REPO_ROOT / path).read_bytes(), path)


def canonical_json_bytes(value: Any) -> bytes:
    return (
        json.dumps(value, ensure_ascii=False, allow_nan=False, sort_keys=True, separators=(",", ":"))
        + "\n"
    ).encode("utf-8")


def json_pointer_escape(segment: str) -> str:
    return segment.replace("~", "~0").replace("/", "~1")


def iter_json_pointers(value: Any, pointer: str = "") -> list[tuple[str, Any]]:
    result: list[tuple[str, Any]] = []
    if pointer:
        result.append((pointer, value))
    if isinstance(value, dict):
        for key, item in value.items():
            result.extend(iter_json_pointers(item, f"{pointer}/{json_pointer_escape(key)}"))
    elif isinstance(value, list):
        for index, item in enumerate(value):
            result.extend(iter_json_pointers(item, f"{pointer}/{index}"))
    return result


def accepted_json(filename: str) -> Any:
    path = f"{ACCEPTED_BASE}/{filename}"
    return parse_json_bytes(git_bytes(ACCEPTED_SUBJECT, path), f"{ACCEPTED_SUBJECT}:{path}")


def exact_index_pattern(indices: range) -> str:
    return "(?:" + "|".join(str(index) for index in indices) + ")"


def expected_direct_correction_regions() -> list[dict[str, Any]]:
    validators = exact_index_pattern(range(20))
    global_cases = exact_index_pattern(range(72, 116))
    artifacts = exact_index_pattern(range(65))
    return [
        {
            "findingId": FINDING_IDS[0],
            "leafPath": "validator-binding-matrix-v1.3.1.json",
            "pointerPatterns": [r"^/reportV2Contract(?:/.*)?$"],
            "requiredClosure": [
                "complete-root-and-nested-object-schema",
                "field-types",
                "requiredness",
                "enums",
                "cardinalities",
                "nullability",
                "recursive-unknown-key-rejection",
                "canonicalization",
                "digest-framing",
                "own-field-exclusion",
                "one-final-lf",
            ],
        },
        {
            "findingId": FINDING_IDS[1],
            "leafPath": "validator-registry-v1.3.1.json",
            "pointerPatterns": [
                rf"^/validators/{validators}/inputFactSchema/value/properties/facts(?:/.*)?$",
                rf"^/validators/{validators}/(?:factDerivationSources|applicability|predicate|decisionTable|orderedFindings)(?:/.*)?$",
            ],
            "requiredClosure": [
                "20-closed-rule-specific-fact-schemas",
                "authenticated-derivation-sources",
                "deterministic-pass-fail-predicates",
                "exact-ordered-findings",
                "missing-unknown-contradictory-aliased-ambiguous-fail-closed",
            ],
        },
        {
            "findingId": FINDING_IDS[2],
            "inapplicableCaseIndices": [75, 79, 83, 87, 91, 95, 99, 103, 107, 111, 115],
            "leafPath": "differential-test-matrix-v1.3.1.json",
            "pointerPatterns": [
                r"^/globalFixtureAuthority(?:/.*)?$",
                rf"^/v13DeltaCases/{global_cases}/(?:baseFixture|syntheticMutation|mutationPreconditions|applicability|expectedExecution|expectedObservation)(?:/.*)?$",
            ],
            "requiredClosure": [
                "embedded-minimal-fixture-or-complete-fixture-specification",
                "exact-fixture-digest",
                "44-executable-global-mutations",
                "11-executable-inapplicability-predicates",
                "exact-ordered-observations",
                "failed-precondition-fails-case",
            ],
        },
        {
            "findingId": FINDING_IDS[3],
            "leafPaths": ["artifact-lifecycle-contract-v1.3.1.json", "validator-registry-v1.3.1.json"],
            "pointerPatternsByLeaf": {
                "artifact-lifecycle-contract-v1.3.1.json": [
                    r"^/procedureCapabilityArtifactFamilyMapping(?:/.*)?$",
                    r"^/procedureCapabilityArtifactFamilyMappingSchema(?:/.*)?$",
                    r"^/mappingFailureDisposition(?:/.*)?$",
                    rf"^/artifacts/{artifacts}/dimensions/terminalApplicability(?:/.*)?$",
                    rf"^/artifacts/{artifacts}/fixtureObligations/value/inapplicable(?:/.*)?$",
                ],
                "validator-registry-v1.3.1.json": [
                    rf"^/validators/{validators}/inputFactSchema/value/properties/authoritySnapshot(?:/.*)?$"
                ],
            },
            "requiredClosure": [
                "17-total-unique-exact-procedure-capability-rows",
                "one-proven-codomain-family-per-row-without-g131-assignment",
                "authority-snapshot-lookup-facts",
                "845-reproducible-lifecycle-decisions",
                "unknown-missing-duplicate-aliased-conflicting-fail-closed",
            ],
        },
    ]


def pointer_map(filename: str) -> dict[str, Any]:
    return dict(iter_json_pointers(accepted_json(filename)))


def successor_name(filename: str) -> str:
    for old_name, new_name in LEAF_FILENAME_TRANSITIONS:
        if filename == old_name:
            return new_name
    fail(f"unknown accepted leaf filename: {filename}")


def exact_guard(old_value: Any, new_value: Any) -> dict[str, Any]:
    return {"kind": "exact-value", "newValue": new_value, "oldValue": old_value}


def expected_direct_region_immutable_reference_guards() -> list[dict[str, Any]]:
    return [
        {
            "leafPath": "validator-binding-matrix-v1.3.1.json",
            "oldValue": "DEC-V13-REPORT-V2",
            "pointerPaths": [
                f"/reportV2Contract/{field}/provenance/decisionId"
                for field in (
                    "reportV1",
                    "schemaVersion",
                    "digest",
                    "visibility",
                    "requiredBindings",
                    "canonicalization",
                )
            ],
            "referenceNamespace": "historical-normative-decision-ledger-v1.3",
        },
        {
            "leafPath": "artifact-lifecycle-contract-v1.3.1.json",
            "oldValue": "DEC-V13-LIFECYCLE-TERMINAL",
            "pointerPaths": [
                f"/artifacts/{index}/dimensions/terminalApplicability/provenance/decisionId"
                for index in range(65)
            ],
            "referenceNamespace": "historical-normative-decision-ledger-v1.3",
        },
    ]


def expected_propagation_rules() -> list[dict[str, Any]]:
    all_findings = list(FINDING_IDS)
    contract_matches = [
        {
            "leafPath": new_name,
            "oldNewGuard": exact_guard("evaluation-contract-v1.3.0", "evaluation-contract-v1.3.1"),
            "pointerPaths": ["/contractVersion"],
        }
        for _, new_name in LEAF_FILENAME_TRANSITIONS
    ]
    contract_matches.append(
        {
            "leafPath": "differential-test-matrix-v1.3.1.json",
            "oldNewGuard": exact_guard(
                "evaluation-contract-v1.3.0-delta", "evaluation-contract-v1.3.1-delta"
            ),
            "pointerPaths": [f"/v13DeltaCases/{index}/domain" for index in range(116)],
        }
    )

    binding_transitions = (
        (868, "durable-output-disposition-v1.3", "durable-output-disposition-v1.3.1"),
        (870, "closure-contract-v1.3", "closure-contract-v1.3.1"),
        (872, "frozen-migration-target-v1.3", "frozen-semantic-target-v1.3.1"),
        (874, "differential-test-matrix-v1.3", "differential-test-matrix-v1.3.1"),
        (875, "contract-candidate-manifest-v1.3", "contract-candidate-manifest-v1.3.1"),
    )
    member_matches = [
        {
            "leafPath": "validator-binding-matrix-v1.3.1.json",
            "oldNewGuard": exact_guard(old_value, new_value),
            "pointerPaths": [f"/bindings/{index}/targetId"],
        }
        for index, old_value, new_value in binding_transitions
    ]
    differential_transitions = (
        (range(84, 88), "durable-output-disposition-v1.3", "durable-output-disposition-v1.3.1"),
        (range(92, 96), "closure-contract-v1.3", "closure-contract-v1.3.1"),
        (range(100, 104), "frozen-migration-target-v1.3", "frozen-semantic-target-v1.3.1"),
        (range(108, 112), "differential-test-matrix-v1.3", "differential-test-matrix-v1.3.1"),
        (range(112, 116), "contract-candidate-manifest-v1.3", "contract-candidate-manifest-v1.3.1"),
    )
    member_matches.extend(
        {
            "leafPath": "differential-test-matrix-v1.3.1.json",
            "oldNewGuard": exact_guard(old_value, new_value),
            "pointerPaths": [f"/v13DeltaCases/{index}/ruleTargets/0" for index in indices],
        }
        for indices, old_value, new_value in differential_transitions
    )

    provenance = accepted_json("derivability-provenance-matrix-v1.3.json")
    prefix_transitions = [
        {"newPrefix": new_name + "#", "oldPrefix": old_name + "#"}
        for old_name, new_name in LEAF_FILENAME_TRANSITIONS
    ] + [{"newPrefix": FROZEN_TARGET_TRANSITION[1], "oldPrefix": FROZEN_TARGET_TRANSITION[0]}]
    normative_pointer_paths = [
        f"/rows/{index}/normativePointer"
        for index, row in enumerate(provenance["rows"])
        if any(row["normativePointer"].startswith(item["oldPrefix"]) for item in prefix_transitions)
    ]
    member_matches.append(
        {
            "leafPath": "derivability-provenance-matrix-v1.3.1.json",
            "oldNewGuard": {
                "kind": "exact-prefix-replacement-preserve-suffix",
                "transitions": prefix_transitions,
            },
            "pointerPaths": normative_pointer_paths,
        }
    )

    provenance_matches: list[dict[str, Any]] = []
    direct_roots = direct_roots_by_finding()
    for old_name, new_name in LEAF_FILENAME_TRANSITIONS:
        excluded_roots = [
            root
            for finding_roots in direct_roots.values()
            for root in finding_roots.get(new_name, [])
        ]
        paths = [
            pointer
            for pointer, value in iter_json_pointers(accepted_json(old_name))
            if (
                pointer.endswith("/class")
                and value == "trellis-native-v1.3"
                and not any(pointer == root or pointer.startswith(root + "/") for root in excluded_roots)
            )
        ]
        provenance_matches.append(
            {
                "leafPath": new_name,
                "oldNewGuard": exact_guard("trellis-native-v1.3", "trellis-native-v1.3.1"),
                "pointerPaths": paths,
            }
        )

    rows = provenance["rows"]
    record_ref_groups = (
        (
            FINDING_IDS[0],
            [
                index
                for index, row in enumerate(rows)
                if row["normativePointer"].startswith(
                    "validator-binding-matrix-v1.3.json#/reportV2Contract/"
                )
            ],
        ),
        (
            FINDING_IDS[2],
            [
                index
                for index, row in enumerate(rows)
                if row["normativePointer"]
                in {
                    f"differential-test-matrix-v1.3.json#/v13DeltaCases/{case_index}"
                    for case_index in range(72, 116)
                }
            ],
        ),
        (
            FINDING_IDS[3],
            [
                index
                for index, row in enumerate(rows)
                if (
                    row["normativePointer"].startswith(
                        "artifact-lifecycle-contract-v1.3.json#/artifacts/"
                    )
                    and (
                        row["normativePointer"].endswith("/dimensions/terminalApplicability")
                        or row["normativePointer"].endswith("/fixtureObligations")
                    )
                )
            ],
        ),
    )
    for finding_id, indices in record_ref_groups:
        old_values = sorted({rows[index]["recordRef"] for index in indices})
        provenance_matches.append(
            {
                "leafPath": "derivability-provenance-matrix-v1.3.1.json",
                "oldNewGuard": {
                    "findingId": finding_id,
                    "kind": "finding-bound-record-ref",
                    "newValue": finding_id,
                    "oldValues": old_values,
                    "sameRowNormativePointerResolution": "ancestor-or-descendant-overlap-with-exactly-one-declared-finding-region",
                },
                "pointerPaths": [f"/rows/{index}/recordRef" for index in indices],
            }
        )

    return [
        {
            "causalFindings": all_findings,
            "matches": contract_matches,
            "ruleId": "PROP-CONTRACT-IDENTITY",
        },
        {
            "causalFindings": all_findings,
            "matches": member_matches,
            "ruleId": "PROP-MEMBER-REFERENCE",
        },
        {
            "causalFindings": all_findings,
            "matches": provenance_matches,
            "ruleId": "PROP-PROVENANCE-REFERENCE",
        },
    ]


def require_one_final_lf(path: str, data: bytes) -> None:
    if not data.endswith(b"\n") or data.endswith(b"\n\n"):
        fail(f"{path} must end with exactly one final LF")
    if b"\r" in data:
        fail(f"{path} contains CR bytes")


def validate_file_syntax(path: str, allow_missing_evidence: bool) -> None:
    full = REPO_ROOT / path
    if not full.is_file():
        if allow_missing_evidence and path == EVIDENCE_PATH:
            return
        fail(f"missing approved G131 path: {path}")
    if full.is_symlink():
        fail(f"approved G131 path must not be a symlink: {path}")
    data = full.read_bytes()
    require_one_final_lf(path, data)
    if path.endswith(".json"):
        value = parse_json_bytes(data, path)
        if path in GOVERNANCE_JSON_PATHS and path != EVIDENCE_PATH:
            if data != canonical_json_bytes(value):
                fail(f"governance JSON is not canonical compact sorted JSON: {path}")
    elif path.endswith(".jsonl"):
        lines = data.splitlines(keepends=True)
        if not lines:
            fail(f"empty JSONL file: {path}")
        for line_number, line in enumerate(lines, 1):
            if not line.endswith(b"\n") or line in (b"\n", b"\r\n"):
                fail(f"invalid JSONL line {line_number} in {path}")
            value = parse_json_bytes(line, f"{path}:{line_number}")
            if line != canonical_json_bytes(value):
                fail(f"non-canonical JSONL line {line_number} in {path}")


def validate_authority(authority: Any, expected_task_execution: bool, location: str) -> None:
    if not isinstance(authority, dict):
        fail(f"missing authority object at {location}")
    expected_keys = {"taskExecutionAuthorized", *DENIAL_FIELDS}
    if set(authority) != expected_keys:
        fail(f"authority key set mismatch at {location}")
    if authority["taskExecutionAuthorized"] is not expected_task_execution:
        fail(f"taskExecutionAuthorized mismatch at {location}")
    for key in DENIAL_FIELDS:
        if authority[key] is not False:
            fail(f"{key} must be false at {location}")


def validate_task_authority(task: dict[str, Any], location: str) -> None:
    meta = task.get("meta")
    if not isinstance(meta, dict):
        fail(f"missing task meta at {location}")
    if meta.get("taskExecutionAuthorized") is not False:
        fail(f"task metadata is routing only and must not self-authorize execution at {location}")
    if meta.get("activationAuthorized") is not False:
        fail(f"activationAuthorized must be false in task metadata at {location}")
    for key in DENIAL_FIELDS:
        if meta.get(key) is not False:
            fail(f"{key} must be false in {location}")


def dirty_paths() -> set[str]:
    tracked = set(git("diff", "--name-only", "HEAD").splitlines())
    staged = set(git("diff", "--cached", "--name-only").splitlines())
    untracked = set(git("ls-files", "--others", "--exclude-standard").splitlines())
    return {path for path in tracked | staged | untracked if path}


def owned_files() -> set[str]:
    result: set[str] = set()
    for base in (CAMPAIGN, AUTHOR, ASSURANCE, DECISION):
        root = REPO_ROOT / base
        if not root.is_dir():
            fail(f"missing task directory {base}")
        for path in root.rglob("*"):
            if path.is_file() or path.is_symlink():
                result.add(path.relative_to(REPO_ROOT).as_posix())
    return result


def validate_scope(allow_missing_evidence: bool) -> None:
    expected = set(G131_PATHS)
    actual_owned = owned_files()
    expected_owned = {
        path
        for path in expected
        if path.startswith((CAMPAIGN + "/", AUTHOR + "/", ASSURANCE + "/", DECISION + "/"))
    }
    if allow_missing_evidence and EVIDENCE_PATH not in actual_owned:
        expected_owned.remove(EVIDENCE_PATH)
    if actual_owned != expected_owned:
        fail(
            f"owned campaign output mismatch: extra={sorted(actual_owned - expected_owned)} "
            f"missing={sorted(expected_owned - actual_owned)}"
        )

    staged = {path for path in git("diff", "--cached", "--name-only").splitlines() if path}
    if staged:
        fail(f"G131 requires an empty staged set, found: {sorted(staged)}")

    changed = dirty_paths()
    expected_changed = set(G131_PATHS) | set(INHERITED_DIRTY_PATHS)
    if allow_missing_evidence and EVIDENCE_PATH not in changed:
        expected_changed.remove(EVIDENCE_PATH)
    if changed != expected_changed:
        fail(
            f"complete dirty-path mismatch: extra={sorted(changed - expected_changed)} "
            f"missing={sorted(expected_changed - changed)}"
        )


def validate_parent_overlays() -> None:
    current_task = read_json(f"{PARENT}/task.json")
    base_task = parse_json_bytes(git_bytes("HEAD", f"{PARENT}/task.json"), f"HEAD:{PARENT}/task.json")
    children = current_task.get("children")
    if not isinstance(children, list) or children.count(CAMPAIGN_CHILD) != 1 or children[-1] != CAMPAIGN_CHILD:
        fail("canonical parent must contain the v1.3.1 campaign exactly once as the final child")
    reduced = dict(current_task)
    reduced["children"] = [child for child in children if child != CAMPAIGN_CHILD]
    if reduced != base_task:
        fail("canonical parent task.json changed beyond the one additive campaign child")

    for relative in ("prd.md", "design.md", "implement.md", "research/path-ownership-map.md"):
        path = f"{PARENT}/{relative}"
        base = git_bytes("HEAD", path)
        current = (REPO_ROOT / path).read_bytes()
        if not current.startswith(base):
            fail(f"canonical parent overlay is not append-only: {path}")


def validate_topology_and_tasks() -> None:
    campaign_task = read_json(f"{CAMPAIGN}/task.json")
    author_task = read_json(f"{AUTHOR}/task.json")
    assurance_task = read_json(f"{ASSURANCE}/task.json")
    decision_task = read_json(f"{DECISION}/task.json")

    expected_children = [
        "08-08-author-evaluation-contract-v1-3-1",
        "08-08-assure-evaluation-contract-v1-3-1-mal1",
        "08-08-decide-evaluation-contract-v1-3-1",
    ]
    if campaign_task.get("status") != "in_progress" or campaign_task.get("assignee") is not None:
        fail("campaign parent must be in_progress and unassigned")
    if campaign_task.get("children") != expected_children or campaign_task.get("parent") != "07-29-migrate-research-methodology-to-procedures":
        fail("campaign topology mismatch")
    if campaign_task.get("meta", {}).get("active") is not True:
        fail("campaign route must be active for G131 only")
    validate_task_authority(campaign_task, f"{CAMPAIGN}/task.json")

    for task, path, expected_id in (
        (author_task, f"{AUTHOR}/task.json", "author-evaluation-contract-v1-3-1"),
        (assurance_task, f"{ASSURANCE}/task.json", "assure-evaluation-contract-v1-3-1-mal1"),
        (decision_task, f"{DECISION}/task.json", "decide-evaluation-contract-v1-3-1"),
    ):
        if task.get("id") != expected_id or task.get("status") != "planning" or task.get("assignee") is not None:
            fail(f"child must remain planning, unassigned, and correctly identified: {path}")
        if task.get("parent") != CAMPAIGN_CHILD or task.get("children") != []:
            fail(f"child reciprocal topology mismatch: {path}")
        if task.get("meta", {}).get("active") is not False:
            fail(f"child must remain inactive: {path}")
        validate_task_authority(task, path)

    dependencies = decision_task.get("meta", {}).get("dependencies")
    if dependencies != [
        "Authenticated committed B131-1 assurance evidence with verdict pass or fail",
        "Separate explicit operator instruction",
    ]:
        fail("operator dependency must allow authenticated pass or fail evidence")
    if decision_task.get("meta", {}).get("acceptanceGate") != (
        "accept-with-rationale requires verdict exactly pass; reject-with-rationale or stop may follow pass or fail"
    ):
        fail("operator acceptance eligibility mismatch")


def direct_roots_by_finding() -> dict[str, dict[str, list[str]]]:
    return {
        FINDING_IDS[0]: {
            "validator-binding-matrix-v1.3.1.json": ["/reportV2Contract"],
        },
        FINDING_IDS[1]: {
            "validator-registry-v1.3.1.json": [
                *[
                    f"/validators/{index}/inputFactSchema/value/properties/facts"
                    for index in range(20)
                ],
                *[
                    f"/validators/{index}/{field}"
                    for index in range(20)
                    for field in (
                        "factDerivationSources",
                        "applicability",
                        "predicate",
                        "decisionTable",
                        "orderedFindings",
                    )
                ],
            ],
        },
        FINDING_IDS[2]: {
            "differential-test-matrix-v1.3.1.json": [
                "/globalFixtureAuthority",
                *[
                    f"/v13DeltaCases/{index}/{field}"
                    for index in range(72, 116)
                    for field in (
                        "baseFixture",
                        "syntheticMutation",
                        "mutationPreconditions",
                        "applicability",
                        "expectedExecution",
                        "expectedObservation",
                    )
                ],
            ],
        },
        FINDING_IDS[3]: {
            "artifact-lifecycle-contract-v1.3.1.json": [
                "/procedureCapabilityArtifactFamilyMapping",
                "/procedureCapabilityArtifactFamilyMappingSchema",
                "/mappingFailureDisposition",
                *[
                    f"/artifacts/{index}/dimensions/terminalApplicability"
                    for index in range(65)
                ],
                *[
                    f"/artifacts/{index}/fixtureObligations/value/inapplicable"
                    for index in range(65)
                ],
            ],
            "validator-registry-v1.3.1.json": [
                f"/validators/{index}/inputFactSchema/value/properties/authoritySnapshot"
                for index in range(20)
            ],
        },
    }


def paths_overlap(left: str, right: str) -> bool:
    return left == right or left.startswith(right + "/") or right.startswith(left + "/")


def resolved_findings_for_normative_pointer(value: str) -> set[str]:
    if "#" not in value:
        return set()
    old_filename, pointer = value.split("#", 1)
    try:
        leaf_path = successor_name(old_filename)
    except ValidationError:
        return set()
    resolved: set[str] = set()
    for finding_id, leaf_roots in direct_roots_by_finding().items():
        if any(paths_overlap(pointer, root) for root in leaf_roots.get(leaf_path, [])):
            resolved.add(finding_id)
    return resolved


def validate_propagation_classifier(correction: dict[str, Any]) -> dict[str, Any]:
    expected_direct = expected_direct_correction_regions()
    direct = correction.get("directCorrectionRegions")
    if direct != expected_direct:
        fail("direct correction regions do not equal the frozen descendant-closed finite specification")

    baseline_maps = {
        successor_name(old_name): pointer_map(old_name)
        for old_name, _ in LEAF_FILENAME_TRANSITIONS
    }
    direct_domain: set[tuple[str, str]] = set()
    roots = direct_roots_by_finding()
    for region in direct:
        finding_id = region["findingId"]
        if "leafPath" in region:
            pattern_sets = {region["leafPath"]: region["pointerPatterns"]}
        else:
            pattern_sets = region["pointerPatternsByLeaf"]
        for leaf_path, patterns in pattern_sets.items():
            compiled = [re.compile(pattern) for pattern in patterns]
            matched = {
                pointer
                for pointer in baseline_maps[leaf_path]
                if any(pattern.fullmatch(pointer) for pattern in compiled)
            }
            expected = {
                pointer
                for pointer in baseline_maps[leaf_path]
                if any(paths_overlap(pointer, root) and (pointer == root or pointer.startswith(root + "/")) for root in roots[finding_id][leaf_path])
            }
            if matched != expected:
                fail(f"direct correction match domain mismatch for {finding_id} in {leaf_path}")
            overlap = direct_domain & {(leaf_path, pointer) for pointer in matched}
            if overlap:
                fail(f"direct correction regions overlap on immutable baseline pointers: {sorted(overlap)[:5]}")
            direct_domain.update((leaf_path, pointer) for pointer in matched)

    expected_reference_guards = expected_direct_region_immutable_reference_guards()
    if correction.get("directRegionImmutableReferenceGuards") != expected_reference_guards:
        fail("direct-region immutable historical-reference guards mismatch")
    expected_reference_rule = (
        "Existing immutable v1.3.0 DEC-, EV-, and SRC-valued references inside direct correction "
        "regions remain exact-value. Their pointer/value set may not be added to, removed, aliased, "
        "or replaced; the exact baseline set is closed."
    )
    if correction.get("directRegionHistoricalReferenceRule") != expected_reference_rule:
        fail("direct-region historical-reference rule mismatch")

    guarded_reference_domain: set[tuple[str, str]] = set()
    for guard in expected_reference_guards:
        if set(guard) != {
            "leafPath",
            "oldValue",
            "pointerPaths",
            "referenceNamespace",
        }:
            fail("direct-region immutable reference guard key set mismatch")
        leaf_path = guard["leafPath"]
        baseline = baseline_maps.get(leaf_path)
        if baseline is None:
            fail(f"immutable reference guard names a non-leaf path: {leaf_path}")
        for pointer in guard["pointerPaths"]:
            identity = (leaf_path, pointer)
            if identity not in direct_domain:
                fail(f"immutable reference guard is outside a direct correction region: {leaf_path}{pointer}")
            if baseline.get(pointer) != guard["oldValue"]:
                fail(f"immutable reference guard old-value mismatch: {leaf_path}{pointer}")
            if identity in guarded_reference_domain:
                fail(f"duplicate immutable reference guard: {leaf_path}{pointer}")
            guarded_reference_domain.add(identity)

    direct_historical_reference_domain = {
        (leaf_path, pointer)
        for leaf_path, pointer in direct_domain
        if isinstance(baseline_maps[leaf_path][pointer], str)
        and baseline_maps[leaf_path][pointer].startswith(("DEC-", "EV-", "SRC-"))
    }
    if guarded_reference_domain != direct_historical_reference_domain:
        fail("direct-region immutable historical-reference guard domain is incomplete or overbroad")

    expected_rules = expected_propagation_rules()
    rules = correction.get("propagationRules")
    if rules != expected_rules:
        fail("propagation rules do not equal the frozen finite leaf-specific specification")

    expected_rule_keys = {"causalFindings", "matches", "ruleId"}
    expected_match_keys = {"leafPath", "oldNewGuard", "pointerPaths"}
    propagation_domain: set[tuple[str, str]] = set()
    rule_counts: dict[str, int] = {}
    provenance_rows = accepted_json("derivability-provenance-matrix-v1.3.json")["rows"]
    for rule in rules:
        if set(rule) != expected_rule_keys:
            fail(f"propagation rule key set mismatch: {rule.get('ruleId')}")
        if rule["causalFindings"] != list(FINDING_IDS):
            fail(f"propagation causal finding set mismatch: {rule['ruleId']}")
        count = 0
        for match in rule["matches"]:
            if set(match) != expected_match_keys:
                fail(f"propagation match key set mismatch: {rule['ruleId']}")
            leaf_path = match["leafPath"]
            pointers = match["pointerPaths"]
            if not isinstance(pointers, list) or len(pointers) != len(set(pointers)):
                fail(f"propagation pointer domain is not a unique finite list: {rule['ruleId']}")
            baseline = baseline_maps.get(leaf_path)
            if baseline is None:
                fail(f"propagation rule names a non-leaf path: {leaf_path}")
            guard = match["oldNewGuard"]
            for pointer in pointers:
                if pointer not in baseline:
                    fail(f"propagation pointer absent from immutable baseline: {leaf_path}{pointer}")
                old_value = baseline[pointer]
                kind = guard.get("kind")
                if kind == "exact-value":
                    if set(guard) != {"kind", "newValue", "oldValue"} or old_value != guard["oldValue"]:
                        fail(f"exact propagation guard mismatch: {leaf_path}{pointer}")
                elif kind == "exact-prefix-replacement-preserve-suffix":
                    if set(guard) != {"kind", "transitions"}:
                        fail("prefix propagation guard key set mismatch")
                    matches = [
                        transition
                        for transition in guard["transitions"]
                        if isinstance(old_value, str) and old_value.startswith(transition["oldPrefix"])
                    ]
                    if len(matches) != 1 or set(matches[0]) != {"newPrefix", "oldPrefix"}:
                        fail(f"prefix propagation guard mismatch: {leaf_path}{pointer}")
                elif kind == "finding-bound-record-ref":
                    if set(guard) != {
                        "findingId",
                        "kind",
                        "newValue",
                        "oldValues",
                        "sameRowNormativePointerResolution",
                    }:
                        fail("finding-bound recordRef guard key set mismatch")
                    if old_value not in guard["oldValues"] or guard["newValue"] != guard["findingId"]:
                        fail(f"finding-bound recordRef transition mismatch: {leaf_path}{pointer}")
                    match_index = re.fullmatch(r"/rows/(0|[1-9][0-9]*)/recordRef", pointer)
                    if match_index is None:
                        fail(f"finding-bound recordRef pointer shape mismatch: {pointer}")
                    row = provenance_rows[int(match_index.group(1))]
                    if resolved_findings_for_normative_pointer(row["normativePointer"]) != {guard["findingId"]}:
                        fail(f"recordRef is not gated by one direct finding region: {pointer}")
                else:
                    fail(f"unknown propagation guard kind: {kind}")
                identity = (leaf_path, pointer)
                if identity in propagation_domain:
                    fail(f"propagation rules overlap: {leaf_path}{pointer}")
                if identity in direct_domain:
                    fail(f"direct and propagation classifiers overlap: {leaf_path}{pointer}")
                propagation_domain.add(identity)
                count += 1
        rule_counts[rule["ruleId"]] = count

    classification_enum = correction.get("diffRowSchema", {}).get("classificationEnum")
    expected_classification = [
        *FINDING_IDS,
        "PROP-CONTRACT-IDENTITY",
        "PROP-MEMBER-REFERENCE",
        "PROP-PROVENANCE-REFERENCE",
    ]
    if classification_enum != expected_classification:
        fail("semantic-diff classification enum includes an unknown, missing, or obsolete category")

    return {
        "directBaselinePointerCount": len(direct_domain),
        "directImmutableHistoricalReferenceGuardCount": len(guarded_reference_domain),
        "directPublicEvidenceReferenceGuardCount": sum(
            baseline_maps[leaf_path][pointer].startswith(("EV-", "SRC-"))
            for leaf_path, pointer in guarded_reference_domain
        ),
        "futureA131SemanticDiffExecuted": False,
        "propagationBaselinePointerCount": len(propagation_domain),
        "propagationRulePointerCounts": rule_counts,
        "proofScope": "closed-classifier-specification-against-immutable-v1.3.0-structures",
    }


def validate_governance_records() -> dict[str, Any]:
    baseline = read_json(f"{CAMPAIGN}/research/g131-governance-baseline-attestation.json")
    topology = read_json(f"{CAMPAIGN}/research/g131-topology-and-path-ownership.json")
    correction = read_json(f"{CAMPAIGN}/research/g131-correction-and-propagation-allowlist.json")
    inventories = read_json(f"{CAMPAIGN}/research/g131-output-inventories.json")
    containment = read_json(f"{CAMPAIGN}/research/g131-authority-and-containment.json")

    for record, name in (
        (baseline, "baseline"),
        (topology, "topology"),
        (correction, "correction"),
        (inventories, "inventories"),
    ):
        validate_authority(record.get("authority"), False, name)
    validate_authority(containment.get("authority"), True, "g131-authority-and-containment")
    expected_common_authority = {
        "allFalseFields": list(DENIAL_FIELDS),
        "taskExecutionAuthorizedRule": (
            "True only for the exact currently authorized boundary control record; false for every "
            "later child until a separate instruction and committed predecessor."
        ),
    }
    if containment.get("commonAuthoritySchema") != expected_common_authority:
        fail("common authority schema mismatch")
    if containment.get("boundaryAuthorizations") != {
        "A131-0": False,
        "A131-1": False,
        "B131-0": False,
        "B131-1": False,
        "O131-0": False,
        "O131-1": False,
    }:
        fail("later boundary authorization mismatch")

    if baseline.get("governancePredecessorCommit") != GOVERNANCE_PREDECESSOR:
        fail("governance predecessor mismatch")
    a11 = baseline.get("a11", {})
    if a11.get("commit") != A11_COMMIT or a11.get("disposition") != "contract-defect":
        fail("A11 identity/disposition mismatch")
    if a11.get("worktreeRerunUsedAsAuthority") is not False:
        fail("A11 worktree rerun must not be used as authority")
    accepted = baseline.get("acceptedContract", {})
    if accepted.get("acceptedIdentity") != "evaluation-contract-v1.3.0":
        fail("accepted contract identity mismatch")
    if accepted.get("acceptedSemanticDigest") != "sha256:dde907ba15d9ce22117b95db2fd9e0a108d4869873801f8c7f93b528f808699f":
        fail("accepted semantic digest mismatch")
    if accepted.get("acceptedMemberAggregate") != "sha256:83fdc8c292922173e4a67fa57deb65ff302ec107c202e3b793f7b4a93b23c7ef":
        fail("accepted member aggregate mismatch")

    if topology.get("g131ApprovedPathCount") != 36 or topology.get("g131ApprovedPaths") != list(G131_PATHS):
        fail("topology G131 path inventory mismatch")

    inventory_values = inventories.get("inventories")
    if not isinstance(inventory_values, dict) or set(inventory_values) != set(EXPECTED_INVENTORIES):
        fail("inventory boundary names mismatch")
    for boundary, expected_paths in EXPECTED_INVENTORIES.items():
        value = inventory_values[boundary]
        if value.get("count") != len(expected_paths) or value.get("paths") != list(expected_paths):
            fail(f"inventory mismatch for {boundary}")
    candidate_rule = inventories.get("candidateManifestRule", {})
    if candidate_rule.get("memberCount") != 7 or candidate_rule.get("membersOnly") != list(A131_1_NAMES[:7]):
        fail("candidate manifest must contain exactly seven normative members")
    historical_nonleaves = inventories.get("historicalNonLeafInputs")
    if historical_nonleaves != [
        "evaluation-contract-v1.3.0.md",
        "io-mapping-ledger-v1.3.csv",
        "normative-decision-ledger-v1.3.json",
        "public-evidence-index-v1.3.json",
    ]:
        fail("historical non-leaf inventory mismatch")

    finding_ids = correction.get("findingIds")
    if finding_ids != list(FINDING_IDS):
        fail("four-finding allowlist mismatch")
    counts = correction.get("populationCounts", {})
    expected_populations = {
        "closureBindings": 20,
        "closureFamilies": 4,
        "differentialCases": 116,
        "durableOutputs": 64,
        "globalBindings": 11,
        "globalDifferentialCases": 44,
        "globalInapplicableCases": 11,
        "lifecycleArtifactFamilies": 11,
        "lifecycleArtifacts": 65,
        "lifecycleBindings": 845,
        "lifecycleDimensions": 13,
        "normativeLeaves": 7,
        "procedureCapabilityMappingRows": 17,
        "provenanceRows": 3343,
        "publicEvidenceFacts": 168,
        "publicEvidenceSources": 18,
        "totalBindings": 876,
        "validators": 20,
    }
    if counts != expected_populations:
        fail("frozen population counts mismatch")
    expected_mapping_pairs = [
        ("project-setup-v1", "research.setup.project"),
        ("quest-framing-v1", "research.framing.quest"),
        ("quest-admin-v1", "research.framing.admin"),
        ("literature-scan-v1", "research.literature.scan"),
        ("literature-review-v1", "research.literature.review"),
        ("survey-v1", "research.literature.survey"),
        ("idea-generation-v1", "research.ideation.generate"),
        ("idea-evaluation-v1", "research.ideation.evaluate"),
        ("experiment-round-v1", "research.experiment.round"),
        ("experiment-campaign-v1", "research.experiment.campaign"),
        ("computation-case-v1", "research.computation.case"),
        ("theory-case-v1", "research.theory.case"),
        ("review-case-v1", "research.audit.case"),
        ("review-campaign-v1", "research.audit.campaign"),
        ("writing-case-v1", "research.writing.case"),
        ("figure-v1", "research.writing.figure"),
        ("slides-v1", "research.writing.slides"),
    ]
    mapping_rows = correction.get("mappingDomainIdentities")
    expected_row_keys = {"artifactFamilyBinding", "capabilityId", "procedureId", "procedureVersion"}
    if not isinstance(mapping_rows, list) or [
        (row.get("procedureId"), row.get("capabilityId")) for row in mapping_rows
    ] != expected_mapping_pairs:
        fail("exact ordered 17-row Procedure/capability mapping domain mismatch")
    if len(set(expected_mapping_pairs)) != 17 or any(set(row) != expected_row_keys for row in mapping_rows):
        fail("mapping rows must be unique and use the exact frozen key set")
    if any(row.get("procedureVersion") != "2.0.7" for row in mapping_rows):
        fail("mapping domain must use exact Procedure version 2.0.7")
    expected_binding_rule = (
        "A131-1 must select exactly one value from mappingArtifactFamilyCodomain with explicit proof; "
        "G131 freezes the codomain but does not assign a family to this row."
    )
    if any(row.get("artifactFamilyBinding") != expected_binding_rule for row in mapping_rows):
        fail("G131 must not invent per-row artifact-family assignments")

    lifecycle = accepted_json("artifact-lifecycle-contract-v1.3.json")
    accepted_codomain: list[str] = []
    for artifact in lifecycle["artifacts"]:
        family = artifact["family"]["value"]
        if family not in accepted_codomain:
            accepted_codomain.append(family)
    if len(accepted_codomain) != 11 or correction.get("mappingArtifactFamilyCodomain") != accepted_codomain:
        fail("mapping artifact-family codomain must equal the 11 immutable accepted family enum values")
    expected_codomain_source = {
        "derivation": "ordered-first-occurrence-distinct-values",
        "immutablePointerPattern": "artifact-lifecycle-contract-v1.3.json#/artifacts/(0..64)/family/value",
        "perRowAssignmentOwnedBy": "A131-1",
    }
    if correction.get("mappingArtifactFamilyCodomainSource") != expected_codomain_source:
        fail("mapping codomain source/ownership declaration mismatch")

    corpus = correction.get("assuranceCorpusRequirements")
    if not isinstance(corpus, list) or len(corpus) != 9 or len(set(corpus)) != 9:
        fail("assurance corpus requirements must be a closed nine-category set")
    if correction.get("fixtureAuthority", {}).get("extraFixtureFileAllowed") is not False:
        fail("global fixtures must be embedded in the differential leaf")
    if correction.get("noFifthChangeRule") != (
        "Any changed JSON pointer unmatched by one direct correction region or one propagation rule is an unauthorized fifth semantic change and STOP."
    ):
        fail("no-fifth-change rule mismatch")

    classifier_evidence = validate_propagation_classifier(correction)

    profiles = correction.get("executableProfiles", {})
    expected_json_schema_profile = {
        "allowedKeywords": [
            "$schema",
            "type",
            "properties",
            "required",
            "additionalProperties",
            "items",
            "prefixItems",
            "minItems",
            "maxItems",
            "uniqueItems",
            "minProperties",
            "maxProperties",
            "enum",
            "const",
            "anyOf",
            "oneOf",
            "allOf",
            "not",
            "minLength",
            "maxLength",
            "pattern",
        ],
        "dialect": "https://json-schema.org/draft/2020-12/schema",
        "objectClosure": "Every object schema sets additionalProperties:false.",
        "patternSemantics": {
            "dialect": "ECMA-262 11th edition RegExpPattern (ECMAScript 2020)",
            "flags": [],
            "hostLocaleDependence": False,
            "matchOperation": "RegExpBuiltinExec search semantics over the complete JSON string; anchors bind input boundaries.",
            "runtimeOrNetworkOracleAllowed": False,
            "unicodeMode": "No implicit flags; strict UTF-8 decodes to an ECMAScript String and matching uses ECMA-262 UTF-16 code-unit semantics.",
        },
        "prohibited": [
            "$ref",
            "$dynamicRef",
            "$anchor",
            "$dynamicAnchor",
            "format",
            "contentEncoding",
            "contentMediaType",
            "remote-resolution",
            "unknown-keyword",
        ],
        "schemaVersion": "trellis-json-schema-2020-12-closed-v1",
    }
    if profiles.get("jsonSchema") != expected_json_schema_profile:
        fail("JSON Schema executable profile or deterministic pattern semantics mismatch")
    if profiles.get("predicate", {}).get("language") != "trellis-predicate-v1":
        fail("predicate profile mismatch")
    if profiles.get("mutation", {}).get("orderedOperations") != [
        "json-test",
        "json-add",
        "json-remove",
        "json-replace",
        "bytes-replace",
        "bytes-truncate",
        "bytes-append",
    ]:
        fail("mutation operation profile mismatch")

    eligibility = containment.get("decisionEligibility", {})
    if eligibility.get("pass") != ["accept-with-rationale", "reject-with-rationale", "stop"]:
        fail("pass decision eligibility mismatch")
    if eligibility.get("fail") != ["reject-with-rationale", "stop"]:
        fail("fail decision eligibility mismatch")
    if eligibility.get("missing-or-mismatched") != []:
        fail("missing/mismatched assurance must produce no decision")
    if containment.get("terminalBoundary") != (
        "STOP after O131-1. Acceptance authorizes semantic-contract authority only for a separately governed future technical campaign."
    ):
        fail("terminal STOP mismatch")
    return classifier_evidence


def validate_git_identities() -> None:
    head = git("rev-parse", "HEAD").strip()
    if head != A11_COMMIT:
        fail(f"G131 must run on immutable A11 HEAD {A11_COMMIT}, got {head}")
    if git("rev-parse", f"{A11_COMMIT}^{{commit}}").strip() != A11_COMMIT:
        fail("A11 commit cannot be resolved")
    if git("rev-parse", f"{ACCEPTED_SUBJECT}^{{commit}}").strip() != ACCEPTED_SUBJECT:
        fail("accepted subject cannot be resolved")

    for path, expected_length, expected_sha in A11_FILES:
        committed = git_bytes(A11_COMMIT, path)
        if len(committed) != expected_length or sha256_bytes(committed) != expected_sha:
            fail(f"A11 Git-object identity mismatch: {path}")
        worktree = (REPO_ROOT / path).read_bytes()
        if worktree != committed:
            fail(f"A11 worktree drift: {path}")
        parse_json_bytes(committed, f"{A11_COMMIT}:{path}")

    disposition = parse_json_bytes(git_bytes(A11_COMMIT, A11_FILES[0][0]), "A11 disposition")
    if disposition.get("disposition") != "contract-defect":
        fail("A11 disposition is not contract-defect")
    if disposition.get("findingIds") != [f"CS6-1-CONTRACT-00{i}" for i in range(1, 5)]:
        fail("A11 finding IDs mismatch")
    verification = parse_json_bytes(git_bytes(A11_COMMIT, A11_FILES[2][0]), "A11 verification")
    if verification.get("overallVerdict") != "contract-defect-stop-verified":
        fail("A11 independent verdict mismatch")

    for filename, expected_length, expected_sha in ACCEPTED_MEMBERS:
        path = f"{ACCEPTED_BASE}/{filename}"
        committed = git_bytes(ACCEPTED_SUBJECT, path)
        if len(committed) != expected_length or sha256_bytes(committed) != expected_sha:
            fail(f"accepted member Git identity mismatch: {filename}")
        worktree = (REPO_ROOT / path).read_bytes()
        if worktree != committed:
            fail(f"accepted member worktree drift: {filename}")
        parse_json_bytes(committed, f"{ACCEPTED_SUBJECT}:{path}")


def validate_protected_baseline() -> dict[str, Any]:
    for path, expected_sha in PROTECTED_FILES.items():
        data = (REPO_ROOT / path).read_bytes()
        if sha256_bytes(data) != expected_sha:
            fail(f"protected file hash mismatch: {path}")

    submodule_evidence: list[dict[str, Any]] = []
    for path, expected in SUBMODULES.items():
        submodule_root = REPO_ROOT / path
        commit = git("rev-parse", "HEAD", cwd=submodule_root).strip()
        status = tuple(git("status", "--short", "--untracked-files=all", cwd=submodule_root).splitlines())
        if commit != expected["commit"]:
            fail(f"submodule commit mismatch: {path}")
        if status != expected["status"]:
            fail(f"submodule dirty-state mismatch: {path}")
        submodule_evidence.append({"commit": commit, "path": path, "statusShort": list(status)})

    cs5_path = REPO_ROOT / CS5_DECISION
    if not cs5_path.is_file():
        fail("protected untracked CS5 decision is missing")
    cs5_data = cs5_path.read_bytes()
    if len(cs5_data) != CS5_DECISION_LENGTH or sha256_bytes(cs5_data) != CS5_DECISION_SHA256:
        fail("protected untracked CS5 decision identity mismatch")
    parse_json_bytes(cs5_data, CS5_DECISION)
    return {"submodules": submodule_evidence}


def validate_task_packages() -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    for task_path in (CAMPAIGN, AUTHOR, ASSURANCE, DECISION):
        result = run([sys.executable, "./.trellis/scripts/task.py", "validate", task_path])
        if result.returncode != 0:
            fail(f"task validation failed for {task_path}: {result.stdout.strip()} {result.stderr.strip()}")
        results.append({"exitCode": result.returncode, "path": task_path, "status": "pass"})
    return results


def validate_diff_check() -> dict[str, Any]:
    result = run(["git", "diff", "--check", "--", *G131_PATHS])
    if result.returncode != 0:
        fail(f"G131 diff check failed: {result.stdout.strip()} {result.stderr.strip()}")
    return {"exitCode": 0, "pathCount": len(G131_PATHS), "status": "pass"}


def build_evidence(
    task_results: list[dict[str, Any]], protected: dict[str, Any], classifier: dict[str, Any]
) -> dict[str, Any]:
    return {
        "approvedPathCount": len(G131_PATHS),
        "approvedPaths": list(G131_PATHS),
        "authority": {"taskExecutionAuthorized": False, **{key: False for key in DENIAL_FIELDS}},
        "checks": [
            {"checkId": "strict-json-jsonl-and-final-lf", "status": "pass"},
            {"checkId": "exact-36-plus-five-inherited-dirty-set-and-empty-stage", "status": "pass"},
            {"checkId": "reciprocal-topology-status-assignee-inactivity", "status": "pass"},
            {"checkId": "task-metadata-activation-and-authority-denials", "status": "pass"},
            {"checkId": "exact-boundary-output-inventories", "status": "pass"},
            {"checkId": "common-governance-authority-denials", "status": "pass"},
            {"checkId": "a11-and-v1.3.0-git-object-identities", "status": "pass"},
            {"checkId": "accepted-and-historical-worktree-no-drift", "status": "pass"},
            {"checkId": "protected-hashes-submodules-and-cs5-decision", "status": "pass"},
            {"checkId": "append-only-canonical-parent-overlays", "status": "pass"},
            {
                "checkId": "closed-classifier-specification-against-immutable-v1.3.0-structures",
                "status": "pass",
            },
        ],
        "classifierSpecification": classifier,
        "currentHead": A11_COMMIT,
        "date": "2026-08-08",
        "g131TaskExecutionAuthorized": True,
        "inventories": EXPECTED_COUNTS,
        "noCommitPerformed": True,
        "pathScopedDiffCheck": validate_diff_check(),
        "protected": protected,
        "recordKind": "g131-validation-evidence",
        "schemaVersion": 1,
        "taskValidators": task_results,
        "verdict": "pass",
        "writeScope": EVIDENCE_PATH,
    }


def validate_all(allow_missing_evidence: bool) -> tuple[dict[str, Any], bytes]:
    if len(G131_PATHS) != 36 or len(set(G131_PATHS)) != 36:
        fail("internal G131 path constant is not exactly 36 unique paths")
    if EXPECTED_COUNTS != {"G131": 36, "A131-0": 2, "A131-1": 15, "B131-0": 2, "B131-1": 11, "O131-0": 2, "O131-1": 1}:
        fail("internal boundary counts mismatch")

    for path in G131_PATHS:
        validate_file_syntax(path, allow_missing_evidence)
    validate_scope(allow_missing_evidence)
    validate_parent_overlays()
    validate_topology_and_tasks()
    classifier = validate_governance_records()
    validate_git_identities()
    protected = validate_protected_baseline()
    task_results = validate_task_packages()
    evidence = build_evidence(task_results, protected, classifier)
    return evidence, canonical_json_bytes(evidence)


def write_mode() -> None:
    evidence, expected_bytes = validate_all(allow_missing_evidence=True)
    evidence_path = REPO_ROOT / EVIDENCE_PATH
    evidence_path.write_bytes(expected_bytes)
    validate_file_syntax(EVIDENCE_PATH, allow_missing_evidence=False)
    validate_scope(allow_missing_evidence=False)
    actual = parse_json_bytes(evidence_path.read_bytes(), EVIDENCE_PATH)
    validate_authority(actual.get("authority"), False, EVIDENCE_PATH)
    if actual != evidence:
        fail("written validation evidence differs from deterministic expected evidence")
    print("G131 validation write: pass")


def verify_mode() -> None:
    evidence, expected_bytes = validate_all(allow_missing_evidence=False)
    actual_bytes = (REPO_ROOT / EVIDENCE_PATH).read_bytes()
    if actual_bytes != expected_bytes:
        fail("validation evidence is not byte-identical to deterministic recomputation")
    actual = parse_json_bytes(actual_bytes, EVIDENCE_PATH)
    validate_authority(actual.get("authority"), False, EVIDENCE_PATH)
    if actual != evidence:
        fail("validation evidence content mismatch")
    print("G131 validation verify: pass")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--write", action="store_true", help="Validate and write only g131-validation-evidence.json")
    mode.add_argument("--verify", action="store_true", help="Read-only validation and byte comparison")
    args = parser.parse_args()
    try:
        if args.write:
            write_mode()
        else:
            verify_mode()
    except ValidationError as exc:
        print(f"G131 validation failed: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
