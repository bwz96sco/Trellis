# Technical design

## Boundary

C04 adds pure Procedure/policy contracts in core, filesystem/package resolution in CLI, package-internal assets, explicit Research-init policy creation, and additive packing proof.

```text
capability ID
  -> immutable C03 registry binding
  -> project override or bundled Procedure
  -> strict bytes + Procedure digest
  -> strict project policy + policy digest
  -> tightening-only effective authority
  -> automatic eligibility result
```

The output is inactive infrastructure. C05/C06 consume it later. C04 does not change current Skill-based Context or worker execution.

## GitNexus blast radius and stop gates

Fresh index at commit `5034ac01`: 15,288 nodes, 20,598 edges, 207 clusters, 300 flows.

| Symbol | Risk | C04 handling |
|---|---:|---|
| `stableResearchJson` | CRITICAL | Import/call unchanged; never edit. |
| `writeFileAtomic` | CRITICAL | Call unchanged only for unique staging-file creation; publish final policy with exclusive no-replace semantics; never edit. |
| `collectResearchPlatformPayload` | HIGH | Do not call or edit. Procedures are host-neutral package assets. |
| `init` | MEDIUM | Do not edit root init. |
| `initializeResearch` | LOW | Only existing orchestration function planned for edit. |
| `buildPackedCliInventory` | LOW | Add 28 positive Procedure paths only; retain Skill assertions. |
| C03 capability APIs | LOW/static under-reporting | Consume unchanged and run public/packed boundary tests. |

Any new HIGH/CRITICAL edit, unexpected process expansion, or need to modify Context/workers/update/uninstall returns to planning.

## Core module design

### `strict-json.ts`

Private duplicate-aware JSON grammar scanner:

- reject BOM before decoding;
- fatal UTF-8 decode;
- parse full JSON token grammar and trailing whitespace only;
- maintain decoded-key sets per object;
- treat escaped-equivalent keys as duplicates;
- reject invalid strings, escapes, unpaired surrogate escapes, malformed numbers, comments, and trailing tokens;
- accept valid escaped surrogate pairs and treat their decoded key value as duplicate-equivalent to the same literal Unicode key;
- call `JSON.parse` only after the scanner succeeds.

No dependency and no regex-only duplicate detection.

### `procedure-policy.ts`

Public Research-subpath types:

```ts
type ResearchProcedureSource = "bundled" | "project";

interface ParsedResearchProcedure {
  readonly capability: ResearchCapabilityDefinition;
  readonly source: ResearchProcedureSource;
  readonly manifest: ResearchProcedureManifest;
  readonly canonicalManifestJson: string; // compact canonical JSON + one LF
  readonly instructions: string;          // exact decoded UTF-8 text
  readonly digest: string;                // sha256:<64 lowercase hex>
}

interface ParsedResearchProjectPolicy {
  readonly policy: ResearchProjectPolicyV1;
  readonly sourceJson: string; // exact decoded source text; formatting retained
  readonly digest: string;
}

interface ResearchEffectiveAuthority {
  readonly capabilityId: ResearchCapabilityId;
  readonly procedure: Readonly<{ id: string; version: string; digest: string }>;
  readonly enabled: boolean;
  readonly kind: ResearchCapabilityKind;
  readonly activation: ResearchActivationMode;
  readonly automaticPolicyEnabled: boolean;
  readonly workerAuthority: "proposal-only";
  readonly networkPolicy: "forbidden" | "declared-only";
  readonly repositoryScope: "single" | "multiple";
  readonly allowExternalCost: false;
  readonly allowCanonicalMutation: false;
  readonly allowCapabilityChaining: false;
  readonly maxDurationMinutes: number;
  readonly maxDispatches: number;
}

type ResearchAutomaticIneligibilityReason =
  | "CAPABILITY_DISABLED"
  | "AUTOMATIC_POLICY_DISABLED"
  | "CAPABILITY_NOT_BOUNDED"
  | "ACTIVATION_NOT_AUTOMATIC"
  | "NETWORK_NOT_FORBIDDEN"
  | "EXTERNAL_COST_ALLOWED"
  | "REPOSITORY_SCOPE_NOT_SINGLE"
  | "CANONICAL_MUTATION_ALLOWED"
  | "CAPABILITY_CHAINING_ALLOWED"
  | "MAX_DISPATCHES_EXCEEDED"
  | "MAX_DURATION_EXCEEDED";

interface ResearchAutomaticEligibility {
  readonly eligible: boolean;
  readonly reasons: readonly ResearchAutomaticIneligibilityReason[];
}
```

