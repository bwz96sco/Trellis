# Add read-only Dispatch context

## Goal

Add one provider-neutral, strict, bounded, read-only Dispatch preflight command for Claude and Codex workers.

## Requirements

- Add:
  ```text
  trellis research dispatch context <request-file> --host claude|codex --json
  ```
- Support optional repeated `--skill-name <canonical-name>` values as caller-supplied name-only discovery input. Omission selects bundled fallback.
- Accept only exact canonical relative request paths shaped as `.trellis/research/dispatches/<dsp-id>/request.json`; reject arbitrary, absolute, backslash, traversal, alias, and symlink-escaped paths.
- Resolve the explicit control root through existing Research root rules. Never search ancestor or child repositories.
- Strict-read canonical ledger state through existing public core APIs. Do not edit core store, reducer, event, projection, or Dispatch schemas.
- Strict-parse tracked request, require path/directory/request/canonical Dispatch ID agreement, and require tracked request semantic equality with canonical Dispatch state.
- Validate Quest, Campaign, Run, Dispatch, and Repository hierarchy, including Run Dispatch identity and Quest Repository membership.
- Require Quest status `active`, Run status `planned|running`, and a C06-dispatchable current Quest stage. `complete` is never dispatchable.
- Resolve capability and selected skill only from current Quest stage, requested host, and supplied canonical skill names.
- Treat `ownerSkill`, `provider`, and `taskRef` as readable compatibility metadata. Report stale/ignored metadata through deterministic bounded warnings; never use it as execution authority and never dereference Task files.
- Accept hosts exactly `claude` or `codex`; reject installer IDs, retired hosts, aliases, blanks, and case variants.
- Skill-name input is names only: no filesystem path, plugin namespace, invocation adornment, alias, body, frontmatter, fuzzy match, or automatic private/global skill scan.
- Resolve target Repository from strict runtime binding first, then tracked locator. Verify directory and exact configured origin remote without persisting observations.
- Ignore `repo-observations.json` entirely. Malformed unused observation cache must not affect preflight.
- Validate every context entry with shared finite bounds: at most 128 entries/list values and at most 16,384 characters per string.
- Require every artifact context entry to target the Dispatch Repository, remain canonically contained as a regular file, and pass optional SHA-256 and current-HEAD revision checks.
- Never include artifact file bodies or digest-read bytes in output.
- Validate each `allowedWritePaths` entry as portable repository-relative scope, including symlink escape through existing ancestors.
- Preserve `expectedOutputs` as bounded non-empty text matching schema-v1 core/CLI behavior. Do not interpret it as a path.
- Preserve `checks` as bounded declared text. Preflight must not execute checks or requested commands.
- Emit one deterministic bounded success object containing host, ledger head, request pointer, Dispatch IDs/compatibility metadata, C06 capability resolution, warnings, resolved Repository identity, declared work/context pointers, write boundaries, authority limits, and fixed Result-plus-pending-Proposal output pointers.
- JSON success: exactly one document on stdout, empty stderr, exit zero.
- JSON failure: empty stdout, exactly one structured context error on stderr, no partial target/context data, exit one, and `safeAction: "report-to-root-no-write"`.
- Preflight may perform bounded read-only filesystem/Git/artifact observation needed for validation. Host adapter/worker must perform no independent target access before successful preflight.
- Successful and failed preflight must write nothing: no binding, observation, session, runtime directory, lock, manifest, ledger event, sequence, projection/cache, tracked Dispatch file, Task state, target file, or Git history.
- Do not call mutation dry-run APIs because they create transient Research lock state.
- Do not modify Claude hook behavior, add Codex worker templates, execute workers, record Result/Proposal, review Proposal, or converge duplicated hook maps in C07; those belong to C08-C09.
- Do not copy, inspect, vendor, import, or depend on private/unprefixed skill bodies.
- Do not modify `docs-site`, `marketplace`, unrelated dirty files, or create a commit.

## Acceptance Criteria

- [ ] Built CLI help exposes `research dispatch context <request-file>`, `--host`, `--skill-name`, `--root`, and `--json` without retired-host choices.
- [ ] Exact canonical request path succeeds for both `claude` and `codex`; invalid path forms fail before target observation.
- [ ] Canonical ledger remains authority; edited/stale request files cannot override Dispatch state.
- [ ] Request path ID, parsed ID, canonical Dispatch, Run Dispatch ID, Campaign, Quest, and Repository relations are fully checked.
- [ ] Inactive or terminal Quest, terminal `complete` stage, and non-runnable Run fail with structured errors.
- [ ] C06 exact optional skill wins only when its canonical name is supplied; otherwise bundled fallback is deterministic.
- [ ] Invalid skill names never trigger filesystem/body inspection and fail through the structured error path.
- [ ] Historical arbitrary `ownerSkill`, `provider`, and `taskRef` fixtures remain readable and produce bounded warnings rather than routing authority.
- [ ] Repository binding precedence, locator fallback, exact remote verification, and non-Git cases behave deterministically without observation writes.
- [ ] Malformed unused `repo-observations.json` does not block context resolution.
- [ ] Artifact ownership, regular-file status, lexical/canonical containment, digest, and current-HEAD revision checks fail closed.
- [ ] Existing symlink-parent escapes are rejected for artifacts and allowed write paths.
- [ ] Output contains declared text/context metadata and resolved pointers only; artifact bodies, arbitrary projections, Task files, skill bodies, dirty summaries, and remote credentials are absent.
- [ ] `expectedOutputs` remain text and checks remain unexecuted.
- [ ] Success JSON is deterministic, bounded, and contains exact authority/output-contract fields.
- [ ] Failure JSON has stable error code/message/safe action, no partial context, empty stdout, and exit code one.
- [ ] Success, each major failure phase, and repeated invocation leave control and target filesystem snapshots byte-identical, including absence of transient lock/runtime files.
- [ ] Existing Dispatch prepare/result/apply/reject behavior and tests remain unchanged.
- [ ] Existing Claude hook behavior/tests remain unchanged until C09.
- [ ] Focused CLI tests, compatibility fixtures, full CLI tests, lint, typecheck, build, workspace typecheck, `git diff --check`, and child-scoped review pass.
- [ ] GitNexus impact is recorded before existing-symbol edits; no unexplained child-level HIGH/CRITICAL impact remains.
- [ ] No commit is created unless explicitly requested.

## Notes

- C06 core stage-capability resolver is prerequisite and archived under `.trellis/tasks/archive/2026-07/`.
- C08 consumes this command for bounded Codex worker preflight.
- C09 converges Claude hook validation and shared parity fixtures.
- Research evidence is stored in this task's `research/` directory.
