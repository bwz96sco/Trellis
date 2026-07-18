# Design — Research specs and end-to-end proof

## Scope

Slice 7 closes V1 by connecting existing public contracts. It adds one small CLI reachability fix, one setup-skill migration contract, one consolidated integration suite, final executable/user guidance, and cross-slice verification.

It does not redesign the research domain.

## Quest repository reachability

Core already accepts repository IDs in `quest.create`; CLI currently always passes an empty list. Extend public Quest creation with a repeatable repository option.

```text
trellis research quest create \
  --title "..." \
  --question "..." \
  --repository rep_<uuid> \
  --repository rep_<uuid>
```

Behavior:

1. Parse zero or more repository IDs.
2. Normalize duplicates while preserving first occurrence order.
3. Read current research state.
4. Reject malformed or unknown IDs before `commitResearchBatch`.
5. Pass validated IDs into the existing `quest.create` payload.
6. Preserve current empty-list behavior when omitted.

No new event kind, reducer branch, projection shape, or lifecycle transition is needed.

## Consolidated E2E shape

Add `packages/cli/test/commands/research-workflow.integration.test.ts` with file-local helpers and real temporary Git repositories.

```text
root control repo
├── .trellis/research authority
└── sibling repos
    ├── code/.git
    ├── paper/.git
    └── notes/.git
```

Use public command functions and generated Task scripts. Mock only unavoidable interactive/install boundaries; keep Git, filesystem, research store, Task pointer, and workflow ownership behavior real.

### Scenario A — full root-controlled workflow

1. Initialize Trellis with bundled research workflow.
2. Initialize canonical research state separately.
3. Create independent child repositories with no `.trellis`.
4. Register portable sibling locators.
5. Seed legacy files and snapshot bytes.
6. Create repository-associated Quest, Campaign, and two Runs.
7. Run A: Task-free Dispatch -> Result + pending Proposal -> dry-run -> apply -> replay.
8. Run B: linked engineering Task -> shared `current_task/current_run` session -> Dispatch -> Task finish/archive -> Run pointer survives -> apply.
9. Complete Campaign and Quest through current shipped status/stage commands.
10. Verify Evidence, Claim, Result, Proposal, Decision, and projections.
11. Corrupt/delete a projection -> rebuild -> ledger unchanged -> second rebuild byte-stable.
12. Scan tracked research strings for absolute paths and prove runtime paths are ignored.
13. Append malformed ledger input last -> validate/status/read fail closed without rewrite.

### Scenario B — bundled research update

- Start from valid initialized state.
- Update selected bundled research workflow.
- Preserve selection, ledger, and projections.
- Repeat update idempotently.

### Scenario C — custom workflow preservation

- Use isolated fixture with user-owned workflow content and missing/custom ownership metadata.
- Update must preserve workflow bytes and research state.
- Update must not silently claim bundled ownership.

## Legacy migration contract

`trellis-research-setup` may inspect declared legacy pointers only when explicitly invoked. It returns observations and a pending Proposal. Legacy sources remain untouched.

```text
legacy file
  -> bounded read
  -> observed Result
  -> pending Proposal with portable refs
  -> root review
  -> optional canonical operation
```

Forbidden:

- import/move/delete/rewrite/canonicalize source files;
- create second YAML/JSONL authority;
- append research events directly;
- auto-ingest into Mempal;
- claim migration completed without reviewed canonical operations.

## Documentation model

One user-facing research workflow guide should cover:

- `trellis init --workflow research` versus `trellis research init`;
- portable root/child repository setup;
- current CLI verbs (`stage`/`status`, not planned aliases);
- Task-free and Task-linked dispatch authority;
- canonical ledger versus Mempal versus `trellis mem`;
- legacy proposal-only inputs;
- rebuild/recovery and malformed-ledger limits;
- human-owned scientific files;
- V1 limitations and deferred features.

`docs-site` is an independent submodule. Initializing/checking it is allowed as local dependency setup, but this task never commits, pushes, rewrites history, or claims docs checks passed if the submodule remains unavailable.

## Executable specifications

Update existing specs instead of adding another broad research spec:

- `commands-research.md`: Quest repository option, cross-layer E2E closure matrix, recovery/update/path assertions.
- `research-worker-hooks.md`: legacy proposal-only setup-stage contract and tests.
- workflow/update/core specs change only if E2E exposes a real mismatch.

Required code-spec depth remains:

1. Scope/trigger
2. Signatures
3. Contracts
4. Validation/error matrix
5. Good/base/bad cases
6. Tests required
7. Wrong/correct example

## Approved-plan reconciliation

Accepted V1 deferrals:

- Claim reopening event/command.
- Quest blocker/final-synthesis completion gate.
- Campaign relaunch/supersession.
- Rich Run/Evidence/Claim scientific metadata.
- Direct Mempal references and automatic semantic projection.
- Convenience lifecycle aliases.
- Automatic generation of `brief.md`, `protocol.md`, `verdict.md`, or `notes.md`.
- Shared Channel/research lock extraction; research-local lock remains intentional after HIGH blast-radius analysis.

These are not E2E failures because current executable specs are authoritative for shipped V1. Future parity work needs separate high-impact children.

## Compatibility

- Existing Quest creation without repository options is unchanged.
- Existing native/custom/marketplace workflow ownership remains unchanged.
- Child repositories retain independent Git histories and need no Trellis install.
- Core/CLI remain Mempal-optional and offline-capable.
- No automatic worker execution is introduced.

## Rollback

- Remove CLI repository option and its tests; existing empty Quest repository lists remain readable.
- Remove consolidated E2E and guidance without touching canonical research data.
- Remove setup-skill legacy section; manual CLI workflow remains functional.
- Never delete research ledgers, projections, legacy files, session runtime files, or child repositories during rollback.
