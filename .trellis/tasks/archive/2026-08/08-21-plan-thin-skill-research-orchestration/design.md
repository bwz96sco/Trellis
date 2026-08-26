# Thin-Skill Research Orchestration Design

## 1. Design Objective

Add first-class, versioned Research skills to Trellis without turning every invocation into a large managed workflow.

Core rule:

```text
Skill owns method.
Command owns deterministic control.
Workflow owns legal transitions and stops.
Trellis owns canonical state and authority.
```

One immutable skill package must support two execution profiles:

- **lightweight** — root/same-session, minimal context, no mandatory Dispatch envelope;
- **managed** — existing Dispatch/Activation/Approval/Context/Result/Proposal/Decision lifecycle.

Both profiles must resolve the same package identity and instruction bytes.

## 2. Existing Foundations

Reuse unchanged where possible:

- event-sourced Research state and rebuildable projections;
- Quest/Campaign/Run/Evidence/Claim entities;
- capability and policy authority;
- exact version/digest resolution;
- zero-write approved Context;
- generic Claude/Codex workers;
- proposal-only worker boundary;
- root-owned Result/Proposal/Decision mutation;
- project-first, fail-closed package resolution.

Existing anchors:

- capability registry: `packages/core/src/research/stage-capabilities.ts:6-45`, `:94-101`, `:127-286`;
- Procedure package validation: `packages/core/src/research/procedure-policy.ts:81-154`, `:628-725`;
- resolution modes: `packages/cli/src/commands/research/procedure-resolution.ts:503-620`;
- approved Context: `packages/cli/src/commands/research/dispatch-approved-context.ts:255-534`;
- managed recording: `packages/cli/src/commands/research/dispatch-command.ts:1420-1824`;
- canonical Quest state: `packages/core/src/research/types.ts:20-31`, `:91-101`; `packages/core/src/research/reducer.ts:259-298`.

Do not use dormant Procedure 2.0.7 as the package baseline. Its digest-bound inventory ideas may be reused, but its methodology pack and report-sidecar contract remain historical-only.

## 3. Architecture

```text
User or model intent
        |
        v
Deterministic root command
        |
        v
Workflow resolver -----> scientific gate and workflow-instance state
        |
        v
Generalized execution-package resolver
        |
        +------ lightweight context ------> root/same-session execution
        |
        +------ managed binding ----------> existing Dispatch lifecycle
        |
        v
Root accepts result/artifact/milestone
        |
        v
Canonical Trellis ledger when durable state is required
```

### 3.1 One generalized execution-package registry

Extend the existing Procedure package/resolution contract into the sole immutable execution-package registry. Do not add a parallel `ResearchSkillPackage` resolver or separate light/managed prompt bodies.

Historical schema-v1 and schema-v2 Procedure packages remain byte-for-byte and replay-semantics compatible. New thin skills use a later execution-package schema whose normalized identity is:

```text
executionPackageId + version + packageDigest + schemaVersion
```

Recommended thin-skill package layout:

```text
.trellis/research/skills/<skill-id>/<version>/
├── skill.json
├── SKILL.md
├── references/       # optional, on-demand
├── templates/        # optional, on-demand
└── validators/       # optional deterministic package members
```

Bundled packages use the equivalent template root under `packages/cli/src/templates/research/skills/`. Layout differs from historical Procedure packages, but both normalize through one resolver and one replay identity. Project-local packages override bundled packages only when the exact project package validates. A present invalid project package fails closed.

### 3.2 Thin-skill package contract

Conceptual manifest:

```json
{
  "schemaVersion": 3,
  "packageKind": "skill",
  "id": "research-literature",
  "version": "1.0.0",
  "skillKind": "bounded",
  "invocationSource": "model",
  "entrypointType": "model-context",
  "instructionFile": "SKILL.md",
  "allowedProfiles": ["lightweight", "managed"],
  "managedBinding": {
    "capabilityId": "research.literature"
  },
  "members": [
    {
      "path": "templates/note-template.md",
      "role": "template",
      "load": "on-demand",
      "visibility": "worker"
    }
  ],
  "outputs": {
    "primary": ["register", "paper-note"],
    "defaultPersistence": "request-dependent"
  },
  "handoff": {
    "suggestedSkillIds": ["research-opportunity-mining"],
    "autoInvoke": false
  }
}
```

Required semantics:

