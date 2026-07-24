# Implementation plan

## Step 0 — Reconfirm baseline and CRITICAL gate

- Confirm C04 commit `1a7d7030`, branch state, and only inherited `docs-site`/`marketplace` dirt.
- Confirm C05 is the only child entering implementation; C06-C10 remain planning.
- Run fresh GitNexus context/upstream impact for every existing symbol to edit.
- **Warn before production edits because four exact CRITICAL symbols are approved:** pre-existing shared `buildValidatedBatch`; C05-local `validateHierarchy`; C05-local `secureDirectory`; C05-local `writeSidecar`. Approved work is limited to version-aware drafts, ordered body-only hierarchy parity, same-module detect-and-fail replacement hardening/private helpers, and focused tests. Any other HIGH/CRITICAL edit returns to planning.
- Record baseline C02 mixed replay, C03 registry, C04 Procedure/policy, schema-v1 compatibility, current Context, and Result/Proposal tests.

Gate: planning/research/spec context only. No production edit before task activation.

## Step 1 — Add request digest and normalized scope hash

- Add `dispatch-authority.ts` in core with strict normalized scope type, path normalization, duplicate artifact rejection, write-pair canonicalization, immutable output, request digest, and scope hash.
- Export only through Research subpath.
- Keep `stableResearchJson`, export map, root barrel, and package version unchanged.

Verify:

```bash
pnpm --dir packages/core exec vitest run \
  test/research/dispatch-authority.test.ts \
  test/research/procedure-policy.test.ts \
  test/compatibility/package-exports.test.ts
pnpm --dir packages/core lint
pnpm --dir packages/core typecheck
```

Stop if a generic core export or dependency becomes necessary.

## Step 2 — Add typed schema-v2 mutation emitters

- Re-run and record CRITICAL impact for `buildValidatedBatch` immediately before edit.
- Extend `ResearchMutation` with exact activation plan, grant, and revoke variants.
- Make internal event drafts version-aware.
- Derive canonical related refs from reduced state.
- Keep every event behind `parseResearchEvent` and full reducer validation.
- Preserve all existing v1 mappings, public signatures, lock/sequence/idempotency/append/projection behavior, artifact digests, `validateDispatchBatch`, and current Result/Proposal batch.

Verify:

```bash
pnpm --dir packages/core exec vitest run \
  test/research/activation-approval.test.ts \
  test/research/store.test.ts \
  test/research/schema-v1-compatibility.test.ts \
  test/research/events.test.ts \
  test/research/transitions.test.ts
```

Gate: exact v1 Dispatch + v2 activation batch works atomically; malformed second draft leaves tree/ledger unchanged.

## Step 3 — Add C05 preflight and timestamp-aware executor

- Add CLI authority/scope module that validates hierarchy, explicit capability, C04 Procedure/policy/effective authority, request digest, Repository/artifact/write scope, and binding equality.
- Re-run and record CRITICAL impact for `validateHierarchy` immediately before edit.
- Change only `validateHierarchy` body. Preserve name, parameters, return type, single caller, `candidate` meaning, `{ stage: quest.stage }`, and all adjacent logic.
- Enforce exact earlier-failure order and messages:
  1. missing Quest -> `DISPATCH_HIERARCHY_INVALID` / `Dispatch Quest does not exist`;
  2. inactive Quest -> `QUEST_NOT_DISPATCHABLE` / `Dispatch Quest must be active`;
  3. absent/non-dispatchable Run -> `DISPATCH_HIERARCHY_INVALID` / `Dispatch Run must be planned or running`;
  4. existing Dispatch Run binding mismatch -> `DISPATCH_HIERARCHY_INVALID` / `Run Dispatch identity does not match`;
  5. candidate claimed Run -> `DISPATCH_HIERARCHY_INVALID` / `Run '<run-id>' already has a Dispatch`;
  6. missing/wrong-Quest Campaign -> `DISPATCH_HIERARCHY_INVALID` / `Run Campaign does not belong to the Dispatch Quest`;
  7. Campaign missing Run ID -> `DISPATCH_HIERARCHY_INVALID` / `Run is not registered in its Campaign`;
  8. optional Dispatch Campaign mismatch -> `DISPATCH_HIERARCHY_INVALID` / `Dispatch Campaign does not match the Run Campaign`;
  9. missing or Quest-unassociated target Repository -> `DISPATCH_HIERARCHY_INVALID` / `Target Repository is not associated with the Dispatch Quest`.
- Consume `resolveRepositoryForUse(..., false)` unchanged; no observation persistence.
- Add a C05-specific executor accepting one captured timestamp; do not edit HIGH shared executor.
- Add stable typed C05 errors and narrow rendering support without changing committed-error envelopes.
- Leave production Context untouched.

Verify focused pure/unit cases for every hierarchy edge, exact code/message/order, successful candidate/existing paths, optional Campaign absence, malformed Campaign `runIds`, and missing/unassociated Repository. Integration tests must cover prepare, historical bridge, authorize, approve post-prompt revalidation, inactive-Quest precedence, and full-tree zero-write behavior.

