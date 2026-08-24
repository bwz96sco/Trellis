# C7 Pilot Evaluation Design

## 1. Evidence Shape

C7 is a task-scoped comparative experiment, not canonical product telemetry.

```text
research/
├── evaluation-plan.json
├── cases/<case-id>.json
├── runs.jsonl
├── outputs/<run-id>/...
├── deterministic-proof.json
├── summary.json
└── decision.md
```

`runs.jsonl` is append-only. A correction appends a superseding record; it never rewrites prior evidence.

## 2. Case Contract

Each case freezes:

```json
{
  "schemaVersion": 1,
  "caseId": "literature-01",
  "boundary": "literature",
  "inputRef": "cases/inputs/literature-01.md",
  "inputSha256": "...",
  "applicableArms": ["A", "B", "C"],
  "requiredProfileC": "lightweight",
  "assertions": [
    {"id": "target-locked", "description": "...", "zeroTolerance": false}
  ]
}
```

Assertions are concrete and case-specific. No weighted score or universal quality number is used.

## 3. Run Contract

Each run record binds immutable case input, arm identity, exact package/source identity, execution metadata, overhead counts, changed paths, outputs, assertion evidence, corrections, rework, and recovery/authority signals.

Arm identity:

- A: no Skill identity;
- B: C1 source file SHA-256 and baseline manifest digest;
- C: complete `ResolvedExecutionPackageIdentity`, requested members, profile, and managed lifecycle refs when applicable.

## 4. Isolation

- Arms receive the same case input.
- Each arm starts from an independent copied fixture/workspace.
- An arm cannot read sibling-arm outputs.
- Evaluator reads all outputs only after the case arms finish.
- Provider/model/version and host are recorded; unavailable token accounting is explicit.

## 5. Coverage Matrix

Minimum planned cases:

| Boundary | Case 1 | Case 2 | Case 3 |
|---|---|---|---|
| Literature | one-paper bounded review | multi-paper register update | managed interruption/recovery review |
| Ideation/evaluation | normal ideation stop | Quest H1/H2 generation stop | managed independent attacks and selected-or-blocked closure |
| Quest admin | import preview/write | writer-refusal and byte stability | export plus explicit authority recovery |

Run all applicable A/B/C arms. Deterministic Quest-admin arms may use manual/bare versus source helper versus Trellis command behavior rather than provider calls.

## 6. Deterministic Proof

Before live quality comparison, record one proof bundle for:

- C1 source identity;
- C6 packed package identity;
- lightweight/managed instruction digest parity;
- managed replay and Context identity;
- Result/completion/transition separation;
- source-admin refusal;
- Workflow recovery state.

This proof cannot substitute for live quality cases.

## 7. Decision Rule

Immediate stop/retain-or-revert on any zero-tolerance failure.

Otherwise compare repeated evidence:

- semantic assertions;
- completion and rework;
- model/Approval/worker/artifact overhead;
- managed recovery/independence value;
- operator correction burden.

Final `decision.md` records one disposition and exact supporting run IDs. No next migration begins automatically.

## 8. Authorization Boundary

Harness creation, fixtures, deterministic commands, and no-provider validation are authorized by C7 implementation scope. Any real external/paid provider invocation requires a separate explicit user authorization naming the run boundary before execution.
