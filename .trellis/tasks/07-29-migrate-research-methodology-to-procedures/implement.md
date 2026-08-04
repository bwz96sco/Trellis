# Phase-2 Research methodology migration implementation plan

## 0. Planning and authorization boundary

This file is an execution plan, not execution authorization.

Before any `task.py start` or production edit:

- parent `prd.md`, `design.md`, and this plan must pass final review;
- all thirteen children must exist in `planning` state;
- each child must state its explicit predecessors, path ownership, exclusions, rollback boundary, acceptance evidence, and frozen DFT allocation;
- each complex child must have `prd.md`, `design.md`, `implement.md`, `implement.jsonl`, and `check.jsonl`;
- the user must explicitly approve the latest final planning summary in a subsequent message.

Planning does not authorize live model/network/cost calls, task activation, production edits, commits, archives, publication, release, or push.

## 1. Global execution invariants

Apply to every child:

1. Pin methodology to `evaluation-contract-v1.2.0` digest `57d1956bf4453b497cce0e288c95d7194491ddac611570e8e0c8c0aefb7516bb`.
2. Pin implementation base to `ccd5bb3afc99283252c599916a2b8c2e05075cc6`.
3. Treat private commit `9a02a533f5f3ecfd0c0789a01588fc492d321d6c` as read-only evidence, never runtime/test authority.
4. Preserve Proposal-only workers and root-owned Decisions.
5. Preserve unrelated dirty paths: `AGENTS.md`, `CLAUDE.md`, `docs-site`, and `marketplace`.
6. Preserve `.trellis/research/**`; read only the durable pin record unless a separately approved implementation contract names a new tracked projection.
7. Never restore Research Skill generation, payload, discovery, or execution.
8. Never use repository-wide staging, reset, clean, stash, force-push, or history rewriting.
9. Run GitNexus upstream impact analysis before editing any existing function, class, or method. Warn and stop on HIGH/CRITICAL risk.
10. Run `gitnexus_detect_changes()` before every future implementation commit.
11. Use `uv run python` for Python scripts.
12. Use real packed tarballs for package evidence.

## 2. Parent and child sequencing

```text
P2-01 contract freeze
  -> P2-02 support-pack parser/resolver/digest
  -> P2-03 artifact/provenance/validator/report runtime
  -> P2-04 frozen differential harness
  -> P2-05 ideation/evaluation proof
  -> P2-06..P2-11 family wave (parallel only with disjoint paths)
  -> P2-12 atomic activation/cutover
  -> P2-13 independent assurance
  -> parent acceptance and closeout
```

Parent/child links are not dependency enforcement. Every child repeats its predecessor gate in its own `prd.md` and `implement.md`.

## 3. P2-01 — Freeze packaging, versioning, and ownership contracts

### Deliverables

- exact pin attestation;
- schema-v1 compatibility statement;
- schema-v2 support-pack contract;
- artifact and validator descriptor contract;
- exact historical resolution contract;
- Context v1/v2 compatibility contract;
- review and freeze the planning-time `research/path-ownership-map.md`;
- review and freeze all 16 package assignments;
- review and freeze `research/differential-case-allocation.json` and all child case maps covering exactly 229 frozen cases;
- review and freeze `research/phase2-expansion-case-allocation.json` covering exactly 38 additional, non-overlapping cases;
- freeze `methodology-contract-freeze.json` with exact fields, types, cardinality, ownership, transitions, terminal applicability, error codes, and fixtures for every ordered stage or artifact-lifecycle checkpoint;
- freeze the v1.2 literature review/scan route disposition;
- version upgrade and supported rollback contract;
- ideation `selected` ambiguity disposition.

### Stop gates

- If the frozen ideation inconsistency is a material contract defect rather than a shared-couple boundary check, stop and create a reviewed v1.3+ correction task.
- If any central production path has two child owners, revise the topology before P2-02.
- If any package or frozen case lacks exactly one owner, do not activate P2-02.

### Verification

```bash
uv run python ./.trellis/scripts/task.py validate .trellis/tasks/07-29-freeze-phase2-methodology-packaging-contracts
shasum -a 256 .trellis/tasks/archive/2026-07/07-29-close-phase1-fidelity-pass-gate/research/frozen-migration-target-v1.2.json
```

Expected SHA-256: `57d1956bf4453b497cce0e288c95d7194491ddac611570e8e0c8c0aefb7516bb`.

