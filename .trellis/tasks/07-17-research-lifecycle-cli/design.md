# Design — Research lifecycle CLI

## Boundary

CLI owns Commander parsing, root selection, output, and exit behavior. Core owns schemas, lifecycle legality, idempotency, locking, ledger append, reduction, digest checks, and projection writes.

```text
Commander registration
  -> resolve exact control-plane root
  -> build typed ResearchMutation
  -> validateResearchBatch | commitResearchBatch
  -> render one human or JSON result
```

No CLI code reads or writes research JSONL directly.

## Files

```text
packages/cli/src/commands/research/
  index.ts       # Commander tree and option mapping
  command.ts     # exported operations and structured results
  common.ts      # root resolution, ID parsing, mutation execution, output/errors

packages/cli/test/commands/
  research.test.ts
  research.integration.test.ts
```

Keep modules smaller only where behavior is shared. Do not create one file per trivial subcommand.

## Root resolution

```ts
interface ResearchRootOptions {
  root?: string;
}

function resolveResearchRoot(options: ResearchRootOptions): string;
```

Rules:

1. Resolve `options.root` from cwd when supplied.
2. Otherwise resolve exact `process.cwd()`.
3. Require `<root>/.trellis` directory.
4. Do not walk ancestors. Root research control plane must be explicit.
5. Pass absolute root to core. Never serialize it into tracked records.

## Operation results

Operations return values; they do not call `process.exit`.

```ts
interface ResearchMutationResult {
  command: string;
  idempotencyKey: string;
  dryRun: boolean;
  replayed: boolean;
  headSeq: number;
  events: ResearchEvent[];
}

interface ResearchStatusResult {
  initialized: boolean;
  workspace: Workspace | null;
  headSeq: number;
  eventCount: number;
  projectedThroughSeq: number;
  projectionStale: boolean;
  counts: {
    quests: number;
    campaigns: number;
    runs: number;
    evidence: number;
    claims: number;
  };
}

interface ResearchValidationResult {
  valid: true;
  initialized: boolean;
  headSeq: number;
  eventCount: number;
  projectedThroughSeq: number;
  projectionStale: boolean;
}
```

Rebuild returns the post-rebuild status.

## Mutation execution

One helper receives command name, root/options, and one or more `ResearchMutation` values.

- Build actor `{ type: "agent", id: "trellis-cli" }`.
- Build provenance `{ source: "trellis research <command>" }`.
- Use caller key when provided; otherwise create `cli:<command>:<uuid>`.
- Dry-run calls `validateResearchBatch` and reports prospective events with current prospective head.
- Commit calls `commitResearchBatch` and preserves `replayed`.
- Catch no errors inside operation layer except to add command context. Registration/output boundary renders them.

Create commands accept optional explicit entity ID. If omitted, use public core ID generators. Explicit IDs enable deterministic external orchestration and safe retries when paired with explicit idempotency keys.

List-valued Claim evidence options use a Commander collector and default to `[]`. This child does not accept artifact refs or repository IDs on create commands; later repository/dispatch child owns those inputs.

## Input validation

- Use public core runtime schemas/parsers for status and stage values.
- Validate explicit IDs with public entity schemas or a small prefix parser before mutation construction.
- Commander owns required flags and missing positional arguments.
- Empty strings fail before core commit.
- Do not use unchecked `as QuestStatus`/`as RunStatus` casts on raw CLI strings.

## Initialization

`init` first reads current research state.

- No workspace: build `workspace.create` and execute normally.
- Existing workspace with same name/description: return successful no-op result with existing workspace and current head.
- Existing workspace with different input: throw conflict error; append nothing.
- Default idempotency key for init is `research:init`; explicit key may override it.
- Dry-run on an existing matching workspace remains a no-op.

## Status, validation, rebuild

- `status` uses `readResearchState` + `getResearchStatus` and returns compact counts.
- `validate` strict-reads/reduces ledger, then returns status. It never rebuilds.
- `rebuild` records ledger bytes before/after in tests, calls `rebuildResearchProjections`, then returns status. Production code does not duplicate this snapshot logic.
- Missing ledger is valid empty state. `initialized` comes from `state.workspace !== null`.

## Output

One renderer handles structured results.

JSON mode:

```ts
console.log(JSON.stringify(result, null, 2));
```

Exactly one stdout document. No Chalk. Errors go to stderr. Human mode prints compact command-specific lines.

Root startup update checks must be silent when raw argv contains `--json`; non-JSON behavior is unchanged. Implement this with a small pure predicate/helper rather than spreading argv checks across commands.

## Errors and exit codes

Registration action catches errors:

- Invalid Commander syntax/argument parser: Commander usage failure.
- Domain/filesystem/validation failure: stderr + exit code 1.
- `ResearchProjectionError`: stderr or JSON stderr includes:
  - `committed: true`
  - `headSeq`
  - `recovery: "trellis research rebuild"`
  - no automatic retry.

Operation functions throw; only registration boundary sets `process.exitCode` or calls existing root error handling. Tests invoke operations directly and registration through a fresh Commander instance.

## Compatibility

- Additive top-level command only.
- Existing native, Channel, Mem, workflow, update, and Task behavior unchanged.
- Suppressing startup update notice is limited to invocations containing `--json`.
- No new runtime dependency.
- Core remains zero-dependency and unchanged unless a verified missing public primitive blocks implementation.

## Rollback

- Remove research registration and command modules; core research data remains valid.
- Revert JSON startup suppression independently.
- No migration or tracked data deletion required.
