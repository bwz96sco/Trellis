# Research specs and end-to-end proof

## Goal

Close Trellis Research Workflow V1 with executable cross-layer proof, honest compatibility/migration guidance, and final parent-scope verification without broadening the scientific model or changing child Git histories.

## Requirements

### Consolidated end-to-end proof

- Add one CLI integration suite that exercises a fresh root research control plane plus independent code, paper, and notes Git repositories.
- Prove separate workflow selection and canonical research initialization.
- Prove portable repository registration, Task-free dispatch, optional Task-linked dispatch, Result plus pending Proposal recording, dry-run apply, explicit apply, and idempotent replay.
- Prove Task linking does not append research events or alter Task status; Task finish/archive preserves `current_run`.
- Prove Quest, Campaign, Run, Evidence, and Claim projections remain durable and Git-reviewable.
- Prove projection rebuild preserves the ledger and is byte-stable on repetition.
- Prove malformed ledger input fails closed and is not rewritten.
- Prove selected bundled research workflow updates without changing research state and custom workflow content remains user-owned.
- Prove tracked research records contain no POSIX, Windows, UNC, or fixture-local absolute paths; runtime research state stays ignored.
- Do not pretend to execute a real Claude worker. Exercise dispatch/request/result/proposal/decision contracts and retain hook execution in focused template tests.

### Reachable Quest/repository association

- Expose the existing core Quest repository association through a repeatable CLI Quest-create repository option.
- Validate every repository ID exists before committing the Quest-create event.
- Preserve existing Quest-create behavior when no repository is supplied.
- Cover duplicate, unknown, and valid repository IDs.
- Use this path in the Task-linked E2E so `questId + repositoryId` metadata is reachable through public CLI behavior.

### Legacy artifact guidance

- Extend `trellis-research-setup` to recognize `research-quest.yaml`, `research-events.jsonl`, `notes/_quest`, and vault-local `_quest`.
- Treat legacy files as untrusted historical inputs only.
- Never import, move, delete, rewrite, canonicalize, or create a second YAML/JSONL authority automatically.
- Represent selected information only through a pending Proposal for root review.
- Never write to Mempal automatically.
- Pin this contract in template tests and executable hook/worker specs.

### Documentation and V1 reconciliation

- Add user guidance for root setup, child repository registration, current Quest/Campaign/Run commands, dispatch review/apply, optional Task links, Mempal versus `trellis mem`, legacy artifacts, rebuild/recovery, and human-owned scientific files.
- Use shipped command names; do not document planned aliases that do not exist.
- State V1 limits: no scheduler, no automatic worker execution outside supported Claude routing, no automatic Claim promotion, no broad lifecycle hooks, and no generated `brief.md`/`protocol.md`/`verdict.md`/`notes.md`.
- Reconcile approved-plan differences explicitly. Defer Claim reopening, Quest completion gates, Campaign relaunch, richer scientific fields, and direct Mempal references to future high-impact work rather than hiding them in docs/E2E.
- Prefer bilingual docs-site pages when the submodule is available. Do not commit or rewrite the docs submodule history. If unavailable, record the blocker verbatim and keep executable root-repo contracts complete.

### Boundaries

- Root workspace remains the sole supported canonical research-state mutation authority.
- No automatic Git commit, push, merge, Mempal write, migration, scheduler, UI, or remote service.
- No changes to terminal lifecycle semantics in this slice.
- No changes to Claim reopen, Quest completion gates, Campaign relaunch, or rich entity schemas.
- Preserve unrelated dirty files and all completed Slice 1–6 behavior.
- No commit unless explicitly requested.

## Acceptance Criteria

- [x] Public CLI can create a Quest associated with one or more registered repositories; unknown IDs fail before ledger mutation.
- [x] Consolidated E2E covers root plus three independent child repositories, Task-free and Task-linked dispatches, explicit review/apply, replay, recovery, malformed ledger, update ownership, and path portability.
- [x] Legacy artifact sources remain byte-identical and proposal-only.
- [x] Setup skill and template tests name all four legacy forms and enforce authority/Mempal boundaries.
- [x] Executable research command and worker-hook specs include the final E2E closure and legacy migration contract.
- [x] User guidance uses current shipped commands and distinguishes canonical ledger, Mempal, and `trellis mem`.
- [x] Approved-plan differences are listed as accepted V1 deferrals, not claimed as implemented.
- [x] Focused core/CLI/template/Task/workflow/update tests pass.
- [x] Full lint, Python analysis, typecheck, build, `git diff --check`, and absolute-path scans pass.
- [x] GitNexus scope analysis finds no unexplained Slice 7 impact.
- [x] Known uninitialized submodule checks are reported verbatim if they remain unavailable.
- [x] No commit is created.
