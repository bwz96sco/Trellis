# Frozen Procedure, Capability, and Policy Contract

## 1. Scope / Trigger

This is the normative successor contract for C03, C04, C07, C08, and C09. It is frozen by C01 but is not implemented by C01.

It applies whenever Trellis selects a Research capability, resolves a Procedure, parses project policy, computes Procedure/policy/request/scope digests, builds normalized worker input, or retires historical Research Skills. The immutable registry and root control plane are authority. Host Skills, `Dispatch.ownerSkill`, `Dispatch.provider`, and `Dispatch.taskRef` are never authority.

## 2. Signatures

### Capability registry

```ts
type ResearchCapabilityKind = "bounded" | "workflow" | "advisory";
type ResearchActivationMode = "automatic" | "explicit";

type ResearchCapabilityDefinition = Readonly<{
  id: string;
  stage: DispatchableQuestStage;
  kind: ResearchCapabilityKind;
  activation: ResearchActivationMode;
  procedure: Readonly<{ id: string; version: string }>;
  workerAuthority: "proposal-only";
  networkPolicy: "forbidden" | "declared-only";
  repositoryScope: "single" | "multiple";
  maxDurationMinutes: number;
  maxDispatches: number;
  approvalRequiredFor: readonly (
    | "workflow"
    | "network"
    | "external-cost"
    | "multiple-repositories"
    | "canonical-mutation"
    | "capability-chaining"
  )[];
}>;
```

The registry is a source constant exported only through `@mindfoldhq/trellis-core/research`. Runtime files cannot add, remove, or replace entries.

### Procedure package

Each Procedure directory contains exactly the required named files below. Extra regular files are ignored by resolution and must not enter either digest or worker input.

```text
<procedure-root>/<id>/<version>/
  procedure.json
  PROCEDURE.md
```

```ts
interface ResearchProcedureManifest {
  schemaVersion: 1;
  id: string;
  version: string;
  stage: DispatchableQuestStage;
  kind: "bounded" | "workflow" | "advisory";
  inputs: readonly string[];
  outputs: readonly string[];
  networkPolicy: "forbidden" | "declared-only";
  repositoryScope: "single" | "multiple";
  maxDurationMinutes?: number;
  maxDispatches?: number;
  replaces?: { id: string; version: string };
}
```

Project override root:

```text
.trellis/research/procedures/<id>/<version>/
```

Bundled defaults use the same `<id>/<version>` layout in the packed CLI Procedure inventory.

### Project policy

Canonical location:

```text
.trellis/research/policy.json
```

Strict schema:

```ts
interface ResearchProjectPolicyV1 {
  schemaVersion: 1;
  defaults: {
    automaticEnabled: boolean;
    maxDurationMinutes: number;
    maxDispatches: number;
    allowNetwork: false;
    allowExternalCost: false;
    allowMultipleRepositories: false;
    allowCanonicalMutation: false;
    allowCapabilityChaining: false;
  };
  capabilities: Readonly<Record<string, {
    enabled?: boolean;
    activation?: "explicit";
    maxDurationMinutes?: number;
    maxDispatches?: number;
    allowNetwork?: false;
    allowExternalCost?: false;
    allowMultipleRepositories?: false;
    allowCanonicalMutation?: false;
    allowCapabilityChaining?: false;
  }>>;
}
```

The generated conservative policy is:

```json
{
  "schemaVersion": 1,
  "defaults": {
    "automaticEnabled": false,
    "maxDurationMinutes": 15,
    "maxDispatches": 1,
    "allowNetwork": false,
    "allowExternalCost": false,
    "allowMultipleRepositories": false,
    "allowCanonicalMutation": false,
    "allowCapabilityChaining": false
  },
  "capabilities": {}
}
```

Normal update preserves an existing policy byte-for-byte. Creation is allowed only when Research initialization explicitly creates missing project policy.

### Digests

All digests use SHA-256 and the external form `sha256:` followed by exactly 64 lowercase hexadecimal characters.

```ts
function digestProcedure(manifestBytes: Uint8Array, instructionBytes: Uint8Array): string;
function digestPolicy(policy: ResearchProjectPolicyV1): string;
function digestDispatchRequest(dispatch: Dispatch): string;
function hashDispatchScope(scope: NormalizedDispatchScopeV1): string;
```

### Normalized worker input

