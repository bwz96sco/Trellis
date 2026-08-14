#!/usr/bin/env python3
"""Deterministic, machine-only T6 MAL-1 reviewer for the frozen v1.3.1 subject."""

from __future__ import annotations

import argparse
import errno
import hashlib
import io
import json
import os
import re
import shlex
import shutil
import socket
import subprocess
import sys
import tarfile
import tempfile
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from typing import Any, Iterable

SCHEMA_VERSION = 1
S1_COMMIT = "e6b80d640f0bd264c1acfe6bab906cb3e4ae535a"
S1_TREE = "1304e0faa7262cd1c80cd3e8ab9b01057809f9e0"
INITIAL_M0_COMMIT = "87317a7b78d531df37c1f84970fef020a8e77ace"
PRIOR_M0_CORRECTION_COMMIT = "d5dd5b487669dbd343e3472500d940e8d2ded76b"
SUBJECT_COMMIT = "57572e77f81148bc6aae6d3b727db33a09e45f23"
SUBJECT_TREE = "8e2acbf86f6820b6f3557fa5d6b186226284351b"
A133_COMMIT = "5a038a87531c3dbfa7b52ba82eaa59d856ab1ea3"
ACCEPTED_SEMANTIC_DIGEST = "sha256:8e2cd20dd8e12caab318852f82a100116a28d405113f654efbda7b3646f666af"
ACCEPTED_MEMBER_AGGREGATE = "sha256:718d7ecec808199148b63ce64208e60d52be18575b175df67ef620596107fa34"
REVIEWER_AGENT_ID = "claude-t6-mal1-reviewer-01"
REVIEWER_SESSION_ID = "claude-t6-mal1-reviewer-session-01"
REVIEWER_BRANCH = "claude-t6-mal1-reviewer-01-m0-correction-2"
REVIEWER_WORKTREE = Path(
    "/Users/zhangbowen/Projects/NewTools-Research/Trellis/.claude/worktrees/"
    "claude-t6-mal1-reviewer-01-m0-correction-2"
)
TASK_ROOT = Path(".trellis/tasks/08-12-assure-v1-3-1-complete-system-mal1")
ASSIGNMENT_PATH = TASK_ROOT / "research/reviewer/reviewer-assignment.json"
SCRIPT_PATH = TASK_ROOT / "research/reviewer/mal1-review.py"
FREEZE_PATH = Path(
    ".trellis/tasks/08-12-integrate-install-and-freeze-v1-3-1-subject/research/exact-subject-freeze.json"
)
G0_BASELINE_PATH = Path(
    ".trellis/tasks/08-12-govern-evaluation-contract-v1-3-1-technical-successor/research/g0-protected-path-baseline.json"
)
T4_ROOT = Path(".trellis/tasks/08-12-build-v1-3-1-production-harness/research")
A133_ROOT = Path(
    ".trellis/tasks/08-10-author-evaluation-contract-v1-3-1-attempt-3/research"
)
INSTALLED_PACK_ROOT = Path(
    "packages/cli/src/templates/research/evaluation-contracts/1.3.1"
)
PROCEDURE_ROOT = Path("packages/cli/src/templates/research/procedures")
LIVE_SELECTION_PATH = Path("packages/core/src/research/stage-capabilities.ts")
ATTEMPT_ROOT = TASK_ROOT / "research/attempt-1"
PROTECTED_BRANCH_REF = "refs/heads/evidence/v13-baseline"
EXPECTED_PNPM_VERSION = "10.32.1"
EXPECTED_PACKAGE_MANAGER = f"pnpm@{EXPECTED_PNPM_VERSION}"
REQUIRED_TOOL_NAMES = ("git", "node", "npm", "pnpm", "uv", "python3", "tar")
COMMON_DENIED_AUTHORITY = (
    "activationAuthorized", "archiveAuthorized", "completeSystemAcceptanceAuthorized",
    "liveSelectionChangeAuthorized", "networkAuthorized", "providerExecutionAuthorized",
    "publicationAuthorized", "pushAuthorized", "releaseAuthorized", "runtimeActivationAuthorized",
    "technicalOperatorDecisionAuthorized", "workerAuthorityChangeAuthorized",
)
ASSIGNMENT_GRANTED_AUTHORITY = (
    "assuranceRunAuthorized", "m0CommitAuthorized", "m0OutputWriteAuthorized",
    "m1OutputWriteAuthorized", "taskExecutionAuthorized",
)
TASK_GRANTED_AUTHORITY = (
    "assuranceRunAuthorized", "commitAuthorized", "m0CommitAuthorized",
    "m0ExecutionAuthorized", "m1OutputWriteAuthorized", "taskExecutionAuthorized",
)
TASK_ONLY_DENIED_AUTHORITY = (
    "cliImplementationAuthorized", "harnessImplementationAuthorized",
    "procedurePackageAuthorized", "productionImplementationAuthorized",
    "runtimeImplementationAuthorized", "schemaImplementationAuthorized",
)
EXPECTED_MEMBER_LEDGER_KEYS = {
    "acceptedContractDigest",
    "acceptedContractDigestRole",
    "aggregateDomain",
    "aggregateSha256",
    "contractVersion",
    "kind",
    "memberCount",
    "members",
    "schemaVersion",
}
EXPECTED_MEMBER_RECORD_KEYS = {"byteLength", "mediaType", "path", "role", "sha256"}
EXPECTED_AGGREGATE_DOMAIN = (
    "sha256(domain trellis-accepted-v13-pack-members\\0 + ordered path\\0bytes\\0)"
)
EXPECTED_CONTRACT_DIGEST_ROLE = (
    "semantic frozen-target digest, separate field, not derived from member bytes"
)
PROVIDER_EXECUTABLE_NAMES = (
    "anthropic",
    "claude",
    "codex",
    "gemini",
    "openai",
    "opencode",
    "qoder",
)
EXPECTED_IMMUTABLE_EXCLUSIONS = (
    ".trellis/research/**",
    "all G131/G132/G133 A/B/O task roots and evidence",
    "all CS5/CS6 task roots and evidence",
    "packages/cli/src/templates/research/procedures/*/1.0.0/** through 2.0.6/**",
    "packages/core/src/research/stage-capabilities.ts",
)

M0_PATHS = (
    str(TASK_ROOT / "task.json"),
    str(ASSIGNMENT_PATH),
    str(SCRIPT_PATH),
)
M1_NAMES = (
    "exact-subject-attestation.json",
    "reviewer-session-attestation.json",
    "accepted-member-ledger.json",
    "runtime-contract-audit.json",
    "harness-case-evidence.jsonl",
    "command-evidence-ledger.jsonl",
    "filesystem-mutation-audit.json",
    "containment-audit.json",
    "machine-verdict.json",
)
M1_PATHS = tuple(str(ATTEMPT_ROOT / name) for name in M1_NAMES)
AUX_MEMBER_LEDGER = "member-ledger.json"
PACK_MEMBERS = (
    "durable-output-disposition-v1.3.1.json",
    "artifact-lifecycle-contract-v1.3.1.json",
    "validator-registry-v1.3.1.json",
    "validator-binding-matrix-v1.3.1.json",
    "differential-test-matrix-v1.3.1.json",
    "derivability-provenance-matrix-v1.3.1.json",
    "closure-contract-v1.3.1.json",
)
PROCEDURE_IDS = (
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
EXPECTED_ACTORS = (
    "g0-t0-governance-implementer",
    "claude-t1-core-implementer",
    "claude-t2-cli-implementer",
    "claude-t3-procedure-207-author",
    "claude-t4-production-harness-author",
    "claude-t5-integration-freeze-owner",
)
REQUIRED_COMMAND_IDS = (
    "dependency-install",
    "core-focused-build",
    "core-focused-semantics",
    "cli-focused-complete-system",
    "core-full-lint",
    "core-full-test",
    "core-final-build",
    "cli-full-lint",
    "cli-full-typecheck",
    "cli-full-test",
    "cli-final-build",
    "workspace-typecheck",
    "live-selection-pin",
    "external-pack-core",
    "external-pack-cli",
    "external-npm-install",
    "external-npm-runtime",
    "external-npm-trellis-alias",
    "external-npm-tl-alias",
    "external-pnpm-lock-seed",
    "external-pnpm-import",
    "external-pnpm-lock",
    "external-pnpm-install",
    "external-pnpm-runtime",
    "external-pnpm-trellis-alias",
    "external-pnpm-tl-alias",
)
EXTERNAL_ALIAS_COMMAND_IDS = (
    "external-npm-trellis-alias",
    "external-npm-tl-alias",
    "external-pnpm-trellis-alias",
    "external-pnpm-tl-alias",
)
EXTERNAL_COMMAND_IDS = tuple(
    command_id for command_id in REQUIRED_COMMAND_IDS if command_id.startswith("external-")
)
EXTRACTION_EPHEMERAL_ROOTS = (
    "node_modules/",
    "packages/core/node_modules/",
    "packages/cli/node_modules/",
    "packages/core/dist/",
    "packages/cli/dist/",
)
SANDBOX_EXEC = Path("/usr/bin/sandbox-exec")
SANDBOX_MARKER = "TRELLIS_T6_NETWORK_SANDBOXED"
SANDBOX_PROFILE = "(version 1) (allow default) (deny network*)"
EMPTY_SHA256 = hashlib.sha256(b"").hexdigest()

@dataclass(frozen=True)
class ReviewerInvocation:
    agent_id: str
    session_id: str
    worktree: Path
    protected_worktree_root: Path
    resumed: bool
    shared_scratch_with_t0_through_t5: bool

@dataclass(frozen=True)
class CommandSpec:
    command_id: str
    argv: tuple[str, ...]
    cwd: str = "."
    timeout_seconds: int = 1_800

@dataclass(frozen=True)
class CommandResult:
    command_id: str
    argv: tuple[str, ...]
    cwd: str
    exit_code: int | None
    status: str

    def evidence(self) -> dict[str, Any]:
        return {
            "schemaVersion": SCHEMA_VERSION,
            "recordKind": "t6-command-evidence",
            "ordinal": -1,
            "commandId": self.command_id,
            "argv": list(self.argv),
            "cwd": self.cwd,
            "exitCode": self.exit_code,
            "status": self.status,
            "networkAllowed": False,
            "providerExecutionAllowed": False,
        }

def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()

def canonical_bytes(value: Any) -> bytes:
    return (json.dumps(value, ensure_ascii=False, separators=(",", ":"), sort_keys=True) + "\n").encode(
        "utf-8"
    )

def jsonl_bytes(rows: Iterable[Any]) -> bytes:
    return b"".join(canonical_bytes(row) for row in rows)

def strict_json_bytes(value: bytes, label: str) -> Any:
    def reject_constant(token: str) -> None:
        raise ValueError(f"{label}: non-finite number {token}")

    def object_pairs(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
        result: dict[str, Any] = {}
        for key, item in pairs:
            if key in result:
                raise ValueError(f"{label}: duplicate key {key}")
            result[key] = item
        return result

    return json.loads(
        value.decode("utf-8"),
        object_pairs_hook=object_pairs,
        parse_constant=reject_constant,
    )

def run_raw(
    argv: Iterable[str],
    *,
    cwd: Path,
    env: dict[str, str] | None = None,
    timeout: int = 120,
    check: bool = True,
) -> subprocess.CompletedProcess[bytes]:
    completed = subprocess.run(
        list(argv),
        cwd=cwd,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=timeout,
        check=False,
    )
    if check and completed.returncode != 0:
        rendered = " ".join(argv)
        raise RuntimeError(f"command failed ({completed.returncode}): {rendered}")
    return completed

def git_bytes(repo: Path, *args: str) -> bytes:
    return run_raw(("git", "-C", str(repo), *args), cwd=repo).stdout

def git_text(repo: Path, *args: str) -> str:
    return git_bytes(repo, *args).decode("utf-8").strip()

def git_object(repo: Path, commit: str, path: str) -> bytes:
    return git_bytes(repo, "show", f"{commit}:{path}")

def parse_status_entries(raw: bytes) -> list[tuple[str, str]]:
    fields = raw.decode("utf-8").split("\0")
    entries: list[tuple[str, str]] = []
    index = 0
    while index < len(fields):
        row = fields[index]
        index += 1
        if not row:
            continue
        if len(row) < 4 or row[2] != " ":
            raise ValueError("malformed Git porcelain status")
        status = row[:2]
        entries.append((status, row[3:]))
        if "R" in status or "C" in status:
            if index >= len(fields) or not fields[index]:
                raise ValueError("malformed Git rename/copy status")
            entries.append((status, fields[index]))
            index += 1
    return entries

def parse_status_paths(raw: bytes) -> list[str]:
    return sorted({path for _, path in parse_status_entries(raw)})

def status_short_lines(raw: bytes) -> list[str]:
    return [f"{status} {path}" for status, path in parse_status_entries(raw)]

def parse_worktree_records(raw: bytes) -> list[dict[str, str | bool]]:
    records: list[dict[str, str | bool]] = []
    for block in raw.decode("utf-8").strip().split("\n\n"):
        record: dict[str, str | bool] = {}
        for line in block.splitlines():
            key, separator, value = line.partition(" ")
            if key in record:
                raise ValueError(f"duplicate Git worktree field: {key}")
            record[key] = value if separator else True
        if not isinstance(record.get("worktree"), str) or not isinstance(record.get("HEAD"), str):
            raise ValueError("malformed Git worktree record")
        records.append(record)
    return records

def registered_worktree(repo: Path, path: Path, branch: str, head: str) -> bool:
    records = parse_worktree_records(git_bytes(repo, "worktree", "list", "--porcelain"))
    matches = [record for record in records if record.get("worktree") == str(path.resolve())]
    return len(matches) == 1 and matches[0].get("branch") == branch and matches[0].get("HEAD") == head and not matches[0].get("bare") and not matches[0].get("detached")

def authenticate_protected_root(repo: Path, supplied_root: Path) -> Path:
    root = supplied_root.resolve()
    if not registered_worktree(repo, root, PROTECTED_BRANCH_REF, S1_COMMIT):
        raise ValueError("protected baseline worktree registration mismatch")
    if (
        git_text(root, "rev-parse", "HEAD") != S1_COMMIT
        or git_text(root, "rev-parse", "HEAD^{tree}") != S1_TREE
        or git_text(root, "symbolic-ref", "HEAD") != PROTECTED_BRANCH_REF
        or git_text(root, "rev-parse", f"{S1_COMMIT}^1") != SUBJECT_COMMIT
    ):
        raise ValueError("protected baseline worktree identity drifted")
    return root

def path_state_digest(path: Path) -> str:
    digest = hashlib.sha256()

    def update(node: Path, relative: str) -> None:
        try:
            stat = node.lstat()
        except OSError:
            digest.update(f"missing\0{relative}\0".encode("utf-8"))
            return
        if node.is_symlink():
            digest.update(f"symlink\0{relative}\0{stat.st_mode}\0".encode("utf-8"))
            digest.update(os.readlink(node).encode("utf-8"))
            digest.update(b"\0")
        elif node.is_dir():
            digest.update(f"directory\0{relative}\0{stat.st_mode}\0".encode("utf-8"))
            try:
                children = sorted(node.iterdir(), key=lambda child: child.name)
            except OSError:
                digest.update(b"unreadable\0")
                return
            for child in children:
                child_relative = child.name if not relative else f"{relative}/{child.name}"
                update(child, child_relative)
        elif node.is_file():
            digest.update(f"file\0{relative}\0{stat.st_mode}\0{stat.st_size}\0".encode("utf-8"))
            try:
                with node.open("rb") as stream:
                    for chunk in iter(lambda: stream.read(1024 * 1024), b""):
                        digest.update(chunk)
            except OSError:
                digest.update(b"unreadable\0")
        else:
            digest.update(f"other\0{relative}\0{stat.st_mode}\0".encode("utf-8"))

    update(path, "")
    return digest.hexdigest()

def git_status_entries(root: Path) -> tuple[tuple[str, str], ...]:
    return tuple(parse_status_entries(git_bytes(root, "status", "--porcelain=v1", "-z", "--untracked-files=all", "--ignored=matching")))

def status_snapshot(root: Path, entries: Iterable[tuple[str, str]] | None = None) -> dict[str, Any]:
    rows = tuple(entries) if entries is not None else git_status_entries(root)
    return {
        "entries": rows,
        "digests": {path: path_state_digest(root / path) for path in sorted({path for _, path in rows})},
    }

def compare_status_snapshot(root: Path, current: dict[str, Any], initial: dict[str, Any]) -> tuple[list[str], list[str], list[str]]:
    current_rows, initial_rows = set(current["entries"]), set(initial["entries"])
    return (
        sorted(f"{status}:{path}" for status, path in current_rows - initial_rows),
        sorted(f"{status}:{path}" for status, path in initial_rows - current_rows),
        sorted(path for path, digest in initial["digests"].items() if path_state_digest(root / path) != digest),
    )

def load_protected_baseline(repo: Path) -> tuple[dict[str, Any], bytes]:
    data = git_object(repo, S1_COMMIT, str(G0_BASELINE_PATH))
    baseline = strict_json_bytes(data, "protected-baseline")
    if not isinstance(baseline, dict):
        raise ValueError("protected baseline must be an object")
    return baseline, data

def protected_inventory(baseline: dict[str, Any]) -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, Any]]:
    files, submodules, cs5 = baseline.get("files"), baseline.get("submodules"), baseline.get("untrackedCs5Decision")
    if not isinstance(files, list) or not isinstance(submodules, list) or not isinstance(cs5, dict):
        raise ValueError("protected baseline inventory malformed")
    if any(not isinstance(item, dict) or not isinstance(item.get("path"), str) for item in (*files, *submodules)) or not isinstance(cs5.get("path"), str):
        raise ValueError("protected baseline path inventory malformed")
    return files, submodules, cs5

