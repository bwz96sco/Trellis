# C6 — Migrate Research Pilot Skill Packages

## Goal

Ship four first-class schema-v3 Research execution packages from the authenticated C1 source baseline without recreating large host-native workflow packs:

- `research-literature`;
- `research-ideation`;
- `research-idea-evaluation`;
- `research-quest-admin`.

The packages must use the C2–C5 execution-package, Workflow, gate, Quest-authority, managed Context, and Result/Proposal contracts unchanged.

## Source Authority

C6 may read source bytes only from:

```text
.trellis/tasks/08-21-thin-skill-c1-freeze-contracts/research/source-baseline/
```

The frozen baseline authenticates 19 files and 101,581 bytes from source base commit `e2b0d70e3a797f19461eb106601de12250000b69`. C6 must not read or modify the mutable external source repository.

## Requirements

### R1. Exact package set and version

- Add exactly four bundled package directories under `packages/cli/src/templates/research/skills/`.
- First migrated version is `1.0.0` for every package.
- Every package contains canonical `skill.json` and adapted `SKILL.md` bytes.
- No fifth `research-quest` execution package is added in C6; read-only Quest behavior already exists in Trellis commands and C4b state.

### R2. Semantic migration boundary

- Preserve each frozen Skill's bounded method, stop conditions, evidence distinctions, and ownership boundaries.
- Adapt host-native `$skill` invocation text into explicit Trellis package/command handoffs.
- Replace repository-relative H1/H2 validator calls with canonical `trellis research gate ...` and `trellis research workflow ...` state.
- Replace source Quest-admin helper execution with existing `trellis research quest import|export|transfer-writer ...` commands.
- Exclude source `agents/openai.yaml`; invocation policy and capability binding belong in `skill.json`.
- Exclude `scripts/validate-research-gates.py`, source Quest helper scripts, and Quest-admin reference pack from runtime packages.
- Record every semantic replacement against the frozen source digest in C6 review evidence.

### R3. `research-literature` contract

- `skillKind: bounded`.
- `invocationSource: model`.
- `entrypointType: model-context`.
- Profiles: `lightweight`, `managed`.
- Managed binding: `research.literature.review`.
- Include frozen `note-template.md` bytes as worker-visible, on-demand template member.
- Lightweight handles one bounded review/register update in the root session.
- Managed profile is reserved for explicit independent or parallel paper review; it does not make subagents mandatory for every literature request.
- Paper-local defects remain separate from replacement-method ideation.
- Quest writes remain root/admin-owned.

### R4. `research-ideation` contract

- `skillKind: bounded`.
- `invocationSource: model`.
- `entrypointType: model-context`.
- Profiles: `lightweight`, `managed`.
- Managed binding: `research.ideation.generate`.
- Include frozen `opportunity-board-template.md` bytes as worker-visible, on-demand template member.
- Produce one 3–7 candidate portfolio and stop.
- Do not evaluate, select, or auto-invoke evaluation.
- H1/H2 decisions are canonical scientific-gate records when Workflow state requires them; duplicate decision Markdown is compatibility projection only.

### R5. `research-idea-evaluation` contract

- `skillKind: workflow`.
- `invocationSource: operator-explicit`.
- `entrypointType: model-context`.
- Profile: `managed` only.
- Managed binding: `research.ideation.evaluate`.
- Include frozen `attack-template.md` bytes as worker-visible, on-demand template member.
- Freeze the candidate set; unknown novelty remains a blocker.
- Independent attacks use one separately approved managed invocation per candidate. Workers never launch nested workers, Skills, Workflows, capabilities, or Dispatches.
- Root aggregates accepted attack Results into one selected-or-blocked closure.
- Experiment handoff exists only for selected closure and never auto-invokes the next owner.

### R6. `research-quest-admin` contract

- `skillKind: admin`.
- `invocationSource: operator-explicit`.
- `entrypointType: root-command`.
- No lightweight/managed profile, managed binding, or worker-visible member.
- `SKILL.md` documents deterministic Quest import preview/write, export preview/write, and separate `transfer-writer` commands only.
- Package cannot enter model Context or managed Dispatch.
- Existing C4b single-writer projection and source-admin pre-write refusal remain authoritative.

### R7. Distribution and resolver behavior

- Bundled discovery, exact project override, invalid-project fail-closed behavior, and normalized identity remain unchanged.
- CLI build recursively copies all four packages.
- Packed inventory requires all four package manifests, instructions, and declared members.
- Packed audit authenticates canonical manifests and exact package member bytes.
- Removing any required C6 package or member must fail the packed audit.

### R8. Compatibility and authority

- Do not change historical Procedure package bytes, current Procedure registry routing, old Activation/Approval events, or replay semantics.
- Do not add a second package registry or replay path.
- Do not alter Core schema unless existing schema-v3 contracts cannot represent the approved packages.
- No package or worker can mutate canonical state directly.
- Result recording, Workflow completion, and transition remain separate root actions.

### R9. Review deferral

- Record modified central symbols, package identities, source-to-package replacements, and unresolved risks in task evidence for later review.
- Do not add a multi-agent review panel during C6.
- Focused correctness and distribution tests remain required before commit.

## Out of Scope

- Full migration of all Research Skills.
- Host-installed `.claude/skills` or `.agents/skills` generation.
- Generated slash-command wrappers.
- New capability IDs, providers, hosts, Workflow cycles, or automatic continuation.
- Real provider/model execution.
- C7 quality conclusions.
- Push, publication, release, or production activation.

## Acceptance Criteria

- [ ] Exactly four canonical schema-v3 package versions ship under bundled Research Skills.
- [ ] Every package resolves from the real bundled root and authenticates exact identity/member digests.
- [ ] Frozen template members retain exact C1 bytes.
- [ ] Semantic migration map accounts for every removed host/helper dependency.
- [ ] Literature lightweight and managed profiles share one package identity and instructions.
- [ ] Ideation emits one bounded portfolio and cannot auto-run evaluation.
- [ ] Evaluation is operator-explicit, managed-only, independently invoked per candidate, and closes selected-or-blocked at root.
- [ ] Quest admin is root-command-only and cannot enter model/worker Context.
- [ ] Existing canonical H1/H2 and Quest single-writer authority replace source-local validators/writers.
- [ ] Packed npm audit requires and authenticates all four packages and members.
- [ ] Historical Procedure replay and current non-Skill behavior remain unchanged.
- [ ] Focused tests, typecheck/lint/build, package audit, task validation, and `git diff --check` pass.
- [ ] Critical changes and deferred review points are recorded.
