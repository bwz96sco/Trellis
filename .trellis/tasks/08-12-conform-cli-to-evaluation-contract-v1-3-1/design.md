# T2 — Conform CLI to evaluation-contract v1.3.1 design

## Boundary

Add package-owned accepted v1.3.1 bundle authentication and conform CLI recording, replay, revalidation, materialization, and recovery to the exact accepted semantics. The stage consumes immutable predecessor Git objects and writes only its exact inventory. Mutable worktree candidate bytes are never semantic authority.

## Data and authority flow

```text
exact committed predecessor inputs
  -> strict authentication
  -> cli-v131-implementer-unassigned
  -> exact stage-owned outputs
  -> deterministic verification
  -> separately authorized immutable commit boundary
```

## Ownership model

Own only the exact CLI adapters, package-local v1.3.1 bundle, tests, specifications, task status, and evidence paths frozen by T0. Canonical state primitives and Core semantics are call-only.

Cross-stage calls use reviewed exported interfaces. A required path outside the closed inventory returns to T0 for an ownership amendment; it is not edited opportunistically.

## Compatibility

Historical contract and Procedure identities retain recorded interpretation. New v1.3.1 technical behavior is version-explicit. Live Procedure remains `1.0.0`; Procedure `2.0.7` is dormant. Worker Proposal-only and root Decision boundaries remain unchanged.

## Role separation

The accountable actor for this stage must match `cli-v131-implementer-unassigned` and satisfy the T0 identity-separation matrix. T6 cannot share an identity or scratch space with T0-T5. T7 must be a separately instructed accountable operator.

## Failure and rollback

Before commit, remove only uncommitted files from this stage's exact allowlist. After commit, corrections are forward-only. Upstream defects return to the owning stage; assurance and decision stages never repair technical inputs.