- `id`, `version`, `schemaVersion`, and resolved digest identify immutable bytes;
- `skillKind` is `bounded`, `workflow`, `advisory`, or `admin`;
- `invocationSource` is `model` or `operator-explicit`;
- `entrypointType` is `model-context` or deterministic `root-command`;
- `allowedProfiles` is meaningful only for `model-context`; a `root-command` package has no model execution profile;
- `managedBinding.capabilityId` is required only when `managed` is allowed;
- every member is path-contained, digest-bound, and classified as default, on-demand, or root-only;
- on-demand members load only by explicit resolver request;
- `handoff.autoInvoke` is false in the pilot;
- changed bytes require a new version.

These are separate concepts. Example: `research-quest-admin` is `operator-explicit` + `root-command`, not “lightweight model execution.”

### 3.3 Activation and replay

Resolver returns one normalized execution-package identity for historical Procedures and new thin skills.

- Historical Activation records continue resolving through `activation-recorded` with unchanged schema-v1/v2 interpretation.
- New managed Activation records bind the normalized execution-package identity and exact instruction/member digest.
- Capability and policy remain separate authority layers.
- Lightweight Context records no Activation, but its resolver output exposes the same normalized identity and instruction digest used by managed execution.
- No duplicate authored `PROCEDURE.md` is generated for a thin skill.
- If legacy Procedure-named Activation fields cannot represent a schema-v3 skill without ambiguity, add one normalized `executionPackage` identity field for new events while preserving old fields and historical readers. Do not add a second registry or replay path.

## 4. Execution Profiles

### 4.1 Lightweight profile

Purpose: preserve current small-skill behavior for ordinary bounded work.

Contract:

- resolve one exact normalized execution package;
- enforce `invocationSource`, `entrypointType`, and profile policy;
- assemble minimal root context;
- load `SKILL.md` plus explicitly requested on-demand members only;
- execute in current root/same session;
- create no Dispatch, Activation, Approval, Result, or Proposal records;
- create no canonical state by default;
- stop after the bounded stage;
- permit an explicit root command to record an accepted artifact or milestone when durable continuation is needed.

If a managed Quest exists, lightweight execution may read its projection. It must not mutate Quest state implicitly.

### 4.2 Managed profile

Purpose: durable, isolated, independent, long-running, multi-repository, or interruption-sensitive work.

Contract:

- map normalized execution package to an existing capability and effective policy;
- reuse Dispatch prepare, Activation, Approval, approved Context, worker output, Result/Proposal recording, and root Proposal decision;
- bind exact skill package identity and digest;
- preserve proposal-only worker authority;
- permit Claude and Codex only;
- forbid nested skill/workflow/Dispatch launch by workers;
- stop after one workflow node.

### 4.3 Deterministic profile selection

Use lightweight when all are true:

- package allows lightweight;
- one bounded/advisory stage;
- root/same-session execution is acceptable;
- no isolated environment or independent evaluator is required;
- no cross-repository write authority is needed;
- no long-running execution or managed recovery requirement exists.

Require managed when any is true:

- package allows only managed;
- independent reviewer/evaluator identity matters;
- parallel workers are required;
- work is long-running or interruption-sensitive;
- cross-repository or bounded write authority is required;
- external/provider/network authority needs explicit operational Approval;
- Result/Proposal root review is part of the acceptance contract.

Profile selection must never use Direct/Pack/Deep/Campaign-style reasoning-depth labels.

## 5. Declarative Workflow Contract

Recommended layout:

```text
.trellis/research/workflows/<workflow-id>/<version>/workflow.json
```

Conceptual schema:

```json
{
  "schemaVersion": 1,
  "id": "research-core-loop",
  "version": "1.0.0",
  "graphKind": "dag",
  "nodes": [
    {
      "id": "literature",
      "executionPackage": {"id": "research-literature", "version": "1.0.0"},
      "allowedProfiles": ["lightweight", "managed"],
      "stopAfter": true
    },
    {
      "id": "ideation",
      "executionPackage": {"id": "research-ideation", "version": "1.0.0"},
      "allowedProfiles": ["lightweight", "managed"],
      "gateAfter": "H2",
      "stopAfter": true
    },
    {
      "id": "evaluation",
      "executionPackage": {"id": "research-idea-evaluation", "version": "1.0.0"},
      "allowedProfiles": ["managed"],
      "stopAfter": true
    }
  ],
  "transitions": [
    {"id": "literature-to-ideation", "from": "literature", "to": "ideation", "requires": ["operator-selection"]},
    {"id": "ideation-to-evaluation", "from": "ideation", "to": "evaluation", "requires": ["operator-selection", "gate:H2:approve"]}
  ]
}
```

