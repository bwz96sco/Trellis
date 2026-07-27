# Integration Test Patterns

## 1. Scope / Trigger

Use real temporary filesystems for command orchestration, parser boundaries, generated payloads, update/uninstall safety, and packed-package inventory.

Function-level integration remains appropriate for command internals. When parsing, aliases, or package contents are the feature, tests must execute the built parser/bin or packed artifact rather than calling an action function directly.

### Frozen successor scope (not implemented in C01)

C02-C10 additionally trigger this spec for mixed-ledger replay, approval command subprocesses, zero-write digest/scope drift, generic worker parity, migration rehearsal, and packed removal of active Research Skills.

## 2. Signatures

Function-level entry points:

```ts
await init(options);
await update(options);
await uninstall(options);
```

Built parser/bin entry points:

```text
node packages/cli/dist/cli/index.js <argv>
node packages/cli/bin/trellis.js <argv>
```

Both published aliases must resolve through the same bin:

```text
trellis
tl
```

Exact command sets under test:

```text
root: init update upgrade uninstall research
research: init status validate rebuild repo quest campaign run evidence claim dispatch
dispatch: context prepare record-result apply reject
```

### Frozen successor signatures (not implemented in C01)

Built-parser coverage adds Dispatch `plan-activation`, `authorize`, `approve`, and `revoke`; Context changes from request-file/Skill discovery to Dispatch-ID/approval gating. Packed fixtures add Procedures and retirement evidence and forbid active Research Skill paths after C09.

## 3. Contracts

### Function-level integration

Direct imports are preferred for init/update/uninstall domain behavior because they provide fast, deterministic control over a real temporary filesystem. Mock only terminal prompts, banners, version checks, and process boundaries that cannot run deterministically.

Do not mock `fs` or internal payload collectors when filesystem output is the behavior.

### Parser/bin integration

Use a built parser or subprocess when testing:

- exact registered command sets;
- removed command rejection;
- removed init-option rejection;
- Commander exit code/stderr behavior;
- proof that no action callback ran;
- `trellis`/`tl` parity.

Removed commands/options must fail during Commander parsing:

```text
unknown command/option
  -> Commander error
  -> no command action callback
  -> no filesystem write
```

Required removed inputs include:

```text
trellis channel
trellis mem
trellis workflow
trellis research task
trellis research task link
trellis research task unlink
--user --monorepo --no-monorepo --template --registry --overwrite --append
```

### Snapshot zero-write proof

Before an expected parse failure, snapshot the complete temporary repository as relative paths plus raw bytes. After the subprocess exits, compare the complete snapshot. Assert no added, removed, or changed file, including `.trellis`, config, logs, and runtime files.

A spy on `init()` alone is insufficient when the built bin could perform work before action dispatch.

### Research payload integration

For Claude-only, Codex-only, and dual-host init/update:

- compare sorted paths to exact allowlists;
- compare configured and collected maps in both directions;
- assert byte identity for every path;
- prove one bounded worker and exactly nine stage skills per host;
- prove only the approved hook/config matrix;
- cover optional Claude statusline separately;
- assert generic paths are absent.

### Preservation integration

Use complete path-and-byte snapshots for `.trellis/research/**` across init, host addition, force/full init, update, dry-run, uninstall, and failure paths. Seed mixed valid and malformed config files and unknown descendants; assert preservation exactly.

### Production core-import boundary

Scan static imports, `export ... from`, and literal dynamic imports in production modules under `packages/cli/src/**/*.{ts,js}` and a clean `packages/cli/dist/**/*.{js,mjs,cjs}` build. Exclude tests, fixtures, templates, docs, and package metadata. Every specifier beginning with `@mindfoldhq/trellis-core` must equal exactly `@mindfoldhq/trellis-core/research`; diagnostics name the relative file and offending specifier.

### Packed-artifact integration

Keep core and CLI package audits independent.

The core proof clean-builds and packs a real tarball, validates every tar path before extraction, derives required runtime/declaration targets from packed exports, rejects leakage, installs the tarball locally without network access, imports root and all five subpaths, compiles strict NodeNext declarations, proves root non-leakage and empty Testing, and blocks undeclared deep imports.

