# Research: C05 hierarchy parity and replacement-safe sidecar materialization

- **Query**: Resolve two remaining C05 review blockers: hierarchy parity with frozen Context, plus strongest practical pure-Node replacement-safe activation/approval sidecar writer.
- **Scope**: internal
- **Date**: 2026-07-24

## Findings

## 1. C05 `validateHierarchy` versus frozen Context

### Files Found

| File Path | Description |
|---|---|
| `packages/cli/src/commands/research/dispatch-authority.ts:247-272` | New C05-local `validateHierarchy`; currently combines several failures and omits Campaign run membership plus Repository/Quest association. |
| `packages/cli/src/commands/research/dispatch-context.ts:587-638` | Frozen Context hierarchy and exact observable error strings. |
| `packages/cli/src/commands/research/dispatch-command.ts:488-539` | Prepare candidate construction; calls C05 preflight with `candidate: true`. |
| `packages/core/src/research/reducer.ts:364-381` | Run creation registers Run in `campaign.runIds`. |
| `packages/core/src/research/reducer.ts:463-497` | Canonical Dispatch reduction: entity existence, Campaign/Quest match, optional Dispatch Campaign match, Run status, Run single-Dispatch binding. |
| `packages/core/src/research/types.ts:91-124` | Quest, Campaign, Run fields. Quest has no `campaignIds`; Campaign owns `questId` and `runIds`. |
| `packages/cli/test/commands/research-dispatch-context.integration.test.ts:425-483` | Existing frozen Context coverage for unassociated Repository, inactive/stage-complete Quest, terminal Run. |
| `packages/cli/test/commands/research-dispatch-activation.integration.test.ts:337-510` | Existing C05 inactive-Quest coverage across prepare, plan, authorize, approve revalidation. |
| `.trellis/tasks/07-23-add-activation-approval-commands/prd.md:21-29,89-100,255-265` | Current change gate permits only active-Quest follow-up inside CRITICAL `validateHierarchy`; broader blocker fix needs renewed planning authorization. |

### Current mismatch

C05 currently enforces:

```ts
!quest
!run
campaign?.questId !== quest.id
dispatch.campaignId !== undefined && dispatch.campaignId !== campaign.id
!candidate && run.dispatchId !== dispatch.id
candidate && run.dispatchId !== undefined
quest.status === "active"
run.status === "planned" || run.status === "running"
```

Missing versus frozen Context:

1. `campaign.runIds.includes(run.id)`.
2. Canonical Repository exists in `state.repositories`.
3. Repository appears in `quest.repositoryIds`.
4. Relation-specific errors. Current combined `DISPATCH_HIERARCHY_INVALID` / `Dispatch hierarchy is invalid` hides exact failed edge.

C05 later calls `resolveRepositoryForUse` (`dispatch-authority.ts:323-336`), which catches missing/unresolvable Repository as `REPOSITORY_INVALID`. That does not replace hierarchy validation: frozen Context classifies missing or Quest-unassociated target Repository as `DISPATCH_HIERARCHY_INVALID` before Repository resolution (`dispatch-context.ts:632-638`).

No reverse `quest.campaignIds` check exists or should be invented. `Quest` has no Campaign list (`types.ts:91-101`). Campaign-to-Quest authority is `campaign.questId`; Campaign-to-Run authority is `campaign.runIds` (`types.ts:103-124`).

### Every relation C05 must enforce

Recommended order matches frozen Context where applicable. Earlier failure wins.

| Order | Required relation | Existing Dispatch semantics | New candidate semantics | Recommended code | Recommended exact message |
|---:|---|---|---|---|---|
| 1 | Dispatch Quest exists | Same | Same | `DISPATCH_HIERARCHY_INVALID` | `Dispatch Quest does not exist` |
| 2 | Quest status is exactly `active` | Same | Same | `QUEST_NOT_DISPATCHABLE` | `Dispatch Quest must be active` |
| 3 | Dispatch Run exists and status is `planned` or `running` | Same | Same | `DISPATCH_HIERARCHY_INVALID` | `Dispatch Run must be planned or running` |
| 4 | Run-to-Dispatch binding | `run.dispatchId === dispatch.id` | `run.dispatchId === undefined` | `DISPATCH_HIERARCHY_INVALID` | Existing: `Run Dispatch identity does not match`; candidate: `Run '${run.id}' already has a Dispatch` |
| 5 | Run Campaign exists and belongs to Dispatch Quest | `state.campaigns[run.campaignId]?.questId === quest.id` | Same | `DISPATCH_HIERARCHY_INVALID` | `Run Campaign does not belong to the Dispatch Quest` |
| 6 | Campaign registers Run | `campaign.runIds.includes(run.id)` | Same | `DISPATCH_HIERARCHY_INVALID` | `Run is not registered in its Campaign` |
| 7 | Optional Dispatch Campaign matches Run Campaign | If `dispatch.campaignId` exists, it equals `campaign.id` | Same | `DISPATCH_HIERARCHY_INVALID` | `Dispatch Campaign does not match the Run Campaign` |
| 8 | Target Repository exists and Quest associates it | `repository !== undefined && quest.repositoryIds.includes(repository.id)` | Same | `DISPATCH_HIERARCHY_INVALID` | `Target Repository is not associated with the Dispatch Quest` |

