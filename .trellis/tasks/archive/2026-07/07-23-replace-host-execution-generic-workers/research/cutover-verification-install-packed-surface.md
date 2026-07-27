# Research: C07 Cutover Verification, Install, and Packed Surface

- **Query**: Map command, template, hook, configurator, install/update, build, packed audit, executable spec, and test surfaces required for C07 atomic cutover.
- **Scope**: internal
- **Date**: 2026-07-24
- **Source baseline**: branch state after C05 commit `8d59dc9`
- **Network**: not used

## Decision Summary

C07 is the public integration half of C06+C07. Final acceptance requires one coherent chain:

```text
context <dsp-id> --host <host>
  -> host-bound approval + embedded Procedure + supplied IDs
  -> generic host worker
  -> exact {result, proposal}
  -> record-result <dsp-id> --approval <apr-id> --input <path|->
  -> result.recorded + proposal.recorded + approval.consumed
  -> consumed approval sidecar
```

A source-only prompt change is insufficient. C07 must cover public registration, active legacy routing removal, worker/hook/workflow bytes, collector/install/update propagation, clean build, packed executable content, both aliases, executable specs, and named host-adapter/public-lifecycle verification for both hosts.

C07 does not stop Research Skill generation or delete bundled/installed/packed Skill files. C08/C09 own those actions.

## Public Command and Active Routing Inventory

### `packages/cli/src/commands/research/index.ts`

Current:

- `:757-785` registers `context <request-file>`, repeatable `--skill-name`, and passes `requestFile`/`discoveredSkillNames`.
- `:926-940` registers `record-result <dispatch-id> --file <json>`.

C07 final:

```text
context <dispatch-id> --host <claude|codex> [--root] [--json]
record-result <dispatch-id> --approval <apr-id> --input <path|-> [mutation options]
```

No hidden aliases for request-file routing, `--skill-name`, or `--file`.

### `packages/cli/src/commands/research/dispatch-context.ts`

Legacy fields/routing:

- imports active Skill routing at `:24-26`;
- options carry request file and discovered names at `:50-54`;
- result carries optional/fallback/selected Skill fields at `:84-103`;
- response emits request ref, Skill selection, and no concrete output IDs at `:728-759`.

C07 delegates public API to C06 successor. Legacy request-file/Skill public path is removed, not retained behind compatibility options.

### `packages/cli/src/commands/research/legacy-skill-routing.ts`

- Skill-oriented types: `:7-38`;
- stage mappings: `:54-117`;
- discovered-name normalization/selection: `:119-190`.

After public Context no longer imports it, this active bridge and dedicated behavior tests are C07-owned dead active-routing cleanup. C07 does not delete Skill template bodies.

### `packages/cli/src/commands/research/dispatch-command.ts`

Legacy recording at `:616-708` reads `options.file`, trusts worker-selected valid IDs, emits two mutations, and materializes two files. C06 supplies successor internals; C07 removes old public route and enables successor-only production validation.

## Worker, Hook, Workflow Inventory

### Claude worker

`packages/cli/src/templates/claude/agents/trellis-research-worker.md`

- `:4` exposes `Skill`;
- `:37-46` invokes `capability.selectedSkill`;
- `:99-107` generates random IDs;
- `:114-141` shows arbitrary-ID output.

Replace with embedded Procedure execution, complete normalized authority validation, exact supplied IDs, and no `Skill` tool/invocation.

### Codex worker

`packages/cli/src/templates/codex/agents/trellis-research-worker.toml`

- `:18-22` request-path envelope;
- `:36-52` Skill inventory discovery;
- `:54-72` old Context and `--skill-name`;
- `:83-132` old response/Skill loading;
- `:188-196` random IDs;
- `:203-230` arbitrary-ID output.

Replace with exact Dispatch-ID envelope. Root workflow launches Codex from Trellis Research control root; Context with `--root .` is first process before any `cd` or target access. Then validate embedded Procedure and supplied IDs with no Skill/Procedure file discovery.

### Shared Claude hook

`packages/cli/src/templates/shared-hooks/inject-subagent-context.py`

- stale adapter naming at `:3`;
- request-path/Skill regexes at `:21-26`;
- legacy result validation at `:99-215`;
- request-file Context and `--skill-name` at `:225-287`;
- project/personal Skill probes at `:290-303`;
- injection markers at `:306-322`;
- two-pass execution at `:325-349`.

Final hook parses exact:

```text
Research dispatch: <dsp-id>
```

It runs Context once, validates full successor outer envelope and normalized input, injects no partial data on error, keeps stable markers and typed failure behavior, and performs no Skill filesystem operation.

### Generated Research workflow

`packages/cli/src/templates/trellis/workflows/research/workflow.md`

