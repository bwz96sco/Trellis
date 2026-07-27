# Filesystem Safety Contract

## 1. Scope / Trigger

Apply this contract to every CLI/core path that writes, deletes, moves, scrubs, or overwrites user-repository files, including init, update, uninstall, Research runtime state, Dispatch context, migration ownership, and compatibility cleanup.

Removed commands and options add a parser boundary: Commander rejection must occur before any action callback or filesystem write.

### Procedure/policy and frozen successor scope

C04 implements strict Procedure/policy resolution under this spec. C05-C09 additionally trigger it for activation/approval materializations, read-only approval gates, embedded worker paths, and exact historical Research Skill retirement.

## 2. Signatures

Atomic TypeScript write:

```ts
writeFileAtomic(filePath: string, data: string | Uint8Array): void;
```

Canonical current payload:

```ts
collectResearchPlatformPayload(platformId, cwd?, options?): Map<string, string>;
writeResearchPlatformPayload(platformId, cwd, options?): Promise<void>;
```

Safety predicates include:

```text
isSafeManifestPath
isProtectedResearchPath
containsProtectedResearchPath
dirHasManifestEntries
```

Parse-failure invariant:

```text
unknown command/option
  -> Commander error
  -> no action callback
  -> no filesystem write
```

### Procedure/policy signatures

```ts
resolveResearchProcedure(input: {
  root: string;
  capabilityId: string;
}): Promise<ParsedResearchProcedure>;

readResearchProjectPolicy(input: {
  root: string;
}): Promise<ParsedResearchProjectPolicy>;

ensureResearchProjectPolicyForInit(input: {
  root: string;
  dryRun: boolean;
}): Promise<{
  outcome: "existing" | "created" | "would-create";
  policy: ParsedResearchProjectPolicy;
}>;
```

C04 paths include `.trellis/research/policy.json`, project Procedure pairs under `.trellis/research/procedures/<id>/<version>/`, and package-internal bundled Procedures. Later successor paths add strict activation/approval sidecars and exact historical Skill files. All use validate-before-resolution and operation-specific read/write authority.

## 3. Contracts

### Atomic durable writes

Durable state such as hashes, workflow selection, Research runtime state, tracked Dispatch files, and core compatibility stores uses same-directory temporary write plus atomic rename/replace. Failure removes the temporary file best-effort and preserves the original target.

### Validate before resolution

Any user/agent-controlled path or identifier is validated before `path.join`, canonicalization, read, move, or delete. Dispatch request paths require exact portable grammar, matching prefixed ID, canonical containment, regular-file checks, and symlink-escape rejection. Allowed write paths canonicalize the nearest existing ancestor.

Channel/Task name and storage guards remain core SDK compatibility behavior; they do not imply active CLI commands.

### Exact ownership before destructive operations

- Manifest keys are exact file keys, not prefixes.
- Opaque deletion requires current bytes to match recorded/released hash evidence as applicable.
- Mixed files use path-specific scrubbers and are deleted only when a successful scrub leaves no user content.
- `rename-dir` requires manifest-owned descendants.
- Retired roots allow backup preservation and confirmed-empty `rmdir`, never recursive ownership inference.
- Confirmation-time execution re-reads planned bytes; concurrent changes survive.

### Protected and preserved data

`.trellis/research/**` is excluded before traversal or path resolution and remains byte-identical across init, update, uninstall, backup, migration, and cleanup.

Normal uninstall also preserves modified/malformed files, unknown descendants, Tasks, workspace/spec/developer state, user Channel/Mem data, custom workflow bytes, mixed user configuration, and non-empty managed roots.

### Zero-write observation and parsing

`trellis research dispatch context` is strictly read-only: no lock, runtime directory, observation cache, session file, manifest, ledger, projection, tracked Dispatch, target Repository, or Git mutation.

Removed root commands, the removed Research Task subtree, and removed init options are unregistered. Tests must execute the built parser and compare complete filesystem snapshots.

### Historical cleanup boundary

The frozen 137-path current-host and 1,009-path retired-host inventories are exact compatibility evidence. Unknown siblings/descendants remain unowned. Safe deletion additionally requires released hash evidence; inventory membership alone is insufficient.

### Procedure and project-policy safety

