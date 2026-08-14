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
import shutil
import socket
import subprocess
import sys
import tarfile
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

SCHEMA_VERSION = 1
S1_COMMIT = "e6b80d640f0bd264c1acfe6bab906cb3e4ae535a"
S1_TREE = "1304e0faa7262cd1c80cd3e8ab9b01057809f9e0"
INITIAL_M0_COMMIT = "87317a7b78d531df37c1f84970fef020a8e77ace"
SUBJECT_COMMIT = "57572e77f81148bc6aae6d3b727db33a09e45f23"
SUBJECT_TREE = "8e2acbf86f6820b6f3557fa5d6b186226284351b"
A133_COMMIT = "5a038a87531c3dbfa7b52ba82eaa59d856ab1ea3"
ACCEPTED_SEMANTIC_DIGEST = "sha256:8e2cd20dd8e12caab318852f82a100116a28d405113f654efbda7b3646f666af"
ACCEPTED_MEMBER_AGGREGATE = "sha256:718d7ecec808199148b63ce64208e60d52be18575b175df67ef620596107fa34"
REVIEWER_AGENT_ID = "claude-t6-mal1-reviewer-01"
REVIEWER_SESSION_ID = "claude-t6-mal1-reviewer-session-01"
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


def installed_contract_inventory_valid(names: Iterable[str]) -> bool:
    return sorted(names) == sorted((*PACK_MEMBERS, AUX_MEMBER_LEDGER))


def static_check() -> dict[str, Any]:
    if len(M0_PATHS) != 3 or len(set(M0_PATHS)) != 3:
        raise ValueError("M0 inventory must contain exactly three unique paths")
    if len(M1_PATHS) != 9 or len(set(M1_PATHS)) != 9:
        raise ValueError("M1 inventory must contain exactly nine unique paths")
    if set(M0_PATHS) & set(M1_PATHS):
        raise ValueError("M0 and M1 inventories overlap")
    for value in (S1_COMMIT, S1_TREE, INITIAL_M0_COMMIT, SUBJECT_COMMIT, SUBJECT_TREE, A133_COMMIT):
        if re.fullmatch(r"[0-9a-f]{40}", value) is None:
            raise ValueError(f"invalid Git object identity: {value}")
    for value in (ACCEPTED_SEMANTIC_DIGEST, ACCEPTED_MEMBER_AGGREGATE):
        if re.fullmatch(r"sha256:[0-9a-f]{64}", value) is None:
            raise ValueError(f"invalid digest identity: {value}")
    if len(PACK_MEMBERS) != 7 or len(PROCEDURE_IDS) != 17:
        raise ValueError("frozen population constants drifted")
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


