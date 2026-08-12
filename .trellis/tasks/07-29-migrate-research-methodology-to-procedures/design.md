# Phase-2 Research methodology migration design

## 1. Design objective

Extend the existing Research Procedure control plane so it can carry and enforce the Phase-1-frozen methodology contract without restoring host-discovered Skill authority or allowing unreviewed files to influence execution.

The parent task is an orchestration and integration boundary. Production work belongs to independently verifiable children. The migration remains dormant until a single reviewed activation child updates the live capability bindings.

Authoritative pins:

- Methodology contract: `evaluation-contract-v1.2.0`
- Methodology digest: `57d1956bf4453b497cce0e288c95d7194491ddac611570e8e0c8c0aefb7516bb`
- Private source evidence commit: `9a02a533f5f3ecfd0c0789a01588fc492d321d6c`
- Trellis implementation base: `ccd5bb3afc99283252c599916a2b8c2e05075cc6`

The private repository is evidence only. Phase 2 may reimplement observable behavior but must not copy private bodies, validator code, prompts, tests, cases, or raw outputs.

## 2. Existing authority boundary to preserve

The current control plane is the only authority spine:

```text
Quest stage
  -> immutable capability selection
  -> exact Procedure ID/version
  -> project-first or bundled Procedure resolution
  -> Procedure digest + policy digest + request digest + scope hash
  -> activation
  -> host-specific expiring approval
  -> normalized zero-write worker Context
  -> worker Result + pending Proposal
  -> root validation and recording
  -> root-owned Decision
```

Phase 2 must not introduce a second methodology authority through Skills, filesystem discovery, worker-side validators, arbitrary commands, or undigested support files.

Workers retain these immutable false authorities:

- canonical Research mutation;
- Proposal review/application/rejection;
- approval or activation;
- capability, Procedure, Dispatch, or nested-agent launch;
- capability chaining without a separately approved root composition;
- Git-history mutation;
- network, external-cost, repository, or sandbox expansion;
- random canonical Result/Proposal/Decision identifiers;
- worker-side Result recording.

## 3. Architecture decision: hybrid authoritative package

Use a hybrid of:

1. **Digest-bound Procedure support packs** for methodology instructions, templates, artifact contracts, rubrics, and declarative validator descriptors.
2. **Versioned trusted runtime contracts** for parsing, path safety, provenance checks, deterministic validation, report generation, activation binding, and authority enforcement.

Instruction-only two-file Procedures are insufficient for the frozen workflow family. Executable validators or arbitrary commands inside a support pack are forbidden because they would create a second code authority.

### 3.1 Preserve schema-v1 exactly

Existing `1.0.0` Procedures keep their exact two-file contract and digest framing:

```text
<procedure-id>/1.0.0/
  procedure.json
  PROCEDURE.md
```

No existing bytes are rewritten in place. Existing digest vectors, project overrides, activation records, approval records, schema-v1 event replay, and schema-v2 activation/approval replay remain valid.

### 3.2 Add a new versioned package form

Version terminology is explicit throughout Phase 2:

- **Procedure package schema v2** governs `procedure.json` plus the support-pack inventory;
- **Research event schema v1/v2** governs canonical event replay and is unchanged by the package schema name;
- **worker Context v1/v2** governs the normalized worker input shape.

These are independent version domains. A package-schema change never implies an event-schema migration or silent Context upgrade.

New Procedure versions may use a Procedure package schema-v2 form:

```text
<procedure-id>/<new-version>/
  procedure.json
  PROCEDURE.md
  methodology/
    pack.json
    instructions/...
    artifacts/...
    templates/...
    rubrics/...
    validators/...
```

The exact names and JSON schemas are frozen by P2-01 before P2-02 implementation. The following semantic fields are mandatory regardless of spelling:

- package schema version;
- methodology contract version and digest;
- source-evidence provenance reference;
- normalized relative entry path;
- semantic role;
- media type;
- exact SHA-256;
- exact byte-size limit;
- worker visibility;
- entry contract/schema version;
- stable ordering rule.

Every authoritative entry is explicitly enumerated. Unnamed siblings remain non-authoritative and ignored. Missing, malformed, duplicated, escaping, symlinked, unsupported, concurrently replaced, oversized, or digest-mismatched entries fail closed.

### 3.3 Digest model

Keep the current v1 digest domain unchanged. Define a distinct v2 digest domain.

The v2 Procedure digest binds:

1. canonical `procedure.json`;
2. exact `PROCEDURE.md` bytes;
3. canonical support-pack manifest;
4. the normalized ordered inventory;
5. exact bytes of every enumerated entry.

The support-pack manifest may contain entry hashes, but it must not contain a self-referential final Procedure digest. The parser computes and returns one immutable Procedure digest that existing activation and approval fields can bind without adding silent authority to historical records.

## 4. Filesystem resolution and project overrides

Reuse the existing contained, stable-read, project-first resolver model.

Required behavior:

- capability and expected Procedure identity are validated before path construction;
- every directory component is a contained non-symlink directory;
- every enumerated entry is a contained non-symlink regular file;
- named path and file identities are captured before read and revalidated after the complete package read;
- exact bytes are never newline-normalized;
- genuine project-version absence may use bundled fallback;
- present-invalid project content is authoritative failure and never falls back;
- an unnamed sibling cannot affect source selection, digest, or Context;
- bundled defects map to bundled Procedure failure, project defects to project Procedure failure.

Project overrides replace one exact Procedure version. They cannot add validator implementations, executable commands, undeclared files, extra authority, or relaxed provenance rules.

## 5. Historical Procedure resolution

A live registry version switch must not make old activations resolve through the new version.

P2-02 must introduce exact historical resolution using the activation-recorded:

```text
capabilityId + procedure.id + procedure.version + procedure.digest
```

Rules:

- preparing a new activation resolves the registry's current binding;
- revalidating an existing activation resolves its recorded ID/version;
- the resolved manifest must still match the capability's stage, kind, and authority ceiling;
- the resolved digest must equal the activation digest;
- old bundled versions remain packaged while any recorded activation may reference them;
- present-invalid old project overrides fail closed;
- no activation silently upgrades or inherits new support-pack bytes.

If an activated version later needs rollback, a reviewed registry rollback may change future selection while historical activations continue to resolve recorded bytes, or a forward-fix version may be issued. Do not claim a nonexistent canonical disable event, and do not delete or reinterpret recorded bytes.

## 6. Artifact methodology contract

Do not overload the existing portable `ArtifactRef`. Add a separate versioned methodology contract that describes expected artifacts while actual outputs continue to reference repository-relative files.

Each contract can describe:

- stable artifact contract ID and version;
- required versus optional status;
- minimum and maximum cardinality;
- canonical path/name pattern and media type;
- producer stage and allowed consumer stages;
- predecessor/dependency artifacts;
- stable entity/candidate/case ID rules;
- provenance and source-boundary rules;
- terminal-state applicability;
- cross-artifact consistency constraints;
- validator descriptor bindings.

The runtime validates actual `ArtifactRef` records and file bytes against this contract. Source facts, analyst synthesis, evaluator attacks, worker recommendations, and root Decisions remain distinct artifact/evidence classes.

## 7. Validator and report runtime

Support packs contain only declarative validator descriptors. A descriptor references a trusted root-side validator by stable ID and version.

Forbidden descriptor behavior:

- arbitrary shell commands;
- dynamic module paths;
- private source imports;
- network requests;
- model calls;
- worker or nested-agent launches;
- filesystem scope beyond declared artifacts;
- canonical mutation.

A deterministic validation report binds:

- Procedure ID/version/digest;
- methodology contract version/digest;
- Dispatch and Activation IDs and binding digests;
- Result and Proposal IDs and canonical input digests;
- ordered artifact IDs, paths, media types, and SHA-256 values;
- validator IDs and versions;
- stable finding/error codes;
- pass, fail, blocked, partial, null, or inconclusive outcome as applicable.

Validation runs root-side before Result/Proposal ledger commit. A critical failure prevents the success/selection claim from being recorded. Reports are deterministic projections or bounded materializations, not worker assertions and not new canonical decision authority.

## 8. Root-owned bounded composition

Composition is not an ordinary handoff and is never worker authority. P2-03 owns a strict `ResearchCompositionDescriptorV1` or equivalently named frozen contract and the trusted root runtime that validates it.

The descriptor is canonical or deterministically bound to existing canonical Dispatch/Activation/Proposal records and includes:

- stable composition and frozen edge IDs;
- parent Dispatch and Activation identity;
- allowed child capability or explicitly bounded adapter;
- exact maximum child count and remaining dispatch budget;
- root authorization evidence plus Procedure/policy/request digests;
- non-transitive chaining and no-worker-launch rules;
- cancellation, failure, and rollback evidence.