Workflow files contain only node identities, exact execution-package references, legal transitions, required state/artifact refs, profile restrictions, scientific gates, and stop conditions. They must not contain methodology, prompt bodies, embedded templates, automatic child invocation, scientific selection logic, or shell sequences.

Pilot graph rules:

- versioned DAG only;
- every invocation executes or records completion for one node, then stops;
- transition is a separate operator-selected action after node completion;
- gate satisfaction permits selection but never selects or executes the next node;
- cycles, automatic continuation, and step-budget engines are deferred.

### 5.1 Canonical workflow-instance state

Coarse Quest stage cannot identify exact workflow progress. Managed workflows therefore append canonical events for one explicit workflow instance:

```json
{
  "workflowInstanceId": "workflow-instance-...",
  "questId": "quest-...",
  "workflowId": "research-core-loop",
  "workflowVersion": "1.0.0",
  "workflowDigest": "sha256:...",
  "currentNodeId": "ideation",
  "status": "active"
}
```

Required events:

- `workflow.bind` — binds exact workflow ID/version/digest and start node;
- `workflow.node.complete` — records completed node, execution-package identity, profile, and accepted Result/artifact refs;
- `workflow.transition.record` — records explicit operator-selected transition and satisfied gate refs;
- `workflow.close` — records completed, blocked, cancelled, or superseded closure.

Pilot invariant: at most one active workflow instance per Quest. Rebinding requires closing or superseding the prior instance. `workflow status` and `workflow next` read this projection; they never infer current node from `Quest.activeStage`.

## 6. Scientific Gate Contract

Operational Approval answers: “May this execution run with this authority?”

Scientific gate answers: “Did the accountable human authorize this research transition?”

Add a canonical scientific gate record rather than reusing Approval.

Conceptual payload:

```json
{
  "id": "gate-...",
  "questId": "quest-...",
  "workflowId": "research-core-loop",
  "workflowVersion": "1.0.0",
  "nodeId": "ideation",
  "gateId": "H2",
  "decision": "approve",
  "approvedRefs": ["candidate:C1", "candidate:C3"],
  "rejectedRefs": ["candidate:C2"],
  "rationale": "verbatim operator rationale",
  "actor": "operator-label",
  "sourceArtifactRef": "artifact-...",
  "recordedAt": "RFC3339"
}
```

Rules:

- gate event in Trellis ledger is canonical decision state;
- decision is explicit; no inferred approval;
- rationale and selected refs preserve human wording/identity;
- `opportunity_board.md`, `ideas.md`, and candidate attack files remain scientific evidence refs;
- `h1_decision.md` / `h2_decision.md` may be imported or exported for compatibility, but are not required duplicate canonical records after cutover;
- H1/H2 record scientific scope, not filesystem/network/worker authority;
- a gate may permit a transition but never selects or executes the next node;
- evaluation cannot be invoked in the same command that records H2;
- C4 validators check explicit decision, selected-ref string integrity/disjointness, and canonical evidence containment, not scientific truth;
- candidate-universe membership/coverage waits for C4b because C4 has no canonical candidate/opportunity projection.

## 7. Command Surface

Underlying CLI remains deterministic. Slash-command wrappers are deferred until these contracts prove useful.

### 7.1 Skill inspection and context

```text
trellis research skill list [--json]
trellis research skill show --skill <id> [--version <version>] [--json]
trellis research skill context --skill <id> --profile <lightweight|managed> \
  [--member <path>...] [--quest <id>] [--json]
```

Behavior:

- read-only;
- exact package resolution;
- invocation/profile validation;
- minimal member projection;
- no model execution;
- no canonical mutation.

### 7.2 Workflow routing

```text
trellis research workflow bind --quest <id> --workflow <id> --version <version> \
  --start-node <node> [--dry-run] [--write] [--json]
trellis research workflow complete --instance <id> --node <id> \
  --accepted-ref <ref>... [--dry-run] [--write] [--json]
trellis research workflow transition --instance <id> --transition <id> \
  [--dry-run] [--write] [--json]
trellis research workflow status --quest <id> [--json]
trellis research workflow next --quest <id> [--json]
```

