# Migrate Research methodology into Trellis Procedures

## Goal

Migrate the Phase-1-frozen Research workflow methodology into Trellis Procedures without restoring host-discovered Skill authority, weakening the Trellis control plane, or silently omitting source workflow behavior.

The Phase-2 task must use the reviewed Phase-1 v1.2 migration target as its methodology source of truth and the closed C08–C10 infrastructure snapshot as its implementation base.

## Background and authoritative pins

- Phase-1 predecessor gate: `pass`.
- Methodology contract: `evaluation-contract-v1.2.0`.
- Methodology digest: `57d1956bf4453b497cce0e288c95d7194491ddac611570e8e0c8c0aefb7516bb`.
- Source Skills evidence commit: `9a02a533f5f3ecfd0c0789a01588fc492d321d6c`.
- Trellis infrastructure pin: `ccd5bb3afc99283252c599916a2b8c2e05075cc6`.
- Durable pin record: `.trellis/research/phase-2-pins.md`.
- Phase-1 evidence is archived under `.trellis/tasks/archive/2026-07/07-28-evaluate-research-workflow-fidelity/` and `.trellis/tasks/archive/2026-07/07-29-close-phase1-fidelity-pass-gate/`; the C08–C10 implementation predecessor is archived under `.trellis/tasks/archive/2026-07/07-23-replace-research-skills-with-trellis-procedures/`.
- The private source repository remains read-only and is evidence only. Phase 2 must not re-pin to private HEAD.

## Requirements

### R1 — Preserve the control-plane authority boundary

- Workers remain `proposal-only`.
- Workers must not make canonical Research decisions, apply Proposals, approve Dispatches, launch capabilities, chain capabilities without root authorization, create random canonical IDs, mutate Git history, or expand sandbox/network authority.
- Source workflow selection or closure authority must translate to worker Result/Proposal plus root-owned Decision.
- `research-quest` remains read-only; write-capable Quest changes remain an explicit root/admin workflow.

### R2 — Bind methodology to reviewed evidence

- Every implementation child must cite the Phase-1 v1.2 methodology digest and infrastructure pin.
- Every preserved, translated, improved, or retired behavior must trace to the frozen migration target, normalized inventory, decision ledger, differential-test matrix, improve register, or an explicit new waiver.
- Material corrections to the Phase-1 contract require a separately reviewed v1.3+ contract; Phase 2 must not silently reinterpret v1.2.

### R3 — Design a fail-closed Procedure methodology package

Before migrating individual workflows, Phase 2 must decide and implement how ordered instructions, support material, artifact contracts, validator descriptors, provenance, and digests become authoritative.

The design must choose among or explicitly combine:

- instruction-only two-file Procedures;
- digest-bound Procedure support packs;
- versioned trusted runtime contracts and validators.

No sibling or external file may influence worker execution unless it is explicitly enumerated, versioned, provenance-bound, and covered by the authority model.

### R4 — Preserve durable workflow contracts

- P2-01 must freeze a machine-readable `methodology-contract-freeze.json` covering exact field names, types, requiredness, cardinality, producers, consumers, immutable fields, transitions, terminal applicability, stable error codes, and positive/base/critical-negative fixture obligations for every package.
- Represent required/optional artifacts, cardinality, canonical names, formats, ordered stages where v1.2 defines them, named artifact-lifecycle checkpoints where it does not, ownership, dependencies, terminal states, and cross-artifact consistency.
- Preserve stable identifiers and provenance across stages and handoffs.
- Preserve explicit null, partial, blocked, failed, inconclusive, selected, and other applicable terminal semantics.
- Enforce selected-versus-blocked closure exclusivity where required.
- Separate source facts, analyst synthesis, evaluator attacks, and root decisions.

### R5 — Implement deterministic validator assurance

- Reimplement or port behavior—not private source code verbatim—for fail-closed validation.
- Validators must produce deterministic, reviewable reports bound to the Procedure version, artifact set, and relevant Dispatch/Result/Proposal records.
- Critical missing evidence, provenance drift, stable-ID drift, illegal mutation, invalid closure, and invalid composition must fail closed.
- Carry `IMP-STAGE-FIELD-DEPTH`, `IMP-NON-PILOT-BEHAVIOR-DEPTH`, `IMP-IDEA`, and other Phase-1 improve items into the child-task plan.

### R6 — Migrate the ideation/evaluation couple first

- Generation owns stages 01–04.
- Evaluation consumes but does not rewrite stages 01–04 and owns stages 05–07.
- Candidate IDs and project alignment remain stable across the shared case.
- Preserve novelty verification, independent method-flaw audit, matched controls, falsifiers/kill conditions, pivot confirmation, and selected-or-blocked closure.
- Translate final selection to a pending Proposal and root Decision.
- Resolve the frozen inventory's ideation `selected`/closure fixtures as shared-couple boundary checks or use a separately reviewed v1.3+ correction; do not silently assign evaluation-owned selection authority to generation.
- Use this couple as the first end-to-end proof of the Procedure package, artifact contract, validator, provenance, and differential-testing architecture.

