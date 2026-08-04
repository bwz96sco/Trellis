from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import locale
import re
import shutil
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[4]
TASK_RESEARCH = Path(__file__).resolve().parent
CONTRACT_VERSION = "evaluation-contract-v1.3.0"
ACTIVE_VERSION = "evaluation-contract-v1.2.0"
ACTIVE_DIGEST = "57d1956bf4453b497cce0e288c95d7194491ddac611570e8e0c8c0aefb7516bb"
INFRASTRUCTURE_REFERENCE = "ccd5bb3afc99283252c599916a2b8c2e05075cc6"
PROVENANCE_CLASSES = [
    "inherited-public-v1.2",
    "trellis-native-v1.3",
    "inapplicable",
    "blocked-by-contract",
]
FAMILY_INDEXES = {
    "research-review-case": 0,
    "research-review-campaign": 1,
    "research-project-setup": 5,
    "research-experiment-campaign": 7,
    "research-computation": 8,
    "research-quest": 14,
    "research-quest-admin": 15,
}
EXPECTED_FAMILY_TOTALS = {
    "research-review-case": 22,
    "research-review-campaign": 3,
    "research-project-setup": 9,
    "research-experiment-campaign": 16,
    "research-computation": 9,
    "research-quest": 1,
    "research-quest-admin": 4,
}
OMITTED_BY_LATER_50 = {
    ("research-review-case", "dimension-presentation.md"),
    ("research-review-case", "dimension-proof.md"),
    ("research-review-case", "dimension-style-impressions.md"),
    ("research-review-case", "finding-contract.md"),
    ("research-review-case", "findings/"),
    ("research-review-case", "findings/<dimension>.findings.json"),
    ("research-review-case", "hack-pattern-taxonomy.md"),
    ("research-review-case", "observability-and-independence.md"),
    ("research-review-case", "pattern-routing.md"),
    ("research-review-case", "review-case.yaml"),
    ("research-experiment-campaign", "reports/<campaign>/rounds/<round-id>.html"),
    ("research-experiment-campaign", "reports/<campaign>/rounds/<round_id>.html"),
    ("research-experiment-campaign", "results_ledger.csv"),
    ("research-experiment-campaign", "run_matrix.yaml"),
}
CLOSURE_CASE_POINTERS = {
    "research-literature": [20, 21, 22],
    "research-ideation": [37, 38, 39, 53],
    "research-idea-evaluation": [60, 61, 63, 77],
    "research-experiment": [91, 96, 97],
}
CLOSURE_FAMILIES = list(CLOSURE_CASE_POINTERS)
DIMENSIONS = [
    "requiredness",
    "cardinality",
    "mediaType",
    "producer",
    "consumers",
    "repositoryArtifactRefRelation",
    "stableId",
    "provenance",
    "dependencies",
    "immutableFieldsAndMutationAuthority",
    "transitions",
    "terminalApplicability",
    "crossArtifactConsistency",
]
DIMENSION_DECISION_IDS = {
    "requiredness": "DEC-V13-LIFECYCLE-REQUIREDNESS",
    "cardinality": "DEC-V13-LIFECYCLE-CARDINALITY",
    "mediaType": "DEC-V13-LIFECYCLE-MEDIA",
    "producer": "DEC-V13-LIFECYCLE-PRODUCER",
    "consumers": "DEC-V13-LIFECYCLE-CONSUMERS",
    "repositoryArtifactRefRelation": "DEC-V13-LIFECYCLE-ARTIFACTREF",
    "stableId": "DEC-V13-LIFECYCLE-STABLE-ID",
    "provenance": "DEC-V13-LIFECYCLE-PROVENANCE",
    "dependencies": "DEC-V13-LIFECYCLE-DEPENDENCIES",
    "immutableFieldsAndMutationAuthority": "DEC-V13-LIFECYCLE-IMMUTABILITY",
    "transitions": "DEC-V13-LIFECYCLE-TRANSITIONS",
    "terminalApplicability": "DEC-V13-LIFECYCLE-TERMINAL",
    "crossArtifactConsistency": "DEC-V13-LIFECYCLE-CONSISTENCY",
}
DIMENSION_VALIDATORS = {
    "requiredness": "trellis.artifact.requiredness",
    "cardinality": "trellis.artifact.cardinality",
    "mediaType": "trellis.artifact.media-type",
    "producer": "trellis.artifact.authority",
    "consumers": "trellis.artifact.authority",
    "repositoryArtifactRefRelation": "trellis.artifact.ref-binding",
    "stableId": "trellis.artifact.stable-id",
    "provenance": "trellis.artifact.provenance",
    "dependencies": "trellis.artifact.dependencies",
    "immutableFieldsAndMutationAuthority": "trellis.artifact.immutability",
    "transitions": "trellis.artifact.transitions",
    "terminalApplicability": "trellis.artifact.terminal-applicability",
    "crossArtifactConsistency": "trellis.artifact.cross-consistency",
}
EXPLICIT_MEDIA_TYPES = {
    "application/json": {
        "artifact-manifest.json",
        "claims-ledger.json",
        "findings/<dimension>.findings.json",
        "graph.json",
        "campaign_data/<campaign>/report_provenance.json",
        "report_provenance.json",
        "methodology/closure/research-literature.json",
        "methodology/closure/research-ideation.json",
        "methodology/closure/research-idea-evaluation.json",
        "methodology/closure/research-experiment.json",
    },
    "application/x-ndjson": {
        "computation_nodes.jsonl",
        "evidence/computation_nodes.jsonl",
        "research-events.jsonl",
    },
    "application/yaml": {
        "review-case.yaml",
        "review-campaign.yaml",
        "assets/manifest.yaml",
        "manifest.yaml",
        "campaigns/<id>.yaml",
        "run_matrix.yaml",
        "research-quest.yaml",
    },
    "text/csv": {"claim_ledger.csv", "results_ledger.csv"},
    "text/html": {
        "graph.html",
        "reports/<campaign>/index.html",
        "reports/<campaign>/rounds/<round-id>.html",
        "reports/index.html",
    },
    "text/markdown": {
        "REVIEW_CASE_STATUS.md",
        "adjudicator-gates.md",
        "dimension-adversarial.md",
        "dimension-baseline.md",
        "dimension-citation.md",
        "dimension-consistency.md",
        "dimension-eval-design.md",
        "dimension-experiment.md",
        "dimension-ledger.md",
        "dimension-novelty.md",
        "dimension-presentation.md",
        "dimension-proof.md",
        "dimension-style-impressions.md",
        "finding-contract.md",
        "hack-pattern-taxonomy.md",
        "observability-and-independence.md",
        "pattern-routing.md",
        "CAMPAIGN_CLOSURE.md",
        "AGENTS.md",
        "SUMMARY.md",
        "artifacts/intake/state_audit.md",
        "graphify-out/GRAPH_REPORT.md",
        "literature-index.md",
        "03_run_plan.md",
        "MANIFEST.md",
        "README.md",
        "analysis_campaign.md",
        "campaign_data/<campaign>/MANIFEST.md",
        "campaign_data/<campaign>/README.md",
        "execution_log.md",
        "evidence/01_computation_brief.md",
        "evidence/02_environment_preflight.md",
        "evidence/03_execution_log.md",
        "evidence/04_validation_report.md",
        "evidence/05_claim_handoff.md",
        "evidence/MANIFEST.md",
        "QUEST_STATUS.md",
    },
}
MEDIA_TYPE_BY_IDENTITY = {
    identity: media_type
    for media_type, identities in EXPLICIT_MEDIA_TYPES.items()
    for identity in identities
}

VALIDATOR_RULE_KINDS = {
    "trellis.artifact.requiredness": ["artifact.requiredness"],
    "trellis.artifact.cardinality": ["artifact.cardinality"],
    "trellis.artifact.media-type": ["artifact.mediaType"],
    "trellis.artifact.authority": ["artifact.producer", "artifact.consumers"],
    "trellis.artifact.ref-binding": ["artifact.repositoryArtifactRefRelation"],
    "trellis.artifact.stable-id": ["artifact.stableId"],
    "trellis.artifact.provenance": ["artifact.provenance"],
    "trellis.artifact.dependencies": ["artifact.dependencies"],
    "trellis.artifact.immutability": ["artifact.immutableFieldsAndMutationAuthority"],
    "trellis.artifact.transitions": ["artifact.transitions"],
    "trellis.artifact.terminal-applicability": ["artifact.terminalApplicability"],
    "trellis.artifact.cross-consistency": ["artifact.crossArtifactConsistency"],
    "trellis.closure.schema": ["closure.schema"],
    "trellis.closure.evidence": ["closure.evidence"],
    "trellis.closure.xor": ["closure.xor"],
    "trellis.closure.status-inference": ["closure.status-inference"],
    "trellis.authority.worker-boundary": ["authority.worker-boundary", "closure.worker-boundary"],
    "trellis.validator.binding-integrity": ["validator.binding-integrity"],
    "trellis.report.v2-binding": ["report.v2-binding"],
    "trellis.contract.integrity": [
        "contract.blocked-output-kind",
        "contract.candidate-authority",
        "contract.canonical-bytes",
        "contract.closure-applicability",
        "contract.compatibility",
        "contract.conditional-artifacts",
        "contract.differential-domains",
        "contract.output-disposition",
    ],
}

