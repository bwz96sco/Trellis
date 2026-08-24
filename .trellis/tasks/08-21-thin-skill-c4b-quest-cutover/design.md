# C4b Research Quest Cutover Design

## Boundary

C4b adds deterministic compatibility import/export plus explicit writer transfer. It extends canonical Research state; it does not execute research work.

```text
frozen source YAML/JSONL/artifacts
  -> exact preview plan + token
  -> fail-closed source-write fence
  -> one typed canonical import/cutover batch
  -> committed projections
  -> Trellis sole writer

Trellis canonical state
  -> source-compatible export + loss report
  -> frozen-source validation + mapped comparison
  -> explicit transfer event
  -> projection says source writer
  -> source mutations resume
```

## 1. Source Boundary

Implementation reads source contract bytes only from C1:

```text
.trellis/tasks/08-21-thin-skill-c1-freeze-contracts/
  research/source-baseline/manifest.json
  research/source-baseline/files/...
```

The manifest authenticates every consumed parser/template/validator input. Mutable `/Users/.../agent-skills-private` paths are not runtime or implementation dependencies. Coordinated source-admin modification, if separately authorized, must be based on the frozen helper contract and verified against a fixture; changed source semantics require a forward baseline task.

## 2. Additive Canonical Types

Names are provisional only where current code naming requires adaptation; field semantics are fixed.

```ts
export type QuestImportRecordId = `qir_${string}`;
export type QuestImportMilestoneId = `qim_${string}`;
export type QuestRouteSnapshotId = `qrs_${string}`;
export type QuestScientificUniverseId = `qsu_${string}`;
export type QuestWriterTransferId = `qwt_${string}`;
export type QuestExportRecordId = `qex_${string}`;

export interface QuestSourceIdentity {
  sourceQuestId: string;
  projectSlug: string;
  sourceQuestPath: string;       // normalized project-relative path
  sourceEventsPath?: string;     // normalized project-relative path
}

export interface QuestSourceSnapshot {
  sourceSchemaVersion: string;
  yamlDigest: `sha256:${string}`;
  eventsDigest?: `sha256:${string}`;
  snapshotDigest: `sha256:${string}`;
}

export interface QuestImportRecord {
  id: QuestImportRecordId;
  questId: QuestId;
  sourceIdentity: QuestSourceIdentity;
  sourceSnapshot: QuestSourceSnapshot;
  sourceStatus: string;
  sourceActiveStage: string;
  sourceExtensions: Record<string, unknown>;
  artifactIds: ArtifactId[];
  claimIds: ClaimId[];
  importedAt: string;
}

export interface QuestOwnerBinding {
  name: string;
  ownerSkill: string;
  artifactId: ArtifactId;
}

export interface QuestRouteBranch {
  id: string;
  status: string;
  ownerSkill: string;
  objective: string;
  expectedArtifactId?: ArtifactId;
  sourceFields: Record<string, unknown>;
}

export interface QuestRouteDecision {
  id: string;
  verdict: string;
  rationale: string;
  evidenceArtifactIds: ArtifactId[];
  sourceFields: Record<string, unknown>;
}

export interface QuestRouteNextAction {
  ownerSkill: string;
  action: string;
  acceptanceGate: string;
  expectedArtifactId?: ArtifactId;
}

export interface QuestRouteSnapshot {
  id: QuestRouteSnapshotId;
  questId: QuestId;
  importRecordId: QuestImportRecordId;
  firstReadArtifactIds: ArtifactId[];
  ownerBindings: QuestOwnerBinding[];
  branches: QuestRouteBranch[];
  openQuestions: string[];
  blockers: string[];
  currentDecision?: QuestRouteDecision;
  nextAction?: QuestRouteNextAction;
  legacyNextActionText?: string;
  legacyBoard?: Record<string, unknown>;
  sourceExtensions: Record<string, unknown>;
  recordedAt: string;
}

export interface QuestScientificUniverse {
  id: QuestScientificUniverseId;
  questId: QuestId;
  importRecordId: QuestImportRecordId;
  gateId: ScientificGateId;      // H1=opportunity, H2=candidate
  refKind: "opportunity" | "candidate";
  refs: string[];                // exact source order
  sourceArtifactIds: ArtifactId[];
  sourceSnapshotDigest: `sha256:${string}`;
  universeDigest: `sha256:${string}`;
  recordedAt: string;
}

export interface QuestImportMilestone {
  id: QuestImportMilestoneId;
  questId: QuestId;
  importRecordId: QuestImportRecordId;
  sourceEventId: string;
  sourceLine: number;
  reviewed: true;
  timestamp: string;
  actor: string;
  eventType: string;
  milestone: string;
  stage?: string;
  summary: string;
  artifactIds: ArtifactId[];
  evidenceArtifactIds: ArtifactId[];
  claimIds: ClaimId[];
  sourcePayload: Record<string, unknown>;
  sourceExtensions: Record<string, unknown>;
}

export interface QuestWriterAuthority {
  questId: QuestId;
  writer: "trellis" | "source";
  sourceSnapshotDigest: `sha256:${string}`;
  recordedEventId: EventId;
}

export interface QuestWriterTransfer {
  id: QuestWriterTransferId;
  questId: QuestId;
  from: "trellis" | "source";
  to: "trellis" | "source";
  sourceSnapshotDigest: `sha256:${string}`;
  exportDigest?: `sha256:${string}`;
  actor: string;
  rationale: string;
  recordedAt: string;
}

export interface QuestExportRecord {
  id: QuestExportRecordId;
  questId: QuestId;
  sourceSnapshotDigest: `sha256:${string}`;
  exportDigest: `sha256:${string}`;
  mappedStateDigest: `sha256:${string}`;
  validatorDigest: `sha256:${string}`;
  lossReportDigest: `sha256:${string}`;
  validated: true;
  recordedAt: string;
}
```