- Resolve the capability before constructing filesystem paths; ID and version path segments come only from the immutable registry.
- Existing exact project Procedure candidates are authoritative. Genuine absence may fall back to bundled, but partial, malformed, symlinked, non-directory, unreadable, escaping, identity-mismatched, or concurrently changed presence fails as `INVALID_PROJECT_PROCEDURE` with no fallback.
- Open only registry-bound `procedure.json` and `PROCEDURE.md`. Ignore unnamed regular/non-regular siblings without directory enumeration.
- Validate each path component with `lstat`, reject symlinks/non-directories, and require contained canonical realpaths. Capture directory type/mode plus device/inode identity and revalidate the complete chain after both named files are read; do not compare directory size/mtime/ctime because ignored sibling activity must not affect resolution. Capture each named regular file's type/mode, device/inode, size, mtime, ctime, and realpath, then revalidate both files after the complete pair read.
- Procedure instruction bytes are never newline-normalized before digesting or embedding. Bundled defects fail as `INVALID_BUNDLED_PROCEDURE`.
- Ordinary policy read requires an existing contained non-symlink regular file and the same pre/post identity checks. Missing/malformed policy fails closed.
- Only non-dry-run explicit `trellis research init` may create absent policy. It stages exact conservative bytes through unchanged `writeFileAtomic` at a unique same-directory sibling, then publishes with exclusive no-replace `linkSync` semantics.
- Publication captures the complete original parent chain before staging, then rechecks every component's identity, type, realpath, and containment before and after exclusive publication. It verifies final and staged device/inode identity and removes the staging link best-effort only while the pathname still identifies the expected staged node. `EEXIST` preserves and strict-reads the winner; invalid winners fail without replacement.
- Existing valid policy bytes are preserved exactly. Root init, force/host addition, update, and uninstall never create or overwrite policy or project Procedure overrides.

### Frozen later-successor contracts

- Context recomputes all digests/scope without writes and never repairs stale sidecars.
- Historical Skill cleanup uses exact released-hash evidence and confirmation-time reread, preserving every non-exact case.

## 4. Validation & Error Matrix

| Condition | Required behavior |
|---|---|
| Atomic replacement fails | Original target survives; temp is removed best-effort; error propagates. |
| Manifest key is absolute/traversal/backslash/NUL/non-normalized | Reject before filesystem access. |
| Path reaches `.trellis/research/**` | Preserve before join/read/traversal; no force override. |
| Unknown descendant under managed/retired root | Unowned; preserve; do not read during ownership pruning. |
| Opaque hash differs | Preserve and release ownership. |
| Structured file is malformed | Preserve exact bytes; release ownership. |
| Planned bytes change before execution | Preserve current bytes; do not apply stale plan. |
| Dispatch context validation fails | Bounded no-write error; no partial context. |
| Removed command/option is entered | Commander error; no callback/write. |
| Exact project Procedure candidate is absent | Resolve package-internal bundled pair. |
| Exact project candidate is present but partial, malformed, symlinked, escaping, unreadable, or an authoritative path/file changes during read | Fail `INVALID_PROJECT_PROCEDURE`; never fall back. |
| An unnamed sibling is created, removed, or changes while the authoritative pair is read | Ignore it; preserve selected source and digest when the directory chain and named files remain identical. |
| Bundled pair is missing or invalid | Fail `INVALID_BUNDLED_PROCEDURE`. |
| Ordinary policy is missing or invalid | Fail closed; never substitute an in-memory default. |
| Research init sees absent policy in dry-run | Return `would-create`; create no directory or file. |
| Two policy creators race | Preserve exclusive winner; valid winner returns existing, invalid winner fails without overwrite. |
| Cleanup root is non-empty | Keep it; never recursive-delete. |

Later-successor matrix additions: digest/scope/materialization drift, non-TTY approval, or unsafe retirement target fails closed with no partial write. Post-commit sidecar failure reports committed recovery and never appends a replacement event batch.

## 5. Good / Base / Bad Cases

- **Good**: uninstall scrubs one exact Trellis hook from mixed Claude settings, preserves user hooks, and atomically writes the result.
- **Base**: an exact historical file is modified; cleanup skips it and leaves its parent root intact.
- **Bad**: hashing every file below `.codex`, deleting an entire mixed `AGENTS.md`, using lexical containment through a symlink, or accepting `--registry` and rejecting it only after init begins.

### Procedure/policy cases

- **Good**: valid contained regular Procedure/policy files are read exactly; explicit Research init creates absent conservative policy through exclusive publication.
- **Base**: no override directory uses bundled Procedure; an existing valid policy survives matching init, root init, update, and uninstall byte-for-byte.
- **Bad**: fallback around a partial override, normalize instruction bytes, replace a concurrent policy winner, or use replacement rename on final `policy.json`.

