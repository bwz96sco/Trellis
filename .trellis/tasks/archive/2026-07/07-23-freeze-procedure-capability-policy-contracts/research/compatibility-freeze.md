# C01 Compatibility Freeze

## Status and boundary

This artifact freezes current behavior at baseline commit `880ed5e940fb41cb905ea40d71a242a16abf2015`. C01 adds evidence only. It does not change production routing, schema emission, generated payload, cleanup authority, packed inventory, package versions, exports, or canonical Research data.

Future children may intentionally replace the Skill-based behavior named below only after preserving the compatibility requirements that remain authoritative.

## Schema-v1 ledger and state

- `RESEARCH_SCHEMA_VERSION` is exactly `1`.
- A v1 ledger contains one strict JSON object per non-empty line, contiguous `seq` values starting at `1`, unique `eventId` values, and a trailing LF after every serialized non-empty batch.
- A v1 event accepts only the existing v1 envelope fields and exactly these 21 kinds, in this frozen order:

```text
workspace.created
repository.registered
artifact.registered
quest.created
quest.status_changed
quest.stage_changed
campaign.created
campaign.protocol_updated
campaign.frozen
campaign.status_changed
run.created
run.status_changed
run.invalidated
evidence.created
evidence.status_changed
claim.created
claim.status_changed
dispatch.recorded
result.recorded
proposal.recorded
decision.recorded
```

- Every v1 event keeps `schemaVersion: 1`. Future v2 support must not reinterpret, rewrite, upgrade, or reserialize an existing v1 event.
- Unknown event fields, payload fields, kinds, aggregate types, schema versions, sequence gaps/repeats, duplicate event IDs, malformed JSON, and non-object lines fail closed. Errors identify source and line where applicable.
- The v1 aggregate inventory remains `workspace`, `repository`, `artifact`, `quest`, `campaign`, `run`, `evidence`, `claim`, `dispatch`, `result`, `proposal`, and `decision`.
- The existing ID prefixes remain `wsp_`, `rep_`, `art_`, `qst_`, `cmp_`, `run_`, `evd_`, `clm_`, `evt_`, `dsp_`, `res_`, `prp_`, and `dec_`.
- Existing reducer uniqueness, hierarchy, lifecycle, proposal, and decision rules remain unchanged until an owning successor explicitly extends them.
- `.trellis/research/events.jsonl` remains canonical. Runtime state and tracked projections never become mutation authority.

## Projection and rebuild compatibility

The existing tracked projection schemas remain unchanged:

```text
workspace.json
repositories.json
quests/<qst-id>/quest.json
campaigns/<cmp-id>/campaign.json
runs/<run-id>/run.json
evidence/<evd-id>/evidence.json
claims/<clm-id>/claim.json
```

Dispatch, Result, Proposal, and Decision remain ledger entities plus their existing tracked Dispatch materializations; they do not gain general entity projections in C01. Stable Research JSON sorts object keys recursively and ends with one LF. Rebuild from an unchanged ledger must remain byte-identical and deterministic. A future mixed v1/v2 reducer must keep existing projection schemas and entity data unchanged for activation/approval-only events while deterministically advancing the existing `projectedThroughSeq` watermark to the complete mixed-ledger head.

The Research-local filesystem lock remains the only canonical writer lock. C01 does not share Channel internals or alter lock acquisition, idempotency, append, sequence, projection, or recovery behavior.

## Dispatch compatibility metadata

The exact v1 `Dispatch` fields remain unchanged. `ownerSkill` is required. `provider` and `taskRef` are optional. All three retain these rules:

- `ownerSkill`: any non-empty string.
- `provider`: any non-empty string when present.
- `taskRef`: any valid portable reference when present.
- Values are parsed and serialized unchanged. They are not narrowed to current Skill names, current hosts, active Tasks, capability IDs, or Procedure IDs.
- Values are compatibility metadata only. They do not select stage, capability, Procedure, host, approval, Repository, worker, or write scope.
- Existing v1 Dispatch, Result, Proposal, and Decision payload shapes and tracked materializations remain unchanged.

The additive characterization case uses deliberately non-current values:

```text
ownerSkill = vendor.legacy/research-runner@2024-09
provider   = host-adapter:custom/v3
taskRef    = tasks/archive/2024-09/legacy-dispatch
```

A later capability migration must continue to accept and round-trip these values without routing from them.

## Current Skill resolver freeze

Current behavior, to remain stable until C03 deliberately replaces it, is:

| Quest stage | Logical capability | Exact optional host Skill | Bundled fallback Skill |
|---|---|---|---|
| `setup` | `research.setup` | `research-project-setup` | `trellis-research-setup` |
| `framing` | `research.framing` | `research-quest` | `trellis-research-quest` |
| `literature` | `research.literature` | `research-literature` | `trellis-research-literature` |
| `ideation` | `research.ideation` | `research-ideation` | `trellis-research-ideation` |
| `experiment` | `research.experiment` | `research-experiment` | `trellis-research-experiment` |
| `computation` | `research.computation` | `research-computation` | `trellis-research-computation` |
| `theory` | `research.theory` | `research-theory` | `trellis-research-theory` |
| `audit` | `research.audit` | `research-review-case` | `trellis-research-audit` |
| `writing` | `research.writing` | `research-writing` | `trellis-research-writing` |

- Execution hosts are exactly `claude` and `codex`.
- Discovery trims JavaScript whitespace, drops empty entries, and deduplicates exact strings.
- Matching is case-sensitive and exact. Paths, namespaces, aliases, invocation adornments, and bodies are not interpreted.
- An exact optional name selects source `host`; otherwise the bundled fallback selects source `bundled`.
- Discovery order and duplicates do not affect the result.
- `complete` is always non-dispatchable with null capability and Skill fields.
- Resolver output is not persisted in Dispatch events or projections.

## Current workers, hooks, and generated payload

Until C07-C09 deliberately cut over, both hosts receive one bounded Research worker and all nine bundled Research Skill copies.

Claude paths:

```text
.claude/agents/trellis-research-worker.md
.claude/skills/trellis-research-{setup,quest,literature,ideation,experiment,computation,theory,audit,writing}/SKILL.md
.claude/hooks/session-start.py
.claude/hooks/inject-workflow-state.py
.claude/hooks/inject-subagent-context.py
.claude/settings.json
```

Codex paths:

```text
.codex/agents/trellis-research-worker.toml
.agents/skills/trellis-research-{setup,quest,literature,ideation,experiment,computation,theory,audit,writing}/SKILL.md
.codex/hooks/inject-workflow-state.py
.codex/hooks.json
.codex/config.toml
```

The optional Claude statusline remains opt-in. Collection and configuration must emit identical paths and bytes. Current C07 is zero-write and stage-routes through the current resolver. Claude C09 and the Codex worker use the current selected Skill contract. Workers remain proposal-only and cannot mutate canonical Research, review Proposals, commit Git history, broaden sandbox/network scope, or launch nested agents.

C01 does not inspect or reproduce external/private Skill bodies. Existing local Trellis payload byte-parity tests remain the current-body oracle.

## Current cleanup and packed-package freeze

- The frozen generic cleanup evidence remains exactly 137 current-host paths and 1,009 paths across 17 retired hosts. C01 does not edit either inventory.
- Current Research workers and all nine current Research Skills remain excluded from generic cleanup.
- Exact-key manifest ownership never becomes prefix/root ownership.
- Inventory membership never supplies deletion authority; opaque deletion still requires released-byte hash evidence.
- Modified, malformed, unknown, external, and `.trellis/research/**` files remain preserved.
- The current packed CLI requires exactly nine Research stage-Skill `SKILL.md` entries plus the current workers, hooks, configs, Research commands, compatibility evidence, and migration manifests.
- C01 does not change the packed positive or negative inventory.

A separate future Research Skill retirement evidence set is defined in `procedure-capability-policy-contract.md`. It must not mutate or derive authority from the frozen 137/1,009 generic evidence.

## Evidence map

| Frozen behavior | Existing/additive evidence |
|---|---|
| Complete schema-v1 parse/serialize/state/projection rebuild | `packages/core/test/research/schema-v1-compatibility.test.ts` and its fixed fixture tree |
| Strict v1 event failures and round trip | `packages/core/test/research/events.test.ts` |
| Dispatch/Result/Proposal/Decision validation | `packages/core/test/research/dispatch.test.ts` and `packages/cli/test/commands/research-dispatch-compatibility.test.ts` |
| Arbitrary historical Dispatch metadata | `packages/cli/test/commands/research-dispatch-arbitrary-metadata-compatibility.test.ts` |
| Exact current resolver and `complete` behavior | `packages/core/test/research/stage-capabilities.test.ts` |
| Zero-write C07 and host parity | `packages/cli/test/commands/research-dispatch-context.integration.test.ts` |
| Current worker/hook Skill behavior | `packages/cli/test/templates/research-hooks.test.ts` |
| Exact generated Skill paths and bytes | `packages/cli/test/templates/research-payload-exact.test.ts` |
| Frozen generic cleanup separation | `packages/cli/test/legacy/current-host-generic-cleanup.test.ts` |
| Current packed required Skill entries | `packages/cli/test/scripts/packed-cli-audit.test.ts` |

## C01 invariants

After C01, production source, package metadata, package exports, schema version, event inventory, generated payload, cleanup inventories, packed inventory, and existing golden fixture bytes must be unchanged. Any future child that changes a frozen current behavior must update the successor expectation in the same change and retain every compatibility invariant explicitly marked as permanent above.
