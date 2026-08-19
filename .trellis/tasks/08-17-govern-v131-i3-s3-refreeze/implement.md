# Implementation Plan: G-I3 -> I3 -> S3 -> Closure

## 0. Current Boundary

Completed prerequisite:

- runner stabilization: `753a5d9a8b1aa293a42f27201f3d9dd458edd723`
- split repair: `5a3a1ec39802fb1150eeaa3b3ffd1696f8313e24`
- repair parent/tree/inventory authenticated
- repair full hook passed
- pre-repair six G-I3 staged blobs preserved before reconciliation
- I3 script/test/evidence and S3 freeze absent

Current work begins with exact-six G-I3 reconciliation. Do not create I3 bytes before G-I3 commit succeeds.

## 1. Global Invariants

- [ ] Work only in configured correction worktree.
- [ ] Preserve forward-only history: no amend/reset/rebase/squash/clean/stash/history rewrite.
- [ ] Use literal path allowlists for every stage and commit.
- [ ] Never use repository-wide staging.
- [ ] Keep normal hook enabled.
- [ ] Preserve `AGENTS.md` and `CLAUDE.md` exact SHA-256 values.
- [ ] Preserve `docs-site` and `marketplace` exact gitlinks.
- [ ] Historical I1/I2 scripts run only with `--verify`.
- [ ] No network, provider, remote, evidence transmission, push, publication, release, activation, archive, or journal action.
- [ ] No Attempt 4, T6 closure, T7, or M0-A4 action.
- [ ] Stop after exact-one closure.

Protected identities:

```text
AGENTS.md  sha256:788d2a2da0e913874acee2c3cf2f34575b50191b18e47f21478645ea5be4be48
CLAUDE.md  sha256:319361ea166bde3be56a6c6dc5a161a5a6f73a214a2aea1d8efd1436b1853cf3
docs-site  be7684f2086abb9b8e24d4d35733a7dda3123a0f
marketplace d7a18bb5411c700237d21483d6889ac296ef0301
```

## 2. Phase G-I3 — Reconcile Exact-Six Governance

### 2.1 Authenticate repair predecessor

- [ ] Require `HEAD` = `5a3a1ec39802fb1150eeaa3b3ffd1696f8313e24`.
- [ ] Require parent = `753a5d9a8b1aa293a42f27201f3d9dd458edd723`.
- [ ] Require tree = `cc3ce047d4a1b678d9aff74bd831464015acb223`.
- [ ] Require subject = `test(cli): split dispatch aggregate scenarios`.
- [ ] Require exact eight-path repair inventory.
- [ ] Require repair task committed `completed`.
- [ ] Require no I3/S3 output path exists.

### 2.2 Recompute three-anchor package proof

Using exact NUL-delimited `git ls-tree -r -z` bytes over:

```text
packages/core packages/cli package.json pnpm-lock.yaml pnpm-workspace.yaml
```

- [ ] R3 count = 1,591.
- [ ] R3 digest = `sha256:077f223c93c98d8abd0854f0e1f5c71d0782dae2cf2b580237b545aff2d34a51`.
- [ ] Stabilization count = 1,591.
- [ ] Stabilization digest = `sha256:60e3c8e948d08d4b312908becd8b2e947bb882da053ca9a111174e114ec1042c`.
- [ ] Repair count = 1,591.
- [ ] Repair digest = `sha256:575af4df32b2bc236cd37b675b1b470639ad206c708f79fa735ab1bc83810933`.
- [ ] R3 -> stabilization delta = runner config only.
- [ ] Stabilization -> repair delta = two dispatch tests only.
- [ ] R3 -> repair delta = exact three paths.
- [ ] Shared R3/repair count = 1,588.
- [ ] Shared digest = `sha256:b2010d0e527a54de1bb2ea9838da7e2af42faadbf26cad4530d82a1c38522187`.
- [ ] Recompute mode/blob/length/SHA-256 identities for all three changed paths.

### 2.3 Reconcile six artifacts

Exact paths:

```text
.trellis/tasks/08-17-govern-v131-i3-s3-refreeze/task.json
.trellis/tasks/08-17-govern-v131-i3-s3-refreeze/prd.md
.trellis/tasks/08-17-govern-v131-i3-s3-refreeze/design.md
.trellis/tasks/08-17-govern-v131-i3-s3-refreeze/implement.md
.trellis/tasks/08-17-govern-v131-i3-s3-refreeze/implement.jsonl
.trellis/tasks/08-17-govern-v131-i3-s3-refreeze/check.jsonl
```

- [ ] Make repair immediate predecessor everywhere current authority is described.
- [ ] Keep R3 semantic role explicit.
- [ ] Keep stabilization topology role explicit.
- [ ] Replace one-path arithmetic with exact three-anchor arithmetic.
- [ ] Plan repair-to-I3 exact two-path package delta.
- [ ] Plan R3-to-I3 exact five-path package delta.
- [ ] Preserve old blob maps as superseded history.
- [ ] Record latest repair-aware approval and approved sequence.
- [ ] Keep exact-nine I3, exact-one S3, exact-one closure inventories.
- [ ] Keep every later authority false.
- [ ] Create no `research/` directory.

### 2.4 Validate governance

- [ ] Parse `task.json` with strict JSON parser.
- [ ] Parse every JSONL line independently.
- [ ] Run Markdown formatter/checker used by repository.
- [ ] Run Trellis task validation.
- [ ] Search six artifacts for stale current-authority claims:
  - stabilization as immediate predecessor;
  - only one R3 drift path;
  - eight-path I3 inventory;
  - 1,590 R3/repair shared entries;
  - repair or Attempt 4 still pending as current step.
- [ ] Confirm any old value appears only inside explicitly superseded history.
- [ ] Obtain independent governance review.

### 2.5 Stage and inspect exact six

- [ ] Stage each G-I3 path literally.
- [ ] Require cached path set = exact six.
- [ ] Require no unstaged difference for those six paths.
- [ ] Run `git diff --cached --check`.
- [ ] Inspect full cached diff.
- [ ] Run GitNexus staged detection.
- [ ] Run GitNexus compare detection against `variant/research-workflow`.
- [ ] Reauthenticate protected hashes/gitlinks and no I3/S3 outputs.

### 2.6 Commit exact-six G-I3

Commit message:

```text
chore(research): govern repair-aware i3 refreeze

Co-Authored-By: Claude <noreply@anthropic.com>
```

- [ ] Launch one normal-hook commit restricted to exact six paths.
- [ ] On failure/interruption: preserve output, prove no commit, restore exact staged/worktree boundary, stop without retry.
- [ ] On success: authenticate parent = repair, exact six inventory, tree, subject, path modes/blobs, task state, protected state, and absent I3/S3 outputs.

## 3. Phase I3 — Create Exact-Nine Subject

### 3.1 Reauthenticate inputs

- [ ] Require `HEAD` = authenticated G-I3 commit.
- [ ] Reauthenticate R3, stabilization, repair, G-I3, I1/S1, I2/S2, corrected T4, and Attempts 1–3 committed objects.
- [ ] Recompute package tuple proof; require G-I3 package tree = repair package tree.
- [ ] Require exact clean phase-owned index.
- [ ] Preserve unrelated unstaged protected bytes.
- [ ] Run GitNexus impact before editing any indexed function/class/method.
- [ ] Warn and stop before any HIGH/CRITICAL edit.

### 3.2 Create script and test

Create:

```text
packages/cli/scripts/research-v131-installed-package-audit-i3.mjs
packages/cli/test/commands/research-v131-integration-i3.test.ts
```

Script requirements:

- [ ] `--verify` writes nothing.
- [ ] `--write` owns four evidence records only.
- [ ] Reject unknown mode or target.
- [ ] Authenticate three anchors and G-I3 before write.
- [ ] Build/pack Core and CLI locally.
- [ ] Hash tarballs before install.
- [ ] Install same tarball bytes into npm and pnpm consumers.
- [ ] Disable lifecycle scripts.
- [ ] Enforce offline/no-registry behavior.
- [ ] Record command/version/exit/cleanup evidence.
- [ ] Canonical deterministic JSON.
- [ ] Atomic write and reread validation.
- [ ] Never write ledger.

