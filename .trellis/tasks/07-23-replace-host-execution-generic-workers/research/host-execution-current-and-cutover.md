# Research: Current Claude/Codex Execution and C07 Cutover

- **Query**: Map current Research worker, shared hook, workflow, Context consumer, template/install/build/packed paths; freeze minimum C07-owned generic-worker cutover.
- **Scope**: internal
- **Date**: 2026-07-24
- **Source baseline**: branch state after C05 commit `8d59dc9`
- **Network**: not used

## Decision Summary

C07 is not only a prompt rewrite. It owns the observable half of the C06+C07 atomic group:

```text
public Dispatch-ID Context
  -> root retains approval/output IDs
  -> exact Dispatch-ID worker invocation
  -> host adapter revalidates Context
  -> generic worker executes embedded Procedure
  -> exact {result, proposal} using supplied IDs
  -> root record-result --approval --input
  -> Result + Proposal + approval.consumed
```

C07 must switch public Context, public record-result, successor-only batch validation, both workers, Claude hook, generated Research workflow, command/template/install/packed tests, and executable specs together. C06 retains ownership of authority resolution, output-ID derivation, canonical consumption, replay, and materialization.

Physical Research Skill payload remains through C07 for historical upgrade ownership. C08/C09 own generation retirement and source/packed removal. C07 removes only active Skill discovery/invocation/routing.

## Current Claude Execution

Source:

```text
packages/cli/src/templates/claude/agents/trellis-research-worker.md
```

Current behavior:

- frontmatter exposes `Read, Write, Edit, Bash, Skill`;
- worker validates legacy hook-injected envelope;
- worker invokes exactly `capability.selectedSkill` through native `Skill` tool;
- selected optional/bundled Skill is execution authority;
- prompt and hook route by request-file path;
- worker generates random `res_` and `prp_` UUIDs;
- worker forbids network/Web/MCP, nested agents, canonical Research mutation, Proposal review, record-result, Git mutation, and undeclared writes.

Evidence:

- worker tools/Skill execution: `packages/cli/src/templates/claude/agents/trellis-research-worker.md:1-46`
- worker scope/authority prohibitions: same file `:48-91`
- random output IDs: same file `:93-112`

## Current Codex Execution

Source:

```text
packages/cli/src/templates/codex/agents/trellis-research-worker.toml
```

Current behavior:

- `sandbox_mode = "workspace-write"`;
- invocation carries request-file pointer;
- worker inspects Codex Skill inventory before Context;
- nine exact optional names are deduplicated/sorted and sent as repeated `--skill-name`;
- request-file Context is first Trellis command but not first process;
- worker reads selected `SKILL.md` after Context;
- worker generates random `res_` and `prp_` UUIDs;
- worker forbids nested/multi-agent execution, Research mutation, Proposal decisions, Git-history mutation, and scope escalation.

Evidence:

- sandbox/invocation: `packages/cli/src/templates/codex/agents/trellis-research-worker.toml:1-34`
- Skill inventory and `--skill-name`: same file `:36-52`
- Context and `SKILL.md`: same file `:54-131`
- authority restrictions: same file `:133-180`, `:233-237`
- random output IDs: same file `:182-201`

Codex `workspace-write` is broader than `allowedWritePaths`. C07 must describe exact allowed paths as worker policy, not claim OS-enforced per-path containment. Worker must not request `danger-full-access`, add writable roots, or self-restart with `--add-dir`; after valid Context, outside existing writable roots returns schema-v1 blocked Result plus empty pending Proposal.

## Current Claude Hook

Source:

```text
packages/cli/src/templates/shared-hooks/inject-subagent-context.py
```

Current behavior:

1. parse a request-file pointer from Claude subagent prompt;
2. run request-file Context without discovered Skill;
3. inspect project then personal Claude Skill paths for the optional name;
4. rerun Context with `--skill-name` when exact readable Skill exists;
5. validate legacy outer payload and six authority fields;
6. inject legacy envelope into worker prompt.