## Step 4 — Extend prepare and add plan-activation

- Add callback-level required `--capability` validation.
- Build new Dispatch plus activation and commit exactly `[dispatch.recorded, activation.planned]` with one timestamp/key.
- Add historical `plan-activation` with strict request materialization equality and no request/Dispatch rewrite.
- Add C05-specific activation sidecar materialization after commit.
- Re-run and record CRITICAL impact for `secureDirectory` and `writeSidecar` immediately before edit. Keep all replacement hardening inside `dispatch-activation-materialization.ts`; do not edit shared `writeFileAtomic`.
- Make `secureDirectory` return complete root-to-parent identity selection. Validate component grammar; capture bigint `dev`/`ino`/`mode` plus realpath; enforce non-symlink descendant directories and canonical containment. Revalidation ignores directory size/time but rejects identity/type/realpath/containment drift.
- Snapshot existing target as regular non-symlink with strict identity/size/time/canonical-location checks.
- Serialize bytes once. Create unique exclusive stage with PID + `randomUUID`, optional `O_NOFOLLOW`, and mode `0o600`. Bind descriptor/path identity and revalidate full chain before first byte.
- Write through descriptor with short-write loop and file `fsync`; verify exact size, descriptor/path node identity, canonical location, and full chain before publication.
- Publish absent target with exclusive `linkSync`; preserve `EEXIST` winner and accept only stable exact equivalent bytes under unchanged chain. Publish present unchanged target with atomic `renameSync`. Revalidate target identity/bytes and full chain afterward.
- Cleanup stage only when unchanged chain plus matching staged-node identity prove ownership. Preserve unrelated target/stage/parent replacements. Never rollback target after publication failure.
- Document pure-Node limit: detect-and-fail only; no mathematical `openat`/conditional-CAS guarantee.
- Classify same-key events before lifecycle rejection; classify every `validateResearchBatch` event result unconditionally and every replayed `commitResearchBatch` result before materialization or success rendering. For dry-run, reread ledger and test exact returned event-ID membership to distinguish canonical replay from new candidate validation. Mismatched family/target/batch shape fails `IDEMPOTENCY_KEY_CONFLICT`.
- Freeze legacy one-event prepare replay: append nothing, repair request + legacy runtime manifest only, return `legacyPrepare:true` with null activation fields, and require `plan-activation` with a new key.
- Preserve arbitrary ownerSkill/provider/taskRef values unchanged.

Verify:

```bash
pnpm --dir packages/cli exec vitest run \
  test/commands/research-dispatch-activation.integration.test.ts \
  test/commands/research-dispatch.integration.test.ts \
  test/commands/research-workflow.integration.test.ts \
  test/commands/research-dispatch-compatibility.test.ts \
  test/commands/research-dispatch-arbitrary-metadata-compatibility.test.ts
```

Gate: old one-event prepare replay succeeds as a discriminated legacy replay but is never upgraded or given an activation sidecar; bridge does not rewrite request or old events. A concurrent same-key winner for another family/target is rejected after the core replay result.

Replacement-safety tests use deterministic Vitest `fs` spies and assert:

- exact stable bytes with one LF;
- existing-target write failure leaves old target complete; absent-target write/fsync failure leaves target absent;
- target symlink/non-regular node fails without destination mutation;
- root/Dispatch/approval parent replacement before staging, after stage open, after content write, and before publication fails detectably;
- descriptor writes cannot follow an injected replacement parent;
- target replacement before publication or immediately after publication is preserved;
- stage-path replacement or chain replacement before cleanup is preserved;
- concurrent absent-target winner is never overwritten and is accepted only when exact equivalent bytes are stably verified;
- successful revoke replacement exposes old-or-new complete JSON;
- no sidecar bytes appear in injected outside trees;
- committed envelope and exact recovery key survive every post-commit failure;
- Windows CI covers optional `O_NOFOLLOW`, hard-link publication, rename replacement, open-descriptor behavior, and cleanup.

## Step 5 — Add automatic authorize

- Register `authorize <dispatch-id> --host <claude|codex>` with root/key/dry-run/json options.
- Recompute all activation bindings.
- Map C04 ineligibility to stable command codes.
- Persist exact automatic label/rationale and deterministic expiry.
- Enforce no Result/Proposal and host-specific active-grant uniqueness.
- Materialize activation and target approval only after commit.
- Implement two-point same-key replay classification and sidecar recovery.

Verify bounded eligible, every ineligible class, drift, dual-host coexistence, expiry equality, dry-run, recovery, and concurrent same-key family/target collision.

## Step 6 — Add interactive approve

- Register approve without `--json`, `--dry-run`, `--yes`, or `--force`.
- Require all three TTY streams.
- Add deterministic summary and injectable raw readline adapter.
- Validate/preserve label and rationale.
- Require exact byte-sensitive challenge.
- Recompute bindings after challenge, then capture one grant timestamp and commit.
- Require TTY + canonical challenge again for same-key recovery; never replace canonical grant metadata.
- Count label and rationale limits by Unicode code point.
- Classify any core replay result before approval materialization.