For `research-experiment-campaign -> research-experiment` and `research-review-campaign -> research-review-case`, the root creates each child Dispatch and binds the descriptor identity/digest into its request context. Count enforcement is computed from canonical Dispatch/Activation records. For `research-slides -> personal-slides`, the root executes a bounded adapter under the same authorization model and binds its result evidence; the Research worker does not launch the adapter.

P2-08, P2-10, and P2-11 own only edge-specific methodology and fixtures. P2-12 owns final reviewed integration. If the descriptor cannot be safely bound through existing canonical records, P2-03 stops for a separately reviewed state-migration amendment rather than silently widening core event-schema scope.

## 9. Worker Context versioning

Context remains the sole worker-visible methodology authority. Workers never discover Procedure or support-pack files.

- An activation bound to a schema-v1 Procedure receives the existing normalized Context v1 shape.
- A new schema-v2 Procedure receives an explicit Context v2 shape containing only reviewed, size-bounded, digest-bound worker-visible entries and declarative artifact requirements.
- Root-only validators, private provenance details, templates marked root-only, and runtime implementation identifiers are not exposed unless the contract explicitly requires a safe worker-visible descriptor.
- Claude hook, Claude worker, Codex worker, root Context producer, and host-parity fixtures change atomically for Context v2.
- Output remains strict Result plus pending Proposal. Context v2 does not grant a new worker operation.

## 10. Differential assurance architecture

P2-04 converts the frozen Phase-1 matrix into a digest-traceable local harness without importing private test bodies.

The harness must:

- register all 229 applicable v1.2 cases;
- preserve exact `DFT-*`, `COMP-*`, and control IDs;
- detect unknown, duplicate, omitted, or falsely inapplicable cases;
- expose compact family slices so later children do not load the entire target;
- support deterministic positive and critical-negative fixtures;
- aggregate family reports into a complete matrix verdict;
- bind every slice and report to the frozen methodology digest;
- allow child-specific expansions without weakening frozen cases.

Frozen allocation:

- 224 package cases;
- 3 composition cases;
- 1 Proposal-only control case;
- 1 host-retirement case;
- 212 critical and 17 non-critical cases.

The exact planning allocation is materialized in `research/differential-case-allocation.json`, with one implementation owner per frozen case and child-local `research/differential-case-map.json` files. A separate `research/phase2-expansion-case-allocation.json` assigns exactly 38 additional cases; expansion IDs never enter the frozen-229 registry or counts. P2-01 reviews/freezes both maps; P2-04 implements separate harness registries/reports; P2-13 independently assures both aggregates.

## 11. Ideation/evaluation proof

The first end-to-end proof is the shared ideation/evaluation case:

```text
generation owns 01-frame through 04-generate
  -> stable shared candidate/case identity
evaluation consumes 01-04 without rewrite
evaluation owns 05-novelty-check through 07-handoff
  -> pending Proposal
  -> root Decision
```

Required controls include:

1. mechanism diversity;
2. candidate identity continuity;
3. closest-prior evidence;
4. full-method overlap detection;
5. qualifying novelty delta;
6. independent method-flaw audit;
7. matched controls;
8. falsifiers and kill conditions;
9. project-pivot confirmation;
10. exactly one selected-or-blocked closure.

The frozen v1.2 inventory assigns some `selected`/closure fixtures to ideation even though selection is evaluation-owned. P2-01 must classify these as shared-couple boundary checks or initiate the reviewed v1.3+ correction path. P2-05 must not silently delete, move, or reinterpret them.

No remaining family child may activate before this proof passes.

## 12. Child topology and ownership

The parent owns requirements, pins, dependency map, package coverage, cross-child integration, and final acceptance. It owns no production implementation.

