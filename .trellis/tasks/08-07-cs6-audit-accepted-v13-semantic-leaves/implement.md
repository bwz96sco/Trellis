# CS6-1 implementation plan

## Preconditions

- CS6-0 governance is committed and unchanged.
- The task is separately activated.
- An independent semantic auditor is assigned and recorded.

## Ordered work

1. Capture exact commit, seven paths, byte lengths, SHA-256 values, semantic digest, and member aggregate.
2. Build an audit checklist from the accepted contract, not from current runtime behavior.
3. Reconcile durable outputs, lifecycle dimensions, closure fields, validator registry/triples, binding matrix, provenance/derivability, and differential obligations.
4. Challenge null/partial/blocked/failed/inconclusive/selected semantics and selected-versus-blocked exclusivity.
5. Classify each finding as contract-level or implementation-level with exact JSON pointers and rationale.
6. Emit one deterministic disposition: `leaves-sound` or `contract-defect`.
7. Validate task scope, zero mutation outside the task, and exact protected identities.
8. Stop before any downstream task activation or commit unless separately authorized.

## Verification

- Recompute all seven hashes and aggregate with an independent script.
- Validate JSON strictly and reject duplicate keys.
- Prove every required count/domain is reconciled exactly once.
- Run `uv run python ./.trellis/scripts/task.py validate .trellis/tasks/08-07-cs6-audit-accepted-v13-semantic-leaves`.
- Run path-scoped `git diff --check` and protected no-drift checks.

## Stop/rollback

Any exact-input mismatch, semantic ambiguity, missing authority, or leaf defect yields `contract-defect` and campaign stop. Rollback removes only uncommitted task-local outputs.

## Commit boundary

Future A11 contains only this task directory. No commit is currently authorized.
