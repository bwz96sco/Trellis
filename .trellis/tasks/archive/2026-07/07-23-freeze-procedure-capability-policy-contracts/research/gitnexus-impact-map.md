# GitNexus Upstream Impact Map for C02-C09

## Analysis boundary

- Repository: `Trellis`
- Baseline: `880ed5e940fb41cb905ea40d71a242a16abf2015`
- Index was refreshed before analysis with `npx gitnexus analyze /Users/zhangbowen/Projects/NewTools-Research/Trellis`.
- Refreshed graph: 15,121 nodes, 20,266 edges, 203 clusters, 300 execution flows.
- Direction: upstream.
- C01 does not edit any production symbol below. These results are mandatory warning/review gates for the owning child.

Risk interpretation:

- **CRITICAL**: stop before edit, notify the user/main session, and require broad focused integration coverage for every named process.
- **HIGH**: stop before edit, notify the user/main session, inspect direct callers and affected flows, then proceed only inside the approved child scope.
- **MEDIUM**: inspect all direct imports/callers and mixed package effects before edit.
- **LOW**: still run impact before edit. A LOW/zero graph result is not proof of no callers when static source inspection identifies consumers.
- **UNKNOWN**: GitNexus did not resolve the type alias or returned ambiguity. Use surrounding resolved symbols, imports, and source inspection; do not silently downgrade to LOW.

## Mandatory warning gates

| Risk | Symbol | Why it is a gate |
|---|---|---|
| CRITICAL | `reduceResearchEvents` | Canonical replay/rebuild and every mutation path depend on it. |
| CRITICAL | `validateResearchBatch` | Public validation reaches command mutation and repository/Dispatch flows. |
| CRITICAL | `commitResearchBatch` | Public canonical append reaches all event-producing Research commands. |
| CRITICAL | `buildValidatedBatch` | Shared internal construction/validation for validate and commit. |
| HIGH | `parseResearchEvent` | Strict schema boundary for ledger replay and safe parsing. |
| HIGH | `validateDispatchBatch` | Enforces current Result + Proposal batch shape; C06 changes atomicity. |
| HIGH | `collectResearchSkills` | Current generation and orphan-prune inventories depend on its output. |
| HIGH | `collectResearchPlatformPayload` | Init/update collection and manifest pruning depend on the complete payload map. |
| HIGH | Codex `getResearchWorkerTemplate` | Codex payload collection, update collection, and manifest pruning depend on the worker bytes. |
| CRITICAL | `stableResearchJson` | Core projections plus CLI tracked/runtime materializations share this serializer across eight Research processes. |

C02 and C06 must explicitly warn before editing core CRITICAL/HIGH symbols. C04 must warn before editing `stableResearchJson` rather than reusing it unchanged. C07 must warn before editing the Codex worker getter. C08/C09 must explicitly warn before editing payload HIGH symbols.

## C02 — dual-version activation/approval core

