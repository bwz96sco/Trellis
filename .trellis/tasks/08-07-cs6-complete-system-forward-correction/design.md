# CS6 complete-system forward-correction design

## Boundary

CS6 is a successor campaign, not a repair of CS5 records. It consumes immutable S10/M10 history and accepted v1.3.0 bytes, creates new technical and evidence identities, and leaves live Procedure selection at `1.0.0`.

## Identity model

- **S10** — historical CS5 attempt-10 subject `916be0a877725f7f91836a3a97e480c1e104e533`.
- **M10** — historical CS5 evidence commit `c951a2f82fa9c649ceb4a290e6896bd084ad70bd`, verdict `fail`.
- **A11** — future CS6-1 semantic-audit disposition.
- **I11** — future integrated dormant CS6 technical candidate produced by CS6-6.
- **S11** — future exact freeze commit/record produced after I11 passes integration and install checks.
- **M0** — future fresh reviewer assignment for attempt 11.
- **M11** — future exact nine-output machine-assurance evidence commit.
- **O11** — optional future operator decision, separately authorized.

No identity implies another identity's authority.

## Control flow

```text
CS6-0 governance
  -> CS6-1 exact semantic-leaf audit
       -> contract defect: STOP and open evaluation-contract-v1.3.1+
       -> leaves sound: retain exact evaluation-contract-v1.3.0 bytes
            -> CS6-2 core runtime correction
            -> CS6-3 CLI/auth/replay/recovery correction
            -> CS6-4 immutable Procedure 2.0.7 packages
            -> CS6-5 production mutation/coverage harness
            -> CS6-6 integrated dormant candidate I11 + real pack/install + S11 freeze
            -> CS6-7 fresh MAL-1 M11
            -> CS6-8 separately authorized O11
```

Each arrow is an explicit predecessor gate, not merely task-tree order.

## Technical lanes

### Semantic lane

CS6-1 reads the seven accepted leaves and their accepted-member ledger. It checks internal semantic consistency, complete coverage, exact closure sources, lifecycle applicability, validator triples, derivability/provenance, and differential obligations. It writes only task-local audit evidence. It never edits accepted bytes.

### Core runtime lane

CS6-2 owns methodology-local parsing/evaluation helpers and focused core tests. Corrections cover canonical JSON, closure evidence and applicability, artifact path matching, binding facts, lifecycle applicability/invocation, validator selection/execution, and deterministic reports. Existing shared events, reducers, stores, ledgers, committers, locks, and publication internals remain call-only.

### CLI orchestration lane

CS6-3 owns Research CLI adapters and focused CLI tests. It authenticates the installed accepted-contract bundle, routes `record-result` through the reviewed methodology runtime, preserves approval/authority checks, binds replay to exact historical dependencies, and makes committed projection-recovery failure explicit and fail closed. It does not redefine core semantics.

### Package lane

CS6-4 creates exactly 17 new `2.0.7` package trees and a version-specific generator/test surface. Package bytes bind exact accepted v1.3.0 identities, runtime-required artifacts, lifecycle rows, validator descriptors, bindings, closure, instructions, and internal digests. Historical versions are read-only.

### Harness lane

CS6-5 drives the production path using the exact accepted contract and `2.0.7` packages. It provides coverage ledgers for 17 packages, 65 artifacts, 13 lifecycle dimensions, 20 validators, 876 bindings, and all 116 mutations. Every rejection records exact error identity and measured before/after filesystem state.

### Integration/freeze lane

CS6-6 uses real packed tarballs and external temporary installs, verifies accepted-bundle authentication and package inventory, performs archive-safe historical byte checks without requiring `.git` inside the extracted subject, integrates dormant I11, and emits a one-file S11 freeze record containing resolved identities rather than a self-hash placeholder.

### Assurance lane

CS6-7 extracts exact S11 into a clean isolated tree, runs the predetermined corpus portably, writes exactly nine outputs, and emits pass/fail. The reviewer cannot repair inputs. CS6-8 is a separate operator-only decision surface.

## Ownership and overlap prevention

The normative ownership map is `.trellis/tasks/08-07-cs6-establish-successor-governance/research/cs6-path-ownership-map.md`. Shared files are assigned to only one technical child. Cross-lane calls are allowed only through reviewed exported interfaces. A requested edit outside a child's allowlist stops for a governance amendment.

## Compatibility and authority

- Accepted contract identity stays `evaluation-contract-v1.3.0` only if CS6-1 says `leaves-sound`.
- Procedure package correction version is `2.0.7`; older versions remain immutable.
- Live selection stays `1.0.0`.
- Worker Proposal-only ceilings and root-owned Decisions remain unchanged.
- Historical replay uses recorded Procedure/package/contract/report identities.
- Machine review is not human review and cannot activate or accept the system.

## Rollback and retry

All work is forward-only. Before a technical child commit, revert only that child's uncommitted allowlisted edits. After a child commit, defects require a new forward correction; do not amend historical commits or version trees. A failed S11/M11 attempt is preserved and a later attempt uses a new subject/evidence identity. A semantic-leaf defect exits the technical path entirely and starts `v1.3.1+` authoring/assurance.