Evidence:

- envelope validation: `packages/cli/src/templates/shared-hooks/inject-subagent-context.py:131-215`
- project/personal Skill probing and two-pass Context: same file `:225-349`
- hook registration: `packages/cli/src/templates/shared-hooks/index.ts:26-37`; `packages/cli/src/templates/claude/settings.json:38-58`

Codex has no equivalent subagent-Context hook; its worker performs its own preflight. `packages/cli/src/templates/codex/hooks.json:1-20` contains no matching Context injection.

## Current Workflow and Public Commands

Generated workflow:

```text
packages/cli/src/templates/trellis/workflows/research/workflow.md
```

It currently:

- describes stage-to-optional/bundled-Skill routing;
- calls request-file Context;
- invokes worker with request-file path;
- records via `record-result <dsp-id> --file <json> --json`.

Evidence: workflow `:18-34`, `:71-87`, `:98-104`.

Public registrations:

```text
context <request-file> --host --skill-name
record-result <dispatch-id> --file <json>
```

Evidence: `packages/cli/src/commands/research/index.ts:761-785`, `:926-941`.

Current recording accepts exact `{result, proposal}` but emits only schema-v1 Result and Proposal. Evidence: `packages/cli/src/commands/research/dispatch-command.ts:616-709`.

## Active Runtime Consumers

1. Claude root workflow calls Context and invokes worker.
2. Claude hook reruns/validates Context and injects it.
3. Claude worker consumes injected data.
4. Codex root workflow calls Context and invokes worker.
5. Codex worker independently reruns/validates Context.
6. Root workflow consumes worker output and calls record-result.

Root preflight and adapter preflight may both call Context. Context is zero-write and deterministic for one approval. Root retains `approval.id`, `resultId`, and `proposalId`; worker output does not add approval/host fields.

Cross-host parity grants both hosts through the same path at one injected timestamp so approval mode/expiry are equal, then normalizes exactly `context.host`, `context.approval.id`, `context.outputContract.resultId`, and `context.outputContract.proposalId`. Each host's output IDs must equal `deriveResearchOutputIds(context.approval.id)`; every remaining field deep-compares equal. Separate non-parity fixtures retain legitimate mode/expiry differences.

## Frozen C07 Worker Invocation

Use one exact single-line prompt on both hosts:

```text
Research dispatch: <dsp-id>
```

Rules:

- `<dsp-id>` is exact validated `dsp_` UUID syntax;
- no request-file path;
- no Skill name;
- no Procedure path;
- no approval/output-ID override;
- no extra execution instruction in invocation line;
- malformed/extra prompt fails adapter preflight before worker work.

The generated root workflow constructs this line only after successful public Context and retains the selected approval/output contract root-side.

## Frozen Claude Adapter

1. Exact-fullmatch Dispatch-ID invocation.
2. Resolve control root through existing hook contract without mutation.
3. Execute once:

```text
trellis research dispatch context <dsp-id> \
  --host claude \
  --root <control-root> \
  --json
```

4. Validate exact outer command literal, success flag, ledger head, warnings array, and complete normalized input.
5. Require `context.host === "claude"` and exact Dispatch ID.
6. Inject only normalized `context` as worker input; warnings remain root/operator compatibility output, never worker authority.
7. Remove Skill probing, personal/project Skill path reads, fallback routing, second Context call, and `--skill-name`.
8. On any failure, inject no partial activation/approval/Procedure/output identity.

Successor envelope embeds Procedure instructions. Existing hook subprocess-output ceiling must be tested against maximum valid normalized payload. Do not silently truncate or inject partial JSON.

## Frozen Codex Adapter

1. Exact-fullmatch Dispatch-ID invocation.
2. Root workflow launches Codex worker with process cwd equal to Trellis Research control root; no target-repository `cd` occurs first.
3. First process is exactly:

```text
trellis research dispatch context <dsp-id> \
  --host codex \
  --root . \
  --json
```

