# C8 isolated single-turn execution

Package arm: follow only the exact accepted schema-v3 package method below.
Complete exactly one bounded case unit. Do not invoke a Skill, Workflow, capability, Procedure, Dispatch, worker, provider, model, tool, or automatic continuation. Do not mutate canonical Quest, gate, Workflow, Dispatch, Approval, Result, Proposal, or writer state. Return only the requested case output. You cannot inspect sibling-arm outputs.

# Frozen method material

## `method/package/SKILL.md`

# Research Literature

Review literature only for one explicit research question. Build or update a question-scoped paper register and one evidence-grounded note at a time.

## Method

1. Freeze the target question. If it is missing or ambiguous, stop.
2. Verify paper identity and metadata before registering or citing it. Reuse an existing completed note instead of rereading the paper.
3. Each register row must contain `id`, `title`, `year`, `status`, and `relevance`. `status` is exactly one of `candidate`, `skimmed`, `read`, or `dropped`; `relevance` must be specific to the frozen target question.
4. Read skeleton-first: research question, stated gap, field map, method modules, assumptions, experiments, ablations, limitations, and application scenario.
5. When requested, use `templates/note-template.md` without changing its evidence categories. Anchor material claims to sections, pages, tables, or results.
6. Keep author-stated limitations, observed failures, and analyst inferences separate. For abstract-only access, mark deeper analysis as not assessable.
7. After a completed review, save or return the note and update the same register row's `status` and question-specific `relevance`.
8. Update only the declared register or note output. Report blocked access or uncertain metadata instead of filling gaps by inference.

## Profiles

- `lightweight`: perform one bounded review or register update in the root session.
- `managed`: perform one independently approved paper review per invocation. Parallel reviews require separate managed invocations; they are optional, not the default for every request.

## Stop conditions

Stop after the requested paper/register unit is complete, when the question or evidence is insufficient, or when work would become derivative opportunity analysis. Paper-local defect diagnosis belongs here; derivative opportunity analysis belongs to a separately selected `research-opportunity-mining` package.

Never write canonical Quest, gate, Workflow, Dispatch, Approval, Result, or Proposal state. Do not launch a nested worker, model or provider call, Skill, Workflow, capability, Procedure, or Dispatch. Return bounded findings through the provided output contract; the root records accepted output and performs any later handoff explicitly.


## `method/package/skill.json`

{"schemaVersion":3,"packageKind":"skill","id":"research-literature","version":"1.1.0","skillKind":"bounded","invocationSource":"model","entrypointType":"model-context","instructionFile":"SKILL.md","allowedProfiles":["lightweight","managed"],"managedBinding":{"capabilityId":"research.literature.review"},"members":[{"path":"templates/note-template.md","role":"template","load":"on-demand","visibility":"worker-visible","sha256":"3e01c5ec149958590ef3d3ab6751fb1db3203b978b5a698c22e7eef33894ed71","maxBytes":2499}],"handoff":{"suggestedSkillIds":["research-opportunity-mining"],"autoInvoke":false}}
