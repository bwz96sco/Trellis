# Research repositories and dispatch

## Goal

Add portable multi-repository registration, machine-local binding/resolution, bounded dispatch artifacts, worker result/proposal recording, and root-reviewed proposal apply/reject flow.

## Requirements

### Repository registry

- Add `trellis research repo add|bind|list|resolve`.
- Canonical repository registration is a research event and tracked projection.
- Repository fields:
  - stable `rep_` ID, name, kind (`code | paper | notes | data | other`), POSIX relative locator;
  - optional expected Git remote, default branch, and `hasTrellis` capability hint.
- Tracked repository locators may contain explicit `..` but never absolute paths, backslashes, NUL, or Windows drive paths.
- `repo bind` stores machine-local absolute paths only in `.trellis/.runtime/research/repo-bindings.json` using atomic write.
- Resolution order: runtime binding, then tracked locator, then explicit failure.
- Resolve canonicalizes realpath, requires a directory, verifies expected remote when configured, and records ignored runtime observations (`gitRoot`, `revision`, dirty summary).
- Never scan arbitrary filesystem for matching repositories.

### Portable dispatch artifacts

- Store tracked files under `.trellis/research/dispatches/<dsp-id>/`:
  - `request.json`
  - `result.json`
  - `proposal.json`
  - `decision.json`
- All tracked files use stable JSON field ordering and trailing newline. Writes use temp-in-same-directory plus rename.
- No tracked file contains absolute paths, full transcripts, runtime process metadata, or copied Mempal bodies.
- Runtime resolved envelope may live under `.trellis/.runtime/research/dispatches/<dsp-id>/manifest.json`.

### Dispatch request

- Add `trellis research dispatch prepare`.
- Request binds one Run, Quest, optional Campaign, owner skill, target repository, objective, acceptance criteria, input artifact/context pointers, allowed relative write paths, expected outputs, checks, optional Task ref, and provider hint.
- Validate Run/Quest/Campaign relationships, repository existence, path portability, artifact repository ownership, and optional digest/revision before recording.
- Record canonical `dispatch.recorded` event and atomically write request + runtime manifest.
- Child repository does not require Trellis.

### Result and Proposal

- Add `trellis research dispatch record-result --file <json>`.
- Worker Result status: `completed | partial | blocked | failed`.
- Result includes compact summary, commands/checks run, artifact refs, observed revision/dirty summary, blockers, and optional session/transcript pointer string.
- Proposal contains typed operation list only. No arbitrary event kind or arbitrary filesystem patch.
- Supported V1 proposal operations map to existing validated core mutations:
  - Quest status/stage.
  - Campaign protocol/freeze/status.
  - Run status/invalidate.
  - Evidence create/status.
  - Claim create/status.
  - Artifact register.
- Record Result + pending Proposal in one validated event batch, then write normalized result/proposal files.

### Root review and decision

- Add `trellis research dispatch apply|reject`.
- Apply supports `--dry-run` and repeatable operation-index selection; default selects all operations.
- Apply verifies selected operation refs, artifact existence, repository binding, optional SHA-256, and optional revision against observed repository state before commit.
- Selected operations plus one decision event validate as one complete batch before append.
- Reject records decision only and applies no proposal operations.
- `decision.json` records reviewer outcome, rationale, selected/rejected indexes, and applied event IDs.
- Re-applying or re-rejecting same Proposal is idempotent and returns original success.
- Proposal state is canonical through decision event. Workers never mutate research state directly.

### Core boundary

- Extend public core schemas/types only as needed for portable repository, dispatch, result, proposal-operation, and decision contracts.
- Keep core independent of Git commands, runtime absolute bindings, Commander, Chalk, and Task/Mempal integration.
- CLI uses public `@mindfoldhq/trellis-core/research` exports only.
- Existing lifecycle CLI, native workflow, Channel, Task, and Mem behavior remain compatible.

## Acceptance Criteria

- [ ] Register/list/resolve works for workspace child and sibling repos.
- [ ] Explicit runtime binding overrides tracked locator without changing tracked JSON.
- [ ] Unknown/unbound repo fails with actionable `repo bind` instruction.
- [ ] Expected Git remote mismatch fails resolution.
- [ ] Tracked files contain no absolute machine paths.
- [ ] Prepare creates one canonical dispatch event plus portable request/runtime manifest.
- [ ] Prepare rejects invalid Run/Quest/Campaign/repository relationships and path escape.
- [ ] Result/proposal schema rejects unknown fields and arbitrary operations.
- [ ] Result + Proposal record atomically at ledger level; partial invalid batch appends nothing.
- [ ] Dry-run apply writes no ledger or decision file.
- [ ] Selected apply operations commit atomically with decision event.
- [ ] Reject applies no operations and finalizes Proposal once.
- [ ] Repeat apply/reject is idempotent.
- [ ] Artifact digest/revision mismatches fail before append.
- [ ] Decision file lists actual applied event IDs.
- [ ] Root + two independent child Git repo integration test passes without child Trellis installs.
- [ ] Existing core and lifecycle CLI tests remain green.
- [ ] Core/CLI lint, typecheck, build, focused tests, and root typecheck pass.
- [ ] `git diff --check` and GitNexus change detection show expected research flows only.
