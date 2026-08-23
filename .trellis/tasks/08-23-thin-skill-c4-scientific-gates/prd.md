# Add Canonical Research Scientific Gates

## Goal

Add minimum canonical H1/H2 state needed to unblock C3 gated Workflow transitions without adding Quest migration, candidate import, or automatic research execution.

User value: accountable operator records explicit scientific decision, inspects canonical history/effective state, then separately selects legal Workflow transition. Trellis preserves authority and rationale; Skill execution remains stopped.

## Background

- C3 added strict Workflow DAG definitions, canonical instances, node completion, transition recording, status/next, replay, and projection.
- C3 deliberately blocks every transition with non-empty `requiredGateIds` because canonical gate state does not exist yet (`.trellis/tasks/archive/2026-08/08-21-thin-skill-c3-dag-workflow-state/design.md:179-182`).
- Scientific gate answers whether accountable human authorized research transition. Operational Approval answers whether execution may run with granted authority. They remain separate (`.trellis/tasks/08-21-plan-thin-skill-research-orchestration/design.md:295-333`).
- C1 froze approved/rejected scientific refs separately from canonical evidence Artifact refs (`.trellis/spec/core/backend/research-state.md:1178-1193`).
- Minimal C4 contains gate records, Workflow consumption, and read-only status. Quest import/export and single-writer cutover remain deferred C4b.

## Requirements

### R1 — Append-only scientific-gate record

- Add one immutable Research record per explicit H1/H2 decision.
- Record exact:
  - gate-record ID;
  - Quest ID;
  - active Workflow-instance ID;
  - Workflow ID/version/digest;
  - completed current node ID;
  - gate ID;
  - `approve | reject` decision;
  - actor and rationale;
  - approved/rejected scientific refs;
  - canonical evidence Artifact refs;
  - optional source Artifact ref;
  - recorded timestamp.
- Gate IDs are exactly `H1 | H2`. Decisions are exactly `approve | reject`.
- Actor and rationale must be trim-nonempty. Store decoded values verbatim.
- Later decisions append new records. No update/delete path exists.
- No decision may be inferred from files, Quest stage, node completion, Result, Artifact, model output, or operational Approval.

### R2 — Exact Workflow scope and structural validation

- Gate scope is exact `workflowInstanceId + nodeId + gateId`, never Quest-only or Workflow-definition-only.
- Target instance must exist, remain active, retain exact bound Workflow ID/version/digest, and point at completed current node.
- Requested gate must appear on at least one outgoing transition from current node.
- Approved/rejected refs are scientific stable-ID strings, not Result/Artifact substitutes. Each supplied value must be non-empty and equal its trimmed value, remain verbatim, be duplicate-free within its set, and be disjoint across sets.
- At least one approved or rejected scientific ref is required.
- `evidenceRefs` contains one or more canonical Artifact IDs. Every Artifact must exist, belong to same Quest, and appear in current node completion's accepted refs.
- Optional `sourceArtifactId` must satisfy same ownership/containment checks and must also appear in `evidenceRefs`.
- C4 does not parse Artifact bytes or claim candidate/opportunity universe membership or total coverage. Trellis has no canonical candidate universe before C4b. C4b must reintroduce those checks only after exact source mapping exists.
- Validators never judge novelty, feasibility, truth, or which scientific ref should be approved.

### R3 — Effective decision semantics

- Latest valid ledger record for same instance/node/gate is effective.
- `approve` satisfies matching gate requirement. `reject` records refusal and does not satisfy it.
- Full history remains replayable after effective state changes.
- Gate record may permit transition. It never selects edge, changes node, invokes Skill/model/worker/provider, creates Dispatch, or grants operational Approval.
- H2 recording and evaluation start cannot share one command or event batch.

### R4 — Workflow integration

- `research workflow next` derives gate satisfaction from canonical gate state.
- `research workflow transition` requires effective `approve` for every transition `requiredGateId`, bound to same instance and source node.
- Successful transition records exact satisfying gate-record IDs in required gate-ID order (`H1`, then `H2` when both apply).
- Transition payload parsing preserves this order; it must not sort UUID-like record IDs lexicographically.
- Missing, rejected, stale-node, wrong-instance, duplicate-gate, or mismatched records block transition atomically.
- Gate record remains separate event. Ungated C3 transitions remain unchanged.

### R5 — Deterministic CLI

