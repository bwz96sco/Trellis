# Correct Core v1.3.1 closure family validation

## Goal

Apply the separately authorized forward-only Core correction so v1.3.1 report closure-source validation accepts exactly the four families defined by the accepted contract.

## Requirements

### Exact correction

- In `packages/core/src/research/methodology-reports.ts`, set `V131_CLOSURE_FAMILIES` to exactly, in order:
  1. `research-literature`
  2. `research-ideation`
  3. `research-idea-evaluation`
  4. `research-experiment`
- `research-quest` and `research-computation` must not be accepted as v1.3.1 closure-source families.

### Regression coverage

- In `packages/core/test/research/methodology-runtime.test.ts`, directly prove that reports with `research-ideation` and `research-idea-evaluation` closure sources are accepted.
- Directly prove that reports with `research-quest` and `research-computation` closure sources are rejected.
- Preserve the existing closed report-v2 shape, digest, ordering, sidecar serialization, and all other behavior.

### Scope and preservation

- Modify only this task's six standard files and the two authorized Core paths.
- Do not edit any other Core file or any spec.
- Do not rewrite completed T1 artifacts or historical commits.
- Preserve historical v1.3.0 replay byte-for-byte, accepted v1.3.1 identity and digest, live Procedure `1.0.0`, dormant Procedure `2.0.7`, and Proposal-only worker authority.
- Preserve the existing uncommitted T2 15-path set and all unrelated working-tree changes.
- Do not add a compatibility layer, migration, wrapper, feature flag, or extra artifact.
- Do not stage, commit, push, activate, publish, release, archive, execute providers, or infer later-stage authority.

## Acceptance Criteria

- [ ] The accepted closure family set is exactly `research-literature`, `research-ideation`, `research-idea-evaluation`, and `research-experiment` in that order.
- [ ] Focused positive tests cover `research-ideation` and `research-idea-evaluation`.
- [ ] Focused negative tests reject `research-quest` and `research-computation`.
- [ ] Existing report-v2 shape and behavior remain unchanged.
- [ ] The task directory contains exactly the six standard files.
- [ ] `task.py validate` passes through `uv`.
- [ ] Core build, focused test, lint, typecheck, and full test pass serially.
- [ ] Only the eight authorized task/Core paths are changed by this implementation.
- [ ] No file is staged or committed.
