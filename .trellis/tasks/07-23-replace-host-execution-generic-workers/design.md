# Technical Design

## 1. Scope / Trigger

C07 completes the public half of the C06+C07 atomic integration group. Trigger is availability of C06 internal approved-Context, stable output-ID, approval-consumption, replay, recovery, and temporary dual-family validation primitives.

C07 changes every observable producer and consumer together:

```text
public commands
  + Claude hook/worker
  + Codex worker
  + generated Research workflow
  + active legacy routing cleanup
  + tests/specs/install/build/packed checks
```

C07 does not own dormant Research Skill generation/retirement/source deletion. C08/C09 retain those responsibilities.

## 2. Signatures

### Public Context

```text
trellis research dispatch context <dispatch-id>
  --host <claude|codex>
  [--root <root>]
  [--json]
```

Public TypeScript API delegates to C06 successor:

```ts
interface GetResearchDispatchContextOptions
  extends ResearchRootOptions {
  dispatchId: DispatchId;
  host: ResearchExecutionHost;
}
```

Public API captures one timestamp and passes it to C06 package-private resolver; no public injectable clock exists. No request-file input, discovered Skill names, hidden compatibility option, or fallback resolver.

### Public record-result

```text
trellis research dispatch record-result <dispatch-id>
  --approval <apr-id>
  --input <path|->
  [normal mutation options]
```

No `--file` alias and no `--host`. C07 public TypeScript API replaces the legacy file boundary with C06's frozen input union and successor result:

```ts
interface RecordResearchDispatchResultOptions
  extends ResearchMutationOptions {
  dispatchId: DispatchId;
  approvalId: ApprovalId;
  input: ResearchDispatchResultInput;
}

type RecordResearchDispatchResultResult =
  RecordApprovedResearchDispatchResultResult;

async function recordResearchDispatchResult(
  options: RecordResearchDispatchResultOptions,
): Promise<RecordResearchDispatchResultResult>;
```

The public function captures one production timestamp and delegates to package-private `recordApprovedResearchDispatchResult`; no public `now` exists. Commander captures one absolute cwd and maps `--input` to `{kind: "path", path, cwd}` or lazy `{kind: "stdin", read, cwd}`. Before first await, successor resolves optional relative root and relative path against that same cwd. Exact replay classification then occurs before input open/read, stdin invocation, current-time eligibility, authority revalidation, or output-ID collision. Worker payload remains exactly:

```ts
{
  result: Result;
  proposal: Proposal;
}
```

### Parent-to-worker invocation

Exact one-line grammar shared by workflow, Claude hook, and Codex worker:

```text
Research dispatch: <dsp-id>
```

`<dsp-id>` is one existing valid prefixed UUID. Full-line match only. No leading/trailing whitespace, suffix text, second line, request path, Skill/Procedure name, approval, or output-ID override.

### Claude hook Context command

```text
trellis research dispatch context <dsp-id>
  --host claude
  --root <control-root>
  --json
```

Exactly one Context process per target worker invocation.

### Codex Context command

Root workflow launches the Codex worker with process cwd equal to the Trellis Research control root. First process, before any `cd`, target-repository read, or other command:

```text
trellis research dispatch context <dsp-id>
  --host codex
  --root .
  --json
```

Here `.` is the frozen control-root cwd, never the selected target Repository. Only validated Context supplies `context.repository.path`; worker may access or change cwd to that path only after full preflight. Bare installed `trellis`; no `npx`, package install, shell-generated alternate binary, uncontrolled prompt-supplied root, or network fallback.

### Hook injection contract

Preserve stable markers:

```text
VALIDATED_DISPATCH_CONTEXT_START
<strict JSON serialization of NormalizedResearchWorkerInputV1>
VALIDATED_DISPATCH_CONTEXT_END
```

Only normalized `context` is injected. Outer warnings are non-authoritative root/operator compatibility output.

### Worker success output

Exactly two top-level keys, in order:

```json
{
  "result": {},
  "proposal": {}
}
```

`result.id` and `proposal.id` must equal `outputContract.resultId` and `outputContract.proposalId` byte-for-byte. Approval ID/host/consumption/event draft is not added to worker output.

