# Research Procedure packages

## Schema domains

Keep separate:

1. Procedure package schema (v1 two-file, v2 hybrid support pack)
2. Research event schema
3. Worker Context schema

## v1 packages

Layout: `procedure.json` + `PROCEDURE.md` only. Digest domain `trellis-research-procedure-digest-v1`. Unnamed siblings are non-authoritative.

## v2 packages

Layout adds enumerated `methodology/` support pack via `methodology/pack.json`. Digest domain `trellis-research-procedure-digest-v2` binds:

1. canonical procedure.json
2. PROCEDURE.md bytes
3. canonical pack.json
4. ordered inventory metadata
5. exact bytes of every enumerated entry

## Resolver modes

- `registry-current` — capability registry id@version for new activations
- `activation-recorded` — exact recorded id/version for historical revalidation

Historical activations must never inherit new package bytes after a registry current-version switch.

## Scenario: accepted evaluation-contract v1.3.1 Core path

### 1. Scope / Trigger

Use this path only for the accepted `evaluation-contract-v1.3.1` identity and dormant Procedure `2.0.7`. It is additive: historical `V13_*`, v1.3.0 digests, Procedure `2.0.0` through `2.0.6`, legacy freeze-family loading, and historical report serialization remain unchanged.

The immutable authority is the exact seven-member A133 pack at commit `5a038a87531c3dbfa7b52ba82eaa59d856ab1ea3`, member aggregate `sha256:718d7ecec808199148b63ce64208e60d52be18575b175df67ef620596107fa34`, and semantic digest `sha256:8e2cd20dd8e12caab318852f82a100116a28d405113f654efbda7b3646f666af`.

### 2. Signatures

Public APIs are exported only through `@mindfoldhq/trellis-core/research`:

```ts
function parseAcceptedV131ContractPack(input: {
  leafBytes: Readonly<Partial<Record<V131LeafFileName, Uint8Array>>>;
}): V131AcceptedContractPack;

function selectApplicableV131BindingsForProcedure(input: {
  pack: V131AcceptedContractPack;
  procedureId: string;
  procedureVersion: string;
  capabilityId: string;
}): readonly V131ApplicableBinding[];

function executeV131BindingInvocations(input: {
  pack: V131AcceptedContractPack;
  applicableBindings: readonly V131ApplicableBinding[];
  factForBinding(binding: V131ApplicableBinding):
    | { source: string; authenticated: boolean; value: unknown }
    | undefined;
}): V131BindingExecutionResult;

function parseAcceptedV131ResearchProcedure(
  input: ParseResearchProcedureInput,
): ParsedResearchProcedure;

function buildMethodologyReportV131(
  input: MethodologyDeterministicReportV131,
): MethodologyDeterministicReportV131;

function serializeMethodologyReportV131Sidecar(input: {
  report: MethodologyDeterministicReportV131;
  reportDigest: string;
}): string;
```

### 3. Contracts

- Pack authentication requires exactly the seven ordered `*.v1.3.1.json` leaf names, exact byte lengths and SHA-256 values, aggregate framing `trellis-accepted-v13-pack-members\0`, and exact semantic identity. Missing, extra, renamed, reordered, aliased, truncated, modified, or mutable-worktree-derived members are not authority.
- The authenticated pack contains exactly 17 Procedure/capability/artifact-family mappings, 14,365 lifecycle decisions, 975 positive decisions, 13,390 negative decisions, and four `notApplicable` mappings. Lifecycle applicability is exact:

  ```text
  mappingRow.disposition == "applicable"
  AND binding.targetArtifactFamily == mappingRow.artifactFamily
  ```