```ts
interface NormalizedResearchWorkerInputV1 {
  schemaVersion: 1;
  host: "claude" | "codex";
  dispatch: Dispatch;
  activation: {
    id: ActivationId;
    capabilityId: string;
    mode: "automatic" | "explicit";
    requestDigest: string;
    procedureDigest: string;
    policyDigest: string;
    scopeHash: string;
  };
  approval: {
    id: ApprovalId;
    mode: "automatic" | "interactive";
    expiresAt: string;
  };
  capability: ResearchCapabilityDefinition;
  procedure: {
    manifest: ResearchProcedureManifest;
    digest: string;
    instructions: string;
    source: "project" | "bundled";
  };
  repository: {
    id: RepositoryId;
    path: string;
  };
  context: readonly DispatchContextEntry[];
  artifacts: readonly {
    ref: ArtifactRef;
    path: string;
  }[];
  allowedWritePaths: readonly string[];
  expectedOutputs: readonly string[];
  checks: readonly string[];
  authority: {
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
  };
  outputContract: {
    type: "result-plus-pending-proposal";
    dispatchId: DispatchId;
    runId: RunId;
    questId: QuestId;
    resultId: ResultId;
    proposalId: ProposalId;
  };
}
```

`repository.path` and artifact paths are machine-local normalized absolute paths used only in the read-only Context response. They are never written to canonical Research events or tracked materializations.

## 3. Contracts

### Initial immutable capability inventory

| Stage | Capability ID | Kind | Activation | Procedure | Network | Repositories | Limits |
|---|---|---|---|---|---|---|---|
| `setup` | `research.setup.project` | workflow | explicit | `project-setup-v1@1.0.0` | forbidden | single | 15 min / 1 Dispatch |
| `framing` | `research.framing.quest` | bounded | automatic | `quest-framing-v1@1.0.0` | forbidden | single | 15 min / 1 Dispatch |
| `framing` | `research.framing.admin` | workflow | explicit | `quest-admin-v1@1.0.0` | forbidden | single | 15 min / 1 Dispatch |
| `literature` | `research.literature.scan` | bounded | automatic | `literature-scan-v1@1.0.0` | forbidden | single | 15 min / 1 Dispatch |
| `literature` | `research.literature.review` | workflow | explicit | `literature-review-v1@1.0.0` | declared-only | multiple | 60 min / 4 Dispatches |
| `ideation` | `research.ideation.generate` | bounded | automatic | `idea-generation-v1@1.0.0` | forbidden | single | 15 min / 1 Dispatch |
| `ideation` | `research.ideation.evaluate` | workflow | explicit | `idea-evaluation-v1@1.0.0` | forbidden | single | 30 min / 2 Dispatches |
| `experiment` | `research.experiment.round` | bounded | automatic | `experiment-round-v1@1.0.0` | forbidden | single | 15 min / 1 Dispatch |
| `experiment` | `research.experiment.campaign` | workflow | explicit | `experiment-campaign-v1@1.0.0` | declared-only | multiple | 120 min / 8 Dispatches |
| `computation` | `research.computation.case` | bounded | automatic | `computation-case-v1@1.0.0` | forbidden | single | 15 min / 1 Dispatch |
| `theory` | `research.theory.case` | bounded | automatic | `theory-case-v1@1.0.0` | forbidden | single | 15 min / 1 Dispatch |
| `audit` | `research.audit.case` | bounded | automatic | `review-case-v1@1.0.0` | forbidden | single | 15 min / 1 Dispatch |
| `audit` | `research.audit.campaign` | workflow | explicit | `review-campaign-v1@1.0.0` | forbidden | multiple | 60 min / 4 Dispatches |
| `writing` | `research.writing.case` | bounded | automatic | `writing-case-v1@1.0.0` | forbidden | single | 15 min / 1 Dispatch |

There are no initial advisory entries. `advisory` remains a valid classification for future immutable registry additions, but it never implies execution authority.

Every entry has `workerAuthority: "proposal-only"`. Exact `approvalRequiredFor` order is:

- bounded entries: `["network", "external-cost", "multiple-repositories", "canonical-mutation", "capability-chaining"]`;
- workflow entries: `["workflow", "network", "external-cost", "multiple-repositories", "canonical-mutation", "capability-chaining"]`.

Registry limits are ceilings, not grants. An approval requirement does not grant the named authority to a worker; it routes the request to explicit root-side handling.