Verify all eight TTY combinations, Commander pre-callback rejection, summary order, Unicode boundary inputs, exact/mismatched challenges, post-prompt drift, zero-write failures, replay recovery, and concurrent same-key collision.

## Step 7 — Add revoke

- Register revoke with optional reason and root/key/dry-run/json options.
- Require explicit reason for JSON/dry-run/non-TTY; allow stdin/stdout TTY prompt only in human mode.
- Enforce reason bounds and exact terminal transition rules.
- Permit revocation before or after derived expiry while canonical status remains granted.
- Commit one revoke event and update only target sidecars.
- Count reason limits by Unicode code point.
- Implement two-point same-key replay/conflict handling.

Verify unknown, revoked, consumed, before/after expiry, dry-run, interactive/option reason, missing/oversized/Unicode-boundary reason, recovery, and concurrent same-key collision cases.

## Step 8 — Register command tree and preserve exclusions

- Add command registrations in frozen order.
- Update command-tree exact tests.
- Ensure current Context and record-result signatures/behavior remain unchanged.
- Ensure no worker, hook, Skill, payload, cleanup, update, uninstall, package manifest/version, docs-site, or marketplace diff.
- Add no packed inventory requirement unless clean package proof reveals a real omission.

## Step 9 — Update executable code-specs

After implementation, update only:

```text
.trellis/spec/core/backend/research-state.md
.trellis/spec/cli/backend/commands-research.md
```

Both retain all seven mandatory sections. Document typed v2 emitters, commands, exact gates, sidecars, recovery, compatibility, and forward-only rollback. Synchronize `commands-research.md` to the frozen observable order `context, prepare, plan-activation, authorize, approve, revoke, record-result, apply, reject` while leaving Context implementation unchanged. Do not claim C06 Context/consumption or C07-C09 cutover.

## Step 10 — Full verification

Run sequentially:

```bash
pnpm --dir packages/core test
pnpm --dir packages/core lint
pnpm --dir packages/core typecheck
pnpm --dir packages/core build
pnpm --dir packages/cli test
pnpm --dir packages/cli lint
pnpm --dir packages/cli lint:py
pnpm --dir packages/cli typecheck
pnpm --dir packages/cli build
pnpm typecheck
pnpm build
node packages/cli/scripts/release-preflight.js check-versions
node packages/cli/scripts/release-preflight.js verify-packed-core
node packages/cli/scripts/release-preflight.js verify-packed-cli
uv run python ./.trellis/scripts/task.py validate \
  .trellis/tasks/07-23-add-activation-approval-commands
git diff --check
```

Also prove:

- schema-v1 fixtures and arbitrary metadata remain byte-compatible;
- mixed replay/rebuild is deterministic;
- current Result/Proposal remains two v1 events;
- Context remains current Skill-compatible and zero-write;
- no raw absolute scope path appears in canonical activation/approval events;
- hierarchy parity matches frozen Context for Quest/Run/Campaign/Repository edges and exact errors, while prepare candidate Run binding remains distinct;
- deterministic symlink/parent/target/stage replacement cases fail detectably, preserve unrelated replacements, and write no sidecar bytes into injected outside trees;
- sidecar docs/specs state pure-Node detect-and-fail limits and make no mathematical `openat` race-freedom claim;
- every validation event batch and every replayed commit batch is classified for expected family/target/exact shape before success or materialization, including concurrent dry-run key winners;
- frozen CRITICAL/HIGH functions outside approved boundaries (`buildValidatedBatch`, body-only `validateHierarchy`, C05-local `secureDirectory`/`writeSidecar` and private same-file helpers) are unchanged;
- no network, package install fallback, or target Repository write occurred.

## Step 11 — Independent review and closeout

- Run GitNexus changed-scope detection before commit and explain every CRITICAL/HIGH affected flow.
- Return to main session for independent read-only `trellis-check`; implementation agent does not self-review.
- Fix only confirmed C05 defects with fresh impact analysis.
- Re-run affected and final full verification.
- Run `trellis-update-spec` final check.
- Archive with `task.py archive --no-commit` only after PASS; rewrite archived manifest self-references if validator requires it.
- Stage only C05 files; exclude `docs-site` and `marketplace`.
- Commit under existing ordered-child authorization; no push.

Rollback gate: before external v2 append, code rollback remains possible. After any v2 event, never delete/rewrite/truncate/down-convert ledger lines; forward-fix only, compatible rebuild, then same-key sidecar recovery.

Stop and return to planning if implementation needs any HIGH/CRITICAL edit beyond frozen `buildValidatedBatch` version support, ordered body-only `validateHierarchy` parity, or C05-local `secureDirectory`/`writeSidecar` detect-and-fail hardening with private same-file helpers; or needs shared `writeFileAtomic`, Context gating, approval consumption, Result/Proposal change, worker/Skill change, package export/version/root-barrel change, native helper/dependency, destructive ledger migration, or docs-site/marketplace work.
