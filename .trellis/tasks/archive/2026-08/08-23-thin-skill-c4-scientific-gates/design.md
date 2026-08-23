# C4 Scientific Gates Technical Design

## Design Boundary

C4 adds canonical scientific authority only:

```text
explicit operator decision
→ one append-only gate event
→ replay-derived effective gate state
→ read-only status/next
→ later explicit Workflow transition
```

C4 never imports Quest source files, parses scientific Artifact content, invokes execution, grants operational Approval, or changes writer authority.

Existing C3 seams remain primary:

- Workflow definitions already carry canonical `requiredGateIds`.
- Transition payloads already reserve `gateRecordIds`.
- `workflow next` already reports `missingGateIds`.
- Store/reducer deliberately block gated transitions until canonical gate state exists.

No parallel workflow path is added.

## 1. Canonical Types

Add closed public Research types:

```ts
export type ScientificGateRecordId = `gtr_${string}`;
export type ScientificGateId = "H1" | "H2";
export type ScientificGateDecision = "approve" | "reject";

export interface ScientificGateRecord {
  id: ScientificGateRecordId;
  questId: QuestId;
  workflowInstanceId: WorkflowInstanceId;
  workflowId: string;
  workflowVersion: string;
  workflowDigest: `sha256:${string}`;
  nodeId: string;
  gateId: ScientificGateId;
  decision: ScientificGateDecision;
  actor: string;
  rationale: string;
  approvedRefs: string[];
  rejectedRefs: string[];
  evidenceRefs: ArtifactId[];
  sourceArtifactId?: ArtifactId;
  recordedAt: string;
}
```

`gtr_` uses existing UUID-backed Research ID style. No public generic ID constructor is added beyond typed gate-record creation/parsing.

### Ref semantics

- `approvedRefs` / `rejectedRefs` identify scientific items. Example: `candidate:C1`.
- They remain exact non-empty strings because C1 did not freeze one prefix grammar.
- Require each ref to equal its trimmed value. Preserve input order and decoded value. Reject empty, padded, duplicate, or cross-set-overlapping values using exact case-sensitive equality.
- Require at least one value across approved/rejected sets.
- `evidenceRefs` are canonical `ArtifactId` values. Normalize them to unique lexical order because evidence order carries no scientific meaning.
- Require at least one evidence Artifact.
- `sourceArtifactId`, when present, must also appear in normalized `evidenceRefs`.

C4 does not validate scientific-ref universe membership or total coverage. No canonical candidate/opportunity universe exists. Parsing Artifact bytes would pull source-schema/cutover work into C4. C4b owns that future validation.

## 2. Event Contract

Extend closed schema v3 additively:

```text
kind: scientific-gate.recorded
aggregate.type: scientific-gate
aggregate.id: gtr_...
payload: ScientificGateRecord
```

Keep schema-v1/v2 kind/ref branches unchanged. Keep existing `RESEARCH_WORKFLOW_EVENT_SCHEMA_VERSION` export to avoid unrelated API churn.

Gate-event relations use deterministic order:

1. owning Quest;
2. bound Workflow instance;
3. normalized evidence Artifacts in Artifact-ID order;
4. optional source Artifact only when not already represented.

Because source Artifact must be an evidence member, relation list normally contains no extra duplicate source relation. Payload still retains `sourceArtifactId` role.

Transition-event relations extend additively:

1. owning Quest;
2. satisfying gate records in transition `requiredGateIds` order.

Historical C3 transitions keep empty `gateRecordIds` and existing one-Quest relation shape.

## 3. State and Effective Scope

Add replay-owned state:

```ts
scientificGateRecords: Record<ScientificGateRecordId, ScientificGateRecord>;
scientificGateRecordIdsByWorkflowInstanceId:
  Partial<Record<WorkflowInstanceId, ScientificGateRecordId[]>>;
effectiveScientificGateRecordIdByScope:
  Record<string, ScientificGateRecordId>;
```

Effective key is exact:

```text
<workflowInstanceId>\0<nodeId>\0<gateId>
```

Use one internal helper to construct key. NUL separator avoids ambiguous concatenation. Public status returns structured fields, never scope-key strings.

Reduction order defines latest decision:

```text
for each valid scientific-gate.recorded event in sequence:
  append record ID to instance history
  effective[exact scope] = record ID
```

