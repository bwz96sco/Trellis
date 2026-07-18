# Research skills and Claude hooks

## Goal

Ship small research stage-owner skills, one bounded research-worker contract, and narrow Claude Code hook support that orients the root session and injects explicit research dispatches without changing scientific authority or native Trellis behavior.

## Requirements

### Stage-owner skills

- Add these bundled skills through existing recursive common skill discovery:
  - `trellis-research-setup`
  - `trellis-research-quest`
  - `trellis-research-literature`
  - `trellis-research-ideation`
  - `trellis-research-experiment`
  - `trellis-research-computation`
  - `trellis-research-theory`
  - `trellis-research-audit`
  - `trellis-research-writing`
- Each skill owns one Quest stage, stays dormant outside explicit research intent or dispatch, reads bounded pointers rather than broad workspace contents, and keeps observation separate from proposed canonical changes.
- Skills must never append research events, apply/reject Proposals, promote Claims, mutate projections, claim external completion without evidence, or require Trellis in child repositories.
- Skill output must preserve the worker contract: normalized Result plus untrusted Proposal for root review.

### Worker cards

- Add one platform-neutral research worker card under `.trellis/agents/` through existing Trellis template discovery.
- Add one Claude Code agent wrapper for the same bounded worker role without replacing the existing `trellis-research` code/search agent.
- Worker instructions must enforce target-repository scope, allowed write paths, declared checks, no root research-state mutation, no automatic Git commit, and final Result + Proposal JSON compatible with `trellis research dispatch record-result`.

### SessionStart

- Keep existing compact native Task/workflow context unchanged for native/custom workflows.
- For an initialized research control plane or selected bundled research workflow, append one compact `<research-state>` block containing only:
  - ledger head sequence;
  - current active Quest ID/title when deterministically available;
  - Quest stage and mapped owner skill;
  - active-Quest ambiguity/count when relevant;
  - pending Proposal count;
  - compact blocker/next-action fallback when schema V1 has no explicit fields;
  - pointers to research status, ledger, selected Quest projection, and dispatch directory.
- Never inline full Quest, Campaign, Run, Evidence, Claim, dispatch, Result, or Proposal bodies.
- Malformed workflow metadata, ledger, or projection data must produce a short validation warning and `trellis research validate` pointer, not guessed state.
- When session identity exists and research state is valid, persist the observed head sequence as session runtime metadata without clobbering `current_task`, `current_run`, platform metadata, or unknown fields.

### UserPromptSubmit

- Keep existing breadcrumb behavior byte/semantics-compatible outside Claude Code research workflow sessions.
- In Claude Code with bundled `research` selected:
  - emit no output when ledger head equals session `research_last_seen_seq`;
  - when head changes, emit one compact `<research-state-changed>` pointer containing old/new sequence and `trellis research status --json` guidance;
  - atomically update only `research_last_seen_seq` after successful valid-state emission;
  - never load full research artifacts per prompt.
- Missing session identity or malformed state must fail open with no runtime overwrite; malformed canonical research state may emit one compact validation pointer.

### Explicit Agent dispatch

- Preserve existing implement/check/research Task injection and the `<!-- trellis-hook-injected -->` marker.
- Claude Code research routing activates only when the first prompt line exactly matches:

  ```text
  Research dispatch: .trellis/research/dispatches/<dsp-id>/request.json
  ```

- Resolve the control-plane `.trellis` root before any nearest child Git root.
- Validate path containment, dispatch ID/path agreement, strict request shape, known stage-owner skill, Quest projection/stage ownership, optional Task reference, and repository runtime resolution before injecting work.
- Resolve target repository from `.trellis/.runtime/research/repo-bindings.json` first, then tracked repository locator; canonicalize the real path and reject unresolved/escaping targets.
- Inject only request fields and bounded resolved pointers: owner skill, target repository, objective, acceptance criteria, context pointers/text, allowed writes, expected outputs, checks, optional Task, and Result + Proposal contract.
- Invalid explicit research dispatches must not fall through into unbounded work. Inject a marked validation-failure prompt that tells the worker to perform no writes and report the error.
- Research dispatch routing is Claude-only in V1. Other platforms retain current hook behavior.

### Boundaries

- Root workspace remains sole supported canonical research-state mutation authority.
- Child repositories need no Trellis install, child hook, child skill, child MCP config, or active Task.
- No `Stop`, `SessionEnd`, broad `PostToolUse`, or per-Edit/Write research hook.
- No automatic event append, Proposal apply/reject, Claim promotion, Mempal write, Git commit, scheduler, or remote service.
- No tracked absolute machine paths. Absolute target paths may appear only in ignored runtime data and injected ephemeral hook context.
- Preserve unrelated working-tree changes.

## Acceptance Criteria

- [ ] All nine skills install/update on every platform through existing bundled-skill discovery and have narrow stage-specific trigger descriptions.
- [ ] `.trellis/agents/research.md` and Claude `trellis-research-worker` wrapper ship through init/update template paths.
- [ ] Native/custom SessionStart and UserPromptSubmit tests remain unchanged.
- [ ] Research SessionStart emits compact valid state, handles multiple/no active Quests, warns on malformed state, and writes only `research_last_seen_seq` when safe.
- [ ] Research UserPromptSubmit is silent for unchanged sequence and emits exactly one compact pointer for changed sequence while preserving all other session JSON fields.
- [ ] Claude explicit dispatch injection works from control-plane root with and without linked Task, resolves a child repository, preserves marker idempotency, and injects no full unrelated artifacts.
- [ ] Invalid path, malformed request, owner-stage mismatch, unresolved repository, and duplicate-injection cases fail safely without canonical research mutation or child writes.
- [ ] Existing `trellis-implement`, `trellis-check`, and `trellis-research` injection behavior remains covered and passing.
- [ ] Generated-template tests, focused hook runtime tests, Python lint, CLI lint/typecheck/build, root typecheck, and `git diff --check` pass.
- [ ] Relevant executable specs document signatures, runtime fields, output envelopes, validation matrix, tests, and wrong/correct examples.
- [ ] No commit is created unless user explicitly requests one.
