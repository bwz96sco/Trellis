# Complete first-party Research Skill migration

## Goal

Complete the Research Skill migration after the immutable C8 provider-routing failure by running one forward C9 evaluation through first-party Claude, then shipping every remaining committed Research Skill as a schema-v3 package or the existing native Trellis replacement.

## Background

C8 is committed at `715512230fee792377567c9cbba46319f2569c07`. Its deterministic proof passed, but three planned `literature-01` arms inherited local proxy/model overrides and failed before a usable Claude model result with `unknown provider for model claude-sonnet-5`. Those six ledger records, the blocked decision, and all C8 paths remain immutable.

The operator has explicitly authorized C9 with first-party Claude, exact model `claude-sonnet-5`, 18 planned A/B/C calls, at most 6 infrastructure-only retries, and a 24-attempt hard cap. No model, provider, or worker substitution is allowed.

## Requirements

### R1 — Forward-only evaluation identity

- Create `thin-skill-c9-first-party-migration` as a new evaluation identity.
- Materialize C9 inputs from committed C8/source/package bytes; never rewrite C8 ledger, outputs, summary, or decision.
- Record C8 commit, blocked evaluation ID, source aggregate digest, and accepted package identities as immutable predecessor provenance.
- Use append-only reservations, results, corrections, and case evaluations under C9 only.

### R2 — First-party Claude routing

- The child Claude process must not inherit local proxy, custom model, provider switch, API-key, or auth-token overrides.
- Preserve installed Claude Code first-party OAuth authentication.
- Run an auth-status preflight without a model call and record only non-secret route fields.
- Every live attempt uses `claude --safe-mode`, exact `claude-sonnet-5`, one turn, no tools, no MCP, no slash commands, no session persistence, and an isolated workspace.
- Accept a completion only when `modelUsage` contains exactly `claude-sonnet-5`, `num_turns` is 1, result text is nonempty, and no tool or permission activity occurred.

### R3 — Finite provider accounting

- Planned live cases: `literature-01`, `literature-02`, `literature-03`, `ideation-01`, `ideation-02`, and `evaluation-01`.
- Run arms A/B/C once per case: 18 planned calls.
- Permit at most 6 retries, only after a recorded infrastructure failure with no usable model output.
- Stop at 24 total reserved attempts.
- Never continue after exact-model substitution, auth failure, usable partial output, or content/assertion failure.

### R4 — Gate before expansion

- Preserve the nine zero-tolerance checks from C8.
- Require all applicable quality and overhead assertions to pass for all six live case evaluations.
- Keep evaluator access closed until all A/B/C outputs for a case are usable.
- Do not create the ten remaining packages unless C9 permits the full migration claim.

### R5 — Complete package migration

After C9 passes, add exactly these immutable `1.0.0` schema-v3 packages:

- `research-synthesis`
- `research-opportunity-mining`
- `research-experiment`
- `research-computation`
- `research-theory`
- `research-figure`
- `research-writing`
- `research-slides`
- `research-review-case`
- `research-project-setup`

Keep `research-quest` as the native Trellis replacement. Reuse the existing package resolver, capability registry, managed lifecycle, Workflow engine, gate state, Quest state, and canonical mutation boundary. Add no second registry, state writer, prompt path, capability, worker, provider, or bundled Workflow DAG.

### R6 — Distribution, verification, and closure

- Expand packed distribution coverage from six existing versions to sixteen total package versions.
- Authenticate every manifest, instruction file, declared member, profile restriction, managed binding, handoff stop, and packed tar entry.
- Run source-baseline verification, C9 harness tests/proof, focused package tests, full Core/CLI suites, builds, whitespace checks, and GitNexus change detection.
- Commit with normal hooks. Preserve unrelated `AGENTS.md`, `CLAUDE.md`, and six GitNexus Skill modifications.
- Archive C9, close/archive C8 with its blocked history intact, archive completed C1, then close/archive the parent after all children are archived. Journal product/evaluation commits only.
- Do not push, open a PR, release, or publish.

## Out of Scope

- Reclassifying or retrying C8 attempt identities.
- Editing the dirty source repository or reading uncommitted source bytes.
- Changing archived C1/C6/C7/remediation evidence.
- Adding optional managed capabilities for symmetry.
- Product API/SDK integration, nested workers, automatic continuation, or model fallback.

## Acceptance Criteria

- [ ] C8 commit and all committed C8 evaluation bytes remain unchanged.
- [ ] C9 auth preflight proves first-party Claude routing without a model call or secret capture.
- [ ] C9 records exactly 18 usable A/B/C completions, plus no more than 6 valid infrastructure retries, with total attempts no greater than 24.
- [ ] Every accepted completion resolves exactly to `claude-sonnet-5` with one turn and zero tool activity.
- [ ] Six live case evaluations and deterministic Quest/single-writer proof pass all applicable assertions.
- [ ] C9 decision permits the full migration claim before package expansion starts.
- [ ] Ten new package directories authenticate and resolve under the approved profile/capability/member matrix.
- [ ] `research-quest` remains native and no duplicate package exists.
- [ ] Bundled discovery and packed audit report sixteen package versions and every declared member.
- [ ] Focused tests, full Core/CLI tests, builds, task validation, GitNexus detection, and normal hooks pass.
- [ ] Product/evaluation work is committed; C9, C8, C1, and parent orchestration close in dependency-safe order; journal references product commits.
- [ ] Unrelated dirty files remain byte-preserved and excluded.
- [ ] No push, PR, release, publication, provider expansion, or model substitution occurs.