History is append-only. Effective map is derived index, not independent authority.

## 4. Gate Mutation Construction

Add typed Core mutation:

```ts
{
  kind: "scientific-gate.record";
  recordId: ScientificGateRecordId;
  workflowInstanceId: WorkflowInstanceId;
  gateId: ScientificGateId;
  decision: ScientificGateDecision;
  actor: string;
  rationale: string;
  approvedRefs: readonly string[];
  rejectedRefs: readonly string[];
  evidenceRefs: readonly ArtifactId[];
  sourceArtifactId?: ArtifactId;
  workflow: ParsedResearchWorkflowDefinitionV1;
}
```

Store validates before draft creation:

1. Workflow instance exists and is active.
2. Supplied parsed definition matches bound ID/version/digest.
3. Current node is completed.
4. Requested H1/H2 appears on at least one outgoing transition from current node.
5. Actor/rationale are trim-nonempty; original values survive.
6. Scientific refs are trim-nonempty, duplicate-free, disjoint, and non-empty in aggregate.
7. Evidence refs are unique after canonical normalization.
8. Every evidence Artifact exists, belongs to instance Quest, and appears as `artifact:<id>` in current completion accepted refs.
9. Optional source Artifact passes same checks and appears in evidence set.
10. Mutation creates one gate event only.

Gate mutation does not consult operational Approval, Dispatch, Result status, Quest stage, filesystem decision Markdown, model output, or provider state.

## 5. Reducer Replay Invariants

`scientific-gate.recorded` replay independently enforces:

- aggregate ID equals record ID;
- record ID is unique and well-formed;
- Quest and Workflow-instance relations match payload;
- instance exists, remains active at event sequence, and exact binding matches;
- payload node equals completed current node at event sequence;
- requested gate is H1/H2;
- actor/rationale and scientific-set invariants hold;
- evidence/source Artifact ownership and completion containment hold;
- payload `recordedAt` equals event timestamp;
- relation order/content matches canonical payload-derived relations.

Valid reduction stores record, appends instance history, updates exact effective scope, and advances entity sequence keys for record plus `scientific-gate:<questId>`.

Invalid event fails ledger reduction. Reducer never silently skips invalid gate history.

## 6. Workflow Transition Consumption

Replace C3 unconditional gate block in existing transition mutation path.

For selected transition:

```text
for requiredGateId in transition.requiredGateIds:
  recordId = effective[instance + fromNode + requiredGateId]
  record = scientificGateRecords[recordId]
  require record.decision == approve
  append recordId
```

`requiredGateIds` is already canonical H1/H2 order. Transition payload must preserve derived record-ID order. Existing parser must stop lexically sorting `gateRecordIds`; it still rejects empty strings and duplicates.

Store enforces exact equality between definition requirements and derived satisfying records.

Reducer cannot resolve external Workflow definition during replay. It enforces payload-local invariants:

- every referenced gate record exists;
- every record is `approve`;
- every record binds same instance and `fromNodeId`;
- gate IDs are unique;
- record order is H1 before H2;
- transition relations match payload IDs in same order.

Later gate decisions cannot alter historical transition. Transition event freezes records that satisfied it when appended.

## 7. Projection

Add per-Quest projection:

```text
.trellis/research/quests/<questId>/gates.json
```

Shape:

```ts
interface QuestScientificGateProjection {
  schemaVersion: 1;
  questId: QuestId;
  records: ScientificGateRecord[];
  effective: Array<{
    workflowInstanceId: WorkflowInstanceId;
    nodeId: string;
    gateId: ScientificGateId;
    recordId: ScientificGateRecordId;
  }>;
  updatedAt: string;
}
```

Rules:

- `records`: Quest gate events in ledger order.
- `effective`: exact scopes sorted by instance ID, node ID, then H1/H2.
- `updatedAt`: timestamp from `entitySeq["scientific-gate:<questId>"]`.
- Write file only when Quest has gate records.
- Rebuilding historical C3 ledger with no gate records does not create `gates.json` or change `workflow.json`.
- Recursive stable JSON serializer remains authoritative.

## 8. CLI Design

Add focused `gate-command.ts`; do not refactor C3 Workflow command helpers unless implementation proves direct reuse is smaller and impact analysis permits it.

### Record

