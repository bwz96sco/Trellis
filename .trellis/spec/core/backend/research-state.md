# Research State and Deterministic Store

This spec applies to `packages/core/src/research/**` and the public
`@mindfoldhq/trellis-core/research` subpath. It covers domain state, ledger
storage, projections, lifecycle validation, portable repository/artifact
references, and the cross-command protection boundary for canonical tracked
research. CLI command details, workflow selection, hooks, and dispatch
orchestration remain separate contracts.

## 1. Scope / Trigger

Use this spec when changing any of these contracts:

- Quest, Campaign, Run, Evidence, Claim, repository, artifact, dispatch, result,
  proposal, or decision types.
- Research event parsing, reduction, transition validation, or batch commit.
- `.trellis/research/events.jsonl` or tracked projection layout.
- `.trellis/.runtime/research` lock, sequence, or projection cache behavior.
- Immutable Research capability selection and execution-host validation.
- Strict Procedure parsing, project-policy validation, exact digests, effective authority, and automatic eligibility.
- `@mindfoldhq/trellis-core/research` exports.

Authority rules:

1. `.trellis/research/events.jsonl` is canonical research-state authority.
2. Tracked JSON files are deterministic projections. Never treat manual edits as
   state mutations.
3. Human-authored Markdown, code, data, and figures remain artifact content.
   Research state stores pointers and optional digests, not copied bodies.
4. Core exposes validated domain mutations. It must not expose a generic raw
   append API.
5. Core stays independent of CLI rendering, hooks, Task lifecycle, and Mempal.

Tracked layout:

```text
.trellis/research/
  events.jsonl
  workspace.json
  repositories.json
  quests/<qst-id>/quest.json
  campaigns/<cmp-id>/campaign.json
  runs/<run-id>/run.json
  evidence/<evd-id>/evidence.json
  claims/<clm-id>/claim.json
```

Disposable runtime layout:

```text
.trellis/.runtime/research/
  write.lock
  seq
  projection-cache.json
```

### Mixed-ledger rollout scope

C02 implements strict schema-v1/schema-v2 activation and approval reading, reduction, and rebuild support. C03 implements immutable capability selection. C04 implements pure Procedure/policy parsing, digests, effective authority, and automatic eligibility without emit authority. C05 adds typed activation planning, approval grant, and approval revocation emitters plus pure Dispatch request/scope bindings. C06 later adds Context gating and atomic approval consumption. Existing v1 entities, mappings, and projection schemas remain compatibility authority.

## 2. Signatures

Public imports must use the package subpath:

```ts
import {
  commitResearchBatch,
  getResearchStatus,
  readResearchLedger,
  readResearchState,
  rebuildResearchProjections,
  validateResearchBatch,
} from "@mindfoldhq/trellis-core/research";
```

Supported store signatures:

```ts
function readResearchLedger(root: string): Promise<ResearchEvent[]>;
function readResearchState(root: string): Promise<ResearchState>;
function getResearchStatus(root: string): Promise<ResearchStatus>;
function validateResearchBatch(
  input: CommitResearchBatchInput,
): Promise<ResearchBatchValidation>;
function commitResearchBatch(
  input: CommitResearchBatchInput,
): Promise<ResearchCommitResult>;
function rebuildResearchProjections(root: string): Promise<void>;
```

Commit contract:

```ts
interface CommitResearchBatchInput {
  root: string;
  mutations: readonly ResearchMutation[];
  actor: { type: "agent" | "user" | "system"; id: string };
  provenance: { source: string; sourceId?: string };
  idempotencyKey: string;
  timestamp?: string; // ISO-8601; defaults to current time
  artifactRepositoryRoots?: Readonly<Partial<Record<RepositoryId, string>>>;
  // Optional absolute, machine-local roots used only for digest reads. Never stored.
}

interface ResearchCommitResult {
  events: ResearchEvent[];
  headSeq: number;
  replayed: boolean;
}

interface ResearchStatus {
  headSeq: number;
  eventCount: number;
  projectedThroughSeq: number;
  projectionStale: boolean;
}

interface NormalizedDispatchScopeV1 {
  readonly schemaVersion: 1;
  readonly dispatchId: DispatchId;
  readonly repository: Readonly<{
    id: RepositoryId;
    resolvedRoot: string;
    locator: string;
    expectedRemote?: string;
    observedRemote?: string;
    headRevision?: string;
  }>;
  readonly artifacts: readonly Readonly<{
    id: ArtifactId;
    repositoryId: RepositoryId;
    path: string;
    resolvedPath: string;
    revision?: string;
    sha256?: string;
  }>[];
  readonly allowedWritePaths: readonly Readonly<{
    declaredPath: string;
    resolvedPath: string;
  }>[];
}

function digestDispatchRequest(dispatch: Dispatch): string;
function hashDispatchScope(scope: NormalizedDispatchScopeV1): string;

type C05ResearchMutation =
  | { kind: "activation.plan"; activation: ResearchActivation }
  | { kind: "approval.grant"; approval: ResearchApprovalGrant }
  | {
      kind: "approval.revoke";
      approvalId: ApprovalId;
      revokedAt: string;
      reason: string;
    };
```

Event and projection envelopes:

```ts
const RESEARCH_SCHEMA_VERSION = 1;       // entity/projection/v1-event authority
const RESEARCH_EVENT_SCHEMA_VERSION = 2; // activation/approval events only

interface ResearchSchemaV1Event {
  schemaVersion: 1;
  eventId: `evt_${string}`;
  seq: number; // positive, globally contiguous, starts at 1
  timestamp: string; // existing v1 ISO compatibility remains unchanged
  kind: ResearchEventKind; // exact existing 21-kind union
  aggregate: ResearchAggregateRef; // existing 12 aggregate types only
  related: ResearchAggregateRef[];
  payload: Record<string, unknown>;
  actor: { type: "agent" | "user" | "system"; id: string };
  idempotencyKey: string;
  provenance: { source: string; sourceId?: string };
}

interface ResearchSchemaV2Event {
  schemaVersion: 2;
  eventId: `evt_${string}`;
  seq: number;
  timestamp: string; // exactly YYYY-MM-DDTHH:mm:ss.sssZ
  kind:
    | "activation.planned"
    | "approval.granted"
    | "approval.revoked"
    | "approval.consumed";
  aggregate: ResearchSchemaV2AggregateRef; // v1 types plus activation/approval
  related: ResearchSchemaV2AggregateRef[];
  payload: Record<string, unknown>;
  actor: { type: "agent" | "user" | "system"; id: string };
  idempotencyKey: string;
  provenance: { source: string; sourceId?: string };
}

type ResearchEvent = ResearchSchemaV1Event | ResearchSchemaV2Event;

interface Projected<T> {
  schemaVersion: 1;
  projectedThroughSeq: number;
  updatedAt: string;
  data: T;
}
```

IDs use `crypto.randomUUID()` plus prefixes:

```text
wsp_ rep_ art_ qst_ cmp_ run_ evd_ clm_ evt_ dsp_ res_ prp_ dec_ act_ apr_
```

`packages/core/package.json` must declare `./research`. Do not add research
exports to the small package root barrel unless a separate compatibility change
requires it.

Capability APIs are pure and public only through the Research subpath:

```ts
type ResearchExecutionHost = "claude" | "codex";
type ResearchCapabilityKind = "bounded" | "workflow" | "advisory";
type ResearchActivationMode = "automatic" | "explicit";

type ResearchCapabilityResolutionErrorCode =
  | "UNKNOWN_CAPABILITY"
  | "CAPABILITY_STAGE_MISMATCH"
  | "QUEST_STAGE_NOT_DISPATCHABLE";

function parseResearchExecutionHost(value: string): ResearchExecutionHost;
function getResearchCapabilityDefinition(
  capabilityId: string,
): ResearchCapabilityDefinition | undefined;
function resolveResearchCapability(input: {
  stage: QuestStage;
  capabilityId?: string;
}): {
  stage: DispatchableQuestStage;
  capability: ResearchCapabilityDefinition;
  selection: "explicit" | "default";
};

function parseResearchProcedure(input: {
  capabilityId: string;
  source: "bundled" | "project";
  manifestBytes: Uint8Array;
  instructionBytes: Uint8Array;
}): ParsedResearchProcedure;

function parseResearchProjectPolicy(
  policyBytes: Uint8Array,
): ParsedResearchProjectPolicy;

function resolveResearchEffectiveAuthority(input: {
  capabilityId: string;
  procedure: ParsedResearchProcedure;
  policy: ParsedResearchProjectPolicy;
}): ResearchEffectiveAuthority;

function evaluateResearchAutomaticEligibility(
  authority: ResearchEffectiveAuthority,
): ResearchAutomaticEligibility;
```

`RESEARCH_EXECUTION_HOSTS` remains exactly `["claude", "codex"]`.
`RESEARCH_CAPABILITY_REGISTRY` is the exact immutable 14-entry inventory, and
`RESEARCH_DEFAULT_CAPABILITY_BY_STAGE` explicitly maps every dispatchable stage.
The registry array, each definition, nested Procedure reference, approval array,
and default map are frozen at runtime. The old Skill-oriented resolver, discovery
normalizer, descriptors, and related public types are absent from the Research
subpath.

### C02 mixed-ledger signatures

The Research subpath exports `ActivationId`, `ApprovalId`, `ResearchActivation`, `ResearchApprovalGrant`, terminal `ResearchApprovalState`, `ResearchSchemaV1Event`, `ResearchSchemaV2Event`, the mixed `ResearchEvent` union, strict schemas, `RESEARCH_EVENT_SCHEMA_VERSION`, and both ordered event-kind inventories. `ResearchState` adds only activation/approval maps and indexes. C05 extends `ResearchMutation` only with `activation.plan`, `approval.grant`, and `approval.revoke`, and exports `digestDispatchRequest`, `hashDispatchScope`, and `NormalizedDispatchScopeV1` only from the Research subpath. Package export keys and root-barrel behavior do not change; there is no C05 consumption mutation.

## 3. Contracts

### Immutable capability registry and resolution

Canonical Quest stage plus an optional exact capability ID are the sole core
selection inputs. Host, Skill discovery, Dispatch metadata, filesystem order,
and registry array order are not capability authority.

