# Independent planning review remediation

The first independent review returned `BLOCKED`. Planning was corrected before requesting implementation approval.

## Closed findings

1. **Composition runtime owner** — assigned to P2-03. It owns a root-only deterministic composition descriptor/runtime, parent/child or adapter binding, authorization evidence, dispatch-count enforcement, non-transitive rules, and rollback. P2-08/P2-10/P2-11 own only edge-specific methodology and fixtures; P2-12 owns final integration.
2. **Circular path/case allocation** — materialized during planning in `path-ownership-map.md`, `differential-case-allocation.json`, and child `research/differential-case-map.json` files. P2-01 reviews/freezes these artifacts; it no longer has to create them after an impossible precondition.
3. **Historical resolution ownership** — P2-02 now owns `dispatch-revalidation.ts` and integrates exact activation-recorded Procedure ID/version resolution there. P2-03 consumes the accepted API and verifies Context/Result end-to-end behavior.
4. **Manifest semantic violation** — all 28 manifests now contain only `.trellis/spec/**` or their own task's `research/**` paths. Cross-task and shared research evidence is cited from each task-local `research/planning-context.md` and read on demand rather than injected.
5. **Planning-only scope ambiguity** — P2-01 and P2-13 explicitly mark code-spec edits inapplicable and remain report/contract-only.

## Second independent review remediation

A second adversarial audit found three additional planning blockers; all require deterministic revalidation before the plan can be summarized as ready:

1. **Current-task manifest scope** — 74 of 175 entries had injected shared, archived, parent, child, or sibling research. Every task now has a local `research/planning-context.md`; the 28 manifests were rebuilt from task-local research plus specs only.
2. **Test-path overlap** — P2-03's broad command-test prefix overlapped three P2-12 integration tests. P2-03 now owns three exact generic runtime test files, while P2-12 retains three distinct exact activation/upgrade/packed integration files.
3. **P2-03 public API gap** — the generic runtime needed a public Research subpath export but `packages/core/src/research/index.ts` was assigned to P2-12. The barrel is now exclusively P2-03-owned; P2-12 uses internal bindings and does not reopen it.
4. **Malformed predecessor text** — the nested backticks in P2-01's authorization gate were corrected.

## Third adversarial review remediation

A later audit remained `BLOCKED` and identified methodology-depth, cutover, composition, shared-artifact, provenance, and assurance defects. Planning now records these corrections:

1. **Literature route contradiction** — P2-01 freezes the v1.2 disposition; P2-12 atomically makes `research.literature.review` automatic/default and `research.literature.scan` non-default while leaving unrelated routes unchanged.
2. **Field-depth gates** — P2-01 emits machine-readable `methodology-contract-freeze.json`. Every package has exact field/type/cardinality/producer/consumer/immutable/transition/terminal/error/fixture obligations using ordered stages where v1.2 defines them and artifact-lifecycle checkpoints where it does not.
3. **Frozen versus expansion arithmetic** — the frozen registry remains exactly 229 IDs, including its three composition and two control subsets. A separate planning allocation owns exactly 38 `EXP-*` cases; P2-04, P2-12, and P2-13 report both sets independently with no overlap or double-counting.
4. **Normative cutover evidence** — P2-12 emits a canonical digest-bound cutover manifest covering capability, route/mode/default status, Procedure, validator, packed path, prior binding, state, and rollback target.
5. **Supported rollback semantics** — before activation, restore registry/inventory/routing atomically. After activation, a reviewed registry rollback affects future selection only while historical records retain recorded bindings, or a forward-fix version is issued. No nonexistent canonical disable event is claimed.
6. **Composition proof depth** — P2-03 owns 12 generic positive/adversarial/failure/rollback expansions; P2-08 adds 3 `COMP-001`, P2-10 adds 3 `COMP-002`, and P2-11 adds 3 `COMP-003` edge-specific expansions.
7. **Review artifact ownership and containment** — review-case is the sole initial writer. Campaigns consume immutable digest-bound child evidence materialized by root into contained Context inputs; sibling `..` traversal and same-ID/different-bytes conflicts fail closed.
8. **Writing/visual provenance** — writing-to-figure and figure-to-slides boundaries bind sender, receiver, artifact identity/digest, source evidence, and Procedure digest, with positive and adversarial fixtures.
9. **Mechanical independent assurance** — P2-13 consumes exact predecessor inputs, mechanically compares P2-12/P2-13 identities, fails on absent/equal identity, emits only nine allowlisted outputs, and audits separate pre/post activation rollback vectors.
10. **Executable evidence population** — every P2-01 through P2-12 acceptance package must populate a task-local exact-command/assertion/output-digest/zero-write/forbidden-scan ledger. P2-13 treats placeholders, command families, and prose-only pass claims as failures.

## Residuals carried forward

- P2-13 must be assigned to a reviewer different from the P2-12 implementer before activation.
- Live host/model equivalence remains unproven and outside deterministic Phase-2 implementation.
- P2-01 must execute the now-explicit field-level freeze before any implementation child starts; planning defines the contract but does not populate implementation evidence.
- Procedure package, event, and worker Context schema versions remain separate named version domains.

## Final readiness verdict

The fresh full read-only adversarial review returned `READY`, and a focused recheck after closing its four documentation-hygiene residuals also returned `READY`. No implementation-blocking planning defect survived. Deterministic validation confirms 14 planning tasks, current-task/spec-only manifests, an exact metadata-preserving 229-case frozen bijection, 38 separate non-overlapping expansion cases, disjoint production/test/spec ownership, clean planning diff hygiene, and preservation of inherited unrelated dirty paths.
