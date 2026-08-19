# Design: Repair-Aware I3/S3 Refreeze

## 1. Design Intent

Create one forward successor to retained I1/S1, I2/S2, and R3 history. Separate three concerns:

1. semantic baseline: R3;
2. test-runner topology: stabilization;
3. immediate Git/integration state: split repair.

G-I3 records authority. I3 creates current installed-package evidence. S3 freezes exact committed I3. Closure records completion. No phase may borrow authority from a later phase.

## 2. Commit Graph

```text
R3 technical
0028183901b74263a70dacca98bb936dc792ced4
  |
  | retained governance/closure history
  v
runner stabilization
753a5d9a8b1aa293a42f27201f3d9dd458edd723
  |
  v
split repair
5a3a1ec39802fb1150eeaa3b3ffd1696f8313e24
  |
  v
G-I3 exact-six governance
  |
  v
I3 exact-nine subject
  |
  v
S3 exact-one freeze
  |
  v
G-I3 exact-one closure
  |
  X STOP before M0-A4
```

G-I3 itself changes no package path. Therefore repair and G-I3 have identical package-pathspec trees. I3 package comparison uses repair as immediate package predecessor even though G-I3 is immediate Git parent.

## 3. Typed Anchor Model

Do not compress anchors into one `baseline` field.

```ts
type AnchorRole =
  | "r3-semantic-anchor"
  | "runner-stabilization-anchor"
  | "immediate-git-integration-predecessor"
  | "g-i3-governance-anchor";

type ImmutableCommitAnchor = {
  role: AnchorRole;
  commit: string;
  parent?: string;
  tree: string;
  subject?: string;
  inventory?: string[];
  packagePathCount: number;
  packageTupleDigest: `sha256:${string}`;
};
```

Required values:

| Role | Commit | Package count | Package digest |
|---|---|---:|---|
| R3 semantic | `0028183901b74263a70dacca98bb936dc792ced4` | 1,591 | `sha256:077f223c93c98d8abd0854f0e1f5c71d0782dae2cf2b580237b545aff2d34a51` |
| runner stabilization | `753a5d9a8b1aa293a42f27201f3d9dd458edd723` | 1,591 | `sha256:60e3c8e948d08d4b312908becd8b2e947bb882da053ca9a111174e114ec1042c` |
| repair predecessor | `5a3a1ec39802fb1150eeaa3b3ffd1696f8313e24` | 1,591 | `sha256:575af4df32b2bc236cd37b675b1b470639ad206c708f79fa735ab1bc83810933` |

Role constraints:

- R3 determines accepted technical semantics and original package identity.
- Stabilization explains `packages/cli/vitest.config.ts` drift and project topology.
- Repair determines actual files available to I3, exact test count, and immediate integration state.
- Neither later test-only anchor redefines accepted semantic digest.
- The G-I3 governance anchor becomes available only after the exact-six commit; S3 records it as a fourth typed anchor without adding a fourth pre-I3 package baseline.

## 4. Package-Tree Authentication

### 4.1 Pathspec

```text
packages/core
packages/cli
package.json
pnpm-lock.yaml
pnpm-workspace.yaml
```

### 4.2 Full-tree digest

For each anchor, hash exact bytes from:

```bash
git ls-tree -r -z <commit> -- \
  packages/core packages/cli package.json pnpm-lock.yaml pnpm-workspace.yaml
```

No newline normalization, sorting, or text decoding before SHA-256.

### 4.3 Shared R3/repair digest

Select exact R3 `ls-tree` records whose mode/type/object/path tuple equals repair. Preserve original R3 record order. Append one NUL per record. Hash concatenated bytes.

Expected:

- shared count: `1,588`
- digest: `sha256:b2010d0e527a54de1bb2ea9838da7e2af42faadbf26cad4530d82a1c38522187`

### 4.4 Exact delta sets

```text
R3 -> stabilization
  packages/cli/vitest.config.ts

stabilization -> repair
  packages/cli/test/commands/research-dispatch-activation.integration.test.ts
  packages/cli/test/commands/research-dispatch-approved-result.test.ts

R3 -> repair
  packages/cli/vitest.config.ts
  packages/cli/test/commands/research-dispatch-activation.integration.test.ts
  packages/cli/test/commands/research-dispatch-approved-result.test.ts
```