`QuestExportRecord` is recorded only after output validation and mapped comparison succeed. Export preview/write alone never changes `QuestWriterAuthority`.

## 3. State and Projection Indexes

Extend `ResearchState` additively:

```ts
questImportRecords: Record<QuestImportRecordId, QuestImportRecord>;
questImportRecordIdsByQuestId: Partial<Record<QuestId, QuestImportRecordId[]>>;
latestQuestImportRecordIdByQuestId: Partial<Record<QuestId, QuestImportRecordId>>;
questRouteSnapshots: Record<QuestRouteSnapshotId, QuestRouteSnapshot>;
latestQuestRouteSnapshotIdByQuestId: Partial<Record<QuestId, QuestRouteSnapshotId>>;
questScientificUniverses: Record<QuestScientificUniverseId, QuestScientificUniverse>;
latestQuestScientificUniverseIdByScope: Record<string, QuestScientificUniverseId>;
questImportMilestones: Record<QuestImportMilestoneId, QuestImportMilestone>;
questImportMilestoneIdsByQuestId: Partial<Record<QuestId, QuestImportMilestoneId[]>>;
questWriterTransfers: Record<QuestWriterTransferId, QuestWriterTransfer>;
questWriterTransferIdsByQuestId: Partial<Record<QuestId, QuestWriterTransferId[]>>;
questWriterAuthorityByQuestId: Partial<Record<QuestId, QuestWriterAuthority>>;
questExportRecords: Record<QuestExportRecordId, QuestExportRecord>;
questExportRecordIdsByQuestId: Partial<Record<QuestId, QuestExportRecordId[]>>;
```

Universe scope key is exact:

```text
<questId>\0<gateId>
```

Per-Quest projections:

```text
.trellis/research/quests/<questId>/import.json
.trellis/research/quests/<questId>/route.json
.trellis/research/quests/<questId>/milestones.json
.trellis/research/quests/<questId>/scientific-universes.json
.trellis/research/quests/<questId>/writer.json
.trellis/research/quests/<questId>/exports.json
```

Projection arrays preserve ledger/source order where contractually meaningful. Lookup maps and effective scopes sort structurally. Historical Quests with no C4b events produce none of these files.

## 4. Typed Event and Mutation Contract

Extend closed Research schema-v3 with typed kinds:

```text
quest.import.recorded
quest.import.milestone-recorded
quest.route.recorded
quest.scientific-universe.recorded
quest.export.recorded
quest-writer.transferred
```

Typed store mutations:

```text
quest.import.record
quest.import.milestone
quest.route.set
quest.scientific-universe.record
quest.export.record
quest-writer.transfer
```

Import write uses one `commitResearchBatch` call. Event order is fixed:

```text
artifact registrations
-> quest create/status/stage as required
-> claim create/status as required
-> quest.import.recorded
-> quest.route.recorded
-> H1 universe, then H2 universe
-> source-order milestone events
-> quest-writer.transferred(source -> trellis)
```

Relations bind exact Quest, import record, Artifact, Claim, universe, route, milestone, export, and transfer IDs in deterministic role order. Parsers and reducers independently validate aggregates, relations, ownership, ordered uniqueness, and referenced state.

Generic raw append and event rewriting remain forbidden.

## 5. Source Parsing and Mapping

### 5.1 Closed authoritative fields

Supported authoritative fields use exact tables in `.trellis/spec/core/backend/research-state.md`. Unknown authoritative value/type is a conflict. Unknown non-authoritative keys are preserved at their owning object under `sourceExtensions`.

### 5.2 Paths and ArtifactRefs

- Resolve against source Quest project root.
- Require normalized relative contained paths.
- Reject absolute, empty, escaping, malformed, duplicate-role-conflicting, directory, or unsupported link paths.
- Register exact repository/path/revision/digest when bytes exist.
- Preserve source ordering in route/milestone arrays.
- Do not silently convert missing expected outputs into existing Artifacts.

### 5.3 Stable scientific refs

Frozen source validator-compatible structures are the sole extraction authority. Import accepts only explicit stable refs. H1 and H2 universes are separate.

Canonical universe digest:

```text
SHA256(
  UTF8("trellis-research-scientific-universe-v1\0")
  || frame(UTF8(questId))
  || frame(UTF8(gateId))
  || frame(UTF8(sourceSnapshotDigest))
  || frame(stableResearchJson(refs))
  || frame(stableResearchJson(sourceArtifactIds))
)
```

`frame(bytes) = uint64-big-endian(byteLength) || bytes`.

No free-form text extraction. Missing explicit universe when decision state exists is `research_quest_import_conflict`.

## 6. Preview Token and Replay

Build a canonical `QuestImportPlanV1` containing:

- command family and contract version;
- canonical absolute source paths used only for source-drift binding;
- source byte digests and snapshot digest;
- resolved repository/Quest identity;
- full ordered event/mutation plan excluding event IDs/timestamps;
- conflicts, extension inventory, and loss report digest;
- frozen parser/validator manifest digest.

For a new Quest, build the semantic plan first, then derive the proposed Quest ID and every C4b-owned entity ID deterministically from the semantic-plan digest plus typed role/ordinal domains. Artifact/Claim IDs likewise derive from exact source identity plus stable source path/ID. Existing Quest/entity matches reuse canonical IDs. Any deterministic-ID collision with different canonical content is an import conflict. This makes preview and write independently reproduce the same IDs without persisting preview state.

Token:

```text
qip_<base64url(
  SHA256(
    UTF8("trellis-research-quest-import-preview-v1\0")
    || frame(stableResearchJson(plan))
  )
)>
```

Import write rereads and replans. Any mismatch returns `research_quest_source_drift`. Canonical store idempotency key derives from exact token:

```text
research-quest-import:<preview-token>
```

Replay requires exactly the same event family/order/aggregates/payload plan. Generated IDs and timestamps are taken from existing events on replay; unrelated or partial ownership returns `IDEMPOTENCY_KEY_CONFLICT`.

## 7. Gate Membership and Coverage

C4 record payload remains unchanged.

When recording a gate for a Quest with current universe:

1. Resolve current universe for exact Quest + gate ID.
2. Require gate record source node/instance still meets C4 rules.
3. Require every approved/rejected ref in universe.
4. Require each universe ref appears exactly once across both sets.
5. Record existing C4 event.

When checking transition satisfaction:

1. Resolve current universe.
2. Resolve effective C4 gate record for instance/node/gate.
3. Compare existing `entitySeq` entries for the universe aggregate and gate-record aggregate; require gate record occurred after current universe event in ledger order.
4. Recheck exact membership/coverage against current universe.
5. Require decision `approve`.

Thus an imported/re-imported universe invalidates older gate satisfaction without mutating old records. Operator records a new gate against new universe.

Quests without a C4b universe retain C4 structural semantics for historical compatibility. A C4b-imported Quest that requires H1/H2 cannot omit its corresponding universe.

## 8. Single-Writer State Machine

Legal authority transitions:

```text
(no import state / source writer)
  -- successful exact import + fence --> trellis writer

trellis writer
  -- current validated export --> source writer

source writer with existing import
  -- current exact re-import + fence --> trellis writer
```

No direct dual, unknown, or inferred state exists.

### 8.1 Transfer to Trellis

For the standalone frozen CLI signature, supplied `--export-digest` must equal the successful import record's `sourceSnapshotDigest`. This is compatibility syntax for the already-frozen command shape; it does not create or claim a validated export.

1. Complete read-only parse, mapping, conflict, universe, and replay checks.
2. Acquire normal Research mutation lock.
3. Reread source bytes and authority state.
4. Create cutover fence atomically under Trellis root before ledger append.
5. Reread source bytes once more after fence visibility.
6. Append exact import and `source -> trellis` transfer batch.
7. Rebuild/write projections.
8. Verify `writer.json` names exact transfer event and snapshot digest.
9. Remove fence atomically.
10. Return committed/replayed result; invoke nothing else.

If step 6–8 fails, retain fence. Recovery rebuilds canonical projections and removes fence only after committed `writer=trellis` is verified, or removes fence if no authority event was committed and source state remains unchanged.

### 8.2 Transfer to Source

1. Resolve latest validated export record.
2. Require supplied export digest equals that record and mapped state digest equals current canonical mapped state.
3. Append `trellis -> source` transfer event.
4. Write and verify `writer.json` with source writer.
5. Only source-admin reading that committed projection may resume writes.

Projection failure remains fail-closed because previous `writer=trellis` projection continues denying source writes.

### 8.3 Guard lookup

Source admin first resolves `TRELLIS_RESEARCH_ROOT` when set: normalize it, require an existing valid Trellis Research control/runtime root, and require its Repository authority to match the source before mutation. When unset, ancestor discovery remains the fallback; if no ancestor exists but a sibling Trellis root can own or identify the source, the guard fails closed and requires the explicit root. It then scans/reads C4b authority projections and cutover fence, matching normalized source Quest path plus preserved source identity. Zero matches are allowed only for a source known by the selected root to be never imported. Multiple matches, malformed projection, active fence, source-mismatched explicit root, or imported identity without readable authority fail closed.

Guard order:

```text
resolve mutation target
-> locate Trellis root
-> inspect cutover fence
-> resolve unique authority projection
-> refuse unless effective writer=source or Quest was never imported
-> only then open/create/replace source files
```

Read-only status/validation skips write authorization but may report authority.

## 9. Export and Validation

Export plan derives source YAML/JSONL from canonical state plus preserved source scalars/extensions. It emits:

```text
<target>/research-quest.yaml
<target>/research-events.jsonl   # when milestones exist
<target>/research-export-loss.json
<target>/research-export-loss.md
<target>/<canonical source-relative Artifact path>  # every YAML/JSONL reference and frozen H1/H2 requirement
```

Target contract:

- the complete inventory is the control-output set plus exact canonical bytes for every referenced or validator-required Artifact, all at normalized contained source-relative paths;
- preview: no directory creation;
- write: target must be nonexistent or contain none of planned output paths;
- any differing collision fails before first mutation;
- an existing complete target whose exact path/byte inventory matches the plan is read-only replay/recovery input, not overwrite authority;
- otherwise write to sibling temp directory, validate all bytes, compare mapped content, then atomically rename to target;
- cleanup only C4b-owned temp path on pre-publish failure.

Export digest covers sorted relative output paths and exact bytes with length framing. Loss report distinguishes:

- exact round-trip fields;
- normalized-but-equivalent fields;
- canonical Trellis-only fields omitted from source format;
- preserved unknown extensions;
- unsupported/lossy fields, which block writer transfer unless loss is zero for all authoritative mapped state.

Validation uses the frozen C1 source validator contract. A written export is canonical transfer evidence only after validator success plus canonical mapped-state comparison and `quest.export.recorded` commit. If target publication succeeds but event commit fails, a retry may authenticate the exact complete existing target, append only the missing export record, and perform no target write; mismatched or extra bytes still fail as collision.

## 10. CLI Results and Stable Errors

Commands return deterministic structured result objects. Minimum stable errors:

```text
research_quest_source_drift
research_quest_import_conflict
research_quest_transfer_unverified
IDEMPOTENCY_KEY_CONFLICT
```

Use existing invalid-flag/root/lock/projection errors where they already own behavior. Add focused errors only for invalid source schema, target collision, authority conflict, or source-admin denial if existing codes cannot express them without ambiguity.

Every command returns after its own operation. Import/export/transfer never chain to Workflow, gate, Skill, model, provider, or worker commands.

## 11. Compatibility

- Existing `Quest`, `Claim`, `ArtifactRef`, gate record, Workflow instance, Activation/Approval, and historical event fields retain meaning.
- C4 gate payload and IDs remain byte-compatible.
- New state maps initialize empty; historical projection fixtures stay unchanged.
- Quests without C4b events have no writer restriction beyond existing source behavior.
- Existing source read-only validation remains available.
- No source methodology or package migration occurs.

## 12. Trade-offs

### Append snapshots, not mutable route rows

Chosen: each import appends route/universe/milestone/import records. This matches ledger authority and makes rebuild/rollback auditable. Cost: more canonical records than overwriting one route object.

### Fail-closed fence for cross-filesystem cutover

Chosen: temporary deny-only fence before authority commit. A filesystem and append-only ledger cannot be updated in one native atomic operation; fence removes dual-write window without granting authority outside ledger. Cost: failed cutover may require explicit recovery before source writes resume.

### Explicit stable IDs only

Chosen: block import when candidate/opportunity universe lacks stable IDs. Guessing IDs from Markdown would make C4 coverage look authoritative while changing scientific identity.

### No overwrite flag in C4b export

Chosen: honor frozen CLI signature. Existing output collision fails before mutation; operator chooses a new/empty target. This avoids adding unfrozen destructive authority.

## 13. Rollback

Before implementation commit: remove only C4b-owned product/test/spec changes and any C4b temp fixture state.

After Trellis cutover: never delete ledger events or flip files manually. Use validated export plus explicit transfer to source. If cutover failed mid-flight, keep source denied, rebuild canonical projection, inspect whether transfer event committed, then complete or cancel fence recovery according to ledger truth.

Source-admin guard deployment must be coordinated with Trellis C4b support. Do not claim single-writer completion when only Trellis-side import exists.