The CLI proof clean-builds and packs a separate real tarball, asserts required Research/compatibility inventory, rejects forbidden generic entries/prefixes, and checks the exact packed core dependency. Collector output and dirty `dist` are not substitutes.

### Frozen successor contracts (not implemented in C01)

- Preserve fixed schema-v1 trees byte-for-byte and add separate mixed-v2 ledgers; never refresh v1 fixtures into v2.
- Use real files/subprocesses for TTY rejection, forbidden `--yes`, exact challenge, activation/approval sidecars, Context zero-write, and record-result three-event atomicity.
- Compare provider-neutral normalized worker JSON across hosts and prove no Skill/Procedure filesystem discovery.
- Rehearse 0.6.7-style installed Skill cleanup with pristine, modified, malformed, unknown, external, protected, and concurrent cases.
- Audit real clean tarballs before/after Skill removal; dirty `dist` or collector output is not evidence.

## 4. Validation & Error Matrix

| Scenario | Required assertion |
|---|---|
| Supported root/Research/Dispatch command | Parses through the one expected tree. |
| Removed root or Research command | Non-zero Commander failure; no action/write. |
| Removed init option | Unknown-option failure before banner/probe/prompt/action/write. |
| Same removed input through `trellis` and `tl` | Equivalent exit class, diagnostics, and zero-write snapshot. |
| Fresh Claude/Codex generation | Exact path allowlist and bytes. |
| Configure/collect mismatch | Test failure naming path/byte divergence. |
| Existing Research state | Complete path/byte identity after command. |
| Malformed structured user file | Byte-identical preservation. |
| Historical cleanup exact key | Classify only through exact evidence. |
| Unknown descendant | Preserve and do not claim ownership. |
| Source or clean `dist` imports bare/generic/deep/suffixed core path | Import-boundary test reports file and specifier. |
| Exact `/research` production import | Accepted; no compatibility API enters the product surface. |
| Packed core export/target/README/tar safety drifts | Core audit fails before extraction or publication. |
| Packed core public import/type fixture fails or deep import resolves | Packed consumer proof fails. |
| Dirty CLI `dist` contains stale generic file | Clean build removes it; packed tar remains clean. |
| Clean CLI build still emits forbidden path | Packed-CLI audit failure. |

Successor matrix additions require full-tree zero-write assertions for every approval/Context failure, exact mixed-event order for successful recording, byte preservation for non-pristine retirement cases, and real packed positive/negative Procedure/Skill inventory.

## 5. Good / Base / Bad Cases

- **Good**: a subprocess passes `--registry` to both aliases, receives Commander unknown-option errors, and the full temporary tree remains byte-identical.
- **Base**: direct `init({ yes: true, codex: true })` writes the exact Research base plus Codex payload; a second update is a true no-op.
- **Bad**: calling `init({ registry: ... } as unknown as InitOptions)` to simulate parser behavior, checking only that `.trellis` exists, or auditing package contents from the source collector.

### Frozen successor cases

- **Good**: subprocess and filesystem fixtures prove explicit approval, zero-write Context, atomic consumption, host parity, safe retirement, and clean packed inventory.
- **Base**: unchanged v1 fixtures and current behavior remain separate characterization oracles until each owning child deliberately updates successor expectations.
- **Bad**: mocks bypass TTY/parser/filesystem/package behavior or existing golden bytes are regenerated to hide drift.

## 6. Tests Required

- Exact root, Research, and Dispatch command-set snapshots.
- Every removed command and init option through the built parser.
- Both `trellis` and `tl` aliases.
- Full byte snapshots proving zero action/write on parse errors.
- Claude-only, Codex-only, dual-host, host-addition, force, skip-existing, and statusline flows.
- Configure/collect path and byte parity.
- Historical native digest, 137-path current-host, and 1,009-path retired-host compatibility boundaries.
- Update/uninstall Research preservation and mixed-file preservation.
- Production source plus clean-`dist` core import-boundary proof with adversarial specifiers.
- Core-owned exact export/root/subpath/Testing/deep-import compatibility coverage.
- Real clean-built packed-core runtime/declaration consumer proof.
- Clean CLI `dist` plus real packed-CLI positive/negative inventory.
- Exact packed CLI dependency on the matching core version.