| Stage | Capability ID | Kind | Activation | Procedure | Network | Repositories | Limits |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `setup` | `research.setup.project` | workflow | explicit | `project-setup-v1@2.0.1` | forbidden | single | 15 / 1 |
| `framing` | `research.framing.quest` | bounded | automatic | `quest-framing-v1@2.0.1` | forbidden | single | 15 / 1 |
| `framing` | `research.framing.admin` | workflow | explicit | `quest-admin-v1@2.0.1` | forbidden | single | 15 / 1 |
| `literature` | `research.literature.review` | workflow | automatic | `literature-review-v1@2.0.1` | declared-only | multiple | 60 / 4 |
| `literature` | `research.literature.scan` | bounded | explicit | `literature-scan-v1@2.0.1` | forbidden | single | 15 / 1 |
| `literature` | `research.literature.survey` | workflow | explicit | `survey-v1@2.0.1` | forbidden | single | 45 / 2 |
| `ideation` | `research.ideation.generate` | bounded | automatic | `idea-generation-v1@2.0.1` | forbidden | single | 15 / 1 |
| `ideation` | `research.ideation.evaluate` | workflow | explicit | `idea-evaluation-v1@2.0.1` | forbidden | single | 30 / 2 |
| `experiment` | `research.experiment.round` | bounded | automatic | `experiment-round-v1@2.0.1` | forbidden | single | 15 / 1 |
| `experiment` | `research.experiment.campaign` | workflow | explicit | `experiment-campaign-v1@2.0.1` | declared-only | multiple | 120 / 8 |
| `computation` | `research.computation.case` | bounded | automatic | `computation-case-v1@2.0.1` | forbidden | single | 15 / 1 |
| `theory` | `research.theory.case` | bounded | automatic | `theory-case-v1@2.0.1` | forbidden | single | 15 / 1 |
| `audit` | `research.audit.case` | bounded | automatic | `review-case-v1@2.0.1` | forbidden | single | 15 / 1 |
| `audit` | `research.audit.campaign` | workflow | explicit | `review-campaign-v1@2.0.1` | forbidden | multiple | 60 / 4 |
| `writing` | `research.writing.case` | bounded | automatic | `writing-case-v1@2.0.1` | forbidden | single | 15 / 1 |
| `writing` | `research.writing.figure` | workflow | explicit | `figure-v1@2.0.1` | forbidden | single | 30 / 2 |
| `writing` | `research.writing.slides` | workflow | explicit | `slides-v1@2.0.1` | forbidden | single | 30 / 2 |

There is no `complete` or initial `advisory` entry. Every definition uses
`workerAuthority: "proposal-only"`. Bounded approval requirements are ordered
`network`, `external-cost`, `multiple-repositories`, `canonical-mutation`, then
`capability-chaining`; workflow entries prepend `workflow`.

The explicit default map is:

```text
setup -> research.setup.project
framing -> research.framing.quest
literature -> research.literature.review
ideation -> research.ideation.generate
experiment -> research.experiment.round
computation -> research.computation.case
theory -> research.theory.case
audit -> research.audit.case
writing -> research.writing.case
```

Resolution validates stage first. `complete` and any runtime value outside the
nine dispatchable stages throw `QUEST_STAGE_NOT_DISPATCHABLE`, even when a
capability ID is supplied. Only `capabilityId: undefined` selects the default.
Every supplied string is exact, case-sensitive, and untrimmed; absent lookup
throws `UNKNOWN_CAPABILITY`, while a known capability for another stage throws
`CAPABILITY_STAGE_MISMATCH`. Resolution returns one frozen canonical definition
and never chains, reads files, parses policy or Procedures, or depends on host.

Host parsing remains a separate exact validation API accepting only lowercase
`claude` and `codex`. Historical `Dispatch.ownerSkill`, `provider`, and `taskRef`
remain readable schema-v1 compatibility metadata. They are not rewritten,
persisted as computed capability fields, or used to select a capability.

### Strict Procedure and project-policy contracts

Procedure and policy APIs are pure, host-neutral, and public only through the
Research subpath. They consume the immutable capability registry without adding
capabilities or emit authority.

- Strict JSON decoding rejects BOM, malformed UTF-8, comments, trailing tokens,
  invalid grammar, unpaired surrogate escapes, and duplicate decoded keys at
  every object depth, including escaped-equivalent keys.
- `procedure.json` is one compact canonical object in fixed key order with exactly
  one final LF. Bundled manifests omit `replaces`; project manifests require the
  exact bundled `{ id, version }`. Identity must match the selected capability.
- Procedure authority may only tighten registry authority: network to forbidden,
  repository scope to single, and positive limits downward. Instruction bytes are
  non-empty UTF-8 without BOM/NUL and are never newline-normalized.
- Procedure digest framing is
  `UTF8("trellis-research-procedure-digest-v1\0") || canonical manifest bytes
  excluding final LF || 0x0A || exact instruction bytes`.
- Policy parsing requires complete schema v1, rejects unknown capability IDs, and
  preserves exact valid source text. Literal `true` in any `allow*` field,
  `activation:"automatic"`, or an override limit above its policy default throws
  `POLICY_WIDENS_AUTHORITY`; `enabled:true` remains a valid no-op.
- Policy digest framing is
  `UTF8("trellis-research-policy-digest-v1\0") ||
  UTF8(stableResearchJson(strictParsedCompletePolicy))`. Source formatting and key
  order do not affect this digest.
- Effective authority merges registry, Procedure, policy defaults, then the
  capability override. Limits use the minimum; false policy grants may tighten
  network/repository scope; external cost, canonical mutation, and capability
  chaining remain false.
- `automaticEnabled:true` is the sole automatic opt-in. Eligibility returns every
  failed condition in stable order and requires enabled, bounded, automatic,
  forbidden network, single Repository, no external cost/mutation/chaining, at
  most one Dispatch, and at most 15 minutes.
- Returned semantic objects, nested objects, and arrays are runtime-frozen. Input
  bytes are defensively copied and mutable byte views are not exposed.

C04 computes authority only. It emits no activation, approval, authorization,
Context decision, event, or canonical mutation.

### C05 Dispatch bindings and typed emitters

- `digestDispatchRequest` strict-parses the complete Dispatch and hashes
  `UTF8("trellis-research-dispatch-request-digest-v1\0") || UTF8(stableResearchJson(dispatch))`.
- `hashDispatchScope` validates the complete schema-v1 normalized scope, requires
  absolute machine paths, normalizes POSIX/Windows separators, drive-letter case,
  dot segments, and trailing separators, preserves artifact order, rejects duplicate
  artifact IDs, and deduplicates/sorts declared/resolved write pairs before hashing
  with `trellis-research-dispatch-scope-hash-v1\0`.
