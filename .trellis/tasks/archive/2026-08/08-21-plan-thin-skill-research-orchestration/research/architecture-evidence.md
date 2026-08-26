# Thin-Skill Research Orchestration Evidence

## Trellis Runtime

- Current Research capability registry is closed and immutable; active Procedure version is `1.0.0`: `packages/core/src/research/stage-capabilities.ts:6-45`, `:94-101`, `:127-286`.
- Capability activation mode describes operational authority, not source-skill model/explicit invocation policy.
- Procedure v1 validates manifest plus instructions; v2 adds digest-bound support-pack inventory: `packages/core/src/research/procedure-policy.ts:81-154`, `:628-762`.
- New activation uses `registry-current`; historical replay uses exact `activation-recorded`: `packages/cli/src/commands/research/procedure-resolution.ts:503-620`.
- Invalid project-local package fails closed instead of falling back.
- Activation/Approval bind exact capability, Procedure, policy, request, scope, host, limits, and expiry: `packages/core/src/research/types.ts:247-301`.
- Approved Context is zero-write and revalidates the complete authority chain: `packages/cli/src/commands/research/dispatch-approved-context.ts:255-534`.
- Managed recording atomically records Result, Proposal, and Approval consumption; root separately applies/rejects Proposal: `packages/cli/src/commands/research/dispatch-command.ts:1420-1824`.
- Workers cannot mutate canonical state, launch nested skills/Dispatches, approve Proposals, or mutate Git history: `.trellis/spec/cli/backend/research-worker-hooks.md:396-475`.
- Quest state is event-sourced and rebuildable, but current reducer does not encode workflow-specific transitions or H1/H2: `packages/core/src/research/reducer.ts:259-298`; `packages/core/src/research/projections.ts:78-146`.
- Current Research workflow is static Markdown, not a machine-readable graph: `packages/cli/src/templates/trellis/workflows/research/workflow.md:1-153`; `packages/cli/src/utils/workflow-resolver.ts:1-59`.
- Procedure 2.0.7 remains historical/dormant and must not become the pilot baseline: `.trellis/spec/cli/backend/commands-research.md:706-733`; `.trellis/spec/core/backend/research-state.md:873-885`.

## Source Research Skills

Repository inspected:

```text
/Users/zhangbowen/Projects/agent-skills-private
branch: chore/retire-find-skills
HEAD: e2b0d70
```

The working tree contains relevant modified and untracked Research files. Pilot import must use a clean commit or explicit authenticated snapshot.

### Invocation inventory

Exactly 15 Research packages:

- explicit-only: `research-idea-evaluation`, `research-opportunity-mining`, `research-quest-admin`;
- model-selectable: remaining 12 packages.

Authority: `/Users/zhangbowen/Projects/agent-skills-private/scripts/validate-research-skills.py:16-36`.

### Bounded lifecycle

- Literature diagnoses paper-local evidence and hands derivative work to explicit opportunity mining: `skills/research-literature/SKILL.md:10-32`.
- Ideation produces one 3–7 candidate portfolio, cannot judge/select, names evaluation, and stops: `skills/research-ideation/SKILL.md:8-23`.
- Quest-governed ideation uses H1 then generation then H2; a Quest file alone does not activate the gates: `skills/research-ideation/SKILL.md:25-39`.
- Idea evaluation freezes candidates, uses independent attacks, and closes selected-or-blocked: `skills/research-idea-evaluation/SKILL.md:11-25`.

### Quest authority

- `research-quest` is read-only status/resume/next-owner routing: `skills/research-quest/SKILL.md:8-38`.
- `research-quest-admin` owns preview/write init, migration, mutation, event append, and projection rebuild: `skills/research-quest-admin/SKILL.md:9-45`.
- migration preserves backup/scalar text and refuses owner inference: `skills/research-quest-admin/references/quest-pack.md:27-46`.
- only reviewed milestones enter `research-events.jsonl`: `skills/research-quest-admin/references/quest-pack.md:48-64`.

### Artifact policy

Current source policy favors compact Markdown and conditional durability. No mandatory HTML report, provenance hash, manifest, numbered pack, queue, or campaign wrapper: `registry/source-io-contracts.md:205-225`.

### Simplification evidence

- `96b17e0`: removed roughly 6,700 lines of large ideation/evaluation packs, reports, manifests, and validators.
- `fa7d87e`: removed roughly 2,600 lines of shared pack/report infrastructure.
- `5d8eb3b`: restored explicit boundaries and H1/H2 without restoring heavy packs.
- active Direct/Pack/Deep/Campaign modes are rejected: `scripts/validate-research-skills.py:361-378`.

### Packaging constraints

- Ideation/evaluation currently depend on repository-relative `scripts/validate-research-gates.py`; Trellis migration must package or replace this deterministic surface.
- `research-literature` currently requests one clean subagent per paper; the pilot should measure this rule rather than copy it as universal managed dispatch.
- `research-idea-evaluation` clean independent attacks are an intentional independence boundary.
- `research-quest-admin` must become a root command, not a proposal-only worker.

## Memory Evidence

- `drawer_engineering_research_workflow_b74ccaed`: large workflow value must be measured by net quality and efficiency; keep generic orchestration thin and task-selective.
- `drawer_skill_manager_research_skills_4cf1729612e1`: source skills use model/explicit invocation and bounded/workflow/advisory kinds; complex workflows are explicit-only.
- `drawer_skill_manager_research_skills_74384f854a66`: Quest read and durable mutation ownership were intentionally split.
- `drawer_engineering_research_workflow_c23df3196e5f`: formal T6/T7 assurance and Procedure 2.0.7 activation were stopped as non-product-critical work.
