# C4b Research Quest Cutover Implementation Plan

## Authorization Boundary

Current task remains `planning`.

Do not run `task.py start`, edit product code, modify source repository, invoke providers, migrate Skills, start C5–C7, commit, push, release, publish, or activate anything until user explicitly approves latest final C4b planning summary in a later message.

C4b implementation approval authorizes Trellis work only. Real source `research-quest-admin` modification still requires explicit authorization for that external repository. Without it, implementation may prepare Trellis contracts/tests but must not claim C4b acceptance or single-writer completion.

## Success Definition

```text
exact source bytes
-> deterministic zero-write preview
-> unchanged-token write
-> source-write fence
-> one canonical import/cutover batch
-> Trellis sole writer
-> C4 universe membership/coverage
-> source-compatible validated export
-> explicit verified rollback transfer
-> never dual write
```

## 1. Activate Exact Child

After fresh approval:

1. Confirm current task is `.trellis/tasks/08-21-thin-skill-c4b-quest-cutover`.
2. Confirm planning artifacts match approved summary.
3. Validate task artifacts.
4. Run:

```bash
uv run python ./.trellis/scripts/task.py start \
  .trellis/tasks/08-21-thin-skill-c4b-quest-cutover
```

5. Confirm status becomes `in_progress`.
6. Do not activate parent, C5, C6, or C7.

Stop if task routing differs or artifacts materially changed after approval.

## 2. Verify Frozen Source Baseline

Before product edits:

```bash
uv run python \
  .trellis/tasks/08-21-thin-skill-c1-freeze-contracts/research/build_source_baseline.py \
  --verify
```

Record exact C1 manifest digest and selected Quest/helper/validator digests in implementation evidence. Read only frozen baseline files needed by the approved design. Do not compare against mutable ambient source repository or silently update C1.

Stop if:

- baseline verification fails;
- required frozen parser/validator behavior is absent;
- explicit stable candidate/opportunity IDs cannot be obtained without heuristic Markdown parsing;
- source schema differs from planned mapping.

Any changed source contract requires a new forward baseline/planning task.

## 3. Establish Baseline and GitNexus Impact

1. Inspect `git status --short`; preserve `AGENTS.md`, `CLAUDE.md`, submodule state, research files, and every unrelated dirty path.
2. Run focused existing Research test baseline.
3. Before editing each existing function/class/method, run GitNexus upstream impact analysis and report direct callers, affected processes, and risk.
4. If impact returns HIGH or CRITICAL, warn user and stop before that symbol edit until they explicitly continue.

Minimum likely impact targets:

### Core

- `parseResearchEvent`
- schema-v3 aggregate/ref/relation parsers selected for new event kinds
- `emptyResearchState`
- `applyEvent`
- `buildMutationEventDraft`
- `commitResearchBatch`
- `writeResearchProjections`
- scientific-gate record validation/satisfaction helpers modified for universe checks

### CLI

- `registerResearchCommand`
- shared Research mutation/preview renderer only if reused
- root/lock/zero-write helpers actually modified

Prefer new focused modules and symbols over refactoring historical parser/store/CLI behavior.

## 4. Add Failing Core Contract Tests

Create focused tests before implementation.

### Import parser/mapping tests

Cover:

- schema-0.2 and supported legacy status/stage aliases;
- exact source identity preservation;
- title/objective/status/stage mapping;
- ordered first-read and ArtifactRef ownership;
- authoritative owner bindings;
- branches, Claims, decisions, next action, blockers, and legacy board;
- reviewed JSONL source order and extension preservation;
- every blocking-conflict class;
- no dropped field inventory;
- path containment and malformed/escaping rejection.

### Scientific-universe tests

Cover:

- explicit H1 opportunity and H2 candidate refs;
- exact source order and fixed universe digest vectors;
- duplicate, padded, missing, heuristic, or incomplete universe rejection;
- C4 gate membership and exact total coverage;
- new universe invalidates older gate satisfaction;
- Quest without C4b universe retains historical C4 behavior;
- no scientific decision inference.

### Event/reducer/store tests

Cover:

- closed schema-v3 event kinds and relation order;
- direct reducer aggregate/relation/reference validation;
- additive empty state and mixed historical/new ledger replay;
- deterministic route/import/milestone/universe/writer/export projections;
- one-batch import ordering;
- same-token exact replay and cross-family/partial-batch conflict;
- no generic raw append.

### Writer state-machine tests

Cover:

- legal source -> Trellis and Trellis -> source transitions;
- same-writer exact replay versus conflicting evidence;
- transfer-to-source requires current validated export digest;
- projection failure remains fail-closed;
- cutover fence lifecycle and recovery;
- no state permits both writers.

