# C8 — Complete Full Research Skill Migration

## Goal

Complete the approved thin-Skill migration for source commit `86df5a676c52950592ff9fe5966b9c1753160cb5`: all 15 committed Research Skills must have exactly one immutable Trellis package or explicit native Trellis replacement, with successor A/B/C evidence proving quality and authority boundaries before the ten-package expansion.

## Background

C1–C6 established one execution-package registry, schema-v3 Skills, lightweight/managed profiles, declarative Workflow DAG state, canonical scientific gates, Quest writer authority, and four pilot packages. Archived C7 remains immutable historical evidence with `status: failed-zero-tolerance`. The later remediation authenticated guarded source bytes and cleared only the `single-quest-writer` blocker. C8 is a forward successor that supersedes C7's old limit of expanding only to the next bounded Skill group; it does not rewrite C7 or claim retroactive authorization.

## Requirements

### R1. Fixed source authority

- Read source only as Git objects from `/Users/zhangbowen/Projects/agent-skills-private` commit `86df5a676c52950592ff9fe5966b9c1753160cb5`, tree `aa0282da9c63f8f17dd94b672b3fd6843647a0bd`, parent `e2b0d70e3a797f19461eb106601de12250000b69`.
- Authenticate branch containment, exact blobs, modes, sizes, blob OIDs, SHA-256 values, and aggregate digest.
- Freeze all 15 committed Research Skill directories plus source inventory/gate files needed to prove active membership and semantic replacement.
- Never read package bytes from or edit the dirty source working tree. Modified and untracked source overlays are excluded.
- Verification must work from frozen C8 evidence without the external checkout.

### R2. Complete migration accounting

Every committed source Skill has exactly one disposition:

- existing immutable package: `research-literature`, `research-ideation`, `research-idea-evaluation`, `research-quest-admin`;
- new package after gate pass: `research-synthesis`, `research-opportunity-mining`, `research-experiment`, `research-computation`, `research-theory`, `research-figure`, `research-writing`, `research-slides`, `research-review-case`, `research-project-setup`;
- native Trellis replacement: `research-quest`.

No duplicate package, second registry, second writer, or unaccounted source Skill is allowed.

### R3. Immutable version policy

- Existing `1.0.0` package bytes remain unchanged.
- Compare exact `86df5a6` literature and ideation method bytes with current adapted packages before evaluation.
- Material method drift creates immutable `1.1.0`; no drift retains `1.0.0`.
- Idea-evaluation and Quest-admin advance only if exact evidence proves instruction drift.
- All ten newly migrated packages start at `1.0.0`.

### R4. Successor evaluation authorization

C8 may use only:

- host: Claude;
- model: `claude-sonnet-5`;
- cases: `literature-01`, `literature-02`, `literature-03`, `ideation-01`, `ideation-02`, `evaluation-01`;
- arms: A/B/C once per case, 18 planned provider/model invocations;
- retries: at most six, only after recorded infrastructure failure with no usable output;
- hard cap: 24 total invocations.

Quest-admin cases are deterministic and use no provider call. No model substitution, extra provider, managed-worker expansion, nested worker, or automatic continuation is authorized. If exact model is unavailable, record unavailability and stop.

### R5. Gate before expansion

Before creating any of the ten new production packages, C8 must produce and pass:

1. `managed-state-exact-recovery`;
2. `no-auto-next-stage`;
3. `no-inferred-h1-h2`;
4. `no-worker-canonical-mutation`;
5. `no-worker-nested-execution`;
6. `package-replay-identity-stable`;
7. `scientific-ownership-preserved`;
8. `selected-or-blocked`;
9. `single-quest-writer`.

Quality must remain task-appropriate. Lightweight adds no mandatory extra model call, Approval, subagent, or durable artifact. Managed execution must demonstrate concrete recovery, isolation, independence, or bounded-authority value. Any zero-tolerance failure blocks expansion and remains append-only forward evidence.

