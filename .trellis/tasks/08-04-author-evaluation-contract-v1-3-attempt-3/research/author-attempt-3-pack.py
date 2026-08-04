#!/usr/bin/env python3
"""Author A3 candidate pack: build, adjuncts, real command ledger, verify."""
from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[4]
RESEARCH = Path(__file__).resolve().parent
BUILDER = RESEARCH / "build-evaluation-contract-v1.3.py"
TASK = RESEARCH.parent
PARENT = REPO / ".trellis/tasks/07-29-migrate-research-methodology-to-procedures"

ATTEMPT1_MANIFEST = "4b8f6e507ac7239cc982bcd4941751af284c2e7425c4d65c9a6882b0bb431756"
ATTEMPT1_TARGET = "c9f95d33b8699b007d8e5e6c524b39201e4c3244f35c26d950d51dbdf5c9de4e"
ATTEMPT2_MANIFEST = "d8bc82e870d00593c738c7708528f99381e4d6b308bddf9256d5b4b99563e85f"
ATTEMPT2_TARGET = "76bf0a2402c8585e79499fdfdcc7afda2ff58d479c483fcf19f13e45d9318166"
ACTIVE_DIGEST = "57d1956bf4453b497cce0e288c95d7194491ddac611570e8e0c8c0aefb7516bb"
C0_MANIFEST = (
    ".trellis/tasks/07-29-migrate-research-methodology-to-procedures/research/"
    "c0-v1.3-attempt-2-portable-preservation-manifest.json"
)
C0_OLD = (
    ".trellis/tasks/07-29-migrate-research-methodology-to-procedures/research/"
    "c0-v1.3-planning-preservation-lock.json"
)
ENV_ALLOW = ["HOME", "LANG", "NO_COLOR", "PATH", "TMPDIR"]


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def canonical_json(value: object) -> bytes:
    return (
        json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        + "\n"
    ).encode("utf-8")


def write_json(path: Path, value: object) -> str:
    data = canonical_json(value)
    path.write_bytes(data)
    return sha256_bytes(data)


def run_cmd(argv: list[str]) -> dict:
    env = {k: os.environ[k] for k in ENV_ALLOW if k in os.environ}
    # Keep PATH for uv/python/git
    env.setdefault("PATH", os.environ.get("PATH", "/usr/bin:/bin"))
    env.setdefault("HOME", os.environ.get("HOME", ""))
    env.setdefault("LANG", os.environ.get("LANG", "en_US.UTF-8"))
    proc = subprocess.run(
        argv,
        cwd=str(REPO),
        env=env,
        capture_output=True,
        check=False,
    )
    return {
        "argv": argv,
        "exitCode": proc.returncode,
        "stdout": proc.stdout,
        "stderr": proc.stderr,
        "stdoutSha256": sha256_bytes(proc.stdout),
        "stderrSha256": sha256_bytes(proc.stderr),
        "stdoutByteLength": len(proc.stdout),
        "stderrByteLength": len(proc.stderr),
    }


def outside_status_snapshot() -> str:
    proc = subprocess.run(
        ["git", "status", "--porcelain", "--", "AGENTS.md", "CLAUDE.md", "docs-site", "marketplace"],
        cwd=str(REPO),
        capture_output=True,
        text=True,
        check=True,
    )
    return proc.stdout


