# Add Research DAG Workflow State

## Goal

Add minimal Trellis-managed routing for thin Research Skills: inspect one exact Skill package, construct one zero-write lightweight Context, and record explicit Workflow progress without automatic continuation.

User value: Trellis becomes the durable control plane for Research workflow state and package identity while Skills remain small and methodology-focused. Operators can see exactly where a Quest is, complete one bounded node, then separately choose a legal next transition.

## Background

- C1 froze the thin-Skill, Workflow, event, command, and authority contracts in the Research code-specs.
- C2 implemented one normalized execution-package identity and project-first/fail-closed Skill resolver while preserving historical Procedure replay.
- Existing `.trellis/.workflow.json` and bundled Markdown workflow resolution select Trellis installation/session behavior. They are not per-Quest Research DAG state.
- Existing `Quest.stage` is intentionally coarse and cannot identify an exact Workflow instance, node, package version, or transition history.
- C3 is a product implementation child, not another assurance campaign. It stops before scientific gates, managed worker execution, real pilot-package migration, or provider evaluation.

## Requirements

### R1 — Read-only Skill inspection

- Add `trellis research skill list`, `show`, and `context` with the C1-frozen signatures.
- Discovery and inspection must reuse C2 package authentication and project-first/fail-closed resolution; no second registry, host-native discovery path, alias, or `latest` selection is allowed.
- `list` and `show` expose deterministic metadata and normalized identity without returning member contents or granting invocation authority.
- `show` without `--version`, and unbound `context` whose signature selects by Skill ID only, may resolve only when exactly one valid version exists; ambiguity must fail with available exact versions.
- All Skill commands are zero-write: no ledger, projection, runtime, cache, lock, Activation, Approval, Result, Proposal, or target-file mutation.

### R2 — One-Skill lightweight Context

- `skill context --profile lightweight` resolves exactly one `model-context` Skill package, validates invocation/profile/member policy, and returns one `SKILL.md` plus only default and explicitly requested permitted members.
- Optional `--quest` adds only the minimal canonical Quest projection needed for the bounded invocation.
- If the Quest has an active Workflow instance, the current node must bind the same exact execution-package identity and allow `lightweight`; the Context includes that binding and no next-node instructions.
- The explicit CLI command may select an `operator-explicit` package only when the package declares `lightweight`; implicit model selection remains forbidden.
- `root-command` packages never enter model Context.
- C3 does not create managed Context. `--profile managed` must stop before instruction/member bytes are returned and direct the caller to the managed Dispatch/Activation/Approval path owned by C5.
- Context never executes a model and always reports a one-node stop with `autoInvoke: false`.

### R3 — Strict versioned Workflow DAG

- Resolve exact project Workflow definitions from `.trellis/research/workflows/<workflow-id>/<version>/workflow.json`.
- Implement the closed `ResearchWorkflowDefinitionV1` schema and frozen digest contract.
- Reject unknown keys, duplicate or invalid IDs, invalid exact package identities, missing/invalid start or endpoint nodes, self-edges, cycles, malformed required refs/gates, `stop: false`, and any unsupported methodology, prompt, shell, automatic-action, or continuation field.
- Every C3 node declares `stop: true`: completing one node always returns control to the operator. `stop` is a command boundary, not terminal-node metadata; terminal means no outgoing transition.
- Workflow definitions contain routing metadata only. They never contain Skill instructions, scientific judgment, templates, provider settings, or executable commands.
- One Workflow ID/version is immutable under its digest.

### R4 — Canonical Workflow instance state

- Add typed bind, node-complete, transition-record, and close mutations/events using the C1 payloads.
- Add deterministic replay state for exact Workflow binding, current node, completed nodes, accepted refs, transition history, closure, and per-Quest active/latest instance indexes.
- At most one active Workflow instance may exist per Quest.
- Bind selects one declared start node.
- Node completion requires the exact active/current/not-yet-completed node, the exact bound package identity, the C3 lightweight profile, and at least one existing Quest-owned Result or Artifact ref.
- Transition requires a completed current source node, one exact declared edge, satisfied source-node required refs, and all required canonical gate refs. Because C4 has not implemented H1/H2 records, C3 must report required gates as missing and refuse those transitions.
- Transition is a separate explicit operator action; completion never changes the current node, selects an edge, invokes a Skill, launches a worker, or appends another event.
- Close is separate and records `completed`, `blocked`, `cancelled`, or `superseded`. `completed` requires a completed terminal node with no outgoing transition; other outcomes require non-empty rationale.
- Current node is derived only from bind/transition events, never from `Quest.stage`.