| Existing symbol/file | GitNexus result | Direct upstream / affected processes | Required child coverage |
|---|---|---|---|
| `parseResearchEvent` | HIGH; 3 impacted, 3 direct, 4 processes | `parseResearchLedger`; internal store event mapping; `researchEventSchema.safeParse`; ledger parse/replay flows | Complete fixed v1 fixture unchanged; strict v2 kind/version matrix; mixed ledger diagnostics |
| `parseResearchLedger` | LOW, 0 reported | Source inspection: `readResearchLedger` consumes it; graph under-reports public/static path | Mixed sequence, duplicate IDs, source/line diagnostics, byte round trip |
| `ResearchEvent` | MEDIUM; 21 impacted, 13 direct imports | Core Research files plus CLI Research modules | Typecheck both packages; all Research parser/store/CLI tests |
| `ResearchEventKind` | UNKNOWN; type alias unresolved | Defined beside `ResearchEvent`; imported by parser/schema/store | Treat as MEDIUM family impact; exact v1/v2 kind tests |
| `ResearchAggregateType` | UNKNOWN; type alias unresolved | Used by aggregate refs, event parser, reducer, state | Exact aggregate/kind compatibility and strict relation tests |
| `ResearchState` | MEDIUM; 21 impacted, 13 direct imports | Core Research and CLI command/context modules | Empty state, mixed replay, command reads, projections |
| `dispatchSchema` | LOW, 0 reported | Source inspection: event parser, CLI compatibility, command/context paths | Keep v1 Dispatch exact; arbitrary metadata tests |
| `resultSchema` | LOW, 0 reported | Source inspection: event parser and record-result paths | Keep v1 Result exact; mixed consumption batch |
| `proposalSchema` | Ambiguous Function/Const graph entries | Event parser, record-result, review/apply | Resolve exact UID before edit; retain strict v1 payload |
| `decisionSchema` | Ambiguous Function/Const graph entries | Event parser and apply/reject | Resolve exact UID before edit; retain strict v1 payload |
| `reduceResearchEvents` | CRITICAL; 40 impacted, 4 direct, 9 processes | Direct: `readResearchState`, `validateResearchBatch`, `rebuildResearchProjections`, `buildValidatedBatch`. Processes include command registration, Dispatch prepare/result, proposal review, repository context, rebuild, entity lifecycle | Full core Research suite plus CLI command/context/workflow integrations; warn before edit |
| `ResearchMutation` | UNKNOWN; type alias unresolved | Store public input and every CLI mutation producer | Treat with `validateResearchBatch`/`commitResearchBatch` blast radius |
| `mutationToEventDraft` | LOW; 2 impacted | Internal event draft construction and expected Decision draft comparison | Exact event envelope/version/order tests |
| `validateResearchBatch` | CRITICAL; 24 impacted, 2 direct, 7 processes | `executeResearchMutations`, `executeRepositoryDispatchMutations`; broad command mutation flows | All dry-run/atomicity/command lifecycle tests; warn before edit |
| `commitResearchBatch` | CRITICAL; 24 impacted, 2 direct, 7 processes | Same broad command mutation reach as validation | Concurrency/idempotency/append/recovery and command integrations; warn before edit |
| `buildValidatedBatch` | CRITICAL; 23 impacted, 2 direct, 7 processes | `validateResearchBatch`, `commitResearchBatch` | Exact mixed draft order, atomic late failure, no partial append; warn before edit |
| `validateDispatchBatch` | HIGH; 5 impacted, 1 direct, 3 processes | `buildValidatedBatch`; Dispatch Result/Proposal and Decision validation | Existing two-event v1 characterization before C06; new three-event consumption matrix; warn before edit |
| `stableResearchJson` | CRITICAL; 19 impacted, 4 direct, 8 processes | Direct: CLI Dispatch `writeJson`, repository `writeRuntimeJson`, core `writeResearchProjections`, core `writeProjectionCache`. Processes include proposal review, Dispatch prepare/result, command registration, repository mutation/resolution, and rebuild | Warn before any edit. Prefer unchanged reuse for new digest inputs; if edited, run full projection byte-stability plus CLI tracked/runtime materialization suites |

## C03 — immutable capability registry and Skill resolver replacement

| Existing symbol/file | GitNexus result | Direct upstream / affected processes | Required child coverage |
|---|---|---|---|
| `resolveResearchStageCapability` | LOW, 0 reported | Source inspection: direct production consumer `getResearchDispatchContext`; core tests and worker behavior depend on result | Preserve C01 current resolver fixture as deliberate before/after oracle; all stages/hosts/complete |
| `normalizeDiscoveredResearchSkillNames` | LOW, 0 reported | Current resolver/context discovery path | Exact current normalization evidence before removal; reject old input after cutover |
| `RESEARCH_STAGE_CAPABILITIES` and related exported types | LOW; 0 reported for exact const target; type graph may under-resolve | Source inspection: `resolveResearchStageCapability` reads the constant; core `/research` public subpath and CLI Context consume the family | Public subpath typecheck; no root export drift; exact current and successor registry inventories |
| `getResearchDispatchContext` | LOW; 2 impacted, 1 direct, 1 process | Direct caller `registerResearchCommand` | Zero-write Context, host parity, stage/capability mismatch, no metadata routing |

The LOW resolver result conflicts with known static use. C03 must report both graph output and source-known consumers rather than treating the graph as complete.

## C04 — Procedure and project-policy resolution

C04 should add new isolated modules where possible. Before any edit to an existing parser/path helper, run fresh impact on the exact symbol. Existing boundaries likely touched or consumed:

| Existing symbol/file | Current evidence | Required child coverage |
|---|---|---|
| `stableResearchJson` | Canonical serializer used by projections/materializations | Digest vectors and proof existing output is unchanged |
| portable path/containment helpers in core/CLI | Exact symbol depends on implementation placement | Symlink, regular-file, escape, Windows/POSIX normalization, zero destructive writes |
| Research public subpath index | Broad import boundary through core and CLI | Add only `/research` exports; root export keys unchanged |
| Research init/config collection | Payload creation/update paths | Missing-policy creation only; normal update byte preservation |

C04 must prefer new modules and tests. If it modifies a shared filesystem or serializer helper, fresh upstream impact is mandatory and any HIGH/CRITICAL result is a stop/warn gate.