Automatic authorization is possible only for a `bounded` entry whose registry and effective project policy resolve to all of:

```text
activation = automatic
network = forbidden
external cost = false
repository scope = single
canonical mutation = false
capability chaining = false
maxDispatches <= 1
maxDurationMinutes <= 15
```

No automatic capability may launch another Procedure, create another Dispatch, invoke another capability, request sandbox expansion, or delegate to a nested agent. Any request for network, external cost, multiple Repositories, canonical mutation, capability chaining, or a limit above automatic bounds requires explicit interactive approval and root-side handling. Worker authority still remains proposal-only after approval.

### Strict Procedure validation

`procedure.json` is strict JSON: plain object, no duplicate keys, no unknown keys, no comments, and supported `schemaVersion: 1`. UTF-8 BOM is rejected. The file must decode as valid UTF-8 and end in exactly one LF. The parsed object must equal its canonical manifest serialization byte-for-byte; pretty-printed, reordered, CRLF, or extra-trailing-newline manifests are rejected rather than normalized.

Canonical manifest key order is exactly:

```text
schemaVersion, id, version, stage, kind, inputs, outputs,
networkPolicy, repositoryScope, maxDurationMinutes, maxDispatches, replaces
```

Optional keys are omitted, never encoded as `null`. `replaces`, when present, uses exact key order `id`, then `version`. Arrays preserve declared order, reject empty/non-string entries, and reject duplicates. IDs use lowercase ASCII slugs matching `^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$`. Version is exact SemVer without a leading `v`, build metadata, whitespace, or aliases.

`PROCEDURE.md` must be a non-empty regular file, valid UTF-8 without BOM or NUL. Its exact bytes are authoritative. LF and CRLF bytes are not normalized; a final newline is optional and changes the digest. Instructions must describe one bounded Procedure and cannot grant authority beyond registry, policy, activation, approval, or Context.

Manifest `id`, `version`, `stage`, and `kind` must exactly equal the selected registry entry. Procedure authority may equal or tighten registry authority: `networkPolicy` may change only from registry `declared-only` to manifest `forbidden`; `repositoryScope` may change only from registry `multiple` to manifest `single`; each present limit must be a positive integer less than or equal to its registry ceiling. An omitted limit inherits the registry ceiling. No manifest field may widen authority. `replaces` is required for a project override and must exactly equal the bundled `{id, version}` it replaces. A bundled manifest must omit `replaces`.

### Resolution and override rules

Resolution uses this order:

1. Construct the exact project override directory from validated registry `id` and `version`.
2. If the directory does not exist, resolve the exact bundled directory.
3. If the project directory exists in any form, validate it completely. Never fall back around it.
4. Require both named files to be contained regular files reached without a symlink in any path component.
5. Reject partial, malformed, unsupported, mismatched, unreadable, non-regular, symlinked, escaping, or concurrently changed content.
6. Read both files, validate, compute digest, re-stat/re-read before materialization when execution follows approval, and reject any byte drift.

An absent valid bundled Procedure is a package defect and fails closed. Extra siblings do not enter resolution, digest, worker input, ownership, or cleanup.

### Procedure digest

The Procedure digest input is exactly this byte concatenation:

```text
UTF8("trellis-research-procedure-digest-v1\0")
|| exact canonical procedure.json bytes excluding its final LF
|| 0x0A
|| exact PROCEDURE.md bytes
```

The NUL is the domain separator terminator. The single `0x0A` is the only framing separator between manifest metadata and instructions. No BOM insertion, Unicode normalization, line-ending normalization, whitespace trimming, final-newline insertion/removal, or decoded-string re-encoding is allowed. Empty instructions are invalid before hashing. Omitted optional manifest fields contribute no key or placeholder. Array order and `replaces` key order are digest-significant.

### Policy parsing, merge, and digest

Policy JSON is a strict plain object with no duplicate or unknown keys. UTF-8 BOM, symlinks, non-regular files, path escape, malformed JSON, unsupported schema version, non-integer limits, zero/negative limits, unknown capability IDs, and literal `true` for any `allow*` field fail closed.

Missing policy also fails closed for activation/authorization. Initialization may create the exact conservative policy, but resolution never silently substitutes an in-memory default.

Effective-authority merge order is registry, validated Procedure, policy defaults, then the selected capability override. Every layer can only tighten:

- `enabled: false` disables; `true` is a no-op for an existing enabled registry entry and cannot create or re-enable an absent/disabled entry.
- `activation: "explicit"` may tighten automatic to explicit; no policy value converts explicit to automatic.
- Procedure limits are their declared positive integers or inherited registry ceilings when omitted.
- Policy default limits are positive global ceilings. They may exceed a particular capability ceiling because effective values use the minimum; they never replace a lower registry or Procedure ceiling.
- Capability override limits must be less than or equal to inherited policy defaults. Effective limits are the minimum of registry, Procedure, policy default, and present capability override values.
- `allow*` values can only be literal `false` and cannot grant authority.
- Effective network/repository scope is the strictest registry/Procedure scope; policy cannot increase it.
- Policy cannot add a capability, replace a Procedure binding, change stage, downgrade `workflow`, change worker authority, or increase network/repository scope.

Policy digest input is:

```text
UTF8("trellis-research-policy-digest-v1\0")
|| UTF8(stableResearchJson(strictParsedCompletePolicy))
```

`stableResearchJson` recursively sorts keys and includes its one final LF. The digest covers the complete parsed project policy, so any semantic change that changes canonical JSON invalidates prior authority. Source indentation and object-key order do not change the digest, but normal update still preserves the original valid policy bytes. Duplicate keys, unknown keys, unsupported values, and malformed JSON remain invalid.

### Request digest

Request digest is computed from the canonical ledger `Dispatch`, not trusted sidecar bytes:

```text
UTF8("trellis-research-dispatch-request-digest-v1\0")
|| UTF8(stableResearchJson(dispatchSchema.parse(canonicalDispatch)))
```

It covers every existing Dispatch field, including arbitrary compatibility metadata. It does not make `ownerSkill`, `provider`, or `taskRef` routing authority. Tracked `request.json` must strict-parse and be semantically equal to canonical Dispatch; otherwise Context reports materialization mismatch before digest acceptance.

### Scope hash

`NormalizedDispatchScopeV1` is strict canonical JSON with exact top-level key order shown for documentation; stable JSON sorting remains the byte serializer:

```ts
interface NormalizedDispatchScopeV1 {
  schemaVersion: 1;
  dispatchId: DispatchId;
  repository: {
    id: RepositoryId;
    resolvedRoot: string;
    locator: string;
    expectedRemote?: string;
    observedRemote?: string;
    headRevision?: string;
  };
  artifacts: readonly {
    id: ArtifactId;
    repositoryId: RepositoryId;
    path: string;
    resolvedPath: string;
    revision?: string;
    sha256?: string;
  }[];
  allowedWritePaths: readonly {
    declaredPath: string;
    resolvedPath: string;
  }[];
}
```

Before hashing:

- machine paths are absolute real paths, separators become `/`, dot segments are removed, Windows drive letters are lowercase, and trailing `/` is removed except for `/` or `<drive>:/`;
- tracked locator/artifact/write paths use validated normalized POSIX form;
- artifacts preserve Dispatch context order and may appear only once by ID;
- write entries are deduplicated by the pair `(declaredPath, resolvedPath)` and sorted by `declaredPath`, then `resolvedPath` using Unicode code-point order;
- omitted optional fields are absent, never `null` or empty placeholders;
- remote strings and revisions are exact observed strings after existing Git validation; no case or URL rewriting occurs.

Hash input is:

```text
UTF8("trellis-research-dispatch-scope-hash-v1\0")
|| UTF8(stableResearchJson(normalizedScope))
```

The stored hash reveals no absolute path bytes but intentionally binds an approval to the exact resolved checkout and contained read/write scope. Repository binding, realpath, remote, HEAD, artifact, digest, revision, or write-scope drift requires new activation/approval; Context never repairs it.

### Normalized generic worker contract

Context emits one strict `NormalizedResearchWorkerInputV1`. Aside from the exact `host` field and host-specific process envelope, provider-neutral fields and values are identical for Claude and Codex. Procedure instructions are embedded; workers never resolve or read Procedure files themselves.

Workers:

- perform no Skill discovery or invocation;
- do not read policy, registry, activation sidecars, approval sidecars, request files, ledgers, or projections as a fallback;
- do not grant, revoke, consume, or renew approval;
- do not mutate canonical Research, record Results, review/apply/reject Proposals, or commit Git history;
- do not use network, external cost, multiple Repositories, nested agents, capability chaining, Procedure/Dispatch launch, sandbox expansion, or undeclared reads/writes;
- return exactly one strict Result plus pending Proposal object using supplied output IDs.