```text
trellis research gate record \
  --instance <wfi-id> \
  --gate <H1|H2> \
  --decision <approve|reject> \
  --actor <label> \
  --rationale <text> \
  [--approved-ref <scientific-ref>...] \
  [--rejected-ref <scientific-ref>...] \
  --evidence-ref <artifact:art-id>... \
  [--source-artifact <artifact:art-id>] \
  [--idempotency-key <key>] \
  [--dry-run] [--write] [--json]
```

Quest/workflow/node identity derives from bound instance. Redundant flags are omitted.

Execution contract:

- reject `--dry-run + --write` before root resolution;
- default preview validates through read-only batch path;
- explicit `--write` commits one event;
- output includes exact event/record and `committed | preview | replayed` state;
- command returns after gate record; no follow-up action.

### Status

```text
trellis research gate status --instance <wfi-id> [--json]
```

Result includes:

- instance Quest/workflow/version/digest/status/current node/completion;
- gates declared by current node outgoing transitions;
- ledger-order history for whole instance;
- effective H1/H2 records for current node;
- no inferred legal transition selection.

Status uses read-only state/ledger APIs. No lock, rebuild, or projection write.

### Workflow next

Keep existing stop ordering and output fields. Derive each transition's missing gates from effective canonical records. Add satisfying record IDs where useful without removing existing fields. If one or more edges become legal, stop reason remains operator-selection-required; no edge is selected.

## 9. Idempotency

Reuse strict C3 CLI ownership pattern without broad Core semantic change.

Same key replays only when exactly one event matches:

- schema version and `scientific-gate.recorded` kind;
- target instance and gate;
- decision;
- exact actor/rationale;
- exact ordered approved/rejected refs;
- normalized evidence refs;
- optional source Artifact.

Existing record ID and timestamp are first-write generated values. Replay returns existing event rather than comparing newly generated values.

Any command-family, target, field, array-order, or event-count mismatch returns `IDEMPOTENCY_KEY_CONFLICT` and appends nothing.

## 10. Error Mapping

Use stable CLI code:

```text
research_gate_invalid
```

Map malformed gate command, inactive/incomplete/undeclared scope, scientific-set failures, evidence ownership/containment failures, and source Artifact failures to this code with specific message/details.

Keep:

- `IDEMPOTENCY_KEY_CONFLICT` for replay ownership mismatch;
- `research_workflow_transition_blocked` for missing/rejected gate during transition;
- existing Workflow resolution errors for missing/mismatched bound definitions.

Every failure path is zero-write.

## 11. Compatibility

- Schema-v1/v2 event kind/ref sets unchanged.
- Existing schema-v3 Workflow event bytes unchanged.
- Existing ungated transition payloads remain `gateRecordIds: []`.
- Removing lexical sort changes only previously impossible non-empty gate-record payloads.
- `workflow.json` bytes unchanged for historical ledgers.
- No changes to Procedure/Skill resolver, Activation/Approval, Dispatch, worker, provider, source Skill repository, Quest mapping, or writer authority.
- Public additions export only through `@mindfoldhq/trellis-core/research`.

## 12. Trade-offs

### Scientific refs remain opaque in C4

Chosen because C1 separates scientific IDs from evidence Artifacts, while C4 lacks canonical candidate universe. Result/Artifact-only selections would rewrite scientific meaning. Parsing evidence bytes would expand C4 into C4b.

Cost: membership and total coverage remain deferred and explicitly unclaimed.

### Inline command fields replace decision file

Chosen to match existing deterministic Commander mutation style and avoid new file parser/format. Canonical record remains durable; no duplicate decision document required.

Cost: large selection sets require repeated flags. Pilot remains small and bounded.

### Separate `gates.json`

Chosen to avoid changing C3 `workflow.json` bytes and keep authority view focused.

Cost: status reads Workflow state plus gate state. Both derive from same ledger, so no dual authority exists.

### Additive schema v3 kind

Chosen because gate is direct continuation of C3 Workflow contract and old schema branches remain closed.

Cost: existing exported schema-v3 constant name stays Workflow-specific until separate compatibility-safe cleanup.

## 13. Rollback

Before any gate event exists:

- remove command, event kind, state, projection, and transition integration.

After gate events exist:

- preserve parser, reducer, records, transition refs, and projection forever;
- disable new `gate record` writes if needed;
- keep status/rebuild readable;
- never delete or rewrite gate history.

No C4 rollback transfers Quest authority or changes source files.