VALIDATOR_ERRORS = {
    "trellis.artifact.requiredness": ["V13_ARTIFACT_REQUIRED_MISSING"],
    "trellis.artifact.cardinality": ["V13_ARTIFACT_CARDINALITY_INVALID"],
    "trellis.artifact.media-type": ["V13_ARTIFACT_MEDIA_TYPE_INVALID"],
    "trellis.artifact.authority": ["V13_ARTIFACT_AUTHORITY_INVALID"],
    "trellis.artifact.ref-binding": ["V13_ARTIFACT_REF_BINDING_INVALID"],
    "trellis.artifact.stable-id": ["V13_ARTIFACT_STABLE_ID_INVALID"],
    "trellis.artifact.provenance": ["V13_ARTIFACT_PROVENANCE_INVALID"],
    "trellis.artifact.dependencies": ["V13_ARTIFACT_DEPENDENCY_INVALID"],
    "trellis.artifact.immutability": ["V13_ARTIFACT_IMMUTABLE_FIELD_CHANGED"],
    "trellis.artifact.transitions": ["V13_ARTIFACT_TRANSITION_INVALID"],
    "trellis.artifact.terminal-applicability": ["V13_ARTIFACT_TERMINAL_APPLICABILITY_INVALID"],
    "trellis.artifact.cross-consistency": ["V13_ARTIFACT_CROSS_CONSISTENCY_INVALID"],
    "trellis.closure.schema": ["V13_CLOSURE_SCHEMA_INVALID"],
    "trellis.closure.evidence": ["V13_CLOSURE_EVIDENCE_INVALID"],
    "trellis.closure.xor": ["V13_CLOSURE_EXCLUSIVITY_INVALID"],
    "trellis.closure.status-inference": ["V13_CLOSURE_STATUS_INFERENCE_FORBIDDEN"],
    "trellis.authority.worker-boundary": ["V13_WORKER_AUTHORITY_WIDENING"],
    "trellis.validator.binding-integrity": ["V13_VALIDATOR_BINDING_INVALID"],
    "trellis.report.v2-binding": ["V13_REPORT_V2_BINDING_INVALID"],
    "trellis.contract.integrity": [
        "V13_CANONICAL_BYTES_INVALID",
        "V13_CANDIDATE_AUTHORITY_INVALID",
        "V13_CLOSURE_APPLICABILITY_INVALID",
        "V13_COMPATIBILITY_BINDING_INVALID",
        "V13_CONDITIONAL_ARTIFACT_DECISION_INVALID",
        "V13_DIFFERENTIAL_DOMAIN_INVALID",
        "V13_OUTPUT_DISPOSITION_INVALID",
        "V13_OUTPUT_KIND_BLOCKED",
    ],
}
SOURCE_DEFS = [
    ("SRC-EVAL-V12", ".trellis/tasks/archive/2026-07/07-29-close-phase1-fidelity-pass-gate/research/evaluation-contract-v1.2.0.md", "a6e7382eb274d9ce4d9e3afe23fa5a9810d61ed1b2d9d39c0b0b50b15f591f1a", "text/markdown", "frozen-v1.2-authority"),
    ("SRC-TARGET-V12", ".trellis/tasks/archive/2026-07/07-29-close-phase1-fidelity-pass-gate/research/frozen-migration-target-v1.2.json", ACTIVE_DIGEST, "application/json", "frozen-v1.2-authority"),
    ("SRC-INVENTORY-V12", ".trellis/tasks/archive/2026-07/07-29-close-phase1-fidelity-pass-gate/research/normalized-workflow-inventory-v1.2.json", "ed1ed07252861da7ef39c9803ad0fc5894721da5a8585267deafd3e6df20873c", "application/json", "frozen-v1.2-authority"),
    ("SRC-IO-V12", ".trellis/tasks/archive/2026-07/07-29-close-phase1-fidelity-pass-gate/research/io-mapping-ledger-v1.2.csv", "b2a20152f961d566fb2b5e36ec7911bf56b5042d7695374746ce19baf5204999", "text/csv", "frozen-v1.2-authority"),
    ("SRC-DFT-V12", ".trellis/tasks/archive/2026-07/07-29-close-phase1-fidelity-pass-gate/research/differential-test-matrix-v1.2.json", "b4d9a6d46920e56ef1092b32d1e1a8fad8d85b98f6bbda7109eec9bd580e4834", "application/json", "frozen-v1.2-authority"),
    ("SRC-IMPROVE-V12", ".trellis/tasks/archive/2026-07/07-29-close-phase1-fidelity-pass-gate/research/phase2-improve-register-v1.2.json", "7a03293726e9543b5ac49740d2cf3a815c5f75213b06722f0592af6c89f2720b", "application/json", "frozen-v1.2-authority"),
    ("SRC-HANDOFF-V12", ".trellis/tasks/archive/2026-07/07-29-close-phase1-fidelity-pass-gate/research/phase-2-differential-handoff-v1.2.md", "1ee44146b3a628486e1af9e92f58e9ba471e7b5912753be17a3870defedd984c", "text/markdown", "frozen-v1.2-authority"),
    ("SRC-VALIDATOR-INVENTORY", ".trellis/tasks/archive/2026-07/07-28-audit-research-workflow-validator-assurance/research/validator-inventory.json", "3af86c466b613fa5e6cd7a49c172d13ecccf0051a29552a118de5154d63a59f8", "application/json", "public-assurance-only"),
    ("SRC-VALIDATOR-ASSURANCE", ".trellis/tasks/archive/2026-07/07-28-audit-research-workflow-validator-assurance/research/validator-assurance-report.md", "2ac65442ab164763545b2086e3567ce59ec1c1fd34cf04293b3798005e948fc2", "text/markdown", "public-assurance-only"),
    ("SRC-WAVE8-GAP-AUDIT", ".trellis/tasks/07-29-migrate-research-methodology-to-procedures/research/wave8-r2a-frozen-v1.2-evidence-gap-audit.md", "d4415b8cec1e1e8e66ed20ce7416a6969e441a266f5256cbafb579b8d5af0933", "text/markdown", "public-gap-audit"),
    ("SRC-C0-LOCK", ".trellis/tasks/07-29-migrate-research-methodology-to-procedures/research/c0-v1.3-planning-preservation-lock.json", "062b29f85ec49433dbe08afabaa481d5c5e416510c951bc41bdcd75256588a3a", "application/json", "planning-preservation"),
    ("SRC-OWNERSHIP", ".trellis/tasks/07-29-migrate-research-methodology-to-procedures/research/path-ownership-map.md", "cc9eec861147ddadc93b8a71ec191530e679245b7ac2fd122d9fd86fa64d0fe1", "text/markdown", "planning-preservation"),
    ("SRC-EXPANSION-38", ".trellis/tasks/07-29-migrate-research-methodology-to-procedures/research/phase2-expansion-case-allocation.json", "d70c0fbe3a23860b3113acfd87419a512da95d61c1cd5c5cfa8f9f4b8d09715a", "application/json", "post-freeze-comparison-only"),
    ("SRC-PHASE2-PINS", ".trellis/research/phase-2-pins.md", "710f683ddc7be8193a05916c3cc7f3d805daf8888e2ee16318854a154c0bf5fc", "text/markdown", "public-control-plane"),
    ("SRC-RESEARCH-STATE-SPEC", ".trellis/spec/core/backend/research-state.md", "25f2285065bf39f3d15da94cf330c0743f6c4c4c764b3a69f321f1699b69d235", "text/markdown", "public-control-plane"),
    ("SRC-RESEARCH-COMMAND-SPEC", ".trellis/spec/cli/backend/commands-research.md", "8d06e6b554e62bbeca9b78278967b6c6151831496613674b4a23fb1f77d1b0bf", "text/markdown", "public-control-plane"),
    ("SRC-FILESYSTEM-SAFETY-SPEC", ".trellis/spec/cli/backend/filesystem-safety.md", "9e55a7a327f4e2e1cad0c785cfe31e973b07eaae20fbe1c6142305451054bbf0", "text/markdown", "public-control-plane"),
]


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def strict_json_bytes(data: bytes, source: str) -> Any:
    if data.startswith(b"\xef\xbb\xbf"):
        raise ValueError(f"BOM forbidden: {source}")
    text = data.decode("utf-8", errors="strict")

    def no_duplicates(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
        result: dict[str, Any] = {}
        for key, value in pairs:
            if key in result:
                raise ValueError(f"duplicate decoded key {key!r}: {source}")
            result[key] = value
        return result

    def reject_nonfinite(token: str) -> None:
        raise ValueError(f"non-finite JSON number {token}: {source}")

    value = json.loads(
        text,
        object_pairs_hook=no_duplicates,
        parse_constant=reject_nonfinite,
    )

    def reject_unpaired_surrogates(item: Any) -> None:
        if isinstance(item, str):
            if any(0xD800 <= ord(character) <= 0xDFFF for character in item):
                raise ValueError(f"unpaired surrogate escape: {source}")
        elif isinstance(item, list):
            for child in item:
                reject_unpaired_surrogates(child)
        elif isinstance(item, dict):
            for key, child in item.items():
                reject_unpaired_surrogates(key)
                reject_unpaired_surrogates(child)

    reject_unpaired_surrogates(value)
    return value


def canonical_json(value: Any) -> bytes:
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")


def write_json(output_dir: Path, name: str, value: Any) -> None:
    (output_dir / name).write_bytes(canonical_json(value))


def slug(value: str) -> str:
    normalized = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return normalized[:72] or "item"


def stable_id(prefix: str, *parts: str) -> str:
    joined = "\0".join(parts)
    return f"{prefix}-{slug('-'.join(parts))}-{hashlib.sha256(joined.encode()).hexdigest()[:10]}"


def provenance(class_name: str, reference: str | list[str]) -> dict[str, Any]:
    if class_name == "inherited-public-v1.2":
        refs = [reference] if isinstance(reference, str) else reference
        return {"class": class_name, "evidenceIds": refs}
    key = "decisionId" if class_name == "trellis-native-v1.3" else "recordId"
    if not isinstance(reference, str):
        raise TypeError("non-inherited provenance requires one record reference")
    return {"class": class_name, key: reference}


def normative(value: Any, class_name: str, reference: str | list[str]) -> dict[str, Any]:
    return {"provenance": provenance(class_name, reference), "value": value}


def resolve_json_pointer(value: Any, pointer: str) -> Any:
    if pointer == "":
        return value
    if not pointer.startswith("/"):
        raise ValueError(f"invalid JSON pointer: {pointer}")
    current = value
    for raw in pointer[1:].split("/"):
        token = raw.replace("~1", "/").replace("~0", "~")
        if isinstance(current, list):
            current = current[int(token)]
        elif isinstance(current, dict):
            current = current[token]
        else:
            raise ValueError(f"pointer traverses scalar: {pointer}")
    return current


def media_type(identity: str) -> str:
    try:
        return MEDIA_TYPE_BY_IDENTITY[identity]
    except KeyError as error:
        raise ValueError(f"no explicit Trellis-native media decision for {identity}") from error


def decision(
    decision_id: str,
    statement: str,
    gap_evidence_ids: list[str],
    rationale: str,
    rejected: list[str],
    compatibility: str,
    visibility: dict[str, str],
    validator_obligations: list[str],
    fixture_obligations: list[str],
) -> dict[str, Any]:
    return {
        "compatibilityEffect": compatibility,
        "decisionId": decision_id,
        "fixtureObligations": fixture_obligations,
        "gapEvidenceIds": gap_evidence_ids,
        "provenanceClass": "trellis-native-v1.3",
        "rationale": rationale,
        "rejectedAlternatives": rejected,
        "statement": statement,
        "validatorObligations": validator_obligations,
        "visibility": visibility,
    }


def build(output_dir: Path) -> list[str]:
    output_dir.mkdir(parents=True, exist_ok=True)
    source_objects: dict[str, Any] = {}
    sources = []
    for source_id, rel, expected, media, authority in SOURCE_DEFS:
        path = REPO_ROOT / rel
        data = path.read_bytes()
        actual = sha256_bytes(data)
        if actual != expected:
            raise ValueError(f"source digest mismatch for {rel}: {actual} != {expected}")
        if media == "application/json":
            source_objects[source_id] = strict_json_bytes(data, rel)
        sources.append({
            "authorityClass": authority,
            "byteLength": len(data),
            "mediaType": media,
            "path": rel,
            "sha256": expected,
            "sourceId": source_id,
        })

    inventory = source_objects["SRC-INVENTORY-V12"]
    frozen_target_v12 = source_objects["SRC-TARGET-V12"]
    dft = source_objects["SRC-DFT-V12"]
    improve = source_objects["SRC-IMPROVE-V12"]
    expansion = source_objects["SRC-EXPANSION-38"]
    c0_lock = source_objects["SRC-C0-LOCK"]
    if frozen_target_v12["evaluation_contract_version"] != ACTIVE_VERSION:
        raise ValueError("active methodology identity drift")
    if dft["case_count"] != 229 or len(dft["cases"]) != 229:
        raise ValueError("frozen differential count drift")
    if expansion["counts"]["total"] != 38 or expansion["relationshipToFrozenMatrix"] != "additional-not-part-of-229":
        raise ValueError("expansion differential domain drift")
    if c0_lock["methodology"]["active"]["digest"] != ACTIVE_DIGEST:
        raise ValueError("C0 active methodology pin drift")

    io_path = REPO_ROOT / next(rel for source_id, rel, *_ in SOURCE_DEFS if source_id == "SRC-IO-V12")
    io_rows = list(csv.DictReader(io.StringIO(io_path.read_text(encoding="utf-8", newline=""))))
    io_lookup = {(row["package"], row["artifact"]): (index + 2, row) for index, row in enumerate(io_rows)}

    facts: list[dict[str, Any]] = []

    def add_json_fact(evidence_id: str, source_id: str, pointer: str, normalized_fact: Any, supported_scope: list[str]) -> None:
        actual = resolve_json_pointer(source_objects[source_id], pointer)
        if actual != normalized_fact:
            raise ValueError(f"fact pointer mismatch: {evidence_id}")
        facts.append({
            "authorityClass": next(source["authorityClass"] for source in sources if source["sourceId"] == source_id),
            "citation": {"kind": "json-pointer", "pointer": pointer},
            "evidenceId": evidence_id,
            "normalizedFact": normalized_fact,
            "sourceId": source_id,
            "supportedScope": supported_scope,
        })

    def add_line_fact(evidence_id: str, source_id: str, start: int, end: int, normalized_fact: str, supported_scope: list[str]) -> None:
        rel = next(source["path"] for source in sources if source["sourceId"] == source_id)
        lines = (REPO_ROOT / rel).read_text(encoding="utf-8").splitlines()
        if start < 1 or end > len(lines) or start > end:
            raise ValueError(f"line citation out of range: {evidence_id}")
        facts.append({
            "authorityClass": next(source["authorityClass"] for source in sources if source["sourceId"] == source_id),
            "citation": {"endLine": end, "kind": "line-range", "startLine": start},
            "evidenceId": evidence_id,
            "normalizedFact": normalized_fact,
            "sourceId": source_id,
            "supportedScope": supported_scope,
        })

    add_line_fact("EV-METHODOLOGY-V12-LABEL", "SRC-EVAL-V12", 1, 7, f"{ACTIVE_VERSION} is the frozen public methodology label.", ["methodology identity", "freeze status"])
    add_json_fact("EV-METHODOLOGY-V12-TARGET", "SRC-TARGET-V12", "/evaluation_contract_version", ACTIVE_VERSION, ["methodology identity"])
    add_json_fact("EV-DIFFERENTIAL-229", "SRC-DFT-V12", "/case_count", 229, ["frozen differential identity count"])
    add_json_fact("EV-EXPANSION-38", "SRC-EXPANSION-38", "/counts/total", 38, ["post-freeze expansion count only"])
    add_json_fact("EV-CLOSURE-IMPROVE", "SRC-IMPROVE-V12", "/items/0/requirements/9", "exactly-one-selected-or-blocked-closure", ["high-level ideation closure requirement"])
    add_line_fact("EV-WAVE8-LIFECYCLE-GAP", "SRC-WAVE8-GAP-AUDIT", 13, 33, "Public v1.2 lacks all 13 artifact-specific lifecycle dimensions, canonical closure fields, and exact validator bindings.", ["v1.3 gap basis"])
    add_line_fact("EV-WAVE8-NO-INFERENCE", "SRC-WAVE8-GAP-AUDIT", 35, 48, "Filename, presence, package ownership, and Result status inference are forbidden as frozen-v1.2 semantics.", ["v1.3 fail-closed rationale"])
    add_line_fact("EV-WAVE8-64-VS-50", "SRC-WAVE8-GAP-AUDIT", 226, 234, "The seven lifecycle-modeled families contain 64 public outputs; the later skeleton retained 50 without a source rule.", ["64-output completeness", "14-output omission explanation"])
    add_line_fact("EV-WAVE8-CLOSURE-GAP", "SRC-WAVE8-GAP-AUDIT", 253, 300, "Four public families have high-level selected/blocked expectations but no canonical derivation fields and no status heuristic authority.", ["closure family set", "closure field gap"])
    add_line_fact("EV-WAVE8-VALIDATOR-GAP", "SRC-WAVE8-GAP-AUDIT", 302, 319, "Public v1.2 has no stable Trellis validator ID/version registry or per-rule bindings.", ["validator registry gap"])
    add_line_fact("EV-WAVE8-FORWARD-REPAIR", "SRC-WAVE8-GAP-AUDIT", 433, 481, "Reviewed v1.3+ semantics must define lifecycle, coverage, closure, validator, report, and compatibility rules.", ["minimum forward repair"])
    add_line_fact("EV-CONTROL-ARTIFACT-POINTERS", "SRC-RESEARCH-STATE-SPEC", 24, 31, "Human-authored artifacts remain content; canonical Research stores pointers/digests and exposes typed validated mutations only.", ["ArtifactRef boundary", "root mutation boundary"])
    add_line_fact("EV-CONTROL-ZERO-WRITE", "SRC-RESEARCH-COMMAND-SPEC", 157, 168, "Dispatch Context validation is strictly zero-write.", ["pre-record zero-write boundary"])
    add_line_fact("EV-CONTROL-PROPOSAL-ONLY", "SRC-RESEARCH-COMMAND-SPEC", 267, 279, "Workers return untrusted Result plus pending Proposal; root explicitly records and reviews it.", ["worker/root authority boundary"])
    add_line_fact("EV-CONTROL-VERSION-DOMAINS", "SRC-OWNERSHIP", 10, 18, "Procedure package, Research event, and worker Context schemas are separate version domains.", ["independent version domains"])
    add_line_fact("EV-CONTROL-HISTORICAL-PROCEDURES", "SRC-OWNERSHIP", 181, 222, "Procedure 2.0.0 and 2.0.1 remain historical; 2.0.2 is the forward semantic repair and historical bytes are not rewritten.", ["historical Procedure compatibility"])
    add_line_fact("EV-CONTROL-203-FORWARD", "SRC-OWNERSHIP", 224, 278, "Wave-8 forward repair issues only Procedure 2.0.3 and does not mutate earlier version trees.", ["future Procedure binding"])
    add_line_fact("EV-CONTROL-V13-OWNERSHIP", "SRC-OWNERSHIP", 318, 381, "V13-A owns only its task and research candidate; commit, assurance, activation, packaging, release, publication, and push remain separate.", ["candidate authority", "path ownership"])
    add_line_fact("EV-CONTROL-PINS", "SRC-PHASE2-PINS", 1, 25, f"The active methodology remains {ACTIVE_VERSION} with digest {ACTIVE_DIGEST}; infrastructure reference remains {INFRASTRUCTURE_REFERENCE}.", ["active methodology pin", "infrastructure reference"])

    family_evidence: dict[str, str] = {}
    output_rows: list[dict[str, Any]] = []
    output_by_key: dict[tuple[str, str], dict[str, Any]] = {}
    for family, workflow_index in FAMILY_INDEXES.items():
        workflow = inventory["workflows"][workflow_index]
        if workflow["package"] != family:
            raise ValueError(f"workflow index drift for {family}")
        outputs = workflow["durable_runtime_outputs"]
        if len(outputs) != EXPECTED_FAMILY_TOTALS[family]:
            raise ValueError(f"family total drift for {family}")
        family_ev = f"EV-FAMILY-{slug(family).upper()}"
        add_json_fact(family_ev, "SRC-INVENTORY-V12", f"/workflows/{workflow_index}/package", family, ["family identity"])
        family_evidence[family] = family_ev
        for output_index, identity in enumerate(outputs):
            output_id = stable_id("out", family, identity)
            identity_ev = f"EV-IDENTITY-{output_id.upper()}"
            io_ev = f"EV-IO-{output_id.upper()}"
            add_json_fact(identity_ev, "SRC-INVENTORY-V12", f"/workflows/{workflow_index}/durable_runtime_outputs/{output_index}", identity, ["public output identity only"])
            io_key = (family, identity)
            if io_key not in io_lookup:
                raise ValueError(f"missing IO row for {io_key}")
            row_number, io_row = io_lookup[io_key]
            if io_row != {"package": family, "artifact": identity, "class": "durable_runtime", "mapping": "procedure-artifact-contract", "status": "mapped"}:
                raise ValueError(f"unexpected IO row for {io_key}")
            facts.append({
                "authorityClass": "frozen-v1.2-authority",
                "citation": {"kind": "csv-row", "row": row_number},
                "evidenceId": io_ev,
                "normalizedFact": io_row,
                "sourceId": "SRC-IO-V12",
                "supportedScope": ["durable_runtime class", "procedure-artifact-contract mapping", "mapped status"],
            })
            row = {
                "family": family,
                "familyEvidenceId": family_ev,
                "identity": identity,
                "identityEvidenceId": identity_ev,
                "ioEvidenceId": io_ev,
                "omittedByLater50": io_key in OMITTED_BY_LATER_50,
                "outputId": output_id,
            }
            output_rows.append(row)
            output_by_key[io_key] = row

    if len(output_rows) != 64 or len({row["outputId"] for row in output_rows}) != 64:
        raise ValueError("64-output identity set is incomplete or duplicated")
    if sum(row["omittedByLater50"] for row in output_rows) != 14:
        raise ValueError("later-50 omission set must contain exactly 14 outputs")

    closure_evidence: dict[str, list[str]] = {}
    for family, indexes in CLOSURE_CASE_POINTERS.items():
        closure_evidence[family] = []
        for case_index in indexes:
            case = dft["cases"][case_index]
            evidence_id = f"EV-CLOSURE-{slug(family).upper()}-{case_index}"
            add_json_fact(evidence_id, "SRC-DFT-V12", f"/cases/{case_index}", case, ["high-level closure applicability and expected disposition only"])
            closure_evidence[family].append(evidence_id)

    decisions: list[dict[str, Any]] = []
    common_gap = ["EV-WAVE8-LIFECYCLE-GAP", "EV-WAVE8-FORWARD-REPAIR"]
    decisions.extend([
        decision("DEC-V13-DISPOSITION-INCLUDE", "Exact public materialized output identities are enforceable v1.3 artifacts unless separately classified.", ["EV-WAVE8-64-VS-50"], "Retain every exact public identity and close silent-omission gaps.", ["retain only the later first 12", "infer optionality from absence"], "Future 2.0.3 becomes stricter; historical Procedures are unchanged.", {"root": "full", "worker": "identity-and-obligations"}, ["bind all 13 lifecycle dimensions"], ["positive", "base", "critical-negative", "inapplicable"]),
        decision("DEC-V13-DISPOSITION-PATTERN", "Public identities containing placeholders are enforceable path patterns with explicit variable grammar.", ["EV-WAVE8-64-VS-50"], "A pattern is not one literal file and must not be silently collapsed.", ["treat placeholder spelling as a literal file", "drop pattern outputs"], "Only future 2.0.3 uses the pattern grammar.", {"root": "full", "worker": "pattern-and-obligations"}, ["validate path pattern and cardinality"], ["positive", "base", "critical-negative", "inapplicable"]),
        decision("DEC-V13-DISPOSITION-CONTAINER", "A trailing-slash public identity is a container and not a materialized ArtifactRef.", ["EV-WAVE8-64-VS-50"], "Containers organize pattern-backed artifacts but have no independent digest.", ["register directory as ArtifactRef", "exclude descendants"], "No historical bytes change.", {"root": "full", "worker": "container descriptor"}, ["reject container-as-artifact"], ["positive", "base", "critical-negative", "inapplicable"]),
        decision("DEC-V13-DISPOSITION-ALIAS", "The <round_id> spelling aliases the canonical <round-id> pattern.", ["EV-WAVE8-64-VS-50"], "The two public spellings denote one round-report identity and must not double count.", ["treat both as independent required outputs", "drop one spelling without an alias"], "Future 2.0.3 accepts the alias but canonicalizes identity to <round-id>; historical bytes remain unchanged.", {"root": "full", "worker": "alias mapping"}, ["reject conflicting dual materializations"], ["positive", "base", "critical-negative", "inapplicable"]),
        decision("DEC-V13-DISPOSITION-BLOCK", "An output whose material kind cannot be safely fixed is blocked and fails closed.", ["EV-WAVE8-NO-INFERENCE"], "The public spelling quest-event-candidates does not safely establish file, container, pattern, or media type.", ["infer JSON from the name", "silently exclude it"], "Future 2.0.3 cannot record this output until a later contract resolves it.", {"root": "full", "worker": "blocked descriptor only"}, ["emit V13_OUTPUT_KIND_BLOCKED"], ["critical-negative", "inapplicable"]),
        decision("DEC-V13-LIFECYCLE-REQUIREDNESS", "Every included or pattern-backed artifact is required before root recording.", common_gap, "A complete future contract needs explicit presence semantics; required is the simplest fail-closed choice.", ["silence means optional", "copy later generic defaults as inherited"], "Future 2.0.3 is stricter; historical recordings retain their original contract.", {"root": "full", "worker": "requiredness"}, ["trellis.artifact.requiredness@1.0.0 critical"], ["present", "base-present", "missing-critical", "family-inapplicable"]),
        decision("DEC-V13-LIFECYCLE-CARDINALITY", "Exact identities require one artifact; path patterns require one or more distinct canonical paths.", common_gap, "Identity kind supplies a reviewed v1.3 cardinality without pretending v1.2 declared it.", ["first match only", "unbounded duplicate identities"], "Future 2.0.3 only.", {"root": "full", "worker": "cardinality"}, ["trellis.artifact.cardinality@1.0.0 critical"], ["exact-one", "minimum-one", "duplicate-or-empty", "family-inapplicable"]),
        decision("DEC-V13-LIFECYCLE-MEDIA", "Media types are explicitly assigned by this v1.3 contract and are never inherited from filename extensions.", common_gap + ["EV-WAVE8-NO-INFERENCE"], "The reviewed map makes media type normative while acknowledging it is a new decision.", ["runtime extension inference", "unknown media default"], "Future 2.0.3 only.", {"root": "full-map", "worker": "assigned media type"}, ["trellis.artifact.media-type@1.0.0 critical"], ["matching", "base", "mismatch", "family-inapplicable"]),
        decision("DEC-V13-LIFECYCLE-PRODUCER", "Artifacts are produced only as declared worker Proposal evidence within allowed write paths.", common_gap + ["EV-CONTROL-PROPOSAL-ONLY"], "Workers may create evidence but cannot record or decide canonical state.", ["root impersonation by worker", "worker canonical mutation"], "Preserves Proposal-only authority.", {"root": "full", "worker": "proposal-only"}, ["trellis.artifact.authority@1.0.0 critical"], ["declared-worker", "base", "wrong-producer", "family-inapplicable"]),
        decision("DEC-V13-LIFECYCLE-CONSUMERS", "Root pre-record validation and root Decision review are the only normative consumers.", common_gap + ["EV-CONTROL-PROPOSAL-ONLY"], "Consumption is separated from worker production and canonical Decision authority.", ["worker self-acceptance", "implicit downstream consumer"], "Preserves root ownership.", {"root": "full", "worker": "safe consumer labels"}, ["trellis.artifact.authority@1.0.0 critical"], ["root-consumer", "base", "unauthorized-consumer", "family-inapplicable"]),
        decision("DEC-V13-LIFECYCLE-ARTIFACTREF", "Every materialized artifact binds one registered Repository ArtifactRef with exact portable path and lowercase SHA-256.", common_gap + ["EV-CONTROL-ARTIFACT-POINTERS"], "Canonical Research stores portable pointers and optional digests rather than copied bodies.", ["absolute paths", "body embedding", "repository inference"], "Uses existing control-plane invariants without changing schemas.", {"root": "full", "worker": "portable identity requirements"}, ["trellis.artifact.ref-binding@1.0.0 critical"], ["matching-ref", "base", "path-or-digest-mismatch", "family-inapplicable"]),
        decision("DEC-V13-LIFECYCLE-STABLE-ID", "Pattern variables are stable IDs with lowercase portable slug grammar and identity continuity.", common_gap, "Placeholder-backed outputs need explicit stable identity; exact paths use no extra stable ID.", ["random IDs", "position-derived IDs", "unvalidated free text"], "Future 2.0.3 only.", {"root": "full", "worker": "stable-id grammar"}, ["trellis.artifact.stable-id@1.0.0 critical"], ["stable", "base", "drift", "exact-path-inapplicable"]),
        decision("DEC-V13-LIFECYCLE-PROVENANCE", "Artifact provenance binds family, capability, Dispatch, Activation, Approval, Repository, ArtifactRef, and digest identities.", common_gap, "These existing control-plane identities provide deterministic provenance without copying private content.", ["free-form prose provenance", "worker-generated canonical IDs"], "Future 2.0.3 report/validation only; event schemas remain independent.", {"root": "full", "worker": "required public fields"}, ["trellis.artifact.provenance@1.0.0 critical"], ["complete", "base", "missing-or-drifted", "family-inapplicable"]),
        decision("DEC-V13-LIFECYCLE-DEPENDENCIES", "No content-semantic artifact dependency is authorized unless explicitly listed; the initial v1.3 list is empty.", common_gap, "Fail closed against invented semantic ordering while still making the dimension explicit.", ["infer dependencies from filenames", "copy later skeleton ordering"], "Future contracts may add reviewed dependencies; v1.3.0 has none.", {"root": "full", "worker": "empty explicit list"}, ["trellis.artifact.dependencies@1.0.0 critical"], ["empty", "base", "undeclared-dependency", "family-inapplicable"]),
        decision("DEC-V13-LIFECYCLE-IMMUTABILITY", "Accepted ArtifactRef identity, path, repository, digest, provenance identity, and stable ID are immutable; correction requires a new proposal before acceptance or a new artifact identity after acceptance.", common_gap, "Root acceptance must bind deterministic evidence and prevent silent drift.", ["in-place accepted mutation", "worker overwrite after record"], "Future 2.0.3 only; historical artifacts are not rewritten.", {"root": "full", "worker": "immutable field list"}, ["trellis.artifact.immutability@1.0.0 critical"], ["unchanged", "base", "drift", "family-inapplicable"]),
        decision("DEC-V13-LIFECYCLE-TRANSITIONS", "Artifact state transitions are absent→proposed→accepted or absent→proposed→rejected; accepted and rejected are terminal for that identity.", common_gap, "This separates worker production from root validation without adding canonical Research event kinds.", ["worker acceptance", "terminal reopen", "implicit create from presence"], "Methodology validation state only; Research event schema is unchanged.", {"root": "full", "worker": "proposal transition only"}, ["trellis.artifact.transitions@1.0.0 critical"], ["accept", "base-proposed", "invalid-transition", "family-inapplicable"]),
        decision("DEC-V13-LIFECYCLE-TERMINAL", "Lifecycle checks apply to every root recording attempt and are independent of Result status or family terminal vocabulary.", common_gap + ["EV-WAVE8-NO-INFERENCE"], "This prevents undeclared status or terminal inference.", ["copy family terminal arrays to every artifact", "skip validation on blocked status"], "Future 2.0.3 only.", {"root": "full", "worker": "recording-attempt rule"}, ["trellis.artifact.terminal-applicability@1.0.0 critical"], ["all-statuses", "base", "status-bypass", "family-inapplicable"]),
        decision("DEC-V13-LIFECYCLE-CONSISTENCY", "All artifacts in one recording share Quest, Dispatch, Activation, Approval, capability, Repository scope, and canonical non-aliased identities.", common_gap, "Cross-artifact consistency can be stated using public control-plane identities without inferring content semantics.", ["mixed dispatches", "duplicate aliases", "cross-repository drift"], "Future 2.0.3 only.", {"root": "full", "worker": "consistency keys"}, ["trellis.artifact.cross-consistency@1.0.0 critical"], ["consistent", "base", "mixed-binding", "family-inapplicable"]),
        decision("DEC-V13-CLOSURE-APPLICABILITY", "Closure validation applies only to the exact four public families research-literature, research-ideation, research-idea-evaluation, and research-experiment; every other family is inapplicable until a later reviewed contract adds it.", ["EV-WAVE8-CLOSURE-GAP"], "The public cases support these four families, while treating silence as applicability would invent a universal closure default.", ["apply closure to every family", "infer a fifth family from runtime behavior", "silently accept an undeclared family"], "Future 2.0.3 only; historical family behavior is unchanged.", {"root": "complete applicability set", "worker": "selected-family applicability descriptor"}, ["trellis.contract.integrity@1.0.0 critical applicability binding"], ["four-family-positive", "base", "undeclared-family-negative", "other-family-inapplicable"]),
        decision("DEC-V13-CLOSURE-ARTIFACT", "Each applicable closure family produces one explicit methodology/closure/<family>.json evidence artifact.", ["EV-WAVE8-CLOSURE-GAP", "EV-CONTROL-PROPOSAL-ONLY"], "An explicit artifact supplies canonical booleans without changing Result/Proposal schemas or deriving status.", ["Result.status mapping", "implicit Proposal interpretation", "generic global closure"], "Future 2.0.3 only; worker output remains Result plus pending Proposal with an ArtifactRef.", {"root": "full", "worker": "safe schema and path"}, ["closure validators are critical"], ["positive", "base", "critical-negative", "family-inapplicable"]),
        decision("DEC-V13-CLOSURE-XOR", "Exactly one of /selected/value and /blocked/value is true for each applicable family.", ["EV-WAVE8-CLOSURE-GAP", "EV-CLOSURE-IMPROVE"], "This implements the public high-level exclusivity expectation over explicit canonical booleans.", ["both true", "both false", "status-derived booleans"], "Future 2.0.3 only.", {"root": "full", "worker": "explicit boolean obligation"}, ["trellis.closure.xor@1.0.0 critical"], ["selected", "blocked", "both-or-neither", "other-family-inapplicable"]),
        decision("DEC-V13-CLOSURE-EVIDENCE", "A true closure side requires one or more bound non-closure evidence ArtifactRef IDs; a false side requires an empty evidence list, and the closure artifact cannot cite itself.", ["EV-WAVE8-CLOSURE-GAP"], "True and false become auditable facts instead of absence-based or self-referential inference.", ["null", "missing field", "unbound evidence path", "closure artifact self-reference"], "Future 2.0.3 only.", {"root": "full", "worker": "evidence-list obligation"}, ["trellis.closure.evidence@1.0.0 critical"], ["bound-true", "empty-false", "mismatch-or-self-reference", "other-family-inapplicable"]),
        decision("DEC-V13-CLOSURE-NO-STATUS", "No Result.status value may produce selected or blocked closure facts.", ["EV-WAVE8-NO-INFERENCE", "EV-WAVE8-CLOSURE-GAP"], "The public contract supplies no such mapping.", ["completed→selected", "failed→blocked", "partial→selected"], "Preserves report-v1 replay and current Result semantics.", {"root": "full", "worker": "prohibition only"}, ["trellis.closure.status-inference@1.0.0 critical"], ["explicit-facts", "base", "status-only-rejected", "other-family-inapplicable"]),
        decision("DEC-V13-VALIDATOR-REGISTRY", "A root-owned trusted registry defines exact validator IDs, versions, fixed critical severity, fact schemas, and stable errors.", ["EV-WAVE8-VALIDATOR-GAP"], "Exact bindings are required for safe enforcement and cannot be borrowed from private or later universal defaults.", ["path-based private validator identity", "unknown validator fallback", "worker implementation"], "Future 2.0.3 only; historical validator evidence remains assurance-only.", {"root": "full implementation metadata", "worker": "safe descriptor only"}, ["unknown or downgraded bindings fail critically"], ["known", "base", "unknown-or-downgraded", "rule-inapplicable"]),
        decision("DEC-V13-VALIDATOR-BINDING", "Every authorized lifecycle, closure, authority, reporting, compatibility, and candidate-integrity rule has one explicit validator triple.", ["EV-WAVE8-VALIDATOR-GAP"], "Explicit per-rule rows prevent universal-default drift.", ["universal four-validator default", "duplicate binding", "severity downgrade"], "Future 2.0.3 only.", {"root": "full", "worker": "triple and safe descriptor"}, ["trellis.validator.binding-integrity@1.0.0 critical"], ["complete", "base", "duplicate-or-missing", "blocked-rule-inapplicable"]),
        decision("DEC-V13-REPORT-V2", "Report schema v2 is additive and binds exact methodology, Procedure, support inventory, Research identities, artifacts, closure sources, ordered validators/findings, applicability, blocked facts, and zero-write disposition.", ["EV-WAVE8-FORWARD-REPAIR"], "A deterministic report can expose validation without rewriting report-v1.", ["mutate report-v1", "omit binding digests", "worker-owned report authority"], "Report-v1 bytes and replay semantics remain unchanged; v2 uses a new digest domain.", {"root": "full", "worker": "safe report descriptor only"}, ["trellis.report.v2-binding@1.0.0 critical"], ["deterministic", "base", "binding-drift", "v1-replay-inapplicable"]),
        decision("DEC-V13-COMPATIBILITY", "Methodology, Procedure package schema, Procedure version, Context schema, report schema, and Research event schema are independent domains; unknown combinations fail closed.", ["EV-CONTROL-VERSION-DOMAINS", "EV-CONTROL-HISTORICAL-PROCEDURES", "EV-CONTROL-203-FORWARD"], "Independent domains prevent accidental transitive upgrades.", ["version lockstep", "historical reinterpretation", "unknown combination fallback"], "1.0.0 remains live; 2.0.0/2.0.1 are immutable historical exceptions; 2.0.2 remains exact v1.2; future 2.0.3 may bind only an accepted exact v1.3 digest.", {"root": "full", "worker": "selected exact identities only"}, ["unknown combinations fail critically"], ["historical replay", "base-live", "unknown-combination", "unactivated-v1.3"]),
        decision("DEC-V13-DIFFERENTIAL-DOMAINS", "Frozen v1.2 cases remain exactly 229 identities, expansions remain exactly 38 separate identities, and v1.3 delta cases use a third namespace.", ["EV-DIFFERENTIAL-229", "EV-EXPANSION-38"], "No v1.3 rule may relabel historical cases or double count expansions.", ["rewrite v1.2 cases", "merge 38 into 229", "reuse DFT IDs for v1.3"], "Historical differential bytes remain unchanged.", {"root": "full", "worker": "none"}, ["case-domain uniqueness"], ["positive", "base", "collision", "domain-inapplicable"]),
        decision("DEC-V13-CONDITIONAL-ARTIFACTS", "The normalized inventory successor is omitted because identities are unchanged; the IO and differential successors are produced because dispositions and semantic cases materially change.", ["EV-WAVE8-64-VS-50", "EV-WAVE8-FORWARD-REPAIR"], "Conditional files follow material semantic delta, not version relabeling.", ["copy inventory unchanged under v1.3", "omit changed IO/differential semantics"], "The v1.2 inventory remains the identity authority.", {"root": "full", "worker": "none"}, ["manifest records produce/omit decisions"], ["produced-when-material", "omitted-when-unchanged", "wrong-decision", "not-requested"]),
        decision("DEC-V13-CANONICAL-BYTES", "Candidate JSON uses strict UTF-8, recursively sorted keys, preserved array order, compact separators, and one final LF; sidecars are filename-bound.", ["EV-WAVE8-FORWARD-REPAIR", "EV-CONTROL-V13-OWNERSHIP"], "One deterministic byte rule enables independent digest reproduction.", ["pretty/compact ambiguity", "self-hashing manifest", "unbound digest text"], "No historical bytes are rewritten.", {"root": "full", "worker": "none"}, ["strict parse, canonical bytes, and sidecar verification"], ["round-trip", "base", "mutation", "non-candidate-file"]),
        decision("DEC-V13-CONTRACT-INTEGRITY", "One parameterized root-owned contract-integrity validator enforces output disposition, canonical bytes, compatibility, candidate authority, differential domains, and conditional-artifact decisions through separate exact bindings.", ["EV-WAVE8-FORWARD-REPAIR", "EV-CONTROL-V13-OWNERSHIP"], "One trusted primitive avoids six speculative single-use implementations while preserving exact rule applicability and stable errors.", ["one executable validator per metadata field", "unbound metadata defaults", "worker-owned integrity checks"], "Future 2.0.3 may consume the exact bindings only after V13-B acceptance; historical behavior is unchanged.", {"root": "full trusted implementation and findings", "worker": "safe rule descriptors only"}, ["trellis.contract.integrity@1.0.0 critical with one binding per rule"], ["positive", "base", "critical-negative-zero-write", "inapplicable"]),
        decision("DEC-V13-CANDIDATE-AUTHORITY", "This pack is candidate, unaccepted, uncommitted, not activated, and unavailable to R2A until an immutable authoring commit and V13-B pass exist.", ["EV-CONTROL-V13-OWNERSHIP"], "Authoring cannot grant acceptance or runtime authority.", ["invent commit SHA", "self-accept", "activate from sidecar"], "Active v1.2 and live Procedure 1.0.0 remain unchanged.", {"root": "full", "worker": "candidate label only"}, ["reject candidate as runtime authority"], ["candidate-visible", "base", "premature-authority", "accepted-version-inapplicable"]),
    ])

    inapplicable_records = [{
        "absenceSemantics": "No separate stable-ID field is present or required; exact family plus canonical ArtifactRef path is the stable identity.",
        "provenanceClass": "inapplicable",
        "rationale": "Exact non-pattern paths have no placeholder identity component and random IDs are forbidden.",
        "recordId": "NA-EXACT-PATH-STABLE-ID",
    }]
    blocked_records = [{
        "failClosedDisposition": "Reject any attempt to classify, materialize, register, or record this output under v1.3.0.",
        "provenanceClass": "blocked-by-contract",
        "rationale": "Public evidence does not establish whether quest-event-candidates is a file, container, or pattern, and filename inference is forbidden.",
        "recordId": "BLK-QUEST-EVENT-CANDIDATES-KIND",
        "stableError": "V13_OUTPUT_KIND_BLOCKED",
    }]
    conditional_artifacts = [
        {"baseDigest": "ed1ed07252861da7ef39c9803ad0fc5894721da5a8585267deafd3e6df20873c", "decision": "omit", "decisionId": "DEC-V13-CONDITIONAL-ARTIFACTS", "filename": "normalized-workflow-inventory-v1.3.json", "provenanceClass": "trellis-native-v1.3", "reason": "No public identity, family, ordering, or count changes; disposition is represented separately."},
        {"baseDigest": "b2a20152f961d566fb2b5e36ec7911bf56b5042d7695374746ce19baf5204999", "decision": "produce", "decisionId": "DEC-V13-CONDITIONAL-ARTIFACTS", "filename": "io-mapping-ledger-v1.3.csv", "provenanceClass": "trellis-native-v1.3", "reason": "Every public output receives a new explicit disposition and lifecycle reference."},
        {"baseDigest": "b4d9a6d46920e56ef1092b32d1e1a8fad8d85b98f6bbda7109eec9bd580e4834", "decision": "produce", "decisionId": "DEC-V13-CONDITIONAL-ARTIFACTS", "filename": "differential-test-matrix-v1.3.json", "provenanceClass": "trellis-native-v1.3", "reason": "New v1.3 lifecycle, closure, validator, reporting, and compatibility rules require distinct delta cases."},
    ]
    decision_ledger = {
        "blockedRecords": blocked_records,
        "conditionalArtifactDecisions": conditional_artifacts,
        "contractVersion": CONTRACT_VERSION,
        "decisions": decisions,
        "inapplicableRecords": inapplicable_records,
        "provenanceClasses": PROVENANCE_CLASSES,
        "schemaVersion": 1,
    }
    write_json(output_dir, "normative-decision-ledger-v1.3.json", decision_ledger)

    public_evidence_index = {
        "contractVersion": CONTRACT_VERSION,
        "facts": facts,
        "interpretationBoundary": {
            "laterPhase2SemanticFixturesAuthoritative": False,
            "privateBodiesInspected": False,
            "r0SemanticAuthority": False,
            "r0Use": "source-addressability-counts-ownership-and-planned-destinations-only",
        },
        "provenanceClasses": PROVENANCE_CLASSES,
        "schemaVersion": 1,
        "sources": sources,
    }
    write_json(output_dir, "public-evidence-index-v1.3.json", public_evidence_index)

    alias_key = ("research-experiment-campaign", "reports/<campaign>/rounds/<round_id>.html")
    canonical_round_key = ("research-experiment-campaign", "reports/<campaign>/rounds/<round-id>.html")
    dispositions = []
    for row in output_rows:
        key = (row["family"], row["identity"])
        identity = row["identity"]
        if identity == "findings/":
            disposition_value = "container"
            decision_id = "DEC-V13-DISPOSITION-CONTAINER"
            canonical_output_id = None
            kind = "container"
        elif key == alias_key:
            disposition_value = "alias"
            decision_id = "DEC-V13-DISPOSITION-ALIAS"
            canonical_output_id = output_by_key[canonical_round_key]["outputId"]
            kind = "alias"
        elif identity == "quest-event-candidates":
            disposition_value = "blocked-by-contract"
            decision_id = None
            canonical_output_id = None
            kind = "blocked"
        elif "<" in identity and ">" in identity:
            disposition_value = "pattern"
            decision_id = "DEC-V13-DISPOSITION-PATTERN"
            canonical_output_id = row["outputId"]
            kind = "path-pattern"
        else:
            disposition_value = "include"
            decision_id = "DEC-V13-DISPOSITION-INCLUDE"
            canonical_output_id = row["outputId"]
            kind = "materialized-artifact"
        disposition_provenance = provenance("blocked-by-contract", "BLK-QUEST-EVENT-CANDIDATES-KIND") if disposition_value == "blocked-by-contract" else provenance("trellis-native-v1.3", decision_id)
        rationale = "Explicitly restored from the 14 identities omitted by the later 50-row skeleton." if row["omittedByLater50"] else "Explicitly classified from the complete 64-output public source set."
        if disposition_value == "container":
            rationale += " The trailing slash is reviewed as a container; descendants are governed by the findings pattern."
        elif disposition_value == "alias":
            rationale += " It aliases the canonical <round-id> spelling and is not double-counted."
        elif disposition_value == "blocked-by-contract":
            rationale += " Material kind and media type remain unresolved, so recording fails closed."
        dispositions.append({
            "canonicalOutputId": {"provenance": disposition_provenance, "value": canonical_output_id},
            "comparisonEvidenceIds": ["EV-WAVE8-64-VS-50"] if row["omittedByLater50"] else [],
            "disposition": {"provenance": disposition_provenance, "value": disposition_value},
            "family": normative(row["family"], "inherited-public-v1.2", row["familyEvidenceId"]),
            "ioClassification": normative({"class": "durable_runtime", "mapping": "procedure-artifact-contract", "status": "mapped"}, "inherited-public-v1.2", row["ioEvidenceId"]),
            "materialKind": {"provenance": disposition_provenance, "value": kind},
            "omittedByLater50": row["omittedByLater50"],
            "outputId": row["outputId"],
            "publicIdentity": normative(identity, "inherited-public-v1.2", row["identityEvidenceId"]),
            "rationale": {"provenance": disposition_provenance, "value": rationale},
        })
    disposition_contract = {
        "allowedDispositions": ["include", "alias", "container", "pattern", "exclude", "inapplicable", "blocked-by-contract"],
        "contractVersion": CONTRACT_VERSION,
        "familyTotals": EXPECTED_FAMILY_TOTALS,
        "later50OmissionCount": 14,
        "outputs": dispositions,
        "schemaVersion": 1,
        "sourceSetCount": 64,
        "sourceSetEvidenceIds": ["EV-WAVE8-64-VS-50"],
    }
    write_json(output_dir, "durable-output-disposition-v1.3.json", disposition_contract)

    lifecycle_entries: list[dict[str, Any]] = []
    lifecycle_source_rows = [entry for entry in dispositions if entry["disposition"]["value"] in {"include", "pattern"}]
    closure_artifact_rows = []
    for family in CLOSURE_FAMILIES:
        identity = f"methodology/closure/{family}.json"
        closure_artifact_rows.append({
            "artifactId": stable_id("closure-artifact", family, identity),
            "family": family,
            "identity": identity,
            "sourceOutputId": None,
            "sourceProvenance": provenance("trellis-native-v1.3", "DEC-V13-CLOSURE-ARTIFACT"),
            "sourceKind": "v1.3-control-artifact",
        })

    lifecycle_rows = []
    for entry in lifecycle_source_rows:
        lifecycle_rows.append({
            "artifactId": stable_id("artifact", entry["family"]["value"], entry["publicIdentity"]["value"]),
            "family": entry["family"]["value"],
            "identity": entry["publicIdentity"]["value"],
            "sourceOutputId": entry["outputId"],
            "sourceProvenance": entry["publicIdentity"]["provenance"],
            "sourceKind": "public-durable-output",
        })
    lifecycle_rows.extend(closure_artifact_rows)
    lifecycle_identities = {row["identity"] for row in lifecycle_rows}
    if lifecycle_identities != set(MEDIA_TYPE_BY_IDENTITY):
        missing = sorted(lifecycle_identities - set(MEDIA_TYPE_BY_IDENTITY))
        extra = sorted(set(MEDIA_TYPE_BY_IDENTITY) - lifecycle_identities)
        raise ValueError(f"explicit media assignment drift: missing={missing}, extra={extra}")

    for row in lifecycle_rows:
        artifact_id = row["artifactId"]
        identity = row["identity"]
        is_pattern = "<" in identity and ">" in identity
        stable_id_value: Any
        stable_id_class: str
        stable_id_ref: str
        if is_pattern:
            variables = re.findall(r"<([^>]+)>", identity)
            stable_id_value = {"variables": variables, "schema": "^[a-z0-9][a-z0-9._-]{0,127}$", "source": "canonical-path-placeholder"}
            stable_id_class = "trellis-native-v1.3"
            stable_id_ref = "DEC-V13-LIFECYCLE-STABLE-ID"
        else:
            stable_id_value = {"schema": "none", "source": "exact-family-plus-canonical-path"}
            stable_id_class = "inapplicable"
            stable_id_ref = "NA-EXACT-PATH-STABLE-ID"
        dimension_values = {
            "requiredness": normative("required-before-root-record", "trellis-native-v1.3", "DEC-V13-LIFECYCLE-REQUIREDNESS"),
            "cardinality": normative("1..*" if is_pattern else "1", "trellis-native-v1.3", "DEC-V13-LIFECYCLE-CARDINALITY"),
            "mediaType": normative(media_type(identity), "trellis-native-v1.3", "DEC-V13-LIFECYCLE-MEDIA"),
            "producer": normative({"authority": "worker-proposal-only", "writeScope": "declared-allowed-write-path"}, "trellis-native-v1.3", "DEC-V13-LIFECYCLE-PRODUCER"),
            "consumers": normative(["root-pre-record-validator", "root-decision-reviewer"], "trellis-native-v1.3", "DEC-V13-LIFECYCLE-CONSUMERS"),
            "repositoryArtifactRefRelation": normative({"artifactRefRequired": True, "digestRequired": True, "pathBinding": "exact" if not is_pattern else "pattern-match", "repositoryBinding": "dispatch-target-repository", "trackedAbsolutePathsForbidden": True}, "trellis-native-v1.3", "DEC-V13-LIFECYCLE-ARTIFACTREF"),
            "stableId": normative(stable_id_value, stable_id_class, stable_id_ref),
            "provenance": normative({"requiredFields": ["family", "capabilityId", "dispatchId", "activationId", "approvalId", "repositoryId", "artifactId", "sha256"], "privateBodyFieldsForbidden": True}, "trellis-native-v1.3", "DEC-V13-LIFECYCLE-PROVENANCE"),
            "dependencies": normative([], "trellis-native-v1.3", "DEC-V13-LIFECYCLE-DEPENDENCIES"),
            "immutableFieldsAndMutationAuthority": normative({"immutableFields": ["artifactRef.id", "artifactRef.repositoryId", "artifactRef.path", "artifactRef.sha256", "provenance.identityFields", "stableId"], "postAcceptMutation": "forbidden", "preAcceptCorrection": "new-worker-proposal", "postAcceptCorrection": "new-artifact-identity-and-root-review"}, "trellis-native-v1.3", "DEC-V13-LIFECYCLE-IMMUTABILITY"),
            "transitions": normative({"create": {"from": "absent", "preconditions": ["declared-output", "allowed-write-path", "complete-provenance"], "to": "proposed"}, "accept": {"from": "proposed", "preconditions": ["all-bound-critical-validators-pass", "root-pre-record-review"], "to": "accepted"}, "reject": {"from": "proposed", "preconditions": ["any-bound-critical-validator-fails"], "to": "rejected"}, "terminalStates": ["accepted", "rejected"]}, "trellis-native-v1.3", "DEC-V13-LIFECYCLE-TRANSITIONS"),
            "terminalApplicability": normative({"appliesOn": "every-root-recording-attempt", "familyTerminalInference": False, "resultStatusIndependent": True}, "trellis-native-v1.3", "DEC-V13-LIFECYCLE-TERMINAL"),
            "crossArtifactConsistency": normative({"equalBindings": ["questId", "dispatchId", "activationId", "approvalId", "capabilityId", "repositoryId"], "identityRule": "one-canonical-output-id-per-materialization", "aliasConflict": "critical", "mixedBinding": "critical"}, "trellis-native-v1.3", "DEC-V13-LIFECYCLE-CONSISTENCY"),
        }
        binding_ids = [stable_id("binding", artifact_id, dimension) for dimension in DIMENSIONS]
        for dimension, binding_id in zip(DIMENSIONS, binding_ids, strict=True):
            dimension_values[dimension]["fixtureObligations"] = {
                "base": f"A valid {dimension} fact remains proposal evidence until root acceptance.",
                "inapplicable": f"The {dimension} validator does not run when this exact Procedure family is not selected.",
                "negative": f"An invalid, absent, unauthorized, or inconsistent {dimension} fact fails critically with zero pre-append writes.",
                "positive": f"A complete bound {dimension} fact passes its exact validator triple.",
            }
            dimension_values[dimension]["stableErrors"] = VALIDATOR_ERRORS[DIMENSION_VALIDATORS[dimension]]
            dimension_values[dimension]["validator"] = {
                "bindingId": binding_id,
                "id": DIMENSION_VALIDATORS[dimension],
                "severity": "critical",
                "version": "1.0.0",
            }
            dimension_values[dimension]["visibility"] = {
                "root": "complete rule, facts, trusted implementation metadata, and findings",
                "worker": "rule value, safe validator descriptor, stable errors, and fixture outcome labels only",
            }
        lifecycle_entries.append({
            "artifactId": artifact_id,
            "dimensions": dimension_values,
            "family": normative(row["family"], "trellis-native-v1.3" if row["sourceKind"] == "v1.3-control-artifact" else "inherited-public-v1.2", "DEC-V13-CLOSURE-ARTIFACT" if row["sourceKind"] == "v1.3-control-artifact" else output_by_key[(row["family"], row["identity"])]["familyEvidenceId"]),
            "fixtureObligations": normative({
                "base": "valid proposal remains non-canonical until root acceptance",
                "inapplicable": "when this family is not the selected exact Procedure family, no artifact obligation is evaluated",
                "negative": "missing, duplicate, drifted, unauthorized, or inconsistent artifact rejects the complete recording with zero pre-append writes",
                "positive": "complete bound artifact passes every assigned validator",
            }, "trellis-native-v1.3", "DEC-V13-LIFECYCLE-TRANSITIONS"),
            "publicIdentity": {"provenance": row["sourceProvenance"], "value": identity},
            "sourceKind": row["sourceKind"],
            "sourceOutputId": row["sourceOutputId"],
            "stableErrorCodes": normative(sorted({error for dimension in DIMENSIONS for error in VALIDATOR_ERRORS[DIMENSION_VALIDATORS[dimension]]}), "trellis-native-v1.3", "DEC-V13-VALIDATOR-BINDING"),
            "validatorBindingIds": normative(binding_ids, "trellis-native-v1.3", "DEC-V13-VALIDATOR-BINDING"),
            "visibility": normative({"root": "complete contract and trusted implementation metadata", "worker": "identity, dimensions, safe validator descriptors, and fixture outcome labels only"}, "trellis-native-v1.3", "DEC-V13-LIFECYCLE-PRODUCER"),
        })

    lifecycle_contract = {
        "artifacts": lifecycle_entries,
        "contractVersion": CONTRACT_VERSION,
        "dimensionOrder": DIMENSIONS,
        "enforceableArtifactCount": len(lifecycle_entries),
        "schemaVersion": 1,
        "stateModel": ["absent", "proposed", "accepted", "rejected"],
    }
    write_json(output_dir, "artifact-lifecycle-contract-v1.3.json", lifecycle_contract)

    closure_families = []
    for family in CLOSURE_FAMILIES:
        artifact_identity = f"methodology/closure/{family}.json"
        artifact_id = next(entry["artifactId"] for entry in lifecycle_entries if entry["publicIdentity"]["value"] == artifact_identity)
        binding_ids = [stable_id("binding", family, rule) for rule in ["schema", "evidence", "xor", "status-inference", "worker-boundary"]]
        closure_families.append({
            "applicability": normative({"family": family, "onlyExactFamily": True, "publicCaseEvidenceIds": closure_evidence[family]}, "trellis-native-v1.3", "DEC-V13-CLOSURE-APPLICABILITY"),
            "blocked": normative({"absence": "invalid", "evidenceIdsPointer": "/blocked/evidenceArtifactIds", "falseEvidence": "empty-array", "null": "invalid", "producer": "worker-proposal-only", "selfReference": "forbidden", "trueEvidence": "one-or-more-bound-non-closure-artifact-ref-ids", "type": "boolean", "valuePointer": "/blocked/value"}, "trellis-native-v1.3", "DEC-V13-CLOSURE-EVIDENCE"),
            "closureArtifact": normative({
                "artifactId": artifact_id,
                "closedSchema": {
                    "additionalProperties": False,
                    "properties": {
                        "blocked": {
                            "additionalProperties": False,
                            "properties": {
                                "evidenceArtifactIds": {"items": {"pattern": "^art_[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$", "type": "string"}, "type": "array", "uniqueItems": True},
                                "value": {"type": "boolean"},
                            },
                            "required": ["value", "evidenceArtifactIds"],
                            "type": "object",
                        },
                        "family": {"const": family, "type": "string"},
                        "schemaVersion": {"const": 1, "type": "integer"},
                        "selected": {
                            "additionalProperties": False,
                            "properties": {
                                "evidenceArtifactIds": {"items": {"pattern": "^art_[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$", "type": "string"}, "type": "array", "uniqueItems": True},
                                "value": {"type": "boolean"},
                            },
                            "required": ["value", "evidenceArtifactIds"],
                            "type": "object",
                        },
                    },
                    "required": ["schemaVersion", "family", "selected", "blocked"],
                    "type": "object",
                },
                "identity": artifact_identity,
                "mediaType": "application/json",
                "schemaVersionPointer": "/schemaVersion",
                "schemaVersionValue": 1,
            }, "trellis-native-v1.3", "DEC-V13-CLOSURE-ARTIFACT"),
            "crossRelation": normative({"rule": "exactly-one-true", "selectedPointer": "/selected/value", "blockedPointer": "/blocked/value"}, "trellis-native-v1.3", "DEC-V13-CLOSURE-XOR"),
            "familyId": family,
            "fixtureObligations": normative({"base": "A valid explicit closure artifact remains worker evidence until root review.", "inapplicable": "No closure rule runs for a family outside the four-family applicability set.", "negative": "Missing, null, both/neither true, unbound evidence, status-only inference, or worker authority widening fails critically with zero pre-append writes.", "positive": "Exactly one explicit boolean is true and its evidence IDs resolve to bound ArtifactRefs."}, "trellis-native-v1.3", "DEC-V13-CLOSURE-ARTIFACT"),
            "preRecordReader": normative({"authority": "root-methodology-validator", "phase": "before-result-proposal-approval-consumption-append"}, "trellis-native-v1.3", "DEC-V13-CLOSURE-ARTIFACT"),
            "selected": normative({"absence": "invalid", "evidenceIdsPointer": "/selected/evidenceArtifactIds", "falseEvidence": "empty-array", "null": "invalid", "producer": "worker-proposal-only", "selfReference": "forbidden", "trueEvidence": "one-or-more-bound-non-closure-artifact-ref-ids", "type": "boolean", "valuePointer": "/selected/value"}, "trellis-native-v1.3", "DEC-V13-CLOSURE-EVIDENCE"),
            "stableErrors": normative(["V13_CLOSURE_SCHEMA_INVALID", "V13_CLOSURE_EVIDENCE_INVALID", "V13_CLOSURE_EXCLUSIVITY_INVALID", "V13_CLOSURE_STATUS_INFERENCE_FORBIDDEN", "V13_WORKER_AUTHORITY_WIDENING"], "trellis-native-v1.3", "DEC-V13-VALIDATOR-BINDING"),
            "validationOrder": normative(["artifact-ref-binding", "strict-closure-schema", "family-equality", "selected-evidence-binding", "blocked-evidence-binding", "selected-blocked-xor", "status-inference-prohibition", "worker-root-authority-boundary"], "trellis-native-v1.3", "DEC-V13-CLOSURE-ARTIFACT"),
            "validatorBindingIds": normative(binding_ids, "trellis-native-v1.3", "DEC-V13-VALIDATOR-BINDING"),
            "visibility": normative({"root": "complete facts, bindings, and validator findings", "worker": "closure schema and evidence obligations; no Decision or recording authority"}, "trellis-native-v1.3", "DEC-V13-CLOSURE-ARTIFACT"),
            "zeroWriteBoundary": normative({"onFailure": "return-critical-validation-failure-before-canonical-append-or-sidecar-publication", "workerWritesCanonicalResearch": False}, "trellis-native-v1.3", "DEC-V13-CLOSURE-ARTIFACT"),
        })
    closure_contract = {
        "applicableFamilies": CLOSURE_FAMILIES,
        "contractVersion": CONTRACT_VERSION,
        "families": closure_families,
        "genericResultStatusInference": normative({"allowed": False, "forbiddenPointers": ["/result/status", "/status"], "mapping": None, "stableError": "V13_CLOSURE_STATUS_INFERENCE_FORBIDDEN"}, "trellis-native-v1.3", "DEC-V13-CLOSURE-NO-STATUS"),
        "rootDecisionBoundary": normative({"closureArtifactAuthority": "worker-evidence-only", "decisionAuthority": "root-only", "proposalAuthority": "pending-proposal-only", "recordingAuthority": "root-only"}, "trellis-native-v1.3", "DEC-V13-CLOSURE-ARTIFACT"),
        "schemaVersion": 1,
    }
    write_json(output_dir, "closure-contract-v1.3.json", closure_contract)

    validator_ids = list(dict.fromkeys(list(DIMENSION_VALIDATORS.values()) + [
        "trellis.closure.schema",
        "trellis.closure.evidence",
        "trellis.closure.xor",
        "trellis.closure.status-inference",
        "trellis.authority.worker-boundary",
        "trellis.validator.binding-integrity",
        "trellis.report.v2-binding",
        "trellis.contract.integrity",
    ]))
    validators = []
    for validator_id in validator_ids:
        rule_kinds = VALIDATOR_RULE_KINDS[validator_id]
        validators.append({
            "applicableRuleKinds": normative(rule_kinds, "trellis-native-v1.3", "DEC-V13-VALIDATOR-REGISTRY"),
            "identity": normative({"id": validator_id, "version": "1.0.0"}, "trellis-native-v1.3", "DEC-V13-VALIDATOR-REGISTRY"),
            "inputFactSchema": normative({
                "additionalProperties": False,
                "properties": {
                    "authoritySnapshot": {
                        "additionalProperties": False,
                        "properties": {
                            "activationId": {"pattern": "^act_", "type": "string"},
                            "approvalId": {"pattern": "^apr_", "type": "string"},
                            "capabilityId": {"minLength": 1, "type": "string"},
                            "dispatchId": {"pattern": "^dsp_", "type": "string"},
                            "methodologyDigest": {"pattern": "^[0-9a-f]{64}$", "type": "string"},
                            "methodologyIdentity": {"minLength": 1, "type": "string"},
                            "procedureDigest": {"pattern": "^sha256:[0-9a-f]{64}$", "type": "string"},
                            "procedureId": {"minLength": 1, "type": "string"},
                            "procedureVersion": {"minLength": 1, "type": "string"},
                            "questId": {"pattern": "^qst_", "type": "string"},
                            "repositoryId": {"pattern": "^rep_", "type": "string"},
                        },
                        "required": ["methodologyIdentity", "methodologyDigest", "procedureId", "procedureVersion", "procedureDigest", "capabilityId", "questId", "dispatchId", "activationId", "approvalId", "repositoryId"],
                        "type": "object",
                    },
                    "facts": {"additionalProperties": True, "minProperties": 1, "type": "object"},
                    "ruleId": {"minLength": 1, "type": "string"},
                    "targetId": {"minLength": 1, "type": "string"},
                },
                "required": ["ruleId", "targetId", "facts", "authoritySnapshot"],
                "type": "object",
            }, "trellis-native-v1.3", "DEC-V13-VALIDATOR-REGISTRY"),
            "rootImplementation": normative({"authority": "root-owned-trusted-registry", "descriptorExecutable": False, "network": "forbidden", "privateSourceDependency": "forbidden"}, "trellis-native-v1.3", "DEC-V13-VALIDATOR-REGISTRY"),
            "severity": normative({"downgradeAllowed": False, "fixed": "critical", "supportPackMayChange": False}, "trellis-native-v1.3", "DEC-V13-VALIDATOR-REGISTRY"),
            "stableErrors": normative(VALIDATOR_ERRORS[validator_id], "trellis-native-v1.3", "DEC-V13-VALIDATOR-REGISTRY"),
            "workerDescriptor": normative({"description": f"Validate {', '.join(rule_kinds)} facts before root recording.", "implementationMetadataVisible": False, "safeFields": ["id", "version", "severity", "description", "stableErrors"]}, "trellis-native-v1.3", "DEC-V13-VALIDATOR-REGISTRY"),
        })
    validator_registry = {
        "contractVersion": CONTRACT_VERSION,
        "lookupKey": ["id", "version"],
        "schemaVersion": 1,
        "severityOrder": ["info", "warning", "critical"],
        "unknownValidatorDisposition": normative({"severity": "critical", "stableError": "V13_VALIDATOR_BINDING_INVALID"}, "trellis-native-v1.3", "DEC-V13-VALIDATOR-REGISTRY"),
        "validators": validators,
    }
    write_json(output_dir, "validator-registry-v1.3.json", validator_registry)

    bindings = []
    for artifact in lifecycle_entries:
        for dimension in DIMENSIONS:
            validator_id = DIMENSION_VALIDATORS[dimension]
            binding_id = stable_id("binding", artifact["artifactId"], dimension)
            bindings.append({
                "bindingId": binding_id,
                "provenance": provenance("trellis-native-v1.3", "DEC-V13-VALIDATOR-BINDING"),
                "ruleId": f"{artifact['artifactId']}:{dimension}",
                "ruleKind": f"artifact.{dimension}",
                "stableErrors": VALIDATOR_ERRORS[validator_id],
                "targetId": artifact["artifactId"],
                "validator": {"id": validator_id, "severity": "critical", "version": "1.0.0"},
            })
    closure_validator_by_rule = {
        "schema": "trellis.closure.schema",
        "evidence": "trellis.closure.evidence",
        "xor": "trellis.closure.xor",
        "status-inference": "trellis.closure.status-inference",
        "worker-boundary": "trellis.authority.worker-boundary",
    }
    for family in CLOSURE_FAMILIES:
        for rule, validator_id in closure_validator_by_rule.items():
            bindings.append({
                "bindingId": stable_id("binding", family, rule),
                "provenance": provenance("trellis-native-v1.3", "DEC-V13-VALIDATOR-BINDING"),
                "ruleId": f"closure:{family}:{rule}",
                "ruleKind": f"closure.{rule}",
                "stableErrors": VALIDATOR_ERRORS[validator_id],
                "targetId": family,
                "validator": {"id": validator_id, "severity": "critical", "version": "1.0.0"},
            })
    global_bindings = [
        ("global:validator-binding-integrity", "validator.binding-integrity", "contract", "trellis.validator.binding-integrity", "V13_VALIDATOR_BINDING_INVALID"),
        ("global:report-v2-binding", "report.v2-binding", "report-v2", "trellis.report.v2-binding", "V13_REPORT_V2_BINDING_INVALID"),
        ("global:worker-authority-boundary", "authority.worker-boundary", "contract", "trellis.authority.worker-boundary", "V13_WORKER_AUTHORITY_WIDENING"),
        ("global:output-disposition-integrity", "contract.output-disposition", "durable-output-disposition-v1.3", "trellis.contract.integrity", "V13_OUTPUT_DISPOSITION_INVALID"),
        ("global:blocked-output-kind", "contract.blocked-output-kind", output_by_key[("research-quest-admin", "quest-event-candidates")]["outputId"], "trellis.contract.integrity", "V13_OUTPUT_KIND_BLOCKED"),
        ("global:closure-applicability", "contract.closure-applicability", "closure-contract-v1.3", "trellis.contract.integrity", "V13_CLOSURE_APPLICABILITY_INVALID"),
        ("global:canonical-bytes", "contract.canonical-bytes", "candidate-pack", "trellis.contract.integrity", "V13_CANONICAL_BYTES_INVALID"),
        ("global:compatibility", "contract.compatibility", "frozen-migration-target-v1.3", "trellis.contract.integrity", "V13_COMPATIBILITY_BINDING_INVALID"),
        ("global:candidate-authority", "contract.candidate-authority", "candidate-pack", "trellis.contract.integrity", "V13_CANDIDATE_AUTHORITY_INVALID"),
        ("global:differential-domains", "contract.differential-domains", "differential-test-matrix-v1.3", "trellis.contract.integrity", "V13_DIFFERENTIAL_DOMAIN_INVALID"),
        ("global:conditional-artifacts", "contract.conditional-artifacts", "contract-candidate-manifest-v1.3", "trellis.contract.integrity", "V13_CONDITIONAL_ARTIFACT_DECISION_INVALID"),
    ]
    for rule_id, rule_kind, target_id, validator_id, stable_error in global_bindings:
        bindings.append({
            "bindingId": stable_id("binding", rule_id),
            "provenance": provenance("trellis-native-v1.3", "DEC-V13-VALIDATOR-BINDING"),
            "ruleId": rule_id,
            "ruleKind": rule_kind,
            "stableErrors": [stable_error],
            "targetId": target_id,
            "validator": {"id": validator_id, "severity": "critical", "version": "1.0.0"},
        })
    if len({binding["bindingId"] for binding in bindings}) != len(bindings):
        raise ValueError("duplicate validator binding ID")
    report_v2 = {
        "canonicalization": normative({"json": "strict-utf8-recursive-key-sort-array-order-preserved-one-final-lf", "findingOrder": ["validator.id", "validator.version", "targetId", "stableError", "factPointer"], "unknownKeys": "reject"}, "trellis-native-v1.3", "DEC-V13-REPORT-V2"),
        "digest": normative({"algorithm": "sha256", "domainPrefixUtf8": "trellis-evaluation-report-v2\0", "domainTerminatorHex": "00", "framing": "exact-domain-prefix-UTF8-including-NUL || canonical-report-json-without-final-lf", "selfDigestFieldAllowed": False, "storedDigestExcludedFromInput": True}, "trellis-native-v1.3", "DEC-V13-REPORT-V2"),
        "reportV1": normative({"bytesChanged": False, "digestDomainChanged": False, "replaySemanticsChanged": False}, "trellis-native-v1.3", "DEC-V13-REPORT-V2"),
        "requiredBindings": normative(["methodologyIdentity", "methodologyDigest", "procedureId", "procedureVersion", "procedureDigest", "supportInventoryDigest", "questId", "dispatchId", "activationId", "approvalId", "artifactBindings", "closureSources", "orderedValidatorTriples", "orderedFindings", "applicability", "blockedFacts", "zeroWriteDisposition"], "trellis-native-v1.3", "DEC-V13-REPORT-V2"),
        "schemaVersion": normative(2, "trellis-native-v1.3", "DEC-V13-REPORT-V2"),
        "visibility": normative({"root": "complete report and trusted findings", "worker": "safe descriptors and final bounded disposition only"}, "trellis-native-v1.3", "DEC-V13-REPORT-V2"),
    }
    binding_matrix = {
        "bindings": bindings,
        "contractVersion": CONTRACT_VERSION,
        "duplicateBindingDisposition": normative({"severity": "critical", "stableError": "V13_VALIDATOR_BINDING_INVALID"}, "trellis-native-v1.3", "DEC-V13-VALIDATOR-BINDING"),
        "reportV2Contract": report_v2,
        "schemaVersion": 1,
        "severityDowngradeDisposition": normative({"severity": "critical", "stableError": "V13_VALIDATOR_BINDING_INVALID"}, "trellis-native-v1.3", "DEC-V13-VALIDATOR-BINDING"),
    }
    write_json(output_dir, "validator-binding-matrix-v1.3.json", binding_matrix)

    io_output = io.StringIO(newline="")
    writer = csv.writer(io_output, lineterminator="\n")
    writer.writerow(["output_id", "package", "public_identity", "disposition", "canonical_output_id", "lifecycle_artifact_id", "provenance_class", "source_evidence_ids"])
    lifecycle_by_output = {entry["sourceOutputId"]: entry["artifactId"] for entry in lifecycle_entries if entry["sourceOutputId"] is not None}
    for entry in dispositions:
        writer.writerow([
            entry["outputId"],
            entry["family"]["value"],
            entry["publicIdentity"]["value"],
            entry["disposition"]["value"],
            entry["canonicalOutputId"]["value"] or "",
            lifecycle_by_output.get(entry["outputId"], ""),
            entry["disposition"]["provenance"]["class"],
            ";".join(entry["publicIdentity"]["provenance"]["evidenceIds"] + entry["ioClassification"]["provenance"]["evidenceIds"]),
        ])
    (output_dir / "io-mapping-ledger-v1.3.csv").write_text(io_output.getvalue(), encoding="utf-8", newline="")

    delta_cases = []
    lifecycle_negative_mutations = {
        "requiredness": "remove-required-artifact",
        "cardinality": "supply-zero-or-duplicate-materializations",
        "mediaType": "replace-declared-media-type",
        "producer": "claim-unauthorized-producer",
        "consumers": "claim-unauthorized-consumer",
        "repositoryArtifactRefRelation": "drift-repository-path-or-digest-binding",
        "stableId": "supply-invalid-or-drifted-placeholder-id",
        "provenance": "remove-or-drift-required-provenance-binding",
        "dependencies": "add-undeclared-content-semantic-dependency",
        "immutableFieldsAndMutationAuthority": "change-accepted-immutable-field",
        "transitions": "attempt-invalid-or-terminal-reopen-transition",
        "terminalApplicability": "bypass-validation-by-result-status",
        "crossArtifactConsistency": "mix-dispatch-approval-repository-or-alias-bindings",
    }
    for dimension in DIMENSIONS:
        validator_id = DIMENSION_VALIDATORS[dimension]
        target_ids = [artifact["artifactId"] for artifact in lifecycle_entries]
        dimension_binding_ids = [
            artifact["dimensions"][dimension]["validator"]["bindingId"]
            for artifact in lifecycle_entries
        ]
        decision_id = DIMENSION_DECISION_IDS[dimension]
        for outcome, expected, mutation, zero_write in [
            ("positive", "pass", "all-targets-supply-complete-valid-facts", "validation-completes-before-any-canonical-write"),
            ("base", "pass-noncanonical-until-root-accept", "valid-worker-proposal-remains-noncanonical", "validation-completes-before-any-canonical-write"),
            ("critical-negative", "fail-closed", lifecycle_negative_mutations[dimension], "complete-recording-rejected-before-append-or-sidecar-publication"),
            ("inapplicable", "not-run", "different-exact-procedure-family", "validator-not-invoked-and-no-write"),
        ]:
            delta_cases.append({
                "bindingIds": dimension_binding_ids,
                "caseId": stable_id("V13-LIFECYCLE", dimension, outcome).upper(),
                "domain": "evaluation-contract-v1.3.0-delta",
                "expected": expected,
                "expectedStableErrors": VALIDATOR_ERRORS[validator_id] if outcome == "critical-negative" else [],
                "fixtureClass": outcome,
                "provenance": provenance("trellis-native-v1.3", decision_id),
                "ruleKind": f"artifact.{dimension}",
                "ruleTargets": target_ids,
                "syntheticMutation": mutation,
                "validator": {"id": validator_id, "severity": "critical", "version": "1.0.0"},
                "zeroWriteExpectation": zero_write,
            })
    closure_negative_mutations = {
        "schema": "unknown-missing-null-or-wrong-typed-closure-field",
        "evidence": "true-side-empty-or-false-side-nonempty-or-unbound-or-self-referential-artifact-id",
        "xor": "both-or-neither-closure-boolean-true",
        "status-inference": "derive-closure-from-result-status",
        "worker-boundary": "worker-attempts-validation-recording-decision-or-canonical-mutation",
    }
    closure_decisions = {
        "schema": "DEC-V13-CLOSURE-ARTIFACT",
        "evidence": "DEC-V13-CLOSURE-EVIDENCE",
        "xor": "DEC-V13-CLOSURE-XOR",
        "status-inference": "DEC-V13-CLOSURE-NO-STATUS",
        "worker-boundary": "DEC-V13-CLOSURE-ARTIFACT",
    }
    for rule, validator_id in closure_validator_by_rule.items():
        closure_binding_ids = [stable_id("binding", family, rule) for family in CLOSURE_FAMILIES]
        for outcome, expected, mutation, zero_write in [
            ("positive", "pass", "all-applicable-families-supply-valid-explicit-closure-facts", "validation-completes-before-any-canonical-write"),
            ("base", "pass-noncanonical-until-root-decision", "valid-closure-artifact-remains-worker-evidence", "validation-completes-before-any-canonical-write"),
            ("critical-negative", "fail-closed", closure_negative_mutations[rule], "complete-recording-rejected-before-append-or-sidecar-publication"),
            ("inapplicable", "not-run", "family-outside-explicit-closure-set", "validator-not-invoked-and-no-write"),
        ]:
            delta_cases.append({
                "bindingIds": closure_binding_ids,
                "caseId": stable_id("V13-CLOSURE", rule, outcome).upper(),
                "domain": "evaluation-contract-v1.3.0-delta",
                "expected": expected,
                "expectedStableErrors": VALIDATOR_ERRORS[validator_id] if outcome == "critical-negative" else [],
                "fixtureClass": outcome,
                "provenance": provenance("trellis-native-v1.3", closure_decisions[rule]),
                "ruleKind": f"closure.{rule}",
                "ruleTargets": CLOSURE_FAMILIES,
                "syntheticMutation": mutation,
                "validator": {"id": validator_id, "severity": "critical", "version": "1.0.0"},
                "zeroWriteExpectation": zero_write,
            })
    global_decisions = {
        "global:validator-binding-integrity": "DEC-V13-VALIDATOR-BINDING",
        "global:report-v2-binding": "DEC-V13-REPORT-V2",
        "global:worker-authority-boundary": "DEC-V13-CANDIDATE-AUTHORITY",
        "global:output-disposition-integrity": "DEC-V13-CONTRACT-INTEGRITY",
        "global:blocked-output-kind": "DEC-V13-DISPOSITION-BLOCK",
        "global:closure-applicability": "DEC-V13-CLOSURE-APPLICABILITY",
        "global:canonical-bytes": "DEC-V13-CANONICAL-BYTES",
        "global:compatibility": "DEC-V13-COMPATIBILITY",
        "global:candidate-authority": "DEC-V13-CANDIDATE-AUTHORITY",
        "global:differential-domains": "DEC-V13-DIFFERENTIAL-DOMAINS",
        "global:conditional-artifacts": "DEC-V13-CONDITIONAL-ARTIFACTS",
    }
    for rule_id, rule_kind, target_id, validator_id, stable_error in global_bindings:
        binding_id = stable_id("binding", rule_id)
        for outcome, expected, zero_write in [
            ("positive", "pass", "validation-completes-before-any-canonical-write"),
            ("base", "pass", "validation-completes-before-any-canonical-write"),
            ("critical-negative", "fail-closed", "complete-recording-rejected-before-append-or-sidecar-publication"),
            ("inapplicable", "not-run", "validator-not-invoked-and-no-write"),
        ]:
            delta_cases.append({
                "bindingIds": [binding_id],
                "caseId": stable_id("V13-GLOBAL", rule_id, outcome).upper(),
                "domain": "evaluation-contract-v1.3.0-delta",
                "expected": expected,
                "expectedStableErrors": [stable_error] if outcome == "critical-negative" else [],
                "fixtureClass": outcome,
                "provenance": provenance("trellis-native-v1.3", global_decisions[rule_id]),
                "ruleKind": rule_kind,
                "ruleTargets": [target_id],
                "syntheticMutation": f"{rule_id}:{outcome}",
                "validator": {"id": validator_id, "severity": "critical", "version": "1.0.0"},
                "zeroWriteExpectation": zero_write,
            })
    differential_v13 = {
        "contractVersion": CONTRACT_VERSION,
        "domains": {
            "expansion38": {"count": 38, "relationship": "separate-post-freeze-expansion", "sourceDigest": "d70c0fbe3a23860b3113acfd87419a512da95d61c1cd5c5cfa8f9f4b8d09715a"},
            "frozenV12": {"count": 229, "identityMutationAllowed": False, "sourceDigest": "b4d9a6d46920e56ef1092b32d1e1a8fad8d85b98f6bbda7109eec9bd580e4834"},
            "v13Delta": {"caseCount": len(delta_cases), "idNamespace": "V13-*", "relationship": "new-reviewed-semantics-only"},
        },
        "schemaVersion": 1,
        "v13DeltaCases": delta_cases,
    }
    write_json(output_dir, "differential-test-matrix-v1.3.json", differential_v13)

    derivability_rows = []

    def add_wrapped_provenance(filename: str, pointer: str, wrapped: dict[str, Any]) -> None:
        prov = wrapped["provenance"]
        derivability_rows.append({
            "class": prov["class"],
            "evidenceIds": prov.get("evidenceIds", []),
            "normativePointer": f"{filename}#{pointer}",
            "recordRef": prov.get("decisionId") or prov.get("recordId"),
        })

    def add_direct_provenance(filename: str, pointer: str, decision_id: str) -> None:
        derivability_rows.append({
            "class": "trellis-native-v1.3",
            "evidenceIds": [],
            "normativePointer": f"{filename}#{pointer}",
            "recordRef": decision_id,
        })

    disposition_file = "durable-output-disposition-v1.3.json"
    for pointer in ["/allowedDispositions", "/contractVersion", "/familyTotals", "/later50OmissionCount", "/schemaVersion", "/sourceSetCount", "/sourceSetEvidenceIds"]:
        add_direct_provenance(disposition_file, pointer, "DEC-V13-CONTRACT-INTEGRITY")
    for index, entry in enumerate(dispositions):
        for field in ["canonicalOutputId", "disposition", "family", "ioClassification", "materialKind", "publicIdentity", "rationale"]:
            add_wrapped_provenance(disposition_file, f"/outputs/{index}/{field}", entry[field])
        for field in ["comparisonEvidenceIds", "omittedByLater50", "outputId"]:
            add_direct_provenance(disposition_file, f"/outputs/{index}/{field}", "DEC-V13-CONTRACT-INTEGRITY")

    lifecycle_file = "artifact-lifecycle-contract-v1.3.json"
    for pointer in ["/contractVersion", "/dimensionOrder", "/enforceableArtifactCount", "/schemaVersion", "/stateModel"]:
        add_direct_provenance(lifecycle_file, pointer, "DEC-V13-CONTRACT-INTEGRITY")
    for index, artifact in enumerate(lifecycle_entries):
        for field in ["family", "publicIdentity", "fixtureObligations", "stableErrorCodes", "validatorBindingIds", "visibility"]:
            add_wrapped_provenance(lifecycle_file, f"/artifacts/{index}/{field}", artifact[field])
        for dimension in DIMENSIONS:
            add_wrapped_provenance(lifecycle_file, f"/artifacts/{index}/dimensions/{dimension}", artifact["dimensions"][dimension])
        for field in ["artifactId", "sourceKind", "sourceOutputId"]:
            add_direct_provenance(lifecycle_file, f"/artifacts/{index}/{field}", "DEC-V13-CONTRACT-INTEGRITY")

    closure_file = "closure-contract-v1.3.json"
    for pointer in ["/applicableFamilies", "/contractVersion", "/schemaVersion"]:
        add_direct_provenance(closure_file, pointer, "DEC-V13-CONTRACT-INTEGRITY")
    add_wrapped_provenance(closure_file, "/genericResultStatusInference", closure_contract["genericResultStatusInference"])
    add_wrapped_provenance(closure_file, "/rootDecisionBoundary", closure_contract["rootDecisionBoundary"])
    for index, family in enumerate(closure_families):
        for field in ["applicability", "blocked", "closureArtifact", "crossRelation", "fixtureObligations", "preRecordReader", "selected", "stableErrors", "validationOrder", "validatorBindingIds", "visibility", "zeroWriteBoundary"]:
            add_wrapped_provenance(closure_file, f"/families/{index}/{field}", family[field])
        add_direct_provenance(closure_file, f"/families/{index}/familyId", "DEC-V13-CONTRACT-INTEGRITY")

    registry_file = "validator-registry-v1.3.json"
    for pointer in ["/contractVersion", "/lookupKey", "/schemaVersion", "/severityOrder"]:
        add_direct_provenance(registry_file, pointer, "DEC-V13-CONTRACT-INTEGRITY")
    add_wrapped_provenance(registry_file, "/unknownValidatorDisposition", validator_registry["unknownValidatorDisposition"])
    for index, validator in enumerate(validators):
        for field in ["applicableRuleKinds", "identity", "inputFactSchema", "rootImplementation", "severity", "stableErrors", "workerDescriptor"]:
            add_wrapped_provenance(registry_file, f"/validators/{index}/{field}", validator[field])

    binding_file = "validator-binding-matrix-v1.3.json"
    for pointer in ["/contractVersion", "/schemaVersion"]:
        add_direct_provenance(binding_file, pointer, "DEC-V13-CONTRACT-INTEGRITY")
    add_wrapped_provenance(binding_file, "/duplicateBindingDisposition", binding_matrix["duplicateBindingDisposition"])
    add_wrapped_provenance(binding_file, "/severityDowngradeDisposition", binding_matrix["severityDowngradeDisposition"])
    for index, binding in enumerate(bindings):
        derivability_rows.append({"class": binding["provenance"]["class"], "evidenceIds": [], "recordRef": binding["provenance"]["decisionId"], "normativePointer": f"{binding_file}#/bindings/{index}"})
    for field in ["canonicalization", "digest", "reportV1", "requiredBindings", "schemaVersion", "visibility"]:
        add_wrapped_provenance(binding_file, f"/reportV2Contract/{field}", report_v2[field])

    differential_file = "differential-test-matrix-v1.3.json"
    for pointer in ["/contractVersion", "/domains", "/schemaVersion"]:
        add_direct_provenance(differential_file, pointer, "DEC-V13-DIFFERENTIAL-DOMAINS")
    for index, case in enumerate(delta_cases):
        derivability_rows.append({"class": case["provenance"]["class"], "evidenceIds": [], "recordRef": case["provenance"]["decisionId"], "normativePointer": f"{differential_file}#/v13DeltaCases/{index}"})

    decision_file = "normative-decision-ledger-v1.3.json"
    for pointer in ["/contractVersion", "/provenanceClasses", "/schemaVersion"]:
        add_direct_provenance(decision_file, pointer, "DEC-V13-CONTRACT-INTEGRITY")
    for index, item in enumerate(decisions):
        add_direct_provenance(decision_file, f"/decisions/{index}", item["decisionId"])
    for index, item in enumerate(inapplicable_records):
        derivability_rows.append({"class": item["provenanceClass"], "evidenceIds": [], "recordRef": item["recordId"], "normativePointer": f"{decision_file}#/inapplicableRecords/{index}"})
    for index, item in enumerate(blocked_records):
        derivability_rows.append({"class": item["provenanceClass"], "evidenceIds": [], "recordRef": item["recordId"], "normativePointer": f"{decision_file}#/blockedRecords/{index}"})
    for index, item in enumerate(conditional_artifacts):
        derivability_rows.append({"class": item["provenanceClass"], "evidenceIds": [], "recordRef": item["decisionId"], "normativePointer": f"{decision_file}#/conditionalArtifactDecisions/{index}"})

    target_file = "frozen-migration-target-v1.3.json"
    for pointer in ["/authoringCommit", "/candidateManifest", "/contractVersion", "/privateSourceUse", "/provenanceClasses", "/schemaVersion", "/sourceAuthority"]:
        add_direct_provenance(target_file, pointer, "DEC-V13-CANDIDATE-AUTHORITY")
    target_decision_fields = {
        "candidateStatus": "DEC-V13-CANDIDATE-AUTHORITY",
        "compatibility": "DEC-V13-COMPATIBILITY",
        "differentialDomains": "DEC-V13-DIFFERENTIAL-DOMAINS",
        "digestTopology": "DEC-V13-CANONICAL-BYTES",
        "liveSelection": "DEC-V13-CANDIDATE-AUTHORITY",
        "workerAuthority": "DEC-V13-CANDIDATE-AUTHORITY",
    }
    for field, decision_id in target_decision_fields.items():
        add_direct_provenance(target_file, f"/{field}", decision_id)
    derivability_rows.append({"class": "inherited-public-v1.2", "evidenceIds": ["EV-CONTROL-PINS"], "normativePointer": f"{target_file}#/infrastructureReference", "recordRef": None})
    derivability = {
        "contractVersion": CONTRACT_VERSION,
        "coverageRule": "Every listed normative pointer resolves to exactly one provenance class; inherited rows require evidence IDs and other rows require one decision/inapplicable/blocked record.",
        "rows": derivability_rows,
        "schemaVersion": 1,
    }
    write_json(output_dir, "derivability-provenance-matrix-v1.3.json", derivability)

    markdown = f"""# Evaluation Contract v1.3.0 Candidate

Status: **candidate; non-authoritative; unaccepted; uncommitted; not activated; unavailable to R2A**.

Active authority remains `{ACTIVE_VERSION}` / `{ACTIVE_DIGEST}` and live Procedure `1.0.0`. The infrastructure reference remains `{INFRASTRUCTURE_REFERENCE}`. This candidate has no accepted commit, reviewer, activation, package, release, or publication identity.

## Public evidence and provenance

Every normative rule uses exactly one class: `inherited-public-v1.2`, `trellis-native-v1.3`, `inapplicable`, or `blocked-by-contract`. Public v1.2 supplies identities, mappings, high-level closure applicability, and frozen differential cases. It does not supply the 13 artifact lifecycle dimensions, canonical closure fields, or exact validator triples. New rules are therefore explicit Trellis-native decisions, never backward inference.

## Durable outputs and lifecycle

The source set is exactly 64 outputs across seven families: 22 review-case, 3 review-campaign, 9 project-setup, 16 experiment-campaign, 9 computation, 1 quest, and 4 quest-admin. All 14 identities omitted by the later 50-row skeleton receive explicit dispositions. `<round_id>` aliases `<round-id>`. `findings/` is a container. `quest-event-candidates` is blocked because its material kind and media type are not safely derivable.

Every enforceable material artifact or path pattern has all 13 dimensions, critical validator bindings, stable errors, positive/base/critical-negative/inapplicable fixtures, and root/worker visibility. Exact paths use no separate stable ID; path patterns use explicit placeholder slug IDs.

## Closure

Closure applies only to literature, ideation, idea evaluation, and experiment. Each uses one explicit `methodology/closure/<family>.json` artifact with boolean `/selected/value` and `/blocked/value`, bound evidence ArtifactRef IDs, exact XOR validation, root pre-record reading, and zero-write failure. `Result.status` has no selected/blocked mapping. Workers provide evidence and a pending Proposal only; root retains recording and Decision authority.

## Validators and reports

The trusted registry is root-owned. Each authorized rule has an exact `(id, version, severity)` triple with fixed critical severity. Unknown validators, duplicate bindings, and support-pack downgrades fail closed. Worker-visible descriptors omit implementation metadata.

Report v1 bytes, digest behavior, and replay semantics remain unchanged. Additive report v2 uses domain prefix `trellis-evaluation-report-v2\\0`, canonical JSON framing, exact methodology/Procedure/support/Research/artifact/closure/validator bindings, ordered findings, applicability, blocked facts, and zero-write disposition.

## Compatibility

Methodology contract, Procedure package schema, Procedure version, Context schema, report schema, and Research event schema are independent. Procedure `1.0.0` remains live. Procedures `2.0.0` and `2.0.1` remain immutable historical exceptions resolved only by exact recorded identity and gain no v1.3 authority. Procedure `2.0.2` remains bound to exact v1.2 identity. Future `2.0.3` may bind only the exact V13-B-accepted v1.3 digest. Unknown combinations fail closed.

Frozen v1.2 differential identities remain 229. The 38 expansions remain separate. New v1.3 delta cases use the `V13-*` namespace and do not relabel either prior domain.

## Deterministic digest graph

1. Public evidence plus explicit decisions generate leaf semantic files.
2. `contract-candidate-manifest-v1.3.json` hashes only those leaf files; it excludes itself, sidecars, the frozen target, build tooling, and execution evidence.
3. `frozen-migration-target-v1.3.json` binds the manifest digest and authoritative compatibility/status references; the manifest does not hash the target.
4. Filename-bound sidecars bind the manifest and frozen target.

This graph has no target-to-manifest hash cycle and no self-digest.
"""
    (output_dir / "evaluation-contract-v1.3.0.md").write_text(markdown, encoding="utf-8", newline="\n")

    leaf_roles = {
        "evaluation-contract-v1.3.0.md": ("human-review contract summary", "text/markdown"),
        "public-evidence-index-v1.3.json": ("public source and exact citation index", "application/json"),
        "normative-decision-ledger-v1.3.json": ("Trellis-native decisions and explicit nondecision records", "application/json"),
        "durable-output-disposition-v1.3.json": ("complete 64-output disposition", "application/json"),
        "artifact-lifecycle-contract-v1.3.json": ("13-dimension artifact lifecycle contract", "application/json"),
        "closure-contract-v1.3.json": ("explicit family closure contract", "application/json"),
        "validator-registry-v1.3.json": ("root-owned trusted validator registry", "application/json"),
        "validator-binding-matrix-v1.3.json": ("exact rule bindings and report-v2 contract", "application/json"),
        "derivability-provenance-matrix-v1.3.json": ("normative provenance coverage", "application/json"),
        "io-mapping-ledger-v1.3.csv": ("material v1.3 output disposition mapping", "text/csv"),
        "differential-test-matrix-v1.3.json": ("separate v1.3 semantic delta cases", "application/json"),
    }
    members = []
    for filename in sorted(leaf_roles):
        data = (output_dir / filename).read_bytes()
        role, media = leaf_roles[filename]
        members.append({
            "byteLength": len(data),
            "filename": filename,
            "mediaType": media,
            "provenanceClass": "trellis-native-v1.3",
            "role": role,
            "sha256": sha256_bytes(data),
            "version": CONTRACT_VERSION,
        })
    manifest = {
        "conditionalArtifacts": conditional_artifacts,
        "contractVersion": CONTRACT_VERSION,
        "digestGraph": {
            "acyclic": True,
            "excludedFromMembers": ["contract-candidate-manifest-v1.3.json", "contract-candidate-manifest-v1.3.sha256", "frozen-migration-target-v1.3.json", "frozen-migration-target-v1.3.sha256", "execution-evidence-ledger.json", "build-evaluation-contract-v1.3.py", "c0-preservation-attestation-v1.3.json"],
            "leafMembersHashInto": "contract-candidate-manifest-v1.3.json",
            "manifestDigestBoundBy": ["contract-candidate-manifest-v1.3.sha256", "frozen-migration-target-v1.3.json"],
            "rootTargetBoundBy": "frozen-migration-target-v1.3.sha256",
        },
        "memberCount": len(members),
        "members": members,
        "provenanceClass": "trellis-native-v1.3",
        "schemaVersion": 1,
        "status": "candidate",
    }
    write_json(output_dir, "contract-candidate-manifest-v1.3.json", manifest)
    manifest_bytes = (output_dir / "contract-candidate-manifest-v1.3.json").read_bytes()
    manifest_digest = sha256_bytes(manifest_bytes)
    (output_dir / "contract-candidate-manifest-v1.3.sha256").write_text(f"{manifest_digest}  contract-candidate-manifest-v1.3.json\n", encoding="ascii", newline="\n")

    compatibility = normative({
        "contextSchema": {"domain": "worker-context-schema", "independent": True, "upgradeAuthorized": False},
        "methodologyContract": {"active": {"digest": ACTIVE_DIGEST, "identity": ACTIVE_VERSION}, "candidate": {"accepted": False, "identity": CONTRACT_VERSION}},
        "procedurePackageSchema": {"domain": "procedure-package-schema", "independent": True, "upgradeAuthorized": False},
        "procedureVersions": {
            "1.0.0": {"liveSelectionUnchanged": True, "methodologyAuthority": ACTIVE_VERSION},
            "2.0.0": {"historicalException": True, "resolution": "exact-recorded-identity-only", "v13Inheritance": False},
            "2.0.1": {"historicalException": True, "resolution": "exact-recorded-identity-only", "v13Inheritance": False},
            "2.0.2": {"historical": True, "methodologyDigest": ACTIVE_DIGEST, "methodologyIdentity": ACTIVE_VERSION},
            "2.0.3": {"activationAuthorized": False, "futureBinding": "exact-v13-identity-and-digest-after-v13-b-pass"},
            "unknown": {"disposition": "fail-closed"},
        },
        "reportSchemas": {"v1": {"bytesChanged": False, "digestSemanticsChanged": False, "replayChanged": False}, "v2": {"additive": True, "activationAuthorized": False}},
        "researchEventSchema": {"domain": "research-event-schema", "independent": True, "upgradeAuthorized": False},
    }, "trellis-native-v1.3", "DEC-V13-COMPATIBILITY")
    frozen_target = {
        "authoringCommit": None,
        "candidateManifest": {"filename": "contract-candidate-manifest-v1.3.json", "sha256": manifest_digest},
        "candidateStatus": normative({"accepted": False, "activated": False, "authoritative": False, "availableToR2A": False, "committed": False, "reviewerIdentity": None, "status": "candidate", "v13BPassed": False}, "trellis-native-v1.3", "DEC-V13-CANDIDATE-AUTHORITY"),
        "compatibility": compatibility,
        "contractVersion": CONTRACT_VERSION,
        "differentialDomains": normative({"expansion38": {"count": 38, "separate": True}, "frozenV12": {"count": 229, "preserved": True}, "v13Delta": {"count": len(delta_cases), "namespace": "V13-*"}}, "trellis-native-v1.3", "DEC-V13-DIFFERENTIAL-DOMAINS"),
        "digestTopology": normative({"manifestHashesFrozenTarget": False, "manifestSelfHash": False, "rootDigestSource": "sha256-exact-frozen-target-bytes", "targetHashesManifest": True}, "trellis-native-v1.3", "DEC-V13-CANONICAL-BYTES"),
        "infrastructureReference": normative(INFRASTRUCTURE_REFERENCE, "inherited-public-v1.2", "EV-CONTROL-PINS"),
        "liveSelection": normative({"activationAuthorized": False, "capabilityCount": 14, "literatureDefault": "research.literature.scan", "procedureVersion": "1.0.0"}, "trellis-native-v1.3", "DEC-V13-CANDIDATE-AUTHORITY"),
        "privateSourceUse": False,
        "provenanceClasses": PROVENANCE_CLASSES,
        "schemaVersion": 1,
        "sourceAuthority": {"activeMethodologyDigest": ACTIVE_DIGEST, "activeMethodologyIdentity": ACTIVE_VERSION, "publicEvidenceIndex": "public-evidence-index-v1.3.json", "wave8AuditDigest": "d4415b8cec1e1e8e66ed20ce7416a6969e441a266f5256cbafb579b8d5af0933"},
        "workerAuthority": normative({"adapter": False, "approval": False, "canonicalMutation": False, "chaining": False, "cost": False, "decision": False, "git": False, "launch": False, "network": False, "proposalOnly": True, "randomCanonicalIds": False, "recording": False, "sandboxExpansion": False, "validation": False}, "trellis-native-v1.3", "DEC-V13-CANDIDATE-AUTHORITY"),
    }
    write_json(output_dir, "frozen-migration-target-v1.3.json", frozen_target)
    target_bytes = (output_dir / "frozen-migration-target-v1.3.json").read_bytes()
    target_digest = sha256_bytes(target_bytes)
    (output_dir / "frozen-migration-target-v1.3.sha256").write_text(f"{target_digest}  frozen-migration-target-v1.3.json\n", encoding="ascii", newline="\n")

    return sorted(list(leaf_roles) + [
        "contract-candidate-manifest-v1.3.json",
        "contract-candidate-manifest-v1.3.sha256",
        "frozen-migration-target-v1.3.json",
        "frozen-migration-target-v1.3.sha256",
    ])


def verify(output_dir: Path, *, verify_execution_evidence: bool = False) -> dict[str, Any]:
    json_files = sorted(path for path in output_dir.glob("*.json") if path.name != "execution-evidence-ledger.json")
    parsed = {}
    for path in json_files:
        data = path.read_bytes()
        value = strict_json_bytes(data, path.name)
        if data != canonical_json(value):
            raise ValueError(f"noncanonical JSON bytes: {path.name}")
        parsed[path.name] = value
    disposition = parsed["durable-output-disposition-v1.3.json"]
    if disposition["sourceSetCount"] != 64 or len(disposition["outputs"]) != 64:
        raise ValueError("64-output disposition failure")
    totals: dict[str, int] = {}
    for row in disposition["outputs"]:
        totals[row["family"]["value"]] = totals.get(row["family"]["value"], 0) + 1
    if totals != EXPECTED_FAMILY_TOTALS:
        raise ValueError("family total failure")
    if len({row["outputId"] for row in disposition["outputs"]}) != 64:
        raise ValueError("duplicate output ID")
    if sum(row["omittedByLater50"] for row in disposition["outputs"]) != 14:
        raise ValueError("14-output omission accounting failure")
    aliases = [row for row in disposition["outputs"] if row["disposition"]["value"] == "alias"]
    output_ids = {row["outputId"] for row in disposition["outputs"]}
    if any(row["canonicalOutputId"]["value"] not in output_ids for row in aliases):
        raise ValueError("dangling alias target")

    lifecycle = parsed["artifact-lifecycle-contract-v1.3.json"]
    for artifact in lifecycle["artifacts"]:
        if list(artifact["dimensions"].keys()) != sorted(DIMENSIONS):
            if set(artifact["dimensions"]) != set(DIMENSIONS):
                raise ValueError(f"dimension coverage failure: {artifact['artifactId']}")
        if len(artifact["validatorBindingIds"]["value"]) != 13:
            raise ValueError(f"validator binding count failure: {artifact['artifactId']}")
        for dimension in DIMENSIONS:
            rule = artifact["dimensions"][dimension]
            if set(rule["fixtureObligations"]) != {"positive", "negative", "base", "inapplicable"}:
                raise ValueError(f"dimension fixture coverage failure: {artifact['artifactId']} {dimension}")
            if not rule["stableErrors"]:
                raise ValueError(f"dimension stable error failure: {artifact['artifactId']} {dimension}")
            if rule["validator"]["bindingId"] not in artifact["validatorBindingIds"]["value"]:
                raise ValueError(f"dimension binding reference failure: {artifact['artifactId']} {dimension}")
        for field in ["fixtureObligations", "stableErrorCodes", "validatorBindingIds", "visibility"]:
            if artifact[field]["provenance"]["class"] not in PROVENANCE_CLASSES:
                raise ValueError(f"provenance class failure: {artifact['artifactId']} {field}")

    registry = parsed["validator-registry-v1.3.json"]
    registry_keys = {(entry["identity"]["value"]["id"], entry["identity"]["value"]["version"]): entry for entry in registry["validators"]}
    if len(registry_keys) != len(registry["validators"]):
        raise ValueError("duplicate validator registry identity")
    for entry in registry["validators"]:
        fact_schema = entry["inputFactSchema"]["value"]
        if fact_schema.get("additionalProperties") is not False:
            raise ValueError("validator fact envelope must be closed")
        properties = fact_schema.get("properties", {})
        if set(fact_schema.get("required", [])) != {"ruleId", "targetId", "facts", "authoritySnapshot"}:
            raise ValueError("validator fact envelope required fields drift")
        if not set(fact_schema["required"]) <= set(properties):
            raise ValueError("validator fact envelope declares impossible required fields")
    bindings = parsed["validator-binding-matrix-v1.3.json"]["bindings"]
    if len({binding["bindingId"] for binding in bindings}) != len(bindings):
        raise ValueError("duplicate validator bindings")
    for binding in bindings:
        key = (binding["validator"]["id"], binding["validator"]["version"])
        if key not in registry_keys:
            raise ValueError(f"unknown validator binding: {key}")
        if binding["validator"]["severity"] != "critical":
            raise ValueError("severity downgrade")
        if binding["ruleKind"] not in registry_keys[key]["applicableRuleKinds"]["value"]:
            raise ValueError(f"binding rule kind is outside validator applicability: {binding['bindingId']}")
        if not binding.get("stableErrors"):
            raise ValueError(f"binding lacks stable errors: {binding['bindingId']}")
        registry_errors = set(registry_keys[key]["stableErrors"]["value"])
        if not set(binding["stableErrors"]) <= registry_errors:
            raise ValueError(f"binding error not owned by validator: {binding['bindingId']}")
    binding_ids = {binding["bindingId"] for binding in bindings}
    for artifact in lifecycle["artifacts"]:
        if any(binding_id not in binding_ids for binding_id in artifact["validatorBindingIds"]["value"]):
            raise ValueError(f"dangling artifact binding: {artifact['artifactId']}")

    closure = parsed["closure-contract-v1.3.json"]
    expected_closure_keys = {
        "applicableFamilies",
        "contractVersion",
        "families",
        "genericResultStatusInference",
        "rootDecisionBoundary",
        "schemaVersion",
    }
    if set(closure) != expected_closure_keys:
        raise ValueError("closure contract key set drift")
    if closure["applicableFamilies"] != CLOSURE_FAMILIES:
        raise ValueError("closure family set drift")
    status_policy = closure["genericResultStatusInference"]["value"]
    if status_policy["allowed"] is not False or status_policy["mapping"] is not None:
        raise ValueError("Result status heuristic enabled")
    for family in closure["families"]:
        if set(family["fixtureObligations"]["value"]) != {"positive", "negative", "base", "inapplicable"}:
            raise ValueError(f"closure fixture coverage failure: {family['familyId']}")
        if any(binding_id not in binding_ids for binding_id in family["validatorBindingIds"]["value"]):
            raise ValueError(f"dangling closure binding: {family['familyId']}")
        for side in ["selected", "blocked"]:
            side_policy = family[side]["value"]
            if side_policy.get("selfReference") != "forbidden" or side_policy.get("trueEvidence") != "one-or-more-bound-non-closure-artifact-ref-ids" or side_policy.get("falseEvidence") != "empty-array":
                raise ValueError(f"closure evidence policy drift: {family['familyId']}:{side}")
        closed_schema = family["closureArtifact"]["value"]["closedSchema"]
        if closed_schema.get("additionalProperties") is not False or set(closed_schema.get("required", [])) != {"schemaVersion", "family", "selected", "blocked"}:
            raise ValueError(f"closure artifact schema is not closed: {family['familyId']}")

    differential = parsed["differential-test-matrix-v1.3.json"]
    delta_cases = differential["v13DeltaCases"]
    if differential["domains"]["v13Delta"]["caseCount"] != len(delta_cases):
        raise ValueError("v1.3 delta case count drift")
    if len({case["caseId"] for case in delta_cases}) != len(delta_cases):
        raise ValueError("duplicate v1.3 delta case ID")
    case_binding_ids = {binding_id for case in delta_cases for binding_id in case["bindingIds"]}
    if case_binding_ids != binding_ids:
        raise ValueError("v1.3 delta cases do not cover the exact validator binding set")
    bindings_by_id = {binding["bindingId"]: binding for binding in bindings}
    for case in delta_cases:
        if not case["ruleTargets"] or not case["bindingIds"]:
            raise ValueError(f"delta case lacks exact targets or bindings: {case['caseId']}")
        bound_validators = {tuple(bindings_by_id[binding_id]["validator"][key] for key in ["id", "version", "severity"]) for binding_id in case["bindingIds"]}
        case_validator = tuple(case["validator"][key] for key in ["id", "version", "severity"])
        if bound_validators != {case_validator}:
            raise ValueError(f"delta case validator does not match bindings: {case['caseId']}")
        if case["validator"]["severity"] != "critical":
            raise ValueError(f"delta case severity downgrade: {case['caseId']}")
        if not case["zeroWriteExpectation"]:
            raise ValueError(f"delta case lacks zero-write expectation: {case['caseId']}")
        if case["fixtureClass"] == "critical-negative":
            if not case["expectedStableErrors"] or case["expected"] != "fail-closed":
                raise ValueError(f"negative delta case lacks exact failure: {case['caseId']}")
        elif case["expectedStableErrors"]:
            raise ValueError(f"non-negative delta case declares failure errors: {case['caseId']}")

    derivability = parsed["derivability-provenance-matrix-v1.3.json"]
    provenance_pointers = [row["normativePointer"] for row in derivability["rows"]]
    if len(provenance_pointers) != len(set(provenance_pointers)):
        raise ValueError("duplicate normative provenance pointer")
    required_provenance_files = {
        "artifact-lifecycle-contract-v1.3.json",
        "closure-contract-v1.3.json",
        "differential-test-matrix-v1.3.json",
        "durable-output-disposition-v1.3.json",
        "frozen-migration-target-v1.3.json",
        "normative-decision-ledger-v1.3.json",
        "validator-binding-matrix-v1.3.json",
        "validator-registry-v1.3.json",
    }
    if {pointer.split("#", 1)[0] for pointer in provenance_pointers} != required_provenance_files:
        raise ValueError("normative provenance file coverage drift")
    for row in derivability["rows"]:
        if row["class"] not in PROVENANCE_CLASSES:
            raise ValueError("unknown provenance class")
        if row["class"] == "inherited-public-v1.2" and not row.get("evidenceIds"):
            raise ValueError(f"inherited row lacks evidence: {row['normativePointer']}")
        if row["class"] != "inherited-public-v1.2" and not row.get("recordRef"):
            raise ValueError(f"non-inherited row lacks record: {row['normativePointer']}")

    evidence = parsed["public-evidence-index-v1.3.json"]
    sources = {source["sourceId"]: source for source in evidence["sources"]}
    for source in sources.values():
        data = (REPO_ROOT / source["path"]).read_bytes()
        if sha256_bytes(data) != source["sha256"]:
            raise ValueError(f"evidence source drift: {source['path']}")
    for fact in evidence["facts"]:
        source = sources[fact["sourceId"]]
        if fact["citation"]["kind"] == "json-pointer":
            source_value = strict_json_bytes((REPO_ROOT / source["path"]).read_bytes(), source["path"])
            if resolve_json_pointer(source_value, fact["citation"]["pointer"]) != fact["normalizedFact"]:
                raise ValueError(f"unresolved evidence pointer: {fact['evidenceId']}")
        elif fact["citation"]["kind"] == "line-range":
            lines = (REPO_ROOT / source["path"]).read_text(encoding="utf-8").splitlines()
            if fact["citation"]["startLine"] < 1 or fact["citation"]["endLine"] > len(lines):
                raise ValueError(f"unresolved line citation: {fact['evidenceId']}")
        elif fact["citation"]["kind"] == "csv-row":
            lines = (REPO_ROOT / source["path"]).read_text(encoding="utf-8").splitlines()
            row_number = fact["citation"]["row"]
            if row_number < 2 or row_number > len(lines):
                raise ValueError(f"unresolved CSV row: {fact['evidenceId']}")
        else:
            raise ValueError(f"unknown citation kind: {fact['citation']['kind']}")

    manifest_path = output_dir / "contract-candidate-manifest-v1.3.json"
    manifest = parsed[manifest_path.name]
    member_names = {member["filename"] for member in manifest["members"]}
    for member in manifest["members"]:
        data = (output_dir / member["filename"]).read_bytes()
        if len(data) != member["byteLength"] or sha256_bytes(data) != member["sha256"]:
            raise ValueError(f"manifest member mismatch: {member['filename']}")
    forbidden_members = set(manifest["digestGraph"]["excludedFromMembers"])
    if member_names & forbidden_members:
        raise ValueError("acyclic manifest exclusion failure")
    if "frozen-migration-target-v1.3.json" in member_names:
        raise ValueError("target-manifest digest cycle")
    manifest_digest = sha256_bytes(manifest_path.read_bytes())
    expected_manifest_sidecar = f"{manifest_digest}  contract-candidate-manifest-v1.3.json\n".encode("ascii")
    if (output_dir / "contract-candidate-manifest-v1.3.sha256").read_bytes() != expected_manifest_sidecar:
        raise ValueError("manifest sidecar mismatch")
    target_path = output_dir / "frozen-migration-target-v1.3.json"
    target = parsed[target_path.name]
    if target["candidateManifest"]["sha256"] != manifest_digest:
        raise ValueError("target manifest binding mismatch")
    target_digest = sha256_bytes(target_path.read_bytes())
    expected_target_sidecar = f"{target_digest}  frozen-migration-target-v1.3.json\n".encode("ascii")
    if (output_dir / "frozen-migration-target-v1.3.sha256").read_bytes() != expected_target_sidecar:
        raise ValueError("target sidecar mismatch")

    ledger_path = output_dir / "execution-evidence-ledger.json"
    attestation_path = output_dir / "c0-preservation-attestation-v1.3.json"
    if verify_execution_evidence:
        attestation_bytes = attestation_path.read_bytes()
        attestation = strict_json_bytes(attestation_bytes, attestation_path.name)
        if attestation_bytes != canonical_json(attestation):
            raise ValueError("C0 preservation attestation is noncanonical")
        expected_attestation_keys = {
            "attestationType",
            "contractVersion",
            "framing",
            "normativeContractManifestMember",
            "originalEvidence",
            "parentC0",
            "reproduction",
            "schemaVersion",
            "scope",
        }
        if set(attestation) != expected_attestation_keys or attestation["normativeContractManifestMember"] is not False:
            raise ValueError("C0 preservation attestation contract drift")
        if attestation_path.name in member_names:
            raise ValueError("non-normative C0 attestation entered the contract manifest")
        parent_c0_path = REPO_ROOT / attestation["parentC0"]["path"]
        if attestation["parentC0"]["unchanged"] is not True or sha256_bytes(parent_c0_path.read_bytes()) != attestation["parentC0"]["sha256"]:
            raise ValueError("parent C0 record drift")
        c0 = c0_preservation_inventories()
        expected_c0_reproduction = {
            "procedure": {
                "count": c0["procedureCount"],
                "matched": True,
                "sha256": c0["procedureSha256"],
            },
            "protectedEvidence": {
                "count": c0["protectedEvidenceCount"],
                "matched": True,
                "sha256": c0["protectedEvidenceSha256"],
            },
        }
        if attestation["reproduction"] != expected_c0_reproduction or c0["protectedEvidenceGroupCounts"] != [406, 5, 1]:
            raise ValueError("C0 preservation reproduction drift")
        ledger_bytes = ledger_path.read_bytes()
        ledger = strict_json_bytes(ledger_bytes, ledger_path.name)
        if ledger_bytes != canonical_json(ledger):
            raise ValueError("execution evidence ledger is noncanonical")
        expected_ledger_keys = {"authority", "commands", "contractVersion", "deterministicResults", "inputPins", "isolation", "preservation", "retainedOutputs", "schemaVersion", "serialization"}
        if set(ledger) != expected_ledger_keys:
            raise ValueError("execution evidence ledger key set drift")
        expected_commands = {
            "CMD-DIFF-CHECK": (["git", "diff", "--check", "--", ".trellis/tasks/08-03-author-evaluation-contract-v1-3"], {"OWNED-DIFF-CHECK"}),
            "CMD-GENERATE-VERIFY": (["uv", "run", "python", "./.trellis/tasks/08-03-author-evaluation-contract-v1-3/research/build-evaluation-contract-v1.3.py"], {"GENERATED-CANDIDATE", "SEMANTIC-VERIFY-PASSED"}),
            "CMD-INDEPENDENT-REBUILD": (["uv", "run", "python", "./.trellis/tasks/08-03-author-evaluation-contract-v1-3/research/build-evaluation-contract-v1.3.py", "--check-rebuild"], {"SECOND-MUTATION-SUITE", "SECOND-REBUILD"}),
            "CMD-PROTECTED-INVENTORIES": (["uv", "run", "python", "./.trellis/tasks/08-03-author-evaluation-contract-v1-3/research/build-evaluation-contract-v1.3.py", "--check-protected"], {"C0-EVIDENCE-AGGREGATE", "C0-PROCEDURE-AGGREGATE", "EVIDENCE-412", "PROCEDURE-334"}),
            "CMD-VALIDATE-CHILD": (["uv", "run", "python", "./.trellis/scripts/task.py", "validate", "./.trellis/tasks/08-03-author-evaluation-contract-v1-3"], {"CHILD-TASK-VALID"}),
            "CMD-VALIDATE-PARENT": (["uv", "run", "python", "./.trellis/scripts/task.py", "validate", "./.trellis/tasks/07-29-migrate-research-methodology-to-procedures"], {"PARENT-TASK-VALID"}),
            "CMD-VERIFY-ONLY": (["uv", "run", "python", "./.trellis/tasks/08-03-author-evaluation-contract-v1-3/research/build-evaluation-contract-v1.3.py", "--verify-only"], {"INDEPENDENT-REBUILD", "STRICT-MUTATIONS-REJECTED"}),
        }
        command_ids = [command["commandId"] for command in ledger["commands"]]
        if len(command_ids) != len(set(command_ids)) or set(command_ids) != set(expected_commands):
            raise ValueError("execution evidence command identity drift")
        expected_command_keys = {"argv", "assertions", "commandId", "cwd", "cwdAnchor", "environment", "exitCode", "purpose", "stderrByteLength", "stderrSha256", "stdoutByteLength", "stdoutSha256"}
        expected_environment = {"allowlistedNames": ["HOME", "LANG", "NO_COLOR", "PATH", "TMPDIR"], "mode": "explicit-subprocess-environment", "networkAuthorized": False}
        assertion_ids = []
        for command in ledger["commands"]:
            command_id = command.get("commandId")
            if set(command) != expected_command_keys or command_id not in expected_commands or command["cwd"] != "." or command["cwdAnchor"] != "repository-root" or command["exitCode"] != 0:
                raise ValueError(f"execution evidence command contract drift: {command_id}")
            expected_argv, expected_assertions = expected_commands[command_id]
            if command["argv"] != expected_argv:
                raise ValueError(f"execution evidence argv drift: {command_id}")
            if command["environment"] != expected_environment:
                raise ValueError(f"execution evidence environment drift: {command_id}")
            for stream in ["stdout", "stderr"]:
                if not isinstance(command[f"{stream}ByteLength"], int) or command[f"{stream}ByteLength"] < 0 or not re.fullmatch(r"[0-9a-f]{64}", command[f"{stream}Sha256"]):
                    raise ValueError(f"execution evidence stream metadata drift: {command_id}")
            command_assertions = set()
            for assertion in command["assertions"]:
                if set(assertion) != {"assertionId", "outcome"} or assertion["outcome"] != "pass":
                    raise ValueError(f"execution evidence assertion drift: {command_id}")
                command_assertions.add(assertion["assertionId"])
                assertion_ids.append(assertion["assertionId"])
            if command_assertions != expected_assertions:
                raise ValueError(f"execution evidence assertion set drift: {command_id}")
        if len(assertion_ids) != len(set(assertion_ids)):
            raise ValueError("duplicate execution evidence assertion ID")
        retained_by_path = {entry["path"]: entry for entry in ledger["retainedOutputs"]}
        if len(retained_by_path) != len(ledger["retainedOutputs"]):
            raise ValueError("duplicate retained output path")
        retained_prefix = TASK_RESEARCH.relative_to(REPO_ROOT).as_posix()
        expected_retained_names = member_names | {
            "build-evaluation-contract-v1.3.py",
            "c0-preservation-attestation-v1.3.json",
            "contract-candidate-manifest-v1.3.json",
            "contract-candidate-manifest-v1.3.sha256",
            "frozen-migration-target-v1.3.json",
            "frozen-migration-target-v1.3.sha256",
        }
        expected_retained_paths = {f"{retained_prefix}/{name}" for name in expected_retained_names}
        if set(retained_by_path) != expected_retained_paths:
            raise ValueError("retained execution output set drift")
        for relative_path, entry in retained_by_path.items():
            path = REPO_ROOT / relative_path
            data = path.read_bytes()
            if len(data) != entry["byteLength"] or sha256_bytes(data) != entry["sha256"]:
                raise ValueError(f"retained output evidence drift: {relative_path}")
        deterministic = ledger["deterministicResults"]
        expected_deterministic = {
            "bindingCount": len(bindings),
            "blockedOutputCount": sum(row["disposition"]["value"] == "blocked-by-contract" for row in disposition["outputs"]),
            "closureFamilyCount": len(closure["families"]),
            "deltaCaseCount": differential["domains"]["v13Delta"]["caseCount"],
            "derivabilityRowCount": len(derivability["rows"]),
            "enforceableArtifactCount": len(lifecycle["artifacts"]),
            "manifestDigest": manifest_digest,
            "outputCount": len(disposition["outputs"]),
            "targetDigest": target_digest,
            "validatorCount": len(registry["validators"]),
        }
        for key, value in expected_deterministic.items():
            if deterministic.get(key) != value:
                raise ValueError(f"execution deterministic result drift: {key}")
        if deterministic.get("byteIdenticalFileCount") != 15 or deterministic.get("mutationAssertionCount") != 13:
            raise ValueError("execution rebuild or mutation evidence drift")
        expected_authority = {
            "activationAuthorized": False,
            "archiveAuthorized": False,
            "assurancePerformed": False,
            "authoringCommit": None,
            "authoritative": False,
            "commitAuthorized": False,
            "networkModelOrProviderWork": False,
            "packageLifecycleAuthorized": False,
            "publicationAuthorized": False,
            "pushAuthorized": False,
            "releaseAuthorized": False,
            "reviewerIdentity": None,
            "status": "candidate",
        }
        if ledger["authority"] != expected_authority:
            raise ValueError("execution authority evidence drift")
        isolation = ledger["isolation"]
        if isolation.get("outsideTaskStatusSnapshotBefore") != isolation.get("outsideTaskStatusSnapshotAfter") or isolation.get("outsideTaskStatusUnchanged") is not True:
            raise ValueError("outside-task status isolation evidence drift")
        expected_isolation_claims = {
            "candidateContentAbsoluteOrTemporaryPathHits": 0,
            "candidateContentNetworkLocatorHits": 0,
            "privateSourceBodiesInspected": False,
            "productionTestProcedureRegistryOrSpecificationWrites": False,
            "writeAllowlist": ".trellis/tasks/08-03-author-evaluation-contract-v1-3/research/**",
        }
        if any(isolation.get(key) != value for key, value in expected_isolation_claims.items()):
            raise ValueError("execution isolation claim drift")
        preservation = ledger["preservation"]
        expected_preservation_claims = {
            "c0AggregateSerializationReproduced": True,
            "c0OriginalRecordUnchanged": True,
            "c0PreservationAttestation": ".trellis/tasks/08-03-author-evaluation-contract-v1-3/research/c0-preservation-attestation-v1.3.json",
            "c0ProcedureHashInventorySha256": "67aa0f50f157859e6747ee7f8cbfbe45ed1b236461f3d7095d8672e694f2d7a5",
            "c0ProtectedEvidenceHashInventorySha256": "66a1327a8e2c70f0c5e82c146f99b30b277a7ff54d6863c3d727e156774065e5",
            "historicalProcedureFileCount": 334,
            "localCanonicalHistoricalProcedureInventorySha256After": "186164b7b67fad213871553349abb445caa6cd272c5c2bb4ca26b79248d10fd8",
            "localCanonicalHistoricalProcedureInventorySha256Before": "186164b7b67fad213871553349abb445caa6cd272c5c2bb4ca26b79248d10fd8",
            "localCanonicalProtectedEvidenceInventorySha256After": "6157932d60933eb314cdd1c53ec6999d050e63b07cdb5417ec93693a70c168b7",
            "localCanonicalProtectedEvidenceInventorySha256Before": "6157932d60933eb314cdd1c53ec6999d050e63b07cdb5417ec93693a70c168b7",
            "protectedEvidenceFileCount": 412,
            "sourcePinsReverified": True,
        }
        if any(preservation.get(key) != value for key, value in expected_preservation_claims.items()) or preservation.get("c0AggregateSerializationRisk") is not None:
            raise ValueError("execution preservation evidence drift")

    privacy_scan_names = member_names | {
        "contract-candidate-manifest-v1.3.json",
        "contract-candidate-manifest-v1.3.sha256",
        "frozen-migration-target-v1.3.json",
        "frozen-migration-target-v1.3.sha256",
    }
    if ledger_path.exists():
        privacy_scan_names.add("execution-evidence-ledger.json")
    if attestation_path.exists():
        privacy_scan_names.add("c0-preservation-attestation-v1.3.json")
    candidate_bytes = b"\n".join((output_dir / name).read_bytes() for name in sorted(privacy_scan_names))
    forbidden_patterns = [b"/Users/", b"\\Users\\", b"/tmp/", b"file://", b"http://", b"https://"]
    hits = [pattern.decode("ascii", errors="replace") for pattern in forbidden_patterns if pattern in candidate_bytes]
    if hits:
        raise ValueError(f"candidate contains forbidden absolute/network patterns: {hits}")

    return {
        "bindingCount": len(bindings),
        "blockedOutputCount": sum(row["disposition"]["value"] == "blocked-by-contract" for row in disposition["outputs"]),
        "closureFamilyCount": len(closure["families"]),
        "deltaCaseCount": parsed["differential-test-matrix-v1.3.json"]["domains"]["v13Delta"]["caseCount"],
        "derivabilityRowCount": len(derivability["rows"]),
        "enforceableArtifactCount": len(lifecycle["artifacts"]),
        "manifestDigest": manifest_digest,
        "outputCount": len(disposition["outputs"]),
        "targetDigest": target_digest,
        "validatorCount": len(registry["validators"]),
    }


def check_mutation_rejection(primary_dir: Path) -> dict[str, str]:
    assertions: dict[str, str] = {}
    parser_vectors = {
        "STRICT-BOM": b"\xef\xbb\xbf{}",
        "STRICT-DUPLICATE-DECODED-KEY": b'{"a":1,"\\u0061":2}',
        "STRICT-MALFORMED-JSON": b'{"a":',
        "STRICT-NAN": b'{"a":NaN}',
        "STRICT-POSITIVE-INFINITY": b'{"a":Infinity}',
        "STRICT-NEGATIVE-INFINITY": b'{"a":-Infinity}',
        "STRICT-UNPAIRED-SURROGATE": b'{"a":"\\ud800"}',
    }
    for assertion_id, data in parser_vectors.items():
        try:
            strict_json_bytes(data, assertion_id)
        except (UnicodeDecodeError, ValueError):
            assertions[assertion_id] = "pass-rejected"
        else:
            raise ValueError(f"strict JSON mutation was accepted: {assertion_id}")

    mutation_dir = primary_dir / ".mutation-v1.3"
    shutil.rmtree(mutation_dir, ignore_errors=True)
    try:
        mutation_specs = [
            ("SCHEMA-UNKNOWN-KEY", "durable-output-disposition-v1.3.json", lambda value: value.update({"unknownKey": True})),
            ("SCHEMA-MISSING-KEY", "closure-contract-v1.3.json", lambda value: value.pop("applicableFamilies")),
            ("SCHEMA-ENUM", "durable-output-disposition-v1.3.json", lambda value: value["outputs"][0]["disposition"].update({"value": "unknown"})),
            ("SCHEMA-PATH", "durable-output-disposition-v1.3.json", lambda value: value["outputs"][0]["publicIdentity"].update({"value": "../escape"})),
            ("SCHEMA-ARRAY-ORDER", "validator-binding-matrix-v1.3.json", lambda value: value["bindings"].reverse()),
        ]
        for assertion_id, filename, mutate in mutation_specs:
            shutil.rmtree(mutation_dir, ignore_errors=True)
            build(mutation_dir)
            path = mutation_dir / filename
            value = strict_json_bytes(path.read_bytes(), assertion_id)
            mutate(value)
            path.write_bytes(canonical_json(value))
            try:
                check_rebuild(
                    mutation_dir,
                    include_mutation_checks=False,
                    verify_primary_execution_evidence=False,
                )
            except ValueError:
                assertions[assertion_id] = "pass-rejected"
            else:
                raise ValueError(f"candidate schema mutation was accepted: {assertion_id}")

        shutil.rmtree(mutation_dir, ignore_errors=True)
        build(mutation_dir)
        sidecar = mutation_dir / "contract-candidate-manifest-v1.3.sha256"
        sidecar.write_text(f"{'0' * 64}  wrong-name.json\n", encoding="ascii", newline="\n")
        try:
            check_rebuild(
                mutation_dir,
                include_mutation_checks=False,
                verify_primary_execution_evidence=False,
            )
        except ValueError:
            assertions["SIDECAR-FILENAME-BINDING"] = "pass-rejected"
        else:
            raise ValueError("filename-bound sidecar mutation was accepted")
    finally:
        shutil.rmtree(mutation_dir, ignore_errors=True)
    return assertions


def check_rebuild(
    primary_dir: Path,
    *,
    include_mutation_checks: bool = True,
    verify_primary_execution_evidence: bool = True,
) -> dict[str, Any]:
    primary_result = verify(
        primary_dir,
        verify_execution_evidence=verify_primary_execution_evidence,
    )
    rebuild_dir = primary_dir / ".rebuild-v1.3"
    shutil.rmtree(rebuild_dir, ignore_errors=True)
    try:
        generated_names = build(rebuild_dir)
        rebuild_result = verify(rebuild_dir)
        if rebuild_result != primary_result:
            raise ValueError("primary and rebuild verification results differ")
        for name in generated_names:
            if (primary_dir / name).read_bytes() != (rebuild_dir / name).read_bytes():
                raise ValueError(f"independent rebuild byte mismatch: {name}")
        result = {"byteIdenticalFileCount": len(generated_names), **rebuild_result}
        if include_mutation_checks:
            mutation_assertions = check_mutation_rejection(primary_dir)
            result["mutationAssertionCount"] = len(mutation_assertions)
            result["mutationAssertions"] = mutation_assertions
        return result
    finally:
        shutil.rmtree(rebuild_dir, ignore_errors=True)


def c0_preservation_inventories() -> dict[str, Any]:
    previous_locale = locale.setlocale(locale.LC_COLLATE)
    locale.setlocale(locale.LC_COLLATE, "en_US.UTF-8")
    try:
        def shasum_inventory(paths: list[Path]) -> tuple[int, str]:
            ordered = sorted(paths, key=lambda path: locale.strxfrm(str(path)))
            rows = [
                f"{sha256_bytes(path.read_bytes())}  {path}\n".encode("utf-8")
                for path in ordered
            ]
            return len(ordered), sha256_bytes(b"".join(rows))

        procedure_root = REPO_ROOT / "packages/cli/src/templates/research/procedures"
        procedure_versions = {"1.0.0", "2.0.0", "2.0.1", "2.0.2"}
        procedure_paths = [
            path
            for path in procedure_root.rglob("*")
            if path.is_file()
            and any(part in procedure_versions for part in path.relative_to(procedure_root).parts)
        ]
        procedure = shasum_inventory(procedure_paths)

        protected_group_one = []
        for relative_root in [
            ".trellis/tasks/archive/2026-07",
            ".trellis/tasks/07-29-freeze-phase2-methodology-packaging-contracts",
            ".trellis/tasks/07-29-activate-migrated-research-methodology/research",
            ".trellis/tasks/07-29-assure-close-phase2-methodology-migration/research",
        ]:
            protected_group_one.extend(
                path for path in (REPO_ROOT / relative_root).rglob("*") if path.is_file()
            )
        parent_research = REPO_ROOT / ".trellis/tasks/07-29-migrate-research-methodology-to-procedures/research"
        protected_group_two = list(parent_research.glob("r0-*.json")) + [
            parent_research / "wave8-r2a-frozen-v1.2-evidence-gap-audit.md"
        ]
        protected_groups = [
            protected_group_one,
            protected_group_two,
            [REPO_ROOT / ".trellis/research/phase-2-pins.md"],
        ]
        protected_rows = []
        protected_count = 0
        protected_group_counts = []
        for group in protected_groups:
            ordered = sorted(group, key=lambda path: locale.strxfrm(str(path)))
            protected_group_counts.append(len(ordered))
            protected_count += len(ordered)
            protected_rows.extend(
                f"{sha256_bytes(path.read_bytes())}  {path}\n".encode("utf-8")
                for path in ordered
            )
        return {
            "procedureCount": procedure[0],
            "procedureSha256": procedure[1],
            "protectedEvidenceCount": protected_count,
            "protectedEvidenceGroupCounts": protected_group_counts,
            "protectedEvidenceSha256": sha256_bytes(b"".join(protected_rows)),
        }
    finally:
        locale.setlocale(locale.LC_COLLATE, previous_locale)


def check_protected_inventories() -> dict[str, Any]:
    procedure_patterns = [
        "packages/cli/src/templates/research/procedures/*/1.0.0/**",
        "packages/cli/src/templates/research/procedures/*/2.0.0/**",
        "packages/cli/src/templates/research/procedures/*/2.0.1/**",
        "packages/cli/src/templates/research/procedures/*/2.0.2/**",
    ]
    evidence_patterns = [
        ".trellis/tasks/archive/2026-07/**",
        ".trellis/tasks/07-29-freeze-phase2-methodology-packaging-contracts/**",
        ".trellis/tasks/07-29-migrate-research-methodology-to-procedures/research/r0-*.json",
        ".trellis/tasks/07-29-migrate-research-methodology-to-procedures/research/wave8-r2a-frozen-v1.2-evidence-gap-audit.md",
        ".trellis/tasks/07-29-activate-migrated-research-methodology/research/**",
        ".trellis/tasks/07-29-assure-close-phase2-methodology-migration/research/**",
        ".trellis/research/phase-2-pins.md",
    ]

    def inventory(patterns: list[str]) -> tuple[int, str]:
        files = {path for pattern in patterns for path in REPO_ROOT.glob(pattern) if path.is_file()}
        rows = [
            f"{sha256_bytes(path.read_bytes())}  {path.relative_to(REPO_ROOT).as_posix()}\n"
            for path in sorted(files, key=lambda item: item.relative_to(REPO_ROOT).as_posix())
        ]
        return len(files), sha256_bytes("".join(rows).encode("utf-8"))

    procedure = inventory(procedure_patterns)
    evidence = inventory(evidence_patterns)
    expected_procedure = (334, "186164b7b67fad213871553349abb445caa6cd272c5c2bb4ca26b79248d10fd8")
    expected_evidence = (412, "6157932d60933eb314cdd1c53ec6999d050e63b07cdb5417ec93693a70c168b7")
    if procedure != expected_procedure:
        raise ValueError(f"historical Procedure inventory drift: {procedure}")
    if evidence != expected_evidence:
        raise ValueError(f"protected evidence inventory drift: {evidence}")
    c0 = c0_preservation_inventories()
    expected_c0 = {
        "procedureCount": 334,
        "procedureSha256": "67aa0f50f157859e6747ee7f8cbfbe45ed1b236461f3d7095d8672e694f2d7a5",
        "protectedEvidenceCount": 412,
        "protectedEvidenceGroupCounts": [406, 5, 1],
        "protectedEvidenceSha256": "66a1327a8e2c70f0c5e82c146f99b30b277a7ff54d6863c3d727e156774065e5",
    }
    if c0 != expected_c0:
        raise ValueError(f"parent C0 preservation inventory drift: {c0}")
    return {
        "c0ProcedureHashInventorySha256": c0["procedureSha256"],
        "c0ProtectedEvidenceHashInventorySha256": c0["protectedEvidenceSha256"],
        "historicalProcedureFileCount": procedure[0],
        "historicalProcedureInventorySha256": procedure[1],
        "protectedEvidenceFileCount": evidence[0],
        "protectedEvidenceInventorySha256": evidence[1],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", type=Path, default=TASK_RESEARCH)
    parser.add_argument("--verify-only", action="store_true")
    parser.add_argument("--check-rebuild", action="store_true")
    parser.add_argument("--check-protected", action="store_true")
    args = parser.parse_args()
    output_dir = args.output_dir.resolve()
    if args.check_protected:
        result = check_protected_inventories()
    elif args.check_rebuild or args.verify_only:
        result = check_rebuild(output_dir)
    else:
        build(output_dir)
        result = verify(output_dir)
    print(json.dumps(result, ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    main()
