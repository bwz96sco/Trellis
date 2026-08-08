#!/usr/bin/env python3
"""Deterministically validate the exact G132 attempt-2 governance boundary."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import subprocess
import sys
from collections import Counter
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[4]
PARENT = ".trellis/tasks/07-29-migrate-research-methodology-to-procedures"
G = ".trellis/tasks/08-08-correct-evaluation-contract-v1-3-1-semantic-defects-attempt-2"
A = ".trellis/tasks/08-08-author-evaluation-contract-v1-3-1-attempt-2"
B = ".trellis/tasks/08-08-assure-evaluation-contract-v1-3-1-mal1-attempt-2"
O = ".trellis/tasks/08-08-decide-evaluation-contract-v1-3-1-attempt-2"
G_SLUG = G.rsplit("/", 1)[1]
A_SLUG = A.rsplit("/", 1)[1]
B_SLUG = B.rsplit("/", 1)[1]
O_SLUG = O.rsplit("/", 1)[1]
EVIDENCE_PATH = f"{G}/research/g132-validation-evidence.json"
DATE = "2026-08-08"
A11 = "3534529a36a10ea8015a51f71a93e2b78300a563"
G131 = "15de62625685c32f00edf9aef8f2c1cf5a05d7bb"
PREDECESSOR = "9392f20ce0dd93107205ed7c28dc964b5879b7bc"
PROCEDURE = "0afef5adaea2a58c8c6cc5a3f1a51a054fa1a39d"
ACCEPTED = "916be0a877725f7f91836a3a97e480c1e104e533"

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
PLANNING_NAMES = ("task.json", "prd.md", "design.md", "implement.md", "implement.jsonl", "check.jsonl")
GOVERNANCE_NAMES = (
    "g132-governance-baseline-attestation.json",
    "g132-topology-and-path-ownership.json",
    "g132-g131-finding-004-supersession.json",
    "g132-output-inventories.json",
    "g132-authority-and-containment.json",
    "g132-validation.py",
    "g132-validation-evidence.json",
)
G132_PATHS = tuple(
    [f"{root}/{name}" for root in (G, A, B, O) for name in PLANNING_NAMES]
    + [
        f"{PARENT}/task.json",
        f"{PARENT}/prd.md",
        f"{PARENT}/design.md",
        f"{PARENT}/implement.md",
        f"{PARENT}/research/path-ownership-map.md",
    ]
    + [f"{G}/research/{name}" for name in GOVERNANCE_NAMES]
)
OLD_ROOTS = (
    ".trellis/tasks/08-08-correct-evaluation-contract-v1-3-1-semantic-defects",
    ".trellis/tasks/08-08-author-evaluation-contract-v1-3-1",
    ".trellis/tasks/08-08-assure-evaluation-contract-v1-3-1-mal1",
    ".trellis/tasks/08-08-decide-evaluation-contract-v1-3-1",
)
CS5_DECISION = ".trellis/tasks/08-06-cs5-decide-complete-system-attempt-10/research/cs5-8-honest-stop-record.json"
INHERITED_DIRTY_PATHS = frozenset({"AGENTS.md", "CLAUDE.md", "docs-site", "marketplace", CS5_DECISION})
PROTECTED_FILES = {
    "AGENTS.md": (3673, "46ec2da5b9077e6c351dbf13066c7d14a796ca018f32d63963feefdd62ce3d31"),
    "CLAUDE.md": (4957, "707cc4e3d24165ab4cc91bc884f6b8ebf7ee2971c7f5edf2ac0b197f9f1d4f4b"),
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
CS5_LENGTH = 721
CS5_SHA256 = "3aebafbb76f6a256a9ee58fea39bca9c235e18e9df8cf36a1d057eaff6dc4282"

MAPPING = (
    ("project-setup-v1", "research.setup.project", "applicable", "research-project-setup"),
    ("quest-framing-v1", "research.framing.quest", "applicable", "research-quest"),
    ("quest-admin-v1", "research.framing.admin", "applicable", "research-quest-admin"),
    ("literature-scan-v1", "research.literature.scan", "applicable", "research-literature"),
    ("literature-review-v1", "research.literature.review", "applicable", "research-literature"),
    ("survey-v1", "research.literature.survey", "notApplicable", None),
    ("idea-generation-v1", "research.ideation.generate", "applicable", "research-ideation"),
    ("idea-evaluation-v1", "research.ideation.evaluate", "applicable", "research-idea-evaluation"),
    ("experiment-round-v1", "research.experiment.round", "applicable", "research-experiment"),
    (
        "experiment-campaign-v1",
        "research.experiment.campaign",
        "applicable",
        "research-experiment-campaign",
    ),
    ("computation-case-v1", "research.computation.case", "applicable", "research-computation"),
    ("theory-case-v1", "research.theory.case", "applicable", "research-computation"),
    ("review-case-v1", "research.audit.case", "applicable", "research-review-case"),
    ("review-campaign-v1", "research.audit.campaign", "applicable", "research-review-campaign"),
    ("writing-case-v1", "research.writing.case", "notApplicable", None),
    ("figure-v1", "research.writing.figure", "notApplicable", None),
    ("slides-v1", "research.writing.slides", "notApplicable", None),
)
MAPPING_ROWS = tuple(
    {
        "procedureId": procedure_id,
        "procedureVersion": "2.0.7",
        "capabilityId": capability_id,
        "disposition": disposition,
        "artifactFamily": family,
    }
    for procedure_id, capability_id, disposition, family in MAPPING
)
CODOMAIN = (
    "research-review-case",
    "research-review-campaign",
    "research-project-setup",
    "research-experiment-campaign",
    "research-computation",
    "research-quest",
    "research-quest-admin",
    "research-literature",
    "research-ideation",
    "research-idea-evaluation",
    "research-experiment",
)
FAMILY_ARTIFACT_COUNTS = {
    "research-review-case": 21,
    "research-review-campaign": 3,
    "research-project-setup": 9,
    "research-experiment-campaign": 15,
    "research-computation": 9,
    "research-quest": 1,
    "research-quest-admin": 3,
    "research-literature": 1,
    "research-ideation": 1,
    "research-idea-evaluation": 1,
    "research-experiment": 1,
}
POPULATIONS = {
    "normativeLeaves": 7,
    "durableOutputs": 64,
    "lifecycleArtifacts": 65,
    "lifecycleArtifactFamilies": 11,
    "lifecycleDimensions": 13,
    "lifecycleBindings": 845,
    "closureBindings": 20,
    "globalBindings": 11,
    "totalBindings": 876,
    "validators": 20,
    "provenanceRows": 3343,
    "differentialCases": 116,
    "globalDifferentialCases": 44,
    "globalInapplicableCases": 11,
    "closureFamilies": 4,
    "publicEvidenceSources": 18,
    "publicEvidenceFacts": 168,
    "procedureCapabilityMappingRows": 17,
}
CANDIDATE_NAMES = (
    "durable-output-disposition-v1.3.1.json",
    "artifact-lifecycle-contract-v1.3.1.json",
    "validator-registry-v1.3.1.json",
    "validator-binding-matrix-v1.3.1.json",
    "differential-test-matrix-v1.3.1.json",
    "derivability-provenance-matrix-v1.3.1.json",
    "closure-contract-v1.3.1.json",
)
A132_1_NAMES = CANDIDATE_NAMES + (
    "contract-candidate-manifest-v1.3.1.json",
    "frozen-semantic-target-v1.3.1.json",
    "four-finding-correction-ledger-v1.3.1.json",
    "semantic-diff-ledger-v1.3.0-to-v1.3.1.json",
    "assurance-corpus-v1.3.1.json",
    "author-validation.json",
    "author-v1.3.1.py",
    "author-output-manifest-v1.3.1.json",
)
B132_1_NAMES = (
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
EXPECTED_INVENTORIES = {
    "G132": G132_PATHS,
    "A132-0": (f"{A}/task.json", f"{A}/research/a132-0-author-assignment-and-input-authorization.json"),
    "A132-1": tuple(f"{A}/research/{name}" for name in A132_1_NAMES),
    "B132-0": (f"{B}/task.json", f"{B}/research/b132-0-independent-reviewer-assignment.json"),
    "B132-1": tuple(f"{B}/research/{name}" for name in B132_1_NAMES),
    "O132-0": (f"{O}/task.json", f"{O}/research/o132-0-decision-input-attestation.json"),
    "O132-1": (f"{O}/research/o132-1-operator-decision.json",),
}
EXPECTED_COUNTS = {key: len(value) for key, value in EXPECTED_INVENTORIES.items()}

A11_PATHS = (
    ".trellis/tasks/08-07-cs6-audit-accepted-v13-semantic-leaves/research/cs6-1-disposition.json",
    ".trellis/tasks/08-07-cs6-audit-accepted-v13-semantic-leaves/research/semantic-audit-findings.json",
    ".trellis/tasks/08-07-cs6-audit-accepted-v13-semantic-leaves/research/cs6-1-independent-verification.json",
    ".trellis/tasks/08-07-cs6-audit-accepted-v13-semantic-leaves/research/exact-input-attestation.json",
)
G131_OUTPUT_PATHS = tuple(
    f".trellis/tasks/08-08-correct-evaluation-contract-v1-3-1-semantic-defects/research/{name}"
    for name in (
        "g131-governance-baseline-attestation.json",
        "g131-topology-and-path-ownership.json",
        "g131-correction-and-propagation-allowlist.json",
        "g131-output-inventories.json",
        "g131-authority-and-containment.json",
        "g131-validation.py",
        "g131-validation-evidence.json",
    )
)
G131_ALLOWLIST_PATH = G131_OUTPUT_PATHS[2]
G131_CONTAINMENT_PATH = G131_OUTPUT_PATHS[4]
G131_EVIDENCE_PATH = G131_OUTPUT_PATHS[6]
A131_PATHS = (
    ".trellis/tasks/08-08-author-evaluation-contract-v1-3-1/task.json",
    ".trellis/tasks/08-08-author-evaluation-contract-v1-3-1/research/a131-0-author-assignment-and-input-authorization.json",
)
ACCEPTED_PATHS = (
    ".trellis/tasks/08-04-author-evaluation-contract-v1-3-attempt-3/research/durable-output-disposition-v1.3.json",
    ".trellis/tasks/08-04-author-evaluation-contract-v1-3-attempt-3/research/artifact-lifecycle-contract-v1.3.json",
    ".trellis/tasks/08-04-author-evaluation-contract-v1-3-attempt-3/research/validator-registry-v1.3.json",
    ".trellis/tasks/08-04-author-evaluation-contract-v1-3-attempt-3/research/validator-binding-matrix-v1.3.json",
    ".trellis/tasks/08-04-author-evaluation-contract-v1-3-attempt-3/research/differential-test-matrix-v1.3.json",
    ".trellis/tasks/08-04-author-evaluation-contract-v1-3-attempt-3/research/derivability-provenance-matrix-v1.3.json",
    ".trellis/tasks/08-04-author-evaluation-contract-v1-3-attempt-3/research/closure-contract-v1.3.json",
)

PARENT_OVERLAY_RULES = {
    "prd.md": (
        "## Additive overlay — evaluation-contract v1.3.1 attempt-2 successor (2026-08-08)",
        ("14,365", "975", "13,390", "artifactFamily:null", PROCEDURE),
    ),
    "design.md": (
        "## Additive overlay — v1.3.1 attempt-2 mapping correction design (2026-08-08)",
        ("procedureId", "disposition", "research-experiment-campaign", "research-experiment"),
    ),
    "implement.md": (
        "## Additive overlay — v1.3.1 attempt-2 execution (2026-08-08)",
        ("G132", "A132-0", "14,365", "do not proceed to A132-0"),
    ),
    "research/path-ownership-map.md": (
        "## Additive amendment — evaluation-contract v1.3.1 attempt-2 ownership (2026-08-08)",
        (G, A, B, O, "G131/A131/B131/O131"),
    ),
}


class ValidationError(RuntimeError):
    """Raised when an exact G132 invariant fails."""


def fail(message: str) -> None:
    raise ValidationError(message)


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


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


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
            fail(f"duplicate decoded JSON key {key!r}")
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


def parse_json_bytes(data: bytes, location: str) -> Any:
    try:
        text = data.decode("utf-8", errors="strict")
    except UnicodeDecodeError as exc:
        fail(f"invalid UTF-8 at {location}: {exc}")
    try:
        value = json.loads(
            text,
            object_pairs_hook=unique_object,
            parse_constant=reject_constant,
            parse_float=parse_float,
        )
    except (json.JSONDecodeError, ValueError) as exc:
        fail(f"invalid strict JSON at {location}: {exc}")
    validate_unicode(value, location)
    return value


def canonical_json_bytes(value: Any) -> bytes:
    return (
        json.dumps(value, ensure_ascii=False, allow_nan=False, sort_keys=True, separators=(",", ":"))
        + "\n"
    ).encode("utf-8")


def canonical_value_bytes(value: Any) -> bytes:
    return json.dumps(
        value, ensure_ascii=False, allow_nan=False, sort_keys=True, separators=(",", ":")
    ).encode("utf-8")


def authority(task_execution: bool) -> dict[str, bool]:
    return {"taskExecutionAuthorized": task_execution, **{key: False for key in DENIAL_FIELDS}}


def commit_tree(commit: str) -> str:
    return git("rev-parse", f"{commit}^{{tree}}").strip()


def identity(commit: str, path: str) -> dict[str, Any]:
    data = git_bytes(commit, path)
    return {
        "blobOid": git("rev-parse", f"{commit}:{path}").strip(),
        "byteLength": len(data),
        "path": path,
        "sha256": sha256_bytes(data),
    }


def value_digest(value: Any) -> str:
    return "sha256:" + sha256_bytes(b"trellis-g132-preserved-json-value-v1\0" + canonical_value_bytes(value))


class Source:
    def __init__(self, subject: str | None):
        self.subject = subject

    @property
    def committed(self) -> bool:
        return self.subject is not None

    def bytes(self, path: str) -> bytes:
        if self.subject is not None:
            return git_bytes(self.subject, path)
        full = REPO_ROOT / path
        if not full.is_file():
            fail(f"missing G132 path: {path}")
        if full.is_symlink():
            fail(f"G132 path must not be a symlink: {path}")
        return full.read_bytes()

    def json(self, path: str) -> Any:
        return parse_json_bytes(self.bytes(path), f"{self.subject or 'worktree'}:{path}")

    def files_under(self, roots: tuple[str, ...]) -> set[str]:
        if self.subject is not None:
            output = git("ls-tree", "-r", "--name-only", self.subject, "--", *roots)
            return {line for line in output.splitlines() if line}
        result: set[str] = set()
        for root in roots:
            full = REPO_ROOT / root
            if not full.is_dir():
                fail(f"missing task directory: {root}")
            for path in full.rglob("*"):
                if path.is_file() or path.is_symlink():
                    result.add(path.relative_to(REPO_ROOT).as_posix())
        return result


def require_one_final_lf(path: str, data: bytes) -> None:
    if not data.endswith(b"\n") or data.endswith(b"\n\n"):
        fail(f"{path} must end with exactly one final LF")
    if b"\r" in data:
        fail(f"{path} contains CR bytes")


def validate_file_syntax(source: Source, path: str, allow_missing_evidence: bool) -> None:
    if allow_missing_evidence and not source.committed and path == EVIDENCE_PATH and not (REPO_ROOT / path).exists():
        return
    data = source.bytes(path)
    require_one_final_lf(path, data)
    if path.endswith(".json"):
        value = parse_json_bytes(data, path)
        if path.startswith(f"{G}/research/") and data != canonical_json_bytes(value):
            fail(f"governance JSON is not canonical compact sorted JSON: {path}")
    elif path.endswith(".jsonl"):
        lines = data.splitlines(keepends=True)
        if not lines:
            fail(f"empty JSONL: {path}")
        for line_number, line in enumerate(lines, 1):
            if not line.endswith(b"\n") or line in (b"\n", b"\r\n"):
                fail(f"invalid JSONL line {line_number}: {path}")
            value = parse_json_bytes(line, f"{path}:{line_number}")
            if line != canonical_json_bytes(value):
                fail(f"non-canonical JSONL line {line_number}: {path}")


def dirty_paths() -> set[str]:
    tracked = set(git("diff", "--name-only", "HEAD").splitlines())
    staged = set(git("diff", "--cached", "--name-only").splitlines())
    untracked = set(git("ls-files", "--others", "--exclude-standard").splitlines())
    return {path for path in tracked | staged | untracked if path}


def validate_mode_and_scope(source: Source, allow_missing_evidence: bool) -> None:
    if len(G132_PATHS) != 36 or len(set(G132_PATHS)) != 36:
        fail("internal G132 inventory is not exactly 36 unique paths")
    if EXPECTED_COUNTS != {
        "G132": 36,
        "A132-0": 2,
        "A132-1": 15,
        "B132-0": 2,
        "B132-1": 11,
        "O132-0": 2,
        "O132-1": 1,
    }:
        fail("internal boundary counts mismatch")

    expected_owned = {
        path
        for path in G132_PATHS
        if path.startswith((G + "/", A + "/", B + "/", O + "/"))
    }
    if allow_missing_evidence:
        expected_owned.remove(EVIDENCE_PATH)
    actual_owned = source.files_under((G, A, B, O))
    if actual_owned != expected_owned:
        fail(
            f"new-root inventory mismatch: extra={sorted(actual_owned - expected_owned)} "
            f"missing={sorted(expected_owned - actual_owned)}"
        )

    if source.subject is None:
        if git("rev-parse", "HEAD").strip() != PREDECESSOR:
            fail(f"precommit HEAD must be {PREDECESSOR}")
        staged = {line for line in git("diff", "--cached", "--name-only").splitlines() if line}
        if staged:
            fail(f"precommit staged set must be empty: {sorted(staged)}")
        expected_dirty = set(G132_PATHS) | set(INHERITED_DIRTY_PATHS)
        if allow_missing_evidence:
            expected_dirty.remove(EVIDENCE_PATH)
        actual_dirty = dirty_paths()
        if actual_dirty != expected_dirty:
            fail(
                f"complete dirty-path mismatch: extra={sorted(actual_dirty - expected_dirty)} "
                f"missing={sorted(expected_dirty - actual_dirty)}"
            )
        old_drift = {line for line in git("diff", "--name-only", PREDECESSOR, "--", *OLD_ROOTS).splitlines() if line}
        if old_drift:
            fail(f"old G131/A131/B131/O131 roots drifted: {sorted(old_drift)}")
    else:
        subject = git("rev-parse", f"{source.subject}^{{commit}}").strip()
        if subject != source.subject:
            fail("committed-tree subject must be an explicit full commit OID")
        parents = git("show", "-s", "--format=%P", subject).split()
        if not parents or parents[0] != PREDECESSOR:
            fail(f"committed-tree subject first parent must be {PREDECESSOR}")
        changed = {
            line
            for line in git("diff", "--name-only", PREDECESSOR, subject, "--").splitlines()
            if line
        }
        if changed != set(G132_PATHS):
            fail(
                f"committed subject path mismatch: extra={sorted(changed - set(G132_PATHS))} "
                f"missing={sorted(set(G132_PATHS) - changed)}"
            )
        old_drift = {
            line
            for line in git("diff", "--name-only", PREDECESSOR, subject, "--", *OLD_ROOTS).splitlines()
            if line
        }
        if old_drift:
            fail(f"committed subject modifies old routes: {sorted(old_drift)}")


def validate_parent_overlays(source: Source) -> None:
    current_task = source.json(f"{PARENT}/task.json")
    base_task = parse_json_bytes(git_bytes(PREDECESSOR, f"{PARENT}/task.json"), "predecessor parent task")
    children = current_task.get("children")
    if not isinstance(children, list) or children.count(G_SLUG) != 1 or children[-1] != G_SLUG:
        fail("canonical parent must append G132 exactly once as final child")
    reduced = dict(current_task)
    reduced["children"] = children[:-1]
    if reduced != base_task:
        fail("canonical parent task.json changed beyond one final G132 child")

    for relative, (heading, markers) in PARENT_OVERLAY_RULES.items():
        path = f"{PARENT}/{relative}"
        base = git_bytes(PREDECESSOR, path)
        current = source.bytes(path)
        if not current.startswith(base):
            fail(f"parent overlay is not append-only: {path}")
        suffix = current[len(base) :]
        expected_start = ("\n" + heading + "\n").encode("utf-8")
        if not suffix.startswith(expected_start):
            fail(f"parent overlay has wrong attempt-2 heading: {path}")
        text = suffix.decode("utf-8", errors="strict")
        if text.count(heading) != 1 or text.count("\n## ") != 1:
            fail(f"parent overlay must contain exactly one appended H2 section: {path}")
        for marker in markers:
            if marker not in text:
                fail(f"parent overlay missing required marker {marker!r}: {path}")


def validate_task_authority(task: Any, location: str) -> None:
    if not isinstance(task, dict):
        fail(f"task must be an object: {location}")
    expected_top = {
        "id",
        "name",
        "title",
        "description",
        "status",
        "dev_type",
        "scope",
        "package",
        "priority",
        "creator",
        "assignee",
        "createdAt",
        "completedAt",
        "branch",
        "base_branch",
        "worktree_path",
        "commit",
        "pr_url",
        "subtasks",
        "children",
        "parent",
        "relatedFiles",
        "notes",
        "meta",
    }
    if set(task) != expected_top:
        fail(f"task top-level key set mismatch: {location}")
    meta = task.get("meta")
    if not isinstance(meta, dict):
        fail(f"missing task metadata: {location}")
    if meta.get("taskExecutionAuthorized") is not False:
        fail(f"task metadata must remain routing-only: {location}")
    for key in DENIAL_FIELDS:
        if meta.get(key) is not False:
            fail(f"{key} must be false in {location}")


def validate_topology(source: Source) -> None:
    campaign = source.json(f"{G}/task.json")
    author = source.json(f"{A}/task.json")
    assurance = source.json(f"{B}/task.json")
    decision = source.json(f"{O}/task.json")
    expected_children = [A_SLUG, B_SLUG, O_SLUG]
    if campaign.get("id") != G_SLUG[6:] or campaign.get("name") != G_SLUG[6:]:
        fail("G132 campaign identity mismatch")
    if campaign.get("status") != "in_progress" or campaign.get("assignee") is not None:
        fail("G132 campaign must be in_progress and unassigned")
    if campaign.get("children") != expected_children or campaign.get("parent") != PARENT.rsplit("/", 1)[1]:
        fail("G132 campaign reciprocal topology mismatch")
    if campaign.get("meta", {}).get("active") is not True:
        fail("G132 campaign must be active only for governance")
    if campaign.get("meta", {}).get("commitBoundaries") != [
        "G132",
        "A132-0",
        "A132-1",
        "B132-0",
        "B132-1",
        "O132-0",
        "O132-1",
    ]:
        fail("G132 boundary names mismatch")
    validate_task_authority(campaign, f"{G}/task.json")

    for task, root, slug, boundaries in (
        (author, A, A_SLUG, ["A132-0", "A132-1"]),
        (assurance, B, B_SLUG, ["B132-0", "B132-1"]),
        (decision, O, O_SLUG, ["O132-0", "O132-1"]),
    ):
        if task.get("id") != slug[6:] or task.get("name") != slug[6:]:
            fail(f"child identity mismatch: {root}")
        if task.get("status") != "planning" or task.get("assignee") is not None:
            fail(f"child must remain planning and unassigned: {root}")
        if task.get("parent") != G_SLUG or task.get("children") != []:
            fail(f"child reciprocal topology mismatch: {root}")
        if task.get("meta", {}).get("active") is not False:
            fail(f"child must remain inactive: {root}")
        if task.get("meta", {}).get("commitBoundaries") != boundaries:
            fail(f"child boundary inventory mismatch: {root}")
        if task.get("meta", {}).get("targetContract") != "evaluation-contract-v1.3.1":
            fail(f"contract identity changed: {root}")
        validate_task_authority(task, f"{root}/task.json")


def expected_projection_evidence() -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    for procedure_id, _, disposition, family in MAPPING:
        path = (
            "packages/cli/src/templates/research/procedures/"
            f"{procedure_id}/2.0.6/methodology/lifecycle/lifecycle-rows.json"
        )
        value = parse_json_bytes(git_bytes(PROCEDURE, path), f"{PROCEDURE}:{path}")
        row_families = sorted({row["family"]["value"] for row in value["rows"]})
        result.append(
            {
                **identity(PROCEDURE, path),
                "procedureId": procedure_id,
                "projectionProcedureVersion": value["procedureVersion"],
                "family": value["family"],
                "rowCount": len(value["rows"]),
                "rowFamilies": row_families,
                "dispositionEvidence": disposition,
                "expectedPositiveLifecycleDecisionsAt2.0.7": (
                    FAMILY_ARTIFACT_COUNTS[family] * 13 if disposition == "applicable" else 0
                ),
            }
        )
    return result


def expected_baseline() -> dict[str, Any]:
    projections = expected_projection_evidence()
    return {
        "recordKind": "g132-governance-baseline-attestation",
        "schemaVersion": 1,
        "date": DATE,
        "authority": authority(False),
        "predecessors": {
            "a11": {"commit": A11, "tree": commit_tree(A11), "records": [identity(A11, path) for path in A11_PATHS]},
            "g131": {
                "commit": G131,
                "tree": commit_tree(G131),
                "records": [identity(G131, path) for path in G131_OUTPUT_PATHS],
            },
            "a1310": {
                "commit": PREDECESSOR,
                "tree": commit_tree(PREDECESSOR),
                "records": [identity(PREDECESSOR, path) for path in A131_PATHS],
            },
            "procedure206": {
                "commit": PROCEDURE,
                "tree": commit_tree(PROCEDURE),
                "projections": projections,
            },
            "acceptedV130": {
                "commit": ACCEPTED,
                "tree": commit_tree(ACCEPTED),
                "identity": "evaluation-contract-v1.3.0",
                "members": [identity(ACCEPTED, path) for path in ACCEPTED_PATHS],
            },
        },
        "protectedBaseline": {
            "files": [
                {"path": path, "byteLength": length, "sha256": digest}
                for path, (length, digest) in PROTECTED_FILES.items()
            ],
            "submodules": [
                {"path": path, "commit": value["commit"], "statusShort": list(value["status"])}
                for path, value in SUBMODULES.items()
            ],
            "untrackedCs5Decision": {
                "path": CS5_DECISION,
                "byteLength": CS5_LENGTH,
                "sha256": CS5_SHA256,
            },
        },
        "semanticAuthorityRules": {
            "mutableWorktreeProcedureBytesAuthorized": False,
            "gitObjectOnly": True,
            "stopRatherThanInventAuthority": True,
            "contractIdentity": "evaluation-contract-v1.3.1",
        },
    }


def expected_topology_record() -> dict[str, Any]:
    return {
        "recordKind": "g132-topology-and-path-ownership",
        "schemaVersion": 1,
        "date": DATE,
        "authority": authority(False),
        "campaign": {
            "taskId": G_SLUG[6:],
            "parent": PARENT.rsplit("/", 1)[1],
            "status": "in_progress",
            "childrenInOrder": [A_SLUG, B_SLUG, O_SLUG],
        },
        "children": [
            {
                "taskId": A_SLUG[6:],
                "parent": G_SLUG,
                "status": "planning",
                "assignee": None,
                "active": False,
                "role": "contract-author-unassigned",
            },
            {
                "taskId": B_SLUG[6:],
                "parent": G_SLUG,
                "status": "planning",
                "assignee": None,
                "active": False,
                "role": "independent-machine-reviewer-unassigned",
            },
            {
                "taskId": O_SLUG[6:],
                "parent": G_SLUG,
                "status": "planning",
                "assignee": None,
                "active": False,
                "role": "operator-unassigned",
            },
        ],
        "g132ApprovedPathCount": 36,
        "g132ApprovedPaths": list(G132_PATHS),
        "ownership": {
            "campaignGovernance": f"{G}/**",
            "author": f"{A}/**",
            "assurance": f"{B}/**",
            "decision": f"{O}/**",
            "canonicalParentOverlayOnly": [
                f"{PARENT}/task.json",
                f"{PARENT}/prd.md",
                f"{PARENT}/design.md",
                f"{PARENT}/implement.md",
                f"{PARENT}/research/path-ownership-map.md",
            ],
            "oldRoutesImmutable": [f"{root}/**" for root in OLD_ROOTS],
            "disjoint": True,
        },
        "reciprocalTopologyRequired": True,
        "stopRules": [
            "unknown-output",
            "ownership-overlap",
            "child-active-or-assigned",
            "non-reciprocal-parent-child-link",
            "old-route-drift",
            "path-outside-exact-g132-set",
        ],
    }


def expected_supersession() -> dict[str, Any]:
    g131_allowlist = parse_json_bytes(git_bytes(G131, G131_ALLOWLIST_PATH), "G131 allowlist")
    g131_containment = parse_json_bytes(git_bytes(G131, G131_CONTAINMENT_PATH), "G131 containment")
    preserved_fields = (
        "findingIds",
        "populationCounts",
        "mappingArtifactFamilyCodomain",
        "directRegionHistoricalReferenceRule",
        "directRegionImmutableReferenceGuards",
        "propagationRules",
        "diffRowSchema",
        "executableProfiles",
        "fixtureAuthority",
        "noFifthChangeRule",
    )
    superseded_pointers = [
        "/directCorrectionRegions/3/requiredClosure/1",
        "/directCorrectionRegions/3/requiredClosure/3",
        "/mappingArtifactFamilyCodomainSource/perRowAssignmentOwnedBy",
        "/mappingDomainRule",
        "/assuranceCorpusRequirements/5",
        *[f"/mappingDomainIdentities/{index}/artifactFamilyBinding" for index in range(17)],
    ]
    closure_path = (
        "packages/cli/src/templates/research/procedures/experiment-campaign-v1/2.0.6/"
        "methodology/closure/research-experiment.json"
    )
    return {
        "recordKind": "g132-g131-finding-004-supersession",
        "schemaVersion": 1,
        "date": DATE,
        "authority": authority(False),
        "contractIdentity": "evaluation-contract-v1.3.1",
        "g131Authority": {
            **identity(G131, G131_ALLOWLIST_PATH),
            "commit": G131,
            "tree": commit_tree(G131),
        },
        "scope": {
            "preservedFindingIds": [
                "CS6-1-CONTRACT-001",
                "CS6-1-CONTRACT-002",
                "CS6-1-CONTRACT-003",
            ],
            "supersededFindingId": "CS6-1-CONTRACT-004",
            "supersededAssumption": (
                "Every one of the 17 Procedure/capability rows requires one non-null "
                "artifact-family assignment chosen during A131-1."
            ),
            "supersededExactJsonPointers": superseded_pointers,
            "allOtherG131ValuesRemainControlling": True,
        },
        "preservedG131ValueDigests": [
            {"jsonPointer": f"/{key}", "valueDigest": value_digest(g131_allowlist[key])}
            for key in preserved_fields
        ],
        "replacementRowSchema": {
            "type": "object",
            "additionalProperties": False,
            "required": [
                "procedureId",
                "procedureVersion",
                "capabilityId",
                "disposition",
                "artifactFamily",
            ],
            "properties": {
                "procedureId": {"type": "string", "minLength": 1},
                "procedureVersion": {"const": "2.0.7"},
                "capabilityId": {"type": "string", "minLength": 1},
                "disposition": {"enum": ["applicable", "notApplicable"]},
                "artifactFamily": {"type": ["string", "null"]},
            },
            "oneOf": [
                {
                    "properties": {
                        "disposition": {"const": "applicable"},
                        "artifactFamily": {"enum": list(CODOMAIN)},
                    },
                    "required": ["disposition", "artifactFamily"],
                },
                {
                    "properties": {
                        "disposition": {"const": "notApplicable"},
                        "artifactFamily": {"type": "null"},
                    },
                    "required": ["disposition", "artifactFamily"],
                },
            ],
        },
        "mappingArtifactFamilyCodomain": list(CODOMAIN),
        "mappingRows": list(MAPPING_ROWS),
        "applicabilityEquation": {
            "expression": (
                'mappingRow.disposition == "applicable" AND '
                "binding.targetArtifactFamily == mappingRow.artifactFamily"
            ),
            "operands": [
                "mappingRow.disposition",
                "binding.targetArtifactFamily",
                "mappingRow.artifactFamily",
            ],
            "nullNeverEntersCodomain": True,
        },
        "projectionEvidence": expected_projection_evidence(),
        "populationCounts": POPULATIONS,
        "completeLifecycleMatrix": {
            "mappingRows": 17,
            "lifecycleBindingsPerRow": 845,
            "totalDecisions": 14365,
            "positiveDecisions": 975,
            "negativeDecisions": 13390,
            "notApplicableRows": 4,
            "notApplicablePositiveDecisions": 0,
        },
        "experimentFamilySeparation": {
            "procedureId": "experiment-campaign-v1",
            "lifecycleArtifactFamily": "research-experiment-campaign",
            "lifecyclePositiveDecisions": 195,
            "closureFamily": "research-experiment",
            "closureEvidence": {**identity(PROCEDURE, closure_path), "commit": PROCEDURE},
            "inferenceOrSubstitutionAllowed": False,
        },
        "continuity": {
            "g131DigestFramingValueDigest": value_digest(g131_containment["digestFraming"]),
            "g131DigestFraming": g131_containment["digestFraming"],
            "finding004PreservedObligations": [
                "17-total-unique-exact-procedure-capability-rows",
                "authority-snapshot-lookup-facts",
                "unknown-missing-duplicate-aliased-conflicting-fail-closed",
            ],
            "replacementObligations": [
                "exact-disposition-aware-row-with-conditional-nullability",
                "fixed-g132-mapping-no-author-choice",
                "14365-complete-lifecycle-decisions",
                "not-applicable-zero-positive-decisions",
                "lifecycle-closure-family-separation",
            ],
            "noFifthChangeRule": g131_allowlist["noFifthChangeRule"],
        },
    }


def expected_inventory_record() -> dict[str, Any]:
    return {
        "recordKind": "g132-output-inventories",
        "schemaVersion": 1,
        "date": DATE,
        "authority": authority(False),
        "inventories": {
            key: {"count": len(paths), "paths": list(paths)}
            for key, paths in EXPECTED_INVENTORIES.items()
        },
        "candidateManifestRule": {
            "memberCount": 7,
            "membersOnly": list(CANDIDATE_NAMES),
            "contractIdentity": "evaluation-contract-v1.3.1",
        },
        "unknownOutputDisposition": "stop",
        "oldRouteNewFileAllowance": 0,
    }


def expected_containment_record() -> dict[str, Any]:
    g131 = parse_json_bytes(git_bytes(G131, G131_CONTAINMENT_PATH), "G131 containment")
    return {
        "recordKind": "g132-authority-and-containment",
        "schemaVersion": 1,
        "date": DATE,
        "authority": authority(True),
        "commonAuthoritySchema": {
            "allFalseFields": list(DENIAL_FIELDS),
            "taskExecutionAuthorizedRule": (
                "True only for the exact currently authorized G132 control record; task metadata "
                "and every later boundary remain false until separate instruction and committed predecessor."
            ),
        },
        "boundaryAuthorizations": {
            "A132-0": False,
            "A132-1": False,
            "B132-0": False,
            "B132-1": False,
            "O132-0": False,
            "O132-1": False,
        },
        "roleSeparation": {
            "governance": (
                "Pins immutable evidence, narrow supersession, topology, inventories, containment, "
                "and validation only."
            ),
            "author": (
                "Future A132 author encodes the fixed G132 mapping and candidate evidence only."
            ),
            "assurance": (
                "Future fresh reviewer reads one exact immutable A132-1 subject and performs no repair."
            ),
            "operator": "Future genuine operator records one separately instructed decision only.",
        },
        "reviewerIsolation": g131["reviewerIsolation"],
        "decisionEligibility": {
            "prerequisite": (
                "Any authenticated committed B132-1 pass or fail may reach O132-0 after a new operator instruction."
            ),
            "pass": ["accept-with-rationale", "reject-with-rationale", "stop"],
            "fail": ["reject-with-rationale", "stop"],
            "missing-or-mismatched": [],
        },
        "operatorContract": g131["operatorContract"],
        "digestFraming": g131["digestFraming"],
        "retryRules": {
            "beforeCommit": (
                "Only exact new attempt task-local files may be corrected or individually removed; "
                "no broad clean/reset/stash."
            ),
            "afterCommit": "Immutable; create a new additive attempt/task/commit.",
            "failedAssurance": (
                "May proceed only to reject/stop or a separately authorized additive attempt; "
                "never repair A132-1."
            ),
        },
        "workers": {"authority": "Proposal-only", "liveProcedureVersion": "1.0.0"},
        "oldRouteContainment": {
            "g131A131B131O131ByteImmutable": True,
            "newFilesUnderOldRoutesAllowed": False,
            "routeResumeRenameOrRebindAllowed": False,
        },
        "terminalBoundary": (
            "STOP after O132-1. Acceptance authorizes semantic-contract authority only for a "
            "separately governed future technical campaign."
        ),
    }


def validate_governance_records(source: Source) -> None:
    checks = (
        (f"{G}/research/g132-governance-baseline-attestation.json", expected_baseline()),
        (f"{G}/research/g132-topology-and-path-ownership.json", expected_topology_record()),
        (f"{G}/research/g132-g131-finding-004-supersession.json", expected_supersession()),
        (f"{G}/research/g132-output-inventories.json", expected_inventory_record()),
        (f"{G}/research/g132-authority-and-containment.json", expected_containment_record()),
    )
    for path, expected in checks:
        actual = source.json(path)
        if actual != expected:
            fail(f"governance record content or key-set mismatch: {path}")


def validate_immutable_semantics() -> dict[str, Any]:
    for commit in (A11, G131, PREDECESSOR, PROCEDURE, ACCEPTED):
        if git("rev-parse", f"{commit}^{{commit}}").strip() != commit:
            fail(f"immutable commit cannot be resolved: {commit}")

    a11_disposition = parse_json_bytes(git_bytes(A11, A11_PATHS[0]), "A11 disposition")
    if a11_disposition.get("disposition") != "contract-defect":
        fail("A11 disposition is not contract-defect")
    if a11_disposition.get("findingIds") != [f"CS6-1-CONTRACT-00{i}" for i in range(1, 5)]:
        fail("A11 finding identity mismatch")

    g131_allowlist = parse_json_bytes(git_bytes(G131, G131_ALLOWLIST_PATH), "G131 allowlist")
    g131_evidence = parse_json_bytes(git_bytes(G131, G131_EVIDENCE_PATH), "G131 evidence")
    if g131_allowlist.get("findingIds") != [f"CS6-1-CONTRACT-00{i}" for i in range(1, 5)]:
        fail("G131 finding allowlist mismatch")
    if g131_allowlist.get("populationCounts") != POPULATIONS:
        fail("G131 frozen populations mismatch")
    if g131_allowlist.get("mappingArtifactFamilyCodomain") != list(CODOMAIN):
        fail("G131 11-family codomain mismatch")
    if sum(len(item["pointerPaths"]) for item in g131_allowlist["directRegionImmutableReferenceGuards"]) != 71:
        fail("G131 direct-region DEC guard count is not 71")
    classifier = g131_evidence.get("classifierSpecification", {})
    if classifier.get("directImmutableHistoricalReferenceGuardCount") != 71:
        fail("G131 validation evidence does not authenticate 71 historical guards")
    if classifier.get("directPublicEvidenceReferenceGuardCount") != 0:
        fail("G131 direct-region EV/SRC guard population must remain zero")
    if g131_allowlist.get("noFifthChangeRule") != (
        "Any changed JSON pointer unmatched by one direct correction region or one propagation rule "
        "is an unauthorized fifth semantic change and STOP."
    ):
        fail("G131 no-fifth-change rule mismatch")

    durable = parse_json_bytes(git_bytes(ACCEPTED, ACCEPTED_PATHS[0]), "accepted durable outputs")
    lifecycle = parse_json_bytes(git_bytes(ACCEPTED, ACCEPTED_PATHS[1]), "accepted lifecycle")
    registry = parse_json_bytes(git_bytes(ACCEPTED, ACCEPTED_PATHS[2]), "accepted registry")
    bindings = parse_json_bytes(git_bytes(ACCEPTED, ACCEPTED_PATHS[3]), "accepted bindings")
    differential = parse_json_bytes(git_bytes(ACCEPTED, ACCEPTED_PATHS[4]), "accepted differential")
    provenance = parse_json_bytes(git_bytes(ACCEPTED, ACCEPTED_PATHS[5]), "accepted provenance")
    closure = parse_json_bytes(git_bytes(ACCEPTED, ACCEPTED_PATHS[6]), "accepted closure")

    artifacts = lifecycle.get("artifacts")
    if not isinstance(artifacts, list) or len(artifacts) != 65:
        fail("immutable lifecycle artifact count mismatch")
    family_counts = Counter(artifact["family"]["value"] for artifact in artifacts)
    if dict(family_counts) != FAMILY_ARTIFACT_COUNTS:
        fail("immutable lifecycle family/artifact distribution mismatch")
    if lifecycle.get("dimensionOrder") is None or len(lifecycle["dimensionOrder"]) != 13:
        fail("immutable lifecycle dimension count mismatch")
    for artifact in artifacts:
        if set(artifact["dimensions"]) != set(lifecycle["dimensionOrder"]):
            fail(f"artifact dimension domain mismatch: {artifact['artifactId']}")

    if len(durable.get("outputs", [])) != 64:
        fail("immutable durable-output count mismatch")
    if len(registry.get("validators", [])) != 20:
        fail("immutable validator count mismatch")
    if len(bindings.get("bindings", [])) != 876:
        fail("immutable total binding count mismatch")
    if len(differential.get("v13DeltaCases", [])) != 116:
        fail("immutable differential case count mismatch")
    if len(provenance.get("rows", [])) != 3343:
        fail("immutable provenance row count mismatch")
    if len(closure.get("families", [])) != 4 or len(closure.get("applicableFamilies", [])) != 4:
        fail("immutable closure family count mismatch")

    artifact_family_by_id = {artifact["artifactId"]: artifact["family"]["value"] for artifact in artifacts}
    lifecycle_bindings = [
        binding for binding in bindings["bindings"] if binding.get("targetId") in artifact_family_by_id
    ]
    closure_bindings = [
        binding for binding in bindings["bindings"] if binding.get("ruleId", "").startswith("closure:")
    ]
    global_bindings = [
        binding for binding in bindings["bindings"] if binding.get("ruleId", "").startswith("global:")
    ]
    if (len(lifecycle_bindings), len(closure_bindings), len(global_bindings)) != (845, 20, 11):
        fail("immutable lifecycle/closure/global binding partition mismatch")
    lifecycle_family_counts = Counter(
        artifact_family_by_id[binding["targetId"]] for binding in lifecycle_bindings
    )
    if lifecycle_family_counts != Counter({key: value * 13 for key, value in FAMILY_ARTIFACT_COUNTS.items()}):
        fail("lifecycle binding family distribution mismatch")

    projections = expected_projection_evidence()
    applicable = [item for item in projections if item["dispositionEvidence"] == "applicable"]
    not_applicable = [item for item in projections if item["dispositionEvidence"] == "notApplicable"]
    if len(applicable) != 13 or len(not_applicable) != 4:
        fail("Procedure projection partition is not 13 applicable / 4 not-applicable")
    for item in applicable:
        if item["family"] is None or item["rowCount"] <= 0 or item["rowFamilies"] != [item["family"]]:
            fail(f"non-null/non-empty projection invariant failed: {item['procedureId']}")
    for item in not_applicable:
        if item["family"] is not None or item["rowCount"] != 0 or item["rowFamilies"] != []:
            fail(f"null/empty projection invariant failed: {item['procedureId']}")

    if len(MAPPING_ROWS) != 17 or len({(row["procedureId"], row["capabilityId"]) for row in MAPPING_ROWS}) != 17:
        fail("mapping row identity domain is not 17 unique tuples")
    positive = 0
    not_applicable_positive = 0
    row_positive_counts: dict[str, int] = {}
    for row in MAPPING_ROWS:
        if set(row) != {"procedureId", "procedureVersion", "capabilityId", "disposition", "artifactFamily"}:
            fail("mapping row key set mismatch")
        if row["procedureVersion"] != "2.0.7":
            fail("mapping row Procedure version mismatch")
        if row["disposition"] == "applicable":
            if row["artifactFamily"] not in CODOMAIN:
                fail(f"applicable row family is outside codomain: {row['procedureId']}")
            count = lifecycle_family_counts[row["artifactFamily"]]
        elif row["disposition"] == "notApplicable":
            if row["artifactFamily"] is not None:
                fail(f"not-applicable row must use null: {row['procedureId']}")
            count = 0
            not_applicable_positive += count
        else:
            fail(f"unknown mapping disposition: {row['procedureId']}")
        row_positive_counts[row["procedureId"]] = count
        positive += count
    total = len(MAPPING_ROWS) * len(lifecycle_bindings)
    negative = total - positive
    if (total, positive, negative, not_applicable_positive) != (14365, 975, 13390, 0):
        fail("complete 17 × 845 lifecycle matrix counts mismatch")
    if row_positive_counts["experiment-campaign-v1"] != 195:
        fail("experiment-campaign lifecycle positive count must be 195")

    closure_path = (
        "packages/cli/src/templates/research/procedures/experiment-campaign-v1/2.0.6/"
        "methodology/closure/research-experiment.json"
    )
    closure_projection = parse_json_bytes(git_bytes(PROCEDURE, closure_path), "experiment closure")
    experiment_projection = next(item for item in projections if item["procedureId"] == "experiment-campaign-v1")
    if experiment_projection["family"] != "research-experiment-campaign":
        fail("experiment-campaign lifecycle family mismatch")
    if closure_projection.get("family") != "research-experiment":
        fail("experiment-campaign closure family mismatch")
    if experiment_projection["family"] == closure_projection["family"]:
        fail("experiment lifecycle and closure families must remain independent")

    return {
        "applicableProjectionCount": len(applicable),
        "notApplicableProjectionCount": len(not_applicable),
        "lifecycleMatrix": {
            "totalDecisions": total,
            "positiveDecisions": positive,
            "negativeDecisions": negative,
            "notApplicablePositiveDecisions": not_applicable_positive,
            "experimentCampaignPositiveDecisions": row_positive_counts["experiment-campaign-v1"],
        },
    }


def validate_protected_baseline(source: Source) -> dict[str, Any]:
    if source.committed:
        return {
            "submodules": [
                {"path": path, "commit": value["commit"], "statusShort": list(value["status"])}
                for path, value in SUBMODULES.items()
            ]
        }
    for path, (length, digest) in PROTECTED_FILES.items():
        data = (REPO_ROOT / path).read_bytes()
        if len(data) != length or sha256_bytes(data) != digest:
            fail(f"protected file identity mismatch: {path}")
    submodule_evidence: list[dict[str, Any]] = []
    for path, expected in SUBMODULES.items():
        root = REPO_ROOT / path
        commit = git("rev-parse", "HEAD", cwd=root).strip()
        status = tuple(git("status", "--short", "--untracked-files=all", cwd=root).splitlines())
        if commit != expected["commit"] or status != expected["status"]:
            fail(f"protected submodule state mismatch: {path}")
        submodule_evidence.append({"path": path, "commit": commit, "statusShort": list(status)})
    cs5 = REPO_ROOT / CS5_DECISION
    if not cs5.is_file():
        fail("protected untracked CS5 decision is missing")
    data = cs5.read_bytes()
    if len(data) != CS5_LENGTH or sha256_bytes(data) != CS5_SHA256:
        fail("protected untracked CS5 decision identity mismatch")
    parse_json_bytes(data, CS5_DECISION)
    return {"submodules": submodule_evidence}


def validate_task_packages(
    source: Source,
    allow_missing_evidence: bool,
) -> list[dict[str, Any]]:
    results = [
        {"exitCode": 0, "path": root, "status": "pass"}
        for root in (G, A, B, O)
    ]
    if source.committed or allow_missing_evidence:
        return results
    for root in (G, A, B, O):
        result = run([sys.executable, "./.trellis/scripts/task.py", "validate", root])
        if result.returncode != 0:
            fail(f"task validation failed for {root}: {result.stdout.strip()} {result.stderr.strip()}")
    return results


def validate_diff_check(source: Source, allow_missing_evidence: bool) -> dict[str, Any]:
    if source.subject is None:
        result = run(["git", "diff", "--check", "--", *G132_PATHS])
        if result.returncode != 0:
            fail(f"G132 path-scoped diff check failed: {result.stdout.strip()} {result.stderr.strip()}")
        for path in G132_PATHS:
            if allow_missing_evidence and path == EVIDENCE_PATH:
                continue
            tracked = run(["git", "ls-files", "--error-unmatch", "--", path])
            if tracked.returncode == 0:
                continue
            untracked = run(["git", "diff", "--no-index", "--check", "--", "/dev/null", path])
            if untracked.returncode not in (0, 1) or untracked.stdout or untracked.stderr:
                fail(
                    "G132 untracked path diff check failed: "
                    f"{path}: {untracked.stdout.strip()} {untracked.stderr.strip()}"
                )
    else:
        result = run(["git", "diff", "--check", PREDECESSOR, source.subject, "--", *G132_PATHS])
        if result.returncode != 0:
            fail(f"G132 path-scoped diff check failed: {result.stdout.strip()} {result.stderr.strip()}")
    return {"exitCode": 0, "pathCount": 36, "status": "pass"}


def build_evidence(
    semantic: dict[str, Any], protected: dict[str, Any], task_results: list[dict[str, Any]]
) -> dict[str, Any]:
    return {
        "recordKind": "g132-validation-evidence",
        "schemaVersion": 1,
        "date": DATE,
        "approvedPathCount": 36,
        "approvedPaths": list(G132_PATHS),
        "authority": authority(False),
        "immutablePins": {
            "a11": {"commit": A11, "tree": commit_tree(A11)},
            "g131": {"commit": G131, "tree": commit_tree(G131)},
            "a131Predecessor": {"commit": PREDECESSOR, "tree": commit_tree(PREDECESSOR)},
            "procedure206": {"commit": PROCEDURE, "tree": commit_tree(PROCEDURE)},
        },
        "checks": [
            {"checkId": "strict-json-jsonl-utf8-canonical-and-final-lf", "status": "pass"},
            {"checkId": "exact-36-plus-five-inherited-dirty-set-and-empty-stage", "status": "pass"},
            {"checkId": "old-g131-a131-b131-o131-roots-zero-diff", "status": "pass"},
            {"checkId": "append-only-canonical-parent-overlays", "status": "pass"},
            {"checkId": "reciprocal-topology-status-assignee-inactivity", "status": "pass"},
            {"checkId": "exact-boundary-output-inventories", "status": "pass"},
            {"checkId": "immutable-git-object-identities-and-projection-partition", "status": "pass"},
            {"checkId": "narrow-g131-finding-004-supersession-and-continuity", "status": "pass"},
            {"checkId": "conditional-nullability-and-exact-17-row-mapping", "status": "pass"},
            {"checkId": "complete-14365-decision-lifecycle-matrix", "status": "pass"},
            {"checkId": "experiment-lifecycle-closure-family-separation", "status": "pass"},
            {"checkId": "authority-containment-and-live-v1", "status": "pass"},
            {"checkId": "protected-inherited-state", "status": "pass"},
            {"checkId": "precommit-and-explicit-committed-tree-mode-contracts", "status": "pass"},
        ],
        "inventories": EXPECTED_COUNTS,
        "projectionPartition": {
            "applicable": semantic["applicableProjectionCount"],
            "notApplicable": semantic["notApplicableProjectionCount"],
        },
        "lifecycleMatrix": semantic["lifecycleMatrix"],
        "taskValidators": task_results,
        "pathScopedDiffCheck": {"exitCode": 0, "pathCount": 36, "status": "pass"},
        "protected": protected,
        "precommitPredecessor": PREDECESSOR,
        "committedTreeMode": {
            "explicitSubjectRequired": True,
            "firstParentRequired": PREDECESSOR,
            "futureHeadPinnedToPredecessor": False,
        },
        "noCommitPerformed": True,
        "a132ExecutionAuthorized": False,
        "writeScope": EVIDENCE_PATH,
        "verdict": "pass",
    }


def validate_all(source: Source, allow_missing_evidence: bool) -> tuple[dict[str, Any], bytes]:
    for path in G132_PATHS:
        validate_file_syntax(source, path, allow_missing_evidence)
    validate_mode_and_scope(source, allow_missing_evidence)
    validate_parent_overlays(source)
    validate_topology(source)
    validate_governance_records(source)
    semantic = validate_immutable_semantics()
    protected = validate_protected_baseline(source)
    task_results = validate_task_packages(source, allow_missing_evidence)
    diff_result = validate_diff_check(source, allow_missing_evidence)
    if diff_result != {"exitCode": 0, "pathCount": 36, "status": "pass"}:
        fail("internal diff result mismatch")
    evidence = build_evidence(semantic, protected, task_results)
    return evidence, canonical_json_bytes(evidence)


def write_mode() -> None:
    source = Source(None)
    path = REPO_ROOT / EVIDENCE_PATH
    evidence_missing = not path.exists()
    evidence, expected_bytes = validate_all(
        source,
        allow_missing_evidence=evidence_missing,
    )
    if not evidence_missing:
        if path.read_bytes() != expected_bytes:
            fail("existing validation evidence is not byte-identical to deterministic recomputation")
        print("G132 validation write: pass")
        return

    path.write_bytes(expected_bytes)
    try:
        verified_evidence, verified_bytes = validate_all(source, allow_missing_evidence=False)
        actual_bytes = path.read_bytes()
        if actual_bytes != verified_bytes or verified_evidence != evidence:
            fail("written evidence differs from deterministic recomputation")
    except (OSError, ValidationError):
        path.unlink(missing_ok=True)
        raise
    print("G132 validation write: pass")


def verify_mode(subject: str | None) -> None:
    source = Source(subject)
    evidence, expected_bytes = validate_all(source, allow_missing_evidence=False)
    actual_bytes = source.bytes(EVIDENCE_PATH)
    if actual_bytes != expected_bytes:
        fail("validation evidence is not byte-identical to deterministic recomputation")
    actual = parse_json_bytes(actual_bytes, EVIDENCE_PATH)
    if actual != evidence:
        fail("validation evidence content mismatch")
    print("G132 validation verify: pass")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--write", action="store_true", help="Validate precommit state and write only G132 evidence")
    mode.add_argument("--verify", action="store_true", help="Read-only deterministic verification")
    parser.add_argument(
        "--subject",
        help="Explicit full commit OID for committed-tree verification; valid only with --verify",
    )
    args = parser.parse_args()
    if args.write and args.subject:
        parser.error("--subject is valid only with --verify")
    try:
        if args.write:
            write_mode()
        else:
            verify_mode(args.subject)
    except ValidationError as exc:
        print(f"G132 validation failed: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