- Skill routing at `:18-34`;
- request-path worker/Context at `:75-85`;
- `record-result --file` at `:98-104`.

Final workflow freezes capability activation, automatic versus interactive approval, root Context retention, exact Dispatch-ID worker line, supplied IDs, exact `--approval --input` recording, root-owned consumption, and separate apply/reject review.

## Source Readers, Collectors, and Installed Paths

Template readers:

- `packages/cli/src/templates/claude/index.ts:26-37`
- `packages/cli/src/templates/codex/index.ts:24-35`
- `packages/cli/src/templates/shared-hooks/index.ts:14-37`
- `packages/cli/src/templates/trellis/index.ts:14-16`

Research payload collector:

- source/output constants: `packages/cli/src/configurators/research-payload.ts:28-48`
- stage Skill collection: same file `:224-240`
- worker/hook collection: same file `:242-294`
- public collection/write API: same file `:296-326`

Installed active files:

```text
.claude/agents/trellis-research-worker.md
.codex/agents/trellis-research-worker.toml
.claude/hooks/inject-subagent-context.py
.trellis/workflows/research/workflow.md
```

C07 normally changes loaded bytes, not output paths or configurator structure. Keep stage Skill collection/path inventory until C08.

Init/update propagation:

- init workflow/payload installation: `packages/cli/src/commands/init.ts:485-526`
- update current-template ownership path: `packages/cli/src/commands/update.ts:840-912`

Required behavior:

- fresh installs receive successor active bytes;
- pristine historical active files update;
- modified/user-owned conflicts survive and are reported by existing ownership behavior;
- `.trellis/research/**` remains byte-identical;
- dormant stage Skill paths remain present through C07, but active files do not reference them.

## Build and Packed Surface

Build:

- `packages/cli/package.json:16` cleans/compiles/copies templates;
- `packages/cli/scripts/copy-templates.js:67-73` copies source templates into `dist`.

Never hand-edit `dist`. Clean build regenerates command and template assets.

Current stale built forms include:

- `dist/commands/research/index.js`: request-file and `--skill-name`;
- built Claude worker: Skill invocation/random IDs;
- built Codex worker: Skill discovery/old Context/random IDs;
- built hook: `--skill-name`;
- built workflow: request-file Context and `record-result --file`.

Packed audit:

- stage Skill names: `packages/cli/scripts/packed-cli-audit.js:3-13`;
- required command/worker/hook/workflow assets: `:32-68`;
- required Skill and Procedure files: `:126-142`;
- current path-only audit: `:184-231`;
- current `packages/cli/scripts/release-preflight.js` packs and lists entries but does not inspect active file bytes from the `.tgz`.

C07 keeps required Skill paths but adds active packed-content positive/negative checks. `release-preflight.js` must use existing `tar -xOf` to extract each active file from the actual packed archive and pass those bytes to the content auditor. A real `verify-packed-cli` mutation test must prove forbidden tarball content fails. Source/dist-only checks and entry-name checks are insufficient; add no new tar dependency. `packages/cli/test/scripts/packed-cli-audit.test.ts:91-116` continues requiring stage Skill files until C09.

## Packed Negative Contract

Inspect active packed surfaces only:

```text
package/dist/commands/research/index.js
package/dist/commands/research/dispatch-context.js
package/dist/commands/research/dispatch-command.js
package/dist/templates/claude/agents/trellis-research-worker.md
package/dist/templates/codex/agents/trellis-research-worker.toml
package/dist/templates/shared-hooks/inject-subagent-context.py
package/dist/templates/trellis/workflows/research/workflow.md
```

Reject relevant active artifact if it contains:

- public `<request-file>` Context routing or request-file callback state;
- `--skill-name`;
- public `record-result --file` / `.option("--file`;
- active `selectedSkill`/optional/fallback selection;
- Claude `Skill` tool or invocation instructions;
- Codex inventory discovery, `.claude/skills`, `.agents/skills`, or `SKILL.md` loading;
- instruction to generate fresh `res_`/`prp_` UUIDs;
- hook request-path regex, Skill probes, or second Context pass;
- workflow request-path or legacy record-result examples.

Do not globally reject `SKILL.md`, `.claude/skills`, `.agents/skills`, or word “Skill” across tarball. Dormant physical payload remains until C09.

## Packed Positive Contract

Public command/help:

- Dispatch-ID Context;
- exact host/root/json options;
- approval/input record-result;
- no legacy options;
- both `trellis` and `tl` aliases behave identically.

Claude worker:

- embedded Procedure;
- exact supplied IDs;
- no Skill tool;
- full authority restrictions.

Codex worker:

- exact Dispatch-ID envelope;
- bare Context command first;
- embedded Procedure and approval validation;
- supplied IDs;
- no Skill discovery/read.