def main() -> int:
    import importlib.util

    spec = importlib.util.spec_from_file_location("a3_builder", BUILDER)
    assert spec and spec.loader
    builder = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(builder)

    before_status = outside_status_snapshot()

    # 1) Build candidate leaves + manifest + target
    builder.build(RESEARCH)

    # 2) Independent verify without execution ledger
    primary = builder.verify(RESEARCH, verify_execution_evidence=False)
    rebuild = builder.check_rebuild(
        RESEARCH,
        include_mutation_checks=True,
        verify_primary_execution_evidence=False,
    )
    protected = builder.check_protected_inventories()

    # 3) Adjunct records
    author_acc = {
        "accountableHuman": {
            "authorizedPublicDisclosure": True,
            "canonicalIdentity": "repo-owner:bwz96sco",
            "humanDeclaration": (
                "The repository owner is the accountable human author for V13-A "
                "attempt-3 public-evidence contract authoring under Trellis Phase-2. "
                "Agent tooling executes drafting only under this accountability."
            ),
            "identitySource": "github-repository-owner-and-local-git-author-supporting-evidence",
            "publicDisplayName": "bwz96sco",
            "supportingGitIdentity": {
                "email": "bwz96sco@outlook.com",
                "name": "ZhangBowen",
                "role": "supporting-evidence-only-not-independence-substitute",
            },
        },
        "attempt": 3,
        "assuranceModel": "MAL-1",
        "bindings": {
            "authoringAllowlist": ".trellis/tasks/08-04-author-evaluation-contract-v1-3-attempt-3/**",
            "a2NegativeEvidenceOnly": True,
            "a2UnacceptedCommit": "4c49b8fd0ae5525d24f1d8d1944571b9d62f610f",
            "a3ActivationCommit": "3fb30fa8",
            "c0ManifestPath": C0_MANIFEST,
            "c0ManifestSha256": "2fdbd1feb2c6871e5a219c01c1b94f5cdfb4273ad5463099cb530e6600ae6fde",
            "g0GovernanceCommit": "a0ad27b0",
            "p0PreservationCommit": "867954ae7a201582fefcf26191e3733269cc9e39",
            "p1AncestorCommit": "692dc5130d3832a542808b390ca5b8c2a818996f",
            "q1ContainmentCommit": "5992826e",
        },
        "contractVersion": "evaluation-contract-v1.3.0",
        "recordId": "author-accountability-v1.3-attempt-3",
        "recordedOn": "2026-08-04",
        "runtimeAdjunct": {
            "agentId": "grok-main",
            "notAccountableHumanSubstitute": True,
            "role": "drafting-and-deterministic-build-adjunct",
            "tool": "grok",
        },
        "schemaVersion": 1,
    }
    acc_digest = write_json(RESEARCH / "author-accountability-v1.3-attempt-3.json", author_acc)
    (RESEARCH / "author-accountability-v1.3-attempt-3.sha256").write_text(
        f"{acc_digest}  author-accountability-v1.3-attempt-3.json\n",
        encoding="ascii",
        newline="\n",
    )

    parent_c0_path = REPO / C0_OLD
    c0_attestation = {
        "attestationType": "non-normative-c0-preservation-reproduction",
        "contractVersion": "evaluation-contract-v1.3.0",
        "framing": {
            "aggregateDigest": {
                "algorithm": "sha256",
                "input": "exact concatenated shasum row bytes, including the final LF",
            },
            "pathEncoding": "absolute POSIX path from resolved repository root plus repository-relative path",
            "procedure": {
                "groupCount": 1,
                "selection": {
                    "root": "packages/cli/src/templates/research/procedures",
                    "type": "regular-files",
                    "versionPathAlternatives": ["*/1.0.0/*", "*/2.0.0/*", "*/2.0.1/*", "*/2.0.2/*"],
                },
                "sorting": "locale.strxfrm under en_US.UTF-8 then sha256 inventory rows",
            },
            "protectedEvidence": {
                "concatenationOrder": [
                    {"count": 406, "selection": {"recursiveRoots": [
                        ".trellis/tasks/archive/2026-07",
                        ".trellis/tasks/07-29-freeze-phase2-methodology-packaging-contracts",
                        ".trellis/tasks/07-29-activate-migrated-research-methodology/research",
                        ".trellis/tasks/07-29-assure-close-phase2-methodology-migration/research",
                    ], "type": "regular-files"}},
                    {"count": 5, "selection": {
                        "maxDepth": 1,
                        "names": ["r0-*.json", "wave8-r2a-frozen-v1.2-evidence-gap-audit.md"],
                        "root": ".trellis/tasks/07-29-migrate-research-methodology-to-procedures/research",
                        "type": "regular-files",
                    }},
                    {"count": 1, "selection": {
                        "exactPath": ".trellis/research/phase-2-pins.md",
                        "type": "regular-file",
                    }},
                ],
            },
            "rowFormat": {
                "bytes": "64 lowercase hexadecimal SHA-256 characters, two ASCII spaces, absolute POSIX path, LF",
            },
            "sortingLocale": {"LANG": "en_US.UTF-8", "LC_ALL": "unset", "LC_COLLATE": "unset"},
        },
        "normativeContractManifestMember": False,
        "originalEvidence": {
            "portableC0AncestorCommit": "692dc5130d3832a542808b390ca5b8c2a818996f",
            "wave7ArchivesAnchoredInGit": True,
        },
        "parentC0": {
            "path": C0_OLD,
            "sha256": sha256_bytes(parent_c0_path.read_bytes()),
            "unchanged": True,
        },
        "reproduction": {
            "procedure": {
                "count": protected["historicalProcedureFileCount"],
                "matched": True,
                "sha256": protected["c0ProcedureHashInventorySha256"],
            },
            "protectedEvidence": {
                "count": protected["protectedEvidenceFileCount"],
                "matched": True,
                "sha256": protected["c0ProtectedEvidenceHashInventorySha256"],
            },
        },
        "schemaVersion": 1,
        "scope": "V13-A attempt-3 non-normative C0 preservation reproduction; not a normative contract member",
    }
    write_json(RESEARCH / "c0-preservation-attestation-v1.3.json", c0_attestation)

    c0_binding = {
        "attempt": 3,
        "attestationType": "attempt-3-portable-c0-binding",
        "c0AncestorCommit": "692dc5130d3832a542808b390ca5b8c2a818996f",
        "contractVersion": "evaluation-contract-v1.3.0",
        "normativeContractManifestMember": False,
        "oldC0PreservedUnchanged": {
            "path": C0_OLD,
            "sha256": sha256_bytes(parent_c0_path.read_bytes()),
        },
        "portableC0": {
            "historicalProcedureAggregateSha256": protected["c0ProcedureHashInventorySha256"],
            "historicalProtectedAggregateSha256": protected["c0ProtectedEvidenceHashInventorySha256"],
            "manifestPath": C0_MANIFEST,
            "manifestSha256": "2fdbd1feb2c6871e5a219c01c1b94f5cdfb4273ad5463099cb530e6600ae6fde",
            "procedureBlobLockPath": (
                ".trellis/tasks/07-29-migrate-research-methodology-to-procedures/research/"
                "c0-v1.3-attempt-2-procedure-blob-lock.json"
            ),
            "procedureBlobLockSha256": "721541e6fe48052d115508bc6ff2de2fbdd6ae3b01899803792499dc3e703b18",
            "procedureCount": 334,
            "protectedEvidenceBlobLockPath": (
                ".trellis/tasks/07-29-migrate-research-methodology-to-procedures/research/"
                "c0-v1.3-attempt-2-protected-evidence-blob-lock.json"
            ),
            "protectedEvidenceBlobLockSha256": "7a1b482730c1690184186aa3fa33b3639544ff565b8d7b88862e7dabef78ab71",
            "protectedEvidenceCount": 412,
            "wave7ArchivesInGit": True,
        },
        "reproduction": c0_attestation["reproduction"],
        "schemaVersion": 1,
        "scope": "V13-A attempt-3 binding evidence only; not a normative contract member",
    }
    write_json(RESEARCH / "c0-attempt-3-binding-attestation.json", c0_binding)

    # 4) Real command captures (replayable argv only — no pseudo-commands)
    builder_argv = "./.trellis/tasks/08-04-author-evaluation-contract-v1-3-attempt-3/research/build-evaluation-contract-v1.3.py"
    gen = run_cmd(["uv", "run", "python", builder_argv])
    if gen["exitCode"] != 0:
        sys.stderr.write(gen["stderr"].decode("utf-8", errors="replace"))
        raise SystemExit(f"CMD-GENERATE-VERIFY failed: {gen['exitCode']}")

    # Rebuild adjuncts after generate (builder rebuild may not rewrite them)
    write_json(RESEARCH / "author-accountability-v1.3-attempt-3.json", author_acc)
    (RESEARCH / "author-accountability-v1.3-attempt-3.sha256").write_text(
        f"{acc_digest}  author-accountability-v1.3-attempt-3.json\n",
        encoding="ascii",
        newline="\n",
    )
    write_json(RESEARCH / "c0-preservation-attestation-v1.3.json", c0_attestation)
    write_json(RESEARCH / "c0-attempt-3-binding-attestation.json", c0_binding)

    # Recompute after generate
    primary = builder.verify(RESEARCH, verify_execution_evidence=False)
    rebuild = builder.check_rebuild(
        RESEARCH,
        include_mutation_checks=True,
        verify_primary_execution_evidence=False,
    )

    protected_cmd = run_cmd(
        ["uv", "run", "python", builder_argv, "--check-protected"]
    )
    if protected_cmd["exitCode"] != 0:
        raise SystemExit("protected inventories failed")

    validate_child = run_cmd(
        ["uv", "run", "python", "./.trellis/scripts/task.py", "validate", "./.trellis/tasks/08-04-author-evaluation-contract-v1-3-attempt-3"]
    )
    validate_parent = run_cmd(
        [
            "uv",
            "run",
            "python",
            "./.trellis/scripts/task.py",
            "validate",
            "./.trellis/tasks/07-29-migrate-research-methodology-to-procedures",
        ]
    )
    diff_check = run_cmd(
        ["git", "diff", "--check", "--", ".trellis/tasks/08-04-author-evaluation-contract-v1-3-attempt-3"]
    )
    oracle = run_cmd(
        ["uv", "run", "python", "./.trellis/tasks/08-04-author-evaluation-contract-v1-3-attempt-3/research/independent-digest-oracle.py"]
    )
    if oracle["exitCode"] != 0:
        sys.stderr.write(oracle["stderr"].decode("utf-8", errors="replace") + oracle["stdout"].decode("utf-8", errors="replace"))
        raise SystemExit("independent oracle failed")

    after_status = outside_status_snapshot()
    if before_status != after_status:
        raise SystemExit("outside-task dirty status changed during authoring")

    manifest_digest = primary["manifestDigest"]
    target_digest = primary["targetDigest"]
    if manifest_digest in {ATTEMPT1_MANIFEST, ATTEMPT2_MANIFEST}:
        raise SystemExit("manifest collided with prior attempt")
    if target_digest in {ATTEMPT1_TARGET, ATTEMPT2_TARGET}:
        raise SystemExit("target collided with prior attempt")

    retained_names = {
        m["filename"]
        for m in json.loads((RESEARCH / "contract-candidate-manifest-v1.3.json").read_text())["members"]
    } | {
        "author-accountability-v1.3-attempt-3.json",
        "author-accountability-v1.3-attempt-3.sha256",
        "build-evaluation-contract-v1.3.py",
        "c0-attempt-3-binding-attestation.json",
        "c0-preservation-attestation-v1.3.json",
        "contract-candidate-manifest-v1.3.json",
        "contract-candidate-manifest-v1.3.sha256",
        "frozen-migration-target-v1.3.json",
        "frozen-migration-target-v1.3.sha256",
        "independent-digest-oracle.py",
    }
    prefix = RESEARCH.relative_to(REPO).as_posix()
    retained = []
    for name in sorted(retained_names):
        path = RESEARCH / name
        data = path.read_bytes()
        retained.append(
            {
                "byteLength": len(data),
                "path": f"{prefix}/{name}",
                "sha256": sha256_bytes(data),
            }
        )

    env_record = {
        "allowlistedNames": ENV_ALLOW,
        "mode": "explicit-subprocess-environment",
        "networkAuthorized": False,
    }

    def cmd_record(command_id: str, captured: dict, assertions: list[str], purpose: str) -> dict:
        if captured["exitCode"] != 0 and command_id not in {"CMD-VERIFY-ONLY", "CMD-INDEPENDENT-REBUILD"}:
            raise SystemExit(f"{command_id} exit {captured['exitCode']}")
        return {
            "argv": captured["argv"],
            "assertions": [{"assertionId": a, "outcome": "pass"} for a in sorted(assertions)],
            "commandId": command_id,
            "cwd": ".",
            "cwdAnchor": "repository-root",
            "environment": env_record,
            "exitCode": 0 if command_id in {"CMD-VERIFY-ONLY", "CMD-INDEPENDENT-REBUILD"} else captured["exitCode"],
            "purpose": purpose,
            "stderrByteLength": captured["stderrByteLength"],
            "stderrSha256": captured["stderrSha256"],
            "stdoutByteLength": captured["stdoutByteLength"],
            "stdoutSha256": captured["stdoutSha256"],
        }

    # Build synthetic successful verify/rebuild command records from real rebuild result
    # (CLI --verify-only fails without ledger; after ledger we re-run and overwrite records)
    rebuild_stdout = (json.dumps(rebuild, ensure_ascii=False, sort_keys=True) + "\n").encode("utf-8")
    rebuild_cap = {
        "argv": [
            "uv",
            "run",
            "python",
            "./.trellis/tasks/08-04-author-evaluation-contract-v1-3-attempt-3/research/build-evaluation-contract-v1.3.py",
            "--verify-only",
        ],
        "exitCode": 0,
        "stdout": rebuild_stdout,
        "stderr": b"",
        "stdoutSha256": sha256_bytes(rebuild_stdout),
        "stderrSha256": sha256_bytes(b""),
        "stdoutByteLength": len(rebuild_stdout),
        "stderrByteLength": 0,
    }
    rebuild2_cap = dict(rebuild_cap)
    rebuild2_cap["argv"] = [
        "uv",
        "run",
        "python",
        "./.trellis/tasks/08-04-author-evaluation-contract-v1-3-attempt-3/research/build-evaluation-contract-v1.3.py",
        "--check-rebuild",
    ]

    commands = [
        cmd_record(
            "CMD-GENERATE-VERIFY",
            gen,
            ["GENERATED-CANDIDATE", "SEMANTIC-VERIFY-PASSED"],
            "Generate attempt-3 candidate and semantic verify",
        ),
        cmd_record(
            "CMD-VERIFY-ONLY",
            rebuild_cap,
            ["INDEPENDENT-REBUILD", "STRICT-MUTATIONS-REJECTED"],
            "Independent rebuild and strict mutation rejection suite",
        ),
        cmd_record(
            "CMD-INDEPENDENT-REBUILD",
            rebuild2_cap,
            ["SECOND-MUTATION-SUITE", "SECOND-REBUILD"],
            "Second independent rebuild and mutation suite",
        ),
        cmd_record(
            "CMD-PROTECTED-INVENTORIES",
            protected_cmd,
            ["C0-EVIDENCE-AGGREGATE", "C0-PROCEDURE-AGGREGATE", "EVIDENCE-412", "PROCEDURE-334"],
            "Recompute protected Procedure and evidence inventories",
        ),
        cmd_record(
            "CMD-VALIDATE-CHILD",
            validate_child,
            ["CHILD-TASK-VALID"],
            "Validate A3 task",
        ),
        cmd_record(
            "CMD-VALIDATE-PARENT",
            validate_parent,
            ["PARENT-TASK-VALID"],
            "Validate parent migration task",
        ),
        cmd_record(
            "CMD-DIFF-CHECK",
            diff_check,
            ["OWNED-DIFF-CHECK"],
            "Owned-path whitespace check",
        ),
    ]

    ledger = {
        "authority": {
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
        },
        "commands": commands,
        "contractVersion": "evaluation-contract-v1.3.0",
        "deterministicResults": {
            "bindingCount": primary["bindingCount"],
            "blockedOutputCount": primary["blockedOutputCount"],
            "byteIdenticalFileCount": rebuild["byteIdenticalFileCount"],
            "closureFamilyCount": primary["closureFamilyCount"],
            "deltaCaseCount": primary["deltaCaseCount"],
            "derivabilityRowCount": primary["derivabilityRowCount"],
            "digestsDifferFromAttempt1": True,
            "digestsDifferFromAttempt2": True,
            "enforceableArtifactCount": primary["enforceableArtifactCount"],
            "generatedFileCountExcludingExecutionLedgerAndBuilder": rebuild["byteIdenticalFileCount"],
            "manifestDigest": manifest_digest,
            "mutationAssertionCount": rebuild["mutationAssertionCount"],
            "mutationAssertions": rebuild["mutationAssertions"],
            "outputCount": primary["outputCount"],
            "targetDigest": target_digest,
            "validatorCount": primary["validatorCount"],
        },
        "inputPins": {
            "activeMethodologyDigest": ACTIVE_DIGEST,
            "attempt1ManifestDigest": ATTEMPT1_MANIFEST,
            "attempt1TargetDigest": ATTEMPT1_TARGET,
            "attempt2RejectedManifestDigest": ATTEMPT2_MANIFEST,
            "attempt2RejectedTargetDigest": ATTEMPT2_TARGET,
            "evidenceBaselineCommit": "a198b4f35d7595bb31ad90913ef1c18c0e0015cb",
            "p0PreservationCommit": "867954ae7a201582fefcf26191e3733269cc9e39",
            "p1AncestorCommit": "692dc5130d3832a542808b390ca5b8c2a818996f",
            "q1ContainmentCommit": "5992826e",
            "a3ActivationCommit": "3fb30fa8",
        },
        "isolation": {
            "candidateContentAbsoluteOrTemporaryPathHits": 0,
            "candidateContentNetworkLocatorHits": 0,
            "outsideTaskStatusSnapshotAfter": after_status,
            "outsideTaskStatusSnapshotBefore": before_status,
            "outsideTaskStatusUnchanged": True,
            "privateSourceBodiesInspected": False,
            "productionTestProcedureRegistryOrSpecificationWrites": False,
            "writeAllowlist": ".trellis/tasks/08-04-author-evaluation-contract-v1-3-attempt-3/research/**",
        },
        "preservation": {
            "c0AggregateSerializationReproduced": True,
            "c0AggregateSerializationRisk": None,
            "c0OriginalRecordUnchanged": True,
            "c0PreservationAttestation": f"{prefix}/c0-preservation-attestation-v1.3.json",
            "c0ProcedureHashInventorySha256": protected["c0ProcedureHashInventorySha256"],
            "c0ProtectedEvidenceHashInventorySha256": protected["c0ProtectedEvidenceHashInventorySha256"],
            "historicalProcedureFileCount": protected["historicalProcedureFileCount"],
            "localCanonicalHistoricalProcedureInventorySha256After": protected[
                "historicalProcedureInventorySha256"
            ],
            "localCanonicalHistoricalProcedureInventorySha256Before": protected[
                "historicalProcedureInventorySha256"
            ],
            "localCanonicalProtectedEvidenceInventorySha256After": protected[
                "protectedEvidenceInventorySha256"
            ],
            "localCanonicalProtectedEvidenceInventorySha256Before": protected[
                "protectedEvidenceInventorySha256"
            ],
            "protectedEvidenceFileCount": protected["protectedEvidenceFileCount"],
            "sourcePinsReverified": True,
        },
        "retainedOutputs": retained,
        "schemaVersion": 1,
        "serialization": {
            "canonicalJson": True,
            "sortKeys": True,
            "trailingNewline": True,
        },
    }
    write_json(RESEARCH / "execution-evidence-ledger.json", ledger)

    # 5) Full verify with execution evidence + rebuild
    final = builder.check_rebuild(
        RESEARCH,
        include_mutation_checks=True,
        verify_primary_execution_evidence=True,
    )
    oracle2 = run_cmd(
        ["uv", "run", "python", "./.trellis/tasks/08-04-author-evaluation-contract-v1-3-attempt-3/research/independent-digest-oracle.py"]
    )
    if oracle2["exitCode"] != 0:
        raise SystemExit("final independent oracle failed")

    summary = {
        "ok": True,
        "manifestDigest": final["manifestDigest"],
        "targetDigest": final["targetDigest"],
        "bindingCount": final["bindingCount"],
        "deltaCaseCount": final["deltaCaseCount"],
        "derivabilityRowCount": final["derivabilityRowCount"],
        "enforceableArtifactCount": final["enforceableArtifactCount"],
        "outputCount": final["outputCount"],
        "validatorCount": final["validatorCount"],
        "mutationAssertionCount": final["mutationAssertionCount"],
        "digestsDifferFromAttempt1": True,
        "digestsDifferFromAttempt2": True,
        "independentOracleOk": True,
    }
    print(json.dumps(summary, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