def path_is_within(path: Path, root: Path) -> bool:
    try:
        path.resolve().relative_to(root.resolve())
        return True
    except ValueError:
        return False

def active_reviewer_relative(repo: Path, protected_root: Path) -> str:
    try:
        relative = repo.resolve().relative_to(protected_root.resolve()).as_posix()
    except ValueError as error:
        raise ValueError("reviewer worktree is not nested under protected root") from error
    if not relative.startswith(".claude/worktrees/") or not registered_worktree(repo, repo, f"refs/heads/{REVIEWER_BRANCH}", git_text(repo, "rev-parse", "HEAD")):
        raise ValueError("active reviewer worktree registration drifted")
    return relative

def capture_protected_worktree_runtime_baseline(repo: Path, protected_root: Path) -> dict[str, Any]:
    baseline, _ = load_protected_baseline(repo)
    files, submodules, cs5 = protected_inventory(baseline)
    expected = {item["path"] for item in (*files, *submodules)} | {cs5["path"]}
    excluded = active_reviewer_relative(repo, protected_root)
    unexpected = tuple((status, path) for status, path in git_status_entries(protected_root) if path not in expected and path.rstrip("/") != excluded)
    ignored = {}
    for item in submodules:
        root = protected_root / item["path"]
        ignored[item["path"]] = status_snapshot(root, ((status, path) for status, path in git_status_entries(root) if status == "!!"))
    return {"unexpected": status_snapshot(protected_root, unexpected), "ignored": ignored, "excluded": excluded}

def installed_contract_inventory_valid(names: Iterable[str]) -> bool:
    return sorted(names) == sorted((*PACK_MEMBERS, AUX_MEMBER_LEDGER))

def static_check() -> dict[str, Any]:
    if len(M0_PATHS) != 3 or len(set(M0_PATHS)) != 3:
        raise ValueError("M0 inventory must contain exactly three unique paths")
    if len(M1_PATHS) != 9 or len(set(M1_PATHS)) != 9:
        raise ValueError("M1 inventory must contain exactly nine unique paths")
    if set(M0_PATHS) & set(M1_PATHS):
        raise ValueError("M0 and M1 inventories overlap")
    for value in (
        S1_COMMIT,
        S1_TREE,
        INITIAL_M0_COMMIT,
        PRIOR_M0_CORRECTION_COMMIT,
        SUBJECT_COMMIT,
        SUBJECT_TREE,
        A133_COMMIT,
    ):
        if re.fullmatch(r"[0-9a-f]{40}", value) is None:
            raise ValueError(f"invalid Git object identity: {value}")
    if len({S1_COMMIT, INITIAL_M0_COMMIT, PRIOR_M0_CORRECTION_COMMIT}) != 3:
        raise ValueError("M0 correction lineage identities must be distinct")
    for value in (ACCEPTED_SEMANTIC_DIGEST, ACCEPTED_MEMBER_AGGREGATE):
        if re.fullmatch(r"sha256:[0-9a-f]{64}", value) is None:
            raise ValueError(f"invalid digest identity: {value}")
    if len(PACK_MEMBERS) != 7 or len(PROCEDURE_IDS) != 17:
        raise ValueError("frozen population constants drifted")
    if REQUIRED_TOOL_NAMES != ("git", "node", "npm", "pnpm", "uv", "python3", "tar"):
        raise ValueError("authenticated tool inventory drifted")
    if len(REQUIRED_COMMAND_IDS) != len(set(REQUIRED_COMMAND_IDS)):
        raise ValueError("required command inventory contains duplicates")
    if not set(EXTERNAL_ALIAS_COMMAND_IDS).issubset(REQUIRED_COMMAND_IDS):
        raise ValueError("external alias commands are not required")
    if set(EXTERNAL_COMMAND_IDS) != {
        command_id for command_id in REQUIRED_COMMAND_IDS if command_id.startswith("external-")
    }:
        raise ValueError("external command inventory drifted")
    exact_contract_names = (*PACK_MEMBERS, AUX_MEMBER_LEDGER)
    if (
        len(set(exact_contract_names)) != 8
        or not installed_contract_inventory_valid(exact_contract_names)
        or installed_contract_inventory_valid((*exact_contract_names, "extra.json"))
        or installed_contract_inventory_valid(exact_contract_names[:-1])
    ):
        raise ValueError("installed contract directory inventory self-check failed")
    if sys.platform != "darwin" or not SANDBOX_EXEC.is_file():
        raise ValueError("required Darwin network sandbox is unavailable")
    synthetic_mutations = parse_status_paths(
        b"M  staged.txt\0 M worktree.txt\0A  added.txt\0D  deleted.txt\0"
        b"?? untracked.txt\0!! ignored.txt\0"
    )
    if synthetic_mutations != [
        "added.txt",
        "deleted.txt",
        "ignored.txt",
        "staged.txt",
        "untracked.txt",
        "worktree.txt",
    ]:
        raise ValueError("complete Git mutation parsing self-check failed")
    if REVIEWER_AGENT_ID in EXPECTED_ACTORS:
        raise ValueError("reviewer identity overlaps a predecessor actor")
    return {
        "schemaVersion": SCHEMA_VERSION,
        "recordKind": "t6-reviewer-program-self-check",
        "m0PathCount": len(M0_PATHS),
        "m1PathCount": len(M1_PATHS),
        "packMemberCount": len(PACK_MEMBERS),
        "procedureFamilyCount": len(PROCEDURE_IDS),
        "requiredCommandCount": len(REQUIRED_COMMAND_IDS),
        "authenticatedToolNames": list(REQUIRED_TOOL_NAMES),
        "externalAliasCommandCount": len(EXTERNAL_ALIAS_COMMAND_IDS),
        "installedContractFileCount": len(PACK_MEMBERS) + 1,
        "auxiliaryMemberLedgerRequired": True,
        "mutationStatusModesChecked": ["index", "worktree", "untracked", "ignored"],
        "networkSandboxRequired": True,
        "reviewerInvocationInputsRequired": True,
        "atomicM1DirectoryPublish": True,
        "selfCheckWritesEvidence": False,
        "verdict": "pass",
    }

def validate_m0_changed_paths(
    initial_paths: Iterable[str],
    prior_correction_paths: Iterable[str],
    correction_paths: Iterable[str],
) -> None:
    normalized_initial = sorted(initial_paths)
    normalized_prior = sorted(prior_correction_paths)
    normalized_correction = sorted(correction_paths)
    if normalized_initial != sorted(M0_PATHS):
        raise ValueError(f"initial M0 changed-path mismatch: {normalized_initial}")
    if normalized_prior != [str(SCRIPT_PATH)]:
        raise ValueError(
            f"prior M0 correction changed-path mismatch: {normalized_prior}"
        )
    if normalized_correction != sorted(M0_PATHS):
        raise ValueError(f"M0 correction changed-path mismatch: {normalized_correction}")

def validate_m0_worktree_bytes(
    repo: Path, committed_m0_bytes: dict[str, bytes]
) -> None:
    if set(committed_m0_bytes) != set(M0_PATHS):
        raise ValueError("committed M0 byte inventory is incomplete")
    for path, committed_bytes in committed_m0_bytes.items():
        if committed_bytes != (repo / path).read_bytes():
            raise ValueError(f"M0 worktree bytes differ from committed correction: {path}")

def authority_valid(record: dict[str, Any], granted: Iterable[str], denied: Iterable[str]) -> bool:
    granted_set = set(granted)
    return (
        all(record.get(key) is True for key in granted_set)
        and all(record.get(key) is False for key in denied)
        and all(value is False or key in granted_set for key, value in record.items() if key.endswith("Authorized"))
        and record.get("repairAuthority") is False
        and record.get("humanReviewed") is False
        and record.get("humanEquivalent") is False
    )

def validate_invocation_declarations(
    assigned_identity: dict[str, Any], invocation: ReviewerInvocation
) -> None:
    if (
        invocation.agent_id != assigned_identity.get("agentId")
        or invocation.session_id != assigned_identity.get("sessionId")
    ):
        raise ValueError("declared reviewer identity does not match committed assignment")
    if invocation.shared_scratch_with_t0_through_t5:
        raise ValueError("declared T0-T5 scratch sharing is forbidden")