## 4. P2-02 — Add support-pack and historical resolution support

### Implementation order

1. Run GitNexus impact on `parseResearchProcedure`, `computeResearchProcedureDigest`, and `resolveResearchProcedure`.
2. Add schema-v2 types and exact canonical parsing while retaining v1 behavior unchanged.
3. Add domain-separated v2 digest vectors.
4. Extend the secure resolver to read only the enumerated inventory with full path/identity revalidation.
5. Add exact historical ID/version resolution and integrate it in `dispatch-revalidation.ts` for existing activations.
6. Prove `revalidateDispatchActivationStaged` still resolves an old activation after the registry current version changes.
7. Add project-first/bundled parity and present-invalid no-fallback behavior for complete packs.
7. Export only the minimum public core types/functions required by CLI.
8. Update relevant code-specs and packed inventory expectations for dormant assets only if P2-01 authorizes their inclusion at this stage.

### Focused tests

- unchanged v1 canonical and invalid vectors;
- v2 canonical manifest/inventory/digest vectors;
- duplicate/unknown/missing fields;
- path traversal, backslash, NUL, absolute path, duplicate normalized path;
- symlinked directory/file, escaping realpath, type mismatch;
- missing, oversized, mutated-during-read, hash-mismatched entry;
- unnamed sibling creation/removal/change ignored;
- present-invalid project pack never falls back;
- old activation resolves exact old version after current registry version changes in a fixture;
- digest mismatch fails without writes.

### Rollback

Revert only additive parser/resolver support. Existing v1 Procedures remain live and byte-identical.

## 5. P2-03 — Add generic artifact, validator, report, composition, and Context contracts

### Implementation order

1. Run GitNexus impact on approved Context and Result recording symbols.
2. Add separate versioned artifact methodology contract types; do not widen `ArtifactRef` silently.
3. Add trusted validator registry keyed by stable validator ID/version.
4. Add deterministic report types, canonical digesting, and stable error taxonomy.
5. Add generic checks for cardinality, canonical path/media type, stage ownership, stable IDs, provenance, terminal-state applicability, and cross-artifact consistency.
6. Add the root-only composition descriptor/runtime with canonical binding, root authorization evidence, child/adapter target, maximum child count, non-transitive chaining, ordinary-handoff separation, and rollback behavior.
7. Prove generic runtime support for the experiment campaign, review campaign, and bounded personal-slides adapter shapes before family packs depend on it.
8. Add Context v2 generation for Procedure package schema-v2 Procedures while preserving Context v1 for historical activations.
9. Update Claude hook and both generic workers atomically for v1/v2 parsing and identical authority ceilings.
10. Validate Result/Proposal plus declared artifacts before canonical record commit.
11. Keep report generation and composition authorization root-owned and deterministic.

### Focused tests

- required/optional/cardinality boundaries;
- missing critical artifact;
- provenance and stable-ID drift;
- invalid producer/consumer stage;
- invalid terminal state and selected-plus-blocked closure;
- unknown validator ID/version;
- descriptor attempting executable/network/module authority;
- composition missing root authorization, wrong parent/edge/target, exceeded child count, transitive chaining, ordinary-handoff substitution, cancellation, and rollback;
- report digest reproducibility;
- old Context v1 exact compatibility;
- Context v2 host parity and full-tree zero-write;
- validation failure prevents Result/Proposal/consumption append.

### Rollback

Revert additive runtime and Context v2 handling. Existing v1 Context and live v1 Procedures remain unchanged.

## 6. P2-04 — Build the frozen differential harness

### Implementation order

1. Parse only the archived v1.2 frozen target and differential matrix.
2. Verify the pinned digest before generating any local slice.
3. Consume and verify the planning-time allocation of all 229 case IDs with family, criticality, expected observable behavior, and exactly one implementation owner.
4. Materialize harness slices that match the frozen child maps for P2-05 through P2-12 and an assurance view for P2-13.
5. Register the 38 Phase-2 expansions in a separate namespace/report and prove no ID overlap or arithmetic inclusion in the frozen 229.
6. Add harness self-tests for duplicate, missing, unknown, applicability drift, cross-registry overlap, and double-counting.
7. Add separate aggregate reporting with exact frozen total/critical/non-critical counts and exact expansion totals.
7. Keep synthetic fixtures Trellis-native; do not copy private fixtures or validator bodies.

