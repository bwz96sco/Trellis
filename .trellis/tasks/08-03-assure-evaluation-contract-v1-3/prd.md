# V13-B — Independently assure evaluation contract v1.3

## Goal

Mechanically and independently verify the exact immutable V13-A authoring commit, candidate manifest digest, and `evaluation-contract-v1.3.0` digest. Emit an unambiguous pass/fail verdict without repairing candidate or production files.

## Authoritative starting state

- Active methodology remains `evaluation-contract-v1.2.0` / `57d1956bf4453b497cce0e288c95d7194491ddac611570e8e0c8c0aefb7516bb` until this task passes.
- Proposed identity is `evaluation-contract-v1.3.0`; the exact candidate digest must come from the immutable V13-A commit, never from planning text.
- Infrastructure reference remains `ccd5bb3afc99283252c599916a2b8c2e05075cc6`.
- R0 is addressability/planning evidence, not semantic derivability. R1 mechanics are comparison evidence only; post-freeze semantic fixtures are non-authoritative.
- Live selection remains Procedure `1.0.0`, 14 capabilities, and literature scan default. Procedure `2.0.3` remains dormant forward-repair intent.

## Explicit predecessor gate

V13-A must have a separately authorized immutable authoring commit containing a complete candidate pack, exact candidate-manifest sidecar, exact frozen-target sidecar, and execution evidence. V13-B must receive the exact commit hash, candidate manifest path/digest, contract identity, and contract digest declared in `research/assurance-plan-v1.3.json`.

Tree position, a working-tree candidate, a branch name, or an agent label does not satisfy this gate.

## Requirements

### B1 — Mechanical reviewer independence

- V13-B must be assigned to an accountable reviewer mechanically distinct from the V13-A author.
- Compare exact accountable identities, not agent/session labels. The assurance record binds V13-A commit author name/email and authoring evidence identity to the V13-B reviewer identity source.
- Missing, ambiguous, or equal accountable identity fails before candidate acceptance.

### B2 — Exact immutable inputs

- Review only the exact V13-A authoring commit and exact candidate paths/digests listed in `research/assurance-plan-v1.3.json`.
- Require a clean extraction of those bytes from the commit. Working-tree overlays are not assurance inputs.
- Recompute the candidate manifest digest and frozen-target methodology digest independently.
- Any path, byte length, member hash, sidecar, identity, or digest mismatch fails.

### B3 — Read-only assurance

- Candidate files, production files, tests, Procedures, registries, activation/cutover records, specifications, historical evidence, and unrelated dirty paths are read-only.
- The reviewer may write only the exact assurance output allowlist in `research/assurance-plan-v1.3.json`.
- Do not repair, normalize, regenerate, or replace candidate bytes. Defects return to V13-A.

### B4 — Strict contract verification

Independently verify:

- strict UTF-8/JSON, no BOM, duplicate decoded-key rejection, exact schemas, exact keys/enums/types, canonical bytes, and deterministic ordering;
- candidate manifest membership, media types, byte lengths, SHA-256 values, and filename-bound sidecars;
- exactly one valid provenance class for every normative field;
- exact public citations/digests for inherited facts and explicit `trellis-native-v1.3` labeling for every new decision;
- no private-source dependency, inspection, transmission, or embedded private content;
- exact and unique disposition of all 64 durable outputs;
- all 13 lifecycle dimensions for every enforceable artifact/checkpoint or explicit inapplicable/blocked disposition;
- exact closure source fields, types, null/absence semantics, producer/reader/order/zero-write rules, and no undeclared `Result.status` heuristic;
- exact validator `(id, version, severity)` bindings, duplicate rejection, registry membership, and severity non-downgrade;
- worker-visible versus root-only separation and Proposal-only authority;
- compatibility statement: historical Procedure `2.0.2` remains bound to exact v1.2, while future `2.0.3` may bind only to the exact accepted v1.3 digest;
- independent deterministic rebuild/digest recomputation without importing the production R2A parser;
- mutation cases that fail closed;
- no mutation outside the assurance allowlist.

### B5 — Unambiguous verdict and retry rule

- Verdict is exactly `pass` or `fail`.
- Any material defect, incomplete evidence, independence failure, mutation, or digest mismatch yields `fail`; no accepted digest is published.
- Failure returns to V13-A for a new authoring commit and new candidate/contract digests, then V13-B restarts from all inputs.
- After acceptance, semantic correction advances to `evaluation-contract-v1.3.1+`; v1.3.0 bytes are not rewritten.
- A separate explicit authorization is required before committing V13-B assurance outputs.

## Exact output boundary

The only future assurance outputs are the exact allowlist in `research/assurance-plan-v1.3.json`:

- `research/exact-input-attestation.json`;
- `research/reviewer-independence.json`;
- `research/schema-digest-audit.json`;
- `research/provenance-coverage-audit.json`;
- `research/durable-output-lifecycle-audit.json`;
- `research/closure-validator-audit.json`;
- `research/privacy-mutation-audit.json`;
- `research/execution-evidence-ledger.json`;
- `research/assurance-verdict.json`.

Planning files and `research/planning-context.md` plus `research/assurance-plan-v1.3.json` are task metadata, not assurance verdict outputs.

## Acceptance Criteria

- [ ] Exact V13-A authoring commit, candidate manifest digest, contract identity, and contract digest are present and match independently recomputed values.
- [ ] Reviewer independence is mechanically proven; missing/equal/ambiguous identity fails.
- [ ] Candidate extraction and all assurance checks are read-only outside the exact output allowlist.
- [ ] Strict schema, canonicalization, digest, manifest, provenance, 64-output, 13-dimension, closure, validator, visibility, privacy, compatibility, and mutation checks pass.
- [ ] No undeclared status heuristic, private dependency, authority widening, or historical mutation is accepted.
- [ ] Verdict is exactly pass/fail and no repair is performed.
- [ ] A failure names stable findings and returns to a new V13-A authoring commit/digest and full rerun.
- [ ] Parent and child task validation, allowlist/disjointness checks, `git diff --check` on owned paths, protected-hash checks, and dirty-path isolation pass.
- [ ] No assurance commit, runtime/test/Procedure change, activation, package lifecycle, archive, release, publication, push, network, model, or provider work occurs without separate authorization.

## Planning status

- Status remains `planning` and unassigned until a mechanically independent accountable reviewer is selected.
- This is a complex task with reviewed `design.md`, `implement.md`, `implement.jsonl`, and `check.jsonl` required before activation.
- Task activation and assurance-commit authorization are separate approvals.