def authenticate_m0(
    repo: Path, m0_commit: str, invocation: ReviewerInvocation
) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    if git_text(repo, "rev-parse", "HEAD") != m0_commit:
        raise ValueError("current HEAD is not the explicitly supplied M0 correction commit")
    if git_text(repo, "rev-parse", f"{m0_commit}^1") != PRIOR_M0_CORRECTION_COMMIT:
        raise ValueError("M0 correction is not committed directly on exact prior correction")
    if (
        git_text(repo, "rev-parse", f"{PRIOR_M0_CORRECTION_COMMIT}^1")
        != INITIAL_M0_COMMIT
    ):
        raise ValueError("prior M0 correction is not committed directly on exact initial M0")
    if git_text(repo, "rev-parse", f"{INITIAL_M0_COMMIT}^1") != S1_COMMIT:
        raise ValueError("initial M0 is not committed directly on exact S1")
    if git_text(repo, "rev-parse", f"{S1_COMMIT}^{{tree}}") != S1_TREE:
        raise ValueError("S1 tree mismatch")
    initial_paths = sorted(
        line
        for line in git_text(
            repo, "diff-tree", "--no-commit-id", "--name-only", "-r", INITIAL_M0_COMMIT
        ).splitlines()
        if line
    )
    prior_correction_paths = sorted(
        line
        for line in git_text(
            repo,
            "diff-tree",
            "--no-commit-id",
            "--name-only",
            "-r",
            PRIOR_M0_CORRECTION_COMMIT,
        ).splitlines()
        if line
    )
    correction_paths = sorted(
        line
        for line in git_text(repo, "diff-tree", "--no-commit-id", "--name-only", "-r", m0_commit).splitlines()
        if line
    )
    validate_m0_changed_paths(
        initial_paths, prior_correction_paths, correction_paths
    )
    authenticate_protected_root(repo, invocation.protected_worktree_root)

    committed_m0_bytes = {
        path: git_object(repo, m0_commit, path) for path in M0_PATHS
    }
    validate_m0_worktree_bytes(repo, committed_m0_bytes)
    assignment = strict_json_bytes(
        committed_m0_bytes[str(ASSIGNMENT_PATH)], "assignment"
    )
    task = strict_json_bytes(
        committed_m0_bytes[str(TASK_ROOT / "task.json")], "task"
    )
    freeze = strict_json_bytes(git_object(repo, S1_COMMIT, str(FREEZE_PATH)), "freeze")

    assigned, authority = assignment.get("assignment"), assignment.get("authority")
    output, inputs = assignment.get("outputAuthorization"), assignment.get("exactInputs")
    isolation, boundary = assignment.get("inputIsolation"), assignment.get("authorizationBoundary")
    roles, program = assignment.get("roleSeparation"), assignment.get("reviewerProgram")
    task_meta = task.get("meta")
    if not all(isinstance(item, dict) for item in (assigned, authority, output, inputs, isolation, boundary, roles, program, task_meta)):
        raise ValueError("committed M0 governance shape malformed")
    identity_ok = (
        assigned.get("agentId") == REVIEWER_AGENT_ID
        and assigned.get("sessionId") == REVIEWER_SESSION_ID
        and assigned.get("assignedRole") == "fresh-complete-system-mal1-reviewer"
        and assigned.get("branch") == REVIEWER_BRANCH
        and assigned.get("worktreePath") == str(REVIEWER_WORKTREE)
        and assigned.get("fresh") is True
        and assigned.get("machineOnly") is True
        and assigned.get("modelClass") == "gpt-5.6-sol"
        and assigned.get("runtimeClass") == "claude-code-isolated-agent-worktree"
        and assigned.get("status") == "assigned-m1-authorized-awaiting-committed-m0-correction-2"
        and assigned.get("agentId") not in EXPECTED_ACTORS
    )
    validate_invocation_declarations(assigned, invocation)
    assignment_security_ok = (
        assignment.get("schemaVersion") == SCHEMA_VERSION
        and assignment.get("recordKind") == "t6-m0-independent-reviewer-assignment"
        and assignment.get("commitBoundary") == "M0"
        and authority_valid(authority, ASSIGNMENT_GRANTED_AUTHORITY, COMMON_DENIED_AUTHORITY)
        and output.get("m0") == {"count": 3, "paths": list(M0_PATHS)}
        and output.get("m1") == {"count": 9, "paths": list(M1_PATHS)}
        and output.get("unknownOutputDisposition") == "fail-and-stop"
        and inputs.get("frozenTechnicalSubject") == {"commit": SUBJECT_COMMIT, "tree": SUBJECT_TREE}
        and inputs.get("s1FreezeBoundary") == {"commit": S1_COMMIT, "firstParent": SUBJECT_COMMIT, "tree": S1_TREE}
        and isolation.get("reviewerMayReadCommittedGitObjectsOnly") is True
        and isolation.get("distinctTemporaryExtractionRequired") is True
        and isolation.get("subjectTransport") == "git-archive"
        and isolation.get("currentWorktreeAsAssuranceSubjectAuthorized") is False
        and isolation.get("networkOrProviderInputAuthorized") is False
        and isolation.get("worktreeOverlayAuthorized") is False
        and boundary.get("committedAuthorityIsSemanticSource") is True
        and boundary.get("currentBoundary") == "M0"
        and boundary.get("m1AuthorizationRecorded") is True
        and boundary.get("m1MayRunOnlyAfterCommittedM0AndExplicitRuntimeGuard") is True
        and boundary.get("reviewerProgramSelfCheckMayNotEmitM1Evidence") is True
        and boundary.get("worktreePresenceDoesNotAuthorizeM1") is True
        and roles.get("t0ThroughT5Actors") == list(EXPECTED_ACTORS)
        and roles.get("t0ThroughT5Distinct") is True
        and roles.get("reviewerMayNotRepair") is True
        and roles.get("reviewerMayNotAcceptActivateArchiveReleasePublishOrPush") is True
        and roles.get("reviewerMayProduceOnlyMachinePassOrFail") is True
        and roles.get("futureT7MustRejectReviewerAgentAndSession") is True
        and program.get("path") == str(SCRIPT_PATH)
        and program.get("normalRunRequiresExplicitM0Commit") is True
        and program.get("normalRunRequiresExplicitSeparateAuthorizationFlag") is True
        and program.get("selfCheckWritesEvidence") is False
        and program.get("standardLibraryOnly") is True
    )
    task_security_ok = (
        task.get("assignee") == assigned.get("agentId")
        and task.get("branch") == assigned.get("branch")
        and task.get("worktree_path") == assigned.get("worktreePath")
        and task_meta.get("ownerRole") == assigned.get("agentId")
        and task_meta.get("acceptedSemanticDigest") == ACCEPTED_SEMANTIC_DIGEST
        and task_meta.get("currentCommitBoundary") == "M0"
        and task_meta.get("commitBoundaries") == ["M0", "M1"]
        and task_meta.get("ownedInventoryKeys") == ["M0", "M1"]
        and task_meta.get("liveProcedure") == "1.0.0"
        and authority_valid(task_meta, TASK_GRANTED_AUTHORITY, (*COMMON_DENIED_AUTHORITY, *TASK_ONLY_DENIED_AUTHORITY))
    )
    observed_worktree_ok = (
        invocation.worktree.resolve() == repo
        and Path(assigned.get("worktreePath", "")).resolve() == repo
        and Path.cwd().resolve() == repo
        and Path(git_text(repo, "rev-parse", "--show-toplevel")).resolve() == repo
        and git_text(repo, "branch", "--show-current") == REVIEWER_BRANCH
    )
    if not identity_ok or not assignment_security_ok or not task_security_ok or not observed_worktree_ok:
        raise ValueError("committed reviewer governance or observed worktree mismatch")

    frozen = freeze.get("frozenSubject", {})
    if frozen.get("commit") != SUBJECT_COMMIT or frozen.get("tree") != SUBJECT_TREE:
        raise ValueError("frozen technical subject mismatch")
    if git_text(repo, "rev-parse", f"{SUBJECT_COMMIT}^{{tree}}") != SUBJECT_TREE:
        raise ValueError("observed technical subject tree mismatch")
    if git_text(repo, "rev-parse", f"{S1_COMMIT}^1") != SUBJECT_COMMIT:
        raise ValueError("S1 first-parent mismatch")
    governed = {
        "committedAssignmentAuthenticated": True,
        "declaredIdentityMatchesCommittedAssignment": True,
        "declaredNoT0ThroughT5ScratchSharing": True,
        "assignedReviewerDistinctFromT0ThroughT5": True,
        "observedBranchMatchesCommittedAssignment": True,
        "reviewerWorktreeMatchesCommittedAssignment": True,
        "observedCwdMatchesReviewerWorktree": True,
        "committedM1AuthorizationRecorded": True,
    }
    return assignment, freeze, governed

def create_controlled_tool_path(runtime: Path, tools: dict[str, str]) -> tuple[Path, Path]:
    if set(tools) != set(REQUIRED_TOOL_NAMES):
        raise ValueError("authenticated tool inventory mismatch")
    controlled_bin = runtime / "controlled-bin"
    controlled_bin.mkdir(parents=True, exist_ok=False)
    for name in REQUIRED_TOOL_NAMES:
        (controlled_bin / name).symlink_to(tools[name])
    provider_log = runtime / "provider-attempts.log"
    for name in PROVIDER_EXECUTABLE_NAMES:
        wrapper = controlled_bin / name
        wrapper.write_text(
            "#!/bin/sh\n"
            f"printf '%s\\n' {shlex.quote(name)} >> {shlex.quote(str(provider_log))}\n"
            "exit 126\n",
            encoding="utf-8",
        )
        wrapper.chmod(0o700)
    return controlled_bin, provider_log

def sanitized_environment(
    runtime: Path, package_cwd: Path, tools: dict[str, str]
) -> tuple[dict[str, str], Path]:
    home = runtime / "home"
    temp = runtime / "tmp"
    for path in (home, temp, runtime / "cache", runtime / "config", runtime / "data"):
        path.mkdir(parents=True, exist_ok=True)
    npm_cache = run_raw((tools["npm"], "config", "get", "cache"), cwd=package_cwd).stdout.decode().strip()
    pnpm_store = run_raw((tools["pnpm"], "store", "path"), cwd=package_cwd).stdout.decode().strip()
    corepack_home = os.environ.get("COREPACK_HOME", str(Path.home() / ".cache/node/corepack"))
    if not npm_cache or not pnpm_store:
        raise ValueError("offline package cache location is unavailable")
    controlled_bin, provider_log = create_controlled_tool_path(runtime, tools)
    return (
        {
            "PATH": str(controlled_bin),
            "HOME": str(home),
            "TMPDIR": str(temp),
            "XDG_CACHE_HOME": str(runtime / "cache"),
            "XDG_CONFIG_HOME": str(runtime / "config"),
            "XDG_DATA_HOME": str(runtime / "data"),
            "CI": "1",
            "COREPACK_ENABLE_DOWNLOAD_PROMPT": "0",
            "COREPACK_HOME": corepack_home,
            "GIT_CONFIG_GLOBAL": "/dev/null",
            "GIT_CONFIG_NOSYSTEM": "1",
            "GIT_TERMINAL_PROMPT": "0",
            "LC_ALL": "C",
            "NO_COLOR": "1",
            "NPM_CONFIG_AUDIT": "false",
            "NPM_CONFIG_CACHE": npm_cache,
            "NPM_CONFIG_FUND": "false",
            "NPM_CONFIG_OFFLINE": "true",
            "npm_config_offline": "true",
            "npm_config_store_dir": str(Path(pnpm_store).parent),
            "PYTHONHASHSEED": "0",
            "TZ": "UTC",
        },
        provider_log,
    )

def provider_attempts(provider_log: Path) -> list[str]:
    if not provider_log.is_file():
        return []
    return sorted(set(line for line in provider_log.read_text(encoding="utf-8").splitlines() if line))

def validate_pnpm_identity(
    tools: dict[str, str], extraction: Path, env: dict[str, str]
) -> tuple[dict[str, Any], bool]:
    completed = run_raw(
        (tools["pnpm"], "--version"),
        cwd=extraction,
        env=env,
        check=False,
    )
    observed_version = completed.stdout.decode("utf-8", errors="replace").strip()
    package_manager: Any = None
    package_error: str | None = None
    try:
        package = load_json_file(extraction / "package.json", "root-package")
        if not isinstance(package, dict):
            raise ValueError("root package must be an object")
        package_manager = package.get("packageManager")
    except (OSError, UnicodeDecodeError, ValueError):
        package_error = "root-package-manager-unreadable"
    matches = (
        completed.returncode == 0
        and observed_version == EXPECTED_PNPM_VERSION
        and package_manager == EXPECTED_PACKAGE_MANAGER
        and package_error is None
    )
    return (
        {
            "resolvedExecutableBasename": Path(tools["pnpm"]).name,
            "expectedVersion": EXPECTED_PNPM_VERSION,
            "observedVersion": observed_version,
            "versionExitCode": completed.returncode,
            "expectedPackageManager": EXPECTED_PACKAGE_MANAGER,
            "observedPackageManager": package_manager,
            "packageManagerError": package_error,
            "matches": matches,
        },
        matches,
    )

def blocked_command_results(reason: str, tools: dict[str, str] | None = None) -> list[CommandResult]:
    specs = {spec.command_id: spec for spec in fixed_commands(tools)} if tools else {}
    return [
        CommandResult(
            command_id,
            evidence_argv(specs[command_id].argv, tools) if command_id in specs else ("reviewer", reason),
            specs[command_id].cwd if command_id in specs else ("<EXTERNAL>" if command_id.startswith("external-") else "."),
            None,
            "blocked",
        )
        for command_id in REQUIRED_COMMAND_IDS
    ]

def resolve_tools() -> dict[str, str]:
    tools: dict[str, str] = {}
    for name in REQUIRED_TOOL_NAMES:
        resolved = shutil.which(name)
        if resolved is None:
            raise ValueError(f"required executable not found: {name}")
        tools[name] = str(Path(resolved).resolve())
    return tools

def ensure_network_sandbox() -> None:
    if os.environ.get(SANDBOX_MARKER) == "1":
        return
    if sys.platform != "darwin" or not SANDBOX_EXEC.is_file():
        raise ValueError("required Darwin network sandbox is unavailable")
    environment = os.environ.copy()
    environment[SANDBOX_MARKER] = "1"
    os.execve(
        SANDBOX_EXEC,
        (
            str(SANDBOX_EXEC),
            "-p",
            SANDBOX_PROFILE,
            sys.executable,
            str(Path(__file__).resolve()),
            *sys.argv[1:],
        ),
        environment,
    )

def network_denial_probe() -> dict[str, Any]:
    try:
        probe = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    except OSError as error:
        denied = error.errno in (errno.EPERM, errno.EACCES)
        return {
            "mechanism": "darwin-sandbox-exec-deny-network",
            "socketCreationDenied": denied,
            "outboundConnectDenied": denied,
            "errno": error.errno,
            "verdict": "pass" if denied else "fail",
        }
    try:
        result = probe.connect_ex(("127.0.0.1", 9))
    finally:
        probe.close()
    denied = result in (errno.EPERM, errno.EACCES)
    return {
        "mechanism": "darwin-sandbox-exec-deny-network",
        "socketCreationDenied": False,
        "outboundConnectDenied": denied,
        "errno": result,
        "verdict": "pass" if denied else "fail",
    }

def archive_subject(repo: Path) -> bytes:
    archive = git_bytes(repo, "archive", "--format=tar", SUBJECT_COMMIT)
    if not archive:
        raise ValueError("empty subject archive")
    return archive