### Gate

Harness must prove 229 total, 212 critical, 17 non-critical, 224 package, 3 composition, 1 Proposal-only control, and 1 host-retirement case before P2-05 begins.

### Rollback

Remove the test-only harness and generated slices; no runtime behavior changes.

## 7. P2-05 — Migrate ideation/evaluation first

### Implementation order

1. Confirm P2-01 ambiguity disposition and P2-02/P2-03/P2-04 acceptance.
2. Create dormant next-version Procedure packs for generation and evaluation.
3. Define the shared case root, candidate identity, provenance, and project-alignment contracts.
4. Encode generation-owned stages 01–04 and evaluation-owned stages 05–07.
5. Implement family validator descriptors and trusted handlers for all ten improve controls.
6. Enforce evaluation read-only consumption of 01–04.
7. Enforce exactly selected or blocked; blocked forbids selected/handoff artifacts; selected requires a passing finalist and experiment handoff.
8. Translate selection to pending Proposal and root Decision.
9. Run the 47 frozen pair cases plus child-specific reconstruction and privacy cases.
10. Keep both new versions dormant.

### Gate

No remaining family child starts until P2-05 passes independent review.

### Rollback

Remove/revert only dormant ideation/evaluation versions, handlers, and fixtures. Current `1.0.0` remains live.

## 8. P2-06 through P2-11 — Remaining family wave

These children may proceed in parallel only after P2-05 and only with disjoint path allowlists.

### P2-06 setup and Quest

- project setup;
- read-only Quest framing;
- explicit Quest-admin root mutation path;
- global Proposal-only and host-retirement controls assigned for integration with P2-12.

Gate: ordinary Quest cannot mutate; admin operations remain root-reviewed; random canonical IDs fail.

### P2-07 literature and survey

- literature discovery/review;
- explicit non-default survey synthesis;
- external-integration unavailable behavior;
- source-fact versus synthesis separation.

Gate: survey never becomes default and cannot claim successful discovery ownership.

### P2-08 experiment

- experiment round and campaign;
- `COMP-001` campaign-to-round composition;
- frozen baseline, plan/actual consistency, matched controls, failure/null/inconclusive visibility.

Gate: composition is root-authorized and bounded; failed execution cannot produce a success Claim.

### P2-09 computation and theory

- computation case;
- theory case;
- assumptions, derivations, proof/analysis obligations, uncertainty, counterexamples, and handoff.

Gate: computation's P2-01-frozen artifact-lifecycle checkpoints and theory's frozen stages have exact field/type/cardinality/transition/error fixtures; missing obligations fail closed and partial/null/inconclusive outcomes remain distinct.

### P2-10 review

- review case and campaign;
- `COMP-002` campaign-to-case composition;
- claims ledger, evidence, findings, attacks, adjudication, and root Decision separation.

Gate: review-case is the sole initial writer, campaign consumes immutable digest-bound contained child evidence without sibling traversal, valid/failure/rollback composition paths pass, and source facts are not overwritten by evaluator conclusions.

### P2-11 writing, figure, and slides

- writing case;
- explicit non-default figure and slides;
- `COMP-003` bounded `personal-slides` adapter;
- upstream evidence provenance and unavailable-adapter degradation.

Gate: writing-to-figure-to-slides sender/receiver/artifact/digest/provenance continuity passes positive and adversarial cases; no private adapter import or canonical authority transfer; optional workflows never become default.

### Family rollback

Remove/revert only dormant family packs, handlers, fixtures, and child-owned specs. Current live versions remain unchanged.

## 9. P2-12 — Atomic activation and integration cutover

### Preconditions

- P2-06 through P2-11 accepted and archived or otherwise frozen under the explicit atomic-cutover contract;
- all 16 packages have reviewed dormant versions;
- all family slices pass;
- no unresolved critical waiver;
- real clean package inventory includes every required version and no forbidden private/Skill payload.

### Implementation order

