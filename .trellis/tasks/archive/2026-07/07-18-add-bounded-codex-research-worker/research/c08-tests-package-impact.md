# Research: C08 Tests, Package, and Impact

- **Scope**: C08 planning
- **Date**: 2026-07-20

## Deterministic test targets

### `packages/cli/test/templates/codex.test.ts`

Expected agent inventory becomes exactly:

```text
trellis-check
trellis-implement
trellis-research
trellis-research-worker
```

Pin instruction order:

```text
pointer validation
  < name-only inventory discovery
  < C07 command
  < success JSON validation
  < selected skill body
  < target/context access
  < bounded work/checks
  < final JSON
```

Assert:

- exact first-line pointer grammar;
- `--host codex`, `--root .`, `--json`, repeated `--skill-name`;
- no manual request/projection fallback;
- nonzero/malformed/invalid context stops;
- route only from `capability.selectedSkill`;
- legacy metadata/warnings ignored for routing;
- `[features] multi_agent = false` and `[features.multi_agent_v2] enabled = false`;
- explicit nested-agent/canonical-state/proposal-review/Git-history bans;
- allowed read/write/check limits;
- sibling sandbox blocks without escalation;
- raw Result plus pending Proposal only;
- existing `trellis-research` remains distinct and unchanged.

Extract/materialize sample final payload, replace placeholders with valid IDs/timestamps, assert exact top-level keys, and parse through `resultSchema`/`proposalSchema`.

### `packages/cli/test/templates/research-hooks.test.ts`

Extend worker discovery contract:

- Claude worker remains hook-validated.
- Codex worker exists as separate pull-preflight wrapper.
- C08 does not claim hook parity or modify Python behavior.

### `packages/cli/test/regression.test.ts`

- add worker to structural multi-agent-disable assertions;
- assert no generic Task prelude or `{TASK_DIR}` in worker;
- preserve generic researcher Task path regression.

### Init/configurator tests

Use current relevant file names in working tree. Cover:

- Codex-only fresh init installs worker;
- dual-host init contains Claude and Codex workers without collision;
- installed bytes equal collected bytes;
- worker path appears in `.trellis/.template-hashes.json`;
- repeated full/force init is byte-idempotent;
- platform configurator byte-parity includes worker.

### Update tests

Dedicated Codex older-install fixture:

1. initialize Codex project;
2. remove worker and old manifest entry to simulate prior version;
3. update;
4. assert exact worker bytes and new managed hash;
5. repeat update -> no-op.

Conflict fixture:

- pre-existing unowned worker bytes survive;
- update reports conflict;
- manifest does not claim those bytes.

### C07 tests

Consume `research-dispatch-context.integration.test.ts` unchanged. Do not duplicate its state/repository/artifact matrix in C08.

## Optional real-Codex smoke

Add opt-in, non-release-blocking integration test gated by:

```text
TRELLIS_REAL_CODEX=1
codex executable available/authenticated
built local Trellis CLI on PATH
```

Temporary Codex-only Git project. Ask parent to spawn exactly `agent_type="trellis-research-worker"` with isolated turns and intentionally invalid canonical pointer.

Assert:

- Codex discovers exact agent type;
- child attempts C07 preflight first;
- child reports failure;
- no target command/write;
- filesystem and Git snapshots unchanged.

Skip cleanly when gate/prerequisites absent. Static tests remain authoritative.

## Package gate

After build, assert file exists:

```text
packages/cli/dist/templates/codex/agents/trellis-research-worker.toml
```

Inspect `npm pack --dry-run --json` and require:

```text
package/dist/templates/codex/agents/trellis-research-worker.toml
```

Do not commit generated `dist`.

## Specs

Update:

```text
.trellis/spec/cli/backend/research-worker-hooks.md
.trellis/spec/cli/backend/platform-integration.md
.trellis/spec/cli/backend/configurator-shared.md
.trellis/spec/cli/backend/commands-research.md
```

Document Codex pull worker without claiming C09 parity.

## GitNexus impact

Preferred implementation adds one template and edits tests/specs only. No existing production symbol edit.

Automatic flow confirmed:

```text
getAllAgents
  -> configureCodex
  -> installed .codex/agents bytes

getAllAgents
  -> collectCodexTemplates
  -> update/hash bytes
```

Do not edit shared-sensitive C07/core symbols.

If production code becomes necessary, stop and run upstream impact first. Whole-worktree detection may remain CRITICAL from inherited C01-C07/migration changes; manually isolate C08 template/test/spec files.

C09 convergence and C10 generic-surface deletion remain out of scope.
