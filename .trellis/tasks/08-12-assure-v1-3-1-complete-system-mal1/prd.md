# T6 — Assure v1.3.1 complete system with independent MAL-1

## Goal

Run a mechanically isolated, machine-only complete-system assurance against exact S1, emit the exact allowlisted evidence, and report honest pass/fail without repair.

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
- Exact committed S1 subject
- Fresh committed M0 reviewer assignment
- Separate T6 activation and assurance-run authorization

Task-tree order alone grants no authority. All listed predecessors and a fresh stage-specific user authorization are required.

## Ownership

M0 owns task metadata, one reviewer assignment, and one task-local reviewer program. M1 owns exactly nine assurance outputs. It owns no source, test, package, freeze, operator, or activation path.

## Requirements

- Reviewer identity must differ from every T0-T5 actor and future T7 operator.
- Review only a clean archive/extracted package subject with no worktree overlay.
- Cover Core/CLI semantics, 17 packages, 229/38/116 populations, historical replay, malformed overrides, external installation, privacy scans, dirty containment, and live-selection containment.
- Set `humanReviewed=false`, `humanEquivalent=false`, and perform no repair.
- A pass cannot auto-accept, activate, archive, release, publish, or push.

## Global containment

- No live provider, network, release, publication, push, archive, activation, or live-selection operation is authorized.
- Workers remain Proposal-only. Root-owned validation, recording, Decisions, and publication authority do not move.
- Historical semantic attempts, Procedure versions, CS5/CS6 records, `.trellis/research/**`, and inherited dirty paths remain immutable.
- Shared event, reducer, store, repository, projection, ledger, committer, lock, publication, and worker-authority paths are call-only.
- `packages/core/src/research/stage-capabilities.ts` is excluded and reserved for separately governed P2-12 activation.

## Acceptance criteria

- [ ] Execute the full predetermined corpus without skipped commands.
- [ ] Require exact subject and reviewer isolation.
- [ ] Require exactly nine M1 outputs and zero findings for pass.
- [ ] Record every command exit and containment observation.
- [ ] Exact stage inventory is complete with no unknown or extra output.
- [ ] Inherited dirty paths and historical records remain unchanged.
- [ ] No unauthorized commit or operational action occurs.

## Out of scope

Every path and authority outside this stage's exact T0-frozen inventory, including later stages and P2-12 activation.
