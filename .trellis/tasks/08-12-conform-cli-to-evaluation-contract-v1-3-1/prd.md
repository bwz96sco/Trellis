# T2 — Conform CLI to evaluation-contract v1.3.1

## Goal

Add package-owned accepted v1.3.1 bundle authentication and conform CLI recording, replay, revalidation, materialization, and recovery to the exact accepted semantics.

## Immutable inputs

- Accepted A133 subject: `5a038a87531c3dbfa7b52ba82eaa59d856ab1ea3` / tree `47633d69ffb68b7e225e01e502fe133616a1078b`.
- Candidate manifest SHA-256: `e3d4322ee5b73a319a3d777d38877345f82efdc253f1ca825df538a1300ecf1a`.
- Seven-member aggregate: `sha256:718d7ecec808199148b63ce64208e60d52be18575b175df67ef620596107fa34`.
- Semantic digest: `sha256:8e2cd20dd8e12caab318852f82a100116a28d405113f654efbda7b3646f666af`.
- Complete output-set digest: `sha256:514b7c99450c0703ebacef8b16fc0a3658b8ea5c87ef05bf371166916597d642`.
- B133 MAL-1 pass: `56277b874217a3b8a01b63a4905cf6b22708cb05` / tree `3873721fe9208644e856f857a2c34e9651c96edc`, zero findings, `humanReviewed=false`, `humanEquivalent=false`.
- O133 acceptance: `2253df9fb67f8ee84d470da23205e9610f8a4e3e` / tree `7e5430197841776a6d8d7f31e8b82517473f082f`; semantic use only.
- Technical baseline: `2253df9fb67f8ee84d470da23205e9610f8a4e3e` / tree `7e5430197841776a6d8d7f31e8b82517473f082f`.
- Live Procedure selection remains exactly `1.0.0`; the new dormant version is `2.0.7`.

## Dependencies and activation gate

- Committed G0/T0 governance
- Accepted committed T1 interface
- Separate T2 authorization and owner assignment
- Fresh upstream GitNexus impact for every existing symbol edit

Task-tree order alone grants no authority. All listed predecessors and a fresh stage-specific user authorization are required.

## Ownership

Own only the exact CLI adapters, package-local v1.3.1 bundle, tests, specifications, task status, and evidence paths frozen by T0. Canonical state primitives and Core semantics are call-only.

## Requirements

- Production code must never read `.trellis/tasks`, `.git`, or mutable candidate files.
- Resolve project-first then bundled Procedures without source-tree fallback.
- Bind exact Procedure and contract identities for current and historical replay.
- Pre-commit failures produce zero canonical writes.
- Post-commit projection failure becomes deterministic recovery-required state, never false rollback.
- Preserve root-owned Result/Proposal recording and worker authority ceilings.

## Global containment

- No live provider, network, release, publication, push, archive, activation, or live-selection operation is authorized.
- Workers remain Proposal-only. Root-owned validation, recording, Decisions, and publication authority do not move.
- Historical semantic attempts, Procedure versions, CS5/CS6 records, `.trellis/research/**`, and inherited dirty paths remain immutable.
- Shared event, reducer, store, repository, projection, ledger, committer, lock, publication, and worker-authority paths are call-only.
- `packages/core/src/research/stage-capabilities.ts` is excluded and reserved for separately governed P2-12 activation.

## Acceptance criteria

- [ ] Run accepted-bundle, historical-resolution, record-result, replay, revalidation, recovery, materialization, zero-write, parser, and binary tests.
- [ ] Run CLI lint, typecheck, test, and build only after Core build is stable.
- [ ] Update only the three owned CLI/Core-boundary specifications.
- [ ] Run GitNexus change detection before a separately authorized T2 commit.
- [ ] Exact stage inventory is complete with no unknown or extra output.
- [ ] Inherited dirty paths and historical records remain unchanged.
- [ ] No unauthorized commit or operational action occurs.

## Out of scope

Every path and authority outside this stage's exact T0-frozen inventory, including later stages and P2-12 activation.
