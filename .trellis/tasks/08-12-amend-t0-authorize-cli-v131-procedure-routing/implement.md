# T0A — Exact CRITICAL Procedure routing authority overlay implementation plan

## Authorization state

The user approved the lean T0A governance amendment on 2026-08-12. `task.json` records:

- `taskExecutionAuthorized: true`
- `commitAuthorized: true` for T0A only
- `criticalImpactApprovalAuthorized: true` for the exact prospective T2 delta

The current implementation run must not stage or commit.

## Exact scope

Modify only these six standard task files:

1. `task.json`
2. `prd.md`
3. `design.md`
4. `implement.md`
5. `implement.jsonl`
6. `check.jsonl`

Do not modify T2, production, tests, specifications, Procedure packages, historical records, or unrelated dirty paths.

## Ordered execution

1. Make `task.json` the sole normative authorization record.
2. Bind the exact target actor, path, symbol, same-file Core import, and the all-of route condition: activation-recorded context, recorded version `2.0.7`, and schema version `2`.
3. Require `parseResearchProcedure` for every non-matching identity.
4. Record preservation of project-first resolution, absent-only bundled fallback, present-invalid fail-closed behavior, historical recorded-identity replay, live `1.0.0`, dormant `2.0.7`, and Core-only v1.3.1 parsing authority.
5. Preserve the unchanged eight-child topology, exact T2 32-path inventory, and all operational denials.
6. Keep the task status `in_progress`.
7. Validate task artifacts and run path-scoped diff checks.

## Verification commands

```bash
PYTHONDONTWRITEBYTECODE=1 uv run python \
  .trellis/scripts/task.py validate \
  .trellis/tasks/08-12-amend-t0-authorize-cli-v131-procedure-routing

git diff --check -- \
  .trellis/tasks/08-12-amend-t0-authorize-cli-v131-procedure-routing/task.json \
  .trellis/tasks/08-12-amend-t0-authorize-cli-v131-procedure-routing/prd.md \
  .trellis/tasks/08-12-amend-t0-authorize-cli-v131-procedure-routing/design.md \
  .trellis/tasks/08-12-amend-t0-authorize-cli-v131-procedure-routing/implement.md \
  .trellis/tasks/08-12-amend-t0-authorize-cli-v131-procedure-routing/implement.jsonl \
  .trellis/tasks/08-12-amend-t0-authorize-cli-v131-procedure-routing/check.jsonl
```

Also confirm the changed set under the T0A task directory is exactly those six files and that none is staged.

## T2 return route

Only after a separate T0A commit may T2 resume. T2 must authenticate the committed T0A `task.json`, refresh GitNexus impact, implement only the exact approved branch and named import, preserve the generic fallback and resolution/replay behavior, and remain within its unchanged 32-path inventory.

Any wider target, route, parser, ownership, topology, inventory, or authority change requires another forward-only governance decision.