## 5. Add IDs, Types, Canonical Parsers, and Digests

Add minimum types from `design.md`:

- import, route, milestone, universe, export, and transfer IDs;
- source identity/snapshot;
- route and preserved extension structures;
- scientific universe;
- export evidence;
- writer authority/transfer;
- preview/export plan and loss-report types where owned by Core.

Add strict parsers/normalizers and fixed digest helpers. Keep exact string order where source semantics require it. Deep-clone/freeze stored payloads using existing Research conventions.

Export public APIs only through `packages/core/src/research/index.ts` and existing `@mindfoldhq/trellis-core/research` subpath.

Do not change historical ID prefixes, event-version constants, C4 gate payload shape, or root package exports.

## 6. Extend Schema-v3 Events and Reducer State

Add exact kinds:

```text
quest.import.recorded
quest.import.milestone-recorded
quest.route.recorded
quest.scientific-universe.recorded
quest.export.recorded
quest-writer.transferred
```

Update together:

- event-kind union/allowlist;
- aggregate/ref types only where needed;
- payload parsers;
- exact ordered relation validation;
- direct reducer validation;
- empty state/indexes;
- immutable state cloning;
- deterministic projections.

Assertions:

- schema-v1/v2 reject C4b kinds;
- historical schema-v3 events parse unchanged;
- aggregate IDs equal payload IDs;
- Quest/import/Artifact/Claim/universe/export/transfer relations match exact roles/order;
- duplicate source event IDs and conflicting source identities fail replay;
- no C4b projection exists for historical Quest state.

## 7. Add Typed Store Mutations and Import Batch Validation

Add typed mutations only:

```text
quest.import.record
quest.import.milestone
quest.route.set
quest.scientific-universe.record
quest.export.record
quest-writer.transfer
```

Build one import planner that validates complete source mapping before mutation construction. Build one event batch in fixed design order.

Validation order:

1. frozen source contract/schema;
2. source identity/path containment;
3. Quest/repository identity;
4. status/stage mapping;
5. Artifact bindings;
6. owner/branch/Claim/route consistency;
7. reviewed milestone order and IDs;
8. H1/H2 explicit universe completeness;
9. export-loss preview;
10. writer state and idempotency;
11. event construction.

Any conflict returns complete deterministic diagnostics and no partial event plan.

## 8. Integrate C4 Gate Universe Checks

Modify only C4 validation/satisfaction seams required by C4b:

- when current universe exists, record requires membership and exact coverage;
- transition satisfaction requires gate event sequence after universe event and revalidates coverage;
- imported new universe makes older gate records visible history but unsatisfying;
- no universe retains C4 semantics for historical/non-imported Quests.

Do not change:

- gate record fields;
- effective same-instance/node/gate history rule;
- explicit approve/reject decision;
- evidence Artifact containment;
- H1-before-H2 transition relation order;
- separation from operational Approval;
- no-auto-transition behavior.

## 9. Implement CLI Import Preview/Write

Add focused Quest command modules rather than expanding unrelated Workflow/gate files.

Implement:

```text
trellis research quest import ...
```

Behavior:

- reject `--dry-run + --write` before root/source parsing;
- preview default and exact deterministic JSON/text;
- build opaque token from canonical plan;
- write requires token, acquires normal mutation lock, rereads/replans, verifies unchanged bytes;
- establish fence before Trellis-authority append;
- append one typed batch;
- verify projection then remove fence;
- exact same-token replay returns existing IDs;
- return and stop.

Add filesystem snapshots proving every preview/error/replay-classification path is zero-write.

## 10. Implement Export and Export Evidence

Implement:

```text
trellis research quest export ...
```

Steps:

1. Read current canonical state.
2. Build deterministic YAML/JSONL/loss outputs in memory.
3. Reject any differing planned output collision before directory mutation; accept only a complete existing target with exact planned path/byte inventory as read-only replay/recovery input.
4. Preview exact paths/digests/loss report with zero writes.
5. On fresh write, use C4b-owned sibling temp directory.
6. Run frozen source validators against temp or exact existing output.
7. Re-import output in comparison mode; compare canonical mapped digest.
8. Atomically rename fresh temp directory to target.
9. Record validated export evidence without changing writer. If publication succeeded but event commit failed, retry authenticates exact existing bytes and appends only missing evidence.

If validation or comparison fails, remove only C4b-owned temp output; target and canonical authority stay unchanged.

## 11. Implement Writer Transfer and Recovery

Implement:

```text
trellis research quest transfer-writer ...
```