def extract_subject(archive: bytes, destination: Path) -> None:
    destination.mkdir(parents=True, exist_ok=False)
    with tarfile.open(fileobj=io.BytesIO(archive), mode="r:") as bundle:
        bundle.extractall(destination, filter="data")

def initialize_extracted_git(
    extraction: Path, repo: Path, m0_commit: str, env: dict[str, str], git: str
) -> None:
    run_raw((git, "init", "--quiet"), cwd=extraction, env=env)
    run_raw((git, "remote", "add", "origin", str(repo)), cwd=extraction, env=env)
    run_raw(
        (git, "-c", "protocol.file.allow=always", "fetch", "--quiet", "--no-tags", "origin", m0_commit),
        cwd=extraction,
        env=env,
        timeout=600,
    )
    run_raw((git, "reset", "--mixed", SUBJECT_COMMIT), cwd=extraction, env=env)
    status = parse_status_paths(
        run_raw(
            (git, "status", "--porcelain=v1", "-z", "--untracked-files=all"),
            cwd=extraction,
            env=env,
        ).stdout
    )
    if status:
        raise ValueError(f"archive extraction differs from subject commit: {status}")

def fixed_commands(tools: dict[str, str]) -> tuple[CommandSpec, ...]:
    pnpm = tools["pnpm"]
    node = tools["node"]
    return (
        CommandSpec(
            "dependency-install",
            (pnpm, "install", "--offline", "--frozen-lockfile", "--ignore-scripts"),
            timeout_seconds=1_800,
        ),
        CommandSpec("core-focused-build", (pnpm, "--filter", "@mindfoldhq/trellis-core", "build")),
        CommandSpec(
            "core-focused-semantics",
            (
                pnpm,
                "--dir",
                "packages/core",
                "exec",
                "vitest",
                "run",
                "test/research/methodology-contract.test.ts",
                "test/research/methodology-runtime.test.ts",
                "test/research/methodology-v13-runtime.test.ts",
                "test/research/procedure-policy.test.ts",
                "test/research/procedure-support-pack.test.ts",
                "--reporter=dot",
            ),
        ),
        CommandSpec(
            "cli-focused-complete-system",
            (
                pnpm,
                "--dir",
                "packages/cli",
                "exec",
                "vitest",
                "run",
                "test/commands/research-methodology-116-production.test.ts",
                "test/commands/research-methodology-v131-coverage.test.ts",
                "test/commands/research-procedure-207-packages.test.ts",
                "test/commands/research-v131-cli-runtime.test.ts",
                "test/commands/research-methodology-validation.test.ts",
                "test/commands/research-dispatch-approved-result.test.ts",
                "test/commands/research-report-v2-publication.test.ts",
                "test/commands/research-procedure-resolution.integration.test.ts",
                "--no-file-parallelism",
                "--reporter=dot",
            ),
            timeout_seconds=3_600,
        ),
        CommandSpec("core-full-lint", (pnpm, "--filter", "@mindfoldhq/trellis-core", "lint")),
        CommandSpec("core-full-test", (pnpm, "--filter", "@mindfoldhq/trellis-core", "test"), timeout_seconds=3_600),
        CommandSpec("core-final-build", (pnpm, "--filter", "@mindfoldhq/trellis-core", "build")),
        CommandSpec("cli-full-lint", (pnpm, "--filter", "@mindfoldhq/trellis", "lint")),
        CommandSpec("cli-full-typecheck", (pnpm, "--filter", "@mindfoldhq/trellis", "typecheck")),
        CommandSpec(
            "cli-full-test",
            (
                pnpm,
                "--dir",
                "packages/cli",
                "exec",
                "vitest",
                "run",
                "--no-file-parallelism",
                "--reporter=dot",
            ),
            timeout_seconds=5_400,
        ),
        CommandSpec("cli-final-build", (pnpm, "--filter", "@mindfoldhq/trellis", "build")),
        CommandSpec("workspace-typecheck", (pnpm, "run", "typecheck"), timeout_seconds=1_800),
        CommandSpec(
            "live-selection-pin",
            (
                node,
                "--input-type=module",
                "-e",
                "import('@mindfoldhq/trellis-core/research').then(()=>process.stdout.write('research-import-ok\\n'))",
            ),
            cwd="packages/core",
        ),
    )

def evidence_argv(argv: tuple[str, ...], tools: dict[str, str]) -> tuple[str, ...]:
    inverse = {value: name for name, value in tools.items()}
    normalized: list[str] = []
    for item in argv:
        if item in inverse:
            normalized.append(inverse[item])
        elif item == sys.executable:
            normalized.append("python")
        elif Path(item).is_absolute():
            normalized.append(f"<TEMP>/{Path(item).name}")
        else:
            normalized.append(item)
    return tuple(normalized)

def execute_command(
    spec: CommandSpec, extraction: Path, env: dict[str, str], tools: dict[str, str]
) -> CommandResult:
    cwd = extraction / spec.cwd
    try:
        completed = run_raw(
            spec.argv,
            cwd=cwd,
            env=env,
            timeout=spec.timeout_seconds,
            check=False,
        )
        return CommandResult(
            command_id=spec.command_id,
            argv=evidence_argv(spec.argv, tools),
            cwd=spec.cwd,
            exit_code=completed.returncode,
            status="pass" if completed.returncode == 0 else "fail",
        )
    except subprocess.TimeoutExpired:
        return CommandResult(
            command_id=spec.command_id,
            argv=evidence_argv(spec.argv, tools),
            cwd=spec.cwd,
            exit_code=124,
            status="timeout",
        )
    except OSError:
        return CommandResult(
            command_id=spec.command_id,
            argv=evidence_argv(spec.argv, tools),
            cwd=spec.cwd,
            exit_code=None,
            status="launch-failed",
        )

def yaml_block_by_prefix(text: str, prefix: str) -> str:
    marker = f"\n  '{prefix}"
    start = text.find(marker)
    if start < 0:
        raise ValueError(f"missing lockfile block {prefix}")
    body = text[start + 1 :]
    match = re.search(r"\n  \S", body[1:])
    return (body if match is None else body[: match.start() + 1]).rstrip()

def importer_version(importer: str, package_name: str) -> str:
    start = max(
        importer.find(f"      '{package_name}':"),
        importer.find(f"      {package_name}:"),
    )
    if start < 0:
        raise ValueError(f"missing root importer dependency {package_name}")
    body = importer[start:]
    boundary = re.search(r"\n      \S", body[1:])
    block = body if boundary is None else body[: boundary.start() + 1]
    match = re.search(r"\n        version: ([^\n]+)", block)
    if match is None:
        raise ValueError(f"missing root importer version {package_name}")
    return match.group(1)

def build_external_pnpm_lock(extraction: Path, imported: str, local_core: str) -> str:
    root = (extraction / "pnpm-lock.yaml").read_text(encoding="utf-8")
    root_packages = root[root.index("packages:\n") + len("packages:\n") : root.index("\nsnapshots:\n")].lstrip("\n").rstrip()
    root_snapshots = root[root.index("\nsnapshots:\n") + len("\nsnapshots:\n") :].lstrip("\n").rstrip()
    imported_importer = imported[imported.index("importers:\n") + len("importers:\n") : imported.index("\npackages:\n")].lstrip("\n").rstrip()
    root_cli_importer = root[root.index("  packages/cli:") : root.index("\n  packages/core:")]
    local_core_package = yaml_block_by_prefix(imported, "@mindfoldhq/trellis-core@file:")
    local_cli_package = yaml_block_by_prefix(imported, "@mindfoldhq/trellis@file:")
    imported_snapshots = imported[imported.index("\nsnapshots:\n") :]
    local_core_snapshot = yaml_block_by_prefix(imported_snapshots, "@mindfoldhq/trellis-core@file:")
    local_cli_snapshot = yaml_block_by_prefix(imported_snapshots, "@mindfoldhq/trellis@file:")
    versions = {
        "@mindfoldhq/trellis-core": local_core,
        **{
            name: importer_version(root_cli_importer, name)
            for name in ("chalk", "commander", "figlet", "inquirer", "undici", "zod")
        },
    }
    for name, version in versions.items():
        pattern = re.compile(rf"(      ['\"]?{re.escape(name)}['\"]?:) [^\n]+")
        local_cli_snapshot, count = pattern.subn(lambda match: f"{match.group(1)} {version}", local_cli_snapshot)
        if count != 1:
            raise ValueError(f"missing imported CLI snapshot dependency {name}")
    header = root[: root.index("importers:\n")]
    return (
        f"{header}importers:\n\n{imported_importer}\n\npackages:\n\n{local_core_package}\n\n"
        f"{local_cli_package}\n\n{root_packages}\n\nsnapshots:\n\n{local_core_snapshot}\n\n"
        f"{local_cli_snapshot}\n\n{root_snapshots}\n"
    )

def external_command(
    command_id: str,
    argv: tuple[str, ...],
    consumer: Path,
    env: dict[str, str],
    tools: dict[str, str],
    results: list[CommandResult],
    timeout: int = 1_800,
) -> bool:
    try:
        completed = run_raw(argv, cwd=consumer, env=env, timeout=timeout, check=False)
        result = CommandResult(
            command_id,
            evidence_argv(argv, tools),
            f"<EXTERNAL>/{consumer.name}",
            completed.returncode,
            "pass" if completed.returncode == 0 else "fail",
        )
    except subprocess.TimeoutExpired:
        result = CommandResult(command_id, evidence_argv(argv, tools), f"<EXTERNAL>/{consumer.name}", 124, "timeout")
    except OSError:
        result = CommandResult(command_id, evidence_argv(argv, tools), f"<EXTERNAL>/{consumer.name}", None, "launch-failed")
    results.append(result)
    return result.status == "pass"

def stream_contains_forbidden(
    stream: Any, forbidden: tuple[bytes, ...], chunk_size: int = 1024 * 1024
) -> bool:
    needles = tuple(needle for needle in forbidden if needle)
    if not needles:
        return False
    overlap_size = max(len(needle) for needle in needles) - 1
    overlap = b""
    while True:
        chunk = stream.read(chunk_size)
        if not chunk:
            return False
        window = overlap + chunk
        if any(needle in window for needle in needles):
            return True
        overlap = window[-overlap_size:] if overlap_size > 0 else b""

def scan_tarball_privacy(
    tarballs: Iterable[Path], extraction: Path
) -> tuple[set[str], int, list[str]]:
    procedure_paths: set[str] = set()
    procedure_files = 0
    privacy_findings: list[str] = []
    forbidden = (
        str(extraction).encode(),
        str(Path.home()).encode(),
        b"ANTHROPIC_API_KEY=",
        b"OPENAI_API_KEY=",
        b"AWS_SECRET_ACCESS_KEY=",
    )
    for tarball in tarballs:
        try:
            archive = tarfile.open(tarball, mode="r:gz")
        except (OSError, tarfile.TarError):
            privacy_findings.append(f"tarball-unreadable:{tarball.name}")
            continue
        with archive:
            for member in archive.getmembers():
                name = member.name
                metadata_values = (
                    name,
                    member.linkname,
                    member.uname,
                    member.gname,
                    *member.pax_headers.keys(),
                    *member.pax_headers.values(),
                )
                if any(
                    needle in value.encode("utf-8", errors="surrogatepass")
                    for value in metadata_values
                    if value
                    for needle in forbidden
                    if needle
                ):
                    privacy_findings.append(f"forbidden-metadata:{name}")
                member_path = PurePosixPath(name)
                if member_path.is_absolute() or ".." in member_path.parts:
                    privacy_findings.append(f"unsafe-member-path:{name}")
                if (
                    "/.git/" in f"/{name}/"
                    or "/node_modules/" in f"/{name}/"
                    or "/.trellis/tasks/" in f"/{name}/"
                ):
                    privacy_findings.append(f"forbidden-member:{name}")
                match = re.search(r"/procedures/([^/]+)/2\.0\.7/", f"/{name}")
                if match:
                    procedure_paths.add(match.group(1))
                    if member.isfile():
                        procedure_files += 1
                if member.isfile():
                    stream = archive.extractfile(member)
                    if stream is None:
                        privacy_findings.append(f"regular-member-unreadable:{name}")
                    else:
                        with stream:
                            if stream_contains_forbidden(stream, forbidden):
                                privacy_findings.append(f"forbidden-bytes:{name}")
    return procedure_paths, procedure_files, sorted(set(privacy_findings))