The root session validates and records output. Approval consumption is a root-side canonical batch rule defined in `activation-approval-contract.md`.

### Separate Research Skill retirement evidence

C08/C09 must introduce a new immutable evidence source dedicated to these 18 exact historical files:

```text
.claude/skills/trellis-research-setup/SKILL.md
.claude/skills/trellis-research-quest/SKILL.md
.claude/skills/trellis-research-literature/SKILL.md
.claude/skills/trellis-research-ideation/SKILL.md
.claude/skills/trellis-research-experiment/SKILL.md
.claude/skills/trellis-research-computation/SKILL.md
.claude/skills/trellis-research-theory/SKILL.md
.claude/skills/trellis-research-audit/SKILL.md
.claude/skills/trellis-research-writing/SKILL.md
.agents/skills/trellis-research-setup/SKILL.md
.agents/skills/trellis-research-quest/SKILL.md
.agents/skills/trellis-research-literature/SKILL.md
.agents/skills/trellis-research-ideation/SKILL.md
.agents/skills/trellis-research-experiment/SKILL.md
.agents/skills/trellis-research-computation/SKILL.md
.agents/skills/trellis-research-theory/SKILL.md
.agents/skills/trellis-research-audit/SKILL.md
.agents/skills/trellis-research-writing/SKILL.md
```

For every path, evidence records host root, exact relative path, released package/version, released tar entry or immutable source path, normalization rule, and one or more reproduced released SHA-256 values. Evidence must be derived from immutable released Trellis bytes, never current collector output, a working-tree file, representative text, an external/private Skill, or the frozen generic 137/1,009 inventories.

Update/uninstall may delete a historical Research Skill only when all are true:

1. exact safe path is in the dedicated evidence;
2. exact manifest key is already owned or the owning migration explicitly supplies released hash authority;
3. current target is a contained non-symlink regular file;
4. normalized current bytes match a cited released hash;
5. target is not current desired output, protected Research state, externally owned, concurrently changed, or excluded by update policy.

Modified, malformed, unknown, untracked, external `research-*`, sibling, descendant, worker, hook, config, and `.trellis/research/**` files survive. Only confirmed-empty historical Skill directories and then confirmed-empty host Skill roots may be removed with `rmdir`; recursive root deletion is forbidden.

## 4. Validation & Error Matrix

| Condition | Required behavior / stable code |
|---|---|
| Capability ID absent from immutable registry | `UNKNOWN_CAPABILITY`; no Procedure/policy/target read beyond required root state |
| Capability stage differs from canonical Quest stage | `CAPABILITY_STAGE_MISMATCH`; no activation |
| Workflow or policy-tightened explicit capability uses automatic authorization | `EXPLICIT_APPROVAL_REQUIRED` |
| Automatic limits exceed 15 minutes or one Dispatch | `AUTOMATIC_LIMIT_EXCEEDED` |
| Automatic request asks for network/cost/multiple Repositories/mutation/chaining | `AUTOMATIC_AUTHORITY_FORBIDDEN` |
| Project Procedure override directory absent | Resolve bundled exact version |
| Override directory exists but either file is absent/invalid/symlinked/mismatched | `INVALID_PROJECT_PROCEDURE`; no bundled fallback |
| Bundled Procedure is absent/invalid | `INVALID_BUNDLED_PROCEDURE`; package execution blocked |
| Procedure bytes change after activation/approval | `PROCEDURE_DIGEST_MISMATCH`; no Context |
| Policy missing or malformed | `INVALID_RESEARCH_POLICY`; no activation/authorization/context |
| Policy attempts to widen registry authority | `POLICY_WIDENS_AUTHORITY` |
| Policy changes after approval | `POLICY_DIGEST_MISMATCH`; no Context |
| Tracked request differs from canonical Dispatch | `REQUEST_STATE_MISMATCH` |
| Request digest differs from activation/approval | `REQUEST_DIGEST_MISMATCH` |
| Binding, realpath, remote, HEAD, artifact, or write scope differs | `SCOPE_HASH_MISMATCH` |
| Host differs from approval | `APPROVAL_HOST_MISMATCH` |
| Worker attempts Skill/Procedure discovery or forbidden authority | Block locally; return bounded Result/Proposal only if valid output IDs are already available |
| Historical Skill exact released hash matches all ownership gates | Delete exact file; remove only confirmed-empty dirs |
| Historical Skill differs, is unknown, external, malformed, or unowned | Preserve bytes and release/no-op ownership as applicable |

