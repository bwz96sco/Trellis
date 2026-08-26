# C1 Implementation Plan

## Preconditions

- Parent planning summary approved.
- Parent task is `in_progress`.
- C1 remains contract/evidence-only.
- C2–C7 stay unstarted.

## Step 1 — Authenticate source state

1. Record source repository root, branch, `HEAD`, and relevant `git status --short` paths.
2. Resolve direct file dependencies from pilot SKILL files and helpers.
3. Produce exact include/exclude inventory.
4. Stop if a required dependency is missing, generated from unavailable bytes, symlinked outside source root, or ambiguously owned.

Verify:

- every included path exists as a regular file;
- inventory is sorted and unique;
- unrelated dirty files are excluded with reason.

## Step 2 — Materialize immutable baseline

1. Copy exact included bytes into `research/source-baseline/files/` preserving source-relative paths.
2. Generate `manifest.json` with branch, base commit, relevant dirty state, mode, size, role, and SHA-256 per file.
3. Write `README.md` describing capture method, intended consumers, and prohibition on ambient source reads.
4. Re-read copied bytes and verify all manifest digests/sizes/modes.

Use `uv` for Python generation or validation scripts.

## Step 3 — Update executable code-specs

Update only relevant sections of:

- `.trellis/spec/core/backend/research-state.md`;
- `.trellis/spec/cli/backend/commands-research.md`;
- `.trellis/spec/cli/backend/research-worker-hooks.md` when managed Context identity needs contract coverage;
- other listed targets only when a concrete contract requires them.

Required scenarios:

1. normalized execution-package identity and historical replay;
2. schema-v3 thin-skill manifest and three separate invocation concepts;
3. DAG workflow-instance events and one-node stop;
4. canonical H1/H2 event distinct from Approval;
5. Quest field mapping/import/export/loss behavior;
6. source-admin authority projection and pre-write refusal.

Each scenario must include signatures, payload fields, error matrix, cases, tests, and wrong/correct example.

## Step 4 — Validate C1 boundary

Run:

```bash
uv run python ./.trellis/scripts/task.py validate .trellis/tasks/08-21-thin-skill-c1-freeze-contracts
git diff --check
```

Also run a deterministic baseline validator that asserts:

- manifest schema and sorted unique paths;
- copied bytes match digest/size/mode;
- no path escapes baseline/source roots;
- all declared files exist;
- no undeclared file exists under baseline `files/`;
- source worktree remains unchanged by C1.

Inspect Git status and require changed paths to be limited to:

- parent/child task metadata created by approved decomposition;
- C1 task artifacts and baseline evidence;
- explicitly selected Research code-spec files.

## Step 5 — Commit and authenticate

Before commit:

1. run GitNexus `detect_changes({scope: "compare", base_ref: "variant/research-workflow"})` as required by repository policy;
2. confirm no product symbols or execution flows changed;
3. run normal hooks; never bypass them.

Commit only the approved decomposition/C1 contract boundary. Authenticate commit paths and clean/understood remaining status.

## Stop Conditions

Stop without starting C2 when:

- source inventory cannot be reproduced;
- copied bytes fail digest verification;
- normalized replay identity remains ambiguous;
- any Quest field lacks mapping/preservation/blocking behavior;
- source-admin guard cannot be specified before mutation;
- code-spec update would require product implementation to be truthful;
- unrelated repository changes enter C1 scope.

## Completion

C1 completes when exact baseline evidence and executable contracts are committed and authenticated. Then prepare C2 planning artifacts from frozen bytes; do not start C2 automatically in the same command.