Hook:

- exact Dispatch-ID parser;
- one Context call with `--host claude`;
- complete successor validation;
- stable injection markers and typed denial.

Workflow:

- successor Context;
- host-bound approval;
- supplied IDs;
- `--approval --input`;
- root-owned consumption;
- no active Skill selection.

Packed CLI lifecycle test must prove exact Result, Proposal, consumption order and consumed approval sidecar, not only static strings.

## Test Inventory and Required Replacement

### Command tree

`packages/cli/test/commands/research.test.ts:98-147`, especially `:133-142`, pins request-file and `--skill-name`. Replace with exact successor argument/options and old-option absence.

### Public Context integration

`packages/cli/test/commands/research-dispatch-context.integration.test.ts` is largely legacy:

- direct request-file/discovered-name calls at `:51-88`;
- fallback selection at `:221-238`;
- CLI request-path/Skill output at `:246-350`;
- later request-file calls throughout.

Final suite covers public Dispatch-ID route, activation/approval/bindings/materializations, embedded Procedure, stable IDs, all failure precedence, and full-tree zero-write. Parity fixture creates equivalent host grants through the same path at one injected timestamp so mode/expiry match before four-field normalization; separate cases retain valid mode/expiry differences. No legacy parser compatibility.

### Record-result integration

`packages/cli/test/commands/research-dispatch.integration.test.ts` legacy direct calls at `:436`, `:463`, `:644`, `:747`.

Final public tests cover `--approval`, contained path and stdin `--input`, derived IDs, exact three events, consumed sidecar, old `--file` rejection, replay/recovery, and final rejection of two-event production.

### Workflow integration

`packages/cli/test/commands/research-workflow.integration.test.ts:360`, `:443` use legacy recording; `:612-645` verifies workflow update/state preservation. Update bytes and extend through consumption while retaining Research-state preservation.

### Legacy routing suite

`packages/cli/test/commands/research-legacy-skill-routing.test.ts` active selection assertions at `:125`, `:149`, `:171`, `:180`, `:200`. Delete/replace with active-bridge absence after production import disappears. Historical migration evidence remains separate.

### Built command surface

`packages/cli/test/cli/research-only-surface.integration.test.ts:150-164`, `:224-252` covers names/aliases but not exact options. Add built help/parser positive and negative cases for both aliases; all rejected legacy forms must fail at Commander boundary with complete tree unchanged.

### Hook/worker suite

`packages/cli/test/templates/research-hooks.test.ts`:

- Skill assertions `:445-465`;
- request-file/two-pass Skill adapter suite `:911-1660`;
- arbitrary output IDs `:1642+`.

Rewrite for exact Dispatch-ID grammar, one Context process, complete successor validation, no Skill operation, exact four-field host-parity normalization plus derived-ID proof, supplied IDs, typed failures, no-op conditions, child-repository root discovery, and zero-write preflight.

### Host template suites

- `packages/cli/test/templates/codex.test.ts:35-54`, `:76-94`: replace request pointer/Skill/random-ID assertions; require control-root launch premise, `--root .` first process, and no pre-Context `cd`/target access.
- `packages/cli/test/templates/claude.test.ts:39-44`: retain loader/markers; add no Skill, embedded Procedure, supplied-ID assertions.
- `packages/cli/test/templates/trellis.test.ts:20-38`: replace coarse token checks with exact successor commands/envelope and legacy absence.
- `packages/cli/test/templates/research-payload-exact.test.ts:23-69`: keep Skill path inventory; add exact active bytes/no active Skill refs.

### Configurator/init/update suites

- `packages/cli/test/configurators/index.test.ts:85-114`
- `packages/cli/test/configurators/platforms.test.ts:37-53`, `:104-152`
- `packages/cli/test/commands/init.integration.test.ts:49-65`, `:89-131`, `:184-209`
- `packages/cli/test/commands/init-research-only.integration.test.ts:61-113`, `:188-233`
- `packages/cli/test/commands/update.integration.test.ts:784-869`, `:1358-1451`, `:1559-1584`

Keep current Skill paths. Update expected worker/hook/workflow bytes, pristine update behavior, modified-file preservation, configure/collect parity, and active legacy-token absence.

## Executable Specs

Use three disjoint sets.

Index-only:

- `.trellis/spec/cli/backend/index.md`

Scenario files, exactly five:

- `.trellis/spec/cli/backend/commands-research.md`
- `.trellis/spec/cli/backend/research-worker-hooks.md`
- `.trellis/spec/cli/backend/platform-integration.md`
- `.trellis/spec/cli/backend/filesystem-safety.md`
- `.trellis/spec/cli/unit-test/integration-patterns.md`

