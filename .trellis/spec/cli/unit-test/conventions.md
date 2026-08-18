# Test Conventions

> File naming, structure, and assertion patterns.

---

## 1. Scope / Trigger

Apply these conventions to all unit, characterization, golden, and compatibility tests. C02-C09 successor work must retain unchanged v1 fixtures while adding separate deterministic vectors for Procedures, policy, activation, approval, normalized workers, and Research Skill retirement.

## 2. Signatures

### Test Infrastructure

| Item | Value |
|------|-------|
| Framework | Vitest 4.x |
| Config | `vitest.config.ts` |
| Include | `test/**/*.test.ts` partitioned across four ordered projects |
| Exclude | `third/**`, `node_modules/**`, plus every dedicated path from `normal` |
| Projects | `procedure-207-packages`, `methodology-116-production`, `normal`, `dist-mutating` |
| Setup files | `test/setup.ts` in every project (strips host-shell session env vars — see "Test Isolation" below) |
| Global setup | `test/global-setup.ts` in `normal` only |
| Workers | `1 / 1 / 4 / 1` in project order |
| Group order | Positive and distinct: `1 / 2 / 3 / 4` |
| Default test timeout | `10_000` in every project; explicit suite/test budgets remain authoritative |
| Lint scope | `eslint src/ test/` |
| Module system | ESM (`"type": "module"` + `"module": "NodeNext"`) |
| Coverage provider | `@vitest/coverage-v8` |
| Coverage command | `pnpm test:coverage` |
| Coverage scope | `src/**/*.ts` (excludes `src/cli/index.ts`) |
| Coverage reports | `text` (terminal), `html` (`./coverage/index.html`), `json-summary` |

---

## 3. Contracts

### Test Isolation

### Strip host-shell session env vars at process start

Several Trellis modules (e.g. `OpenCodeContext.getContextKey`, `TrellisContext.getActiveTask`) consult `process.env.TRELLIS_CONTEXT_ID` and `process.env.OPENCODE_RUN_ID` as **highest-priority overrides** — production behavior, by design.

When tests run inside a Claude Code or OpenCode session, those env vars leak from the parent shell into the vitest process and **hijack the resolver**, ignoring the test's mocked `platformInput`. Symptom: tests expecting a derived `opencode_oc-a` contextKey receive `claude_<host-session-id>` instead, failing deterministically only on dev machines.

**Convention**: `test/setup.ts` is registered via `setupFiles` in `vitest.config.ts` and unconditionally `delete`s these env vars before any test loads:

```ts
// test/setup.ts
delete process.env.TRELLIS_CONTEXT_ID;
delete process.env.OPENCODE_RUN_ID;
```

**When to extend**: any new env var that production resolvers honor as a user override, AND that the dev's host shell may export, must be added to `test/setup.ts`. Do NOT fix this in production code by ignoring the env var — the override is a real feature for end users.

**When NOT to use**: tests that *intentionally* exercise the env-override path should set the env explicitly inside the test (`process.env.X = "..."` in a `beforeEach` and restore in `afterEach`).

### Ordered project ownership

`vitest.config.ts` partitions the complete discovered `test/**/*.test.ts` suite into four disjoint projects:

| Project | Exact ownership | `maxWorkers` | `groupOrder` | Setup |
|---|---|---:|---:|---|
| `procedure-207-packages` | `test/commands/research-procedure-207-packages.test.ts` | 1 | 1 | `setupFiles` |
| `methodology-116-production` | `test/commands/research-methodology-116-production.test.ts` | 1 | 2 | `setupFiles` |
| `normal` | Every discovered test not owned by a dedicated project | 4 | 3 | `setupFiles` + `globalSetup` |
| `dist-mutating` | `test/scripts/smoke-installed-cli.test.ts` and `test/commands/research-cs5-integration.test.ts` | 1 | 4 | `setupFiles` |

The partition is an executable contract:

- every dedicated path is excluded from `normal`;
- pairwise project intersections are empty;
- the project union equals an independent filesystem discovery with `Path("packages/cli/test").rglob("*.test.ts")`;
- all group orders are positive and distinct; do not use order zero or share an order across projects with different worker counts;
- the production-116 producer finishes before `normal`, whose coverage reconciliation test authenticates its retained outputs;
- the canonical workspace-`dist` owners run last;
- root coverage remains process-wide rather than duplicated inside projects;
- every project keeps `testTimeout: 10_000`; explicit suite/test and child-process budgets are not scheduling knobs.

