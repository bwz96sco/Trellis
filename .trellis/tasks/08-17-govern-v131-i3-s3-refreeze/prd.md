# G-I3: Govern v1.3.1 I3/S3 Refreeze

## Status

- Stage: `G-I3`
- State: `in_progress`
- Current execution state: `governed-awaiting-i3`
- Fresh repair-aware approval: received on 2026-08-18
- Approved sequence: `REPAIR -> G-I3 -> I3 -> S3 -> G-I3-CLOSE -> STOP before M0-A4`
- Immediate governance predecessor: `5a3a1ec39802fb1150eeaa3b3ffd1696f8313e24`
- I3 bytes: absent until this exact-six governance subject commits successfully
- S3 bytes: absent until exact-nine I3 commits successfully

## Problem

R3 closed the v1.3.1 technical correction, but its I1/S1 and I2/S2 installed-package evidence cannot be rewritten. A forward I3 subject must prove current source/install behavior while preserving retained history.

Two later technical commits now sit between R3 and I3:

1. `753a5d9a8b1aa293a42f27201f3d9dd458edd723` changed CLI Vitest project routing so the production harness runs in one isolated lane.
2. `5a3a1ec39802fb1150eeaa3b3ffd1696f8313e24` split two dispatch aggregate tests into nine scenario-level tests without changing production behavior or timeout values.

The pre-repair G-I3 draft treated the stabilization commit as the immediate predecessor and only one package path as changed from R3. That draft is retained as superseded history, not current authority. Current governance must distinguish three immutable roles:

- R3 semantic baseline;
- runner-stabilization anchor;
- split-repair immediate Git/integration predecessor.

I3 must then add exactly one audit script and one integration test under `packages/**`, update one living test-inventory spec dynamically, generate five evidence records, and commit an exact-nine subject. S3 must freeze that committed subject in one later file.

## Goal

Produce a truthful, forward-only governance chain:

1. commit this reconciled exact-six G-I3 subject;
2. create and commit exact-nine I3 against the repair predecessor;
3. create and commit exact-one S3 from committed I3 objects;
4. close this task with one exact-one governance commit;
5. stop before M0-A4.

No retained technical, evidence, assurance, or failed-attempt object may be amended, reset, rebased, squashed, or regenerated in place.

## Immutable Anchor Chain

### R3 semantic anchor

- Commit: `0028183901b74263a70dacca98bb936dc792ced4`
- Tree: `57a66fa619c38d525431f829f3738cd61bb75d83`
- Role: technical semantic baseline
- Package-pathspec entries: `1,591`
- Tuple digest: `sha256:077f223c93c98d8abd0854f0e1f5c71d0782dae2cf2b580237b545aff2d34a51`

### Runner-stabilization anchor

- Commit: `753a5d9a8b1aa293a42f27201f3d9dd458edd723`
- Parent: `c7d3423bbe5bade60a4fa9a02ea1849b5403ea70`
- Tree: `59d88a337a563cb90e875cc7197489fa4c1a6e93`
- Subject: `test(cli): isolate production harness lane`
- Role: retained test-runner topology change
- Package-pathspec entries: `1,591`
- Tuple digest: `sha256:60e3c8e948d08d4b312908becd8b2e947bb882da053ca9a111174e114ec1042c`
- Delta from R3: only `packages/cli/vitest.config.ts`

### Split-repair predecessor

- Commit: `5a3a1ec39802fb1150eeaa3b3ffd1696f8313e24`
- Parent: `753a5d9a8b1aa293a42f27201f3d9dd458edd723`
- Tree: `cc3ce047d4a1b678d9aff74bd831464015acb223`
- Subject: `test(cli): split dispatch aggregate scenarios`
- Role: immediate Git/integration predecessor for G-I3 and I3
- Commit inventory: exact six repair-task artifacts plus two CLI tests
- Package-pathspec entries: `1,591`
- Tuple digest: `sha256:575af4df32b2bc236cd37b675b1b470639ad206c708f79fa735ab1bc83810933`
- Delta from stabilization: exactly two CLI dispatch tests
- Delta from R3: runner config plus those two tests

### Shared R3 identity

Across R3 and repair, `1,588` package-pathspec entries retain exact mode/type/object identity.

- Digest: `sha256:b2010d0e527a54de1bb2ea9838da7e2af42faadbf26cad4530d82a1c38522187`
- Serialization: matching exact R3 `git ls-tree` records, NUL-terminated, in original R3 order

All full-tree tuple digests use exact NUL-delimited output from:

```text
git ls-tree -r -z <commit> -- \
  packages/core packages/cli package.json pnpm-lock.yaml pnpm-workspace.yaml
```

## Package Arithmetic

### Before I3

| Comparison | Exact package delta |
|---|---|
| R3 -> stabilization | `packages/cli/vitest.config.ts` |
| stabilization -> repair | two split dispatch test files |
| R3 -> repair | runner config plus two split dispatch test files |
| repair -> pre-I3 worktree | none |

The two repair paths are:

- `packages/cli/test/commands/research-dispatch-activation.integration.test.ts`
- `packages/cli/test/commands/research-dispatch-approved-result.test.ts`

### After I3

I3 adds exactly these two package paths relative to repair:

- `packages/cli/scripts/research-v131-installed-package-audit-i3.mjs`
- `packages/cli/test/commands/research-v131-integration-i3.test.ts`

Expected I3 package-pathspec entry count: `1,593`.

Expected comparison after I3:

| Comparison | Exact package delta |
|---|---|
| repair -> I3 | new I3 audit script plus new I3 integration test |
| stabilization -> I3 | two split dispatch tests plus new I3 script/test |
| R3 -> I3 | runner config, two split dispatch tests, new I3 script/test |

All original R3 package entries outside those five paths must retain exact mode/blob identity.

## Scope

### In scope

#### G-I3 governance commit: exact six paths

- `.trellis/tasks/08-17-govern-v131-i3-s3-refreeze/task.json`
- `.trellis/tasks/08-17-govern-v131-i3-s3-refreeze/prd.md`
- `.trellis/tasks/08-17-govern-v131-i3-s3-refreeze/design.md`
- `.trellis/tasks/08-17-govern-v131-i3-s3-refreeze/implement.md`
- `.trellis/tasks/08-17-govern-v131-i3-s3-refreeze/implement.jsonl`
- `.trellis/tasks/08-17-govern-v131-i3-s3-refreeze/check.jsonl`

#### I3 subject commit: exact nine paths

- `.trellis/tasks/08-17-govern-v131-i3-s3-refreeze/task.json`
- `packages/cli/scripts/research-v131-installed-package-audit-i3.mjs`
- `packages/cli/test/commands/research-v131-integration-i3.test.ts`
- `.trellis/spec/cli/unit-test/conventions.md`
- `.trellis/tasks/08-17-govern-v131-i3-s3-refreeze/research/integration-input-attestation.json`
- `.trellis/tasks/08-17-govern-v131-i3-s3-refreeze/research/package-tarball-inventory.json`
- `.trellis/tasks/08-17-govern-v131-i3-s3-refreeze/research/external-install-evidence.json`
- `.trellis/tasks/08-17-govern-v131-i3-s3-refreeze/research/integration-execution-evidence-ledger.json`
- `.trellis/tasks/08-17-govern-v131-i3-s3-refreeze/research/protected-path-audit.json`

#### S3 subject commit: exact one path

- `.trellis/tasks/08-17-govern-v131-i3-s3-refreeze/research/exact-subject-freeze.json`

#### Closure commit: exact one path

- `.trellis/tasks/08-17-govern-v131-i3-s3-refreeze/task.json`

### Out of scope

- Attempt 4 preparation or execution
- provider or assurance execution
- evidence transmission
- T6 closure or technical operator decision
- T7 work
- M0-A4 preparation or execution
- archive or journal updates
- remote reads, network access, pushes, publication, release, activation
- worker-authority or live-selection changes
- complete-system acceptance
- production behavior changes unrelated to exact I3 audit/test creation
- runner topology, lane membership, worker, retry, or timeout changes
- any retained-history rewrite

All corresponding authority flags remain `false`.

## Functional Requirements

### FR1 — Reconciled G-I3 authority

G-I3 must:

- name repair as immediate governance predecessor;
- retain R3 as semantic anchor;
- retain stabilization as runner-topology anchor;
- record exact commit, parent, tree, subject, inventory, path count, tuple digest, and delta roles;
- record exact mode/blob/byte-length/SHA-256 identity for all three paths changed between R3 and repair;
- retain prior staged G-I3 blob maps as superseded history;
- record current repair-aware approval;
- authorize only G-I3, I3, S3, and exact-one closure.

### FR2 — Forward-only historical authentication

I1/S1, I2/S2, R3, corrected T4, Attempts 1–3, Procedure history, and `.trellis/research/**` remain immutable.

Historical audit scripts may run only with `--verify`. Historical evidence is authenticated from committed Git objects. No historical `--write` operation is allowed.

### FR3 — Exact-nine I3 inventory

I3 must change exactly nine paths listed above. No tenth path is allowed.

I3 task transition:

```json
{
  "status": "in_progress",
  "executionState": "i3-evidence-prepared",
  "i3EvidencePrepared": true,
  "s3Status": "pending"
}
```

### FR4 — Same-byte package production and consumption

I3 must:

1. build Core and CLI locally;
2. pack both packages locally;
3. compute immutable tarball identities before installation;
4. install those exact tarballs into temporary npm and pnpm consumers with lifecycle scripts disabled;
5. prove installed files and behavior against those same tarball bytes;
6. forbid network and registry fallback;
7. record package-manager commands, versions, exit status, observed package identities, and cleanup state.

### FR5 — I3 audit-script ownership

The new I3 audit script owns exactly four evidence records:

- `integration-input-attestation.json`
- `package-tarball-inventory.json`
- `external-install-evidence.json`
- `protected-path-audit.json`

It must not write `integration-execution-evidence-ledger.json`. Orchestration owns that fifth record after all final pre-ledger checks pass.