Candidate-specific Run message should remain distinct. Frozen Context only handles canonical Dispatches, where `run.dispatchId` must equal Dispatch ID. Prepare handles a not-yet-recorded Dispatch, where Run must be unclaimed. Reusing `Run Dispatch identity does not match` is acceptable but less exact. Recommended candidate string reflects actual failure while preserving same stable code.

Stage dispatchability is not part of `validateHierarchy`: Context resolves host/Skill stage capability after active-Quest validation (`dispatch-context.ts:594-601`); C05 resolves explicit capability after hierarchy (`dispatch-authority.ts:298-313`). Keep that separation.

### Minimal critical-symbol change

Change only `validateHierarchy` body. Preserve:

- function name, parameters, return type;
- single caller `resolveDispatchActivationCandidate`;
- `candidate` meaning;
- `return { stage: quest.stage }`;
- capability, lifecycle, digest, scope, Repository-resolution, and caller code.

Use explicit ordered branches instead of one combined predicate. Do not edit frozen Context, core reducer, shared store, errors union, or callers. All recommended codes already exist in `ResearchActivationErrorCode` (`errors.ts:26-49`).

GitNexus result:

- `validateHierarchy`: **CRITICAL**, 14 impacted symbols, 6 affected processes, 1 direct caller.
- Affected command flows include prepare, plan-activation, authorize, approve revalidation, command registration.

Current PRD permits only active-Quest change in this CRITICAL symbol (`prd.md:23-26,264-265`). Adding Campaign run membership and Repository/Quest checks exceeds that frozen authorization. Review blocker is valid, but implementation must first receive explicit planning authorization for exact ordered body-only parity change.

### Test shape

Strongest focused test set:

1. One table-driven unit test around `validateHierarchy` using fabricated `ResearchState` for every failed edge and exact code/message.
2. Existing canonical path: `candidate:false`, matching `run.dispatchId` succeeds.
3. Prepare path: `candidate:true`, `run.dispatchId === undefined` succeeds.
4. Prepare claimed Run: `candidate:true`, defined `run.dispatchId` fails exact candidate message.
5. Existing Dispatch with absent/mismatched `run.dispatchId` fails frozen Context message.
6. Missing Campaign and wrong Campaign Quest use same Campaign/Quest error.
7. Campaign missing Run ID fails `Run is not registered in its Campaign`.
8. Optional `dispatch.campaignId` absent succeeds; mismatched present value fails.
9. Missing Repository and unassociated existing Repository both fail same frozen Context error.
10. Inactive Quest remains earlier than Run/Campaign/Repository failures.
11. Full-tree zero-write assertions across prepare, plan, authorize, and approval post-prompt revalidation.

Reducer-generated valid state always maintains `campaign.runIds` (`reducer.ts:364-381`), so a mocked/pure state test is needed to exercise this defensive branch directly. Integration coverage alone cannot construct every malformed edge through valid ledger events.

## 2. Pure-Node replacement-safe sidecar writer

### Files Found

| File Path | Description |
|---|---|
| `packages/cli/src/commands/research/dispatch-activation-materialization.ts:13-120` | Current C05 sidecar validation and write path. |
| `packages/cli/src/utils/atomic-write.ts:14-30` | Shared writer uses predictable same-directory temp pathname, path-based content write, then rename. Parent can change after validation. |
| `packages/cli/src/commands/research/project-policy.ts:32-188` | C04 identity model: root/parent snapshots, `dev`/`ino`/`mode`, realpath, containment, complete-chain revalidation. |
| `packages/cli/src/commands/research/project-policy.ts:231-247` | C04 identity-gated staging cleanup preserves unrelated pathname replacement. |
| `packages/cli/src/commands/research/project-policy.ts:296-356` | C04 unique stage, unchanged `writeFileAtomic`, exclusive `linkSync`, pre/post chain checks, final/stage identity checks. |
| `packages/cli/test/commands/research-policy-init.integration.test.ts:197-289` | C04 interleaving tests: ancestor replacement, staging pathname replacement, valid/invalid concurrent winner. |
| `.trellis/spec/cli/backend/filesystem-safety.md:106-116,164-179` | Project policy patterns and required interleaving tests. |
| `packages/cli/test/commands/research-dispatch-activation.integration.test.ts:322-335` | Current sidecar safety coverage checks target symlink only. No parent-replacement interleavings. |