Behavior:

- mutation commands preview by default and require explicit `--write`;
- bind refuses a second active instance for one Quest;
- complete requires exact current node and accepted Result/artifact refs;
- transition requires a completed source node, operator selection, and all gate refs;
- status/next read canonical workflow-instance and gate projections;
- status/next return exact instance/workflow/node/package identity, allowed next nodes, missing requirements, allowed profiles, and stop reason;
- no command invokes a skill or chains into another workflow command.

### 7.3 Scientific gates

```text
trellis research gate record \
  --instance <id> --gate <H1|H2> --decision <approve|reject> \
  --actor <label> --rationale <text> \
  [--approved-ref <scientific-ref>...] [--rejected-ref <scientific-ref>...] \
  --evidence-ref <artifact:art-id>... [--source-artifact <artifact:art-id>] \
  [--idempotency-key <key>] [--dry-run] [--write] [--json]
trellis research gate status --instance <id> [--json]
```

Behavior:

- Quest/workflow/node identity derives from exact active instance;
- approved/rejected scientific refs remain separate from canonical evidence Artifacts;
- preview by default;
- write requires explicit `--write`;
- status is read-only;
- same-command transition or next-node execution is forbidden.

### 7.4 Quest import and export

```text
trellis research quest import \
  --source <research-quest.yaml> \
  [--events <research-events.jsonl>] \
  [--dry-run] [--write] [--json]
trellis research quest export --quest <id> --target <directory> \
  [--dry-run] [--write] [--json]
```

Behavior:

- preview by default;
- import preserves legacy scalar text, owner-qualified refs, source extensions, and exact source digest;
- import refuses blocking mapping conflicts and missing owner decisions;
- import write appends canonical Trellis events and records Trellis as sole writer;
- export reconstructs source-compatible YAML/JSONL plus loss report and does not transfer authority by itself;
- source files become compatibility input/read-only projection, not second mutable authority.

### 7.5 User-facing wrappers

Deferred from pilot. First prove deterministic CLI and Context contracts. A later UX task may add thin wrappers that call those surfaces without duplicating instructions or state.

## 8. Quest Authority Migration

### 8.1 Before import

```text
source research-quest.yaml = writer
Trellis = optional reader/import target
```

### 8.2 Explicit source mapping

Import adds canonical Quest route/import state where current Quest fields are too coarse. Mapping is fixed before code work:

| Source field | Canonical target | Rule |
|---|---|---|
| `schema_version` / legacy `version` | `quest.import.record.sourceSchemaVersion` | Preserve exact value; supported legacy forms normalize in memory only. |
| `quest_id` | `quest.import.record.sourceQuestId` | Allocate/resolve Trellis `Quest.id` separately; preserve source ID for export. |
| `project_slug` | `quest.import.record.projectSlug` | Preserve exact scalar. |
| `title` | `Quest.title` | Required after normalization. |
| `objective` | `Quest.description` | Preserve scalar text. |
| `status` | `Quest.status` + `sourceStatus` | Map `seed`/`active` to `active`; map terminal values exactly; reject unknown values. Preserve original scalar. |
| `active_stage` / legacy `current_stage` | `Quest.stage` + `sourceActiveStage` | Use explicit stage map; reject unknown stage or missing owner-dependent short stage. |
| `first_read[]` | `Quest.artifactRefs` with role `first-read` | Preserve order and relative paths. |
| `authoritative_artifacts` | `Quest.artifactRefs` + `quest.route.ownerBindings` | Require relative `path` and explicit `owner_skill`; no owner inference. |
| `branches[]` | `quest.route.branches` | Preserve IDs, status, owner, objective, expected artifact; reject competing active owners. |
| `claims[]` | `Claim` entities + source-field extension | Preserve owner and evidence paths; `supported`/`partial` require evidence. |
| `open_questions[]` | `quest.route.openQuestions` | Preserve order and text. |
| `current_decision` | `quest.route.currentDecision` | Preserve ID, verdict, rationale, evidence paths; do not reinterpret as operational Approval. |
| structured `next_action` | `quest.route.nextAction` | Preserve owner, action, acceptance gate, expected artifact. |
| scalar legacy `next_action` | `quest.route.legacyNextActionText` | Preserve verbatim; import remains blocked until operator supplies owner for writable route. |
| `blockers[]` | `quest.route.blockers` | Preserve order and text. |
| `board` | `quest.route.legacyBoard` | Preserve for compatibility; `stale_routes` remain retired/parked and never become transitions. |
| `research-events.jsonl` reviewed milestones | `quest.import.milestone` events | Preserve source event ID/time/actor/payload and source line order; reject malformed or non-reviewed records. |
| source files/digest | `quest.import.record` + ArtifactRefs | Bind exact YAML/event bytes, paths, digest, import time, and authority state. |