### FR6 — Installed-package integration proof

The new normal-project integration test must exercise installed package behavior from temporary external consumers. It must not import source-tree modules as substitutes for installed artifacts.

Required surfaces remain those defined by accepted v1.3.1 integration contract and retained I1/I2 evidence. Any mismatch stops execution.

### FR7 — Dynamic living test inventory

`.trellis/spec/cli/unit-test/conventions.md` must stop treating a stale numeric normal-project count as normative. It must describe dynamic derivation from current project configuration.

Expected post-I3 observation, not contract:

- `procedure207Packages`: 1 file
- `methodology116Production`: 1 file
- `normal`: 83 files
- `distMutating`: 2 files
- union: 87 files

All four project sets must be pairwise disjoint. Their union must equal complete CLI test discovery. No fifth project is allowed.

### FR8 — Exact-one S3 freeze

S3 must be assembled only after I3 commits. It must:

- read I3 exclusively from committed Git objects;
- record I3 commit, parent, tree, subject, exact nine-path inventory, modes, blobs, byte lengths, and SHA-256 identities;
- carry typed R3, stabilization, and repair anchors;
- record relevant I3 evidence identities;
- contain canonical, placeholder-free JSON;
- contain no self-hash or mutable-worktree authority;
- keep all later authority flags false.

### FR9 — Exact-one closure

After S3 authentication, closure may change only `task.json` to:

```json
{
  "status": "completed",
  "completedAt": "<actual local closure date>",
  "executionState": "completed",
  "i3EvidencePrepared": true,
  "s3Status": "authenticated"
}
```

`completedAt` is assigned immediately before the closure commit; it is not backdated to approval or planning. Closure must not alter I3, S3, specs, scripts, tests, or evidence.

## Protected State

Preserve exact unstaged bytes:

- `AGENTS.md`: `sha256:788d2a2da0e913874acee2c3cf2f34575b50191b18e47f21478645ea5be4be48`
- `CLAUDE.md`: `sha256:319361ea166bde3be56a6c6dc5a161a5a6f73a214a2aea1d8efd1436b1853cf3`

Preserve exact gitlinks:

- `docs-site`: `be7684f2086abb9b8e24d4d35733a7dda3123a0f`
- `marketplace`: `d7a18bb5411c700237d21483d6889ac296ef0301`

Use literal path allowlists for every stage and commit operation. Never use repository-wide staging.

## Stop Conditions

Stop without retry authority on any:

- three-anchor identity mismatch;
- predecessor, parent, tree, subject, or inventory mismatch;
- package tuple count/digest/delta mismatch;
- changed-path mode/blob/length/hash mismatch;
- retained object, protected path, or gitlink mismatch;
- unexpected staged or unstaged path;
- project partition overlap, omission, or fifth project;
- network need or registry fallback;
- historical `--write` attempt;
- package tarball identity drift between build, pack, install, and audit;
- nondeterministic evidence output;
- schema, formatting, lint, type, test, hook, or independent-review failure;
- concurrent repository state change;
- request for any action beyond closure.

A failed or interrupted normal-hook commit grants no second launch. Preserve output, restore only governed lifecycle/index state, and stop for fresh authority.

## Acceptance Criteria

### G-I3

- Exact six governance paths reconciled.
- Repair predecessor authenticated as `5a3a1ec39802fb1150eeaa3b3ffd1696f8313e24`.
- Three-anchor package arithmetic exact: `1,591 / 1,591 / 1,591`, three R3-to-repair changed paths, `1,588` shared R3 tuples.
- Full tuple digests and shared digest match this PRD.
- Changed-path identities match committed blobs.
- Superseded pre-stabilization and pre-repair drafts remain historical only.
- Protected files and gitlinks unchanged.
- Exact-six commit passes normal hook.
- No I3/S3 byte exists before G-I3 commit success.

### I3

- Exact nine paths only.
- Repair-to-I3 package delta is exactly new script plus new test.
- R3-to-I3 package delta is exactly five paths.
- Same tarball bytes consumed by both offline consumers.
- Historical scripts run only in verify mode.
- Four evidence records owned by script; ledger owned by orchestration.
- Dynamic four-project partition proves `1/1/83/2`, union 87, as current observation.
- All required checks and normal hook pass.
- I3 commit reauthenticated from Git objects.

### S3

- Exactly one freeze file.
- Freeze derives only from committed I3 objects.
- Exact I3 commit/tree/path identities recorded.
- Typed R3, stabilization, and repair anchors recorded.
- Canonical JSON; no placeholder, self-hash, or mutable authority.
- Normal hook passes; S3 commit reauthenticated.

### Closure

- Only `task.json` changes.
- Planned completed transition exact.
- All prior commits and protected state reauthenticated.
- Normal hook passes.
- Execution stops before M0-A4.

## Approval Boundary

Latest user instruction: `拆分聚合测试（推荐）`.

That instruction approved repair plus continuation through G-I3, I3, S3, and exact-one closure under this repair-aware plan. It does not authorize any later campaign or external action.
