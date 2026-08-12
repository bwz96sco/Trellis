# T6 — Assure v1.3.1 complete system with independent MAL-1 design

## Boundary

Run a mechanically isolated, machine-only complete-system assurance against exact S1, emit the exact allowlisted evidence, and report honest pass/fail without repair. The stage consumes immutable predecessor Git objects and writes only its exact inventory. Mutable worktree candidate bytes are never semantic authority.

## Data and authority flow

```text
exact committed predecessor inputs
  -> strict authentication
  -> fresh-complete-system-mal1-reviewer-unassigned
  -> exact stage-owned outputs
  -> deterministic verification
  -> separately authorized immutable commit boundary
```

## Ownership model

M0 owns task metadata, one reviewer assignment, and one task-local reviewer program. M1 owns exactly nine assurance outputs. It owns no source, test, package, freeze, operator, or activation path.

Cross-stage calls use reviewed exported interfaces. A required path outside the closed inventory returns to T0 for an ownership amendment; it is not edited opportunistically.

## Compatibility

Historical contract and Procedure identities retain recorded interpretation. New v1.3.1 technical behavior is version-explicit. Live Procedure remains `1.0.0`; Procedure `2.0.7` is dormant. Worker Proposal-only and root Decision boundaries remain unchanged.

## Role separation

The accountable actor for this stage must match `fresh-complete-system-mal1-reviewer-unassigned` and satisfy the T0 identity-separation matrix. T6 cannot share an identity or scratch space with T0-T5. T7 must be a separately instructed accountable operator.

## Failure and rollback

Before commit, remove only uncommitted files from this stage's exact allowlist. After commit, corrections are forward-only. Upstream defects return to the owning stage; assurance and decision stages never repair technical inputs.