| ID | Child | Explicit predecessors | Exclusive responsibility |
|---|---|---|---|
| P2-01 | Freeze methodology packaging contracts | Phase-1 PASS + infra pin | Review/freeze the already-materialized package schema, pin attestation, versioning/rollback, path ownership, 16-package and DFT allocation |
| P2-02 | Procedure support-pack digest binding | P2-01 accepted | Core parser/digest, CLI secure resolver, and `dispatch-revalidation.ts` historical exact-version integration |
| P2-03 | Artifact validator runtime | P2-02 accepted | Generic artifact/provenance/terminal/validator/report runtime, root-only bounded composition, and Context version binding |
| P2-04 | Frozen differential harness | P2-03 accepted | Frozen case registry, family slices, completeness and aggregate reports |
| P2-05 | Ideation/evaluation methodology | P2-02, P2-03, P2-04 accepted | Dormant generation/evaluation packs, family contracts, validators, fixtures |
| P2-06 | Setup and Quest methodology | P2-05 accepted | Setup, read-only Quest, explicit Quest-admin dormant packs |
| P2-07 | Literature and survey methodology | P2-05 accepted | Literature and explicit optional survey dormant packs |
| P2-08 | Experiment methodology | P2-05 accepted | Round/campaign dormant packs and `COMP-001` |
| P2-09 | Computation and theory methodology | P2-05 accepted | Computation/theory dormant packs and analytical contracts |
| P2-10 | Review methodology | P2-05 accepted | Case/campaign dormant packs and `COMP-002` |
| P2-11 | Writing, figure, and slides methodology | P2-05 accepted | Writing and explicit optional figure/slides dormant packs plus `COMP-003` |
| P2-12 | Atomic activation | P2-06 through P2-11 accepted | Sole registry/version cutover, optional capability registration, central inventory and compatibility integration |
| P2-13 | Independent assurance | P2-12 accepted | No production ownership; independent coverage, rollback, package, authority, and closeout verdict |

P2-06 through P2-11 may run in parallel only after P2-05 passes and only when their path allowlists are disjoint.

Exact production/test/spec ownership is frozen in `research/path-ownership-map.md`; exact case ownership is frozen in `research/differential-case-allocation.json`.

## 13. Activation model

All family packages are implemented as dormant next versions. P2-12 is the only child allowed to:

- switch current Procedure-version bindings;
- register `research.writing.figure`, `research.writing.slides`, or `research.literature.survey`;
- change central bundled inventory or packed required-path lists;
- change default/explicit capability routing;
- perform the integrated upgrade/reactivation cutover.

Figure, slides, and survey remain explicit and non-default. Frozen v1.2 requires `research.literature.review` to become the literature automatic/default route and `research.literature.scan` to become non-default; all unrelated routes remain unchanged unless a separately reviewed v1.3+ contract supersedes v1.2. P2-12 records the complete cutover in a canonical digest-bound manifest.

## 14. Rollback model

- P2-01: planning/contract rollback only.
- P2-02/P2-03: additive runtime support; revert the owning child while current v1 Procedures remain live.
- P2-04: test/harness-only rollback.
- P2-05 through P2-11: remove or revert only dormant family versions and fixtures; live `1.0.0` remains unchanged.
- P2-12 before any new activation exists: revert the registry/inventory cutover atomically.
- P2-12 after a new activation exists: a reviewed registry rollback changes future selection only while historical activations retain recorded ID/version/digest, or a forward-fix version is issued; no nonexistent disable event is claimed.
- P2-13: mechanically prove reviewer identity differs from the P2-12 implementer, consume exact predecessor inputs, emit only allowlisted assurance outputs, and route defects back to the owning child without opportunistic production edits.

## 15. Privacy and packaging boundary

Tracked and packed Trellis content may contain:

- newly written Trellis-native instructions;
- abstract artifact contracts;
- stable validator descriptors and new runtime implementations;
- source-relative evidence identifiers and reviewed digests;
- synthetic fixtures derived from the frozen observable contract.

It must not contain:

- private Skill bodies;
- private validator/test source;
- private prompts or cases;
- raw private model output;
- host Skill payloads or discovery authority;
- live-trial evidence without separate provider/retention authorization.

Packed validation must inspect real clean tarballs. Source trees, collector output, or dirty `dist` are not release evidence.

## 16. Deferred release gate

The Phase-1 live-trial waiver applies to planning only. Live multi-host/model equivalence remains unproven. Before production release, a separate decision must either:

- authorize bounded live trials with provider, model, retention, cost, call-count, retry, storage, and privacy controls; or
- explicitly accept the deterministic-only evidence boundary for that release.

This deferred release decision does not block planning or deterministic implementation, but it blocks any claim of live multi-host equivalence.

## 17. Additive v1.3 forward-correction design overlay (2026-08-03)

This section preserves the historical design above and changes only the future semantic authority path after the Wave-8 gap audit.

### 17.1 Corrected authority chain

```text
immutable public v1.2 identity and evidence boundary
  -> R0 addressability/planned-destination evidence only
  -> V13-A public-evidence + Trellis-native v1.3 candidate
  -> separately authorized immutable authoring commit
  -> V13-B independent exact-commit/digest assurance
  -> accepted evaluation-contract-v1.3.0 digest
  -> R1 mechanical reuse/correction
  -> R2A root enforcement against exact accepted digest
```