After I3, append:

```text
packages/cli/scripts/research-v131-installed-package-audit-i3.mjs
packages/cli/test/commands/research-v131-integration-i3.test.ts
```

Repair-to-I3 must contain only those two appended paths. I3 must therefore contain `1,593` package-pathspec entries.

### 4.5 Changed-path identity

For each of three R3-to-repair changed paths, store per-anchor:

```ts
type PathIdentity = {
  commit: string;
  mode: "100644";
  type: "blob";
  blob: string;
  byteLength: number;
  sha256: string;
};
```

Exact values live in `task.json`. Checks recompute them from committed objects. Docs do not become alternate identity authority.

## 5. Phase Boundaries

### 5.1 G-I3

Owns six task artifacts only. May update governance descriptions, typed anchors, arithmetic, approval, execution checklist, and check manifests.

Must not create:

- I3 script;
- I3 test;
- I3 evidence directory/files;
- S3 freeze.

### 5.2 I3

Owns exact nine paths. May create current evidence only after G-I3 commits.

I3 does not close this task. It changes task execution state to `i3-evidence-prepared`, leaves `status: in_progress`, and leaves S3 pending.

### 5.3 S3

Owns one new freeze file. Reads committed I3 objects only. Never hashes mutable worktree bytes as subject authority.

### 5.4 Closure

Owns one `task.json` transition. No evidence or source mutation.

## 6. I3 Audit Architecture

### 6.1 Entry points

Planned script:

```text
packages/cli/scripts/research-v131-installed-package-audit-i3.mjs
```

Modes:

```text
--verify   verify retained/current records; write nothing
--write    create four I3-owned evidence records only
```

`--write` is valid only during I3 creation, against authenticated G-I3/repair state. Historical I1/I2 scripts remain verify-only.

### 6.2 Script-owned records

```text
integration-input-attestation.json
package-tarball-inventory.json
external-install-evidence.json
protected-path-audit.json
```

Write protocol:

1. calculate complete object in memory;
2. canonicalize deterministically;
3. reject placeholders/unresolved values;
4. write temporary sibling;
5. fsync/close as existing repo patterns require;
6. rename atomically;
7. reread and validate;
8. remove temporary paths on failure.

No record may claim completion before all data it owns exists.

### 6.3 Orchestration-owned ledger

```text
integration-execution-evidence-ledger.json
```

The script must reject this file as a write target. Orchestration assembles it after:

- four script-owned records verify;
- exact-nine candidate inventory is known;
- dynamic project partition passes;
- targeted checks pass;
- pre-ledger protected-path and package-tree checks pass.

Ledger records execution and cross-record linkage. It does not self-hash. No file may require its own final blob/hash as an input.

## 7. Input Attestation Contract

`integration-input-attestation.json` must bind:

- accepted contract: `evaluation-contract-v1.3.1`;
- accepted semantic digest: `sha256:8e2cd20dd8e12caab318852f82a100116a28d405113f654efbda7b3646f666af`;
- R3 semantic anchor;
- stabilization anchor;
- repair predecessor;
- current G-I3 commit/tree after governance commit;
- package pathspec and three-anchor tuple digests;
- exact expected package delta sets;
- retained I1/S1 and I2/S2 identities;
- corrected T4 and Attempts 1–3 identities required by current contract;
- protected-path hashes and gitlinks;
- explicit false later-authority flags.

Attestation must distinguish committed-object facts from current execution observations.

## 8. Tarball Inventory Contract

`package-tarball-inventory.json` must record each packed package:

```ts
type TarballRecord = {
  packageName: string;
  packageVersion: string;
  sourceCommit: string;
  tarballPath: string;
  byteLength: number;
  sha256: string;
  packageJsonIdentity: {
    byteLength: number;
    sha256: string;
  };
  fileEntries: Array<{
    path: string;
    mode: string;
    byteLength: number;
    sha256: string;
  }>;
};
```

Requirements:

- Core and CLI built locally from authenticated source.
- Tarball bytes hashed before consumer install.
- Same file path and SHA-256 supplied to npm and pnpm consumers.
- No repack between consumers.
- No registry specifier or network fallback.
- Lifecycle scripts disabled.

Hashes here answer material question: both consumers installed same built artifact. No redundant row-level hashing beyond package/file identity needed by proof.

## 9. External Consumer Contract

`external-install-evidence.json` records two temporary consumers:

- npm consumer;
- pnpm consumer.

Each record includes:

```ts
type ConsumerEvidence = {
  packageManager: "npm" | "pnpm";
  packageManagerVersion: string;
  tempRoot: string;
  installCommand: string[];
  environment: Record<string, string>;
  lifecycleScriptsDisabled: true;
  offlineEnforced: true;
  installedTarballs: Array<{
    packageName: string;
    expectedSha256: string;
    observedPackageVersion: string;
  }>;
  commands: Array<{
    argv: string[];
    exitCode: number;
    stdoutDigest?: string;
    stderrDigest?: string;
  }>;
  cleanup: {
    attempted: boolean;
    succeeded: boolean;
  };
};
```

Temporary paths are evidence context, not stable subject identity. Record no credentials, tokens, or environment secrets.

Each package manager receives one isolated temporary root containing its consumer, cache/store, and package-manager temp paths. Every such path must resolve beneath that root. Remove the root in `finally` immediately after installed-behavior checks, then prove the root absent. Capture actual cleanup outcome in memory first; serialize successful external-install evidence only after both outcomes are final. Cleanup failure stops I3 and cannot be represented as successful completion.

Required behavior proof must use installed package entry points. Source-tree imports may support test orchestration only where existing contract explicitly requires them; they cannot substitute for installed package behavior.

## 10. Integration Test Design

Planned test:

```text
packages/cli/test/commands/research-v131-integration-i3.test.ts
```

Project ownership: `normal` only.

Design rules:

- use committed/current I3 records produced by audit flow;
- assert schema, anchors, tarball identity, offline install, and installed behavior;
- validate npm and pnpm independently;
- reject source-tree substitution;
- reject missing cleanup evidence;
- reject ledger/reference mismatch;
- remain independent from procedure-207 and methodology-116 production lanes;
- add no fifth Vitest project.

## 11. Dynamic Test-Inventory Contract

Only `.trellis/spec/cli/unit-test/conventions.md` changes during I3.

Normative rule:

1. discover complete CLI test set from current repository/config;
2. list each configured project;
3. resolve owned files per project;
4. require pairwise disjoint sets;
5. require union equals complete discovery;
6. report counts as observation, not permanent contract.

Expected repair state before I3 test:

```text
procedure207Packages = 1
methodology116Production = 1
normal = 82
distMutating = 2
union = 86
```

Expected I3 state after new test:

```text
procedure207Packages = 1
methodology116Production = 1
normal = 83
distMutating = 2
union = 87
```

If actual dynamic result differs, do not rewrite expected evidence to fit. Stop and investigate.

## 12. Protected-Path Audit

`protected-path-audit.json` must authenticate:

- `AGENTS.md` SHA-256 `788d2a2da0e913874acee2c3cf2f34575b50191b18e47f21478645ea5be4be48`;
- `CLAUDE.md` SHA-256 `319361ea166bde3be56a6c6dc5a161a5a6f73a214a2aea1d8efd1436b1853cf3`;
- `docs-site` gitlink `be7684f2086abb9b8e24d4d35733a7dda3123a0f`;
- `marketplace` gitlink `d7a18bb5411c700237d21483d6889ac296ef0301`;
- no protected path staged in I3;
- no submodule worktree mutation used as evidence authority.

Protected dirty files remain user-owned unstaged bytes. Audit reads them for identity only.

## 13. Execution Ledger Contract

Ledger links:

- G-I3 commit/tree;
- repair predecessor;
- exact-nine candidate path list;
- four script-owned record identities;
- build/pack/install/test commands and exit states;
- dynamic project partition observation;
- historical verify-only results;
- protected-path audit result;
- GitNexus change-detection summary;
- final pre-commit state.