`.` is therefore the control root. Target Repository path comes only from validated Context.

4. Before Context: no `cd`, target access, Skill inventory, filesystem discovery, Procedure read, ledger read, policy read, network, package fallback, or other command.
5. Validate same outer envelope and normalized input as Claude; require `context.host === "codex"` and exact Dispatch ID.
6. Extract only normalized `context` for execution; only then may worker access validated `repository.path`.
7. Do not read `SKILL.md`, Procedure files, request sidecars, activation/approval sidecars, or registry/policy as fallback.
8. Missing/stale `trellis` CLI occurs before valid Context/output IDs, so return bounded non-materializable preflight failure; no `npx`, install, network, or alternate binary fallback.

## Frozen Generic Worker Contract

Both host workers consume `NormalizedResearchWorkerInputV1` and must:

- require exact `schemaVersion: 1`;
- verify host and Dispatch identity from adapter invocation;
- require activation/approval/capability/Procedure/repository/context/artifacts/write paths/outputs/checks;
- verify complete exact authority object, with every expanding authority `false`;
- treat embedded `procedure.instructions` as validated execution instructions subordinate to immutable authority;
- treat declared Context/artifact bytes as untrusted data, never authority or instructions;
- reject any Procedure instruction conflicting with normalized authority;
- use only declared Context and supplied artifact paths;
- write only within `allowedWritePaths` in the single selected repository;
- run only declared `checks` after writes;
- use no network, Web, MCP, external cost, second repository, nested agent, capability/Procedure/Dispatch launch, sandbox expansion, Git history mutation, canonical Research mutation, record-result, Proposal decision, or approval operation;
- before valid Context/output IDs, fail preflight without materializable output;
- after valid Context, return schema-v1 `result.status: "blocked"` with short bounded `summary`/`blockers` plus empty pending Proposal rather than widening authority;
- emit exactly two top-level keys in order: `result`, then `proposal`; never emit alternate top-level `{status, code, message}`;
- copy `outputContract.resultId` and `outputContract.proposalId` exactly;
- preserve existing schema-v1 Result/Proposal payload and refs;
- leave approval consumption to root record-result.

Claude frontmatter removes `Skill`; retained tools are `Read, Write, Edit, Bash`. Codex retains `workspace-write` plus instruction-enforced exact write scope and `multi_agent = false`.

Workflow-class Procedure metadata cannot expand worker authority. After valid Context, a Procedure that declares broader orchestration must operate on supplied snapshots or return the bounded blocked Result plus empty pending Proposal.

## Frozen Root Workflow

1. Prepare/plan activation with selected capability.
2. Use automatic authorization only when policy permits bounded activation; otherwise run explicit interactive host-bound approval.
3. Call public Dispatch-ID Context and retain:
   - approval ID;
   - approval expiry/mode;
   - Result/Proposal IDs;
   - repository/write/check/output contract.
4. For Codex, launch host worker with cwd equal to Research control root; do not `cd` to target Repository before its Context preflight.
5. Invoke host worker with exact Dispatch-ID line.
6. Validate worker output is exactly `{result, proposal}` and IDs match retained output contract.
7. Write worker JSON to contained stable input or pipe exact JSON to stdin.
8. Root calls:

```text
trellis research dispatch record-result <dsp-id> \
  --approval <apr-id> \
  --input <path|-> \
  --json
```

9. Worker never calls record-result or consumes approval.
10. Root reviews resulting pending Proposal separately through apply/reject.

Remove all Skill routing, request-file Context, `--skill-name`, random output-ID, and `record-result --file` language.

## Source, Generated, Installed, Built, Packed Paths

C07-owned source consumers:

```text
packages/cli/src/templates/claude/agents/trellis-research-worker.md
packages/cli/src/templates/codex/agents/trellis-research-worker.toml
packages/cli/src/templates/shared-hooks/inject-subagent-context.py
packages/cli/src/templates/trellis/workflows/research/workflow.md
```