Until V13-B passes, v1.2 remains the active methodology pin and R2A semantic enforcement remains blocked. The live registry remains at Procedure `1.0.0`; Procedure `2.0.3` remains the forward repair version and dormant future package target.

### 17.2 Public-evidence reconstruction

V13-A uses only public frozen v1.2 facts, archived public Trellis evidence, the Wave-8 audit, and explicit Trellis-native decisions. It does not inspect or transmit private Skill bodies or related private prompts, validators, tests, fixtures, cases, or raw outputs.

Every normative field has exactly one provenance class:

1. `inherited-public-v1.2` — exact public fact with immutable digest and line/JSON-pointer citation;
2. `trellis-native-v1.3` — explicit new decision with rationale, rejected alternatives, compatibility, visibility, validator, and fixture obligations;
3. `inapplicable` — explicit null/absence semantics and rationale;
4. `blocked-by-contract` — no authority to infer; runtime/tests fail closed.

R0 is reclassified interpretively as source-addressability and planned-destination evidence. R1 mechanics may be reused, but post-freeze semantic fixtures cannot establish v1.2 or v1.3 rules.

### 17.3 Candidate contract shape

The V13-A research-only candidate contains a public-evidence index, normative-decision ledger, complete 64-output disposition, complete artifact-lifecycle contract, closure contract, validator registry/binding matrix, derivability/provenance matrix, frozen target, deterministic candidate manifest, filename-bound sidecars, and exact execution evidence. Conditional normalized inventory, IO ledger, and differential-delta files are produced only when material v1.3 changes require them.

All included lifecycle artifacts/checkpoints define the 13 dimensions identified by Wave-8, or explicitly record inapplicable/blocked semantics. Closure binds exact canonical fields, types, null behavior, producer/reader, evidence, validation order, zero-write errors, and validator triples. Generic `Result.status` does not imply selection or blockage.

Strict JSON is deterministic UTF-8 with duplicate decoded-key rejection, recursive object-key ordering, array-order preservation, and one final LF. The frozen target is the methodology digest target. The candidate manifest inventories semantic files without self-reference, and filename-bound sidecars bind both manifest and frozen target.

### 17.4 Independent assurance boundary

V13-B consumes one exact immutable authoring commit plus exact candidate-manifest and contract digests. Accountable reviewer identity must differ mechanically from the V13-A author. The reviewer independently checks schema, bytes, digests, provenance, 64-output coverage, 13-dimension completeness, closure, exact validator triples, privacy, compatibility, authority, and mutation boundaries without importing production R2A behavior as the sole oracle.

V13-B writes only its exact assurance allowlist, makes no repair, and emits exact pass/fail. Failure requires a new authoring commit/digest and full rerun. Accepted v1.3.0 bytes are immutable; later semantic correction advances to v1.3.1+.

### 17.5 Ownership and compatibility

V13-A and V13-B own no production, test, Procedure, registry, activation, package, specification, release, or historical evidence paths. Existing P2-02 through P2-13 ownership remains unchanged. Methodology, Procedure package, Procedure version, Context, report, and event schema versions remain independent.

Historical Procedure `2.0.2` remains bound to exact v1.2. Future Procedure `2.0.3` may bind only to the exact V13-B-accepted v1.3 digest. Existing activation records retain recorded identity. Every authoring, assurance, remediation, evidence, complete-system assurance, activation, archive, release, publication, and push boundary requires separate explicit authorization.

## Additive overlay — attempt-2 forward repair (2026-08-04)

P0 preserves attempt-1 fail package. P1 anchors portable C0 + archives + A2/B2 planning. P2–P4 re-author and re-assure under path-owned siblings with second-human independence. Do not amend attempt-1.

## Additive overlay — MAL-1 attempt-3 (2026-08-04)

G0 governance → Q0/Q1 containment → A3 candidate → B3 MAL-1 → OA3 accept → R1–R8 / 2.0.4 / CS3. Forward-only history.

## Additive overlay — CS4 forward repair (2026-08-05)

CS4-0 supersession → CS4-1/2 runtime (canonical closure + 65/20/876 + derived pack identity + report-v2 authority) → CS4-3 Procedure 2.0.5 → CS4-4 E2E harness → CS4-5 dormant subject freeze → CS4-6 fresh MAL-1 → CS4-7 genuine operator decision. Forward-only history.

