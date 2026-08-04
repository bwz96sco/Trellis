# V13-A — Author public-evidence evaluation contract v1.3

## Goal

Author a complete, deterministic, research-only candidate for `evaluation-contract-v1.3.0` using public Trellis evidence plus explicitly labeled Trellis-native normative decisions. The candidate closes the Wave-8 artifact-lifecycle, closure, and validator-binding gaps without inspecting private Skill bodies or changing production behavior.

## Authoritative starting state

- Active methodology pin remains `evaluation-contract-v1.2.0` with digest `57d1956bf4453b497cce0e288c95d7194491ddac611570e8e0c8c0aefb7516bb` until V13-B accepts an exact v1.3 authoring commit and digest.
- Proposed identity is `evaluation-contract-v1.3.0`; its digest does not exist during planning and must not be guessed.
- Infrastructure reference remains `ccd5bb3afc99283252c599916a2b8c2e05075cc6`.
- The Wave-8 audit is the public gap statement. R0 is source-addressability and planned-destination evidence, not semantic derivability.
- Current R1 strict parsing, digest, canonicalization, containment, and visibility mechanics may be reusable later; its post-freeze semantic fixtures are not v1.2 or v1.3 authority.
- Live selection remains Procedure `1.0.0`, 14 capabilities, and `research.literature.scan` as the literature default. The forward repair version remains Procedure `2.0.3` and is not activated by this task.

## Explicit predecessor gate

C0 planning/preservation lock must be accepted and the parent ownership amendment must assign this child only its task files and research-only candidate paths. Tree position does not satisfy this gate.

## Requirements

### A1 — Public-evidence-only authority

- Use only public frozen v1.2 evidence, archived public Trellis evidence, the Wave-8 audit, and existing public Trellis control-plane invariants.
- Do not inspect, request, copy, summarize, transmit, or derive rules from private Skill bodies, prompts, validators, tests, fixtures, cases, or raw outputs.
- Every normative field must carry exactly one provenance class:
  - `inherited-public-v1.2` — exact public v1.2 fact with immutable source digest and exact line or JSON-pointer citation;
  - `trellis-native-v1.3` — new normative decision with rationale, rejected alternatives, compatibility effect, visibility, validator obligations, and fixture obligations;
  - `inapplicable` — explicit null/absence semantics and rationale;
  - `blocked-by-contract` — v1.3 does not authorize inference or enforcement and consumers must fail closed.
- Missing data never implies optionality or `inapplicable`.

### A2 — Minimum candidate artifact set

The candidate pack is child-local under `research/` and includes at minimum:

- `evaluation-contract-v1.3.0.md`;
- `frozen-migration-target-v1.3.json`;
- `frozen-migration-target-v1.3.sha256`;
- `public-evidence-index-v1.3.json`;
- `normative-decision-ledger-v1.3.json`;
- `artifact-lifecycle-contract-v1.3.json`;
- `durable-output-disposition-v1.3.json`;
- `closure-contract-v1.3.json`;
- `validator-registry-v1.3.json`;
- `validator-binding-matrix-v1.3.json`;
- `derivability-provenance-matrix-v1.3.json`;
- `contract-candidate-manifest-v1.3.json`;
- `contract-candidate-manifest-v1.3.sha256`;
- `execution-evidence-ledger.json` for exact authoring and verification commands.

Create these only when a material v1.3 delta requires them, and record the deterministic produce/omit decision in the normative ledger and candidate manifest metadata:

- `normalized-workflow-inventory-v1.3.json`;
- `io-mapping-ledger-v1.3.csv`;
- `differential-test-matrix-v1.3.json` for reviewed v1.3 deltas only, never as a relabeling of frozen v1.2 cases.

No candidate contract artifact is authored during C0 planning.

### A3 — Complete 64-output disposition

- Enumerate exactly all 64 public durable outputs across the seven lifecycle-modeled families.
- Assign each output exactly one disposition: `include`, `alias`, `container`, `pattern`, `exclude`, `inapplicable`, or `blocked-by-contract`.
- Bind aliases to a canonical identity and distinguish directories, containers, patterns, and materialized artifacts.
- Explain every exclusion and every blocked or inapplicable result. A first-12 rule, silent omission, filename inference, or generic default is forbidden.

### A4 — Complete lifecycle semantics

For every enforceable artifact/checkpoint, define all 13 lifecycle dimensions:

1. requiredness;
2. cardinality;
3. media type;
4. producer;
5. consumers;
6. repository/`ArtifactRef` identity relation;
7. stable-ID schema or explicit `none`;
8. provenance schema;
9. dependencies;
10. immutable fields and mutation authority;
11. create/accept/reject transitions and preconditions;
12. terminal applicability;
13. cross-artifact consistency.

