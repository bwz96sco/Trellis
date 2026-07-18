# Research lifecycle CLI

## Goal

Add a thin, machine-readable CLI over `@mindfoldhq/trellis-core/research` for workspace initialization, strict validation, projection recovery, status inspection, and Quest/Campaign/Run/Evidence/Claim lifecycle mutations.

## Requirements

- Register one top-level `trellis research` command family through the existing Commander entrypoint.
- Support:
  - `init`, `status`, `validate`, `rebuild`.
  - Quest create/status/stage operations.
  - Campaign create/protocol/freeze/status operations.
  - Run create/status/invalidate operations.
  - Evidence create/status operations.
  - Claim create/status operations.
- Keep repository registration, artifact registration, dispatch, result, proposal, decision, Task, workflow, hook, and Mempal behavior out of this child.
- Import research behavior only through `@mindfoldhq/trellis-core/research`.
- Never append or rewrite `events.jsonl` directly from CLI code.
- Require a control-plane root containing `.trellis`:
  - `--root <path>` has priority and resolves to an absolute path.
  - Without `--root`, use exact current working directory.
  - Do not search parent directories or child repositories automatically.
- Support `--json` for every command. Successful JSON mode emits exactly one JSON document on stdout with no Chalk or update-notice prefix.
- Support `--dry-run` on event-producing commands through `validateResearchBatch`; dry-run must not write ledger, projections, or runtime files.
- Accept optional `--idempotency-key`; generate and return a unique key when omitted. Automation requiring cross-process retry safety must provide the key explicitly.
- Record default actor `{ type: "agent", id: "trellis-cli" }` and command-specific provenance source. No machine-absolute path enters tracked event payloads.
- Treat idempotent replay as success.
- Treat `ResearchProjectionError` as committed-state recovery failure: report committed `headSeq`, tell caller to run rebuild, and never retry mutation automatically.
- `validate` means strict parse plus full ledger reduction and status-watermark inspection. It does not rewrite state or promise byte-level projection comparison.
- `init` creates one workspace; repeated matching initialization reports existing workspace without append; conflicting initialization arguments fail.
- Existing native commands and non-JSON update notices keep current behavior.

## Command Contract

```text
trellis research init --name <name> [--description <text>]
  [--root <path>] [--idempotency-key <key>] [--dry-run] [--json]

trellis research status [--root <path>] [--json]
trellis research validate [--root <path>] [--json]
trellis research rebuild [--root <path>] [--json]

trellis research quest create --title <title> [--description <text>]
  [--id <qst-id>] [common mutation options]
trellis research quest status <quest-id> <status> [common mutation options]
trellis research quest stage <quest-id> <stage> [common mutation options]

trellis research campaign create --quest <quest-id> --title <title>
  --protocol-digest <digest> [--id <cmp-id>] [common mutation options]
trellis research campaign protocol <campaign-id> --digest <digest>
  [common mutation options]
trellis research campaign freeze <campaign-id> [common mutation options]
trellis research campaign status <campaign-id> <status>
  [common mutation options]

trellis research run create --campaign <campaign-id> --title <title>
  [--id <run-id>] [common mutation options]
trellis research run status <run-id> <status> [common mutation options]
trellis research run invalidate <run-id> --reason <reason>
  [common mutation options]

trellis research evidence create --quest <quest-id> --summary <summary>
  [--run <run-id>] [--id <evd-id>] [common mutation options]
trellis research evidence status <evidence-id> <status>
  [common mutation options]

trellis research claim create --quest <quest-id> --statement <statement>
  [--evidence <evidence-id>...] [--id <clm-id>] [common mutation options]
trellis research claim status <claim-id> <status>
  [common mutation options]
```

Common mutation options are `--root`, `--idempotency-key`, `--dry-run`, and `--json`.

## Acceptance Criteria

- [ ] Root Commander exposes the complete command tree and help text.
- [ ] `init` creates one workspace event and deterministic projections.
- [ ] Repeated matching `init` appends nothing; conflicting `init` fails.
- [ ] Status distinguishes uninitialized workspace from initialized state and reports ledger/projection watermarks.
- [ ] Validate rejects malformed JSON, invalid event shape, sequence errors, and reducer errors without modifying files.
- [ ] Rebuild repairs stale/missing projections without changing ledger and is byte-stable when repeated.
- [ ] Every lifecycle entity supports successful create plus allowed and forbidden transitions.
- [ ] Invalid IDs/statuses/stages are rejected before commit with no ledger change.
- [ ] `--dry-run` returns prospective events/state summary and writes nothing.
- [ ] Duplicate idempotency key returns prior success with `replayed: true`.
- [ ] `ResearchProjectionError` reports committed head and rebuild instruction.
- [ ] Every `--json` success emits one parseable JSON document on stdout, including through root CLI startup.
- [ ] Default human output is compact and contains generated IDs, head sequence, replay/dry-run state, or recovery action as applicable.
- [ ] Existing commands and non-JSON update notice behavior remain green.
- [ ] CLI lint, typecheck, focused tests, full CLI tests, root typecheck, and build pass.
- [ ] GitNexus change detection shows only expected CLI registration/output/research-command flows.