Only `normal` owns `test/global-setup.ts`. The dedicated producer imports production source directly and does not consume `TRELLIS_TEST_BUILT_CLI_ROOT`; duplicating global setup would add an unnecessary CLI compile/copy workload.

A new lane requires retained complete-suite evidence of a distinct resource or shared-output owner. Do not respond to a new failure by raising timeouts, retrying, serializing `normal`, or adding a lane member automatically; stop and govern a separate evidence-backed correction.

---

### When to Write Tests

### Must write

| Change Type | Test Type | Example |
|-------------|-----------|---------|
| New pure/utility function | Unit test | Added `compareVersions()` → test boundary values |
| Strict Procedure/policy parser or authority merge | Table-driven unit + exact digest vectors | Cover grammar, canonical bytes, widening classification, freezing, and stable reason order |
| Procedure/policy filesystem resolution | Real-temp-tree integration test | Cover project-first fallback, symlink/type/identity failures, exact-byte preservation, and no-replace creation |
| Public package export/proof change | Core-owned compatibility + packed audit tests | Freeze export order/targets, imports, declarations, and deep-import blocking |
| CLI core dependency-boundary change | CLI-owned source + clean-build scanner test | Accept only exact `@mindfoldhq/trellis-core/research` |
| New platform | Unit (auto-covered by `registry-invariants.test.ts`) | Added opencode → invariants verify consistency |
| Bug fix | Regression test | Fixed Windows encoding → add to `regression.test.ts` |
| Changed init/update behavior | Integration test | Changed downgrade logic → add/update scenario in `update.integration.test.ts` |

### Don't need tests

| Change Type | Reason |
|-------------|--------|
| Template text / doc content changes | No logic change |
| New migration manifest JSON | `registry-invariants.test.ts` auto-validates format |
| CLI flag description text | Display-only |

### Must update existing tests

| Change Type | What to Update |
|-------------|----------------|
| Current Research payload path changes | Update exact Claude/Codex allowlists and configure/collect byte-parity tests |
| Research hook registration changes | Update both generated-file and structured-registration assertions |
| Core export compatibility changes | Update core-owned export/packed tests; do not duplicate generic SDK ownership in CLI tests |
| Production CLI core imports change | Update the CLI source/clean-`dist` boundary scanner and adversarial specifier cases |

### Decision flow

```
Does this change have logic branches?
├─ No (pure data/text) → Don't write tests
└─ Yes
   ├─ Standalone function with predictable input→output? → Unit test
   ├─ Fixing a historical bug? → Regression test (verify fix exists in source)
   └─ Changes init/update end-to-end behavior? → Integration test
```

### Core/CLI package-test ownership

Core owns its public export map, root composition and identities, explicit subpath imports, Testing emptiness, deep-import blocking, packed target derivation, and packed runtime/declaration consumer proof. CLI owns production import restrictions, Commander/product separation, equal-version checks, and the packed CLI's exact core dependency. Do not keep duplicate generic SDK assertions in CLI tests once equivalent core coverage exists.

---

### File Naming

```
test/
  types/
    ai-tools.test.ts          # Unit tests for src/types/ai-tools.ts
  commands/
    update-internals.test.ts   # Unit tests for internal functions
    init.integration.test.ts   # Integration tests for init() command
    update.integration.test.ts # Integration tests for update() command
  regression.test.ts           # Cross-version regression tests
```

**Rules**:
- Mirror `src/` directory structure under `test/`
- Suffix: `.test.ts` for unit tests, `.integration.test.ts` for integration tests
- One test file per source module (exceptions: regression tests)

---

### Test Structure

### Standard Pattern

```typescript
import { describe, it, expect } from "vitest";

describe("functionName", () => {
  it("does X when given Y", () => {
    const result = functionName(input);
    expect(result).toBe(expected);
  });
});
```