Guard-only:

- `.trellis/spec/core/backend/research-state.md`

Each scenario file contains exactly one block beginning `## Scenario: Research Procedure dispatch cutover` and ending before the next `## ` heading or EOF. Within that boundary, exact headings `### 1. Scope / Trigger` through `### 7. Wrong vs Correct` each occur once and in order. Index links all five scenario files, including the correct backend-to-unit-test relative path, but contains no required scenario. Core guard checks exact successor Result/Proposal/consumption wording and contains no required C07 scenario.

Specs separate active C07 execution removal from physical C08/C09 Skill retirement. Add `packages/cli/test/specs/research-procedure-cutover-specs.test.ts` with `readSpec`, `extractScenario`, and `assertOrderedSevenSections` to enforce these three sets. `task.py validate` remains manifest validation and is not accepted as this content check.

## Focused Acceptance Gates

### Gate A — Source command inventory

- exact successor Context/record-result registrations;
- old options absent;
- no hidden callback/alias.

### Gate B — Built parser

Positive valid shapes and negative request-file/`--skill-name`/`--file` through both aliases. Every negative: nonzero parser error, callback not entered, full filesystem unchanged.

### Gate C — Public Context

Both hosts: exact approval, embedded Procedure, stable IDs, normalize only host/approval ID/Result ID/Proposal ID, prove each pair derives from its approval, deep-compare all remaining fields, complete precedence, and zero-write success/failures.

### Gate D — Claude adapter/worker

Exact line, one Context process, no Skill filesystem/body/tool, complete validation, supplied IDs, no target access before preflight, no authority expansion.

### Gate E — Codex worker

Root launches Codex from Research control root; Context with `--root .` is first process before `cd`/target access. Bare `trellis`, no `npx`/install/fallback, no Skill/Procedure file discovery, supplied IDs, no sandbox/network/nested-agent/Git/Research mutation expansion.

### Gate F — Host parity

Same canonical Dispatch with one approval per host, both created through the same grant path at one injected timestamp. Assert approval mode/expiry equal before normalization. Normalize exactly host, approval ID, Result ID, and Proposal ID; verify each output-ID pair derives from its host approval; deep-compare every remaining field, exact output shape, and authority ceiling. Separate fixtures prove legitimate mode/expiry differences remain visible.

### Gate G — Host-adapter plus public-lifecycle contract verification

`packages/cli/test/commands/research-host-adapters.integration.test.ts` uses `packages/cli/test/helpers/research-host-contract.ts` helpers `readInstalledResearchHostAssets`, `runClaudeResearchHookProcess`, `assertCodexResearchWorkerContract`, `makeDeterministicResearchWorkerOutput`, and `runApprovalConsumptionLifecycle`.

- Generated template byte conformance remains in `claude.test.ts`, `codex.test.ts`, `trellis.test.ts`, and payload exact tests.
- Claude lane executes actual installed Python hook with fake `trellis`, captures exact one Context argv, and validates complete injected Context.
- Codex lane statically validates installed TOML first-process/control-root ordering and prohibitions; Markdown/TOML natural-language instructions are not claimed deterministically executable.
- Deterministic output oracle builds strict Result/Proposal from supplied IDs and is parsed through existing schemas; handcrafted output is not model-compliance evidence.
- Both lanes invoke real public record-result and assert exact 1/1/2 events, tracked files, consumed sidecar, duplicate rejection, and same-key recovery.

Live cloud LLM execution is outside release gate unless credentials, exact commands, timeouts, terminal failure classification, and skip policy are separately frozen.

### Gate H — Install/update

Claude-only, Codex-only, dual-host; fresh/pristine/modified; Research state preserved; dormant Skills remain but active bytes do not reference them.

### Gate I — Clean build/packed

Clean typecheck/build, `verify-packed-cli`, actual tarball content checks, and packed lifecycle execution.

## Ownership Constraints

C06 owns successor authority and mutation internals. C07 consumes them.

C07 owns:

- public command/API cutover;
- successor-only production validator activation;
- active legacy routing module removal;
- both workers, shared hook, workflow;
- relevant tests/config expected bytes;
- executable active contracts;
- packed active-content checks.

C08 owns stopping generation and safe installed Skill retirement. C07 must not remove `collectResearchSkills` or stage Skill path inventory.

C09 owns Skill source and packed path deletion. C07 must not remove stage Skill packed requirements.

## Frozen Shared Envelope

Exact parent-to-worker one-line grammar:

```text
Research dispatch: <dsp-id>
```

Preserving the existing `Research dispatch:` prefix minimizes migration surface. Only payload changes from request path to validated Dispatch ID. Hook, Codex worker, workflow, tests, specs, built output, and packed checks must share this exact byte grammar.