Test requirements:

- [ ] `normal` project ownership only.
- [ ] Validate all four script-owned records and orchestration ledger.
- [ ] Validate both package-manager consumers.
- [ ] Exercise installed package entry points.
- [ ] Reject source-tree substitution.
- [ ] Reject wrong tarball identity, missing cleanup, missing/offline false, or anchor mismatch.
- [ ] Add no config, helper, fixture, timeout, worker, retry, or lane change unless already specified by existing patterns.

### 3.3 Correct living spec

Modify only:

```text
.trellis/spec/cli/unit-test/conventions.md
```

- [ ] Replace static normal-project file count with dynamic derivation rule.
- [ ] Require four configured project sets pairwise disjoint.
- [ ] Require union equals current complete CLI test discovery.
- [ ] Keep current `1/1/83/2`, union 87 only as observation.
- [ ] Do not change accepted methodology semantics.

### 3.4 Build and produce evidence

Create exact records:

```text
integration-input-attestation.json
package-tarball-inventory.json
external-install-evidence.json
protected-path-audit.json
integration-execution-evidence-ledger.json
```

Order:

1. [ ] authenticate current inputs and retained immutable objects;
2. [ ] run historical I1/I2 scripts with `--verify` only;
3. [ ] derive the dynamic four-project inventory and reject overlap, omission, or a fifth project;
4. [ ] run parse/format, targeted lint, typecheck, and evidence-independent focused tests before expensive packaging;
5. [ ] build Core and CLI;
6. [ ] pack Core and CLI once;
7. [ ] hash tarballs and package contents;
8. [ ] install exact tarballs into the temporary npm consumer and exercise installed behavior;
9. [ ] clean the npm consumer in `finally` and capture cleanup outcome in memory;
10. [ ] install the same tarballs into the temporary pnpm consumer and exercise installed behavior;
11. [ ] clean the pnpm consumer in `finally` and capture cleanup outcome in memory;
12. [ ] write the four script-owned records once, only after both cleanup outcomes are final;
13. [ ] rerun the script in verify mode and require byte preservation;
14. [ ] run pre-ledger protected-path, package-tree, staged-set, and record-linkage checks;
15. [ ] assemble the orchestration-owned ledger; do not make it claim its own later validation result;
16. [ ] run the evidence-dependent I3 integration test against all five complete records;
17. [ ] verify all five records together and prove both temporary consumers remain absent.

### 3.5 Transition task to I3-prepared

Update `task.json` only inside exact-nine inventory:

```text
status = in_progress
completedAt = null
meta.executionState = i3-evidence-prepared
meta.i3EvidencePrepared = true
meta.s3Status = pending
```

Record actual authenticated G-I3 identity and current I3 observations. Do not mark task completed.

### 3.6 Validate exact-nine candidate

- [ ] Exact I3 path set = planned nine.
- [ ] I3 package-pathspec count = 1,593.
- [ ] Repair/G-I3 -> I3 package delta = new script + new test only.
- [ ] R3 -> I3 package delta = runner config + two split tests + new script/test.
- [ ] All 1,588 original R3 entries outside the runner config and two split tests retain exact mode/blob identity; the two I3 paths are additions, not original R3 entries.
- [ ] Dynamic project counts = `1/1/83/2`, union 87.
- [ ] Four project sets pairwise disjoint.
- [ ] Complete discovery equals union.
- [ ] JSON/JSONL/Markdown parse/format passes.
- [ ] Script verify mode is byte-preserving.
- [ ] Focused lint/type/test passes.
- [ ] Relevant full package gates pass as defined by repo.
- [ ] Independent implementation/check review passes.
- [ ] Protected state exact.

### 3.7 Stage and commit exact nine