def authenticate_m0(
    repo: Path, m0_commit: str, invocation: ReviewerInvocation
) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    if git_text(repo, "rev-parse", "HEAD") != m0_commit:
        raise ValueError("current HEAD is not the explicitly supplied M0 correction commit")
    if git_text(repo, "rev-parse", f"{m0_commit}^1") != INITIAL_M0_COMMIT:
        raise ValueError("M0 correction is not committed directly on exact initial M0")
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
    correction_paths = sorted(
        line
        for line in git_text(repo, "diff-tree", "--no-commit-id", "--name-only", "-r", m0_commit).splitlines()
        if line
    )
    if initial_paths != sorted(M0_PATHS):
        raise ValueError(f"initial M0 changed-path mismatch: {initial_paths}")
    if correction_paths != [str(SCRIPT_PATH)]:
        raise ValueError(f"M0 correction changed-path mismatch: {correction_paths}")
    if parse_status_paths(
        git_bytes(
            repo,
            "status",
            "--porcelain=v1",
            "-z",
            "--untracked-files=all",
            "--ignored=matching",
        )
    ):
        raise ValueError("M1 must start from a clean committed reviewer worktree")

    assignment = strict_json_bytes(git_object(repo, m0_commit, str(ASSIGNMENT_PATH)), "assignment")
    task = strict_json_bytes(git_object(repo, m0_commit, str(TASK_ROOT / "task.json")), "task")
    freeze = strict_json_bytes(git_object(repo, S1_COMMIT, str(FREEZE_PATH)), "freeze")
    if git_object(repo, m0_commit, str(SCRIPT_PATH)) != (repo / SCRIPT_PATH).read_bytes():
        raise ValueError("reviewer program bytes differ from committed M0 correction")

    expected_identity = {
        "agentId": REVIEWER_AGENT_ID,
        "assignedRole": "fresh-complete-system-mal1-reviewer",
        "assignmentDate": "2026-08-14",
        "assignmentId": "t6-m0-reviewer-assignment-20260814-a",
        "fresh": True,
        "machineOnly": True,
        "modelClass": "gpt-5.6-sol",
        "runtimeClass": "claude-code-isolated-agent-worktree",
        "sessionId": REVIEWER_SESSION_ID,
        "status": "assigned-awaiting-separate-m1-authorization",
    }
    expected_authority = {
        "activationAuthorized": False,
        "archiveAuthorized": False,
        "assuranceRunAuthorized": False,
        "completeSystemAcceptanceAuthorized": False,
        "humanEquivalent": False,
        "humanReviewed": False,
        "liveSelectionChangeAuthorized": False,
        "m0CommitAuthorized": True,
        "m0OutputWriteAuthorized": True,
        "m1OutputWriteAuthorized": False,
        "networkAuthorized": False,
        "providerExecutionAuthorized": False,
        "publicationAuthorized": False,
        "pushAuthorized": False,
        "releaseAuthorized": False,
        "repairAuthority": False,
        "runtimeActivationAuthorized": False,
        "taskExecutionAuthorized": False,
        "technicalOperatorDecisionAuthorized": False,
        "workerAuthorityChangeAuthorized": False,
    }
    expected_inputs = {
        "frozenTechnicalSubject": {"commit": SUBJECT_COMMIT, "tree": SUBJECT_TREE},
        "s1FreezeBoundary": {
            "commit": S1_COMMIT,
            "firstParent": SUBJECT_COMMIT,
            "tree": S1_TREE,
        },
    }
    expected_isolation = {
        "currentWorktreeAsAssuranceSubjectAuthorized": False,
        "distinctTemporaryExtractionRequired": True,
        "networkOrProviderInputAuthorized": False,
        "reviewerMayReadCommittedGitObjectsOnly": True,
        "subjectTransport": "git-archive",
        "worktreeOverlayAuthorized": False,
    }
    expected_outputs = {
        "m0": {"count": len(M0_PATHS), "paths": list(M0_PATHS)},
        "m1": {"count": len(M1_PATHS), "paths": list(M1_PATHS)},
        "unknownOutputDisposition": "fail-and-stop",
    }
    expected_role_separation = {
        "futureT7MustRejectReviewerAgentAndSession": True,
        "reviewerMayNotAcceptActivateArchiveReleasePublishOrPush": True,
        "reviewerMayNotRepair": True,
        "reviewerMayProduceOnlyMachinePassOrFail": True,
        "t0ThroughT5Actors": list(EXPECTED_ACTORS),
        "t0ThroughT5Distinct": True,
    }
    expected_boundary = {
        "currentBoundary": "M0",
        "m0MayCommitAfterRequiredVerification": True,
        "m1MayRunOnlyAfterCommittedM0AndSeparateUserAuthorization": True,
        "reviewerProgramSelfCheckMayNotEmitM1Evidence": True,
        "worktreePresenceDoesNotAuthorizeM1": True,
    }
    expected_program = {
        "normalRunRequiresExplicitM0Commit": True,
        "normalRunRequiresExplicitSeparateAuthorizationFlag": True,
        "path": str(SCRIPT_PATH),
        "selfCheckWritesEvidence": False,
        "standardLibraryOnly": True,
    }
    exact_sections = (
        ("assignment", expected_identity),
        ("authority", expected_authority),
        ("exactInputs", expected_inputs),
        ("inputIsolation", expected_isolation),
        ("outputAuthorization", expected_outputs),
        ("roleSeparation", expected_role_separation),
        ("authorizationBoundary", expected_boundary),
        ("reviewerProgram", expected_program),
    )
    for section, expected in exact_sections:
        if assignment.get(section) != expected:
            raise ValueError(f"committed reviewer assignment {section} drifted")
    if assignment.get("commitBoundary") != "M0" or assignment.get("schemaVersion") != SCHEMA_VERSION:
        raise ValueError("committed reviewer assignment boundary drifted")

    task_meta = task.get("meta", {})
    expected_task_values = {
        "acceptedSemanticDigest": ACCEPTED_SEMANTIC_DIGEST,
        "activationAuthorized": False,
        "archiveAuthorized": False,
        "assuranceRunAuthorized": False,
        "commitAuthorized": True,
        "completeSystemAcceptanceAuthorized": False,
        "currentCommitBoundary": "M0",
        "humanEquivalent": False,
        "humanReviewed": False,
        "liveProcedure": "1.0.0",
        "liveSelectionChangeAuthorized": False,
        "m0CommitAuthorized": True,
        "m0ExecutionAuthorized": True,
        "ownerRole": REVIEWER_AGENT_ID,
        "providerExecutionAuthorized": False,
        "publicationAuthorized": False,
        "pushAuthorized": False,
        "releaseAuthorized": False,
        "repairAuthority": False,
        "runtimeActivationAuthorized": False,
        "taskExecutionAuthorized": False,
        "workerAuthorityChangeAuthorized": False,
    }
    if any(task_meta.get(key) != value for key, value in expected_task_values.items()):
        raise ValueError("task execution or publication governance drifted")
    if task_meta.get("commitBoundaries") != ["M0", "M1"] or task_meta.get("ownedInventoryKeys") != ["M0", "M1"]:
        raise ValueError("task M0/M1 inventory governance drifted")
    if task.get("assignee") != REVIEWER_AGENT_ID or task.get("branch") != "claude-t6-mal1-reviewer-01-m0":
        raise ValueError("task reviewer identity or branch drifted")

    assigned_worktree = Path(task.get("worktree_path", "")).resolve()
    if invocation.agent_id != REVIEWER_AGENT_ID or invocation.session_id != REVIEWER_SESSION_ID:
        raise ValueError("explicit reviewer agent or session identity mismatch")
    if invocation.resumed or invocation.shared_scratch_with_t0_through_t5:
        raise ValueError("reviewer invocation is resumed or shares predecessor scratch")
    if invocation.worktree.resolve() != repo or assigned_worktree != repo:
        raise ValueError("explicit or committed reviewer worktree mismatch")
    if Path.cwd().resolve() != repo or Path(git_text(repo, "rev-parse", "--show-toplevel")).resolve() != repo:
        raise ValueError("observed cwd is not the assigned reviewer worktree")
    if git_text(repo, "branch", "--show-current") != task.get("branch"):
        raise ValueError("observed reviewer branch mismatch")

    frozen = freeze.get("frozenSubject", {})
    if frozen.get("commit") != SUBJECT_COMMIT or frozen.get("tree") != SUBJECT_TREE:
        raise ValueError("frozen technical subject mismatch")
    if git_text(repo, "rev-parse", f"{SUBJECT_COMMIT}^{{tree}}") != SUBJECT_TREE:
        raise ValueError("observed technical subject tree mismatch")
    if git_text(repo, "rev-parse", f"{S1_COMMIT}^1") != SUBJECT_COMMIT:
        raise ValueError("S1 first-parent mismatch")
    return assignment, task, freeze