Unmappable behavior:

- missing owner, unknown stage/status, conflicting active owners, malformed milestone, unsupported type, or path outside project -> preview reports blocking conflict; write fails closed;
- unknown non-authoritative extension -> preserve under namespaced `sourceExtensions` for export, never use it for routing;
- no source field is silently dropped or guessed.

### 8.3 Import preview and write

Preview parses source YAML and reviewed event log, emits mapping/conflicts/export-loss report, writes nothing, and preserves source bytes plus scalar next-action text.

Write requires explicit operator intent, an exact preview token/idempotency key, and unchanged source digest. It atomically appends Quest/import/route/Claim/Artifact events, records authority transition to Trellis, then writes committed authority projection used by source admin.

### 8.4 Enforceable single-writer cutover

Source `research_quest_admin.py` must check the committed Trellis authority projection before any mutating command. When authority is `trellis`, `init`, `migrate`, `status --write`, and `append-event --write` fail before filesystem mutation. Read-only `validate` and status reads remain available.

Cutover is incomplete until an integration test invokes the real source admin entrypoint against a Trellis-owned fixture and proves byte-for-byte filesystem stability on refusal.

### 8.5 Export and rollback

Export reconstructs schema-0.2 YAML and reviewed JSONL from canonical Quest, route, Claim, Artifact, milestone, and preserved extension state. It preserves source IDs, owner-qualified refs, scalar legacy text, ordering where semantically meaningful, and emits an explicit loss report. Export must round-trip through source validators before authority changes.

Rollback is explicit authority transfer, not dual write:

1. export current Trellis projection to a new source snapshot;
2. validate and compare mapped content;
3. record operator authority transfer back to source;
4. update committed authority projection;
5. only then re-enable source admin mutation.

Both stores must never accept writes concurrently.

## 9. Artifact Policy

Default by package:

- conversational result when no durable continuation is needed;
- one compact primary artifact when downstream work needs a stable handoff;
- additional files only when required by reproducibility, independent evaluation, publication, or explicit durable intent.

Pilot mappings:

- literature: `register.md` plus requested paper notes only;
- normal ideation: one `ideas.md`;
- Quest ideation: `opportunity_board.md` and `ideas.md` as evidence; canonical H1/H2 gate events, with decision Markdown only as import/export projection when compatibility requires it;
- evaluation: one attack artifact per independently evaluated candidate plus one `decision.md`; experiment brief only for selected closure;
- Quest admin: canonical events/projections only; no duplicate tracker pack.

No mandatory HTML, provenance report, numbered pack, queue, campaign wrapper, or manifest unless a later separately justified package requires it.

## 10. Pilot Package Mapping

### 10.1 `research-literature`

- invocation source: model;
- entrypoint type: model-context;
- kind: bounded;
- execution profiles: lightweight, managed;
- default: lightweight for one bounded review;
- managed only for parallel multi-paper work, explicit independence, or recovery;
- do not automatically copy the current one-clean-subagent-per-paper rule into all runs; test whether it adds value.

### 10.2 `research-ideation`

- invocation source: model;
- entrypoint type: model-context;
- kind: bounded;
- execution profiles: lightweight, managed;
- default: one portfolio then stop;
- normal and Quest-governed variants share method but differ in required state/gates;
- must not preload evaluation instructions or auto-invoke evaluation.

### 10.3 `research-idea-evaluation`

- invocation source: operator-explicit;
- entrypoint type: model-context;
- kind: workflow;
- execution profile: managed for pilot closure runs;
- independent candidate attacks justify isolated workers;
- structural validator enforces frozen candidate set, approved-set containment, selected-or-blocked closure, and output completeness;
- root/human retains final canonical decision authority.

### 10.4 `research-quest-admin`

- invocation source: operator-explicit;
- entrypoint type: deterministic root-command;
- execution profile: not applicable; it is neither lightweight model execution nor managed worker execution;
- kind: admin;
- preview/write split;
- never dispatched as a proposal-only worker;
- owns import, export, and authority transfer into Trellis canonical state;
- source admin refuses writes before mutation while Trellis authority is active.

