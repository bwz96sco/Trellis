# Evaluation case 01: independent attacks and selected-or-blocked closure

## Parent question

Which candidate should be advanced for reducing interruption cost in comparative Research evaluations without weakening authority or replay guarantees?

## Frozen H2-approved candidate set

### C1 — Append-only local run ledger

Use a task-scoped JSONL run ledger with explicit identity, timing, overhead, assertion evidence, and superseding correction records.

### C2 — Automatic provider telemetry collector

Instrument every provider call and infer run identity, gates, and completion from process activity.

### C3 — Canonical Research evaluation events

Add new canonical Research event kinds for every evaluation arm and quality observation.

## Approved evidence refs

- C1 source baseline manifest and copied bytes.
- C6 package migration evidence and exact package identities.
- Existing Workflow, gate, Quest writer, Dispatch, Approval, Result, and Proposal contracts.

## Required execution

Attack each candidate independently. One evaluator must not inspect another candidate attack before finishing its own verdict. Novelty remains unknown unless directly supported. After all attacks, the root/operator records one selected-or-blocked closure with evidence; workers must not aggregate closure, mutate canonical state, launch nested execution, or start an experiment.