`ResearchProcedureManifest`, `ResearchCapabilityPolicyV1`, and `ResearchProjectPolicyV1` follow the exact C01 schemas and use C03 public capability/stage/kind/activation types rather than duplicate unions.

Public functions/constants:

```ts
CONSERVATIVE_RESEARCH_PROJECT_POLICY_JSON: string

parseResearchProcedure(input: {
  capabilityId: string;
  source: ResearchProcedureSource;
  manifestBytes: Uint8Array;
  instructionBytes: Uint8Array;
}): ParsedResearchProcedure

computeResearchProcedureDigest(input: {
  canonicalManifestBytes: Uint8Array;
  instructionBytes: Uint8Array;
}): string

parseResearchProjectPolicy(policyBytes: Uint8Array): ParsedResearchProjectPolicy
computeResearchProjectPolicyDigest(policy: ResearchProjectPolicyV1): string

resolveResearchEffectiveAuthority(input: {
  capabilityId: string;
  procedure: ParsedResearchProcedure;
  policy: ParsedResearchProjectPolicy;
}): ResearchEffectiveAuthority

evaluateResearchAutomaticEligibility(
  authority: ResearchEffectiveAuthority,
): ResearchAutomaticEligibility
```

`parseResearchProcedure` looks up the registered C03 capability before accepting identity, validates source-specific `replaces` and tightening rules, exposes immutable manifest/instruction text plus the digest, and retains canonical manifest text including its one final LF. `parseResearchProjectPolicy` exposes immutable parsed policy, exact decoded source text, and digest through unchanged `stableResearchJson`.

All input byte arrays are defensively copied before validation. The runtime-freeze guarantee applies to returned semantic objects, nested objects, and arrays; mutable typed-array views are not exposed or claimed frozen. Digest functions consume caller-provided bytes without normalization.

Automatic ineligibility reasons, in exact order:

```text
CAPABILITY_DISABLED
AUTOMATIC_POLICY_DISABLED
CAPABILITY_NOT_BOUNDED
ACTIVATION_NOT_AUTOMATIC
NETWORK_NOT_FORBIDDEN
EXTERNAL_COST_ALLOWED
REPOSITORY_SCOPE_NOT_SINGLE
CANONICAL_MUTATION_ALLOWED
CAPABILITY_CHAINING_ALLOWED
MAX_DISPATCHES_EXCEEDED
MAX_DURATION_EXCEEDED
```

Return all applicable reasons; `eligible` is true only for an empty array.

Core validation errors may remain internal, with path/message detail. CLI maps them to stable source-aware codes.

## Manifest and instruction contract

Manifest field order is fixed. Bundled assets include explicit limits and omit `replaces`; project overrides require it. Common exact arrays:

```json
"inputs":["dispatch","repository","context","artifacts","allowedWritePaths","expectedOutputs","checks"]
"outputs":["result","proposal"]
```

Canonical manifest bytes are compact JSON in field order plus one LF. Validation compares raw bytes to generated canonical bytes. SemVer validation accepts the SemVer core plus optional prerelease grammar, rejects build metadata, and rejects leading zeroes in core or numeric prerelease identifiers; selected identity must still equal the registry-bound `1.0.0`. `PROCEDURE.md` exact bytes are not normalized.

All 14 assets follow `research/procedure-content-matrix.md`. Workflow Procedures plan/synthesize root-side orchestration but never launch Dispatches, access network, traverse repositories, mutate canonical state, or expand worker authority.

## CLI module design

### `bundled-procedure-root.ts`

Resolve package-internal `templates/research/procedures` relative to `import.meta.url`, compatible with source and compiled layouts. No host detection, CWD dependence, project copy, or payload collector.

### `procedure-resolution.ts`

Package-internal APIs:

```ts
resolveResearchProcedure(input: {
  root: string;
  capabilityId: string;
}): Promise<ParsedResearchProcedure>

resolveResearchProcedureAuthority(input: {
  root: string;
  capabilityId: string;
}): Promise<{
  procedure: ParsedResearchProcedure;
  policy: ParsedResearchProjectPolicy;
  authority: ResearchEffectiveAuthority;
  automaticEligibility: ResearchAutomaticEligibility;
}>
```

Unknown capability IDs propagate the C03 `ResearchCapabilityResolutionError` before any Procedure or policy filesystem read. Filesystem/content failures use one typed package-internal error:

```ts
type ResearchProcedureResolutionErrorCode =
  | "INVALID_PROJECT_PROCEDURE"
  | "INVALID_BUNDLED_PROCEDURE";

class ResearchProcedureResolutionError extends Error {
  readonly code: ResearchProcedureResolutionErrorCode;
  readonly cause?: unknown;
}
```

Resolution:

1. Resolve capability through C03 registry.
2. Construct only registry-bound ID/version paths.
3. Validate single path segments before join.
4. Inspect existing project path components with `lstat`; reject symlinks and non-directory intermediates.
5. Only exact `ENOENT` absence selects bundle; any present state owns resolution.
6. Require selected directory and named files; realpath/containment check.
7. Capture directory/file type, device/inode where available, size, and high-resolution modification/change timestamps; read exact `Uint8Array`; repeat `lstat`/realpath/containment checks and reject replacement or in-place drift.
8. Parse/digest in core.
9. Ignore and never enumerate every unnamed sibling; only the two registry-bound named files participate, so extra regular or non-regular siblings cannot affect selection, digest, ownership, or cleanup.
10. Map all selected project failures to `INVALID_PROJECT_PROCEDURE`; bundled failures to `INVALID_BUNDLED_PROCEDURE`, preserving cause.

No fallback from invalid project to bundle.

### `project-policy.ts`

Package-internal APIs:

```ts
readResearchProjectPolicy(input: {
  root: string;
}): Promise<ParsedResearchProjectPolicy>

ensureResearchProjectPolicyForInit(input: {
  root: string;
  dryRun: boolean;
}): Promise<{
  outcome: "existing" | "created" | "would-create";
  policy: ParsedResearchProjectPolicy;
}>
```

`read` always requires the file and applies the same component containment plus pre/post identity checks as Procedure reads. `ensure` allows only absent-file creation:

- existing: contained strict read/parse, exact-byte preservation;
- absent + dry-run: validate the current parent path without creating it, parse conservative bytes in memory, return `would-create`;
- absent + live: validate/create only required contained directories, capture the contained parent-chain identity, use `writeFileAtomic` unchanged to stage exact bytes at a unique same-directory sibling, repeat parent identity/realpath checks immediately before and after publishing to `policy.json` with an atomic exclusive no-replace link, verify the published named file is the staged regular-file identity, and clean the staging path best-effort;
- concurrent winner: on destination-exists, preserve and strict-read the winner with the same pre/post identity checks; return `existing` only when valid, otherwise fail without replacement;
- present-invalid: fail without replacement.

Stable errors:

```ts
type ResearchProjectPolicyErrorCode =
  | "INVALID_RESEARCH_POLICY"
  | "POLICY_WIDENS_AUTHORITY";

class ResearchProjectPolicyError extends Error {
  readonly code: ResearchProjectPolicyErrorCode;
  readonly cause?: unknown;
}
```

`INVALID_RESEARCH_POLICY` covers bytes, JSON grammar/schema, unsupported non-grant values, unknown capability IDs, path/type/identity/read failures, and missing ordinary policy. `POLICY_WIDENS_AUTHORITY` covers recognized grant attempts: literal `true` in any `allow*`, `activation:"automatic"`, or a capability limit above the policy default. `enabled:true` is valid and remains a no-op. Procedure widening maps to `INVALID_PROJECT_PROCEDURE` or `INVALID_BUNDLED_PROCEDURE`, never the policy code.

## Research-init integration

Edit `initializeResearch` only after its recorded LOW upstream impact:

1. Resolve root and existing initialization state.
2. Preserve conflict result before any policy repair.
3. For fresh or matching initialization, ensure/validate policy.
4. Dry-run reports prospective creation but writes nothing.
5. Matching workspace returns current replay result after policy handling.
6. Fresh workspace continues unchanged ledger/projection initialization.

Policy-first ordering avoids ledger writes after policy failure. If later initialization fails, an exact conservative policy may remain; retry validates and preserves it. Do not invent a cross-store transaction.

## Policy merge semantics

- Registry values are immutable ceilings.
- Procedure can tighten network/repositories/limits.
- Policy defaults and override can further tighten.
- `enabled:false` disables; `true` no-op.
- Global `automaticEnabled:true` is the only automatic opt-in.
- Override `activation:"explicit"` tightens automatic only.
- Limits use minimum; override cannot exceed policy defaults.
- `allowNetwork:false` and `allowMultipleRepositories:false` tighten Procedure/registry authority to forbidden/single; every other `allow*` remains false. No `allow*` value grants worker authority.
- Policy cannot alter identity, kind, binding, or worker authority.
- C04 returns the tightened effective result only. It does not define whether or how C05 explicit approval handles a broader root-side request, and approval never widens worker authority.

`POLICY_WIDENS_AUTHORITY` distinguishes recognized semantic grant attempts from malformed policy.

## Bundled and packed assets

Layout:

```text
packages/cli/src/templates/research/procedures/<id>/1.0.0/
  procedure.json
  PROCEDURE.md
```

Existing recursive template copy places assets in `dist`; no copy-script change should be required. Add all 28 paths to positive packed CLI inventory. Keep current Skill positive requirements. Add representative packed-core runtime/type imports for C04 APIs without root leakage or deep export.

## Expected file scope

New core:

```text
packages/core/src/research/strict-json.ts
packages/core/src/research/procedure-policy.ts
```

Modified core:

```text
packages/core/src/research/index.ts
packages/core/scripts/verify-packed-core.js
```

New CLI:

```text
packages/cli/src/commands/research/bundled-procedure-root.ts
packages/cli/src/commands/research/procedure-resolution.ts
packages/cli/src/commands/research/project-policy.ts
packages/cli/src/templates/research/procedures/**
```

Modified CLI:

```text
packages/cli/src/commands/research/command.ts
packages/cli/scripts/packed-cli-audit.js
```

New tests:

```text
packages/core/test/research/strict-json.test.ts
packages/core/test/research/procedure-policy.test.ts
packages/cli/test/commands/research-procedure-resolution.integration.test.ts
packages/cli/test/commands/research-policy-init.integration.test.ts
```

Modified tests:

```text
packages/core/test/compatibility/package-exports.test.ts
packages/cli/test/scripts/packed-cli-audit.test.ts
```

Specs:

```text
.trellis/spec/core/backend/research-state.md
.trellis/spec/cli/backend/filesystem-safety.md
.trellis/spec/cli/backend/commands-research.md
.trellis/spec/cli/backend/release-process.md
.trellis/spec/cli/unit-test/conventions.md
```

Explicit no-edit boundaries include platform payload, atomic writer, stable serializer, root init, update, uninstall, manifest pruning, Dispatch Context, workers/hooks/Skills, package manifests, root barrel, docs-site, and marketplace.

## Tests

Core tests cover strict JSON grammar including valid paired and invalid unpaired surrogate escapes, escaped-equivalent duplicate keys, canonical manifests, exact bytes, SemVer, digests, policy schema/error classification, all 14 effective authorities, semantic freeze behavior without mutable byte views, and automatic reasons.

CLI tests use real temp trees for project/bundle precedence, symlink/non-regular/containment/unreadable/drift cases, source/dist package roots, policy creation/preservation, concurrent valid/invalid creator races, and init sequencing.

Regression tests prove root init/update/uninstall/state preservation and unchanged Skill/worker behavior. Real packed tarball proves all 28 assets plus retained Skill inventory.

## Rollback

Independent units:

1. strict core parsing/authority;
2. bundled assets;
3. CLI filesystem/policy init;
4. packed presence proof.

Rollback only current unit on failure. No data migration or ledger event exists. Never fix forward by editing frozen HIGH/CRITICAL or C05-C09 surfaces.