### R7 — Migrate the remaining workflow family without silent omission

- Existing capability-mapped workflows must be deepened from thin Procedure shells according to the frozen target.
- `research-figure`, `research-slides`, and `research-survey` remain explicit optional methodology; they are not retired.
- Their target capabilities must reuse existing Quest stages unless a separately approved contract change proves a new stage necessary.
- Preserve the three frozen composition edges and distinguish them from ordinary handoffs.
- External integrations remain declared, bounded adapters; their availability must not silently determine successful closure.

### R8 — Differentially validate against the frozen target

- Tests must preserve exactly 229 Phase-1 `DFT-*`, `COMP-*`, and `CTRL-*` frozen cases and separately register exactly 38 Phase-2 expansion cases; the sets must not overlap or be arithmetically combined. The 3 composition cases and 2 controls are already subsets of the frozen 229.
- Compare observable methodology and authority behavior against the frozen target, not private source HEAD.
- Cover happy paths, base/empty paths, critical invalid cases, compatibility/replay behavior, and unavailable-integration degradation.
- Live model trials remain out of scope until separately authorized.

### R9 — Maintain compatibility and safe rollout

- Preserve schema-v1 replay and current schema-v2 activation/approval compatibility unless an explicitly planned migration is approved.
- Existing Procedure activation and approval records must not silently acquire new authority after methodology deepening.
- Procedure version upgrades, policy activation, rollback, and project override behavior must be explicit and fail closed.
- Frozen v1.2 cutover changes the literature automatic/default route to `research.literature.review` and makes `research.literature.scan` non-default; figure, slides, and survey remain explicit/non-default. A different route requires a separately reviewed v1.3+ contract.
- P2-12 must emit a normative digest-bound cutover manifest covering routes, modes, Procedure/validator/packed bindings, previous bindings, cutover state, and rollback targets.
- Project overrides must not bypass support-pack, validator, provenance, or artifact-contract validation.

### R10 — Keep the work isolated

- Do not include unrelated dirty paths: `AGENTS.md`, `CLAUDE.md`, `docs-site`, or `marketplace`.
- Do not restore generated or installed Research Skills.
- Do not copy private Skill bodies, validators, tests, prompts, cases, or raw model outputs into Trellis.
- No live model/network/cost execution, commit, archive, publication, release, or push is authorized by planning.

## Acceptance Criteria

- [ ] The parent task and independently verifiable child topology are documented and validated before any child starts.
- [ ] Every child cites methodology digest `57d1956bf4453b497cce0e288c95d7194491ddac611570e8e0c8c0aefb7516bb` and infrastructure pin `ccd5bb3afc99283252c599916a2b8c2e05075cc6`.
- [ ] Procedure methodology packaging, digest, artifact, validator, provenance, override, activation, rollback, and compatibility contracts are executable and specification-backed.
- [ ] Ideation/evaluation stages 01–07 pass the frozen positive and critical-negative differential cases.
- [ ] All 16 Phase-1 workflow packages are mapped to implemented Procedures/capabilities or an explicit user-approved Phase-2 deferral; no package is silently omitted.
- [ ] Figure, slides, and survey remain explicit optional workflows; literature review becomes the frozen v1.2 literature automatic/default route and literature scan becomes non-default, with unrelated routes unchanged.
- [ ] Quest read/write ownership and worker Proposal-only authority remain enforced by focused and integration tests.
- [ ] Exact frozen-229 and separate expansion-38 registries/reports pass with no overlap, omission, duplicate, or subset double-counting.
- [ ] Composition edges are bounded, approval-aware, and independently tested with valid execution, adversarial binding, failure/cancellation, and rollback evidence.
- [ ] Missing critical evidence, illegal authority, provenance/ID drift, invalid closure, malformed support packs, and invalid project overrides fail closed.
- [ ] Phase-2 differential tests use the frozen v1.2 target and do not read private HEAD as runtime or test authority.
- [ ] Every P2-01 through P2-12 acceptance package contains a task-local `research/execution-evidence-ledger.json` recording exact argv/cwd/exit code, assertion IDs and outcomes, output digests/paths, zero-write snapshots where required, and forbidden-content/path scan commands and results; placeholders or command-family-only evidence do not pass.
- [ ] P2-12's cutover manifest/digest and P2-13's mechanically independent, exact-input/exact-output assurance gate pass, including distinct pre- and post-activation rollback vectors.
- [ ] Focused unit/integration tests, full relevant suites, build, packed-package audit, specifications, task validation, GitNexus change detection, and independent final review pass before completion.
- [ ] Unrelated dirty paths remain untouched and excluded from all Phase-2 commits.