- Both bindings return `sha256:<64 lowercase hex>` and are pure. Absolute resolved
  paths may participate in the scope hash but are never serialized into activation,
  approval, event, or tracked projection payloads.
- `activation.plan` maps only to schema-v2 `activation.planned` with Activation
  aggregate and ordered Dispatch/Quest relations.
- `approval.grant` maps only to schema-v2 `approval.granted` with Approval aggregate
  and ordered Activation/Dispatch/Quest relations derived from reduced state.
- `approval.revoke` maps only to schema-v2 `approval.revoked` with ordered
  Activation/Dispatch relations derived from the canonical grant.
- Internal event drafts carry their schema version. Mixed batches build and reduce
  progressively so new prepare can validate unchanged v1 `dispatch.recorded`
  followed by v2 `activation.planned` atomically.
- Every existing schema-v1 mapping, lock, sequence, idempotency, append, projection,
  artifact-digest, Result/Proposal, and Decision contract remains unchanged.
- Approval label, rationale, and revocation-reason bounds count Unicode code points.
  C05 emits no `approval.consumed`; C06 owns consumption.

### Canonical research lifecycle protection

`.trellis/research` and every descendant are canonical tracked user data, not
replaceable CLI template output. Repository lifecycle commands must preserve the
complete tree byte-for-byte unless an explicit research-domain mutation writes a
new canonical event/projection under the contracts below.

Required CLI boundaries:

- `trellis uninstall` never recursively removes `.trellis`, never reads or
  deletes a protected research path from manifest ownership, and releases stale
  research manifest keys. A missing or valid-empty manifest with research as the
  only `.trellis` content is a friendly no-op; a malformed manifest fails closed.
- `trellis update` excludes research from template collection, safe-file-delete,
  backups, hash initialization, orphan cleanup, and empty-directory cleanup.
- Migration classification and execution reject a protected source or
  destination and any recursive source/destination ancestor, such as `.trellis`,
  that would move, replace, or carry canonical research. `--force` cannot bypass
  this rule.
- Path checks normalize dot segments and use segment-safe containment before any
  filesystem operation. A sibling such as `.trellis/research-old` is not
  protected, while `.trellis/tmp/../research/events.jsonl` is protected.
- No lifecycle flag or environment override may act as an implicit research
  purge mechanism.

The complete schema-v1 research fixture, including the ledger, projections,
repositories, quests, campaigns, runs, evidence, and claims, must survive an
uninstall byte-for-byte.

### Event ledger

- One strict JSON object per non-empty line.
- `schemaVersion: 1` accepts only the exact existing 21 kinds, v1 aggregate refs, payloads, and timestamp behavior.
- `schemaVersion: 2` accepts only `activation.planned`, `approval.granted`, `approval.revoked`, and `approval.consumed`, with activation/approval aggregate refs where specified.
- V2 envelope and entity timestamps must match `YYYY-MM-DDTHH:mm:ss.sssZ`, parse to the same UTC instant, and use a four-digit year. Expanded years are rejected only for v2; v1 compatibility is unchanged.
- Kind/version mismatch, unknown version, unknown key, `null` substitution, malformed digest/hash, and extra/missing/reordered refs fail closed.
- Sequence must equal prior parsed event count plus one across the complete mixed ledger.
- `eventId` must be unique across the complete mixed ledger.
- Parser errors include source path and line number.
- Empty or missing ledger means empty state. Malformed existing ledger never degrades to partial state.

Commit order:

1. Acquire research-local filesystem lock.
2. Strict-parse complete ledger.
3. Reconcile runtime `seq` to canonical ledger head.
4. Return prior events when `idempotencyKey` already exists.
5. Convert all mutations to events and reduce complete candidate ledger.
6. Validate repository references, transitions, and supplied artifact digests.
7. Append complete serialized event batch while lock remains held.
8. Update runtime sequence.
9. Atomically write deterministic projections and projection cache.

All mutations validate before append. Failure before step 7 must leave ledger
byte-equivalent to its prior state.

### Lifecycle transitions

| Entity | Allowed transitions |
| --- | --- |
| Quest | `active -> paused | completed | abandoned`; `paused -> active | completed | abandoned` |
| Campaign | `draft -> frozen | abandoned`; `frozen -> running | blocked | abandoned`; `running -> blocked | completed | abandoned`; `blocked -> running | abandoned` |
| Run | `planned -> running | cancelled`; `running -> succeeded | failed | cancelled` |
| Evidence | `active -> superseded | retracted` |
| Claim | `candidate -> supported | contested | refuted | withdrawn`; `supported -> contested | refuted | withdrawn`; `contested -> supported | refuted | withdrawn` |

Additional rules:

- Campaign protocol digest may change only while Campaign is `draft`.
- `campaign.freeze` performs the `draft -> frozen` transition.
- Normal status transitions cannot restart terminal Runs.
- Any non-invalidated Run may receive explicit `run.invalidate` with non-empty
  reason; an already invalidated Run cannot be invalidated again.
- Terminal Evidence and Claim states do not reopen in this V1 core contract.
- Quest stage is a validated enum, separate from Quest status.

### Projections

- Serialize object keys deterministically and end files with one newline.
- Write through temp file in target directory, then atomic rename.
- Every projection uses current ledger head as `projectedThroughSeq`, including
  entities unchanged by the latest event.
- Entity `updatedAt` remains entity mutation time; it is not projection head
  time.
- `rebuildResearchProjections` reduces canonical ledger and regenerates output.
  Rebuilding twice from unchanged ledger must produce byte-equivalent files.