def run_external_install_audit(
    extraction: Path,
    scratch: Path,
    env: dict[str, str],
    tools: dict[str, str],
) -> tuple[list[CommandResult], dict[str, Any]]:
    pack_root = scratch / "packs"
    core_pack = pack_root / "core"
    cli_pack = pack_root / "cli"
    core_pack.mkdir(parents=True)
    cli_pack.mkdir(parents=True)
    specs = [
        CommandSpec(
            "external-pack-core",
            (tools["pnpm"], "pack", "--pack-destination", str(core_pack)),
            cwd="packages/core",
            timeout_seconds=1_800,
        ),
        CommandSpec(
            "external-pack-cli",
            (tools["pnpm"], "pack", "--pack-destination", str(cli_pack)),
            cwd="packages/cli",
            timeout_seconds=1_800,
        ),
    ]
    results = [execute_command(spec, extraction, env, tools) for spec in specs]
    core_tarballs = sorted(core_pack.glob("*.tgz"))
    cli_tarballs = sorted(cli_pack.glob("*.tgz"))
    if len(core_tarballs) != 1 or len(cli_tarballs) != 1:
        observed_ids = {result.command_id for result in results}
        for command_id in EXTERNAL_COMMAND_IDS:
            if command_id not in observed_ids:
                results.append(
                    CommandResult(
                        command_id,
                        ("reviewer", "blocked-by-pack-prerequisite"),
                        "<EXTERNAL>",
                        None,
                        "blocked",
                    )
                )
        return results, {
            "verdict": "fail",
            "reason": "expected exactly one Core and one CLI tarball",
            "npm": False,
            "pnpm": False,
            "aliases": {
                "npm": {"trellis": False, "tl": False},
                "pnpm": {"trellis": False, "tl": False},
            },
            "procedureFamilyCount": 0,
            "procedureFileCount": 0,
            "privacyFindings": ["tarball-set-unavailable"],
        }

    core_tarball = core_tarballs[0]
    cli_tarball = cli_tarballs[0]
    consumer_root = scratch / "consumers"
    verification = (
        "const {createRequire}=await import('node:module');"
        "const fs=await import('node:fs');"
        "const r=await import('@mindfoldhq/trellis-core/research');"
        f"if(r.V131_ACCEPTED_CONTRACT_DIGEST!=={json.dumps(ACCEPTED_SEMANTIC_DIGEST)})process.exit(3);"
        "const require=createRequire(import.meta.url);"
        "const p=JSON.parse(fs.readFileSync(require.resolve('@mindfoldhq/trellis/package.json'),'utf8'));"
        "if(JSON.stringify(p.bin)!==JSON.stringify({trellis:'./bin/trellis.js',tl:'./bin/trellis.js'}))process.exit(4);"
        "await import('@mindfoldhq/trellis');process.stdout.write('installed-runtime-ok\\n');"
    )
    npm_consumer = consumer_root / "npm"
    npm_consumer.mkdir(parents=True)
    (npm_consumer / "package.json").write_text(
        json.dumps({"name": "t6-mal1-npm", "private": True, "type": "module"}) + "\n",
        encoding="utf-8",
    )
    npm_argv = (
        tools["npm"],
        "install",
        "--offline",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        "--save-exact",
        str(core_tarball),
        str(cli_tarball),
    )
    npm_install_ok = external_command(
        "external-npm-install", npm_argv, npm_consumer, env, tools, results
    )
    verify_argv = (tools["node"], "--input-type=module", "-e", verification)
    if npm_install_ok:
        external_command(
            "external-npm-runtime", verify_argv, npm_consumer, env, tools, results, timeout=120
        )
        for alias in ("trellis", "tl"):
            alias_argv = (str(npm_consumer / "node_modules/.bin" / alias), "--help")
            external_command(
                f"external-npm-{alias}-alias", alias_argv, npm_consumer, env, tools, results, timeout=120
            )
    else:
        results.append(CommandResult("external-npm-runtime", evidence_argv(verify_argv, tools), "<EXTERNAL>/npm", None, "blocked"))
        for alias in ("trellis", "tl"):
            alias_argv = (str(npm_consumer / "node_modules/.bin" / alias), "--help")
            results.append(
                CommandResult(
                    f"external-npm-{alias}-alias",
                    evidence_argv(alias_argv, tools),
                    "<EXTERNAL>/npm",
                    None,
                    "blocked",
                )
            )

    pnpm_consumer = consumer_root / "pnpm"
    pnpm_consumer.mkdir(parents=True)
    (pnpm_consumer / "package.json").write_text(
        json.dumps({"name": "t6-mal1-pnpm", "private": True, "type": "module"}) + "\n",
        encoding="utf-8",
    )
    pnpm_seed_argv = (
        tools["npm"],
        "install",
        "--offline",
        "--ignore-scripts",
        "--package-lock-only",
        "--no-audit",
        "--no-fund",
        "--save-exact",
        str(core_tarball),
        str(cli_tarball),
    )
    pnpm_ok = external_command(
        "external-pnpm-lock-seed", pnpm_seed_argv, pnpm_consumer, env, tools, results
    )
    if pnpm_ok:
        try:
            pnpm_package = load_json_file(pnpm_consumer / "package.json", "pnpm-consumer-package")
            root_package = load_json_file(extraction / "package.json", "root-package")
            package_manager = root_package.get("packageManager")
            if package_manager != EXPECTED_PACKAGE_MANAGER:
                raise ValueError("frozen subject package manager identity drifted")
            pnpm_package["packageManager"] = EXPECTED_PACKAGE_MANAGER
            (pnpm_consumer / "package.json").write_bytes(canonical_bytes(pnpm_package))
        except (OSError, ValueError):
            pnpm_ok = False
    if pnpm_ok:
        pnpm_ok = external_command(
            "external-pnpm-import",
            (tools["pnpm"], "import"),
            pnpm_consumer,
            env,
            tools,
            results,
        )
    else:
        results.append(CommandResult("external-pnpm-import", ("pnpm", "import"), "<EXTERNAL>/pnpm", None, "blocked"))
    if pnpm_ok:
        try:
            package = load_json_file(pnpm_consumer / "package.json", "pnpm-consumer-package")
            local_core = package.get("dependencies", {}).get("@mindfoldhq/trellis-core")
            if not isinstance(local_core, str) or not local_core.startswith("file:"):
                raise ValueError("imported pnpm lock lacks the local Core binding")
            lock_path = pnpm_consumer / "pnpm-lock.yaml"
            lock_path.write_text(
                build_external_pnpm_lock(extraction, lock_path.read_text(encoding="utf-8"), local_core),
                encoding="utf-8",
            )
            results.append(CommandResult("external-pnpm-lock", ("reviewer", "reconstruct-pnpm-lock"), "<EXTERNAL>/pnpm", 0, "pass"))
        except (OSError, ValueError):
            results.append(CommandResult("external-pnpm-lock", ("reviewer", "reconstruct-pnpm-lock"), "<EXTERNAL>/pnpm", 1, "fail"))
            pnpm_ok = False
    else:
        results.append(CommandResult("external-pnpm-lock", ("reviewer", "reconstruct-pnpm-lock"), "<EXTERNAL>/pnpm", None, "blocked"))
    pnpm_install_argv = (
        tools["pnpm"],
        "install",
        "--offline",
        "--ignore-scripts",
        "--frozen-lockfile",
        "--config.trust-policy=false",
    )
    if pnpm_ok:
        pnpm_install_ok = external_command(
            "external-pnpm-install", pnpm_install_argv, pnpm_consumer, env, tools, results
        )
    else:
        pnpm_install_ok = False
        results.append(CommandResult("external-pnpm-install", evidence_argv(pnpm_install_argv, tools), "<EXTERNAL>/pnpm", None, "blocked"))
    if pnpm_install_ok:
        external_command(
            "external-pnpm-runtime", verify_argv, pnpm_consumer, env, tools, results, timeout=120
        )
        for alias in ("trellis", "tl"):
            alias_argv = (str(pnpm_consumer / "node_modules/.bin" / alias), "--help")
            external_command(
                f"external-pnpm-{alias}-alias", alias_argv, pnpm_consumer, env, tools, results, timeout=120
            )
    else:
        results.append(CommandResult("external-pnpm-runtime", evidence_argv(verify_argv, tools), "<EXTERNAL>/pnpm", None, "blocked"))
        for alias in ("trellis", "tl"):
            alias_argv = (str(pnpm_consumer / "node_modules/.bin" / alias), "--help")
            results.append(
                CommandResult(
                    f"external-pnpm-{alias}-alias",
                    evidence_argv(alias_argv, tools),
                    "<EXTERNAL>/pnpm",
                    None,
                    "blocked",
                )
            )

    procedure_paths, procedure_files, privacy_findings = scan_tarball_privacy(
        (core_tarball, cli_tarball), extraction
    )
    statuses = {row.command_id: row.status for row in results}
    npm_ok = all(
        statuses.get(command_id) == "pass"
        for command_id in (
            "external-npm-install",
            "external-npm-runtime",
            "external-npm-trellis-alias",
            "external-npm-tl-alias",
        )
    )
    pnpm_ok = all(
        statuses.get(command_id) == "pass"
        for command_id in (
            "external-pnpm-lock-seed",
            "external-pnpm-import",
            "external-pnpm-lock",
            "external-pnpm-install",
            "external-pnpm-runtime",
            "external-pnpm-trellis-alias",
            "external-pnpm-tl-alias",
        )
    )
    verdict = (
        "pass"
        if all(row.status == "pass" for row in results)
        and procedure_paths == set(PROCEDURE_IDS)
        and procedure_files == 204
        and not privacy_findings
        else "fail"
    )
    return results, {
        "verdict": verdict,
        "npm": npm_ok,
        "pnpm": pnpm_ok,
        "aliases": {
            "npm": {alias: statuses.get(f"external-npm-{alias}-alias") == "pass" for alias in ("trellis", "tl")},
            "pnpm": {alias: statuses.get(f"external-pnpm-{alias}-alias") == "pass" for alias in ("trellis", "tl")},
        },
        "procedureFamilyCount": len(procedure_paths),
        "procedureFileCount": procedure_files,
        "privacyFindings": sorted(set(privacy_findings)),
        "tarballs": {
            "core": {"sha256": sha256_bytes(core_tarball.read_bytes()), "byteLength": core_tarball.stat().st_size},
            "cli": {"sha256": sha256_bytes(cli_tarball.read_bytes()), "byteLength": cli_tarball.stat().st_size},
        },
    }

def validate_member_ledger_shape(
    value: Any,
) -> tuple[list[dict[str, Any]], list[str]]:
    errors: list[str] = []
    if not isinstance(value, dict):
        return [], ["top-level-not-object"]
    if set(value) != EXPECTED_MEMBER_LEDGER_KEYS:
        errors.append("top-level-field-set-mismatch")
    scalar_fields = {
        "schemaVersion": int,
        "kind": str,
        "contractVersion": str,
        "memberCount": int,
        "aggregateSha256": str,
        "acceptedContractDigest": str,
        "acceptedContractDigestRole": str,
        "aggregateDomain": str,
    }
    for field, expected_type in scalar_fields.items():
        item = value.get(field)
        if not isinstance(item, expected_type) or isinstance(item, bool):
            errors.append(f"invalid-field-type:{field}")
    raw_members = value.get("members")
    if not isinstance(raw_members, list):
        return [], [*errors, "members-not-array"]
    members: list[dict[str, Any]] = []
    for index, raw_member in enumerate(raw_members):
        if not isinstance(raw_member, dict):
            errors.append(f"member-not-object:{index}")
            continue
        if set(raw_member) != EXPECTED_MEMBER_RECORD_KEYS:
            errors.append(f"member-field-set-mismatch:{index}")
        member_path = raw_member.get("path")
        byte_length = raw_member.get("byteLength")
        digest = raw_member.get("sha256")
        role = raw_member.get("role")
        media_type = raw_member.get("mediaType")
        if not isinstance(member_path, str):
            errors.append(f"member-path-invalid:{index}")
        if not isinstance(role, str):
            errors.append(f"member-role-invalid:{index}")
        if not isinstance(media_type, str):
            errors.append(f"member-media-type-invalid:{index}")
        if (
            not isinstance(byte_length, int)
            or isinstance(byte_length, bool)
            or byte_length < 0
        ):
            errors.append(f"member-byte-length-invalid:{index}")
        if not isinstance(digest, str) or re.fullmatch(r"[0-9a-f]{64}", digest) is None:
            errors.append(f"member-sha256-invalid:{index}")
        if (
            isinstance(member_path, str)
            and isinstance(byte_length, int)
            and not isinstance(byte_length, bool)
            and byte_length >= 0
            and isinstance(digest, str)
            and isinstance(role, str)
            and isinstance(media_type, str)
        ):
            members.append(
                {
                    "path": member_path,
                    "role": role,
                    "mediaType": media_type,
                    "byteLength": byte_length,
                    "sha256": digest,
                }
            )
    return members, errors

def build_member_ledger(
    extraction: Path, git: str, env: dict[str, str]
) -> tuple[dict[str, Any], list[str]]:
    aggregate = hashlib.sha256()
    aggregate.update(b"trellis-accepted-v13-pack-members\0")
    members: list[dict[str, Any]] = []
    findings: list[str] = []
    contract_root = extraction / INSTALLED_PACK_ROOT
    try:
        observed_names = sorted(path.name for path in contract_root.iterdir())
    except OSError:
        observed_names = []
        findings.append("installed-contract-directory-missing-or-unreadable")
    if not installed_contract_inventory_valid(observed_names):
        findings.append("installed-contract-directory-set-mismatch")
    for name in PACK_MEMBERS:
        installed_path = contract_root / name
        try:
            installed = installed_path.read_bytes() if installed_path.is_file() else b""
        except OSError:
            installed = b""
        accepted_result = run_raw(
            (git, "show", f"{A133_COMMIT}:{A133_ROOT / name}"),
            cwd=extraction,
            env=env,
            check=False,
        )
        accepted = accepted_result.stdout if accepted_result.returncode == 0 else b""
        if accepted_result.returncode != 0:
            findings.append(f"accepted-member-unavailable:{name}")
        if not installed:
            findings.append(f"installed-member-missing:{name}")
        else:
            try:
                strict_json_bytes(installed, f"installed:{name}")
            except (UnicodeDecodeError, ValueError):
                findings.append(f"installed-member-invalid-json:{name}")
        exact_match = bool(accepted) and installed == accepted
        if not exact_match:
            findings.append(f"accepted-member-drift:{name}")
        aggregate.update(name.encode("utf-8"))
        aggregate.update(b"\0")
        aggregate.update(installed)
        aggregate.update(b"\0")
        members.append(
            {
                "path": name,
                "byteLength": len(installed),
                "sha256": sha256_bytes(installed),
                "matchesAcceptedA133Bytes": exact_match,
            }
        )
    ledger_path = contract_root / AUX_MEMBER_LEDGER
    try:
        ledger_bytes = ledger_path.read_bytes() if ledger_path.is_file() else b""
    except OSError:
        ledger_bytes = b""
    ledger: Any = None
    ledger_shape_errors: list[str] = []
    if ledger_bytes:
        try:
            ledger = strict_json_bytes(ledger_bytes, "installed:member-ledger")
        except (UnicodeDecodeError, ValueError):
            ledger_shape_errors.append("invalid-json")
    else:
        ledger_shape_errors.append("missing")
    ledger_members, shape_errors = validate_member_ledger_shape(ledger)
    ledger_shape_errors.extend(shape_errors)
    installed_identities = {
        member["path"]: (member["byteLength"], member["sha256"]) for member in members
    }
    ledger_valid = (
        not ledger_shape_errors
        and isinstance(ledger, dict)
        and ledger.get("schemaVersion") == 1
        and ledger.get("kind") == "trellis-installation-authentication-ledger"
        and ledger.get("contractVersion") == "evaluation-contract-v1.3.1"
        and ledger.get("memberCount") == len(PACK_MEMBERS)
        and ledger.get("aggregateSha256") == ACCEPTED_MEMBER_AGGREGATE
        and ledger.get("aggregateDomain") == EXPECTED_AGGREGATE_DOMAIN
        and ledger.get("acceptedContractDigest") == ACCEPTED_SEMANTIC_DIGEST
        and ledger.get("acceptedContractDigestRole")
        == EXPECTED_CONTRACT_DIGEST_ROLE
        and [record["path"] for record in ledger_members] == list(PACK_MEMBERS)
        and all(
            record["role"]
            == record["path"].removesuffix("-v1.3.1.json")
            and record["mediaType"] == "application/json"
            and installed_identities.get(record["path"])
            == (record["byteLength"], record["sha256"])
            for record in ledger_members
        )
    )
    if not ledger_valid:
        findings.append("installed-member-ledger-mismatch")
    observed_aggregate = f"sha256:{aggregate.hexdigest()}"
    if observed_aggregate != ACCEPTED_MEMBER_AGGREGATE:
        findings.append("accepted-member-aggregate-mismatch")
    return (
        {
            "schemaVersion": SCHEMA_VERSION,
            "recordKind": "t6-accepted-member-ledger",
            "contractVersion": "evaluation-contract-v1.3.1",
            "acceptedA133Commit": A133_COMMIT,
            "expectedAggregateSha256": ACCEPTED_MEMBER_AGGREGATE,
            "observedAggregateSha256": observed_aggregate,
            "members": members,
            "memberCount": len(members),
            "auxiliaryMemberLedger": {
                "path": AUX_MEMBER_LEDGER,
                "byteLength": len(ledger_bytes),
                "sha256": sha256_bytes(ledger_bytes),
                "shapeErrors": sorted(set(ledger_shape_errors)),
                "authenticated": ledger_valid,
            },
            "installedContractFileCount": len(observed_names),
            "verdict": "pass" if not findings else "fail",
        },
        findings,
    )