### Current TOCTOU

Current flow:

```text
secureDirectory validates parent path
-> lstat target
-> writeFileAtomic(file, bytes)
   -> writeFileSync(path-based temp)
   -> renameSync(path-based temp, target)
```

A parent directory can be renamed/replaced with a symlink after `secureDirectory` returns and before `writeFileAtomic` opens its temp path. `writeFileSync(tmp, data)` can then create/write content under unverified replacement parent. Target precheck also has no identity binding to publication.

### Required contract choice

Use **detect-and-fail replacement safety**, not claim mathematically race-free `openat` semantics.

Node public `fs` path APIs expose no portable JavaScript equivalent of this complete POSIX sequence:

```text
openat(root_fd, child, O_DIRECTORY|O_NOFOLLOW)
openat(parent_fd, stage, O_CREAT|O_EXCL|O_NOFOLLOW)
renameat/renameat2(parent_fd, stage, parent_fd, target)
unlinkat(parent_fd, stage)
```

Node directory handles do not expose portable relative create/rename/unlink operations bound to directory descriptors. Windows lacks identical POSIX `openat` semantics. `fs.renameSync`, `fs.linkSync`, `fs.lstatSync`, `fs.realpathSync`, and cleanup remain pathname operations.

Consequences:

- Complete pre/post identity checks detect tested replacements.
- Descriptor-based stage writes remove current parent-symlink gap after stage open.
- Atomic old-or-new target publication is practical.
- Absolute proof against hostile same-user nanosecond interleavings, ABA replacement, moving an already-open stage inode, hard-link aliases, or replacement between final check and path operation is impossible with allowed APIs.
- Existing-target conditional compare-and-swap plus atomic replacement is also unavailable. `renameSync` is atomic replacement, not conditional replacement by prior inode identity.

Normative wording should require:

> Capture and revalidate complete root-to-parent identity before and after every path-based stage/publication step. Write sidecar bytes only through an already-open exclusive stage descriptor whose pathname, inode, canonical parent, and complete parent chain were revalidated immediately before first content write. Any detected drift fails as committed recovery. Publication yields old-or-new target atomically. No claim of race-free `openat`/`renameat2` behavior is made.

Do not retain literal universal claim “no content can ever be written outside verified parent under arbitrary hostile replacement.” Pure Node cannot prove it. If that absolute property remains mandatory, C05 needs native/platform-specific helper or dependency, both excluded by task.

### Strongest practical scoped algorithm

Keep all code in `dispatch-activation-materialization.ts`. Replace shared `writeFileAtomic` use; do not edit shared helper.

#### A. Compute exact bytes once

```text
serialized = stableResearchJson(value)
bytes = UTF-8 bytes of serialized
```

No extra newline. Sidecar writer never mutates value or reserializes after filesystem work.

Ledger-first remains caller contract. Existing callers invoke materialization only after validated replay/commit classification; dry-run skips it. Do not move materialization earlier.

#### B. `secureDirectory` returns identity-bound selection

Return structure, not bare string:

```ts
interface DirectorySelection {
  rootPath: string;
  canonicalRoot: string;
  directoryPath: string;
  canonicalDirectory: string;
  snapshots: readonly DirectorySnapshot[];
}
```

For root plus every parent segment:

1. Validate segment before join: non-empty, not `.`/`..`, no `/`, `\\`, NUL.
2. Root: `path.resolve`, `statSync` so caller-supplied root symlink may resolve as C04 does; require directory; capture canonical realpath.
3. Descendants: create one component at a time with `mkdirSync`, tolerate only `EEXIST`; `lstatSync`; reject symlink/non-directory.
4. Capture `dev`, `ino`, `mode`, canonical realpath. `fs.statSync(..., { bigint: true })` gives strongest identity without number precision loss.
5. Require every canonical path contained under captured canonical root.
6. Do not compare directory size/mtime/ctime. Unrelated sibling activity must not invalidate parent identity, matching C04 policy.

`validateDirectorySelection` rechecks every snapshot:

- root with `statSync`, descendants with `lstatSync`;
- directory type and no descendant symlink;
- same `dev`/`ino`/`mode`;
- same captured realpath;
- containment under captured canonical root.

