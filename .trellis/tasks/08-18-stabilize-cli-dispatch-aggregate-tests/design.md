# Design — Stabilize CLI dispatch aggregate tests

## 1. Failure model

The complete hook exposed two timeout-only failures. Each failing `it(...)` contains several independent filesystem or symlink proofs, each with its own fixture and assertions, but the aggregate shares one 30-second callback budget. Under complete-suite load, the activation aggregate finished after 31.080 seconds and the approved-result aggregate after 30.237 seconds. No assertion mismatch was recorded.

The minimum causal repair is test-boundary decomposition. It gives each independent proof the same 30-second budget already accepted by the suite. Raising a timeout, moving files to another project, changing workers, or editing production behavior would address a broader surface than the evidence requires.

## 2. Exact test decomposition

### Activation: five serial tests

Preserve this order:

1. control-root replacement through `openSync`;
2. Dispatch-directory replacement through `writeSync`;
3. approvals-directory replacement through `fsyncSync`;
4. pre-existing dispatch parent symlink;
5. Dispatch-directory replacement at the activation link boundary through `linkSync`.

Each new `it(...)` keeps an explicit `30_000` timeout. The first three keep their inline `vi.restoreAllMocks()` calls. The fourth installs no spy. The fifth continues to rely on the suite `afterEach`.

### Approved result: four serial tests

Preserve this order:

1. input path outside the control root;
2. final input-path symlink;
3. parent-directory symlink;
4. path replacement during descriptor-backed reading.

These registrations inherit the enclosing suite's unchanged 30-second timeout. In the final scenario, the `openSync` spy remains installed before `readFileSync`; `armed` and `changed` state and the final suite-level restoration remain unchanged.

Only test titles, registration boundaries, closing delimiters, and required indentation may change. Scenario bodies remain statement-for-statement equivalent. No helper, table, concurrent registration, import, assertion, or cleanup change is permitted.

## 3. Runner and package boundary

The existing four-project topology remains unchanged:

```text
procedure-207-packages       exact 1 file, 1 worker, order 1
methodology-116-production   exact 1 file, 1 worker, order 2
normal                       remaining 82 files, 4 workers, order 3
dist-mutating                exact 2 files, 1 worker, order 4
```

All pairwise intersections remain empty and the union remains all 86 discovered files. This task changes no project membership, worker count, order, setup, default timeout, retry, package script, hook, production source, or shipped bytes.

## 4. Atomic bootstrap

A governance-only repair commit cannot pass the mandatory hook while the failing tests remain aggregated. A governance commit whose hook observes hidden unstaged repair bytes would misrepresent the authenticated subject. The task artifacts and the two test edits therefore form one transparent exact-eight commit.

The six pre-existing staged G-I3 files remain staged and unchanged. `git commit --only -- <exact-eight paths>` constructs the repair commit from its literal allowlist while preserving the unrelated staged governance entries.

The repair task has three lifecycle states:

- planning: `status: planning`, `completedAt: null`, `executionState: planning`;
- activation: `status: in_progress`, `completedAt: null`, `executionState: in_progress`;
- successful atomic commit: `status: completed`, `completedAt: "2026-08-18"`, `executionState: completed`.

The completion transition is prepared only after focused verification. The normal hook is the final transactional gate.

## 5. Impact and verification model

The planned edit changes no named function, class, method, production symbol, fixture helper, or config symbol. Before editing, refresh the current worktree's GitNexus index with `--index-only`, query the two test registrations and relevant file flows, and run upstream impact for any indexed target. HIGH or CRITICAL risk, a production flow, or another required technical path is a stop.

Checks are selected for concrete failures:

- exact diff inspection detects lost assertions or scenario-body drift;
- exact-file Prettier observation records any pre-existing non-clean baseline without authorizing broad reformatting; exact diff inspection, targeted lint, and CLI typecheck detect repair-induced parse, lint, or type regressions;
- the two-file normal-project run detects boundary or cleanup mistakes and requires 73 passing tests;
- exact project-list comparison detects lane duplication or omission;
- staged and compare-scope GitNexus detection exposes unexplained execution-flow changes;
- the unchanged hook supplies the decisive complete Core-then-CLI load test.

## 6. Failure recovery

The hook may launch exactly once. On failure or interruption:

1. preserve tool-captured output and exit status;
2. restore only this task's lifecycle to activation;
3. unstage exactly the eight repair paths while retaining their worktree bytes;
4. require the index to contain exactly the six G-I3 files at their recorded blob OIDs;
5. preserve the two test edits and six task artifacts in the worktree;
6. stop without a second launch.

After a successful repair commit, never amend or rewrite it. Any further failure requires a new forward descendant.

## 7. Downstream handoff

This task does not reconcile or commit G-I3. On successful completion, G-I3 must treat:

1. R3 `0028183901b74263a70dacca98bb936dc792ced4` as the semantic package anchor;
2. `753a5d9a8b1aa293a42f27201f3d9dd458edd723` as the runner-stabilization anchor;
3. the new repair commit as the immediate Git/integration predecessor.

The downstream proof must show stabilization-to-repair changes only the two test files, R3-to-repair changes the runner config plus those two test files, and the other 1,588 original package tuples retain exact R3 identity.