### With Setup/Teardown

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("module", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-test-"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
```

---

### Assertion Patterns

### Prefer Exact Matchers

```typescript
// Good: Exact
expect(result).toBe("expected");
expect(array).toEqual(["a", "b"]);

// Avoid: Loose
expect(result).toBeTruthy();
expect(array.length).toBeGreaterThan(0);
```

### Snapshot Comparison for No-Op Verification

When asserting that an operation made zero changes, use full directory snapshots:

```typescript
// Collect all files + contents before
const before = new Map<string, string>();
walk(dir, (filePath, content) => before.set(filePath, content));

// Run operation
await operation();

// Collect after and diff
const after = new Map<string, string>();
walk(dir, (filePath, content) => after.set(filePath, content));

const added = [...after.keys()].filter((k) => !before.has(k));
const removed = [...before.keys()].filter((k) => !after.has(k));
expect(added).toEqual([]);
expect(removed).toEqual([]);
```

---

### Research-Only Generation Assertions

Current init/update tests must use exact positive and negative contracts.

### Exact payload checks

- Compare sorted generated paths against the Claude-only, Codex-only, and dual-host allowlists.
- Compare configurator output with collector output in both directions: no write-only path, no collect-only path, and byte-identical content.
- Treat optional Claude statusline as a separate opt-in case.
- Assert every registered current hook exists and every generated current hook is registered.

### Parser and zero-write checks

The built Commander tree must expose exactly:

```text
root: init update upgrade uninstall research
research: init status validate rebuild repo quest campaign run evidence claim dispatch
dispatch: context prepare record-result apply reject
```

For each removed root/Research command and removed init option:

1. snapshot the whole temp project as relative paths plus bytes;
2. invoke the built parser/bin with the literal argv through both `trellis` and `tl`;
3. assert Commander reports an unknown command or option;
4. assert no command action callback ran;
5. assert the complete filesystem snapshot is byte-identical.

Removed init options are `--user`, `--monorepo`, `--no-monorepo`, `--template`, `--registry`, `--overwrite`, and `--append`. Removed command surfaces are `channel`, `mem`, `workflow`, and the `research task` subtree. Do not call `init()` with cast legacy fields to simulate parser behavior; that bypasses the contract under test.

### Procedure and policy checks

- Strict JSON tests must include complete token grammar, fatal UTF-8/BOM handling, comments/trailing tokens, malformed numbers/escapes, valid paired surrogates, invalid unpaired surrogates, and duplicate decoded keys including escaped-equivalent nested keys.
- Procedure tests must use independent digest oracles/vectors, not implementation output copied into fixtures. Assert domain prefix/NUL/LF framing, exact instruction bytes, CRLF/final-newline differences, Unicode, array order, and optional omission.
- Table-drive all 14 registered capabilities through canonical parsing and effective-authority merge. Assert nested runtime freezing and stable all-reasons automatic eligibility.
- Distinguish malformed policy (`INVALID_RESEARCH_POLICY`) from recognized grants (`POLICY_WIDENS_AUTHORITY`). Include `enabled:true` as valid no-op and global `automaticEnabled:true` as sole opt-in.
- Filesystem resolution tests use real temp trees. Cover genuine-absence fallback, valid override precedence, every present-invalid no-fallback class, full-chain and both-named-file post-pair revalidation, concurrent ignored unnamed sibling creation/removal, symlink/type/containment/identity failures, clean-built resolver execution, and unknown capability before filesystem access. Directory metadata noise from ignored siblings must not be treated as authoritative drift; named-file size/timestamp drift must fail.
- Policy-init tests compare exact bytes and full-tree snapshots. Cover fresh/matching/dry-run/conflict paths, custom-format preservation, malformed/symlink/non-regular winners, complete originally captured parent-chain revalidation, exclusive no-replace publication, and staging-path replacement cleanup that preserves unrelated bytes.
- Packed tests retain current positive Skill inventory while requiring every Procedure pair. Real clean tarballs remain mandatory; source or dirty `dist` is not proof.

### Protected-state snapshots

Snapshot `.trellis/research/**` before and after init, host-addition re-init, full/force init, update, and uninstall compatibility flows. Compare path sets and bytes exactly. A test that only checks the directory still exists is insufficient.

### Historical cleanup separation

Tests must distinguish:

```text
source exists for compatibility
active generator emits source
frozen inventory recognizes historical path
released hash authorizes safe deletion
```

Do not derive frozen historical expectations from active collectors. Active collectors intentionally narrow while the 137-path current-host cleanup inventory remains unchanged.

### Mixed-file preservation

For `AGENTS.md`, Claude settings, Codex hooks, and Codex config, seed unrelated user content and assert it survives. Malformed JSON/TOML and malformed marker pairs must remain byte-identical. Assertions should target active structured keys rather than rejecting harmless prose comments that mention a managed filename.

---

### ESLint Compatibility

Tests must pass the same ESLint rules as `src/`. Common workarounds:

```typescript
// Empty function (no-empty-function rule)
// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};
vi.spyOn(console, "log").mockImplementation(noop);

// Avoiding non-null assertion
// Bad: match![0]
// Good: (match as [unknown])[0]
```

---

## 4. Validation & Error Matrix

| Condition | Required test behavior |
|---|---|
| Dedicated path appears in `normal`, two projects intersect, or the union differs from independent discovery | Fail collection verification and correct project ownership before running tests. |
| Production-116 producer requires `normal` global setup or runs concurrently with its consumer | Fail the producer-only/order proof; do not duplicate global setup to mask the dependency. |
| Project order is zero/shared, worker counts differ from `1/1/4/1`, or a timeout budget changes | Treat as an ungoverned runner-contract change and stop. |
| Complete-suite evidence identifies another distinct resource/output owner | Preserve the failure and plan a separate correction; do not auto-add a lane, retry, or widen budgets. |
| Existing schema-v1 fixture | Keep bytes immutable; add successor fixtures separately. |
| Arbitrary historical Dispatch metadata | Use deliberately non-current values and assert exact round trip without routing assumptions. |
| Procedure/policy digest vector | Assert exact framed bytes, prefix, lowercase hash, optional omission, array order, and newline behavior. |
| Present-invalid project Procedure | Assert source-specific error and prove bundled parser/read path is not used. |
| Concurrent policy creator | Assert final destination is never replacement-written; preserve and strict-validate winner. |
| Research-init policy behavior | Full-tree snapshots prove fresh/matching creation only, dry-run/conflict zero-write, and root init/update/uninstall non-creation. |
| Activation/approval transition | Assert exact event version, payload keys, refs/order, reducer state, and late-failure atomicity. |
| Expiry boundary | Inject one captured clock; equality with `expiresAt` is expired. |
| Context authorization failure | Compare complete filesystem snapshots and assert no lock/runtime/target/Git write. |
| Host parity | Compare provider-neutral normalized objects after changing only `host`. |
| Historical Skill retirement | Use immutable released-byte provenance; preservation input must otherwise qualify for deletion. |
| Packed inventory | Clean-build and audit a real tarball, not source/collector/dirty `dist`. |

### Test Anti-Patterns

Tests should verify **meaningful behavior**, not restate what TypeScript or the runtime already guarantees. The following anti-patterns were identified during a full test audit and should be avoided.

### Hardcoded Counts on Growing Data

```typescript
// Bad: breaks every time a manifest/script is added
expect(scripts.size).toBe(23);
expect(versions.length).toBe(23);

// Good: dynamic count from source of truth
const jsonFiles = fs.readdirSync(manifestDir).filter(f => f.endsWith(".json"));
expect(versions.length).toBe(jsonFiles.length);
expect(versions.length).toBeGreaterThan(0);
```

**Why**: Hardcoded counts create false-positive failures on unrelated changes and require constant manual updates.

### Tautological Assertions

```typescript
// Bad: testing that registry[key] === registry[key]
const config = getToolConfig(id);
expect(config).toBe(AI_TOOLS[id]); // getToolConfig just returns AI_TOOLS[id]

// Bad: testing that a function returns its own input
const dirs = getTemplateDirs(id);
expect(dirs).toEqual(AI_TOOLS[id].templateDirs); // getTemplateDirs just returns .templateDirs
```

**Why**: These tests verify that JavaScript object property access works, not that our code is correct. If the implementation is a trivial lookup, don't test it — test the **consumer behavior** instead.

### Redundant Type Checks (TypeScript Guarantees)

```typescript
// Bad: TypeScript already guarantees these at compile time
expect(typeof settingsTemplate).toBe("string");
expect(Array.isArray(commands)).toBe(true);
expect(typeof cmd.name).toBe("string");

// Good: test meaningful properties instead
expect(settingsTemplate.length).toBeGreaterThan(0);
expect(commands.length).toBeGreaterThan(0);
```

**Why**: In a strict TypeScript project, runtime type checks in tests add noise without catching real bugs.

### Duplicate Coverage Across Files

```typescript
// Bad: registry-invariants.test.ts AND index.test.ts both test:
// - PLATFORM_IDS length matches AI_TOOLS keys
// - cliFlag uniqueness
// - configDir starts with dot

// Good: test each invariant in ONE canonical location
// registry-invariants.test.ts: internal consistency (unique flags, no collisions, reserved names)
// index.test.ts: derived helper correctness (getConfiguredPlatforms, isManagedPath, etc.)
```

**Why**: Duplicate tests give a false sense of coverage, make refactoring harder, and increase maintenance burden.

### Redundant Assertions Within a Test

```typescript
// Bad: parse test already proves it's valid JSON string
it("is valid JSON", () => {
  expect(() => JSON.parse(settingsTemplate)).not.toThrow();
});
it("is a non-empty string", () => { // redundant if parse succeeds
  expect(settingsTemplate.length).toBeGreaterThan(0);
});

// Good: combine into one meaningful assertion
it("is valid non-empty JSON", () => {
  const parsed = JSON.parse(settingsTemplate);
  expect(parsed).toBeTruthy();
});
```

### Stale Regression Tests After Refactoring

```typescript
// Bad: regression test checks old location after code was moved
it("[beta.10] git_context.py has inline encoding fix", () => {
  expect(commonGitContext).toContain('sys.platform == "win32"');  // Moved to __init__.py!
});

// Good: updated to check new location
it("[beta.10] common/__init__.py has centralized encoding fix", () => {
  expect(commonInit).toContain('sys.platform == "win32"');
});
```

**Why**: When refactoring moves code between files (e.g., centralizing encoding from individual scripts to `common/__init__.py`), regression tests that check specific strings in specific files will break. The regression is still prevented — just in a different file.

**Prevention**: When refactoring code across files, search `test/regression.test.ts` for references to the affected files and update assertions to match the new location.

### Tautological Input (Test Doesn't Exercise the Code Path)

```typescript
// Bad: test input never triggers the code path being tested
it("safe-file-delete respects update.skip", () => {
  // Writes "some content" — hash never matches allowed_hashes
  // So collectSafeFileDeletes() returns "skip-modified" BEFORE checking update.skip
  // Even if update.skip logic is completely broken, this test passes
  fs.writeFileSync(deprecatedFile, "some content");
  config.update.skip = [".claude/commands/trellis/"];
  await update({ force: true });
  expect(fs.existsSync(deprecatedFile)).toBe(true); // Always true!
});

// Good: use input that WOULD trigger deletion without the guard
it("safe-file-delete respects update.skip", () => {
  // Write content whose hash IS in allowed_hashes
  // Without update.skip, the file WOULD be deleted
  fs.writeFileSync(deprecatedFile, originalTemplateContent);
  config.update.skip = [".claude/commands/trellis/"];
  await update({ force: true });
  expect(fs.existsSync(deprecatedFile)).toBe(true); // Proves update.skip works
});
```

**Why**: The test looks like it covers the feature, but the input makes the feature's code path unreachable. The test passes regardless of whether the feature works. This is worse than a missing test because it gives **false confidence**.

**Detection**: For any test that asserts a file/value is preserved, ask: "Would this assertion fail if I deleted the feature being tested?" If no → tautological input.

### Decision Rule

Before writing a test, ask:

1. **Does TypeScript already guarantee this?** → Skip (typeof, Array.isArray, property existence)
2. **Is this a trivial passthrough?** → Skip (getter that returns a property)
3. **Is this already tested elsewhere?** → Skip (avoid cross-file duplication)
4. **Does this depend on data that grows over time?** → Use dynamic counts
5. **Does this test real behavior or just restate the implementation?** → Only test behavior
6. **Does the test input actually reach the code path being tested?** → Verify with mental deletion test
7. **For bug-fix tests: do the args match the user's reported flag combination?** → If you "simplified" by adding a convenience flag, you're testing a different path

### Bug-Fix Tests Must Reproduce the Reported Flag Combination

```typescript
// Bad: convenience flag bypasses the very guard the bug lives behind
it("#2b issue #204: empty tasks/ → bootstrap", async () => {
  await init({ yes: true, user: "alice", force: true });
  // ↑ `force: true` skips the `if (!options.force) handleReinit(...)` guard
  //   in init.ts:1081 (handleReinit defined at init.ts:740). Test green even
  //   though the user's `--yes` alone hits handleReinit and mis-routes to joiner.
  expect(fs.existsSync(bootstrapPath)).toBe(true);
});

// Good: args match exactly what the issue reporter typed
it("#2b issue #204: empty tasks/ + --yes alone → bootstrap", async () => {
  await init({ yes: true, user: "alice" });  // user's literal command
  expect(fs.existsSync(bootstrapPath)).toBe(true);
});

// Optional sibling for the parallel happy path
it("#2c issue #204: empty tasks/ + --yes --force → bootstrap", async () => {
  await init({ yes: true, user: "alice", force: true });
  expect(fs.existsSync(bootstrapPath)).toBe(true);
});
```

**Why**: Convenience flags (`force`, `skipExisting`, `--no-confirm`) in CLI tests often exist to skip prompts in test runs — but those same flags also short-circuit reinit / dispatch / interactive guards. A test that adds them to "make the test simpler" can silently route through a different code path than the one the user hit. Test green ≠ bug fixed.

**Detection**: For any bug-fix test, line up the args against the issue reporter's exact command. Each extra flag must justify itself: is it required to reach the reproduction state, or did you add it because the test "wouldn't run without it"? If the latter, the test is testing the bypass, not the fix.

**Related**: `cli/backend/quality-guidelines.md` → "Routing Fixes: Audit ALL Entry Paths" — the structural side of the same lesson. Every convenience flag in tests typically corresponds to an unfixed entry path in production code.

### Helper Setup Functions Are Load-Bearing — Audit Their Dependents Before Changing

```typescript
// Original helper — every joiner test relies on tasks/ being empty
function simulateExistingCheckout() {
  fs.mkdirSync(path.join(workflow, "tasks"), { recursive: true });
  fs.mkdirSync(path.join(workflow, "spec"), { recursive: true });
}

// Updated helper — now also seeds tasks/archive/
function simulateExistingCheckout() {
  fs.mkdirSync(path.join(workflow, "tasks", "archive"), { recursive: true });
  // ...
}
```

If production code starts using `tasks/.length === 0` as the discriminator between "real reinit" and "aborted recovery", every test that calls `simulateExistingCheckout()` silently flips to the new branch. Tests still green, but they're testing a different scenario than their name claims.

**Rule**: Before modifying a helper that produces fixture state, `grep` for its callers and trace each one against the new behavior. Document load-bearing invariants in a JSDoc comment so the next maintainer doesn't need to re-derive them:

```typescript
/**
 * Helper: simulate a fresh clone of an existing Trellis project...
 *
 * NOTE: the seeded `tasks/archive/` is load-bearing for the joiner branch.
 * If you change the `tasksEmpty` predicate in init.ts (currently
 * `!exists || readdirSync().length === 0`), audit this helper — e.g., if
 * archive/ stops counting as "non-empty", every joiner test below regresses
 * into the bootstrap-fallback branch and assertions flip silently.
 */
```

---

## 5. Good / Base / Bad Cases

- **Good runner case**: independent filesystem discovery equals the disjoint four-project union; production-116 passes alone with setup only; its normal-lane consumer authenticates the resulting evidence; complete coverage aggregates all projects.
- **Base runner case**: ordinary tests remain in four-worker `normal`, while only the exact Procedure, production-116, and canonical `dist` owners use one-worker ordered lanes.
- **Bad runner case**: raise timeout budgets, serialize all normal tests, retry a loaded failure, duplicate global setup, use overlapping project includes, or infer completeness from project counts without exact path equality.
- **Good**: unchanged v1 golden fixtures remain the compatibility oracle; separate fixed C04 vectors cover strict JSON, canonical Procedures, policy classification/digests, authority merge, real filesystem resolution, init creation, and additive packed proof. Later vectors cover v2 emitters, approval lifecycle, host parity, and released-byte retirement.
- **Base**: current Skill resolver/payload/packed behavior remains characterized while all 14 bundled Procedure pairs are added as positive inventory; Skill removal waits for its owning successor.
- **Bad**: refresh a v1 fixture into v2, hardcode current implementation output as a digest oracle, mock away filesystem/package behavior, claim source assets as packed proof, or use non-deletable bytes in a preservation test.

## 6. Tests Required

Runner-topology changes require:

- independent `Path.rglob("*.test.ts")` discovery compared with exact `vitest list --project <name> --filesOnly` sets;
- pairwise-disjoint and complete-union assertions, including the current `1/1/82/2` ownership inventory;
- a producer-only run proving production-116 needs no `globalSetup` and leaves retained evidence byte-identical;
- a normal-project run of the affected contention family with four workers and unchanged budgets;
- the normal coverage-reconciliation consumer after the producer;
- complete coverage with no worker override, followed by the unchanged repository hook as the final complete Core/CLI gate.

C04 requires `strict-json.test.ts`, `procedure-policy.test.ts`, `research-procedure-resolution.integration.test.ts`, `research-policy-init.integration.test.ts`, Research-subpath compatibility proof, packed CLI inventory tests, and both real packed-package verifiers. Existing init/update/uninstall suites remain regression gates. C02-C09 collectively require exact schema versions, capability inventory, Procedure/policy strictness, deterministic digest vectors, activation/approval ordering and transitions, zero-write Context, atomic consumption, normalized Claude/Codex input, separate retirement evidence, and real packed inventory. Every production-symbol edit requires prior GitNexus upstream impact; HIGH/CRITICAL edits require a warning and affected-flow suites.

## 7. Wrong vs Correct

```text
Wrong: keep the 116-case producer in four-worker normal and increase each affected 30-second callback or subprocess budget.
Correct: give the demonstrated resource owner one exact-path, one-worker, positive-order project; retain normal at four workers and preserve every existing budget.
```

```text
Wrong: verify only that project counts add up to the expected total.
Correct: independently discover raw test paths, compare every exact project set, prove empty intersections, and prove exact union equality.
```

```text
Wrong: regenerate existing golden bytes when successor behavior lands.
Correct: retain compatibility fixtures and add a separate successor fixture with explicit version/authority expectations.
```

```text
Wrong: test project override precedence with a valid override only.
Correct: seed a present-invalid override and prove resolution returns INVALID_PROJECT_PROCEDURE without opening bundled files.
```

```text
Wrong: call policy creation twice sequentially and label it a no-replace publication test.
Correct: exercise destination-exists winner handling and assert winner bytes survive exact; use a real concurrent creator test when the race itself is under test.
```

```text
Wrong: assert a modified historical Skill survives when its bytes never matched deletion evidence.
Correct: start with released matching bytes, then mutate exactly the condition whose preservation gate is under test.
```

### DO / DON'T

### DO

- Use independent temp directories per test (no shared state)
- Clean up temp directories in `afterEach`
- Restore all mocks in `afterEach` with `vi.restoreAllMocks()`
- Use `vi.mocked()` for type-safe mock access
- Number test scenarios (`#1`, `#2`, ...) for traceability to PRD
- Use dynamic counts derived from the source of truth (filesystem, registry)
- Test meaningful behavior, not implementation details

### DON'T

- Don't depend on test execution order
- Don't use timers, network, or global state
- Don't leave temp files after test completion
- Don't use `any` in test files (same ESLint rules apply)
- Don't forget `vi.unstubAllGlobals()` when using `vi.stubGlobal`
- Don't hardcode counts on growing datasets (manifests, scripts, platforms)
- Don't add `typeof` or `Array.isArray` checks in TypeScript tests
- Don't duplicate the same assertion across multiple test files
- Don't write tautological tests that just verify `x === x`