#### C. Validate filename and snapshot target

Validate `fileName` with same single-segment grammar.

Target state:

```text
absent
or
present regular non-symlink + captured file identity + canonical path in selected directory
```

Reject directory, FIFO/socket/device, or symlink. For present target capture `dev`, `ino`, `mode`, `size`, `mtime`, `ctime` for pre-publication replacement detection.

#### D. Create empty unique stage exclusively

Stage name:

```text
.<target>.<pid>.<randomUUID()>.stage
```

Open with built-in flags:

```text
O_CREAT | O_EXCL | O_WRONLY
+ O_NOFOLLOW when defined by current platform
mode 0o600
```

`O_EXCL` prevents following/reusing an existing final stage pathname. `O_NOFOLLOW` is defense-in-depth where available; do not require an unguarded POSIX-only constant on all platforms.

Important ordering:

```text
open empty stage
-> fstat descriptor; require regular file
-> revalidate complete directory chain
-> lstat stage pathname; require same node as descriptor
-> require stage realpath under captured canonical directory
-> only then write content through descriptor
```

This closes current validate-then-path-write gap: parent replacement before stage open is detected before first content byte; replacement after descriptor verification does not redirect `writeSync(fd, ...)` through a new parent pathname.

#### E. Write and validate stage by descriptor

1. Write complete byte buffer through descriptor, handling short writes until all bytes written.
2. `fsyncSync(fd)` for file data durability.
3. `fstatSync(fd)`; require same node, regular type, exact byte length.
4. Revalidate complete directory chain.
5. Revalidate stage pathname is same node, regular non-symlink, same canonical location.

Keep descriptor open through publication when supported. Node APIs are cross-platform; Windows CI must prove rename/link while descriptor remains open. If target CI platform rejects publication with an open handle, close only after all stage/path checks, then revalidate stage identity again immediately before publication. That fallback weakens post-publication inode binding and must be documented.

Do not require directory `fsync`; portable Node behavior differs across Windows/POSIX. File `fsync` plus atomic namespace operation is strongest common subset.

#### F. Revalidate target immediately before publication

Recheck complete directory chain, then target:

- expected absent -> still absent;
- expected present -> still regular non-symlink, same captured identity and canonical location.

Any change -> fail without publication.

#### G. Publish atomically

Two branches provide strongest available behavior:

1. **Target initially absent**: `linkSync(stage, target)`.
   - Atomic complete-file appearance.
   - Exclusive no-replace behavior: concurrent target causes `EEXIST`, never overwritten.
   - On `EEXIST`, preserve winner. Optionally stable-read it; accept only if exact intended bytes and complete chain remains identical. Otherwise fail committed recovery.
2. **Target initially present and unchanged**: `renameSync(stage, target)`.
   - Atomic old-or-new replacement.
   - No half-written target.
   - Existing-target conditional atomic replacement is impossible with portable Node path APIs; pre/post identity checks detect many races but cannot provide CAS semantics.

After publication:

1. Revalidate complete directory chain.
2. Require target regular non-symlink at captured canonical location.
3. Require target node identity equals staged descriptor/node identity.
4. Require exact expected size; optional stable exact-byte read adds corruption detection.
5. Any failure -> committed recovery. Do not roll back or overwrite a later replacement.

#### H. Cleanup without deleting unrelated replacement

C04 pattern applies (`project-policy.ts:231-247`):

1. Revalidate directory chain before cleanup.
2. `lstat` stage pathname.
3. Unlink only when regular non-symlink and node identity matches expected staged node.
4. `ENOENT` is success.
5. Chain drift, type mismatch, identity mismatch, or unexpected lookup error -> leave pathname untouched.

Never cleanup target after post-publication failure. Never restore old target: rollback could overwrite unrelated concurrent data. Ledger remains authority; same-key retry repairs canonical sidecar.

### Test hooks and interleavings

Use Vitest spies on default `fs` methods, matching C04 tests. No production test-hook export needed.

Required cases:

1. Exact bytes: activation and approval files equal `stableResearchJson(envelope)` byte-for-byte, exactly one LF.
2. Existing target + injected descriptor write failure -> old target unchanged; no half file.
3. Absent target + injected write/fsync failure -> target absent.
4. Target symlink before start -> fail; symlink destination unchanged.
5. Non-regular target before start -> fail.
6. Parent symlink before start -> fail before stage content write.
7. Root replaced after initial snapshot, before stage open -> fail; replacement/outside tree receives no sidecar bytes.
8. Dispatch directory replaced after stage open, before first `writeSync` -> descriptor write cannot follow new parent path; post-check fails; outside target unchanged.
9. Approval directory replaced after content write, before publication -> pre-publication chain check fails.
10. Parent replaced inside `linkSync`/`renameSync` spy -> operation fails or post-check reports committed recovery; no rollback.
11. Initially absent target gets concurrent winner at `linkSync` boundary -> `EEXIST`; preserve winner; accept only exact valid winner if chosen contract says so.
12. Initially present target replaced before final target check -> fail; preserve replacement.
13. Target replaced immediately after publication, before post-check -> fail; preserve replacement; do not restore sidecar.
14. Stage pathname replaced with unrelated inode during failed publication -> cleanup preserves unrelated replacement. Mirror `research-policy-init.integration.test.ts:225-252`.
15. Parent chain replaced before cleanup -> skip cleanup rather than unlink through changed path.
16. Publication succeeds but stage pathname disappears -> success after target verification.
17. Approval revoke atomically replaces old approval JSON with new canonical state; readers observe old or new complete JSON.
18. Concurrent same-key materializers with absent target -> one exclusive publisher; loser accepts exact bytes or fails recoverably, never truncates.
19. Windows CI: optional `O_NOFOLLOW`, hard-link publication, rename replacement, open-descriptor publication, `dev`/`ino` observations, cleanup behavior.
20. Full command regression: prepare, plan, authorize, approve, revoke remain ledger-first; dry-run writes nothing; sidecar failure preserves committed envelope and exact recovery key.

### Impossibility limits

Even proposed writer cannot mathematically prevent:

- parent or stage inode move after last verification but before next pathname op;
- attacker moving already-open stage inode outside selected directory before descriptor write;
- hard-link aliases outside root;
- ABA replacement that restores same observed path state between checks;
- unrelated target replacement in final gap between present-target identity check and `renameSync`;
- target replacement immediately after final verification/return;
- weak or non-unique filesystem inode reporting on unusual platforms/filesystems.

These are reasons to specify detect-and-fail semantics, not reasons to keep current path writer. Proposed algorithm materially removes current parent-symlink path-write gap and detects every practical injected interleaving available to unit/integration tests.

### Scope and approval recommendation

Implementation can remain mechanically scoped to:

- `secureDirectory`;
- `writeSidecar`;
- private local identity/validation/cleanup helpers and `randomUUID` import in same file;
- focused tests.

No external signatures, callers, shared `writeFileAtomic`, runtime files, payload, dependency, package manifest, or helper package need change.

However, current GitNexus classification is not HIGH:

- `secureDirectory`: **CRITICAL**, 12 impacted symbols, 5 affected processes.
- C05 `writeSidecar`: **CRITICAL**, 15 impacted symbols, 5 affected processes.

Affected flows: prepare, plan-activation, authorize, approve, revoke, command registration.

Therefore:

1. **Technical scope**: approve as C05-local body/private-helper security hardening under detect-and-fail contract.
2. **Current governance gate**: cannot approve as “new C05-local HIGH only.” Index says CRITICAL, and PRD forbids any additional HIGH/CRITICAL edit beyond already frozen boundaries.
3. **Required action before code**: return to planning for explicit authorization naming exact two C05-local symbols, exact algorithm boundary, exact tests, and detect-and-fail limitation.
4. **Absolute race-free requirement**: reject scoped pure-Node implementation; requires native `openat`/relative-FD platform layer or new dependency/helper, outside C05 constraints.

## Related Specs

- `.trellis/spec/cli/backend/filesystem-safety.md:71-78,106-116,123-145,164-179` — atomic writes, path validation, C04 chain identity/publication/cleanup patterns, later-successor sidecar requirements.
- `.trellis/spec/cli/backend/commands-research.md:230-261,284-291` — C05 hierarchy preflight, stable sidecar bytes, recovery behavior.
- `.trellis/spec/core/backend/research-state.md:550-587,810-830` — Dispatch hierarchy and activation relationship requirements.
- `.trellis/tasks/07-23-add-activation-approval-commands/prd.md:21-29,89-100,194-216,255-265` — C05 exact scope and current CRITICAL edit gate.
- `.trellis/tasks/07-23-add-activation-approval-commands/design.md:119-145,201-218,280-305` — preflight and sidecar design boundaries.

## External References

None. No network used.

## Caveats / Not Found

- No existing direct tests cover Campaign `runIds` parity in C05 or parent-directory replacement during sidecar publication.
- GitNexus index reports current commit up to date, but both proposed local sidecar symbols classify CRITICAL, contrary to “HIGH” premise.
- Pure Node path APIs cannot satisfy mathematically race-free relative-directory semantics. Contract wording must not overclaim.