def sanitized_environment(runtime: Path, package_cwd: Path, tools: dict[str, str]) -> dict[str, str]:
    home = runtime / "home"
    temp = runtime / "tmp"
    for path in (home, temp, runtime / "cache", runtime / "config", runtime / "data"):
        path.mkdir(parents=True, exist_ok=True)
    npm_cache = run_raw((tools["npm"], "config", "get", "cache"), cwd=package_cwd).stdout.decode().strip()
    pnpm_store = run_raw((tools["pnpm"], "store", "path"), cwd=package_cwd).stdout.decode().strip()
    corepack_home = os.environ.get("COREPACK_HOME", str(Path.home() / ".cache/node/corepack"))
    if not npm_cache or not pnpm_store:
        raise ValueError("offline package cache location is unavailable")
    path_entries = sorted({str(Path(value).parent) for value in tools.values()})
    path_entries.extend(("/usr/bin", "/bin"))
    return {
        "PATH": os.pathsep.join(path_entries),
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
    }


def resolve_tools() -> dict[str, str]:
    tools: dict[str, str] = {}
    for name in ("git", "node", "npm", "pnpm"):
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
            if not isinstance(package_manager, str) or not package_manager.startswith("pnpm@"):
                raise ValueError("frozen subject lacks an exact pnpm package manager")
            pnpm_package["packageManager"] = package_manager
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
    for tarball in (core_tarball, cli_tarball):
        with tarfile.open(tarball, mode="r:gz") as archive:
            for member in archive.getmembers():
                name = member.name
                if "/.git/" in f"/{name}/" or "/node_modules/" in f"/{name}/" or "/.trellis/tasks/" in f"/{name}/":
                    privacy_findings.append(f"forbidden-member:{name}")
                match = re.search(r"/procedures/([^/]+)/2\.0\.7/", f"/{name}")
                if match:
                    procedure_paths.add(match.group(1))
                    if member.isfile():
                        procedure_files += 1
                if member.isfile() and member.size <= 16 * 1024 * 1024:
                    stream = archive.extractfile(member)
                    data = b"" if stream is None else stream.read()
                    if any(needle and needle in data for needle in forbidden):
                        privacy_findings.append(f"forbidden-bytes:{name}")
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