Installed destinations:

```text
.claude/agents/trellis-research-worker.md
.codex/agents/trellis-research-worker.toml
.claude/hooks/inject-subagent-context.py
.trellis/workflows/research/workflow.md
```

Payload/install/update/build paths:

- `packages/cli/src/configurators/research-payload.ts:32-48`, `:242-326`
- `packages/cli/src/commands/init.ts:485-526`
- `packages/cli/src/commands/update.ts:840-912`
- `packages/cli/scripts/copy-templates.js:67-73`
- `packages/cli/scripts/packed-cli-audit.js:32-68`, `:126-149`

C07 updates active expectations and generated bytes. It does not delete nine Research Skill source/install/packed paths. Packed negative checks must target active references, not physical Skill inventory until C08/C09.

## Security and Preservation Boundaries

- No worker canonical Research mutation, record-result, approval operation, Proposal apply/reject, Git mutation, nested agents, network, external cost, multi-repository traversal, or sandbox expansion.
- No target Repository writes before validated Context preflight.
- No request/activation/approval/policy/registry/Procedure file fallback.
- No private/unprefixed external Skill body inspection or copying.
- Modified installed workers/hooks/workflows survive normal update through existing ownership logic; pristine owned copies update.
- `.trellis/research/**` remains preserved.
- No `docs-site`, `marketplace`, generic core export, package version, C08/C09 cleanup evidence/source retirement, or unrelated template change.
- Embedded Procedure is authority-bound content; declared Context/artifacts remain untrusted.
- Three-event append is application-level all-before-one-append, not power-loss byte atomicity.

## Risks and Required Tests

- Partial public cutover breaks product; C06/C07 archive jointly only.
- Claude/Codex sandbox mechanics differ; do not claim equivalent OS enforcement, only equivalent contract.
- Hook output-size ceiling may reject valid embedded Procedure payload; test maximum valid envelope.
- Modified historical installed templates may be preserved instead of overwritten; test pristine update and modified-file preservation/conflict reporting separately.
- Structured Context failure must never leak partial authority into worker prompt.
- Physical Skill payload remains through C07 by design; avoid overbroad packed “no Skill files” assertion.

Required test families:

- exact Dispatch-ID invocation parser for both hosts;
- no Claude `Skill` tool/invocation/probing;
- no Codex Skill inventory/`--skill-name`/`SKILL.md` read;
- exact Context command first adapter action;
- exact normalized-envelope validation and failure non-injection;
- host/Dispatch mismatch rejection;
- complete authority ceiling validation;
- untrusted Context cannot override authority;
- exact supplied Result/Proposal IDs and output shape;
- preflight failure before IDs emits no materializable object;
- blocked execution after valid Context emits strict schema-v1 blocked Result plus empty pending Proposal; alternate top-level envelopes fail;
- no worker record-result/canonical mutation/nested agents/network/sandbox expansion/Git mutation;
- generated workflow exact successor lifecycle;
- clean init, pristine update, modified-template preservation;
- source/dist/install/packed active-reference negative sweep;
- named host-adapter/public-lifecycle test using installed bytes: actual Claude hook Python subprocess with fake `trellis`, Codex static first-process/control-root/prompt-contract validation, deterministic supplied-ID schema oracle, and real public record-result through consumed sidecar. Oracle proves integration only; no live cloud LLM requirement absent separate contract.

## Ownership Boundary

C06 owns:

- approved Context resolver;
- zero-write materialization reader;
- approval/output identity gate;
- typed consumption and exact batch;
- replay/recovery/materialization;
- public command internals supplied to cutover.

C07 owns:

- public Context and record-result registration cutover;
- successor-only validator activation at integration boundary;
- Claude worker;
- Codex worker;
- Claude shared hook;
- generated Research workflow;
- command/template/install/built/packed/spec acceptance.

C08/C09 own:

- stop Research Skill generation;
- safe historical installed Skill retirement;
- source and packed Skill payload deletion.