## 5. Good / Base / Bad Cases

- **Good**: `research.computation.case` resolves a valid project override replacing `computation-case-v1@1.0.0`, policy enables automatic work at 10 minutes/one Dispatch, all authority is single-Repository/no-network/proposal-only, and both hosts receive equivalent embedded instructions and immutable authority flags.
- **Base**: no override directory exists. The exact bundled Procedure resolves. Policy keeps automatic disabled, so activation can be planned but `authorize` reports `EXPLICIT_APPROVAL_REQUIRED` until policy is explicitly tightened/configured for the intended bounded path.
- **Bad**: a partial override contains only `PROCEDURE.md`; resolver silently falls back to bundled content. This is forbidden because an existing invalid override must fail closed.
- **Bad**: policy names a new capability, raises duration, sets `allowNetwork: true`, changes a Procedure ID, or makes a workflow automatic. Strict parsing/merge rejects before any activation or target write.
- **Bad**: a worker scans `.claude/skills`, `.agents/skills`, or `.trellis/research/procedures`, or launches another Procedure. Embedded normalized input is the only instruction source.
- **Bad**: cleanup deletes every `research-*` directory. Only exact dedicated evidence plus released matching bytes can authorize one exact file deletion.

## 6. Tests Required

- Exact immutable capability inventory, field values, order-independent lookup, stage agreement, and absence of a `complete` entry.
- Automatic eligibility matrix across kind, activation, duration, Dispatch count, network, cost, repository scope, mutation, and chaining.
- Strict manifest accepted canonical bytes plus every unknown/missing/duplicate/key-order/newline/UTF-8/version/ID/stage/kind/limit failure.
- Project-first resolution, absent override fallback, and fail-closed partial/malformed/symlink/escape/mismatch/concurrent-change overrides.
- Digest vectors covering optional-field omission, array order, `replaces`, LF/CRLF, final newline, Unicode bytes, and exact lowercase prefix.
- Missing/malformed/noncanonical policy failure; exact conservative creation; normal-update byte preservation; full registry/Procedure/default/override tightening matrix, including omitted Procedure limits and global defaults above lower capability ceilings.
- Request digest vectors proving all existing Dispatch fields bind while arbitrary metadata remains non-routing.
- Scope hash vectors for portable normalization, deterministic sorting, binding/realpath/remote/HEAD/artifact/write drift, and no raw absolute path in canonical events.
- Shared Claude/Codex normalized-input fixtures equal after changing only `host`; no Skill/Procedure discovery strings or authority widening.
- Dedicated Research Skill evidence provenance and exact 18-path inventory; pristine deletion; modified/malformed/unknown/external/protected/concurrent preservation; confirmed-empty-only directory removal.
- Fresh and updated packed CLI contains Procedures and retirement evidence but, after C09, contains no active Research Skill source or payload.

## 7. Wrong vs Correct

```text
Wrong: ownerSkill or a discovered host Skill chooses execution.
Correct: canonical Quest stage + immutable capability ID select one registry-bound Procedure.
```

```text
Wrong: an invalid project override falls back to bundled instructions.
Correct: absence falls back; presence makes the project override authoritative and validation fails closed.
```

```text
Wrong: JSON.stringify(parsedManifest) plus normalized Markdown is close enough for hashing.
Correct: hash the exact domain bytes, canonical manifest bytes without its final LF, one LF separator, and exact PROCEDURE.md bytes.
```

```text
Wrong: project policy may enable network because an operator wrote true.
Correct: policy can only disable, force explicit activation, or reduce limits; wider authority needs the explicit approval/root-side path and never expands worker mutation authority.
```

```text
Wrong: workers read Procedure files or discover Skills after Context.
Correct: Context embeds validated Procedure instructions and immutable authority in one provider-neutral object.
```

```text
Wrong: a historical Skill path or generic cleanup inventory authorizes deletion.
Correct: exact dedicated path, existing ownership, immutable released-byte hash, current-byte match, and containment together authorize one file deletion.
```