## C05 — activation planning and approval commands

| Existing symbol/file | GitNexus result | Direct upstream / affected processes | Required child coverage |
|---|---|---|---|
| `prepareResearchDispatch` | LOW; 0 impacted reported | Participates in Dispatch preparation and tracked request/manifest writes | Existing prepare portability/recovery plus atomic Dispatch+activation |
| `registerResearchCommand` | LOW; 1 impacted, 1 direct | Commander tree registration | Exact child command set, parser failures, both aliases, zero-write rejected flags |
| command mutation executors | Covered by CRITICAL store symbols above | All event-producing command paths | Dry-run, idempotency, post-commit recovery, TTY challenge |
| tracked Dispatch atomic-write helpers | Re-run exact impact before edit | Request/result/proposal/decision materialization | Activation/approval sidecars, semantic equality, concurrent change |

## C06 — Context approval gate and atomic consumption

| Existing symbol/file | GitNexus result | Direct upstream / affected processes | Required child coverage |
|---|---|---|---|
| `getResearchDispatchContext` | LOW; 2 impacted, 1 direct, 1 process | `registerResearchCommand`; worker/hook subprocesses consume output | Complete full-tree zero-write matrix, wrong/missing/expired/revoked/consumed/drifted authority |
| `recordResearchDispatchResult` | LOW; 0 reported | Participates in canonical Result/Proposal recording | Exact three-event order, late failure atomicity, idempotent recovery |
| `validateDispatchBatch` | HIGH; 5 impacted, 1 direct, 3 processes | `buildValidatedBatch` | Warn before edit; retain Decision behavior while extending Result batch |
| `buildValidatedBatch` | CRITICAL; 23 impacted, 2 direct, 7 processes | `validateResearchBatch`, `commitResearchBatch` | Warn before edit; all core/CLI mutation paths |
| `validateResearchBatch` | CRITICAL; 24 impacted | CLI mutation executors | Warn before edit; dry-run remains zero durable writes |
| `commitResearchBatch` | CRITICAL; 24 impacted | CLI mutation executors | Warn before edit; append/recovery/concurrency |

## C07 — normalized generic workers

| Existing symbol/file | GitNexus result | Direct upstream / affected processes | Required child coverage |
|---|---|---|---|
| `_validate_dispatch_context_response` | LOW; 3 impacted, 1 process | Claude C09 validation flow | New normalized schema, exact authority, provider-neutral parity, denial matrix |
| `_run_dispatch_context` | LOW; 3 impacted, 1 process | Claude C09 direct preflight flow | Exact argv, zero target/Procedure access before success |
| `_direct_optional_skill_exists` | LOW; 3 impacted, 1 process | Current optional Skill second-pass flow | Deliberate removal proof: no Skill metadata/body/root access |
| Claude `getResearchWorkerTemplate` (`packages/cli/src/templates/claude/index.ts`) | LOW; 0 reported for exact UID | Source inspection: aliased direct caller `collectClaudePayload`; then `collectResearchPlatformPayload`, write/configure, update collection, and manifest pruning | Treat graph as under-reported; embedded Procedure-only worker, no Skill tool or nested agent, full Claude payload parity |
| Codex `getResearchWorkerTemplate` (`packages/cli/src/templates/codex/index.ts`) | HIGH; 4 impacted, 1 direct, 3 processes | Direct `collectCodexPayload`; indirect `collectResearchPlatformPayload`, `writeResearchPlatformPayload`, update `collectTemplateFiles`, and `pruneOrphanManifestKeys` | Warn before edit; first-process Context, no Skill inventory/read, raw output, full Codex payload/update/prune parity |
| `getResearchStageSkillTemplates` | LOW, 0 reported | Source inspection: direct caller `collectResearchSkills` | C07 must not remove generation yet unless owning plan says coordinated; C08/C09 own removal |

## C08 — stop generation and safe installed-Skill retirement