Frozen successor suites additionally require mixed-ledger golden fixtures, real TTY/parser approval boundaries, one captured clock for expiry tests, full-tree Context snapshots, shared host inputs, released-byte retirement fixtures, and real clean tarball audits.

## 7. Wrong vs Correct

```ts
// Wrong: bypass Commander while claiming to test an unknown option.
await init({ registry: "gh:org/repo" } as unknown as InitOptions);

// Correct: execute the built parser with the literal argv.
const result = spawnSync(process.execPath, [builtCli, "init", "--registry", "gh:org/repo"], {
  cwd: tmpDir,
  encoding: "utf8",
});
expect(result.status).not.toBe(0);
expect(snapshotTree(tmpDir)).toEqual(before);
```

```text
Wrong: function-level tests are always enough because they reach filesystem logic.
Correct: use function-level tests for domain orchestration and built-bin tests for Commander registration, aliases, and parse-time rejection.
```

```text
Wrong: list `dist` after an incremental build.
Correct: run the clean build, pack a tarball, normalize entries, and audit required/forbidden inventory.
```

### Frozen successor: approval and migration proof

```text
Wrong: unit-mock TTY approval, assert Context wrote nothing by checking one path, or derive retirement hashes from current source.
Correct: execute parser/subprocess boundaries, snapshot the full tree, and use immutable released-byte fixtures with provenance.
```

## Scenario: Research Procedure dispatch cutover

### 1. Scope / Trigger

Use this scenario when proving C06+C07 public lifecycle plus Task #63 root-side remediation: staged Context authority, one-state/one-observation behavior, exact public failures, snapshot-only dry-run, lockful commit, replay-before-clock/input, hardened sidecar recovery, unchanged host bytes, installed assets, and packed active content. Exercise real filesystem/process/package boundaries where behavior depends on them; deterministic worker output is an oracle, not cloud-model simulation.

### 2. Signatures

Required test helpers:

```ts
readInstalledResearchHostAssets(root, host);
runClaudeResearchHookProcess(options);
assertCodexResearchWorkerContract(toml);
makeDeterministicResearchWorkerOutput(context, outcome);
runApprovalConsumptionLifecycle(options);
```

Built and packed entry points:

```text
node packages/cli/bin/trellis.js research dispatch ...
node packages/cli/scripts/release-preflight.js verify-packed-cli
```

Exact Context JSON failure oracle:

```json
{"schemaVersion":1,"command":"research dispatch context","valid":false,"error":{"code":"<code>","message":"<message>"},"safeAction":"report-to-root-no-write"}
```

### 3. Contracts

- Built `trellis` and `tl` tests execute same compiled parser, not action functions, for exact options and legacy rejection.
- Negative parser and Context cases compare complete path-and-byte snapshots and prove no callback-visible mutation.
- Context precedence fixtures combine request, Procedure, policy, scope, artifact, Approval, materialization, and output-ID faults. Tests assert earliest staged code, deferred artifact access, one `ResearchState`, one cache-free target Repository observation, no `git status`, and no alternate Repository access.
- Public API conversion tests prove only `ResearchActivationError` becomes `ResearchDispatchContextError`; unrelated errors preserve identity. CLI failure tests assert exact envelope/key set and absence of ledger head, warnings, Context, authority, Approval, Procedure, Repository, and output IDs.
- Dry-run tests exercise real generic and Dispatch lifecycle owners through `validateResearchBatchReadOnly`, compare full trees, and prove no lock/runtime/projection/cache/materialization/head reservation. Separate non-dry-run tests prove lockful `commitResearchBatch` remains authority.
- Claude adapter proof executes actual generated Python hook with fake `trellis` on `PATH`, captures exact Context argv/call count, validates byte-identical normalized success injection, and rejects failure without partial data or recomputation.
- Codex natural-language execution is checked statically for exact control-root, first-process, supplied-ID, sandbox, and prohibition clauses; this does not claim live model compliance.
- Deterministic worker output uses only Context-supplied IDs and strict schema-v1 Result/pending-Proposal shapes. Host adapter/worker/template bytes and packed success contract remain unchanged by Task #63.
- Public recording invokes real Approval-bound command/API. Exact same-key replay is tested before current clock/input by using invalid clock plus missing path/throwing stdin. Replay repairs Result/Proposal/Approval sidecars from canonical state and appends nothing.
- New execution verifies exact `[1, 1, 2]` event schemas, kinds, relations, timestamps, lockful atomic append, materializations, and duplicate rejection. Sidecar tests exercise hardened containment, directory/target/staging identity, fsync/publication result, committed failure metadata, sequential partial writes, and same-key repair.
- Packed proof creates/uses real `.tgz`, extracts active bytes with `tar -xOf`, and mutation-tests each forbidden token while retaining dormant Skill entries through C07.

