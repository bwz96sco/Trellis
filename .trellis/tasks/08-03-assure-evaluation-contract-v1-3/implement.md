# V13-B implementation plan — Independently assure evaluation contract v1.3

## 0. Authorization gate

Do not start assurance until:

- V13-A has a separately authorized immutable authoring commit;
- exact commit hash, candidate manifest path/digest, contract identity, and contract digest are supplied;
- V13-B is assigned to a mechanically distinct accountable reviewer;
- this task's plans/manifests and the parent ownership amendment validate;
- protected historical hashes and inherited dirty paths are captured.

Task activation authorizes read-only assurance and exact allowlisted outputs only. It does not authorize repairs or the assurance commit.

## 1. Ordered assurance

1. Read `research/assurance-plan-v1.3.json` and reject missing or extra input/output declarations.
2. Record the exact V13-A authoring commit and extract candidate bytes from that commit into an isolated location without applying working-tree overlays.
3. Capture V13-A author identity and authoring-evidence accountable identity; capture V13-B reviewer identity from the approved source; fail immediately if missing, ambiguous, or equal.
4. Verify the commit changes only V13-A-owned planning/candidate paths and preserves historical/protected and inherited dirty paths.
5. Strict-parse every candidate machine-readable file with an independent parser that rejects BOM, malformed UTF-8/JSON, duplicate decoded keys, unknown/missing fields, and non-canonical bytes.
6. Recompute candidate manifest membership, media types, byte lengths, hashes, and sidecars. Recompute the methodology digest from exact frozen-target bytes.
7. Independently verify every normative leaf has exactly one provenance class, inherited citations resolve to exact public bytes, and new decisions contain all required metadata.
8. Reconstruct the public 64-output set and verify exact unique dispositions, alias targets, and container/pattern semantics.
9. Verify all 13 lifecycle dimensions for each enforceable artifact/checkpoint or explicit inapplicable/blocked disposition, including errors, validators, and fixture obligations.
10. Verify closure canonical source contracts and mutation cases; reject any undeclared `Result.status` mapping.
11. Verify exact validator `(id, version, severity)` bindings, trusted registry membership, duplicates, and severity downgrade rejection.
12. Verify worker/root visibility separation, Proposal-only authority, historical `2.0.2`/v1.2 compatibility, future `2.0.3`/exact-v1.3 binding intent, and unchanged live v1 selection.
13. Run privacy scans without inspecting private bodies and prove no write occurred outside the exact V13-B output allowlist.
14. Independently rebuild/recompute candidate canonical bytes and digests without using the production R2A parser or candidate-authored checks as the sole oracle.
15. Write only the nine allowlisted assurance outputs, each with deterministic bytes and cross-referenced digests.
16. Emit exact `pass` or `fail`. Do not repair input files.
17. Run task validation, ownership/disjointness verification, diff hygiene on V13-B-owned paths, protected-hash checks, and dirty-path comparison.
18. If pass, present exact input/output identities and request separate authorization before an assurance-only commit. If fail, return findings to V13-A and require a new authoring commit/digest and complete rerun.

## 2. Required verification classes

The future `execution-evidence-ledger.json` records exact argv, cwd, environment allowlist, exit code, assertion IDs/outcomes, retained output digests, and before/after snapshots for:

- immutable commit extraction and working-tree-overlay exclusion;
- reviewer identity independence;
- strict UTF-8/JSON and duplicate decoded-key mutation cases;
- canonicalization, manifest, byte-length, digest, and filename-sidecar mutations;
- provenance and exact public-citation completeness;
- exact 64-output set/uniqueness/disposition mutations;
- 13-dimension completeness and blocked/inapplicable semantics;
- closure source/type/null/order/zero-write checks and status-heuristic rejection;
- validator triple/registry/severity mutations;
- visibility, authority, compatibility, and live-v1 containment checks;
- privacy and full mutation boundary snapshots;
- independent digest recomputation;
- exact output allowlist and absence of repairs;
- `uv run python ./.trellis/scripts/task.py validate .trellis/tasks/08-03-assure-evaluation-contract-v1-3`;
- `git diff --check` restricted to V13-B-owned paths.

## 3. Stop gates

Fail assurance if:

- exact immutable inputs are absent or mismatched;
- reviewer independence is not mechanically proven;
- candidate extraction includes working-tree or later-commit bytes;
- any schema/digest/provenance/coverage/lifecycle/closure/validator/privacy/authority/compatibility check fails;
- any private-source dependency or inspection would be required;
- any write occurs outside the exact output allowlist;
- the reviewer would need to repair candidate or production files;
- protected historical hashes or inherited dirty paths change;
- the verdict cannot be reduced unambiguously to pass/fail.

## 4. Rollback and commit boundary

Assurance outputs may be regenerated only from the same exact input tuple before commit. A candidate defect invalidates the run and requires a new V13-A authoring commit/digest. V13-B never amends candidate bytes. A separate explicit approval is required before committing assurance outputs; no activation, package lifecycle, archive, release, publication, or push is authorized.
