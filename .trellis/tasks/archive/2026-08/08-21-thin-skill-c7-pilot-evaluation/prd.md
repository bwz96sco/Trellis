# C7 — Run Research Orchestration Pilot Evaluation

## Goal

Compare bare-model, frozen-source-Skill, and Trellis-package execution on representative real Research tasks, then make one evidence-backed migration disposition:

- migrate the next bounded Skill group;
- retain the four-package pilot only;
- narrow managed usage;
- revert future package selection and keep source Skills external.

C7 evaluates the system produced by C1–C6. It does not redesign or migrate additional Skills.

## Dependencies

- C6 must be committed and archived.
- C7 uses the exact C1 source baseline for arm B and exact C6 package identities for arm C.
- Provider/model calls require separate explicit authorization before execution.

## Evaluation Boundaries

1. **Literature** — bounded question-scoped review/register behavior.
2. **Ideation and evaluation** — generation stop, explicit H1/H2 handoff, independent candidate attacks, selected-or-blocked closure.
3. **Quest administration** — preview/write separation, one canonical writer, export/recovery behavior.

## Arms

- **A — bare:** model/manual operation without source Skill or Trellis package instructions.
- **B — source:** exact frozen C1 source Skill bytes and frozen dependencies.
- **C — Trellis:** exact C6 package version with intended lightweight, managed, or root-command profile.

The same case input and predeclared acceptance assertions are reused across applicable arms. No arm may inspect another arm's output before producing its own result.

## Required Coverage

- At least three representative cases for each evaluation boundary.
- Run all applicable A/B/C arms for each matched case; unavailable arms require an explicit reason.
- At least ten total real invocations; case count and arm count are both reported.
- Include at least:
  - one literature lightweight case;
  - one literature managed independence/recovery case;
  - one normal ideation stop case;
  - one Quest-governed H1/H2 case;
  - one managed evaluation interruption/recovery case;
  - one Quest writer-refusal case;
  - one Quest export/authority-recovery case.

## Evidence Contract

C7 writes task-scoped evidence only under its `research/` directory. It must not add evaluation telemetry to canonical Research state.

Each append-only run record includes:

- schema version, run ID, case ID, boundary, and arm;
- exact input/prompt digest and declared acceptance assertions;
- source identity: none, C1 source digest, or C6 normalized execution-package identity;
- profile, host, Workflow instance/node, capability, Activation, and Approval refs when applicable;
- start/end timestamps and wall-clock duration;
- token/context usage when exposed; otherwise explicit `unavailable`;
- model-call, Approval-round, subagent/worker, and durable-artifact counts;
- completion outcome and assertion-by-assertion evidence;
- user corrections, rework steps, missed gates, and authority violations;
- replay/recovery evidence where applicable;
- changed paths and artifact refs;
- evaluator notes with no weighted aggregate score.

Quality uses case-specific pass/partial/fail assertions and concrete evidence, not a generic scoring table.

## Zero-Tolerance Failures

Any of these blocks expanded migration immediately:

- missed or inferred H1/H2;
- source and Trellis both accepting Quest writes;
- automatic next-stage execution;
- normalized package/replay identity drift;
- worker canonical mutation or nested execution;
- critical scientific ownership, selected/blocked, or authority regression;
- managed recovery unable to restore exact Workflow instance/node/package state.

## Non-Zero-Tolerance Evaluation

- Compare repeated root failures, not isolated preference variance.
- Lightweight literature must add no mandatory model call, Approval round, subagent, or durable artifact versus source contract.
- Ideation must stop before evaluation.
- Evaluation must remain explicit and close selected-or-blocked.
- Managed profile must demonstrate concrete recovery, isolation, independence, or bounded-authority value.
- User/operator judgment determines whether overhead is acceptable.

## Out of Scope

- New package implementation beyond C6 fixes required by observed C7 defects.
- Full Research Skill migration.
- Provider integration changes.
- Paid/provider execution before separate authorization.
- Automatic instrumentation, hidden model calls, publication, release, or push.
- Reusing formal v1.3.1 methodology-assurance gates as a substitute for this pilot.

## Acceptance Criteria

- [ ] Case manifest freezes at least three cases per boundary and exact arm applicability.
- [ ] Every run has append-only identity, timing, overhead, artifact, completion, and assertion evidence.
- [ ] At least ten real invocations complete, with all applicable matched arms represented.
- [ ] Arm B uses authenticated C1 bytes; arm C records exact C6 package identity.
- [ ] Deterministic lifecycle proofs and live quality evidence remain separate.
- [ ] All zero-tolerance checks have explicit pass/fail evidence.
- [ ] Interruption recovery proves exact managed state reconstruction.
- [ ] Quest single-writer refusal and explicit authority recovery are exercised.
- [ ] Summary reports repeated differences without generic weighted scoring.
- [ ] Final disposition is explicit, reasoned, and blocks full migration unless evidence supports expansion.
- [ ] No additional migration starts automatically.
