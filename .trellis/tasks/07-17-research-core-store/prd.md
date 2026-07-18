# Research core and deterministic store

## Goal

Add platform-neutral research domain primitives and durable store to `@mindfoldhq/trellis-core`.

## Requirements

- Define Quest, Campaign, Run, Evidence, Claim, workspace, repository, artifact-ref, event, dispatch, result, proposal, and decision types needed by later children.
- Use prefixed `crypto.randomUUID()` IDs.
- Strictly parse append-only `.trellis/research/events.jsonl`; malformed lines must fail closed.
- Validate entity lifecycle transitions and complete event batches before append.
- Serialize writers with existing Trellis filesystem-lock semantics.
- Support idempotency keys and monotonic contiguous sequences.
- Reduce ledger into deterministic tracked projections with `projectedThroughSeq`.
- Support explicit projection rebuild after interrupted projection writes.
- Keep runtime lock/seq/cache under `.trellis/.runtime/research`.
- Reject tracked absolute artifact/repository paths.
- Export supported API through `@mindfoldhq/trellis-core/research`.
- Preserve Channel, Task, and Mem behavior.

## Constraints

- Core remains zero-runtime-dependency.
- No CLI, workflow, hook, Task, or Mempal integration in this child.
- No public raw append function that bypasses domain validation.
- Protocol digest becomes immutable after Campaign freeze.
- Terminal Run records remain immutable except explicit invalidation.

## Acceptance Criteria

- [ ] All canonical types and runtime schemas reject invalid shapes.
- [ ] Every allowed/forbidden lifecycle transition has tests.
- [ ] Ledger parser rejects malformed JSON, sequence gaps/duplicates, duplicate event IDs, and invalid payloads.
- [ ] Duplicate idempotency key returns prior success without appending.
- [ ] Concurrent writer test produces one valid contiguous ledger.
- [ ] Event append followed by simulated projection failure is recoverable through deterministic rebuild.
- [ ] Rebuilding twice produces byte-equivalent projections.
- [ ] Absolute tracked paths are rejected.
- [ ] Existing Channel lock/event tests remain green.
- [ ] `@mindfoldhq/trellis-core/research` builds and imports.
- [ ] GitNexus change detection shows expected core/store flows only.