```text
trellis research gate record \
  --instance <wfi-id> \
  --gate <H1|H2> \
  --decision <approve|reject> \
  --actor <label> \
  --rationale <text> \
  [--approved-ref <scientific-ref>...] \
  [--rejected-ref <scientific-ref>...] \
  --evidence-ref <artifact:art-id>... \
  [--source-artifact <artifact:art-id>] \
  [--idempotency-key <key>] \
  [--dry-run] [--write] [--json]

trellis research gate status --instance <wfi-id> [--json]
```

- Approved/rejected options are independently repeatable; command requires at least one value across both sets.
- No mutation flag or `--dry-run` previews by default. Only `--write` appends.
- `--dry-run` plus `--write` fails before root resolution or mutation construction.
- One successful write appends exactly one gate event.
- Same-key replay succeeds only for exactly one matching gate event and exact command target/payload. Generated record ID/timestamp reuse existing event and are not compared to newly generated values. Any other ownership returns `IDEMPOTENCY_KEY_CONFLICT`.
- Quest, Workflow ID/version/digest, and node derive from canonical instance. CLI does not accept redundant identity flags.
- `gate status` is read-only. It returns bound instance identity, current-node declared gates, ledger-order history, and effective H1/H2 records.
- JSON and text output remain deterministic.

### R6 — Replay, projection, and compatibility

- Extend closed Research schema-v3 with `scientific-gate.recorded` plus `scientific-gate` aggregate/ref support. Do not widen schema-v1/v2 kind sets.
- Keep existing exported schema-v3 version constant compatible; no naming cleanup in C4.
- Reducer stores immutable records, per-instance ledger-order IDs, and replay-derived effective scope index.
- Add deterministic per-Quest `.trellis/research/quests/<questId>/gates.json`, written only when gate records exist. Historical C3 rebuild must not change `workflow.json` bytes.
- Gate-event relations bind Quest, Workflow instance, sorted evidence Artifacts, and optional source Artifact without duplication.
- Transition-event relations include satisfying gate records in gate-ID order. Historical ungated transition relations remain valid.
- Rebuild reconstructs identical record history, effective state, transition refs, and projection bytes.
- Historical Procedure, Activation/Approval, Dispatch, Workflow, Result/Proposal/Decision, and static Workflow behavior remain unchanged.

## Acceptance Criteria

- [ ] H1/H2 record binds exact active instance, Workflow digest, completed current node, explicit decision, actor/rationale, scientific refs, and accepted evidence Artifacts.
- [ ] Invalid instance/node/gate, undeclared gate, incomplete node, malformed/duplicate/overlapping scientific refs, invalid evidence ownership/containment, or empty required text fails before append.
- [ ] `approve` satisfies only matching instance/node/gate. `reject`, stale, and unrelated approvals do not.
- [ ] Latest same-scope decision determines effective status; prior records remain immutable history.
- [ ] `workflow next` reports canonical satisfaction and still requires explicit transition selection.
- [ ] `workflow transition` freezes exact satisfying record IDs in H1/H2 order as one separate event.
- [ ] Gate recording never invokes model, Skill, worker, provider, Dispatch, next node, transition, or operational Approval.
- [ ] Preview, status, and all error paths are byte-identical zero-write across ledger, projections, runtime, cache, and lock state.
- [ ] Replay/rebuild produces deterministic gate state and `gates.json`; old C3 projection bytes remain unchanged when no gate exists.
- [ ] Historical event fixtures and existing Research/Workflow suites remain green.
- [ ] C4 does not claim candidate-universe membership/coverage before C4b.
- [ ] No Quest import/export, source-admin change, authority cutover, managed execution, real Skill migration, provider call, push, release, publication, or Activation is added.

## Out of Scope

- Candidate/opportunity entity import, universe membership, or total set coverage.
- Artifact-content parsing or source gate-validator embedding.
- Quest YAML/JSONL import/export.
- Trellis/source Quest writer transfer.
- Source `research-quest-admin` changes.
- Managed Skill Dispatch integration.
- Real pilot Skill/Workflow migration.
- Scientific decision automation, model judging, automatic continuation, slash wrappers, cycles, retries, or step-budget engines.
- C4b–C7 execution, provider execution, push, release, publication, or Activation.

## Blocking Questions

None. Minimum scope plus frozen C1 record shape select opaque scientific refs with canonical evidence containment now; candidate-universe validation waits for C4b.