Preflight failure before validated Context/output IDs emits no materializable object. After valid Context, bounded execution that cannot proceed returns the same strict top-level `{result, proposal}` shape: schema-v1 `result.status: "blocked"` with short bounded `summary`/`blockers`, empty execution arrays when no work ran, plus schema-v1 pending Proposal with `operations: []`, all using supplied IDs. Root may record this bounded blocked outcome; root still reviews the empty pending Proposal separately. No alternate top-level `{status, code, message}` envelope exists.

## 3. Contracts

### End-to-end data flow

```text
root selects capability
  -> prepare/plan activation
  -> authorize bounded OR interactively approve workflow for host
  -> public Context <dsp-id> --host <host>
  -> root retains approval + supplied output IDs
  -> root invokes exact worker line
  -> host adapter independently reruns zero-write Context
  -> adapter validates and extracts normalized worker input
  -> generic worker executes embedded Procedure within authority
  -> worker returns exact {result, proposal} with supplied IDs
  -> root checks IDs and calls record-result --approval --input
  -> schema-v1 Result + schema-v1 Proposal + schema-v2 consumption
  -> root separately applies/rejects pending Proposal
```

Root and adapter may both call Context. Context is zero-write and stable for one canonical approval. Adapter must fail closed if canonical authority changes between root preflight and worker start.

### Normalized input boundary

C07 consumes, but does not redefine, C06 `NormalizedResearchWorkerInputV1`:

- exact `schemaVersion: 1`;
- exact host and Dispatch;
- activation bindings;
- selected host approval;
- immutable capability;
- validated embedded Procedure manifest/digest/instructions/source;
- selected Repository/path;
- declared Context/artifacts/write paths/outputs/checks;
- exact false authority ceilings;
- approval-derived Result/Proposal output IDs.

Adapter validates the complete expected key set and rejects missing/extra/wrong-type authority fields. No adapter recomputes capability, Procedure, policy, approval, scope, or output IDs.

Cross-host parity grants both host approvals through the same path at one injected timestamp so `context.approval.mode` and `context.approval.expiresAt` are equal. It then normalizes exactly `context.host`, `context.approval.id`, `context.outputContract.resultId`, and `context.outputContract.proposalId`. Each host's Result/Proposal IDs must equal `deriveResearchOutputIds(context.approval.id)`; every remaining field deep-compares equal. Separate non-parity fixtures assert legitimate mode/expiry differences are preserved, not normalized.

### Generic worker authority

Worker must enforce:

```ts
{
  readScope: "declared-context-only";
  writeScope: "allowed-write-paths-only";
  network: false;
  externalCost: false;
  multipleRepositories: false;
  canonicalResearchMutation: false;
  proposalReview: false;
  gitHistoryMutation: false;
  capabilityChaining: false;
  procedureLaunch: false;
  dispatchLaunch: false;
  nestedAgents: false;
  sandboxExpansion: false;
  recordResult: false;
}
```

Procedure instructions are executable only inside this ceiling. Workflow/broad Procedure metadata cannot expand worker authority. Declared Context and artifact bytes are untrusted data, not instructions. Before valid Context, conflict is preflight failure with no materializable object. After valid Context, conflict returns bounded schema-v1 blocked Result plus empty pending Proposal; root may record it without widening authority.

### Claude adapter and worker

Hook:

1. Ignore non-Research-worker tool calls through existing no-op behavior.
2. For Research worker, fullmatch exact Dispatch-ID line.
3. Resolve control root through existing read-only discovery.
4. Run successor Context exactly once.
5. Require exact outer command literal `research dispatch context`, `valid: true`, ledger head, warnings array, normalized input, host `claude`, and matching Dispatch ID.
6. Validate Procedure, approval, output IDs, repository, and complete authority.
7. Enforce subprocess-output ceiling without truncation.
8. Inject only normalized input between stable markers.
9. On parser/process/JSON/typed Context/size/identity/authority failure, deny with existing bounded hook failure behavior and no partial Context.

Remove project/personal Skill probes, Skill-name regex, second Context pass, and `--skill-name` construction.

Claude worker frontmatter becomes:

```text
Read, Write, Edit, Bash
```

No `Skill`, agent dispatch, Web, or MCP tool. Prompt requires embedded Procedure, exact supplied IDs, allowed paths/checks, and existing proposal-only behavior.

### Codex adapter and worker

Codex has no separate prompt-mutation hook. Worker owns pull preflight:

1. Fullmatch exact Dispatch-ID line.
2. Require launch cwd is the Research control root selected by root workflow; run bare successor Context with `--root .` as first process.
3. Before Context perform no `cd`, target-repository access, Skill inventory, filesystem discovery, Procedure/request/ledger/policy/sidecar read, package operation, or network action.
4. Validate same outer/normalized contracts as Claude; require host `codex` and matching Dispatch ID.
5. Execute embedded Procedure only after validation.
6. Never read `SKILL.md` or arbitrary Procedure files.
7. Preserve `workspace-write`, `multi_agent = false`, and existing no-escalation rules.
8. If target Repository/path is outside existing writable roots after valid Context, return schema-v1 blocked Result plus empty pending Proposal; do not add roots or restart.

Instruction-level `allowedWritePaths` is not described as exact OS-enforced containment.

### Root workflow

Generated workflow must:

- use Trellis capability/Procedure language, not stage-to-Skill selection;
- distinguish policy-eligible automatic authorization from interactive explicit approval;
- call public Context before worker launch;
- retain exact approval ID, expiry/mode, repository, checks, and output IDs;
- launch Codex with cwd equal to Research control root and do not pre-`cd` to target Repository;
- use exact Dispatch-ID worker line;
- reject non-JSON/extra-key/wrong-ID worker output;
- use contained stable path or stdin for exact worker JSON;
- call approval-bound record-result root-side;
- never ask worker to record, consume, decide, commit, or push;
- review/apply/reject Proposal as separate root authority action.

### Public wiring and active bridge removal

At final integration boundary:

1. public Context delegates to C06 approved resolver;
2. public record-result delegates to C06 approval-consuming recorder;
3. `validateDispatchBatch` removes temporary legacy two-event family;
4. request-file and discovered-Skill public fields/options/imports are removed;
5. active `legacy-skill-routing.ts` bridge is deleted once no production import remains;
6. worker/hook/workflow active Skill references disappear;
7. dormant Skill templates/collection/packed requirements remain until C08/C09.

### Generated/install/build/packed propagation

Source templates flow through existing readers and `research-payload.ts`. Do not redesign output paths or configurators.

Normal build cleans `dist`, compiles, then copies source templates. Never edit `dist` manually.

Packed audit gains content checks scoped to active command/worker/hook/workflow files. `packages/cli/scripts/release-preflight.js` must extract each active file from the actual `.tgz` with existing `tar -xOf`, pass those bytes to the content auditor, and prove `verify-packed-cli` rejects a tarball containing each forbidden active token class. Listing entries or auditing source/dist bytes alone is insufficient. No new tar dependency. Dormant stage Skill paths remain required through C07.

## 4. Validation & Error Matrix

| Boundary / condition | Required outcome |
|---|---|
| Non-Research Claude subagent call | Existing hook no-op |
| Research worker with malformed/extra/multiline invocation | Deny before Context or target access |
| Missing/stale `trellis` executable before valid Context | Bounded non-materializable preflight failure; no install fallback |
| Context exits nonzero with typed error | Preserve bounded code/message; inject no partial data |
| Context prints malformed/multiple JSON or unexpected stderr behavior | Local preflight failure; no injection/work |
| Outer command/valid/head/warnings/context shape mismatch | Local preflight failure |
| Context host or Dispatch differs from invocation | Identity failure |
| Activation/approval/Procedure/output IDs/authority incomplete or inconsistent | Authority failure |
| Context output exceeds valid ceiling | Fail closed; never truncate JSON |
| Procedure conflicts with authority after valid Context | Schema-v1 blocked Result + empty pending Proposal using supplied IDs |
| Context/artifact text attempts instruction override | Treat as data; ignore override |
| Write falls outside allowed paths after valid Context | Blocked Result + empty pending Proposal; no scope expansion |
| Codex launch cwd is not Research control root / `--root .` would resolve elsewhere | Root workflow/adapter contract failure before target access; do not guess or use prompt-supplied root |
| Codex Repository outside writable roots after valid Context | Blocked Result + empty pending Proposal; no `--add-dir`/restart |
| Worker result contains extra top-level key | Root rejects; no record-result |
| Worker Result/Proposal ID differs from supplied ID | Root rejects; C06 recorder also rejects |
| Worker attempts record-result/approval/Proposal decision/Git mutation | Forbidden; block |
| Legacy Context request path or `--skill-name` | Commander failure before callback/write |
| Legacy `record-result --file` | Commander failure before callback/write |
| Temporary two-event Result/Proposal after final cutover | Core batch rejection; no append |
| Pristine owned installed active template | Update to successor bytes |
| Modified/user-owned installed active template | Preserve/report via existing ownership rules |
| Dormant Research Skill path exists in C07 package | Allowed transitional payload |
| Active packed file contains legacy routing/invocation/random-ID token | Packed audit failure |
| Packed package omits dormant Skill path before C09 | Packed audit failure |

