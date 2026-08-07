# CS6-0 governance design

## Boundary

CS6-0 is governance-only. It creates and validates task/planning/evidence artifacts under the CS6 task tree and adds an append-only pointer to the canonical Phase-2 parent. It owns no production source, tests, Procedure packages, accepted contract leaves, live registry state, assurance outputs, or operator decision.

## Identity model

Keep these identities separate:

- **Historical subject S10** — immutable CS5 attempt-10 technical subject.
- **Historical evidence M10** — immutable CS5 attempt-10 evidence commit and `fail` verdict.
- **Technical integration I11** — future CS6-6 integrated dormant candidate.
- **Frozen subject S11** — future one-file freeze commit containing no self-hash placeholder.
- **Reviewer assignment M0** — future distinct-machine assignment metadata.
- **Evidence M11** — future exact nine-output assurance commit.
- **Operator decision O** — optional later record, separately authorized.

No identity is allowed to imply another identity's authority.

## Topology

```text
07-29-migrate-research-methodology-to-procedures
  -> 08-07-cs6-complete-system-forward-correction
       -> CS6-0 governance
       -> CS6-1 semantic audit
       -> CS6-2 core runtime
       -> CS6-3 CLI/auth/replay/recovery
       -> CS6-4 Procedure 2.0.7 packages
       -> CS6-5 mutation/coverage harness
       -> CS6-6 integration/install/freeze
       -> CS6-7 MAL-1 attempt 11
       -> CS6-8 operator decision
```

Relationships are stored through reciprocal `task.json.children` and child `task.json.parent`. Dependency order is separately recorded in PRDs, implementation plans, and the governance record.

## Ownership model

- CS6-0 exclusively owns CS6 governance artifacts and the canonical-parent CS6 pointer/overlay.
- Every later production or evidence path has one child owner.
- Shared HIGH/CRITICAL primitives are protected call-only surfaces.
- Historical CS5 and Procedure `2.0.4`–`2.0.6` paths are immutable exclusions.
- The attempt-11 assurance output directory is new and disjoint from attempt 10.

## Exact governance ownership

CS6-0 may edit only the CS6 campaign/child planning packages, its own `research/**`, and append-only CS6 pointers in the canonical parent artifacts. Later-child `research/**` paths are reserved for those children and are not created here. All production, test, Procedure, accepted-contract, registry, specification, assurance-output, operator-decision, and `.trellis/research/**` paths are excluded.

## Data flow

1. Capture current HEAD, protected dirty identities, CS5 S/M/verdict, accepted contract identities, and live-version containment.
2. Materialize reciprocal tasks and complete planning artifacts.
3. Write a canonical governance record and exact ownership map.
4. Add an append-only canonical-parent pointer to those records.
5. Validate topology, manifests, containment, and diff scope.
6. Stop before any later child activation or technical change.

## Compatibility and preservation

- No historical record is edited to make it match current understanding.
- v1.3.0 remains accepted provisionally, subject to CS6-1 semantic audit.
- Procedure correction version is 2.0.7, but no package is authored here.
- Live Procedure remains 1.0.0.
- The existing report-v2 and Research schemas are untouched.

## Authority model

All governance records carry explicit false values for human review/equivalence, repair authority, complete-system acceptance, operator decision, activation, archive, release, publication, and push. Planning and governance never imply technical or operational authority.

## Rollback and retry

CS6-0 is additive before commit. If validation fails, correct only newly created CS6 artifacts and the additive canonical-parent CS6 pointer. Never roll back or rewrite historical CS5 material. No commit is authorized in this wave, so repository history remains unchanged.
