# C8 Full Migration Implementation Plan

## 1. Activate Planning Contract

- Link C8 to `08-21-plan-thin-skill-research-orchestration`.
- Validate `prd.md`, `design.md`, `implement.md`, `implement.jsonl`, and `check.jsonl`.
- Start C8; confirm status `in_progress`.

## 2. Freeze Source

- Implement `research/build_source_baseline.py` with build and offline `--verify` modes.
- Authenticate commit `86df5a6`, tree, parent, branch containment, exact committed inventory, modes, blob OIDs, sizes, SHA-256 values, and aggregate digest.
- Write frozen files, canonical manifest, README, and `migration-matrix.json`.
- Verify source working-tree bytes never enter evidence.

Validation:

```bash
uv run python .trellis/tasks/08-25-thin-skill-c8-full-migration/research/build_source_baseline.py
uv run python .trellis/tasks/08-25-thin-skill-c8-full-migration/research/build_source_baseline.py --verify
```

## 3. Align Pilot Package Identities

- Compare frozen literature/ideation methods against current packages.
- Record semantic comparison and accepted versions.
- Add only forward versions required by material drift.
- Assert all pre-existing version-directory bytes remain unchanged.

Rollback point: remove only newly created version directories.

## 4. Build Evaluation Harness and Deterministic Proof

- Use current Claude CLI documentation evidence before writing runner details.
- Create immutable case definitions and isolated arm workspaces.
- Create append-only run recorder with 18 planned IDs and 24-call cap.
- Run deterministic checks for identity/replay, state recovery, node/transition separation, H1/H2 ownership, proposal-only workers, no nested execution, selected-or-blocked closure, and single Quest writer.
- Record `deterministic-proof.json`; stop on any failure.

## 5. Execute Authorized A/B/C Runs

- Run six cases × A/B/C on Claude `claude-sonnet-5`.
- Record host/model/session/usage metadata exposed by the host.
- Retry only a no-output infrastructure failure; append superseding record; never exceed 24 calls.
- Evaluate outputs after each case has all three usable arms.
- Write `summary.json` and `decision.md`.
- Continue only if every zero-tolerance, quality, and overhead gate passes.

Rollback point: none for evidence; failures remain append-only and block expansion.

## 6. Add Ten Packages

- Build each package from frozen bytes and explicit semantic adaptation.
- Include only required members and lean instructions.
- Reuse existing capabilities exactly; keep synthesis/opportunity-mining/figure/slides lightweight-only.
- Set every handoff `autoInvoke: false`.
- Do not add `research-quest` package or bundled Workflow DAG.

## 7. Update Inventory and Tests

Before each existing exported symbol/function edit:

```bash
node .gitnexus/run.cjs impact --repo "<target-worktree>" --target "<symbol>" --direction upstream
```

- Rename `RESEARCH_PILOT_SKILL_PACKAGES` through GitNexus-aware rename.
- Expand packed required inventory to all shipped package versions/members.
- Convert exact-four integration oracle into complete data matrix.
- Add packed source/tar missing-package and missing-member assertions.
- Avoid Core/runtime/spec edits unless focused failure proves need.

## 8. Verify

```bash
uv run python .trellis/tasks/08-25-thin-skill-c8-full-migration/research/build_source_baseline.py --verify
pnpm --filter @mindfoldhq/trellis-core build
pnpm --filter @mindfoldhq/trellis exec vitest run \
  test/commands/research-pilot-skill-packages.integration.test.ts \
  test/commands/research-skill.integration.test.ts \
  test/commands/research-execution-package-resolution.integration.test.ts \
  test/commands/research-managed-skill-lifecycle.integration.test.ts \
  test/scripts/packed-cli-audit.test.ts
pnpm --filter @mindfoldhq/trellis test
pnpm --filter @mindfoldhq/trellis-core test
pnpm --filter @mindfoldhq/trellis build
git diff --check
```

Also verify source checkout status, eight unrelated Trellis paths, archived evidence, existing package bytes, accepted inventory, capability resolution, native Quest absence, and provider call count.

## 9. Commit and Close

Before every commit:

```bash
node .gitnexus/run.cjs detect-changes \
  --repo "<target-worktree>" \
  --scope compare \
  --base-ref variant/research-workflow
```

- Commit product/evaluation/full-migration changes with normal hooks.
- Use `VITEST_MAX_WORKERS=2` only for known load contention.
- Archive C8.
- Archive completed C1.
- Mark parent complete only after all children are archived; archive parent.
- Record journal with product/evaluation commit hashes only.
- Do not push, open PR, release, or publish.