### R6. Package contracts

- `research-synthesis`: bounded, model, lightweight.
- `research-opportunity-mining`: bounded, operator-explicit, lightweight; includes `templates/opportunity-template.md`.
- `research-experiment`: bounded, model, lightweight/managed; `research.experiment.round`.
- `research-computation`: bounded, model, lightweight/managed; `research.computation.case`.
- `research-theory`: bounded, model, lightweight/managed; `research.theory.case`.
- `research-figure`: bounded, model, lightweight only.
- `research-writing`: bounded, model, lightweight/managed; `research.writing.case`; on-demand `references/academic-phrasebank.md`.
- `research-slides`: bounded, model, lightweight only; digest-bound `NOTICE.md` is not worker-visible unless the method requires it.
- `research-review-case`: bounded, model, lightweight/managed; `research.audit.case`.
- `research-project-setup`: workflow, operator-explicit, lightweight/managed; `research.setup.project`; exact scaffold assets selected explicitly.

All handoffs use `autoInvoke: false`. Instructions remain lean: method, stop rule, authority boundary, output contract, prerequisites, and non-automatic handoff only. Packages cannot mutate canonical Research/Quest state, apply Proposals, complete Workflow nodes, select transitions, invoke providers, or launch child Skills/Workers/Workflows.

### R7. Distribution and conformance

- One general bundled Research Skill inventory must cover every shipped package/version/member.
- Deleting any required package or member must fail packed audit.
- Production integration coverage must authenticate canonical manifests, exact identities, members, profile restrictions, capability bindings, project override fail-closed behavior, root-only exclusions, and non-automatic handoffs.
- `research-quest` must remain absent from package discovery while its native command/state replacement remains covered.
- Generic Core schema, resolver, Dispatch, Workflow, gate, Quest, store, and capability registry remain unchanged unless a focused failing test proves a representation defect.

### R8. Operational constraints

- Preserve archived C1/C6/C7/remediation evidence and historical package versions byte-for-byte.
- Preserve unrelated dirty GitNexus Skill, `AGENTS.md`, and `CLAUDE.md` edits.
- Use normal hooks; no `--no-verify`.
- No push, PR, release, publication, or source-checkout mutation.

## Out of Scope

- New provider/API integration in product code.
- New capability IDs for figure, slides, synthesis, or opportunity mining.
- Bundled Workflow DAGs, automatic continuation, nested workers, or campaign engines.
- Host-installed generated `.claude/skills`, `.agents/skills`, or slash-command wrappers.
- Retroactive edits to archived C7 or frozen C1 evidence.
- Migration from source commits after `86df5a6`.

## Acceptance Criteria

- [ ] Pure Git-object C8 baseline authenticates exact commit/tree/parent, every frozen file, and aggregate digest without external checkout access.
- [ ] Migration matrix accounts for all 15 committed Skills exactly once.
- [ ] Pilot package versions are retained or advanced only from recorded semantic-drift evidence; existing version bytes are unchanged.
- [ ] Deterministic proof passes all nine zero-tolerance checks before expansion.
- [ ] Exactly 18 planned A/B/C calls run on `claude-sonnet-5`; total calls never exceed 24 and every retry cites infrastructure-failure evidence.
- [ ] Task-specific quality and overhead gates pass.
- [ ] Ten new schema-v3 packages authenticate with approved profiles, capabilities, members, and `autoInvoke: false` handoffs.
- [ ] `research-quest` remains one native Trellis replacement with no package or duplicate writer.
- [ ] Packed npm payload contains every expected package/version/member and rejects each required-item deletion.
- [ ] Focused and full CLI/Core tests, builds, task validation, baseline verification, `git diff --check`, GitNexus scope detection, and normal commit hooks pass.
- [ ] Product/evaluation commits, C8/C1/parent archives, and journal commit complete in required order.
- [ ] Unrelated dirty files and source checkout remain untouched.
- [ ] No push, PR, release, or publication occurs.
