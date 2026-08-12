# A133-bound technical successor design

## Boundary and identity model

The campaign is a new technical consumer of the exact O133-accepted semantics. It does not reopen G131/G132/G133 or reuse CS6-2 through CS6-8. Semantic identity, technical baseline, integrated candidate, frozen subject, machine assurance, and operator decision remain separate identities.

- Accepted A133 subject: `5a038a87531c3dbfa7b52ba82eaa59d856ab1ea3` / tree `47633d69ffb68b7e225e01e502fe133616a1078b`.
- Candidate manifest SHA-256: `e3d4322ee5b73a319a3d777d38877345f82efdc253f1ca825df538a1300ecf1a`.
- Seven-member aggregate: `sha256:718d7ecec808199148b63ce64208e60d52be18575b175df67ef620596107fa34`.
- Semantic digest: `sha256:8e2cd20dd8e12caab318852f82a100116a28d405113f654efbda7b3646f666af`.
- Complete output-set digest: `sha256:514b7c99450c0703ebacef8b16fc0a3658b8ea5c87ef05bf371166916597d642`.
- B133 MAL-1 pass: `56277b874217a3b8a01b63a4905cf6b22708cb05` / tree `3873721fe9208644e856f857a2c34e9651c96edc`, zero findings, `humanReviewed=false`, `humanEquivalent=false`.
- O133 acceptance: `2253df9fb67f8ee84d470da23205e9610f8a4e3e` / tree `7e5430197841776a6d8d7f31e8b82517473f082f`; semantic use only.
- Technical baseline: `2253df9fb67f8ee84d470da23205e9610f8a4e3e` / tree `7e5430197841776a6d8d7f31e8b82517473f082f`.
- Live Procedure selection remains exactly `1.0.0`; the new dormant version is `2.0.7`.

## Topology

```text
07-29-migrate-research-methodology-to-procedures
  -> 08-12-implement-evaluation-contract-v1-3-1-technical-successor
       -> T0 governance and immutable freeze
       -> T1 Core runtime conformance
       -> T2 CLI authentication, recording, replay, recovery
       -> T3 immutable 17-family Procedure projection
       -> T4 production-reachable 116-case harness
       -> T5 integration, external install, exact subject freeze
       -> T6 independent complete-system MAL-1
       -> T7 operator technical decision
```

Tree order is descriptive. Each child repeats exact predecessor identities and stop gates.

## Technical lanes

- T1 owns methodology-local Core adapters and focused specifications/tests; protected canonical primitives are called only.
- T2 owns the package-local v1.3.1 bundle and approved CLI orchestration adapters; production never reads `.trellis/tasks` or mutable candidate files.
- T3 owns only a new deterministic generator, one package test, and the exact 204 files in seventeen `2.0.7` trees.
- T4 owns only production-path harness/test surfaces and task-local evidence.
- T5 owns integration/install audit surfaces, then a separate one-file subject freeze. Upstream defects return to their owner.
- T6 owns reviewer setup and the exact assurance outputs; it cannot repair.
- T7 owns only input attestation and one terminal technical decision.

## Compatibility and containment

Historical replay resolves recorded Procedure and contract identities. Existing Procedure bytes remain immutable. All new packages stay dormant. `stage-capabilities.ts` and all live selection remain outside this campaign until a separately governed P2-12 cutover.

- No live provider, network, release, publication, push, archive, activation, or live-selection operation is authorized.
- Workers remain Proposal-only. Root-owned validation, recording, Decisions, and publication authority do not move.
- Historical semantic attempts, Procedure versions, CS5/CS6 records, `.trellis/research/**`, and inherited dirty paths remain immutable.
- Shared event, reducer, store, repository, projection, ledger, committer, lock, publication, and worker-authority paths are call-only.
- `packages/core/src/research/stage-capabilities.ts` is excluded and reserved for separately governed P2-12 activation.

## Rollback and retry

Before a stage commit, remove only that stage's uncommitted allowlisted outputs. After a committed stage, correction is forward-only. Any change after subject freeze creates a new subject identity and restarts T6. Semantic defects return to a new semantic-contract campaign, never to A133 mutation.