def build_member_ledger(extraction: Path) -> tuple[dict[str, Any], list[str]]:
    aggregate = hashlib.sha256()
    aggregate.update(b"trellis-accepted-v13-pack-members\0")
    members: list[dict[str, Any]] = []
    findings: list[str] = []
    observed_names = sorted(path.name for path in (extraction / INSTALLED_PACK_ROOT).iterdir())
    if not installed_contract_inventory_valid(observed_names):
        findings.append("installed-contract-directory-set-mismatch")
    for name in PACK_MEMBERS:
        installed_path = extraction / INSTALLED_PACK_ROOT / name
        installed = installed_path.read_bytes() if installed_path.is_file() else b""
        accepted = run_raw(
            ("git", "show", f"{A133_COMMIT}:{A133_ROOT / name}"),
            cwd=extraction,
        ).stdout
        if not installed:
            findings.append(f"installed-member-missing:{name}")
        else:
            try:
                strict_json_bytes(installed, f"installed:{name}")
            except (UnicodeDecodeError, ValueError):
                findings.append(f"installed-member-invalid-json:{name}")
        exact_match = installed == accepted
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
    ledger_path = extraction / INSTALLED_PACK_ROOT / AUX_MEMBER_LEDGER
    ledger_bytes = ledger_path.read_bytes() if ledger_path.is_file() else b""
    try:
        ledger = strict_json_bytes(ledger_bytes, "installed:member-ledger") if ledger_bytes else {}
    except (UnicodeDecodeError, ValueError):
        ledger = {}
    ledger_members = ledger.get("members", []) if isinstance(ledger, dict) else []
    installed_identities = {
        member["path"]: (member["byteLength"], member["sha256"]) for member in members
    }
    ledger_valid = (
        isinstance(ledger, dict)
        and ledger.get("schemaVersion") == 1
        and ledger.get("kind") == "trellis-installation-authentication-ledger"
        and ledger.get("contractVersion") == "evaluation-contract-v1.3.1"
        and ledger.get("memberCount") == len(PACK_MEMBERS)
        and ledger.get("aggregateSha256") == ACCEPTED_MEMBER_AGGREGATE
        and ledger.get("acceptedContractDigest") == ACCEPTED_SEMANTIC_DIGEST
        and [record.get("path") for record in ledger_members] == list(PACK_MEMBERS)
        and all(
            installed_identities.get(record.get("path"))
            == (record.get("byteLength"), record.get("sha256"))
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
) -> tuple[dict[str, Any], list[str], list[dict[str, Any]]]:
    findings: list[str] = []
    coverage = load_json_file(extraction / T4_ROOT / "coverage-reconciliation.json", "coverage")
    effects = load_json_file(extraction / T4_ROOT / "filesystem-and-event-effects.json", "effects")
    freeze = strict_json_bytes(
        run_raw(("git", "show", f"{S1_COMMIT}:{FREEZE_PATH}"), cwd=extraction).stdout,
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
    repo: Path, protected_root: Path, freeze: dict[str, Any]
) -> tuple[dict[str, Any], list[str]]:
    findings: list[str] = []
    baseline_bytes = git_object(repo, S1_COMMIT, str(G0_BASELINE_PATH))
    baseline = strict_json_bytes(baseline_bytes, "protected-baseline")
    frozen_baseline = freeze.get("protectedState", {}).get("baseline", {})
    if sha256_bytes(baseline_bytes) != frozen_baseline.get("sha256"):
        findings.append("protected-baseline-digest-mismatch")

    protected_root = protected_root.resolve()
    repo_common_text = git_text(repo, "rev-parse", "--git-common-dir")
    protected_common_text = git_text(protected_root, "rev-parse", "--git-common-dir")
    repo_common = Path(repo_common_text)
    protected_common = Path(protected_common_text)
    if not repo_common.is_absolute():
        repo_common = repo / repo_common
    if not protected_common.is_absolute():
        protected_common = protected_root / protected_common
    same_repository = repo_common.resolve() == protected_common.resolve()
    if protected_root == repo or not same_repository:
        findings.append("protected-worktree-root-identity-mismatch")

    file_rows = []
    for expected in baseline.get("files", []):
        path = expected["path"]
        current_sha = sha256_bytes((protected_root / path).read_bytes())
        diff_sha = sha256_bytes(git_bytes(protected_root, "diff", "--binary", "--", path))
        staged_sha = sha256_bytes(git_bytes(protected_root, "diff", "--cached", "--binary", "--", path))
        matches = (
            current_sha == expected["sha256"]
            and diff_sha == expected["gitDiffBinarySha256"]
            and staged_sha == EMPTY_SHA256
        )
        if not matches:
            findings.append(f"protected-file-drift:{path}")
        file_rows.append(
            {
                "path": path,
                "sha256": current_sha,
                "expectedSha256": expected["sha256"],
                "gitDiffBinarySha256": diff_sha,
                "expectedGitDiffBinarySha256": expected["gitDiffBinarySha256"],
                "stagedDiffEmpty": staged_sha == EMPTY_SHA256,
                "matches": matches,
            }
        )

    submodule_rows = []
    for expected in baseline.get("submodules", []):
        path = expected["path"]
        submodule = protected_root / path
        index_line = git_text(protected_root, "ls-files", "-s", "--", path)
        index_fields = index_line.split()
        indexed_commit = index_fields[1] if len(index_fields) >= 2 else None
        worktree_commit = git_text(submodule, "rev-parse", "HEAD")
        status_short = git_bytes(
            submodule, "status", "--short", "--untracked-files=all"
        ).decode("utf-8").splitlines()
        diff_sha = sha256_bytes(git_bytes(submodule, "diff", "--binary"))
        staged_sha = sha256_bytes(git_bytes(submodule, "diff", "--cached", "--binary"))
        matches = (
            indexed_commit == expected["commit"]
            and worktree_commit == expected["commit"]
            and status_short == expected["statusShort"]
            and diff_sha == expected["gitDiffBinarySha256"]
            and staged_sha == EMPTY_SHA256
        )
        if not matches:
            findings.append(f"protected-submodule-drift:{path}")
        submodule_rows.append(
            {
                "path": path,
                "indexedCommit": indexed_commit,
                "worktreeCommit": worktree_commit,
                "expectedCommit": expected["commit"],
                "statusShort": status_short,
                "expectedStatusShort": expected["statusShort"],
                "gitDiffBinarySha256": diff_sha,
                "expectedGitDiffBinarySha256": expected["gitDiffBinarySha256"],
                "stagedDiffEmpty": staged_sha == EMPTY_SHA256,
                "matches": matches,
            }
        )

    expected_cs5 = baseline.get("untrackedCs5Decision", {})
    cs5_path = expected_cs5.get("path", "")
    cs5_file = protected_root / cs5_path
    cs5_sha = sha256_bytes(cs5_file.read_bytes())
    tracked = run_raw(
        ("git", "-C", str(protected_root), "ls-files", "--error-unmatch", "--", cs5_path),
        cwd=protected_root,
        check=False,
    ).returncode == 0
    cs5_status = parse_status_entries(
        git_bytes(
            protected_root,
            "status",
            "--porcelain=v1",
            "-z",
            "--untracked-files=all",
            "--ignored=matching",
            "--",
            cs5_path,
        )
    )
    cs5_matches = (
        cs5_sha == expected_cs5.get("sha256")
        and not tracked
        and cs5_status == [("??", cs5_path)]
    )
    if not cs5_matches:
        findings.append("protected-untracked-cs5-drift")

    return (
        {
            "schemaVersion": SCHEMA_VERSION,
            "recordKind": "t6-protected-worktree-audit",
            "excludedFromSemanticSubject": True,
            "sameRepository": same_repository,
            "baseline": {
                "path": str(G0_BASELINE_PATH),
                "sha256": sha256_bytes(baseline_bytes),
                "matchesFrozenS1": sha256_bytes(baseline_bytes) == frozen_baseline.get("sha256"),
            },
            "files": file_rows,
            "submodules": submodule_rows,
            "untrackedCs5Decision": {
                "path": cs5_path,
                "sha256": cs5_sha,
                "expectedSha256": expected_cs5.get("sha256"),
                "tracked": tracked,
                "status": [
                    {"status": status, "path": path} for status, path in cs5_status
                ],
                "matches": cs5_matches,
            },
            "verdict": "pass" if not findings else "fail",
        },
        findings,
    )


def reviewer_worktree_audit(
    repo: Path, staging: Path
) -> tuple[dict[str, Any], list[str]]:
    entries = parse_status_entries(
        git_bytes(
            repo,
            "status",
            "--porcelain=v1",
            "-z",
            "--untracked-files=all",
            "--ignored=matching",
        )
    )
    expected_paths = {
        str((staging / name).relative_to(repo)) for name in M1_NAMES
    }
    observed_staging = {
        path for status, path in entries if status == "??" and path in expected_paths
    }
    unauthorized = sorted(
        {path for status, path in entries if not (status == "??" and path in expected_paths)}
    )
    missing = sorted(expected_paths - observed_staging)
    findings: list[str] = []
    if unauthorized:
        findings.append("reviewer-worktree-unauthorized-mutation")
    if missing:
        findings.append("reviewer-worktree-staging-inventory-mismatch")
    return (
        {
            "sourceAndReviewerWorktreeSame": True,
            "statusSource": "git-status-porcelain-v1-z-index-worktree-untracked-ignored",
            "stagedOutputPaths": sorted(observed_staging),
            "missingStagedOutputPaths": missing,
            "unauthorizedMutationPaths": unauthorized,
            "verdict": "pass" if not findings else "fail",
        },
        findings,
    )


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


def run_assurance(repo: Path, m0_commit: str, invocation: ReviewerInvocation) -> int:
    static_check()
    assignment, _, freeze = authenticate_m0(repo, m0_commit, invocation)
    network_probe = network_denial_probe()
    if network_probe["verdict"] != "pass":
        raise ValueError("mechanical network denial probe failed")
    tools = resolve_tools()
    archive = archive_subject(repo)
    initial_source_status = parse_status_paths(
        git_bytes(
            repo,
            "status",
            "--porcelain=v1",
            "-z",
            "--untracked-files=all",
            "--ignored=matching",
        )
    )
    if initial_source_status:
        raise ValueError("source worktree became dirty before M1 execution")

    all_findings: list[str] = []
    command_results: list[CommandResult] = []
    with tempfile.TemporaryDirectory(prefix="trellis-t6-mal1-") as temporary:
        temp_root = Path(temporary)
        extraction = temp_root / "subject"
        scratch = temp_root / "scratch"
        extract_subject(archive, extraction)
        scratch.mkdir()
        env = sanitized_environment(scratch / "runtime", extraction, tools)
        initialize_extracted_git(extraction, repo, m0_commit, env, tools["git"])

        for spec in fixed_commands(tools):
            command_results.append(execute_command(spec, extraction, env, tools))
        external_results, external_audit = run_external_install_audit(
            extraction, scratch / "external", env, tools
        )
        command_results.extend(external_results)

        member_ledger, member_findings = build_member_ledger(extraction)
        all_findings.extend(member_findings)
        runtime_audit, runtime_findings, evidence_rows = build_runtime_audit(
            extraction, command_results, external_audit
        )
        all_findings.extend(runtime_findings)
        filesystem_audit, filesystem_findings = extraction_mutation_audit(
            extraction, env, tools
        )
        all_findings.extend(filesystem_findings)
        protected_audit, protected_findings = protected_worktree_audit(
            repo, invocation.protected_worktree_root, freeze
        )
        if protected_findings:
            raise ValueError(f"protected worktree containment drifted: {protected_findings}")

        exact_attestation = {
            "schemaVersion": SCHEMA_VERSION,
            "recordKind": "t6-exact-subject-attestation",
            "m0Commit": m0_commit,
            "m0FirstParent": INITIAL_M0_COMMIT,
            "initialM0FirstParent": S1_COMMIT,
            "s1": {"commit": S1_COMMIT, "tree": S1_TREE},
            "frozenTechnicalSubject": {"commit": SUBJECT_COMMIT, "tree": SUBJECT_TREE},
            "archiveTransport": {
                "format": "git-archive-tar",
                "byteLength": len(archive),
                "sha256": sha256_bytes(archive),
            },
            "freezeRecordMatches": freeze.get("frozenSubject", {}).get("commit") == SUBJECT_COMMIT,
            "worktreeOverlayUsed": False,
            "verdict": "pass",
        }
        reviewer_attestation = {
            "schemaVersion": SCHEMA_VERSION,
            "recordKind": "t6-reviewer-session-attestation",
            "assignmentId": assignment["assignment"]["assignmentId"],
            "agentId": invocation.agent_id,
            "sessionId": invocation.session_id,
            "runtimeClass": assignment["assignment"]["runtimeClass"],
            "modelClass": assignment["assignment"]["modelClass"],
            "fresh": assignment["assignment"]["fresh"]
            and not invocation.resumed
            and not invocation.shared_scratch_with_t0_through_t5,
            "machineOnly": assignment["assignment"]["machineOnly"],
            "resumed": invocation.resumed,
            "forkedFromT0ThroughT5": invocation.agent_id in EXPECTED_ACTORS,
            "sharedScratchWithT0ThroughT5": invocation.shared_scratch_with_t0_through_t5,
            "reviewerWorktreeMatchesCommittedAssignment": invocation.worktree.resolve() == repo,
            "observedCwdMatchesReviewerWorktree": Path.cwd().resolve() == repo,
            "protectedWorktreeExcludedFromSemanticSubject": True,
            "humanReviewed": False,
            "humanEquivalent": False,
            "futureT7MustDiffer": True,
            "separateM1AuthorizationConfirmedByExplicitInvocation": True,
            "verdict": "pass",
        }
        command_rows = []
        for ordinal, result in enumerate(command_results):
            row = result.evidence()
            row["ordinal"] = ordinal
            command_rows.append(row)
        observed_command_ids = [result.command_id for result in command_results]
        command_inventory_exact = tuple(observed_command_ids) == REQUIRED_COMMAND_IDS
        provider_command_absent = not any(
            token in " ".join(result.argv).lower()
            for result in command_results
            for token in ("anthropic", "openai", "provider")
        )
        containment = {
            "schemaVersion": SCHEMA_VERSION,
            "recordKind": "t6-containment-audit",
            "networkAllowed": False,
            "networkDenial": network_probe,
            "offlinePackageResolutionRequired": True,
            "predeterminedCommandInventoryExact": command_inventory_exact,
            "providerCommandAbsent": provider_command_absent,
            "providerExecutionPerformed": False,
            "protectedWorktree": protected_audit,
            "repairPerformed": False,
            "activationPerformed": False,
            "acceptancePerformed": False,
            "archivePerformed": False,
            "releasePerformed": False,
            "publicationPerformed": False,
            "pushPerformed": False,
            "liveSelectionChangePerformed": False,
            "workerAuthorityChangePerformed": False,
            "currentLiveProcedureVersion": "1.0.0",
            "allocatedDormantProcedureVersion": "2.0.7",
            "tarballPrivacyFindings": external_audit.get("privacyFindings", []),
            "verdict": (
                "pass"
                if network_probe["verdict"] == "pass"
                and command_inventory_exact
                and provider_command_absent
                and not external_audit.get("privacyFindings")
                else "fail"
            ),
        }
        if containment["verdict"] != "pass":
            all_findings.append("containment-privacy-finding")
        command_status = {result.command_id: result.status for result in command_results}
        required_commands_pass = command_inventory_exact and all(
            command_status.get(command_id) == "pass"
            for command_id in REQUIRED_COMMAND_IDS
        )
        if not required_commands_pass:
            all_findings.append("machine-required-command-set-not-pass")

        unique_findings = sorted(set(all_findings))
        machine_verdict = {
            "schemaVersion": SCHEMA_VERSION,
            "recordKind": "t6-machine-verdict",
            "contractVersion": "evaluation-contract-v1.3.1",
            "subjectCommit": SUBJECT_COMMIT,
            "subjectTree": SUBJECT_TREE,
            "reviewerAgentId": REVIEWER_AGENT_ID,
            "findingCount": len(unique_findings),
            "findings": unique_findings,
            "requiredCommandIds": list(REQUIRED_COMMAND_IDS),
            "requiredCommandsPass": required_commands_pass,
            "requiredOutputCount": 9,
            "requiredOutputPaths": list(M1_PATHS),
            "humanReviewed": False,
            "humanEquivalent": False,
            "repairPerformed": False,
            "acceptanceAuthority": False,
            "activationAuthority": False,
            "verdict": "pass" if not unique_findings else "fail",
        }

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
        provisional_staging = stage_outputs(repo, outputs)
        reviewer_audit, reviewer_findings = reviewer_worktree_audit(repo, provisional_staging)
        cleanup_staging(provisional_staging)
        if reviewer_findings:
            raise ValueError(f"reviewer worktree containment drifted: {reviewer_findings}")
        containment["reviewerWorktree"] = reviewer_audit
        filesystem_audit["reviewerWorktree"] = reviewer_audit
        outputs["containment-audit.json"] = canonical_bytes(containment)
        outputs["filesystem-mutation-audit.json"] = canonical_bytes(filesystem_audit)

        forbidden = (
            str(repo).encode(),
            str(extraction).encode(),
            str(invocation.protected_worktree_root.resolve()).encode(),
            str(Path.home()).encode(),
            b"ANTHROPIC_API_KEY=",
            b"OPENAI_API_KEY=",
            b"AWS_SECRET_ACCESS_KEY=",
        )
        private_findings = scan_private_bytes(outputs, forbidden)
        if private_findings:
            raise ValueError(f"M1 output privacy boundary failed: {private_findings}")

        staging = stage_outputs(repo, outputs)
        final_reviewer_audit, final_reviewer_findings = reviewer_worktree_audit(repo, staging)
        if final_reviewer_findings or final_reviewer_audit != reviewer_audit:
            cleanup_staging(staging)
            raise ValueError("final reviewer worktree containment changed before publication")
        publish_outputs(repo, outputs, staging)

    verdict = strict_json_bytes((repo / ATTEMPT_ROOT / "machine-verdict.json").read_bytes(), "verdict")
    sys.stdout.write(json.dumps({"verdict": verdict["verdict"], "findingCount": verdict["findingCount"]}) + "\n")
    return 0 if verdict["verdict"] == "pass" else 1


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
        sys.stdout.write(json.dumps(static_check(), sort_keys=True) + "\n")
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