- Runtime projection cache is an accelerator only. Missing or invalid cache does
  not change canonical state.

If append succeeds but projection write fails, throw:

```ts
class ResearchProjectionError extends Error {
  readonly headSeq: number;
}
```

Caller must report committed ledger head and run `rebuildResearchProjections`.
Never retry mutation with a new idempotency key to repair projections.

### Portable repository and artifact paths

```ts
interface Repository {
  id: `rep_${string}`;
  name: string;
  kind: "code" | "paper" | "notes" | "data" | "other";
  locator: string; // POSIX relative path from control-plane root
  expectedRemote?: string;
  defaultBranch?: string;
  capabilities: { hasTrellis: boolean };
  createdAt: string;
  updatedAt: string;
}

interface ArtifactRef {
  id: `art_${string}`;
  repositoryId: `rep_${string}`;
  path: string; // POSIX relative path inside registered repository
  kind?: string;
  revision?: string;
  sha256?: string;
  mediaType?: string;
}
```

Path rules:

- Reject empty strings, NUL, backslashes, empty path segments, POSIX absolute
  paths, Windows absolute paths, and Windows drive-relative paths such as
  `C:repo`.
- Repository locators may normalize explicit `..` because sibling repos are
  supported.
- Artifact paths must not normalize to `..` or begin with `../`.
- `resolveArtifactPath` validates both repository locator and artifact path,
  verifies matching `repositoryId`, then confirms resolved artifact remains
  inside repository root.
- Artifact references require a registered repository.
- When `sha256` exists, commit reads target file and compares lowercase SHA-256
  hex before append. Missing digest skips content verification.
- Integrations that resolve machine-local repository bindings may pass the
  resolved absolute roots through `artifactRepositoryRoots`. Core uses those
  roots only for the current validation call and never serializes them. Without
  an override, digest reads resolve from the tracked repository locator.
- Tracked objects contain portable relative strings only. Absolute resolved
  paths belong in ignored runtime state owned by integration layers.

### Dispatch, result, proposal, and decision contracts

- Dispatch records identify one Quest, optional Campaign, one Run, one registered
  Repository, the owning skill, objective, portable context, allowed write paths,
  expected outputs, checks, and an optional portable Task reference.
- A Run can have at most one Dispatch and one Result. The Dispatch Quest and
  optional Campaign must match the Run's Campaign hierarchy.
- Results identify their Dispatch and Run and record status, summary, commands,
  checks, artifact references, blockers, optional Git revision/dirty summary,
  optional portable session reference, and creation time.
- Proposals contain only strict typed operations. Supported operations register
  artifacts; update Quest stage/status; update, freeze, or transition Campaigns;
  transition or invalidate Runs; and create or transition Evidence and Claims.
- `proposalOperationsToMutations` converts supported operations to existing
  validated `ResearchMutation` variants. Arbitrary event kinds or payloads are
  never accepted.
- Proposals begin pending. A Decision finalizes one Proposal exactly once.
  Accepted Decisions select unique in-range operation indexes; rejected or
  deferred Decisions select none.
- Result plus Proposal recording is one validated ledger batch. Selected
  Proposal mutations plus the Decision are one validated ledger batch, so a
  failing operation cannot partially append.

### Research-local lock decision

Research uses `packages/core/src/research/internal/lock.ts`, not Channel internal
storage code.

Reason: GitNexus marked Channel lock symbols HIGH risk across channel create,
send, interrupt, thread, worker-reconciliation, and test flows. Sharing by
extraction would add regression surface without V1 benefit. Research-local lock
preserves same required semantics: exclusive lock creation, PID-stamped stale
lock handling, bounded wait, release in `finally`, and one writer critical
section at a time.

Do not import from `channel/internal/**`. Any future shared-lock extraction
requires fresh upstream impact analysis plus complete Channel and Research lock
regression coverage.

### C02 activation/approval replay contracts

- Parse all existing kinds only as schema v1 and exactly four activation/approval kinds only as schema v2; replay one globally contiguous mixed ledger.
- Keep every v1 payload, mutation, and existing projection schema unchanged. Activation/approval-only ledger heads advance existing projection watermarks but do not change entity data or `updatedAt`.
- Reduce exactly one immutable activation per Dispatch. Require existing matching Dispatch/Quest hierarchy and reject activation after Result or Proposal.
- Grant only against matching activation/Dispatch/Quest bindings. Approval IDs are globally unique. A new still-granted approval for the same activation/host is allowed only when every prior still-granted approval has `expiresAt <= newEvent.timestamp`; reducer never reads wall clock.
- Revocation and consumption are terminal. Revocation allows pre/post-expiry transition from `granted`; consumption requires `event.timestamp < expiresAt`, so equality is expired.
- Reduce consumption only when it immediately follows matching v1 Result then v1 Proposal events. All three events must share timestamp, actor, provenance, and idempotency key.
- C02 originally added no v2 mutation or emitter. C05 now emits only activation plan, approval grant, and approval revocation through the existing validated batch boundary; the existing two-event Result + Proposal mutation remains unchanged until C06 adds mandatory approval consumption.
- Once a v2 event exists, rollback is forward-fix only; never rewrite or down-convert ledger history.

## 4. Validation & Error Matrix