1. Run GitNexus impact on `RESEARCH_CAPABILITY_REGISTRY`, `RESEARCH_DEFAULT_CAPABILITY_BY_STAGE`, and capability resolution.
2. Register optional `research.writing.figure`, `research.writing.slides`, and `research.literature.survey` as explicit/non-default.
3. Switch current version bindings for reviewed existing capabilities.
4. Apply frozen v1.2 routing: literature review automatic/default, literature scan non-default, and unrelated routes unchanged.
5. Emit and digest the normative cutover manifest binding every capability, route/mode/default status, Procedure/validator/packed path, previous binding, cutover state, and rollback target.
6. Update central bundled/packed inventory, internal validator bindings, package audit, and specification indexes without reopening P2-03's public Research barrel.
7. Add explicit upgrade/reactivation and supported rollback behavior.
8. Prove historical activation resolution by recorded Procedure identity.
9. Run exactly 229 frozen and 38 separate expansion cases with no subset double-counting, plus host parity, replay, override, upgrade, rollback, packed install/update/uninstall, and full relevant suites.
10. Update code-specs with executable signatures, contracts, error matrix, good/base/bad cases, required tests, and wrong/correct examples.

### Cutover rollback

- Before any new-version activation record exists: revert registry, inventories, and routing atomically.
- After any new-version activation exists: do not delete or reinterpret that version. A reviewed registry rollback changes future selection only while historical activations retain recorded bindings, or issue a forward-fix version; do not claim a nonexistent canonical disable event.

## 10. P2-13 — Independent assurance

P2-13 has no production, test, Procedure, registry, package, or code-spec ownership and must be assigned to someone other than the P2-12 implementer before activation.

Verify:

- exact methodology and infrastructure pins;
- 16/16 packages;
- exactly 229/229 frozen cases and exactly 38/38 separately counted expansions with no overlap or subset double-counting;
- 3/3 bounded composition edges;
- Quest read/admin write boundary;
- Proposal-only worker and root Decision boundary;
- schema-v1 and schema-v2 replay;
- exact historical Procedure resolution;
- project override fail-closed behavior;
- P2-12 cutover manifest/digest and mechanical reviewer-independence evidence;
- distinct pre-activation atomic-revert and post-activation future-selection rollback rehearsals;
- Claude/Codex Context parity;
- clean pack/install/update/uninstall evidence;
- no private bodies or active Skill payload;
- unrelated dirty paths excluded;
- GitNexus change detection and final spec agreement.

Defects return to the owning child. P2-13 must not edit another child’s production files.

## 11. Validation command families

Exact package scripts must be confirmed by each child before execution. Expected command families include:

```bash
# Task/manifests
uv run python ./.trellis/scripts/task.py validate <task-dir>

# Formatting/diff hygiene
git diff --check -- <child-owned-paths>

# Focused core/CLI tests
pnpm --filter @mindfoldhq/trellis-core test -- <focused-test-files>
pnpm --filter @mindfoldhq/trellis test -- <focused-test-files>

# Build and package evidence
pnpm build
pnpm --filter @mindfoldhq/trellis-core pack
pnpm --filter @mindfoldhq/trellis pack

# Full relevant tests and audits
pnpm test
node packages/cli/scripts/packed-cli-audit.js <real-tarball>

# Pre-commit impact scope
gitnexus_detect_changes
```

Do not guess unsupported flags. Each child must inspect package scripts and record the exact verified commands in its `implement.md` before activation.

## 12. Per-child completion evidence

Every P2-01 through P2-12 child records a task-local `research/execution-evidence-ledger.json`. Each executed check entry must contain a stable command ID, exact argv array, cwd, relevant environment allowlist, exit code, assertion IDs, expected and actual outcomes, retained output path plus digest, and timestamps/order evidence. Checks requiring zero writes also bind before/after tree snapshots. Privacy/package checks record exact forbidden paths/patterns, exact scan command, result, and inspected tarball digest. Command-family names, unexecuted placeholders, or prose-only "passed" claims are insufficient.

Every implementation child also records:

- pin attestation;
- explicit path allowlist and exclusions;
- frozen contract slice;
- exact parent path allowlist and child `research/differential-case-map.json`;
- differential report matching that map;
- focused test output;
- full relevant suite output;
- build/pack evidence when applicable;
- spec update decision;
- GitNexus impact and change-detection result;
- independent review result;
- rollback boundary and rehearsal status;
- unrelated dirty-path audit.

## 13. Parent completion gate

The parent may close only after P2-13 recommends acceptance and the parent verifies:

- every child dependency and the planning-time path/case ownership maps were honored;
- all 16 packages are implemented or explicitly user-deferred;
- all 229 frozen cases and all 38 separate expansion cases pass without reading private HEAD or double-counting subsets;
- figure, slides, and survey remain optional/non-default; literature review is the frozen v1.2 literature default and literature scan is non-default;
- no worker authority widened;
- no historical record gained new authority;
- live-trial status is described accurately;
- no unauthorized commit, archive, publication, release, or push occurred.