## Additive overlay — CS6 successor design (2026-08-07)

CS6 separates historical S10/M10, semantic-audit disposition A11, integrated dormant candidate I11, frozen subject S11, reviewer assignment M0, machine evidence M11, and optional operator decision O11. No identity implies another's authority.

```text
CS6-0 governance
  -> CS6-1 exact accepted-leaf audit
       -> defect: stop for evaluation-contract-v1.3.1+
       -> sound: CS6-2 core -> CS6-3 CLI -> CS6-4 Procedure 2.0.7
                 -> CS6-5 production harness -> CS6-6 install/integrate/S11
                 -> CS6-7 fresh MAL-1 M11 -> CS6-8 separate operator decision
```

Core corrections stay in methodology-local adapters; shared HIGH/CRITICAL events, reducers, stores, canonical ledgers, batch committers, locks, and hardened publication internals remain call-only. Integration uses real npm/pnpm tarballs and archive-safe historical blob locks, and S11 is a resolved one-file freeze record without self-hash placeholders. Attempt 11 writes exactly nine outputs, performs no repair, and cannot auto-accept or activate. See the CS6 campaign design and CS6-0 ownership map for normative detail.

## Additive overlay — v1.3.1 semantic correction design (2026-08-08)

A11 terminates the CS6 technical branch and opens a separate contract-only branch:

```text
A11 contract-defect
  -> G131 governance
  -> A131-0/A131-1 author exact seven-member v1.3.1 candidate
  -> B131-0/B131-1 fresh machine-only semantic assurance
  -> O131-0/O131-1 separate operator decision
  -> STOP
```

The candidate corrects only four authority gaps: closed report-v2 schema, executable semantics for all 20 validators, reproducible global differential mutations/applicability, and a total Procedure/capability family mapping for all 845 lifecycle decisions. A JSON-pointer diff classifies every change; any fifth semantic change stops authoring. Acceptance can authorize only the semantic contract for a future campaign, never current runtime or operational changes.

G131 freezes the closed JSON Schema 2020-12 subset including deterministic ECMA-262 11th-edition `pattern` semantics, `trellis-predicate-v1`, `trellis-mutation-v1`, exact population counts with 11 lifecycle artifact-family values distinct from 4 closure families, the ordered 17-tuple mapping domain without per-row assignments, finite exact-guarded propagation domains, literal digest framing, no-self-reference manifests, fresh reviewer/no-shared-scratch contract, operator identity/rationale/timestamp rules, and common false authority schema. CS6-2 through CS6-8 and C2/C3/C4/C5/I11/S11/M0/M11/O11 remain blocked and cannot be renamed or rebound.

## Additive overlay — v1.3.1 attempt-2 mapping correction design (2026-08-08)

```text
G131/A131 immutable history
  -> G132 sibling governance
  -> future A132 fixed disposition-aware mapping authoring
  -> future B132 complete 17 × 845 MAL-1 assurance
  -> future O132 separate operator decision
  -> STOP
```

The replacement row schema requires exactly `procedureId`, `procedureVersion`, `capabilityId`, `disposition`, and `artifactFamily`. Applicable rows require one frozen non-null family; not-applicable rows require null. Applicability is exactly the conjunction of applicable disposition and target-family equality. `experiment-campaign-v1` lifecycle family `research-experiment-campaign` remains independent from closure family `research-experiment`. G131 findings 001–003 and every unlisted finding-004 obligation remain immutable authority.

## Additive Attempt-3 recovery design (2026-08-10)

Attempt-3 restores the omitted frozen-target surface and dependent evidence/digests without changing normative contract semantics. Ten A133 outputs remain byte-identical; five target-dependent outputs change. The fresh reviewer cannot repair the subject.

## Additive design — A133 technical successor (2026-08-12)

The new child is a separate technical consumer of exact accepted A133 semantics, not a continuation or rebinding of CS6. Its ordered topology is T0 governance, T1 Core, T2 CLI, T3 dormant Procedure `2.0.7`, T4 production-reachable 116-case harness, T5 external install/integration and separate exact-subject freeze, T6 fresh machine-only complete-system MAL-1, and T7 separate operator technical decision.

Semantic identity, technical baseline, integrated candidate, frozen subject, machine assurance, operator decision, and any future activation remain distinct. Closed ownership and output inventories govern every stage; shared state/publication/worker-authority primitives and `packages/core/src/research/stage-capabilities.ts` remain call-only or excluded. Current authority stops at G0/T0 planning and validation.