| Condition | Required behavior |
| --- | --- |
| Ledger line is malformed JSON | Reject with source + line number; read no partial state |
| Event has unknown field, kind, payload field, or schema version | Reject event and ledger |
| Sequence starts above 1, skips, repeats, or is out of order | Reject with expected and received sequence |
| Duplicate `eventId` | Reject ledger |
| Host is blank, case-varied, an installer ID, retired, or arbitrary | Throw `research execution host must be one of: claude, codex` |
| Capability ID is empty, whitespace, case-varied, adorned, or unknown | Throw typed `UNKNOWN_CAPABILITY` |
| Known capability belongs to another stage | Throw typed `CAPABILITY_STAGE_MISMATCH` |
| Stage is `complete` or runtime-invalid, regardless of supplied capability | Throw typed `QUEST_STAGE_NOT_DISPATCHABLE` before lookup |
| Procedure JSON is noncanonical, duplicate-keyed, identity-mismatched, or widens registry authority | Reject as `INVALID_RESEARCH_PROCEDURE`; do not normalize bytes |
| Policy JSON is malformed, incomplete, unknown-keyed, or names an unknown capability | Reject as `INVALID_RESEARCH_POLICY` |
| Policy contains a recognized grant attempt | Reject as `POLICY_WIDENS_AUTHORITY`; do not return partial authority |
| Automatic policy opt-in is absent or another eligibility condition fails | Return all applicable reasons in stable order; create no authorization state |
| Dispatch request digest input is malformed or contains unknown fields | Reject before hashing |
| Normalized scope has unknown/missing fields, relative machine paths, duplicate artifact IDs, or malformed portable paths | Reject before hashing |
| Activation/grant/revoke relation IDs disagree with reduced canonical state | Reject the complete batch; append nothing |
| Approval label, rationale, or revocation reason exceeds its Unicode code-point limit | Reject before append |
| C05 mutation attempts `approval.consumed` | No such mutation exists; consumption remains C06-only |
| Empty mutation batch | Throw `Research event batch must contain at least one mutation` |
| Existing `idempotencyKey` | Return prior matching events with `replayed: true`; append nothing |
| Batch contains valid mutation followed by invalid mutation | Reject whole batch; append nothing |
| Aggregate or related entity does not exist | Reject during reduction |
| Forbidden lifecycle transition | Throw `Invalid <entity> status transition: <from> -> <to>` |
| Protocol update after freeze | Reject; ledger unchanged |
| Terminal Run receives normal restart | Reject; require explicit invalidation when applicable |
| Artifact repository is unknown | Reject before append |
| Repository locator or artifact path is absolute/Windows-drive/backslash based | Reject as non-portable tracked path |
| Artifact path escapes repository root | Reject |
| Supplied artifact digest mismatches file | Reject before append |
| Runtime `seq` differs from ledger head | Repair runtime value from ledger head |
| Projection update fails after append | Throw `ResearchProjectionError(headSeq)`; ledger remains committed |
| Projection cache is missing/invalid/stale | Status reports stale; rebuild restores projections |
| Uninstall sees research-only state with a missing or valid-empty manifest | Return a friendly no-op; preserve every research byte |
| Uninstall sees a malformed ownership manifest | Fail closed; perform no lifecycle writes |
| Update/safe-delete/hash/backup/cleanup targets `.trellis/research/**` | Skip before filesystem mutation; do not rewrite, delete, hash, or back up the path |
| Migration source/destination is research or recursively contains research | Classify and execute as protected skip; `--force` cannot bypass |
| Two writers overlap | Lock serializes commits; ledger remains contiguous |

C02 matrix additions: reject kind/schema mismatches, non-canonical v2 timestamps (including expanded years), malformed bindings, duplicate activation, invalid/terminal approval transitions, premature duplicate-host grants, expired consumption including equality, reordered/mismatched/non-adjacent consumption, and mixed-ledger relation errors. Prebuilt activation/approval-only ledger heads must preserve entity data while advancing projection watermarks. Existing v1 matrix rows and mutation behavior remain unchanged.

## 5. Good / Base / Bad Cases

### Good

One batch establishes related state atomically:

```ts
await commitResearchBatch({
  root,
  actor: { type: "agent", id: "claude" },
  provenance: { source: "research setup" },
  idempotencyKey: "setup:qst_123",
  mutations: [
    {
      kind: "quest.create",
      quest: {
        id: questId,
        title: "Evaluate method X",
        description: "",
        repositoryIds: [repositoryId],
        artifactRefs: [],
      },
    },
    {
      kind: "campaign.create",
      campaign: {
        id: campaignId,
        questId,
        title: "Baseline comparison",
        protocolDigest: "sha256:protocol-v1",
      },
    },
  ],
});
```

Assertions: both events append with contiguous sequences, both projections use
same ledger head, retry with same idempotency key returns prior events.

An exact explicit capability selects one frozen stage-matched definition without persistence:

```ts
resolveResearchCapability({
  stage: "audit",
  capabilityId: "research.audit.campaign",
});
// selection: "explicit", capability.id: "research.audit.campaign"
```

A new prepare batch may atomically mix versions without a raw event API:

```ts
await commitResearchBatch({
  root,
  actor,
  provenance,
  idempotencyKey,
  timestamp,
  mutations: [
    { kind: "dispatch.record", dispatch },
    { kind: "activation.plan", activation },
  ],
});
// event order: [v1 dispatch.recorded, v2 activation.planned]
```

### Base

Missing ledger or runtime cache:

```ts
const events = await readResearchLedger(root); // []
const state = await readResearchState(root);   // emptyResearchState()
```

No projection or runtime file is required to reconstruct canonical state.

An omitted capability selects the explicit stage default independently of registry order:

```ts
resolveResearchCapability({ stage: "writing" });
// selection: "default", capability.id: "research.writing.case"
```

A conservative policy keeps automatic execution disabled. Parsing and evaluating
it returns immutable semantics and deterministic ineligibility reasons without
writing Research state.

### Bad

Non-portable or unresolved artifact:

```ts
await commitResearchBatch({
  root,
  actor,
  provenance,
  idempotencyKey: "bad-artifact",
  mutations: [{
    kind: "artifact.register",
    artifact: {
      id: createArtifactId(),
      repositoryId: createRepositoryId(),
      path: "C:repo\\results\\data.json",
    },
  }],
});
```

Required result: reject before append. Do not normalize platform-specific input
into tracked state.

Do not route from historical Dispatch metadata or accept a terminal stage:

```ts
resolveResearchCapability({
  stage: "complete",
  capabilityId: historicalDispatch.ownerSkill,
});
```

Required result: typed `QUEST_STAGE_NOT_DISPATCHABLE` before capability lookup.
`ownerSkill` does not override the current Quest stage or become a capability ID.

### C02 mixed-ledger cases

- **Good**: unchanged v1 events replay with v2 activation/grant and adjacent Result/Proposal/consumption events; rebuild is deterministic and advances existing watermarks.
- **Base**: a pure v1 ledger reduces exactly as before with empty activation/approval maps; existing two-event Result + Proposal mutation still works.
- **Bad**: v2 uses expanded-year/non-millisecond timestamps, reducer consults wall clock/policy/filesystem, v1 bytes change, consumption is non-adjacent/expired, or C05 bypasses typed plan/grant/revoke mutations with raw event input.

## 6. Tests Required

Core research tests live under `packages/core/test/research/`.

- `stage-capabilities.test.ts`
  - exact 14-entry registry inventory, field values, order, and no `complete` or
    initial `advisory` entry.
  - exact nine-stage default map independent of registry order.
  - explicit/default resolution for every stage and alternate workflow entries.
  - typed unknown, stage-mismatch, `complete`, and runtime-invalid failures with
    stage-first precedence.
  - runtime freezing of the registry, definitions, Procedure refs, approval
    arrays, default map, and returned canonical definitions.
  - host parser accepts only `claude` and `codex`; capability input/output has no
    host, discovery, Skill, fallback, selected-Skill, or source concept.
- `strict-json.test.ts`
  - complete JSON grammar, fatal UTF-8/BOM handling, malformed numbers/escapes,
    trailing tokens/comments, valid surrogate pairs, invalid unpaired surrogates,
    and nested escaped-equivalent duplicate keys.
- `procedure-policy.test.ts`
  - canonical manifests for all 14 capabilities, source-specific `replaces`, exact
    digest framing/newline behavior, SemVer/array/schema failures, Procedure
    tightening, policy widening classification, formatting-independent policy
    digest, runtime freezing, all-capability authority merge, and stable automatic
    eligibility reasons.
- `schema.test.ts`
  - All ID prefixes and entity shapes.
  - Unknown keys rejected.
  - POSIX relative paths accepted.
  - absolute, backslash, empty segment, parent-escaping artifact, and Windows
    drive-relative paths rejected through public APIs.
  - unresolved repository refs and digest behavior asserted.
- `transitions.test.ts`
  - Cartesian matrix over every status pair for each entity.
  - explicit Run invalidation allowed once from each non-invalidated state.
- `events.test.ts`
  - malformed JSON includes line number.
  - invalid payload/schema version rejected.
  - sequence gap/repeat and duplicate event ID rejected.
  - serialize/parse round trip preserves events and trailing newline.
- `activation-approval.test.ts`
  - exact v2 kind/version/payload/aggregate/ref vectors and mixed serialization.
  - v2 requires four-digit RFC3339 UTC millisecond timestamps; expanded years fail while v1 compatibility remains accepted.
  - activation uniqueness/hierarchy/late-planning, grant binding/host/expiry replacement, terminal revocation, and event-time consumption expiry.
  - consumption adjacency plus shared timestamp/actor/provenance/idempotency key.
  - approval label/rationale/revocation bounds count Unicode code points.
  - prebuilt mixed-ledger rebuild advances existing projection watermarks without changing entity data, `updatedAt`, projection schemas, or file inventory.
  - C05 plan/grant/revoke mutations exist; no consumption mutation exists and current Result + Proposal remains two v1 events.
- `dispatch-authority.test.ts`
  - deterministic domain-separated Dispatch request digest and mutation sensitivity.
  - strict complete normalized scope, machine-path normalization, duplicate artifact rejection, preserved artifact order, and canonical write-pair deduplication/sorting.
- `store.test.ts`
  - duplicate idempotency key returns original events and no append.
  - exact typed v1 Dispatch + v2 activation batch, grant, and revoke mappings reduce to canonical state.
  - complete batch validation prevents partial append.
  - 20+ concurrent commits produce exact `1..N` sequence.
  - stale runtime sequence repairs from ledger.
  - frozen protocol and terminal Run immutability.
  - simulated projection failure leaves committed event and exposes `headSeq`.
  - rebuild twice yields byte-equivalent tracked projections.
  - unchanged entity projection advances to current ledger head.
- `dispatch.test.ts`
  - every supported Proposal operation maps to the expected mutation.
  - Dispatch hierarchy and Result/Proposal relationships are enforced.
  - Decision selection indexes are validated and finalize a Proposal once.
  - invalid multi-mutation batches leave the ledger unchanged.
- `lock.test.ts`
  - hold first critical section, start second, assert second cannot enter.
  - maximum observed critical-section concurrency equals one.
  - lock releases after callback failure.
- CLI lifecycle integration (`packages/cli/test/commands/`)
  - uninstall preserves the complete schema-v1 research fixture byte-for-byte.
  - research-only missing/valid-empty ownership is a friendly repeated no-op;
    malformed ownership fails closed.
  - update migration, safe-delete, backup, hash initialization, and cleanup paths
    cannot modify research, including dot-segment aliases and recursive ancestors.