## 11. Comparative Evaluation

Use representative real tasks, not synthetic prompt-only checks.

Execution paths:

- **A — bare model:** no source skill or Trellis package;
- **B — current source skill:** current host-native behavior;
- **C — Trellis-managed package:** same method through appropriate lightweight or managed profile.

Pilot matrix:

| Pilot | A | B | C |
|---|---|---|---|
| Literature | bare review | source `research-literature` | Trellis lightweight; optional managed parallel case |
| Ideation/evaluation | bare generate/select | source handoff workflow | Trellis lightweight ideation + managed evaluation |
| Quest admin | manual state interpretation | source preview/write admin | Trellis import preview/write and sole-writer enforcement |

Acceptance signals:

- same task-specific semantic acceptance gates pass;
- no critical owner-boundary, H1/H2, novelty, fairness, or selected/blocked regression;
- lightweight path adds no mandatory extra model call, Approval round, subagent, or durable artifact compared with the source skill;
- managed path demonstrates useful recovery, independence, bounded authority, or multi-repository value;
- no automatic next-stage invocation;
- no dual Quest writer;
- interruption recovery reconstructs the exact managed state;
- package/context identity is reproducible from recorded digest.

Run at least three representative cases for each pilot boundary and at least ten total real invocations before proposing full migration. Elapsed time cannot replace case coverage. One isolated preference variance does not justify redesign; any zero-tolerance authority/replay failure blocks migration immediately, while other redesign decisions require repeated root failure.

## 12. Compatibility

Must preserve:

- historical schema-v1 events;
- exact recorded Procedure 1.0.0 and 2.0.7 activation resolution;
- dormant 2.0.7 status;
- existing Result/Proposal/Decision authority;
- Claude/Codex worker ceiling;
- existing source-skill artifact readers and validator entry points when materially useful;
- protected `.trellis/research` lifecycle behavior.

Do not mutate bytes under an existing package ID/version. New thin packages use new immutable versions.

## 13. Rollout and Rollback

### Rollout

1. Freeze source snapshot plus executable contracts for normalized execution-package identity, workflow-instance events, gate events, and Quest mapping.
2. Generalize package resolver and new Activation identity while preserving historical schema-v1/v2 replay; do not change live capability selection.
3. Add one project-local literature package and read-only lightweight Context spike.
4. Add DAG resolver plus canonical workflow bind/complete/transition state before status/next commands.
5. Add canonical scientific gate events and make Workflow routing consume them.
6. Separately add exact Quest import/export mapping and coordinated source-admin refusal after gate behavior is proven.
7. Add managed pilot mappings using the same normalized package identity and instruction digest.
8. Run required A/B/C cases.
9. Decide whether to migrate additional skills.

### Rollback

- remove project-local pilot selection to return to existing 1.0.0 resolution;
- preserve all historical activations;
- do not delete canonical Research state;
- do not switch Quest writer automatically;
- if Quest authority already moved, perform explicit verified export and authority transfer before restoring source writes.

## 14. Rejected Designs

### Giant Procedure pack

Rejected: recreates the context, artifact, and validator overhead that source simplification removed.

### Giant orchestration command

Rejected: moves the same hidden workflow from Markdown into code. Commands remain deterministic and small.

### Every invocation uses Dispatch

Rejected: adds Approval, worker, context, and recording overhead to bounded work without corresponding value.

### Two independent light/managed skill bodies

Rejected: creates methodology drift. Both profiles resolve one package.

### Generic Approval represents H1/H2

Rejected: operational authority and scientific selection are different decisions.

### Dual Quest writers

Rejected: creates immediate state drift and ambiguous recovery.

## 15. Main Risks

- Source skills are currently dirty and still changing; importing ambient bytes would make the pilot unreproducible.
- Existing capability activation mode may be mistaken for invocation policy.
- New package schema may accidentally duplicate Procedure resolution instead of normalizing it.
- Lightweight execution could silently mutate managed Quest state unless root recording stays explicit.
- Managed evaluation could over-dispatch if independence requirements are copied indiscriminately.
- Workflow graph could grow into a second methodology layer unless schema validation forbids prompt content.
- Compatibility tests contain exact registry and digest oracles; package/version changes require deliberate updates.
