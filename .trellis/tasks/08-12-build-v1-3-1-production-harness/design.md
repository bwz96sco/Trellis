# T4 — Build v1.3.1 production-reachable 116-case harness design

## Boundary

Produce new A133-bound evidence for exactly 116 cases traversing the real Core, CLI, and Procedure path, with deterministic expected/actual and write-effect records. The stage consumes immutable predecessor Git objects and writes only its exact inventory. Mutable worktree candidate bytes are never semantic authority.

## Data and authority flow

```text
exact committed predecessor inputs
  -> strict authentication
  -> production-harness-author-unassigned
  -> exact stage-owned outputs
  -> deterministic verification
  -> separately authorized immutable commit boundary
```

## Ownership model

Own only the two frozen harness surfaces, one new coverage test, task status, and exact task-local evidence. It owns no production source, package tree, registry, or semantic contract.

Cross-stage calls use reviewed exported interfaces. A required path outside the closed inventory returns to T0 for an ownership amendment; it is not edited opportunistically.

## Compatibility

Historical contract and Procedure identities retain recorded interpretation. New v1.3.1 technical behavior is version-explicit. Live Procedure remains `1.0.0`; Procedure `2.0.7` is dormant. Worker Proposal-only and root Decision boundaries remain unchanged.

## Role separation

The accountable actor for this stage must match `production-harness-author-unassigned` and satisfy the T0 identity-separation matrix. T6 cannot share an identity or scratch space with T0-T5. T7 must be a separately instructed accountable operator.

## Failure and rollback

Before commit, remove only uncommitted files from this stage's exact allowlist. After commit, corrections are forward-only. Upstream defects return to the owning stage; assurance and decision stages never repair technical inputs.