## 5. Good / Base / Bad Cases

- **Good**: root gets Claude approval, Context supplies IDs, hook revalidates once, Claude executes embedded Procedure with no Skill tool, root records exact output and consumes approval.
- **Good**: Codex Context succeeds but target Repository is outside writable roots; worker returns schema-v1 blocked Result plus empty pending Proposal using supplied IDs, without `--add-dir` or canonical mutation.
- **Base**: dormant `.claude/skills/trellis-research-*` and `.agents/skills/trellis-research-*` still exist after C07, but no active command/worker/hook/workflow references them.
- **Base**: modified installed worker is preserved during update; clean install and pristine update receive successor bytes.
- **Bad**: root changes record-result first while workers still generate random IDs. Public flow breaks.
- **Bad**: Claude hook validates only `recordResult: false` but ignores host/approval/Procedure/output IDs. Stale/partial authority can enter worker.
- **Bad**: packed audit rejects every `SKILL.md` in C07. This steals C09 ownership and breaks transitional package.
- **Bad**: Codex reads Procedure file to “verify” embedded instructions. Filesystem fallback bypasses Context authority.
- **Bad**: Context text inside artifact asks worker to use network; worker follows it. Data overrode authority.

## 6. Tests Required

### Commands and public lifecycle

- Exact source and built command inventory.
- Both aliases accept successor forms and reject retired forms before writes.
- Public Context full activation/approval/binding/materialization/error-precedence and zero-write matrix.
- Public record-result path/stdin, exact IDs, exact three events, consumed sidecar, replay, recovery, concurrency, and retired-option rejection.
- `packages/cli/test/commands/research-host-adapters.integration.test.ts` with `packages/cli/test/helpers/research-host-contract.ts`: generated installed-byte conformance; actual Claude hook Python subprocess with fake `trellis` and captured one-call argv; Codex TOML static first-command/order/prohibition validation; deterministic schema-valid oracle output from supplied IDs; real public record-result and exact three-event/sidecar lifecycle. Oracle proves integration, not model compliance; live cloud LLM execution is outside gate unless separately frozen.

### Hook and workers

- Exact byte grammar positive/negative matrix.
- Claude one Context process, no Skill probe/second pass, complete validation, typed failure, size ceiling, stable markers, child-repository root discovery, and full-tree no-write preflight.
- Claude allowed tools exclude `Skill`; Procedure and supplied IDs required.
- Codex Context first; no Skill inventory/`--skill-name`/`SKILL.md`/Procedure-file read/CLI fallback.
- Both hosts enforce complete authority and untrusted-data boundary.
- Cross-host parity fixture uses same grant path and injected timestamp, asserts equal mode/expiry, normalizes only host, approval ID, Result ID, and Proposal ID, derives each host's IDs from its approval, and deep-compares every remaining field; non-parity fixtures preserve valid mode/expiry differences.
- Exact success output; non-materializable preflight failure before IDs; materializable blocked Result plus empty pending Proposal after valid Context.

### Generated/install/update

- Workflow exact commands, exact worker line, supplied IDs, root recording, no active Skill language.
- Collector/configurator byte parity.
- Fresh Claude-only/Codex-only/dual-host installs.
- Pristine update, modified-file preservation/conflict behavior, Research-state preservation.
- Dormant Skill path inventory unchanged through C07.

### Build and packed

- Clean build regeneration; no hand-edited dist evidence.
- Packed content mutation tests for every legacy active token class, including real `.tgz` extraction through `release-preflight.js` and `verify-packed-cli` rejection.
- Positive packed command/worker/hook/workflow contracts from extracted tarball bytes.
- Packed CLI lifecycle through consumption sidecar.
- `packages/cli/test/specs/research-procedure-cutover-specs.test.ts` treats `.trellis/spec/cli/backend/index.md` as index-only; validates exactly five scenario files (`commands-research.md`, `research-worker-hooks.md`, `platform-integration.md`, `filesystem-safety.md`, and `../unit-test/integration-patterns.md`); extracts exact `## Scenario: Research Procedure dispatch cutover` until next `## ` or EOF; requires each exact `### 1.` through `### 7.` heading once and in order; and separately guards core `research-state.md` successor consumption wording without requiring that scenario.
- Dormant Skill paths remain required until C09.