### R5 — Deterministic CLI routing

- Add `research workflow bind`, `complete`, `transition`, `close`, `status`, and `next` with the C1-frozen signatures.
- Mutation commands preview by default. Only explicit `--write` may append; `--dry-run` remains an explicit preview alias; combining both is invalid.
- Every mutation command validates and emits only its one typed Workflow event.
- `--accepted-ref` uses exact `result:<res_uuid>` or `artifact:<art_uuid>` syntax; duplicates and foreign/missing refs fail atomically.
- `status` is read-only and reports the active instance, or latest closed instance when none is active, including exact Workflow/node/package identity and completion/closure state.
- `next` is read-only and reports legal operator choices, missing refs, missing gates, allowed profiles, and stop reason. It never selects or runs anything.
- JSON output is stable and text output remains compact and deterministic.

### R6 — Projection, replay, and compatibility

- Persist deterministic per-Quest Workflow projections under `.trellis/research/quests/<quest-id>/workflow.json`; projection-cache inventory and rebuild must include them.
- Historical schema-v1/v2 event parsing and replay remain unchanged. Workflow events use a new closed event-schema branch rather than widening historical event kinds.
- Repeated writes with the same idempotency key replay the prior event; conflicting or invalid prospective mutations remain zero-write.
- Existing static bundled Workflow selection/resolution and `.trellis/.workflow.json` semantics remain unchanged.
- Existing Procedure resolution, Dispatch, Activation, Approval, worker Context, Result/Proposal, and Proposal review behavior remain unchanged.

## Acceptance Criteria

- [ ] `research skill list|show|context` are registered with exact options and deterministic JSON/text envelopes.
- [ ] Skill discovery is project-first, exact-versioned, fail-closed, and reuses C2 authentication; ambiguous omitted versions fail without selection.
- [ ] Lightweight Context contains one exact `SKILL.md`, only allowed selected members, optional minimal Quest/current-node binding, and no next-stage instructions.
- [ ] All Skill commands, Workflow reads, and default Workflow previews leave tracked Research files, runtime files, projection cache, and lock state byte-identical.
- [ ] Managed or root-command model Context is refused before instruction/member bytes are returned.
- [ ] Valid DAG definitions parse to the frozen digest; cycles, unknown methodology/command fields, self-edges, duplicates, and missing nodes fail with `research_workflow_invalid`.
- [ ] Bind enforces one active instance per Quest and appends one event only with `--write`.
- [ ] Complete rejects wrong/already-completed nodes and missing/foreign refs; successful C3 completion records exact package identity, `lightweight`, accepted refs, and one event only.
- [ ] Completion never changes current node or invokes/chains any later action.
- [ ] Transition rejects incomplete/illegal/unselected edges, missing refs, and every required H1/H2 gate before C4; successful ungated transition appends one event and updates current node on replay.
- [ ] Close records one explicit outcome; `completed` cannot close an incomplete or nonterminal instance.
- [ ] Replay and rebuild reconstruct exact Workflow instance/current-node/history state and write deterministic per-Quest Workflow projections.
- [ ] `workflow status` and `workflow next` use canonical Workflow state, not `Quest.stage`; `next` returns choices/missing requirements only.
- [ ] Historical Research event fixtures, Procedure resolution, static Workflow selection, and current Dispatch lifecycle tests remain green.
- [ ] No real pilot Skill/Workflow package, slash wrapper, provider call, managed worker integration, scientific gate, Quest cutover, release, publication, or Activation is added.

## Out of Scope

- C4 scientific H1/H2 gate records, Quest import/export, and single-writer cutover.
- C5 live managed Skill Dispatch, Activation/Approval Context integration, worker launch, Result/Proposal completion derivation, or provider execution.
- C6 migration or shipment of five real pilot Skills/Workflows.
- C7 model/provider A/B/C evaluation.
- Host-native Skill discovery, user-facing slash wrappers, cycles, automatic continuation, retry engines, step budgets, parallel graph scheduling, or Workflow-authored methodology.
- Changes to source Skill repository, current capability bindings, static Trellis Workflow selection, push, release, publication, or Activation.

## Blocking Questions

None. C1 contracts and completed C2 APIs resolve current product and compatibility decisions. Implementation still requires fresh approval after this planning summary.
