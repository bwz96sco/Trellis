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
