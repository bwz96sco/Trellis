# T5 — Integrate, externally install, and freeze v1.3.1 subject

## Goal

Integrate accepted technical outputs, prove real tarball lifecycle behavior in external repositories, then freeze one exact placeholder-free subject under a separate one-file boundary.

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
- Accepted committed T1 through T4 outputs
- Separate T5 authorization and owner assignment

Task-tree order alone grants no authority. All listed predecessors and a fresh stage-specific user authorization are required.

## Ownership

I1 owns one integration test, one installed-package audit script, task status, and exact integration evidence. S1 owns exactly one subject-freeze JSON. T5 cannot repair T1-T4 paths.

## Requirements

- Use real Core and CLI tarballs and external npm/pnpm installs outside the repository.
- Prove no `.git`, `.trellis/tasks`, mutable-worktree, or source-tree contract dependency.
- Run serial full Core/CLI/workspace checks and packed audits.
- Freeze exact commit/tree, package/tarball digests, tests/results, semantic inputs, and protected fingerprints.
- Any post-freeze change creates a new subject and restarts T6.

## Global containment

- No live provider, network, release, publication, push, archive, activation, or live-selection operation is authorized.
- Workers remain Proposal-only. Root-owned validation, recording, Decisions, and publication authority do not move.
- Historical semantic attempts, Procedure versions, CS5/CS6 records, `.trellis/research/**`, and inherited dirty paths remain immutable.
- Shared event, reducer, store, repository, projection, ledger, committer, lock, publication, and worker-authority paths are call-only.
- `packages/core/src/research/stage-capabilities.ts` is excluded and reserved for separately governed P2-12 activation.

## Acceptance criteria

- [ ] I1 integration and external install checks pass with retained exact evidence.
- [ ] S1 is written only after I1 is immutable and contains no unresolved or self-hash placeholder.
- [ ] Historical versions and inherited dirty paths remain unchanged.
- [ ] Run GitNexus change detection before each separately authorized commit.
- [ ] Exact stage inventory is complete with no unknown or extra output.
- [ ] Inherited dirty paths and historical records remain unchanged.
- [ ] No unauthorized commit or operational action occurs.

## Out of scope

Every path and authority outside this stage's exact T0-frozen inventory, including later stages and P2-12 activation.