### Frozen later-successor cases

- **Good**: Context recomputes matching digest bindings and writes nothing.
- **Bad**: repair Context state or recursively remove historical roots.

## 6. Tests Required

- Atomic write success/failure and temporary-file cleanup.
- Unsafe manifest/path rejection before filesystem API calls.
- Commander rejection for every removed command/option through both aliases with byte-identical full-tree snapshots.
- Strict zero-write Dispatch context success and every failure phase.
- Research full-tree preservation across all mutating commands.
- Opaque hash gates, structured mixed/malformed preservation, and confirmation-time revalidation.
- Exact 137/1,009 inventory boundaries and unknown-descendant preservation.
- Confirmed-empty-only cleanup for active, retired, and alias roots.
- Current-template precedence over historical safe deletion.
- `research-procedure-resolution.integration.test.ts` covers all 14 bundled pairs, project-first precedence, concurrent unnamed regular/non-regular sibling creation and removal, full-chain and both-named-file post-pair revalidation, partial/malformed/symlink failures, clean-built resolver execution, and capability-before-filesystem rejection.
- `research-policy-init.integration.test.ts` covers exact conservative creation, repeated exact-byte preservation, dry-run zero-write, malformed/symlink winner preservation, complete parent-chain replacement, fresh/matching/conflicting init ordering, and staging cleanup that preserves an unrelated replacement inode.
- Existing init/update/uninstall integration suites prove root lifecycle commands do not create policy and retain protected Research behavior.

Later-successor tests additionally require atomic activation/approval sidecars, zero-write digest/scope mismatch, concurrent retirement preservation, and full `.trellis/research/**` protection.

## 7. Wrong vs Correct

```ts
// Wrong: truncate durable state in place.
fs.writeFileSync(hashPath, serialized);

// Correct: replace atomically from the same directory.
writeFileAtomic(hashPath, serialized);
```

```ts
// Wrong: root membership becomes ownership.
if (key.startsWith(".windsurf/")) fs.rmSync(path.join(cwd, key));

// Correct: require a safe exact key and the operation-specific evidence.
if (isSafeManifestPath(key) && exactKnownKeys.has(key)) classifyOwnedKey(key);
```

```text
Wrong: register a retired option and throw after banner/probes/prompts.
Correct: omit it from Commander so parsing fails before the action and before any write.
```

### Procedure override and policy publication safety

```text
Wrong: normalize Procedure bytes, fall back around an invalid override, or replacement-rename final policy.json.
Correct: hash exact bytes, fail closed on present-invalid overrides, stage uniquely, and publish final policy with exclusive no-replace semantics.
```

### Frozen later successor: Context safety

```text
Wrong: repair approval state during Context.
Correct: keep Context strictly zero-write.
```

## Scenario: Research Procedure dispatch cutover

### 1. Scope / Trigger

This scenario covers filesystem/mutation safety for approval-gated Dispatch-ID Context, root-side Task #63 authority remediation, contained Result/Proposal input, snapshot-only dry-run, lockful canonical commit, and hardened Result/Proposal/Approval recovery. It applies before callback mutation, Context response, worker target access, or canonical recording append.

### 2. Signatures

```text
trellis research dispatch context <dsp-id> --host <claude|codex> [--root <root>] [--json]
trellis research dispatch record-result <dsp-id> --approval <apr-id> --input <path|-> [--root <root>] [--json]
```

```ts
type ResearchDispatchResultInput =
  | { kind: "path"; cwd: string; path: string }
  | { kind: "stdin"; cwd: string; read: () => string };
```

### 3. Contracts