## Out of Scope

- Re-running Phase-1 against private Skills HEAD.
- Restoring host-discovered Research Skill execution or packaging.
- Live model trials or provider-retention decisions.
- Publishing, releasing, or pushing Phase-2 implementation.
- Modifying unrelated product/docs submodules.
- Treating the Phase-1 pass as proof of live multi-host equivalence or complete non-pilot behavior without Phase-2 extraction and validation.

## Planning status

- Task creation and planning are authorized.
- Task activation and production implementation are not yet authorized.
- Parent `design.md` and `implement.md`, thirteen child planning packages, and curated manifests are present.
- All 14 task manifests, topology, semantic manifest policy, exact 229-case allocation, disjoint path ownership, and planning diff hygiene must pass deterministic validation after every review-driven correction.
- Three adversarial review/remediation rounds plus a focused hygiene recheck completed. The final read-only verdict is `READY`: no implementation-blocking planning defect survived.
- The task remains `planning`; implementation still requires a new explicit user approval of the final summary before any `task.py start`.

## Additive v1.3 forward-correction overlay (2026-08-03)

This overlay preserves every historical requirement above. It supersedes only the future interpretation that public frozen v1.2 already supplies executable artifact-lifecycle, closure-derivation, or exact validator-binding semantics.

### Corrected evidence and authority status

- Frozen `evaluation-contract-v1.2.0` and digest `57d1956bf4453b497cce0e288c95d7194491ddac611570e8e0c8c0aefb7516bb` remain immutable and are the active methodology pin until an exact `evaluation-contract-v1.3.0` candidate passes mechanically independent V13-B assurance.
- R0 remains immutable addressability, count, ownership, and planned-destination evidence. It is not semantic derivability proof.
- Current R1 strict parsing, duplicate-key rejection, exact identity/digest, path containment, canonicalization, immutability, and worker-visibility mechanics may be reused after v1.3 acceptance. Post-freeze R1 semantic fixtures and the 104/54/50 skeleton are non-authoritative for both v1.2 and v1.3.
- R2A semantic enforcement is blocked on V13-A contract authoring followed by V13-B exact-commit/digest assurance. No later task may infer the missing semantics while that dependency is unsatisfied.
- The live system remains contained to Procedure `1.0.0`, 14 capabilities, and `research.literature.scan` as the literature default. The forward repair Procedure version remains `2.0.3`; C0 does not author packages or change selection.

### V13-A — public-evidence contract authoring

- Create a research-only `evaluation-contract-v1.3.0` candidate from public frozen v1.2 facts, archived public Trellis evidence, the Wave-8 audit, and explicit Trellis-native normative decisions.
- Every normative field uses exactly one provenance class: `inherited-public-v1.2`, `trellis-native-v1.3`, `inapplicable`, or `blocked-by-contract`.
- The candidate must disposition all 64 public durable outputs in the seven lifecycle-modeled families; define all 13 lifecycle dimensions or explicit inapplicable/blocked semantics; define canonical closure fields without a generic `Result.status` heuristic; and bind exact validator `(id, version, severity)` triples.
- Candidate JSON, digests, sidecars, and manifest membership must be deterministic and independently rebuildable.
- No private Skill body, prompt, validator, test, fixture, case, or raw output may be inspected, transmitted, copied, or used as authority.
- A separate explicit authorization is required before the immutable V13-A authoring commit.

### V13-B — independent exact-input assurance

- Review the exact immutable V13-A authoring commit, candidate-manifest digest, contract identity, and contract digest.
- Mechanically prove accountable reviewer identity differs from the V13-A author; different agent labels alone are insufficient.
- Verify strict schema/digest/provenance/coverage/closure/validator/privacy/mutation requirements read-only, emit only the exact allowlisted assurance outputs, and produce an unambiguous `pass` or `fail` without repairs.
- Any failure returns to a new V13-A authoring commit and digest, followed by a complete V13-B rerun.
- A separate explicit authorization is required before the assurance-only commit.

### Additional acceptance gates

- [ ] V13-A and V13-B are real validated child tasks with disjoint research-only ownership and no production/test/Procedure/registry/specification authority.
- [ ] The C0 preservation record binds the parent/children, active v1.2 and proposed v1.3 identities, Wave-8 digest, R0 reclassification, live-v1 containment, protected paths, inherited dirty exclusions, and V13-A → V13-B → R2A dependency.
- [ ] No archived evidence, P2-01 evidence, R0 file, Wave-8 audit, historical Procedure `1.0.0–2.0.2`, cutover/candidate/assurance evidence, or `.trellis/research/phase-2-pins.md` is rewritten.
- [ ] Every later commit, assurance, remediation subject, evidence, activation, package lifecycle, archive, release, publication, and push boundary remains separately authorized; one approval never implies another.