- [ ] Stage nine literal paths only.
- [ ] Require cached set exact nine.
- [ ] Run cached diff check and inspect full diff.
- [ ] Run GitNexus staged + compare detection.
- [ ] Commit once with normal hook.
- [ ] Failure/interruption -> preserve output, restore governed lifecycle/index, stop without retry.
- [ ] Success -> authenticate parent, tree, subject, exact nine paths, modes/blobs, evidence bytes, task transition, package arithmetic, protected state.

Proposed commit message:

```text
feat(research): integrate v1.3.1 installed-package evidence

Co-Authored-By: Claude <noreply@anthropic.com>
```

## 4. Phase S3 — Freeze Exact Committed I3

### 4.1 Authenticate I3

- [ ] Require `HEAD` = authenticated exact-nine I3 commit.
- [ ] Read all subject bytes from Git objects, not worktree.
- [ ] Require exact nine-path inventory and expected parent/tree.
- [ ] Reauthenticate three anchors, G-I3, evidence records, package arithmetic, protected state.

### 4.2 Assemble freeze deterministically

Create only:

```text
.trellis/tasks/08-17-govern-v131-i3-s3-refreeze/research/exact-subject-freeze.json
```

- [ ] Record I3 commit, parent, tree, subject.
- [ ] Record each of nine paths: status, mode, blob, byte length, SHA-256.
- [ ] Record typed R3, stabilization, repair, and G-I3 anchors.
- [ ] Record evidence identities.
- [ ] Keep later authorities false.
- [ ] Include no worktree authority, placeholder, or self-hash.
- [ ] Assemble independently twice; require byte-identical canonical JSON.
- [ ] Recursively reject unresolved values and self-reference.

### 4.3 Stage and commit exact one

- [ ] Parse/schema/semantic validation passes.
- [ ] Stage freeze path only.
- [ ] Require cached set exact one.
- [ ] Run cached diff check and inspect full file.
- [ ] Run GitNexus staged + compare detection.
- [ ] Commit once with normal hook.
- [ ] Failure/interruption -> preserve output, restore index, stop without retry.
- [ ] Success -> authenticate exact-one inventory and freeze against committed I3.

Proposed commit message:

```text
chore(research): freeze exact v1.3.1 i3 subject

Co-Authored-By: Claude <noreply@anthropic.com>
```

## 5. Phase G-I3-CLOSE — Exact-One Closure

### 5.1 Final authentication

- [ ] Reauthenticate repair, G-I3, I3, and S3 commit graph.
- [ ] Reauthenticate exact inventories and all path identities.
- [ ] Verify S3 resolves to exact committed I3.
- [ ] Verify protected hashes/gitlinks.
- [ ] Verify no later-authority action occurred.

### 5.2 Transition task

Change only `task.json`:

```text
status = completed
completedAt = <actual local calendar date at closure>
meta.executionState = completed
meta.i3EvidencePrepared = true
meta.s3Status = authenticated
```

Assign `completedAt` immediately before the closure commit; do not backdate it to approval or planning. Also record authenticated I3/S3 identities as final task metadata without changing prior evidence.

### 5.3 Stage and commit exact one

- [ ] Validate task artifacts.
- [ ] Stage `task.json` only.
- [ ] Require cached set exact one.
- [ ] Run cached diff check and inspect complete diff.
- [ ] Run GitNexus staged + compare detection.
- [ ] Commit once with normal hook.
- [ ] Failure/interruption -> preserve output, restore pre-close lifecycle/index, stop without retry.
- [ ] Success -> authenticate exact-one closure commit and completed state.

Proposed commit message:

```text
chore(research): close v1.3.1 i3 refreeze

Co-Authored-By: Claude <noreply@anthropic.com>
```

## 6. Final Stop

- [ ] Mark internal task #72 complete only after closure commit authentication.
- [ ] Do not start tasks #73 or #74.
- [ ] Do not prepare M0-A4.
- [ ] Do not invoke provider, remote, network, push, publication, release, archive, journal, or activation tooling.
- [ ] Report four authenticated commits after repair plus final protected state.
- [ ] Stop.
