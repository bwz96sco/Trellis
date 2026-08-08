# Evaluation-contract v1.3.1 semantic correction campaign

## Goal

Create a forward-only, contract-only successor that corrects exactly the four accepted-contract defects proven by CS6-1, independently assures the corrected semantics, and stops for a separate operator decision without authorizing runtime implementation or activation.

## Immutable inputs

- Governance predecessor G: `27403e54fbe317b405400cbc9857a8537598130a`.
- Semantic audit A11: `3534529a36a10ea8015a51f71a93e2b78300a563` with disposition `contract-defect`.
- Accepted contract: `evaluation-contract-v1.3.0`.
- Accepted semantic digest: `sha256:dde907ba15d9ce22117b95db2fd9e0a108d4869873801f8c7f93b528f808699f`.
- Accepted seven-member aggregate: `sha256:83fdc8c292922173e4a67fa57deb65ff302ec107c202e3b793f7b4a93b23c7ef`.
- Accepted A3 authoring commit: `5ca3b5cf819944efd88bb5074fea7a5bb3a30fd4`.
- Historical B3 assurance commit: `064844af8317f90a2eb484f877f7be16462725dc`.
- Historical OA3 operator decision: `266a9f43`.
- CS5 accepted subject: `916be0a877725f7f91836a3a97e480c1e104e533`.
- CS5 evidence commit: `c951a2f82fa9c649ceb4a290e6896bd084ad70bd`.

All v1.3.0 leaves, manifests, decisions, assurance evidence, and A11 bytes are immutable historical evidence.

## Requirements

### R1 — Forward-only separation

- Do not amend, relabel, reinterpret, or overwrite v1.3.0 or A11.
- The successor identity is exactly `evaluation-contract-v1.3.1`.
- Failed authoring or assurance attempts remain immutable; retries use new attempt identities and commits.
- CS6 remains stopped at A11. CS6-2 through CS6-8 are not resumed or rebound to v1.3.1.

### R2 — Exact correction allowlist

The authoring child may change semantic authority only to correct:

1. `CS6-1-CONTRACT-001` — define a complete closed report-v2 object schema, field types, nested structures, enums, cardinalities, nullability, canonicalization, and digest framing;
2. `CS6-1-CONTRACT-002` — define closed rule-specific facts and deterministic pass/fail predicates for all 20 trusted validators;
3. `CS6-1-CONTRACT-003` — define reproducible base fixtures, exact global mutations, applicability predicates, and expected observations for all 44 global differential cases, including 11 inapplicable cases;
4. `CS6-1-CONTRACT-004` — define a total, unique, closed Procedure/capability-to-artifact-family mapping and the authority-snapshot facts needed to resolve all 845 lifecycle applicability decisions.

Every other seven-leaf semantic change is forbidden except the finite G131-frozen contract-identity, exact member-reference, provenance-class, and finding-bound `recordRef` transitions with exact old/new guards. The 71 immutable `DEC-*` references inside direct correction regions remain exact-value, no direct-region `EV-*` or `SRC-*` reference exists in the baseline, and the closed historical-reference pointer/value set may not be added to, removed, aliased, or replaced. Candidate-manifest, semantic-target, aggregate, and output-manifest digest recomputation occurs only in non-leaf author evidence and is not a generic leaf propagation category.

### R3 — Seven-member contract continuity

- Produce exactly seven normative v1.3.1 leaves corresponding to the seven v1.3.0 members.
- Preserve the frozen populations exactly: 64 durable outputs, 65 lifecycle artifacts, 11 lifecycle artifact-family enum values, 13 dimensions, 20 validators, 876 bindings, 3,343 provenance rows, 116 differential cases, and 4 closure families.
- Bind the seven leaves through a new candidate manifest, semantic target digest, and domain-separated member aggregate.
- Provide a complete JSON-pointer semantic-diff ledger from v1.3.0 to v1.3.1.

### R4 — Role separation

- The campaign parent owns governance only.
- The author child owns candidate bytes and author evidence only.
- The assurance child uses a fresh machine reviewer, exact immutable Git subject, no shared author scratch, and no repair authority.
- The decision child owns one later operator decision only.
- Author, reviewer, and operator roles are distinct. Machine review is not human review or human-equivalent.

### R5 — Assurance quality