### Regression and scope

- Decision behavior unchanged.
- Schema-v1 Result/Proposal fixtures unchanged.
- C06 replay/materialization behavior unchanged.
- GitNexus pre-impact for every existing symbol and final changed-scope review.
- Full core/CLI tests, lint, Python lint, typecheck, build, release preflight, packed core/CLI, task validation, and `git diff --check`.

## 7. Wrong vs Correct

```text
Wrong: remove Skill source/packed directories in C07 because active workers no longer use them.
Correct: remove active references in C07; retain physical payload until C08/C09 safe retirement.
```

```text
Wrong: Claude hook and Codex worker each invent a different Dispatch prompt.
Correct: one exact shared line: Research dispatch: <dsp-id>
```

```text
Wrong: worker reads Procedure/policy/sidecar files to double-check Context.
Correct: adapter validates normalized Context; worker executes embedded Procedure only.
```

```text
Wrong: return approval ID inside worker JSON for convenience.
Correct: root retains approval from Context; worker output remains exactly {result, proposal}.
```

```text
Wrong: describe Codex allowedWritePaths as OS sandbox guarantee.
Correct: retain workspace-write sandbox plus explicit contract enforcement; block when exact scope is unavailable.
```

## Rollout and Rollback

- C06 additive/internal stages keep legacy public lifecycle coherent.
- C07 may be implemented before C06 independent acceptance only inside parent-authorized atomic group.
- No release, archive, or commit between incompatible cutover edits.
- Before final release evidence, clean build plus named host-adapter/public-lifecycle and executable spec-contract tests must pass.
- If joint cutover fails before release, revert unaccepted integration-group edits together, not one public surface.
- Archive is two ordered `--no-commit` operations, not a filesystem transaction. Preflight exact active/archive paths and effective hook config; require no `after_archive` hooks. Snapshot both task metadata files plus path/existence/bytes/parsed state for every session file pointing to either child. Archive C06 then immediately C07. Verify exact destinations, allowed task metadata deltas only, unchanged parent/children metadata, and session pointer removal with unrelated data preserved. Failure of either invocation or any post-success verification restores both children, exact metadata bytes, and all captured session states before revalidating original active state.
- Canonical schema-v2 history is never rewritten/downgraded. Operational stop remains auto-activation off plus approval withholding/revocation and forward fix.

## Impact and Stop Gates

Before editing every existing function/class/method, run fresh upstream GitNexus impact and report direct callers/processes/risk.

Expected high-sensitivity boundaries:

- public command registration and Context/record-result API consumers;
- C06 `validateDispatchBatch` second edit to remove temporary legacy family;
- hook parser/validator functions shared across installed Claude flows;
- template collector/packed audit functions affecting generated releases;
- active legacy routing exports before deletion.

Retain C06 stop gates for parser/reducer/commit/projection/lock/Procedure authority internals. Return to planning for unapproved HIGH/CRITICAL expansion.

No docs-site, marketplace, package-version, generic export, C08/C09 cleanup inventory, or external Skill body edit belongs to C07.

## Joint Remediation Design Addendum

C07 host surfaces remain frozen while root-side C06 authority is hardened:

```text
one canonical state
-> request/Procedure/policy binding checks
-> one cache-free target Repository observation
-> scope check
-> deferred artifact verification
-> approval/materialization/output-ID gates
-> unchanged normalized worker input
```

Public Context converts internal activation failures to exact structured Context errors only at its API boundary. Claude hook and Codex worker continue consuming success payload only; no template, invocation grammar, authority flag, supplied-ID, or packed-byte change is allowed.

All CLI dry-run owners use read-only snapshot validation. Lockful commit remains authoritative. Approval-bound exact replay precedes current clock validation and original input access. Result/Proposal sidecars use the same hardened publication primitive as activation/approval sidecars; canonical ledger plus same-key replay remains recovery authority.

Focused host-adapter tests must prove normalized success bytes remain identical while Context failures stay non-materializable and zero-write. Full installed/build/packed negative and positive contracts remain unchanged.
