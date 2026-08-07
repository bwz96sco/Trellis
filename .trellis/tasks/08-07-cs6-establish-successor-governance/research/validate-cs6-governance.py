#!/usr/bin/env python3
"""Validate CS6 governance topology, manifests, authority, and protected baselines."""

from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path
from typing import Any

REPO = Path(__file__).resolve().parents[4]
TASKS = REPO / ".trellis" / "tasks"
CANONICAL = TASKS / "07-29-migrate-research-methodology-to-procedures"
CAMPAIGN = "08-07-cs6-complete-system-forward-correction"
CHILDREN = [
    "08-07-cs6-establish-successor-governance",
    "08-07-cs6-audit-accepted-v13-semantic-leaves",
    "08-07-cs6-correct-core-methodology-runtime",
    "08-07-cs6-correct-cli-recording-auth-replay-recovery",
    "08-07-cs6-procedure-2-0-7-family-packages",
    "08-07-cs6-production-mutation-coverage-harness",
    "08-07-cs6-integrate-install-test-freeze-attempt-11",
    "08-07-cs6-assure-complete-system-mal1-attempt-11",
    "08-07-cs6-decide-complete-system-attempt-11",
]
PLANNING_FILES = {
    "task.json",
    "prd.md",
    "design.md",
    "implement.md",
    "implement.jsonl",
    "check.jsonl",
}
GOVERNANCE_EVIDENCE = {
    "cs6-0-baseline-containment-attestation.json",
    "cs6-0-forward-governance-record.json",
    "cs6-0-spec-update-decision.json",
    "cs6-path-ownership-map.md",
    "validate-cs6-governance.py",
}
CANONICAL_OVERLAYS = {
    ".trellis/tasks/07-29-migrate-research-methodology-to-procedures/prd.md",
    ".trellis/tasks/07-29-migrate-research-methodology-to-procedures/design.md",
    ".trellis/tasks/07-29-migrate-research-methodology-to-procedures/implement.md",
    ".trellis/tasks/07-29-migrate-research-methodology-to-procedures/task.json",
    ".trellis/tasks/07-29-migrate-research-methodology-to-procedures/research/path-ownership-map.md",
}
INHERITED_DIRTY_PATHS = {
    "AGENTS.md",
    "CLAUDE.md",
    "docs-site",
    "marketplace",
    ".trellis/tasks/08-06-cs5-decide-complete-system-attempt-10/research/cs5-8-honest-stop-record.json",
}
FALSE_FLAGS = [
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
EXPECTED_DEPENDENCIES = {
    CHILDREN[0]: [
        "explicit CS6-0 implementation authorization",
        "baseline f5249e7544aaa76b66b859433654e3a7d0f77d9e",
    ],
    CHILDREN[1]: [
        "CS6-0 committed governance",
        "separate task activation",
        "recorded auditor independence",
    ],
    CHILDREN[2]: [
        "CS6-0 committed governance",
        "CS6-1 committed leaves-sound disposition",
        "separate task activation",
        "per-symbol GitNexus impact",
    ],
    CHILDREN[3]: [
        "CS6-0 committed governance",
        "CS6-1 committed leaves-sound disposition",
        "CS6-2 accepted runtime interface",
        "separate task activation",
        "per-symbol GitNexus impact",
    ],
    CHILDREN[4]: [
        "CS6-0 committed governance",
        "CS6-1 committed leaves-sound disposition",
        "CS6-2 accepted runtime interface",
        "CS6-3 accepted CLI interface",
        "separate task activation",
    ],
    CHILDREN[5]: [
        "CS6-0 committed governance",
        "CS6-1 committed leaves-sound disposition",
        "CS6-2 through CS6-4 accepted commits",
        "separate task activation",
    ],
    CHILDREN[6]: [
        "CS6-0 committed governance",
        "CS6-1 through CS6-5 accepted commits",
        "separate task activation",
    ],
    CHILDREN[7]: [
        "CS6-0 committed governance",
        "exact committed S11",
        "committed fresh reviewer assignment M0",
        "separate task activation and run authorization",
    ],
    CHILDREN[8]: [
        "CS6-0 committed governance",
        "committed exact M11",
        "explicit operator decision",
        "separate task activation and commit authorization",
    ],
}
BASELINE_COMMIT = "f5249e7544aaa76b66b859433654e3a7d0f77d9e"
S10_COMMIT = "916be0a877725f7f91836a3a97e480c1e104e533"
S10_TREE_DIGEST = "99b3b275699725f2c60c325b2d9d9aa477beb585d3be26986fe03e2ebc890863"
M10_COMMIT = "c951a2f82fa9c649ceb4a290e6896bd084ad70bd"
ACCEPTED_CONTRACT = "evaluation-contract-v1.3.0"
ACCEPTED_SEMANTIC_DIGEST = "sha256:dde907ba15d9ce22117b95db2fd9e0a108d4869873801f8c7f93b528f808699f"
ACCEPTED_MEMBER_AGGREGATE = "sha256:83fdc8c292922173e4a67fa57deb65ff302ec107c202e3b793f7b4a93b23c7ef"
FROZEN_SECTION_DIGESTS = {
    "dependencies": "989e2ee898e102764671695c9ed11ea62708b1c13398a0053ba568c5df522f31",
    "ownership": "435d7868fb96247fedc82ec9d9744a19dca6d8191acbe77677acb4e969f7cb62",
    "commitBoundaries": "5552492d04c145f6ba17005ae2bb21bc8aee6f64c39ceb9c69fd2568a48e4d5b",
    "ownerRoles": "b30bef7c4b02a9ea3f15d59a705c943970c15500b0616e8409814e5d0826c8b4",
}
OWNERSHIP_MAP_SHA256 = "34101429cbc5843b038eb03468d747b38cdbd0c7f2f15212242ae99581f8e345"


def run(args: list[str], cwd: Path = REPO, check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        args,
        cwd=cwd,
        check=check,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )


def git(args: list[str], cwd: Path = REPO, check: bool = True) -> subprocess.CompletedProcess[str]:
    return run(["git", "-c", "i18n.logOutputEncoding=UTF-8", *args], cwd=cwd, check=check)


def reject_duplicate_keys(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    value: dict[str, Any] = {}
    for key, item in pairs:
        if key in value:
            raise ValueError(f"duplicate JSON key: {key}")
        value[key] = item
    return value


def parse_json(text: str) -> dict[str, Any]:
    value = json.loads(text, object_pairs_hook=reject_duplicate_keys)
    assert isinstance(value, dict), "expected a JSON object"
    return value


def load_json(path: Path) -> dict[str, Any]:
    return parse_json(path.read_text(encoding="utf-8", errors="strict"))


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def canonical_digest(value: Any) -> str:
    payload = json.dumps(value, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def diff_digest(pathspec: str) -> str:
    data = git(["diff", "--binary", "--", pathspec]).stdout.encode("utf-8")
    return hashlib.sha256(data).hexdigest()


def submodule_diff_digest(path: Path) -> str:
    data = git(["diff", "--binary"], cwd=path).stdout.encode("utf-8")
    return hashlib.sha256(data).hexdigest()


def procedure_inventory(version: str) -> tuple[int, str]:
    output = git(["ls-tree", "-r", "HEAD", "packages/cli/src/templates/research/procedures"]).stdout
    rows = [line for line in output.splitlines() if f"/{version}/" in line]
    payload = ("\n".join(rows) + "\n").encode("utf-8")
    return len(rows), hashlib.sha256(payload).hexdigest()


def check_manifest(path: Path) -> None:
    rows = [line for line in path.read_text(encoding="utf-8", errors="strict").splitlines() if line.strip()]
    assert len(rows) >= 3, f"manifest is not curated: {path}"
    referenced_files: set[str] = set()
    for line in rows:
        row = parse_json(line)
        assert "_example" not in row, f"seed row remains: {path}"
        assert set(row) == {"file", "reason"}, f"invalid manifest row: {path}"
        assert isinstance(row["file"], str) and row["file"], f"invalid file: {path}"
        assert isinstance(row["reason"], str) and len(row["reason"].strip()) >= 20, f"weak reason: {path}"
        assert row["file"] not in referenced_files, f"duplicate manifest input: {path}"
        referenced_files.add(row["file"])
        assert (REPO / row["file"]).is_file(), f"missing manifest input: {row['file']}"


def check_document(path: Path) -> None:
    text = path.read_text(encoding="utf-8", errors="strict")
    assert len(text.strip()) >= 300, f"incomplete planning document: {path}"
    assert text.startswith("# "), f"missing title: {path}"
    assert "_example" not in text and "TODO" not in text, f"seed marker remains: {path}"


def allowed_status_path(path: str) -> bool:
    if path in INHERITED_DIRTY_PATHS or path in CANONICAL_OVERLAYS:
        return True
    prefix = ".trellis/tasks/"
    if not path.startswith(prefix):
        return False
    relative = path[len(prefix) :]
    task_name, separator, child_path = relative.partition("/")
    if not separator or task_name not in {CAMPAIGN, *CHILDREN}:
        return False
    if "/" not in child_path and child_path in PLANNING_FILES:
        return True
    governance_prefix = f"{CHILDREN[0]}/research/"
    return relative.startswith(governance_prefix) and relative[len(governance_prefix) :] in GOVERNANCE_EVIDENCE


def main() -> int:
    assertions: list[str] = []
    parent = load_json(CANONICAL / "task.json")
    assert parent["children"].count(CAMPAIGN) == 1

    head_parent = parse_json(
        git(["show", f"HEAD:{CANONICAL.relative_to(REPO).as_posix()}/task.json"]).stdout
    )
    expected_parent = {**head_parent, "children": [*head_parent["children"], CAMPAIGN]}
    assert parent == expected_parent, "canonical parent task.json changed beyond one appended CS6 child"
    assertions.append("canonical-parent-links-campaign-once")

    campaign_dir = TASKS / CAMPAIGN
    campaign = load_json(campaign_dir / "task.json")
    assert campaign["parent"] == CANONICAL.name
    assert campaign["children"] == CHILDREN
    assert campaign["status"] == "planning"
    assert campaign["assignee"] is None
    campaign_meta = campaign["meta"]
    assert campaign_meta["baselineCommit"] == BASELINE_COMMIT
    assert campaign_meta["historicalSubject"] == S10_COMMIT
    assert campaign_meta["historicalEvidence"] == M10_COMMIT
    assert campaign_meta["historicalVerdict"] == "fail"
    assert campaign_meta["acceptedContract"] == ACCEPTED_CONTRACT
    assert campaign_meta["acceptedSemanticDigest"] == ACCEPTED_SEMANTIC_DIGEST
    assert campaign_meta["acceptedMemberAggregate"] == ACCEPTED_MEMBER_AGGREGATE
    assert campaign_meta["liveProcedure"] == "1.0.0"
    assert campaign_meta["correctionProcedure"] == "2.0.7"
    assertions.append("campaign-topology-and-identities-exact")

    required = ["prd.md", "design.md", "implement.md", "implement.jsonl", "check.jsonl", "task.json"]
    for name in [CAMPAIGN, *CHILDREN]:
        task_dir = TASKS / name
        for filename in required:
            assert (task_dir / filename).is_file(), f"missing {name}/{filename}"
        for filename in ["prd.md", "design.md", "implement.md"]:
            check_document(task_dir / filename)
        check_manifest(task_dir / "implement.jsonl")
        check_manifest(task_dir / "check.jsonl")
        task = load_json(task_dir / "task.json")
        if name in CHILDREN:
            assert task["parent"] == CAMPAIGN
            assert task["children"] == []
            assert task["meta"]["dependencies"] == EXPECTED_DEPENDENCIES[name]
        expected_status = "in_progress" if name == CHILDREN[0] else "planning"
        assert task["status"] == expected_status, f"unexpected status for {name}"
        if name != CHILDREN[0]:
            assert task["assignee"] is None, f"later task assigned: {name}"
        meta = task.get("meta", {})
        for flag in FALSE_FLAGS:
            assert meta.get(flag) is False, f"{name} {flag} is not false"
    assertions.append("planning-artifacts-manifests-dependencies-status-authority-valid")

    governance = load_json(
        TASKS
        / "08-07-cs6-establish-successor-governance"
        / "research"
        / "cs6-0-forward-governance-record.json"
    )
    assert governance["baselineCommit"] == BASELINE_COMMIT
    assert governance["predecessor"] == {
        "subjectS10": S10_COMMIT,
        "subjectTreeDigest": S10_TREE_DIGEST,
        "evidenceM10": M10_COMMIT,
        "verdict": "fail",
        "validAsHistoricalEvidence": True,
        "repairOrRelabelAuthorized": False,
    }
    assert governance["topology"]["orderedChildren"] == CHILDREN
    assert governance["semanticGate"]["acceptedContract"] == ACCEPTED_CONTRACT
    assert governance["semanticGate"]["acceptedSemanticDigest"] == ACCEPTED_SEMANTIC_DIGEST
    assert governance["semanticGate"]["acceptedMemberAggregate"] == ACCEPTED_MEMBER_AGGREGATE
    assert governance["versionRules"]["liveProcedure"] == "1.0.0"
    assert governance["versionRules"]["historicalImmutableProcedures"] == ["2.0.4", "2.0.5", "2.0.6"]
    assert governance["versionRules"]["correctionProcedureIfLeavesSound"] == "2.0.7"
    assert governance["versionRules"]["procedure207Dormant"] is True
    for section, expected_digest in FROZEN_SECTION_DIGESTS.items():
        assert canonical_digest(governance[section]) == expected_digest, f"frozen {section} changed"
    ownership_map = (
        TASKS
        / "08-07-cs6-establish-successor-governance"
        / "research"
        / "cs6-path-ownership-map.md"
    )
    assert sha256(ownership_map) == OWNERSHIP_MAP_SHA256, "exact path-ownership map changed"
    assert set(governance["ownership"]) == {f"CS6-{index}" for index in range(9)}
    seen_paths: dict[str, str] = {}
    for owner, paths in governance["ownership"].items():
        assert paths, f"owner has no paths: {owner}"
        for owned_path in paths:
            assert owned_path not in seen_paths, (
                f"ownership overlap: {owned_path} owned by {seen_paths.get(owned_path)} and {owner}"
            )
            seen_paths[owned_path] = owner
    assert len(governance["mal1Attempt11"]["exactOutputs"]) == 9
    assert len(set(governance["mal1Attempt11"]["exactOutputs"])) == 9
    for flag in FALSE_FLAGS:
        assert governance["authority"].get(flag) is False, f"governance {flag} is not false"
    assertions.append("governance-identities-ownership-and-assurance-allowlist-exact")

    attestation = load_json(
        TASKS
        / "08-06-cs5-assure-complete-system-mal1-attempt-10"
        / "research"
        / "exact-subject-attestation.json"
    )
    verdict = load_json(
        TASKS
        / "08-06-cs5-assure-complete-system-mal1-attempt-10"
        / "research"
        / "machine-verdict.json"
    )
    accepted = load_json(
        TASKS
        / "08-06-cs5-assure-complete-system-mal1-attempt-10"
        / "research"
        / "accepted-member-ledger.json"
    )
    candidate = load_json(
        TASKS
        / "08-04-author-evaluation-contract-v1-3-attempt-3"
        / "research"
        / "contract-candidate-manifest-v1.3.json"
    )
    assert attestation["subjectCommit"] == S10_COMMIT
    assert attestation["extractedTreeDigest"] == S10_TREE_DIGEST
    assert verdict["subjectCommit"] == S10_COMMIT
    assert verdict["subjectTreeDigest"] == S10_TREE_DIGEST
    assert verdict["verdict"] == "fail"
    assert accepted["subjectCommit"] == S10_COMMIT
    assert accepted["memberCount"] == 7
    assert accepted["aggregateSha256"] == ACCEPTED_MEMBER_AGGREGATE
    assert accepted["aggregateExpected"] == ACCEPTED_MEMBER_AGGREGATE
    assert accepted["aggregateMatches"] is True
    assert accepted["semanticDigestMatches"] is True
    assert accepted["packageCount"] == 17
    assert candidate["contractVersion"] == ACCEPTED_CONTRACT
    assert git(["rev-parse", "--verify", f"{S10_COMMIT}^{{commit}}"]).stdout.strip() == S10_COMMIT
    assert git(["rev-parse", "--verify", f"{M10_COMMIT}^{{commit}}"]).stdout.strip() == M10_COMMIT
    assertions.append("historical-and-accepted-input-identities-independent")

    baseline = load_json(
        TASKS
        / "08-07-cs6-establish-successor-governance"
        / "research"
        / "cs6-0-baseline-containment-attestation.json"
    )
    assert baseline["baselineCommit"] == BASELINE_COMMIT
    assert baseline["historicalAttempt10"]["subjectCommit"] == S10_COMMIT
    assert baseline["historicalAttempt10"]["subjectTreeDigest"] == S10_TREE_DIGEST
    assert baseline["historicalAttempt10"]["evidenceCommit"] == M10_COMMIT
    assert baseline["historicalAttempt10"]["verdict"] == "fail"
    assert baseline["acceptedContract"]["identity"] == ACCEPTED_CONTRACT
    assert baseline["acceptedContract"]["semanticDigest"] == ACCEPTED_SEMANTIC_DIGEST
    assert baseline["acceptedContract"]["memberAggregateSha256"] == ACCEPTED_MEMBER_AGGREGATE
    assert baseline["procedureContainment"]["liveSelection"] == "1.0.0"
    assert baseline["procedureContainment"]["correctionVersionIfLeavesSound"] == "2.0.7"
    assert git(["rev-parse", "HEAD"]).stdout.strip() == BASELINE_COMMIT
    assert sha256(REPO / "AGENTS.md") == baseline["protectedDirtyPaths"]["AGENTS.md"]["contentSha256"]
    assert sha256(REPO / "CLAUDE.md") == baseline["protectedDirtyPaths"]["CLAUDE.md"]["contentSha256"]
    assert diff_digest("AGENTS.md") == baseline["protectedDirtyPaths"]["AGENTS.md"]["gitDiffBinarySha256"]
    assert diff_digest("CLAUDE.md") == baseline["protectedDirtyPaths"]["CLAUDE.md"]["gitDiffBinarySha256"]
    for name in ["docs-site", "marketplace"]:
        path = REPO / name
        expected = baseline["protectedDirtyPaths"][name]
        assert git(["rev-parse", "HEAD"], cwd=path).stdout.strip() == expected["commit"]
        assert git(["status", "--short", "--untracked-files=all"], cwd=path).stdout.splitlines() == expected["statusLines"]
        assert submodule_diff_digest(path) == expected["gitDiffBinarySha256"]
    operator = baseline["protectedDirtyPaths"]["cs5OperatorState"]
    operator_path = REPO / operator["path"]
    assert sha256(operator_path) == operator["contentSha256"]
    assert git(["ls-files", "--error-unmatch", operator["path"]], check=False).returncode != 0
    assertions.append("protected-dirty-baseline-unchanged")

    for version, expected in baseline["procedureContainment"]["historicalBlobInventories"].items():
        count, digest = procedure_inventory(version)
        assert count == expected["blobCount"]
        assert digest == expected["lsTreeRowsSha256"]
    live_source = (REPO / "packages/core/src/research/stage-capabilities.ts").read_text(
        encoding="utf-8", errors="strict"
    )
    assert live_source.count('export const RESEARCH_PROCEDURE_CURRENT_VERSION = "1.0.0";') == 1
    assertions.append("historical-procedure-inventories-and-live-selection-unchanged")

    status_rows = [
        row for row in git(["status", "--porcelain=v1", "-z", "--untracked-files=all"]).stdout.split("\0") if row
    ]
    for row in status_rows:
        status, path = row[:2], row[3:]
        assert status[0] in {" ", "?"}, f"staged change is forbidden: {row}"
        assert allowed_status_path(path), f"unexpected working-tree path: {path}"
    assert not git(["diff", "--cached", "--name-only"]).stdout.strip(), "staging area is not empty"
    assertions.append("tracked-untracked-scope-and-empty-index-valid")

    markers = {
        "prd.md": "Additive overlay — CS6 successor governance",
        "design.md": "Additive overlay — CS6 successor design",
        "implement.md": "Additive overlay — CS6 successor execution",
        "research/path-ownership-map.md": "Additive amendment — CS6 successor ownership",
    }
    canonical_rel = CANONICAL.relative_to(REPO).as_posix()
    for rel, marker in markers.items():
        current = (CANONICAL / rel).read_text(encoding="utf-8", errors="strict")
        head = git(["show", f"HEAD:{canonical_rel}/{rel}"]).stdout
        assert current.startswith(head), f"historical parent content changed: {rel}"
        addition = current[len(head) :]
        assert addition.startswith("\n## "), f"parent overlay is not an EOF append: {rel}"
        assert addition.count(marker) == 1, f"missing or duplicate parent marker: {marker}"
        assert marker not in head, f"parent marker already existed at HEAD: {marker}"
    assertions.append("canonical-parent-overlays-append-only")

    result = {"verdict": "pass", "assertionCount": len(assertions), "assertions": assertions}
    print(json.dumps(result, sort_keys=True, separators=(",", ":")))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # fail closed with one deterministic diagnostic line
        print(json.dumps({"verdict": "fail", "error": str(exc)}, sort_keys=True), file=sys.stderr)
        raise