def load_json_file(path: Path, label: str) -> Any:
    return strict_json_bytes(path.read_bytes(), label)

def build_runtime_audit(
    extraction: Path,
    command_results: list[CommandResult],
    external: dict[str, Any],
    git: str,
    env: dict[str, str],
) -> tuple[dict[str, Any], list[str], list[dict[str, Any]]]:
    findings: list[str] = []
    coverage = load_json_file(extraction / T4_ROOT / "coverage-reconciliation.json", "coverage")
    effects = load_json_file(extraction / T4_ROOT / "filesystem-and-event-effects.json", "effects")
    freeze = strict_json_bytes(
        run_raw(
            (git, "show", f"{S1_COMMIT}:{FREEZE_PATH}"),
            cwd=extraction,
            env=env,
        ).stdout,
        "freeze",
    )
    evidence_path = extraction / T4_ROOT / "production-116-case-evidence.jsonl"
    evidence_rows = [
        strict_json_bytes(line, f"production-evidence:{index + 1}")
        for index, line in enumerate(evidence_path.read_bytes().splitlines())
        if line
    ]
    command_status = {row.command_id: row.status for row in command_results}
    observed_families = sorted(
        path.parent.parent.name
        for path in (extraction / PROCEDURE_ROOT).glob("*/2.0.7/procedure.json")
    )
    procedure_files = sum(
        1 for path in (extraction / PROCEDURE_ROOT).glob("*/2.0.7/**/*") if path.is_file()
    )
    live_source = (extraction / LIVE_SELECTION_PATH).read_text(encoding="utf-8")
    live_match = re.search(r'RESEARCH_PROCEDURE_CURRENT_VERSION\s*=\s*"([^"]+)"', live_source)
    live_version = None if live_match is None else live_match.group(1)
    populations = coverage.get("populations", {})
    checks = [
        ("historical-population", 229, populations.get("historical", {}).get("count")),
        ("expansion-population", 38, populations.get("expansion", {}).get("count")),
        ("production-population", 116, populations.get("production", {}).get("count")),
        ("harness-evidence-rows", 116, len(evidence_rows)),
        ("procedure-families", 17, len(observed_families)),
        ("procedure-files", 204, procedure_files),
        ("rejected-zero-write", 13, effects.get("rejectedZeroWriteCount")),
        ("live-procedure-version", "1.0.0", live_version),
        ("frozen-subject-commit", SUBJECT_COMMIT, freeze.get("frozenSubject", {}).get("commit")),
        ("frozen-subject-tree", SUBJECT_TREE, freeze.get("frozenSubject", {}).get("tree")),
    ]
    check_rows = []
    for check_id, expected, actual in checks:
        matches = actual == expected
        check_rows.append({"checkId": check_id, "expected": expected, "actual": actual, "matches": matches})
        if not matches:
            findings.append(f"runtime-check-failed:{check_id}")
    if observed_families != sorted(PROCEDURE_IDS):
        findings.append("procedure-family-identity-mismatch")
    if len({row.get("caseId") for row in evidence_rows}) != 116:
        findings.append("harness-case-identity-mismatch")
    if any(row.get("productionCallCount") != 1 for row in evidence_rows):
        findings.append("harness-production-call-count-mismatch")
    if any(
        row.get("actualProductionOutcome") != row.get("expectedProductionOutcome")
        or row.get("expectedCodesPresent") is not True
        for row in evidence_rows
    ):
        findings.append("harness-outcome-mismatch")
    rejected = [row for row in evidence_rows if row.get("actualProductionOutcome") == "rejected"]
    if any(row.get("zeroWrite") is not True or row.get("canonicalEventDelta", {}).get("appendedCount") != 0 for row in rejected):
        findings.append("rejected-case-write-observed")
    observed_command_ids = [row.command_id for row in command_results]
    if tuple(observed_command_ids) != REQUIRED_COMMAND_IDS:
        findings.append("required-command-inventory-mismatch")
    for command_id in REQUIRED_COMMAND_IDS:
        if command_status.get(command_id) != "pass":
            findings.append(f"required-command-not-pass:{command_id}")
    if external.get("verdict") != "pass":
        findings.append("external-install-audit-failed")
    audit = {
        "schemaVersion": SCHEMA_VERSION,
        "recordKind": "t6-runtime-contract-audit",
        "checks": check_rows,
        "requiredCommands": [
            {"commandId": command_id, "status": command_status.get(command_id)}
            for command_id in REQUIRED_COMMAND_IDS
        ],
        "coverage": {
            "coreAndCliSemantics": command_status.get("core-focused-semantics") == "pass"
            and command_status.get("cli-focused-complete-system") == "pass",
            "historicalReplay": command_status.get("cli-focused-complete-system") == "pass",
            "malformedOverrides": command_status.get("cli-focused-complete-system") == "pass",
            "externalInstallation": external,
            "procedureFamilies": observed_families,
            "productionEvidenceRows": len(evidence_rows),
        },
        "repairPerformed": False,
        "humanReviewed": False,
        "humanEquivalent": False,
        "verdict": "pass" if not findings else "fail",
    }
    return audit, findings, evidence_rows

def extraction_mutation_audit(
    extraction: Path, env: dict[str, str], tools: dict[str, str]
) -> tuple[dict[str, Any], list[str]]:
    entries = parse_status_entries(
        run_raw(
            (
                tools["git"],
                "status",
                "--porcelain=v1",
                "-z",
                "--untracked-files=all",
                "--ignored=matching",
            ),
            cwd=extraction,
            env=env,
        ).stdout
    )
    allowed_ignored = sorted(
        path
        for status, path in entries
        if status == "!!"
        and any(path == root.rstrip("/") or path.startswith(root) for root in EXTRACTION_EPHEMERAL_ROOTS)
    )
    unauthorized = sorted(
        {path for status, path in entries if not (status == "!!" and path in allowed_ignored)}
    )
    findings = ["extracted-subject-unauthorized-mutation"] if unauthorized else []
    return (
        {
            "schemaVersion": SCHEMA_VERSION,
            "recordKind": "t6-filesystem-mutation-audit",
            "subjectCommit": SUBJECT_COMMIT,
            "statusSource": "git-status-porcelain-v1-z-index-worktree-untracked-ignored",
            "observedStatus": [
                {"status": status, "path": path} for status, path in entries
            ],
            "allowedIgnoredPaths": allowed_ignored,
            "unauthorizedMutationPaths": unauthorized,
            "expectedEphemeralRoots": list(EXTRACTION_EPHEMERAL_ROOTS),
            "sourceWorktreeExpectedOutputs": list(M1_PATHS),
            "repairPerformed": False,
            "verdict": "pass" if not findings else "fail",
        },
        findings,
    )

def protected_worktree_audit(
    repo: Path, protected_root: Path, freeze: dict[str, Any], initial: dict[str, Any]
) -> tuple[dict[str, Any], list[str]]:
    findings: list[str] = []
    baseline, baseline_bytes = load_protected_baseline(repo)
    files, submodules, cs5 = protected_inventory(baseline)
    frozen_baseline = freeze.get("protectedState", {}).get("baseline", {})
    baseline_sha = sha256_bytes(baseline_bytes)
    immutable_ok = tuple(baseline.get("immutableExclusions", ())) == EXPECTED_IMMUTABLE_EXCLUSIONS
    if baseline_sha != frozen_baseline.get("sha256"):
        findings.append("protected-baseline-digest-mismatch")
    if not immutable_ok:
        findings.append("protected-immutable-exclusion-inventory-mismatch")

    def common_dir(root: Path) -> Path:
        value = Path(git_text(root, "rev-parse", "--git-common-dir"))
        return (value if value.is_absolute() else root / value).resolve()

    same_repository = protected_root.resolve() != repo.resolve() and common_dir(protected_root) == common_dir(repo)
    active_registration = active_reviewer_relative(repo, protected_root) == initial.get("excluded")
    if not same_repository:
        findings.append("protected-worktree-root-identity-mismatch")
    if not active_registration:
        findings.append("protected-active-reviewer-worktree-registration-drift")

    file_rows = []
    for expected in files:
        rel = expected["path"]
        try:
            observed = {
                "sha256": sha256_bytes((protected_root / rel).read_bytes()),
                "diffSha256": sha256_bytes(git_bytes(protected_root, "diff", "--binary", "--", rel)),
                "stagedEmpty": sha256_bytes(git_bytes(protected_root, "diff", "--cached", "--binary", "--", rel)) == EMPTY_SHA256,
            }
            matches = observed["sha256"] == expected.get("sha256") and observed["diffSha256"] == expected.get("gitDiffBinarySha256") and observed["stagedEmpty"]
        except (OSError, RuntimeError):
            observed, matches = {}, False
        if not matches:
            findings.append(f"protected-file-drift:{rel}")
        file_rows.append({"path": rel, **observed, "matches": matches})

    submodule_rows = []
    for expected in submodules:
        rel, root = expected["path"], protected_root / expected["path"]
        try:
            entries = git_status_entries(root)
            ignored = status_snapshot(root, (row for row in entries if row[0] == "!!"))
            ignored_delta = compare_status_snapshot(root, ignored, initial["ignored"][rel])
            index_fields = git_text(protected_root, "ls-files", "-s", "--", rel).split()
            indexed = index_fields[1] if len(index_fields) >= 2 else None
            observed = {
                "indexedCommit": indexed,
                "worktreeCommit": git_text(root, "rev-parse", "HEAD"),
                "nonIgnoredStatus": [f"{status} {name}" for status, name in entries if status != "!!"],
                "ignoredStatus": [f"{status} {name}" for status, name in ignored["entries"]],
                "ignoredAdded": ignored_delta[0],
                "ignoredMissing": ignored_delta[1],
                "ignoredContentDrift": ignored_delta[2],
                "diffSha256": sha256_bytes(git_bytes(root, "diff", "--binary")),
                "stagedEmpty": sha256_bytes(git_bytes(root, "diff", "--cached", "--binary")) == EMPTY_SHA256,
            }
            matches = (
                observed["indexedCommit"] == expected.get("commit")
                and observed["worktreeCommit"] == expected.get("commit")
                and observed["nonIgnoredStatus"] == expected.get("statusShort")
                and not any(ignored_delta)
                and observed["diffSha256"] == expected.get("gitDiffBinarySha256")
                and observed["stagedEmpty"]
            )
        except (KeyError, OSError, RuntimeError, ValueError):
            observed, matches = {}, False
        if not matches:
            findings.append(f"protected-submodule-drift:{rel}")
        submodule_rows.append({"path": rel, **observed, "matches": matches})

    cs5_path = cs5["path"]
    try:
        cs5_status = parse_status_entries(git_bytes(protected_root, "status", "--porcelain=v1", "-z", "--untracked-files=all", "--", cs5_path))
        cs5_observed_sha = sha256_bytes((protected_root / cs5_path).read_bytes())
        cs5_tracked = run_raw(("git", "-C", str(protected_root), "ls-files", "--error-unmatch", "--", cs5_path), cwd=protected_root, check=False).returncode == 0
        cs5_matches = cs5_observed_sha == cs5.get("sha256") and not cs5_tracked and cs5_status == [("??", cs5_path)]
    except (OSError, RuntimeError, ValueError):
        cs5_observed_sha, cs5_tracked, cs5_status, cs5_matches = None, None, [], False
    if not cs5_matches:
        findings.append("protected-untracked-cs5-drift")

    expected_paths = {item["path"] for item in (*files, *submodules)} | {cs5_path}
    final_rows = tuple((status, name) for status, name in git_status_entries(protected_root) if name not in expected_paths and name.rstrip("/") != initial.get("excluded"))
    final_snapshot = status_snapshot(protected_root, final_rows)
    unexpected_delta = compare_status_snapshot(protected_root, final_snapshot, initial["unexpected"])
    if unexpected_delta[0] or unexpected_delta[1]:
        findings.append("protected-unexpected-state-drift")
    if unexpected_delta[2]:
        findings.append("protected-unexpected-content-drift")

    evidence = {
        "schemaVersion": SCHEMA_VERSION,
        "recordKind": "t6-protected-worktree-audit",
        "excludedFromSemanticSubject": True,
        "sameRepository": same_repository,
        "activeReviewerWorktreeRegistrationMatches": active_registration,
        "baseline": {"path": str(G0_BASELINE_PATH), "sha256": baseline_sha, "matchesFrozenS1": baseline_sha == frozen_baseline.get("sha256")},
        "immutableExclusionsValidated": immutable_ok,
        "files": file_rows,
        "submodules": submodule_rows,
        "untrackedCs5Decision": {"path": cs5_path, "sha256": cs5_observed_sha, "tracked": cs5_tracked, "status": [f"{status} {name}" for status, name in cs5_status], "matches": cs5_matches},
        "runtimeUnexpectedStatus": {
            "initial": [f"{status} {name}" for status, name in initial["unexpected"]["entries"]],
            "final": [f"{status} {name}" for status, name in final_rows],
            "added": unexpected_delta[0], "missing": unexpected_delta[1], "contentDrift": unexpected_delta[2],
        },
        "verdict": "pass" if not findings else "fail",
    }
    return evidence, sorted(set(findings))