- Context is strictly zero-write on success and every failure: no lock, runtime directory, sidecar repair, ledger/projection/materialization update, observation cache read/write, target write, or Git mutation.
- Context captures one canonical state and exactly one cache-free target Repository observation. It performs no `git status`; one path/Git-root/HEAD/remote snapshot is reused for scope, allowed paths, and deferred artifact verification. Foreign-Repository artifacts fail before alternate access.
- Context preserves staged validation order: request/Procedure/policy bindings -> one target observation -> scope -> deferred artifact revision/SHA-256 -> Approval/materialization/output-ID gates. Earlier mismatch wins; later artifact bytes are not opened early.
- Commander captures one absolute cwd before asynchronous work. Relative root/input resolution uses only that value.
- Exact same-key replay is classified from canonical ledger before current clock validation, Approval terminal/current checks, path opening, or stdin invocation. Replay reconstructs outputs from canonical events/reduced state and may repair sidecars when current clock is invalid and original input is unavailable.
- New path input must be a contained regular file below selected control root. Reject root equality, traversal, absolute escape, symlink escape, non-regular file, and identity drift. New stdin is read lazily only after replay miss and prerequisite validation.
- Dry-run uses `validateResearchBatchReadOnly` against one caller snapshot. It acquires no Research lock and creates/changes no runtime, projection, cache, head reservation, ledger, or materialization. Non-dry-run uses lockful `commitResearchBatch`, whose under-lock state remains authoritative.
- Recording validates complete Result/Proposal pair before commit and appends one isolated three-event canonical batch. Pre-append failure leaves canonical bytes unchanged.
- Result, Proposal, and consumed-Approval sidecars share hardened publication: containment, non-symlink directory chain, target/staging identity, fsync, atomic publication, and published-byte validation.
- Sidecar publication is sequential post-commit, not a filesystem transaction. Failure reports `committed: true`, committed head, exact target, and original-key recovery. Same-key retry repairs all three sidecars from canonical authority without worker/input rerun or replacement append; new-key retry is forbidden.

### 4. Validation & Error Matrix

| Condition | Required result |
|---|---|
| Legacy parser form or malformed ID | Reject before action callback; full tree unchanged. |
| Context request/binding/Procedure/policy/scope/artifact/Approval validation fails | First staged bounded failure; exact zero-write tree. |
| Observation cache is stale/malformed or artifact names foreign Repository | Cache remains unread/unwritten; no alternate Repository access. |
| Dry-run validation succeeds/fails | No lock/runtime/projection/cache/materialization creation; full tree unchanged. |
| Same-key replay has invalid current clock or unavailable/throwing input | Replay succeeds first; input callback/path unopened; sidecars repaired; no append. |
| New execution has invalid clock or ineligible Approval | Reject before input access or ledger append. |
| Input path is outside root, symlinked, missing, directory, or changes identity | Reject before ledger append. |
| Result/Proposal/Approval relation or ID mismatches | Reject all three events. |
| Sidecar parent, target, or staging identity changes | Never publish through unsafe identity; report committed recovery after append. |
| Append succeeds but any materialization fails | Preserve committed head; report exact target and same-key recovery. |
| Worker requests undeclared write, network, nested agent, Git, sandbox expansion, or recovery | Skip/block; never widen authority. |

### 5. Good / Base / Bad Cases

- **Good**: zero-write Context reuses one state/Repository snapshot; root later reads one contained input and commits Result, Proposal, and consumption under lock.
- **Base**: same-key retry after expiry and sidecar loss reads canonical events first, never touches unavailable input, then hardened-publication repairs all three sidecars without append.
- **Bad**: consult observation cache, acquire dry-run lock, verify artifacts before binding/scope, validate clock before replay, treat three sidecar writes as transactional, rerun worker, or recover under new key.

### 6. Tests Required

- Complete path-and-byte snapshots for Context success and every staged failure, including stale cache and foreign-Repository cases.
- One-state/one-observation spies proving no cache access, no `git status`, one target snapshot, no alternate Repository access, and reuse through scope/artifact checks.
- Built-parser snapshots for request-path, `--skill-name`, and `--file` rejection through both aliases.
- Snapshot-only dry-run success/failure across generic and Dispatch lifecycle commands; assert no lock/runtime/projection/cache/head/materialization changes. Test lockful commit separately.
- Captured-cwd, containment, symlink, non-regular, identity-drift, malformed-input, relation/ID, and lazy path/stdin tests.
- Replay-before-clock/input with invalid clock, missing path, and throwing stdin; exact three-event atomicity; duplicate rejection.
- Hardened Result/Proposal/Approval publication tests for parent/target/staging races, published bytes, committed failure metadata, sequential partial materialization, and same-key repair.
- Host adapter tests proving unchanged bytes, no pre-Context target access, no recomputation, and no worker authority widening.

### 7. Wrong vs Correct

```text
Wrong: dry-run acquires commit lock, or replay validates current clock and opens original input first.
Correct: dry-run validates one read-only snapshot; canonical exact replay precedes clock and input.

Wrong: use plain writes for Result/Proposal, or call three sidecar writes one transaction.
Correct: use hardened publication per sidecar; ledger stays authority; same-key replay repairs sequential post-commit failures.
```