### 4. Validation & Error Matrix

| Test shortcut or condition | Required assertion |
|---|---|
| Direct function call used to claim unknown-option behavior | Invalid test; execute built parser. |
| One-path check used to claim Context/dry-run zero-write | Invalid test; compare complete tree including lock/runtime/projection/cache paths. |
| Independent state/Repository mocks hide duplicate reads | Invalid test; count one canonical state and one target observation across complete Context. |
| Artifact mismatch asserted without earlier combined faults | Incomplete precedence proof; combine faults and assert deferred artifact access. |
| Failure object checked only with `toMatchObject` | Incomplete public contract; assert exact object/key set and forbidden-field absence. |
| Mocked hook function used to claim process argv/count | Invalid test; execute generated Python. |
| Codex prose treated as executable model proof | State limitation; validate static contract only. |
| Worker oracle invents IDs or changes normalized success bytes | Test failure; derive exact supplied output contract and compare bytes. |
| Dry-run uses commit mock/lock | Contract failure; require read-only snapshot validator and full-tree zero-write. |
| Same-key replay validates clock, opens input, reruns worker, or appends | Lifecycle failure; replay/repair must precede those actions. |
| Sidecar success asserted without race/committed-failure fixtures | Incomplete hardened publication proof. |
| Packed audit reads source or unpacked dist only | Invalid release evidence; inspect actual tarball. |

### 5. Good / Base / Bad Cases

- **Good**: one-state/one-observation Context returns unchanged normalized success to real Claude/static Codex adapters; lockful recording creates exact events; expired same-key replay repairs hardened sidecars without input/append.
- **Base**: snapshot-only dry-run validates prospective batch with complete tree unchanged; blocked oracle output keeps supplied IDs and empty Proposal operations.
- **Bad**: mock Commander, check one path, hide duplicate observations, test artifact fault alone, partial-match failure JSON, acquire dry-run lock, validate replay clock first, rerun worker for recovery, or infer packed bytes from collector output.

### 6. Tests Required

- Built alias Context for both hosts, path/stdin recording, legacy zero-write parser rejection, and exact JSON failure envelope.
- Staged combined-fault precedence and deferred artifact-open tests; one-state/one-observation/cache-free/no-`git status`/no-alternate-Repository assertions.
- Full-tree snapshot-only dry-run success/failure for generic mutations, activation/approval/recording owners, plus separate lockful commit coverage.
- Full Approval/Context/recording lifecycle for Claude/Codex fixtures; replay-before-clock/path/stdin with no worker/input rerun.
- Actual Claude hook subprocess with one-call Context capture, byte-identical normalized success, exact typed denial, oversized/malformed denial, and no partial/recomputed data.
- Static Codex TOML validator, installed-byte reader, deterministic output oracle, exact event order, and unchanged adapter/worker/template byte fixtures.
- Hardened Result/Proposal/Approval publication race matrix, exact committed recovery fields, sequential partial materialization, and same-key repair without append.
- Unit mutation fixtures and real tarball mutations for request-file, `--skill-name`, `--file`, selected-Skill, Claude Skill tool, Codex inventory, random IDs, second Context pass, and stale workflow content.
- Executable spec test extracts exactly one ordered seven-section scenario from each approved file, locks all Task #63 clauses, and treats core spec as expanded guard-only.

### 7. Wrong vs Correct

```text
Wrong: prove one happy Context, one artifact failure, and one dry-run return value.
Correct: combine staged faults, count state/observation access, assert exact failure bytes, compare full dry-run tree.

Wrong: recreate input or rerun worker after expiry to repair missing sidecars.
Correct: exact same-key replay wins before clock/input and repairs all sidecars from canonical authority.
```