Assurance must independently and exhaustively challenge:

- valid and invalid report-v2 instances, including nested unknown keys;
- all 20 fact schemas and deterministic predicates;
- all 44 global mutation cases and all 11 inapplicability predicates;
- every mapping-domain identity and all 845 lifecycle applicability decisions;
- cross-leaf removal and contradiction of every newly required authority element;
- absence of semantic changes outside the four-finding correction ledger.

The verdict is exactly `pass` or `fail`. Any ambiguity, missing executable semantics, input mismatch, independence failure, or fifth semantic change is `fail`.

### R6 — Authority containment

Planning, authoring, assurance, and even operator acceptance do not authorize:

- Core or CLI implementation;
- Procedure package generation or changes;
- harness or integration changes;
- worker authority changes;
- live Procedure selection changes;
- activation, archive, release, publication, push, or complete-system acceptance.

Workers remain Proposal-only. Live Procedure remains exactly `1.0.0`.

### R7 — Dirty-path and historical containment

Preserve inherited dirty paths `AGENTS.md`, `CLAUDE.md`, `docs-site`, `marketplace`, and the untracked CS5 operator-state directory. Preserve `.trellis/research/**`, all historical Procedure packages, all CS5/CS6 evidence, and all accepted v1.3.0 paths.

## Acceptance criteria

- [ ] The canonical Phase-2 parent contains exactly one reciprocal v1.3.1 campaign child.
- [ ] The campaign contains exactly Author, Assurance, and Decision children in that order.
- [ ] All four packages have complete PRD, design, implementation plan, and curated manifests.
- [ ] A11 and v1.3.0 identities are pinned exactly and independently verifiable.
- [ ] The four-finding correction allowlist and no-fifth-change rule are explicit.
- [ ] Author/reviewer/operator ownership and commit boundaries are disjoint.
- [ ] All children remain `planning`, unassigned, and inactive after this planning wave.
- [ ] Runtime, CLI, Procedure, harness, live selection, release, publication, and push remain out of scope and unauthorized.
- [ ] Protected dirty and historical paths are unchanged.
- [ ] No commit is created by this planning wave without separate authorization.

## Out of scope

- Authoring v1.3.1 candidate bytes.
- Running semantic assurance.
- Recording an operator decision.
- Replanning or resuming CS6 technical children.
- Any production, test, package, registry, specification, activation, archive, release, publication, or push change.

## Frozen G131 governance contract

- G131 changes exactly the 36 paths frozen in `research/g131-output-inventories.json`; no other campaign or canonical-parent path is permitted.
- The boundary inventories are exact: G131 36, A131-0 2, A131-1 15, B131-0 2, B131-1 11, O131-0 2, and O131-1 1.
- A131-1 has exactly seven normative members. Historical `evaluation-contract-v1.3.0.md`, `io-mapping-ledger-v1.3.csv`, `normative-decision-ledger-v1.3.json`, and `public-evidence-index-v1.3.json` remain immutable evidence inputs and are not successor members.
- Population counts are absolute: 7 leaves, 64 durable outputs, 65 lifecycle artifacts, 11 distinct lifecycle artifact-family enum values, 13 dimensions, 845 lifecycle bindings, 20 closure bindings, 11 global bindings, 876 total bindings, 20 validators, 3,343 provenance rows, 116 cases, 44 global cases, 11 global inapplicable cases, 4 closure families, 18 public evidence sources, 168 public evidence facts, and 17 Procedure/capability mapping rows.
- Every G/A/B/O record carries the common false authority fields frozen in `research/g131-authority-and-containment.json`. `taskExecutionAuthorized:true` exists only in the exact G131 control record; task metadata and every later boundary remain false until separately authorized.
- Any authenticated committed B131-1 `pass` or `fail` may reach O131 after a new operator instruction. `accept-with-rationale` requires `pass`; `reject-with-rationale` and `stop` may follow `pass` or `fail`.
- All 44 global fixtures or complete fixture specifications are embedded in `differential-test-matrix-v1.3.1.json`; no extra fixture output is allowed.
- The campaign terminal state is `STOP` after O131-1. CS6-2 through CS6-8 and attempt-11 identities C2/C3/C4/C5/I11/S11/M0/M11/O11 remain permanently blocked and cannot be rebound.
