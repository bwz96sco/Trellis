# C9 First-Party Migration Implementation

## 1. Activate forward identity

- Fix task branch/base metadata to the target worktree branch.
- Add implementation/check context manifests.
- Validate planning artifacts and start C9.
- Verify C8 commit and task-tree provenance before copying any input.

## 2. Materialize C9 evaluation inputs

- Copy reusable C8 evaluation/source/case/package evidence from Git commit `71551223...`, excluding C8 runs, outputs, summary, decision, and provider-failure records.
- Generate `predecessor.json` with exact copied-file digests and C8 blocked identity.
- Change only C9-owned evaluation ID, authorization ref, runner environment contract, fresh output/ledger paths, and C9 prose.
- Add tests proving predecessor-byte authentication and C8 exclusion.

## 3. Enforce first-party routing

- Run GitNexus impact before editing runner/harness symbols.
- Add explicit sanitized child environment to `claude_runner.py`.
- Add deterministic tests for key removal, unchanged parent environment, command identity, and fake-executor behavior.
- Run sanitized `claude auth status --json`; record only `loggedIn`, `authMethod`, and `apiProvider` plus digest.
- Do not reserve or launch a model attempt unless preflight is exact first-party.

## 4. Prepare and prove C9

```bash
uv run python .trellis/tasks/08-25-thin-skill-c9-first-party-migration/research/build_source_baseline.py --verify
uv run python .trellis/tasks/08-25-thin-skill-c9-first-party-migration/research/tools/evaluation_harness.py validate
uv run python -m unittest discover -s .trellis/tasks/08-25-thin-skill-c9-first-party-migration/research/tests -p 'test_*.py'
uv run python .trellis/tasks/08-25-thin-skill-c9-first-party-migration/research/tools/evaluation_harness.py proof
```

Confirm proof and ledger are valid before provider execution.

## 5. Execute finite A/B/C gate

- Run six cases in fixed order: literature 01–03, ideation 01–02, evaluation 01.
- Run A/B/C once per case using unique logical run IDs.
- After each attempt, validate ledger/accounting and stop on any nonretryable failure.
- Use retries only when the immutable preceding result is a no-output infrastructure failure and total reservations remain below 24.
- Open evaluator inputs only after all three case arms are usable.
- Append one case evaluation per live case with every applicable assertion.
- Regenerate summary/proof/decision and require `fullMigrationClaimAllowed: true`.

## 6. Build remaining packages

- Generate the ten `1.0.0` package directories from the frozen source baseline and package blueprint.
- Authenticate canonical manifests, instructions, and members.
- Verify exact managed capability bindings and lightweight-only restrictions.
- Verify every handoff is declarative with `autoInvoke: false`.
- Verify no `research-quest` package exists.

## 7. Generalize distribution coverage

- Run GitNexus impact on the exported bundled package inventory symbol.
- Rename it with GitNexus-aware rename if supported; otherwise make a scoped manual symbol edit only after impact evidence.
- Enumerate all sixteen package versions and members.
- Convert package integration tests to the full data-driven matrix.
- Update packed audit expected counts and missing-entry cases.

## 8. Verify

```bash
uv run python .trellis/tasks/08-25-thin-skill-c9-first-party-migration/research/build_source_baseline.py --verify
uv run python .trellis/tasks/08-25-thin-skill-c9-first-party-migration/research/tools/evaluation_harness.py validate
pnpm --filter @mindfoldhq/trellis-core build
VITEST_MAX_WORKERS=2 pnpm --filter @mindfoldhq/trellis exec vitest run \
  test/commands/research-pilot-skill-packages.integration.test.ts \
  test/commands/research-skill.integration.test.ts \
  test/commands/research-execution-package-resolution.integration.test.ts \
  test/commands/research-managed-skill-lifecycle.integration.test.ts \
  test/scripts/packed-cli-audit.test.ts
pnpm --filter @mindfoldhq/trellis-core test
VITEST_MAX_WORKERS=2 pnpm --filter @mindfoldhq/trellis test
pnpm --filter @mindfoldhq/trellis build
git diff --check
```

Run GitNexus staged change detection before commit. Confirm C8 and all existing package versions are byte-identical. Confirm only the eight unrelated dirty files remain outside staged work.

## 9. Commit and close

- Temporarily stash only the eight unrelated dirty paths if protected-file hooks require it.
- Commit with normal hooks and `VITEST_MAX_WORKERS=2`; never use `--no-verify`.
- Restore unrelated files exactly and remove hook-generated historical evidence side effects.
- Archive C9, C8, C1, and parent in dependency-safe order.
- Record journal against product/evaluation commits.
- Do not push, open a PR, release, or publish.