Ledger cannot know final I3 commit/tree because it is part of I3. S3 supplies final committed subject identity later. This avoids self-reference.

## 14. S3 Freeze Contract

Planned path:

```text
.trellis/tasks/08-17-govern-v131-i3-s3-refreeze/research/exact-subject-freeze.json
```

S3 source of truth:

```bash
git show <I3>:<path>
git ls-tree <I3> -- <path>
git rev-parse <I3>^{tree}
git diff-tree --no-commit-id --name-status -r -z <I3>
```

Freeze structure:

```ts
type ExactSubjectFreeze = {
  schemaVersion: 1;
  subject: {
    commit: string;
    parent: string;
    tree: string;
    subjectLine: string;
    inventory: Array<{
      path: string;
      status: string;
      mode: string;
      blob: string;
      byteLength: number;
      sha256: string;
    }>;
  };
  anchors: {
    r3: ImmutableCommitAnchor;
    stabilization: ImmutableCommitAnchor;
    repair: ImmutableCommitAnchor;
    governance: ImmutableCommitAnchor;
  };
  evidence: Array<{
    path: string;
    blob: string;
    byteLength: number;
    sha256: string;
  }>;
  authority: Record<string, false>;
};
```

S3 validations:

- inventory exactly nine paths;
- every path identity matches committed I3;
- no worktree-only path or value;
- no placeholder (`TBD`, `TODO`, `UNKNOWN`, empty required value);
- no unresolved recursive reference;
- no field claiming freeze file's own hash/blob;
- canonical JSON stable across two independent assemblies;
- only freeze file staged/committed.

## 15. Commit Isolation

Each phase uses literal path allowlists:

```text
G-I3: 6 paths
I3:   9 paths
S3:   1 path
close:1 path
```

Required index checks before each commit:

1. `git diff --cached --name-only -z` equals exact allowlist;
2. `git diff --cached --check` passes;
3. unstaged protected hashes exact;
4. gitlinks exact;
5. unrelated worktree bytes unchanged;
6. GitNexus staged and compare detection report expected scope;
7. normal hook remains enabled.

No `git add .`, `git add -A`, commit-all, bypass, amend, reset, rebase, squash, clean, or stash.

## 16. Failure and Recovery

### Before commit launch

Any mismatch -> stop. Fix only if existing authority clearly covers correction and no extra path/behavior is needed. Otherwise request fresh authority.

### During commit hook

One launch per approved phase. Failure or interruption:

1. preserve full hook output and exit state;
2. verify no commit was created;
3. restore phase task lifecycle to pre-launch state if hook preparation changed it;
4. unstage only phase-owned paths as required;
5. preserve worktree bytes;
6. reauthenticate unrelated staged/protected state;
7. stop.

No automatic retry.

### After commit success

Authenticate parent, tree, subject, exact inventory, path modes/blobs, task state, protected state, and absence/presence boundary for next phase. Only then proceed.

## 17. Superseded History

Two prior governance states remain evidence, not authority:

1. pre-stabilization plan: predecessor `c7d3423b...`, I3 inventory eight paths;
2. pre-repair staged draft: predecessor `753a5d9a...`, R3 drift one package path.

`task.json` retains both supersession records plus pre-repair staged blob map. Current docs and manifests must not present those values as executable expectations.

## 18. Authority Matrix

| Action | Authorized |
|---|---:|
| reconcile/commit G-I3 | yes |
| create/commit exact-nine I3 | yes |
| create/commit exact-one S3 | yes |
| exact-one task closure | yes |
| M0-A4 preparation | no |
| provider/assurance execution | no |
| Attempt 4 | no |
| T6 closure/operator decision | no |
| archive/journal | no |
| remote/network/evidence transmission | no |
| push/publication/release/activation | no |
| history rewrite | no |

## 19. Success State

Final local history contains four commits after repair:

1. exact-six reconciled G-I3;
2. exact-nine I3;
3. exact-one S3;
4. exact-one G-I3 closure.

Task state is completed; I3 evidence prepared; S3 authenticated. No later authority exercised. Repository stops before M0-A4.