| Existing symbol/file | GitNexus result | Direct upstream / affected processes | Required child coverage |
|---|---|---|---|
| `collectResearchSkills` | HIGH; 5 impacted, 2 direct, 4 processes | `collectTemplateFiles`, `pruneOrphanManifestKeys`, `collectResearchPlatformPayload`, `writeResearchPlatformPayload` | Warn before edit; fresh/update/host-addition maps, ownership pruning, no Skill output |
| `collectResearchPlatformPayload` | HIGH; 8 impacted, 2 direct, 2 processes | `collectTemplateFiles`, `pruneOrphanManifestKeys`, `writeResearchPlatformPayload` | Warn before edit; exact path/byte parity and update/uninstall safety |
| `writeResearchPlatformPayload` | LOW; 2 impacted, 2 direct | Configure/init write path | Exact written map and manifest ownership |
| `getResearchStageSkillTemplates` | LOW, 0 reported | Source-known `collectResearchSkills` caller | Keep source until C09; no active generation after C08 |
| `buildKnownKeys` | LOW; 4 impacted, 1 direct, 2 processes | Manifest pruning and uninstall | Dedicated Research retirement keys must not widen roots |
| `pruneOrphanManifestKeys` | LOW; 3 impacted, 2 direct, 1 process | Uninstall/update ownership cleanup | Exact-key no-read unknown pruning and dry-run/cancel behavior |
| `initializeHashes` | LOW; 3 impacted, 2 direct, 1 process | Init/update hash recording | Record only actual writes; no retired Skill re-ownership |
| `collectTemplateFiles` | LOW; 2 impacted, 1 direct, 1 process | Update desired-state collection | No Skill paths; current workers/Procedures retained |
| `uninstall` | LOW; 1 impacted, 1 direct | CLI uninstall | Pristine exact deletion, modified/unknown/protected preservation |
| `loadCurrentHostGenericCleanupSnapshot` | LOW; 4 impacted | Frozen generic cleanup integrity consumers | Must not edit for Research Skill retirement; separate evidence only |

## C09 — remove active Skill source and packed payload

| Existing symbol/file | GitNexus result | Direct upstream / affected processes | Required child coverage |
|---|---|---|---|
| `getResearchStageSkillTemplates` | LOW, 0 reported but source-known payload caller | Current template index and payload collection | Remove only after C08 generation cutover; missing/extra source negative inventory |
| `RESEARCH_STAGE_SKILL_NAMES` template/payload exports | LOW; 0 reported for exact const target | Source inspection: `getResearchStageSkillTemplates` maps it; `research-payload.ts` imports and re-exports it for collection/tests | Treat graph as under-reported; remove active API only after caller inventory proves no generation use, without changing generic cleanup evidence |
| `buildPackedCliInventory` | LOW; 3 impacted, 1 process | `verifyPackedCli` | Packed Procedures/evidence positive inventory; active Skill negative inventory |
| `auditPackedEntries` | LOW; 3 impacted, 1 process | `verifyPackedCli` | Required/forbidden exact and prefix failures |
| `verifyPackedCli` | LOW; 2 impacted, 1 process | Release preflight | Real clean tarball, no stale Skill paths, exact core dependency |

## Graph limitations and required handling

1. GitNexus did not resolve `ResearchEventKind`, `ResearchAggregateType`, or `ResearchMutation` as unique symbols. Their risk is **UNKNOWN**, not LOW. Use the resolved `ResearchEvent`, `ResearchState`, parser, reducer, and store blast radius as the lower bound.
2. `proposalSchema` and `decisionSchema` were ambiguous between Function and Const nodes. The owning child must resolve exact UIDs/file paths before edit.
3. Several public/static functions and constants returned LOW with zero upstream dependants despite known source callers: `parseResearchLedger`, `dispatchSchema`, `resultSchema`, `resolveResearchStageCapability`, `getResearchStageSkillTemplates`, `RESEARCH_STAGE_CAPABILITIES`, `RESEARCH_STAGE_SKILL_NAMES`, and the Claude worker getter. Source-known direct consumers are recorded above and must be tested.
4. Exact UID analysis distinguishes same-named host getters: Claude returned LOW/zero despite its aliased caller, while Codex returned HIGH with payload/update/prune reach. C07 must preserve this asymmetry in its warning and coverage plan.
5. New symbols cannot be impact-analyzed before they exist. Prefer new isolated modules, then run `gitnexus detect-changes` and fresh impact on any existing callers modified to integrate them.
6. No find/replace symbol rename is allowed. Any future rename must use graph-aware rename tooling or a deliberate API migration with fresh impact.

## Child review gates

Before each child edits an existing symbol:

1. Refresh the GitNexus index if stale.
2. Run upstream impact for the exact symbol/UID.
3. Compare with this frozen lower-bound map.
4. Warn before HIGH/CRITICAL edits and stop if the symbol is outside approved child scope.
5. Add direct-caller and affected-process tests named in the relevant row.
6. Run `npx gitnexus detect-changes --repo Trellis --scope unstaged` before handoff.
7. Explain any changed execution flow not predicted here.

C01 itself modifies no production symbol, so all HIGH/CRITICAL production gates remain untriggered for implementation.