- Every applicable binding invokes one exact critical `(validator id, version, severity)` triple. Facts are closed-schema, source-labelled, and explicitly `authenticated: true`; schema-valid unauthenticated facts still fail closed. Invocation count must equal applicable-binding count.
- `parseAcceptedV131ResearchProcedure` requires `identityMode: "recorded-version"`, recorded and manifest version `2.0.7`, package schema v2, digest domain v2, and the exact v1.3.1 methodology identity/digest. It uses the generic schema-v2 parser and never the legacy 2.0.4 freeze-family loader.
- The report-v2 body has exactly 19 required top-level properties: `$schema`, `schemaVersion`, `methodologyIdentity`, `methodologyDigest`, `procedureId`, `procedureVersion`, `procedureDigest`, `supportInventoryDigest`, `questId`, `dispatchId`, `activationId`, `approvalId`, `artifactBindings`, `closureSources`, `orderedValidatorTriples`, `orderedFindings`, `applicability`, `blockedFacts`, and `zeroWriteDisposition`.
- Validator triples must equal the accepted 20-entry array in exact order. Findings are ordered by validator ID, version, target ID, stable error, then fact pointer. The report and nested rows reject unknown properties and illegal nulls.
- `zeroWriteDisposition` is exactly one of `validation-complete-before-write`, `rejected-before-write`, or `validator-not-run-no-write`.
- Report digest domain is `trellis-evaluation-report-v2\0`. The digest is external to the report object and computed from canonical report JSON without a final LF. Sidecar serialization revalidates the closed schema and external digest, emits no `reportDigest` field, and appends exactly one final LF.
- Worker authority remains `proposal-only`; live selection remains `1.0.0`.

### 4. Validation & Error Matrix

| Condition | Required behavior |
| --- | --- |
| A leaf is missing, extra, renamed, reordered, truncated, or modified | Reject before semantic parsing |
| Aggregate, semantic identity, mapping digest, or population count drifts | Reject the complete pack |
| Procedure/capability mapping is missing, duplicated, contradictory, or not version `2.0.7` | Fail closed; select no fallback |
| A mapping is `notApplicable` | Select zero lifecycle bindings for that mapping |
| Validator triple is unknown, downgraded, duplicated, or out of accepted order | Reject before report or invocation authority |
| Applicable binding fact is absent, unknown-keyed, schema-invalid, contradictory, ambiguous, aliased, or unauthenticated | Produce a critical fail-closed invocation; write nothing |
| Applicable-binding and invocation counts differ | Reject with invocation-count mismatch |
| Report has a missing/unknown field, illegal null, invalid nested row, or unordered findings/triples | Reject report construction or sidecar serialization |
| External report digest mismatches canonical body | Reject sidecar serialization |
| Procedure uses current-version identity, another version, schema v1, or wrong methodology digest | Reject as `INVALID_RESEARCH_PROCEDURE` |
| Historical v1.3.0 report or Procedure is replayed | Preserve historical parser and serializer behavior byte-for-byte |

### 5. Good / Base / Bad Cases

- **Good:** authenticate the seven exact leaves; resolve an applicable `2.0.7` mapping; provide one authenticated closed-schema fact per selected binding; construct the 19-field report; store its digest externally; serialize with one final LF.
- **Base:** a `notApplicable` mapping produces zero lifecycle applicability while closure/global rules remain governed by their own accepted predicates. No lifecycle fact is invented.
- **Bad:** accept a schema-valid fact with `authenticated: false`, sort validator triples as a set, infer closure from Result status, place `reportDigest` inside the v1.3.1 report, or route `2.0.7` through the legacy 2.0.4 loader.

### 6. Tests Required

- `methodology-v13-runtime.test.ts`: exact seven-member identities and counts; member mutation failures; 17-row mapping and digest; 14,365/975/13,390 reconciliation; four `notApplicable` rows; authenticated fact requirement; one invocation per applicable binding.
- `methodology-runtime.test.ts`: exact ordered 20-validator array; closed 19-field report and nested schemas; three zero-write dispositions; external digest; one-final-LF serialization; report tamper/order/null/unknown-key failures; historical serializer compatibility.
- `methodology-contract.test.ts`: exact dormant Procedure `2.0.7` binding through generic schema-v2 parsing; wrong identity/version/mode rejection; unchanged live `1.0.0` selection and Proposal-only authority.
- Focused suites run before full Core lint, typecheck, test, and clean build. Core clean/build and CLI consumers of Core `dist` must be serialized.

### 7. Wrong vs Correct

#### Wrong

```ts
executeV131BindingInvocations({
  pack,
  applicableBindings,
  factForBinding: () => ({
    source: "caller-asserted",
    authenticated: false,
    value: schemaValidFact,
  }),
});
```

Schema validity alone is not authority.

#### Correct

```ts
const report = buildMethodologyReportV131(reportBody);
const reportDigest = computeMethodologyReportV2DigestFromCanonicalBody(
  canonicalResearchJson(report),
);
const sidecar = serializeMethodologyReportV131Sidecar({ report, reportDigest });
```

The caller supplies authenticated facts, exact ordered triples, and an external digest; Core revalidates the closed report before emitting exactly one final LF.