def reviewer_worktree_audit(repo: Path, baseline: dict[str, Any], allowed_output_paths: Iterable[str]) -> tuple[dict[str, Any], list[str]]:
    allowed = sorted(set(allowed_output_paths))
    entries = git_status_entries(repo)
    expected = set(baseline["entries"]) | {("??", path) for path in allowed}
    observed = set(entries)
    missing = sorted(path for status, path in expected - observed if status == "??")
    unauthorized = sorted(f"{status}:{path}" for status, path in observed - expected)
    drift = sorted(path for path, digest in baseline["digests"].items() if path_state_digest(repo / path) != digest)
    findings = []
    if unauthorized:
        findings.append("reviewer-worktree-unauthorized-mutation")
    if missing:
        findings.append("reviewer-worktree-output-inventory-mismatch")
    if drift:
        findings.append("reviewer-worktree-preexisting-state-drift")
    return {
        "sourceAndReviewerWorktreeSame": True,
        "preexistingStatus": [f"{status} {path}" for status, path in baseline["entries"]],
        "allowedOutputPaths": allowed,
        "observedStatus": [f"{status} {path}" for status, path in entries],
        "missingOutputPaths": missing,
        "unauthorizedMutations": unauthorized,
        "preexistingStateDriftPaths": drift,
        "verdict": "pass" if not findings else "fail",
    }, findings

def scan_private_bytes(outputs: dict[str, bytes], forbidden: tuple[bytes, ...]) -> list[str]:
    findings: list[str] = []
    for name, data in outputs.items():
        if any(needle and needle in data for needle in forbidden):
            findings.append(f"private-bytes:{name}")
    return findings

def cleanup_staging(staging: Path) -> None:
    if staging.is_dir():
        shutil.rmtree(staging)
    elif staging.exists():
        staging.unlink()

def stage_outputs(repo: Path, outputs: dict[str, bytes]) -> Path:
    if set(outputs) != set(M1_NAMES):
        raise ValueError("internal M1 output set mismatch")
    target = repo / ATTEMPT_ROOT
    staging = target.parent / f".{target.name}.t6-staging"
    if target.exists():
        cleanup_staging(staging)
        raise ValueError("final M1 output directory already exists")
    cleanup_staging(staging)
    try:
        staging.mkdir(parents=False, exist_ok=False)
        for name in M1_NAMES:
            (staging / name).write_bytes(outputs[name])
        if sorted(path.name for path in staging.iterdir()) != sorted(M1_NAMES):
            raise ValueError("staged M1 filename inventory mismatch")
        if any((staging / name).read_bytes() != outputs[name] for name in M1_NAMES):
            raise ValueError("staged M1 bytes mismatch")
        return staging
    except BaseException:
        cleanup_staging(staging)
        raise

def publish_outputs(repo: Path, outputs: dict[str, bytes], staging: Path) -> None:
    target = repo / ATTEMPT_ROOT
    try:
        if target.exists():
            raise ValueError("final M1 output directory already exists")
        if staging.parent != target.parent:
            raise ValueError("M1 staging directory is not adjacent to final destination")
        if sorted(path.name for path in staging.iterdir()) != sorted(M1_NAMES):
            raise ValueError("staged M1 filename inventory changed")
        if any((staging / name).read_bytes() != outputs[name] for name in M1_NAMES):
            raise ValueError("staged M1 bytes changed")
        os.rename(staging, target)
    except BaseException:
        cleanup_staging(staging)
        raise

def output_paths_unignored(repo: Path) -> bool:
    return all(run_raw(("git", "-C", str(repo), "check-ignore", "--no-index", "--", path), cwd=repo, check=False).returncode == 1 for path in M1_PATHS)

def audit_final_destination(repo: Path, outputs: dict[str, bytes], baseline: dict[str, Any]) -> tuple[dict[str, Any], list[str]]:
    target = repo / ATTEMPT_ROOT
    names = sorted(path.name for path in target.iterdir()) if target.is_dir() else []
    mismatches = [name for name in M1_NAMES if not (target / name).is_file() or (target / name).read_bytes() != outputs[name]]
    worktree, findings = reviewer_worktree_audit(repo, baseline, M1_PATHS)
    if names != sorted(M1_NAMES):
        findings.append("final-output-filename-inventory-mismatch")
    if mismatches:
        findings.append("final-output-bytes-mismatch")
    return {"observedNames": names, "byteMismatchNames": mismatches, "reviewerWorktree": worktree, "verdict": "pass" if not findings else "fail"}, sorted(set(findings))

def containment_check_results(
    network_probe: dict[str, Any],
    provider_attempt_names: list[str],
    provider_observation_complete: bool,
    protected_audit: dict[str, Any],
    pnpm_audit: dict[str, Any],
    privacy_findings: list[str],
    privacy_observed: bool,
    command_inventory_exact: bool,
    reviewer_audit: dict[str, Any],
) -> dict[str, bool]:
    return {
        "networkDenied": network_probe.get("verdict") == "pass",
        "providerAttemptObservationComplete": provider_observation_complete,
        "providerAttemptsAbsent": not provider_attempt_names,
        "protectedWorktreePass": protected_audit.get("verdict") == "pass",
        "pnpmIdentityPass": pnpm_audit.get("matches") is True,
        "privacyObservationComplete": privacy_observed,
        "tarballPrivacyPass": not privacy_findings,
        "commandInventoryExact": command_inventory_exact,
        "reviewerWorktreePass": reviewer_audit.get("verdict") == "pass",
    }

def attest_final_destination(
    repo: Path, outputs: dict[str, bytes], final_audit: dict[str, Any], forbidden: tuple[bytes, ...]
) -> dict[str, bytes]:
    target = repo / ATTEMPT_ROOT
    staging = target.parent / f".{target.name}.t6-staging"
    if not target.is_dir() or staging.exists() or final_audit.get("verdict") != "pass":
        raise ValueError("final destination cannot be attested")
    containment = strict_json_bytes(outputs["containment-audit.json"], "containment-audit")
    verdict = strict_json_bytes(outputs["machine-verdict.json"], "machine-verdict")
    if not isinstance(containment, dict) or not isinstance(verdict, dict):
        raise ValueError("final attestation evidence malformed")
    containment["checks"]["finalDestinationPass"] = True
    containment["finalDestinationAudit"] = final_audit
    containment["authoritative"] = True
    containment["finalDestinationAuditPending"] = False
    containment["finalDestinationAuditPassed"] = True
    verdict["authoritative"] = True
    verdict["finalDestinationAuditPending"] = False
    verdict["finalDestinationAuditPassed"] = True
    updated = dict(outputs)
    updated["containment-audit.json"] = canonical_bytes(containment)
    updated["machine-verdict.json"] = canonical_bytes(verdict)
    os.rename(target, staging)
    for name in ("containment-audit.json", "machine-verdict.json"):
        (staging / name).write_bytes(updated[name])
    if sorted(path.name for path in staging.iterdir()) != sorted(M1_NAMES) or any((staging / name).read_bytes() != updated[name] for name in M1_NAMES):
        raise ValueError("final attestation exact-nine validation failed")
    if scan_private_bytes(updated, forbidden):
        raise ValueError("final attestation contains private bytes")
    os.rename(staging, target)
    return updated

def build_reviewer_attestation(
    assignment: dict[str, Any], invocation: ReviewerInvocation, governed: dict[str, bool],
    scratch_created: bool, scratch_empty: bool, scratch_distinct: bool,
) -> tuple[dict[str, Any], list[str]]:
    assigned = assignment["assignment"]
    checks = {
        **governed,
        "scratchCreatedByReviewerProgram": scratch_created,
        "scratchInitiallyEmpty": scratch_empty,
        "scratchDistinctFromReviewerAndProtectedWorktrees": scratch_distinct,
    }
    findings = [f"reviewer-attestation-check-failed:{name}" for name, passed in checks.items() if not passed]
    evidence = {
        "schemaVersion": SCHEMA_VERSION,
        "recordKind": "t6-reviewer-session-attestation",
        "assignmentId": assigned.get("assignmentId"),
        "declaredAgentId": invocation.agent_id,
        "declaredSessionId": invocation.session_id,
        "assignedRuntimeClass": assigned.get("runtimeClass"),
        "assignedModelClass": assigned.get("modelClass"),
        "declaredResumed": invocation.resumed,
        "declaredSharedScratchWithT0ThroughT5": invocation.shared_scratch_with_t0_through_t5,
        "callerDeclarationsAreIdentityEvidence": False,
        "agentIdentityMechanicallyObserved": False,
        "sessionIdentityMechanicallyObserved": False,
        "resumeLineageMechanicallyObserved": False,
        "forkLineageMechanicallyObserved": False,
        "predecessorScratchSharingMechanicallyObserved": False,
        "fresh": None,
        "resumed": None,
        "forkedFromT0ThroughT5": None,
        "sharedScratchWithT0ThroughT5": None,
        **checks,
        "protectedWorktreeExcludedFromSemanticSubject": True,
        "machineOnly": True,
        "humanReviewed": False,
        "humanEquivalent": False,
        "futureT7MustDiffer": True,
        "runtimeAuthorizationGuardSatisfied": True,
        "committedAuthorityIsSemanticSource": True,
        "mechanicalLimitations": ["LLM identity and conversation lineage are not OS-observable; validated caller declarations are recorded without being treated as mechanical identity proof"],
        "verdict": "pass" if not findings else "fail",
    }
    return evidence, findings