## 14. Additive v1.3 forward-correction execution overlay (2026-08-03)

This overlay preserves the historical execution plan and inserts new prerequisites before R2A semantic enforcement.

### 14.1 C0 — planning and preservation lock

1. Create real V13-A and V13-B children under this parent without starting them.
2. Fully plan each complex child with `prd.md`, `design.md`, `implement.md`, `implement.jsonl`, and `check.jsonl`.
3. Append, rather than rewrite, the parent requirements/design/execution overlays and the v1.3 ownership amendment.
4. Record exact parent/child identities, active v1.2/proposed v1.3 identities, Wave-8 digest, R0 reclassification, live-v1 containment, protected paths, inherited dirty paths, and V13-A → V13-B → R2A sequencing in a parent research preservation record with a filename-bound digest sidecar.
5. Validate parent and both children; prove ownership disjointness and V13-B's exact output allowlist; run C0-path-only diff hygiene; and compare historical Procedure, Wave-8, protected evidence, and unrelated dirty-path baselines.
6. Do not author contract candidate files or edit production/test/Procedure/registry/specification paths.

C0 completion authorizes no commit, task start, contract authoring, assurance, package lifecycle, activation, archive, release, publication, push, network, model, or provider work.

### 14.2 V13-A — contract authoring prerequisite

After separate task-start approval, V13-A authors the public-evidence-only `evaluation-contract-v1.3.0` candidate. It must:

- apply exactly the four provenance classes;
- disposition all 64 public durable outputs;
- define all 13 lifecycle dimensions or explicit inapplicable/blocked semantics;
- define canonical closure sources with no undeclared `Result.status` heuristic;
- bind exact validator `(id, version, severity)` triples;
- produce deterministic canonical bytes, frozen-target digest, manifest, filename-bound sidecars, and exact execution evidence;
- preserve private-source, historical, production, and dirty-path boundaries.

Obtain separate authorization before the immutable V13-A authoring commit.

### 14.3 V13-B — independent contract assurance prerequisite

After an immutable V13-A authoring commit exists, assign V13-B to a mechanically distinct accountable reviewer. V13-B consumes the exact commit, candidate manifest path/digest, contract identity, and contract digest; independently verifies schema/digest/provenance/coverage/closure/validator/privacy/mutation/compatibility; writes only its exact allowlist; makes no repairs; and emits exact pass/fail.

Failure requires a new V13-A authoring commit/digest and complete rerun. Obtain separate authorization before the assurance-only commit.

### 14.4 Corrected downstream ordering

```text
C0 validated
  -> separately approve/start V13-A
  -> separately authorize V13-A authoring commit
  -> assign distinct reviewer and separately approve/start V13-B
  -> separately authorize V13-B assurance commit
  -> only on pass: R1 mechanical correction/reuse
  -> R2A root enforcement against exact accepted v1.3 digest
  -> remaining R2B–R8 waves under their existing separate boundaries
```

R0 remains addressability/planning evidence. R1 post-freeze semantics remain non-authoritative. Live selection stays at Procedure `1.0.0`; Procedure repair remains `2.0.3`. Every remediation subject, execution evidence, P2-13, activation, package lifecycle, archive, release, publication, and push boundary remains separately authorized.

## Additive overlay — attempt-2 forward repair (2026-08-04)

1. P0 done: preserve V13-B attempt-1 fail outputs (`867954ae`).
2. P1: gitignore exceptions, Wave-7 archive blobs, portable C0 334/412 locks, A2/B2 planning.
3. P2: V13-A attempt-2 authoring-only commit after activation.
4. P3: second human reviewer assignment (hard stop if unavailable).
5. P4: V13-B attempt-2 nine-output assurance; only committed pass releases R1C/R2A.

## Additive overlay — MAL-1 attempt-3 (2026-08-04)

1. G0 commit governance/incident/tasks.
2. Q0/Q1 containment implementation.
3. A3 authoring under attempt-3 path only.
4. B3 fresh Codex MAL-1; stop if isolation unavailable.
5. OA3 operator accept unlocks R1+.
6. 2.0.4 packages only; never rewrite 2.0.3 bytes.