- `--to source`: require current validated export record/digest and exact mapped state digest; append transfer; verify `writer.json`; return.
- `--to trellis`: require current exact import snapshot; apply source-deny fence; append transfer; verify projection; remove fence; return.
- actor derives from existing CLI actor/provenance contract; rationale remains trim-nonempty verbatim.
- export digest option remains required by frozen signature; for `--to trellis`, require it to equal the successful import record's `sourceSnapshotDigest`. Treat this as compatibility syntax only, not validated export evidence or independent authority.

Add deterministic recovery command/helper only if existing rebuild cannot safely complete fence recovery. Do not add a general migration framework.

## 12. Source-Admin Guard Integration

Before any external source-repository edit:

1. Obtain explicit user authorization for that repository.
2. Inspect only frozen source helper bytes first.
3. Run required impact/navigation tooling available in source repository.
4. Make minimum pre-write guard change at shared mutation boundary.

Guard must run before file creation/open-for-write/temp-file/rename for all mutating commands. It reads cutover fence and committed `writer.json`, resolves unique source identity, then either allows source writer or refuses.

Required integration fixture invokes real source admin entrypoint against:

- never-imported source Quest -> existing behavior;
- committed `writer=source` -> mutation allowed;
- active cutover fence -> mutation refused, byte-identical tree;
- committed `writer=trellis` -> every mutation refused, byte-identical tree;
- malformed/ambiguous imported authority -> mutation refused;
- read-only validate/status under Trellis writer -> allowed, zero-write.

If source integration cannot be authorized or proven, stop with C4b incomplete. Do not describe Trellis-only import as structural single-writer cutover.

## 13. Update Code-Specs

After implementation stabilizes, update only missing/diverged executable details in:

- `.trellis/spec/core/backend/research-state.md`
- `.trellis/spec/cli/backend/commands-research.md`
- `.trellis/spec/cli/unit-test/conventions.md` only if cross-repository fixture ownership needs a durable rule
- `.trellis/spec/cli/unit-test/integration-patterns.md` only if fence/zero-write test pattern is new

Preserve seven-section cross-layer format and approved C4b scope. Do not edit unrelated architecture prose.

## 14. Verification

Focused minimum, adapted to actual test file names:

```bash
pnpm --dir packages/core exec vitest run \
  test/research/quest-import.test.ts \
  test/research/quest-cutover-store.test.ts \
  test/research/scientific-gate.test.ts \
  test/research/scientific-gate-store.test.ts \
  test/research/events.test.ts \
  test/research/schema-v1-compatibility.test.ts \
  test/compatibility/package-exports.test.ts

pnpm --dir packages/cli exec vitest run \
  test/commands/research-quest-import.test.ts \
  test/commands/research-quest-export.test.ts \
  test/commands/research-quest-writer-transfer.test.ts \
  test/commands/research-quest-source-admin.integration.test.ts \
  test/commands/research-gate.test.ts \
  test/commands/research-workflow.test.ts

pnpm --dir packages/core typecheck
pnpm --dir packages/cli typecheck
pnpm --dir packages/core lint
pnpm --dir packages/cli lint
pnpm --dir packages/cli build
```

Then run:

- complete Core Research suite;
- complete CLI Research suite;
- full Core and CLI suites where repository gate requires them;
- frozen C1 baseline verification;
- source validator and real source-admin integration fixture;
- import -> gate coverage -> export -> transfer -> source mutation end-to-end fixture;
- deterministic rebuild comparison;
- task validation;
- `git diff --check`.

Before any commit, run GitNexus:

```text
detect_changes({scope: "compare", base_ref: "variant/research-workflow"})
```

Explain inherited branch-wide changes separately from C4b-local effects. Preserve unrelated dirty files and submodules.

## 15. Commit and Stop

Only after all acceptance checks pass:

1. Review exact diff and staged inventory.
2. Exclude `AGENTS.md`, `CLAUDE.md`, unrelated research, submodule dirt, and all non-C4b paths.
3. Use normal hooks only; no bypass.
4. Commit only if user separately requests/authorizes commit in current flow.
5. Do not push, publish, release, activate, invoke provider/model, migrate pilot Skills, or start C5.
6. Archive/update task only through Trellis workflow after verified completion.

## Rollback Points

- Parser/type/event failure before write: revert only C4b code/tests; no state migration exists.
- Import cutover failure after fence: retain fence, inspect ledger truth, rebuild projection, then complete deterministic recovery; never manually enable both writers.
- Export failure: delete only C4b-owned temp target; authority unchanged.
- Source-admin integration failure: revert external guard change or keep it fail-closed; C4b remains incomplete.
- Post-cutover product rollback: validated export and explicit `trellis -> source` transfer only. Never delete/rewrite ledger events.