Required verification:

```bash
pnpm --filter @mindfoldhq/trellis-core test
pnpm --filter @mindfoldhq/trellis-core lint
pnpm --filter @mindfoldhq/trellis-core typecheck
pnpm --filter @mindfoldhq/trellis-core build
pnpm typecheck
```

Also verify built consumer import:

```ts
import {
  RESEARCH_CAPABILITY_REGISTRY,
  digestDispatchRequest,
  hashDispatchScope,
  parseResearchProcedure,
  parseResearchProjectPolicy,
  readResearchState,
  resolveResearchCapability,
  resolveResearchEffectiveAuthority,
} from "@mindfoldhq/trellis-core/research";
```

The registry and resolver must not appear on the `@mindfoldhq/trellis-core` root
barrel, retired Skill-routing exports must be absent from the Research subpath,
and this change must not alter package export keys.

Mixed-ledger tests additionally require exact v1 fixture hashes/non-regression, strict v2 payload/version/timestamp vectors, mixed replay/rebuild, one activation per Dispatch, grant/revoke/consume transitions, expiry equality inputs, exact relation order, and consumption adjacency. C05 must prove only plan/grant/revoke emitters were added, all v1 mappings remain unchanged, and no consumption mutation exists. Run fresh GitNexus impact and warn before editing HIGH/CRITICAL parser, reducer, or store symbols.

## 7. Wrong vs Correct

### Wrong: repair projection failure by appending again

```ts
try {
  await commitResearchBatch(input);
} catch {
  await commitResearchBatch({
    ...input,
    idempotencyKey: `${input.idempotencyKey}:retry`,
  });
}
```

This can append duplicate scientific state because ledger append may already
have succeeded.

### Correct: preserve ledger authority and rebuild

```ts
try {
  await commitResearchBatch(input);
} catch (error) {
  if (error instanceof ResearchProjectionError) {
    await rebuildResearchProjections(input.root);
  } else {
    throw error;
  }
}
```

### Wrong: use entity mutation sequence as projection watermark

```ts
projected(entity, state.entitySeq[entity.id], entity.updatedAt);
```

Projection can look stale after unrelated events even though rebuild processed
complete ledger.

### Correct: use current ledger head

```ts
projected(entity, state.projectedThroughSeq, entity.updatedAt);
```

### Wrong: reuse Channel internals

```ts
import { withLock } from "../channel/internal/store/lock.js";
```

Creates hidden cross-domain coupling and changes HIGH-risk Channel blast radius.

### Correct: keep research storage boundary local

```ts
import { withResearchLock } from "./internal/lock.js";
```

Reconsider sharing only after explicit impact analysis and regression proof.

### Wrong: route from historical Dispatch metadata

```ts
const selectedSkill = dispatch.ownerSkill;
```

This makes arbitrary schema-v1 compatibility metadata authoritative and can
route a Quest through a stale or generic owner.

### Correct: resolve from current Quest stage and an optional exact capability ID

```ts
const resolution = resolveResearchCapability({
  stage: quest.stage,
  capabilityId: requestedCapabilityId,
});
```

The stage is validated first, and omission selects the explicit default map.
Host, discovery order, Skill names, and Dispatch compatibility metadata never
select the canonical capability; no result is written into tracked state.

### Wrong: normalize Procedure instructions before hashing

```ts
const instructionBytes = new TextEncoder().encode(text.replaceAll("\r\n", "\n"));
```

### Correct: digest exact validated instruction bytes

```ts
const digest = computeResearchProcedureDigest({
  canonicalManifestBytes,
  instructionBytes,
});
```

Line endings and final-newline presence are Procedure identity.

### C05: typed mixed-version write authority

```text
Wrong: rewrite schema-v1 events, store approval only in sidecars, accept raw v2 drafts, or add approval consumption to C05.
Correct: preserve v1 mappings, emit only typed plan/grant/revoke mutations through the existing validated batch, and keep the mixed ledger canonical.
```

## Research Procedure dispatch cutover guard

C06+C07 production recording accepts only the successor isolated batch: schema-v1 `result.recorded`, schema-v1 `proposal.recorded`, then schema-v2 `approval.consumed`. The three events share one timestamp, actor, provenance, and idempotency key; the Approval relation and Approval-derived Result/Proposal IDs must match exactly. The predecessor two-event Result/Proposal production batch is rejected. Result and pending Proposal remain distinct canonical entities, and applying or rejecting the Proposal remains a separate root-owned mutation.

Core read-only validation and lockful commit are separate authorities. `validateResearchBatchReadOnly` validates a caller-supplied canonical snapshot without acquiring the Research lock, reserving a head, or writing ledger, runtime, projection, cache, or materialization state. `commitResearchBatch` remains the only lockful append path and revalidates authoritative under-lock state before committing the isolated batch.

Approval-bound exact same-key replay is classified from canonical ledger before current clock validation, Approval terminal/current eligibility checks, or original path/stdin access. Canonical replay may reconstruct Result/Proposal event payloads plus consumed Approval reduced state and authorize root-side hardened sidecar repair without appending, rerunning worker, or requiring original input. Result, Proposal, and Approval sidecars are projections only; missing, stale, partial, or failed sequential materialization never outranks canonical ledger authority.

This guard changes neither historical mixed-ledger parsing nor replay of already-valid schema-v1/schema-v2 events. It does not authorize generic raw append, worker-side validation/recording/recovery, Approval consumption outside the exact adjacent batch, sidecars as canonical authority, dry-run locking/writes, replacement events for materialization recovery, or C08/C09 Skill retirement work.
