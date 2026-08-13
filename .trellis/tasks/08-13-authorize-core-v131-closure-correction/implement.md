# G1 — Core v1.3.1 closure correction authorization implementation plan

## Authorization state

The user authorized the complete forward-only sequence on 2026-08-13: separately commit this governance boundary, separately implement and commit the LOW-risk Core correction, then resume the existing T2 work. No push, activation, publication, provider execution, or later-stage execution is authorized.

This run authors and validates G1 only. It must not edit production, stage files, or commit.

## Current-run scope

Modify exactly these six files:

1. `task.json`
2. `prd.md`
3. `design.md`
4. `implement.md`
5. `implement.jsonl`
6. `check.jsonl`

## Ordered execution

1. Make `task.json` the sole normative prospective authorization.
2. Bind route source `b7c3c6645afb2d34c14548069bbaba61d060d5ee`, its exact T1-core-defect return rule, and defective predecessor `05573ab1a37af3de66bfc6a797b1e35ba3c47cf3`.
3. Bind distinct governance and technical actors and the separate technical task path.
4. Authorize exactly the four accepted closure families and focused positive/negative tests.
5. Freeze the exact eight-path technical commit inventory; authorize no Core spec path.
6. Require fresh post-governance GitNexus confirmation before the production edit.
7. Preserve current T2 work and block T2 until the Core correction commit.
8. Preserve historical replay, accepted semantics/digest, Procedure states, Proposal-only authority, and all operational denials.
9. Validate the six-file governance boundary without staging or committing.

## Current-run verification

```bash
PYTHONDONTWRITEBYTECODE=1 uv run python \
  .trellis/scripts/task.py validate \
  .trellis/tasks/08-13-authorize-core-v131-closure-correction

git diff --check -- \
  .trellis/tasks/08-13-authorize-core-v131-closure-correction/task.json \
  .trellis/tasks/08-13-authorize-core-v131-closure-correction/prd.md \
  .trellis/tasks/08-13-authorize-core-v131-closure-correction/design.md \
  .trellis/tasks/08-13-authorize-core-v131-closure-correction/implement.md \
  .trellis/tasks/08-13-authorize-core-v131-closure-correction/implement.jsonl \
  .trellis/tasks/08-13-authorize-core-v131-closure-correction/check.jsonl
```

Authenticate that the task directory contains exactly the six standard files and that none is staged. Do not run production tests in this governance-only run; they cannot detect a governance-artifact defect that the validation and path checks do not already cover.

## Later G1 commit gate

Only in a separately authorized commit operation:

1. stage exactly the six G1 files;
2. authenticate the staged path set exactly;
3. run path-scoped `git diff --cached --check`;
4. run staged GitNexus change detection and require no changed production symbol or affected production process;
5. commit G1 alone.

No T1C or T2 path may enter the G1 commit.

## Later T1C execution gate

After the G1 commit:

1. create `.trellis/tasks/08-13-correct-core-v131-closure-families` with only its six standard files;
2. assign `claude-t1-core-correction-implementer`;
3. authenticate the committed G1 `task.json` and exact predecessor commits;
4. refresh upstream GitNexus impact for `buildMethodologyReportV131` before editing;
5. change only `packages/core/src/research/methodology-reports.ts` and `packages/core/test/research/methodology-runtime.test.ts` outside the technical task boundary;
6. prove positive acceptance for `research-ideation` and `research-idea-evaluation` and negative rejection for `research-quest` and `research-computation`;
7. run the focused Core test, then Core lint, typecheck, and test;
8. authenticate and separately commit exactly the eight authorized technical paths.

If an additional source, test, spec, task, or evidence path is required, stop for another forward-only governance decision.

## T2 return gate

T2 remains blocked and its current uncommitted work remains untouched until the T1C commit exists. Then resume the existing T2 task under its already recorded authority. Do not infer T3–T7, activation, provider, publication, release, push, archive, or acceptance authority.