Each dimension must be normative or explicitly `inapplicable`/`blocked-by-contract`, with stable errors and positive, negative, base, and inapplicable fixture obligations. No dimension may be silently absent.

### A5 — Canonical closure source

- Define closure only for explicitly listed families.
- For `selected` and `blocked`, define canonical record/artifact source, exact JSON pointer, type, absence/null semantics, producer, pre-record reader, true/false evidence, validation order, zero-write boundary, stable errors, and exact validator binding.
- Generic `Result.status` must not imply `selected` or `blocked`. Any status mapping requires an explicit family-specific v1.3 rule; otherwise it is forbidden.
- Keep worker Result/Proposal output separate from root-owned validation and Decision authority.

### A6 — Exact validator and reporting bindings

- Define exact validator triples `(id, version, severity)` for every authorized rule.
- Reject duplicate bindings, unknown validators, and support-pack severity downgrades.
- Distinguish root-only implementation metadata from safe worker-visible descriptors.
- Define deterministic report-v2 bindings and digest domain without changing report-v1 bytes or semantics.

### A7 — Deterministic bytes, digest, and manifest

- JSON is strict UTF-8 without BOM, comments, duplicate decoded keys, unknown keys, or non-canonical values.
- Canonical JSON recursively sorts object keys, preserves array order, and ends with exactly one LF.
- `frozen-migration-target-v1.3.json` is the methodology contract digest target; its SHA-256 becomes the proposed v1.3 digest only after authoring.
- Each `.sha256` sidecar is filename-bound and contains exactly `<64 lowercase hex><two spaces><basename><LF>`.
- `contract-candidate-manifest-v1.3.json` is the root inventory. It lists every authoritative semantic candidate file other than itself and sidecars, with filename, role, media type, byte length, SHA-256, version, and provenance class. Its filename-bound sidecar binds the manifest and avoids self-reference.
- Rebuilding from identical inputs must produce byte-identical outputs and digests.

### A8 — Compatibility, authority, and isolation

- Keep methodology contract version, Procedure package schema, Procedure version, worker Context schema, report schema, and Research event schema as independent version domains.
- Preserve historical v1/v1.1/v1.2 evidence and Procedure `1.0.0–2.0.2` bytes.
- Record compatibility intent: historical Procedure `2.0.2` remains bound to exact v1.2 identity; future Procedure `2.0.3` may bind only to the exact accepted v1.3 identity/digest.
- Own no production source, tests, Procedures, registry, activation, assurance, package, release, or specification paths.
- Workers remain Proposal-only and gain no canonical mutation, approval, Decision, recording, launch, chaining, adapter, Git, network, cost, random-ID, or sandbox-expansion authority.
- A separate explicit authorization is required before the immutable V13-A authoring commit.

## Ownership and exclusions

Owned paths are this task's planning files and candidate `research/**` files only, as frozen by the parent ownership amendment.

Excluded paths include all production/test/specification code, Procedure trees, registries, activation/cutover/assurance evidence, archived evidence, P2-01 evidence, parent R0 records, the Wave-8 audit, `.trellis/research/phase-2-pins.md`, `AGENTS.md`, `CLAUDE.md`, `docs-site`, `marketplace`, generated/installed Research Skills, and private source content.

## Acceptance Criteria

- [ ] All required candidate artifacts are present, schema-valid, deterministic, and manifest-bound.
- [ ] Every normative field has exactly one valid provenance class and every inherited fact has an exact public citation and source digest.
- [ ] All 64 public durable outputs have one unique explicit disposition with no silent omission.
- [ ] Every enforceable artifact/checkpoint defines all 13 lifecycle dimensions or an explicit inapplicable/blocked disposition.
- [ ] Closure uses exact canonical fields and contains no undeclared `Result.status` heuristic.
- [ ] Every authorized rule has an exact `(id, version, severity)` validator binding and stable error/fixture obligations.
- [ ] Conditional inventory/IO/differential artifacts are produced only when material deltas require them and never relabel v1.2 cases.
- [ ] Independent deterministic rebuild and digest checks pass without importing production R2A parser code.
- [ ] Privacy and mutation scans prove no private source use and no writes outside the child allowlist.
- [ ] Parent and child task validation, `git diff --check` on owned paths, protected-hash checks, and dirty-path isolation pass.
- [ ] Candidate remains non-authoritative until V13-B passes against an immutable authoring commit and exact digests.
- [ ] No commit, activation, package lifecycle, archive, release, publication, push, network, model, or provider work occurs without separate authorization.

## Planning status

- Status remains `planning`.
- This is a complex task with reviewed `design.md`, `implement.md`, `implement.jsonl`, and `check.jsonl` required before activation.
- Task activation is separate from authoring-commit authorization.