def run_assurance(repo: Path, m0_commit: str, invocation: ReviewerInvocation) -> int:
    static_check()
    assignment, freeze, governed = authenticate_m0(repo, m0_commit, invocation)
    target = repo / ATTEMPT_ROOT
    staging_path = target.parent / f".{target.name}.t6-staging"
    if target.exists() or staging_path.exists() or not output_paths_unignored(repo):
        raise ValueError("M1 destination is present, staged, or ignored")
    reviewer_baseline = status_snapshot(repo)
    protected_baseline = capture_protected_worktree_runtime_baseline(repo, invocation.protected_worktree_root)
    findings: list[str] = []
    network_probe: dict[str, Any] = {"mechanism": "darwin-sandbox-exec-deny-network", "observationAvailable": False, "verdict": "fail"}
    pnpm_audit: dict[str, Any] = {"expectedVersion": EXPECTED_PNPM_VERSION, "expectedPackageManager": EXPECTED_PACKAGE_MANAGER, "matches": False}
    command_results = blocked_command_results("blocked-before-corpus")
    external_audit: dict[str, Any] = {"verdict": "fail", "npm": False, "pnpm": False, "aliases": {}, "procedureFamilyCount": 0, "procedureFileCount": 0, "privacyFindings": [], "reason": "assurance-corpus-not-executed"}
    member_ledger: dict[str, Any] = {"schemaVersion": SCHEMA_VERSION, "recordKind": "t6-accepted-member-ledger", "contractVersion": "evaluation-contract-v1.3.1", "acceptedA133Commit": A133_COMMIT, "expectedAggregateSha256": ACCEPTED_MEMBER_AGGREGATE, "members": [], "memberCount": 0, "verdict": "fail"}
    runtime_audit: dict[str, Any] = {"schemaVersion": SCHEMA_VERSION, "recordKind": "t6-runtime-contract-audit", "checks": [], "requiredCommands": [], "coverage": {}, "repairPerformed": False, "humanReviewed": False, "humanEquivalent": False, "verdict": "fail"}
    filesystem_audit: dict[str, Any] = {"schemaVersion": SCHEMA_VERSION, "recordKind": "t6-filesystem-mutation-audit", "subjectCommit": SUBJECT_COMMIT, "observedStatus": [], "unauthorizedMutationPaths": [], "repairPerformed": False, "verdict": "fail"}
    evidence_rows: list[dict[str, Any]] = []
    archive = b""
    subject_ready = scratch_created = scratch_empty = scratch_distinct = False
    provider_names: list[str] = []
    provider_observed = privacy_observed = False
    extraction_forbidden = b""

    try:
        network_probe = network_denial_probe()
        if network_probe.get("verdict") != "pass":
            findings.append("network-denial-not-mechanically-established")
        tools = resolve_tools()
        archive = archive_subject(repo)
        with tempfile.TemporaryDirectory(prefix="trellis-t6-mal1-") as temporary:
            extraction, scratch = Path(temporary) / "subject", Path(temporary) / "scratch"
            extraction_forbidden = str(extraction).encode()
            extract_subject(archive, extraction)
            scratch.mkdir()
            scratch_created, scratch_empty = True, not any(scratch.iterdir())
            scratch_distinct = not any(path_is_within(candidate, worktree) for candidate in (scratch, extraction) for worktree in (repo, invocation.protected_worktree_root))
            if not scratch_distinct:
                findings.append("reviewer-scratch-not-mechanically-distinct")
            env, provider_log = sanitized_environment(scratch / "runtime", extraction, tools)
            initialize_extracted_git(extraction, repo, m0_commit, env, tools["git"])
            subject_ready = True
            pnpm_audit, pnpm_matches = validate_pnpm_identity(tools, extraction, env)
            if not pnpm_matches:
                findings.append("pnpm-identity-mismatch")
                command_results = blocked_command_results("blocked-by-pnpm-identity-mismatch", tools)
                external_audit["reason"] = "pnpm-identity-mismatch"
            elif network_probe.get("verdict") != "pass":
                command_results = blocked_command_results("blocked-by-network-containment-failure", tools)
                external_audit["reason"] = "network-containment-failure"
            else:
                command_results = [execute_command(spec, extraction, env, tools) for spec in fixed_commands(tools)]
                try:
                    external_results, external_audit = run_external_install_audit(extraction, scratch / "external", env, tools)
                    privacy_observed = True
                    command_results.extend(external_results)
                except Exception:
                    findings.append("external-install-audit-malformed-or-failed")
            by_id = {result.command_id: result for result in command_results}
            for blocked in blocked_command_results("blocked-by-prior-failure"):
                by_id.setdefault(blocked.command_id, blocked)
            command_results = [by_id[command_id] for command_id in REQUIRED_COMMAND_IDS]
            provider_names = provider_attempts(provider_log)
            provider_observed = True
            if provider_names:
                findings.append("provider-execution-attempt-observed")
            try:
                member_ledger, observed = build_member_ledger(extraction, tools["git"], env)
                findings.extend(observed)
            except Exception:
                findings.append("installed-member-subject-malformed")
            try:
                runtime_audit, observed, evidence_rows = build_runtime_audit(extraction, command_results, external_audit, tools["git"], env)
                findings.extend(observed)
            except Exception:
                findings.append("runtime-evidence-subject-malformed")
            try:
                filesystem_audit, observed = extraction_mutation_audit(extraction, env, tools)
                findings.extend(observed)
            except Exception:
                findings.append("extracted-subject-status-observation-failed")
    except Exception:
        findings.append("subject-or-assurance-runtime-malformed")

    try:
        protected_audit, observed = protected_worktree_audit(repo, invocation.protected_worktree_root, freeze, protected_baseline)
        findings.extend(observed)
    except (OSError, RuntimeError, UnicodeDecodeError, ValueError, KeyError):
        protected_audit = {"schemaVersion": SCHEMA_VERSION, "recordKind": "t6-protected-worktree-audit", "verdict": "fail"}
        findings.append("protected-worktree-audit-failed")
    frozen = freeze.get("frozenSubject", {})
    exact_attestation = {
        "schemaVersion": SCHEMA_VERSION, "recordKind": "t6-exact-subject-attestation",
        "m0Commit": m0_commit, "m0FirstParent": PRIOR_M0_CORRECTION_COMMIT,
        "priorM0CorrectionFirstParent": INITIAL_M0_COMMIT, "initialM0FirstParent": S1_COMMIT,
        "s1": {"commit": S1_COMMIT, "tree": S1_TREE},
        "frozenTechnicalSubject": {"commit": SUBJECT_COMMIT, "tree": SUBJECT_TREE},
        "archiveTransport": {"format": "git-archive-tar", "byteLength": len(archive), "sha256": sha256_bytes(archive)},
        "freezeRecordMatches": frozen.get("commit") == SUBJECT_COMMIT and frozen.get("tree") == SUBJECT_TREE,
        "archiveExtractedAndAuthenticated": subject_ready, "worktreeOverlayUsed": False,
        "verdict": "pass" if subject_ready else "fail",
    }
    reviewer_attestation, observed = build_reviewer_attestation(assignment, invocation, governed, scratch_created, scratch_empty, scratch_distinct)
    findings.extend(observed)
    command_inventory_exact = tuple(result.command_id for result in command_results) == REQUIRED_COMMAND_IDS
    required_commands_pass = command_inventory_exact and all(result.status == "pass" for result in command_results)
    if not command_inventory_exact:
        findings.append("required-command-inventory-mismatch")
    if not required_commands_pass:
        findings.append("machine-required-command-set-not-pass")
    privacy = external_audit.get("privacyFindings")
    privacy_findings = [item for item in privacy if isinstance(item, str)] if isinstance(privacy, list) else ["external-privacy-audit-shape-invalid"]
    if privacy_findings:
        findings.append("tarball-privacy-finding")
    reviewer_audit, observed = reviewer_worktree_audit(repo, reviewer_baseline, ())
    findings.extend(observed)
    filesystem_audit["reviewerWorktree"] = reviewer_audit
    checks = containment_check_results(network_probe, provider_names, provider_observed, protected_audit, pnpm_audit, privacy_findings, privacy_observed, command_inventory_exact, reviewer_audit)
    checks["outputPrivacyPass"] = True
    if not all(checks.values()):
        findings.append("containment-condition-failed")
    containment = {
        "schemaVersion": SCHEMA_VERSION, "recordKind": "t6-containment-audit",
        "authoritative": False, "finalDestinationAuditPending": True,
        "postRenameAuditFailureDisposition": "return-nonzero-and-leave-complete-uncommitted-exact-nine-set",
        "networkAllowed": False, "networkDenial": network_probe, "offlinePackageResolutionRequired": True,
        "checks": checks,
        "providerContainment": {"mechanism": "controlled-path-with-provider-tripwire-wrappers", "authenticatedToolNames": list(REQUIRED_TOOL_NAMES), "tripwireExecutableNames": list(PROVIDER_EXECUTABLE_NAMES), "observedAttempts": provider_names, "attemptObserved": bool(provider_names), "coverageLimitation": "absolute provider executable paths are not independently traced"},
        "protectedWorktree": protected_audit, "pnpmIdentity": pnpm_audit, "reviewerWorktree": reviewer_audit,
        "repairPerformed": False, "activationPerformed": False, "acceptancePerformed": False,
        "archivePerformed": False, "releasePerformed": False, "publicationPerformed": False,
        "pushPerformed": False, "liveSelectionChangePerformed": False, "workerAuthorityChangePerformed": False,
        "currentLiveProcedureVersion": "1.0.0", "allocatedDormantProcedureVersion": "2.0.7",
        "tarballPrivacyFindings": privacy_findings, "verdict": "pass" if all(checks.values()) else "fail",
    }
    unique_findings = sorted(set(findings))
    machine_verdict = {
        "schemaVersion": SCHEMA_VERSION, "recordKind": "t6-machine-verdict",
        "contractVersion": "evaluation-contract-v1.3.1", "subjectCommit": SUBJECT_COMMIT, "subjectTree": SUBJECT_TREE,
        "reviewerAgentId": REVIEWER_AGENT_ID, "findingCount": len(unique_findings), "findings": unique_findings,
        "requiredCommandIds": list(REQUIRED_COMMAND_IDS), "requiredCommandsPass": required_commands_pass,
        "requiredOutputCount": 9, "requiredOutputPaths": list(M1_PATHS),
        "humanReviewed": False, "humanEquivalent": False, "repairPerformed": False,
        "acceptanceAuthority": False, "activationAuthority": False,
        "authoritative": False, "finalDestinationAuditPending": True,
        "verdict": "fail" if unique_findings else "pass",
    }
    command_rows = []
    for ordinal, result in enumerate(command_results):
        row = result.evidence(); row["ordinal"] = ordinal; command_rows.append(row)
    outputs = {
        "exact-subject-attestation.json": canonical_bytes(exact_attestation),
        "reviewer-session-attestation.json": canonical_bytes(reviewer_attestation),
        "accepted-member-ledger.json": canonical_bytes(member_ledger),
        "runtime-contract-audit.json": canonical_bytes(runtime_audit),
        "harness-case-evidence.jsonl": jsonl_bytes(evidence_rows),
        "command-evidence-ledger.jsonl": jsonl_bytes(command_rows),
        "filesystem-mutation-audit.json": canonical_bytes(filesystem_audit),
        "containment-audit.json": canonical_bytes(containment),
        "machine-verdict.json": canonical_bytes(machine_verdict),
    }
    forbidden = (str(repo).encode(), extraction_forbidden, str(invocation.protected_worktree_root.resolve()).encode(), str(Path.home()).encode(), b"ANTHROPIC_API_KEY=", b"OPENAI_API_KEY=", b"AWS_SECRET_ACCESS_KEY=")
    if scan_private_bytes(outputs, forbidden):
        raise ValueError("prepublication evidence contains private bytes")
    staging = stage_outputs(repo, outputs)
    staging_paths = [str((staging / name).relative_to(repo)) for name in M1_NAMES]
    _, staging_findings = reviewer_worktree_audit(repo, reviewer_baseline, staging_paths)
    if staging_findings:
        cleanup_staging(staging)
        raise ValueError("prepublication staging containment failed")
    publish_outputs(repo, outputs, staging)
    final_audit, final_findings = audit_final_destination(repo, outputs, reviewer_baseline)
    if final_findings:
        sys.stdout.write(json.dumps({"verdict": "fail", "findingCount": len(unique_findings) + len(final_findings), "finalDestinationAudit": "fail"}) + "\n")
        return 1
    outputs = attest_final_destination(repo, outputs, final_audit, forbidden)
    verdict = strict_json_bytes(outputs["machine-verdict.json"], "verdict")
    sys.stdout.write(json.dumps({"verdict": verdict["verdict"], "findingCount": verdict["findingCount"]}) + "\n")
    return 0 if verdict["verdict"] == "pass" else 1

def focused_self_check() -> list[str]:
    validate_m0_changed_paths(M0_PATHS, (str(SCRIPT_PATH),), M0_PATHS)
    blocked = blocked_command_results("self-check")
    if (
        tuple(result.command_id for result in blocked) != REQUIRED_COMMAND_IDS
        or any(result.status != "blocked" for result in blocked)
    ):
        raise ValueError("deterministic blocked inventory self-check failed")
    if status_short_lines(b" M tracked\0!! cache/\0") != [
        " M tracked",
        "!! cache/",
    ]:
        raise ValueError("status parser self-check failed")
    passing = containment_check_results(
        {"verdict": "pass"}, [], True, {"verdict": "pass"},
        {"matches": True}, [], True, True, {"verdict": "pass"}
    )
    unobserved = (
        containment_check_results(
            {"verdict": "pass"}, [], False, {"verdict": "pass"},
            {"matches": True}, [], True, True, {"verdict": "pass"}
        ),
        containment_check_results(
            {"verdict": "pass"}, [], True, {"verdict": "pass"},
            {"matches": True}, [], False, True, {"verdict": "pass"}
        ),
    )
    if not all(passing.values()) or any(all(result.values()) for result in unobserved):
        raise ValueError("containment verdict self-check failed")
    rejected = 0
    for payload in (b'{"x":1,"x":2}\n', b'{"x":NaN}\n'):
        try:
            strict_json_bytes(payload, "self-check-malformed-json")
        except ValueError:
            rejected += 1
    if rejected != 2:
        raise ValueError("strict JSON self-check failed")
    return [
        "exact-m0-inventory",
        "deterministic-blocked-inventory",
        "status-parser",
        "containment-verdict",
        "strict-json",
    ]

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-check", action="store_true")
    mode.add_argument("--run", action="store_true")
    parser.add_argument("--repo", type=Path, default=Path(__file__).resolve().parents[5])
    parser.add_argument("--m0-commit")
    parser.add_argument("--reviewer-agent-id")
    parser.add_argument("--reviewer-session-id")
    parser.add_argument("--reviewer-worktree", type=Path)
    parser.add_argument("--protected-worktree-root", type=Path)
    parser.add_argument("--reviewer-resumed", choices=("true", "false"))
    parser.add_argument("--shared-scratch-with-t0-through-t5", choices=("true", "false"))
    parser.add_argument("--confirm-separate-m1-authorization", action="store_true")
    return parser.parse_args()

def main() -> int:
    args = parse_args()
    run_inputs = (
        args.m0_commit,
        args.reviewer_agent_id,
        args.reviewer_session_id,
        args.reviewer_worktree,
        args.protected_worktree_root,
        args.reviewer_resumed,
        args.shared_scratch_with_t0_through_t5,
    )
    if args.self_check:
        if any(value is not None for value in run_inputs) or args.confirm_separate_m1_authorization:
            raise SystemExit("self-check accepts no M1 authorization or reviewer runtime arguments")
        result = static_check()
        result["focusedChecks"] = focused_self_check()
        sys.stdout.write(json.dumps(result, sort_keys=True) + "\n")
        return 0
    if any(value is None for value in run_inputs):
        raise SystemExit("--run requires exact M0, reviewer identity, worktree, and scratch declarations")
    if not args.confirm_separate_m1_authorization:
        raise SystemExit("--run requires --confirm-separate-m1-authorization")
    invocation = ReviewerInvocation(
        agent_id=args.reviewer_agent_id,
        session_id=args.reviewer_session_id,
        worktree=args.reviewer_worktree.resolve(),
        protected_worktree_root=args.protected_worktree_root.resolve(),
        resumed=args.reviewer_resumed == "true",
        shared_scratch_with_t0_through_t5=args.shared_scratch_with_t0_through_t5 == "true",
    )
    ensure_network_sandbox()
    return run_assurance(args.repo.resolve(), args.m0_commit, invocation)

if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (ValueError, RuntimeError) as error:
        sys.stderr.write(f"T6 MAL-1 stopped: {error}\n")
        raise SystemExit(2)
