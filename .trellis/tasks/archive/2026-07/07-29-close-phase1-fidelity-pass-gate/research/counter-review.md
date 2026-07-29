# F08 Independent counter-review — Phase-1 fidelity pack v1.1

| Field | Value |
|-------|-------|
| Reviewer | Independent counter-reviewer (did **not** author F01–F07) |
| Contract under review | `evaluation-contract-v1.1.0` |
| Declared target digest | `a8d49c8a87e7688fda67ede73c7b04cb92a88eebda4d650c61309da025209a78` |
| Historical v1.0.0 digest | `0b09883b5233141be16ca2939f0c73a5c481523e130d61360e5580cd5849c33b` |
| Source commit pin | `9a02a533f5f3ecfd0c0789a01588fc492d321d6c` |
| Reviewed at | 2026-07-29 |
| **Verdict** | **blocked** → require **v1.2** |

## Scope and independence

Read-only review of tracked v1.1 research artifacts under `07-29-close-phase1-fidelity-pass-gate/research/`, predecessor F07 materials, F01/F02 baselines, and public Trellis Procedure shells for idea-generation/evaluation. No production packages or private skill bodies edited. Deliverables written only under this research path.

## Executive summary

v1.1 **does close** the four named predecessor conditions (optional figure/slides/survey mapping, live planning waiver, improve-not-preserve for partial prose, and second-agent review). Those are real improvements over v1.0.0.

v1.1 **does not** support a Phase-1 **pass** as a methodology migration freeze. The pack over-claims behavioral coverage, durable I/O completeness, terminal-state completeness, and DFT adequacy. Those are material methodology/mapping quality errors relative to the frozen rubric hard gates and the charter purpose (“decide what to preserve/translate/improve **before** Procedure-methodology migration”). Implementation planning against this digest would bake in wrong pack contracts and false-critical DFT cases.

## Claim-by-claim refutation attempt

### 1. 16/16 behavioral coverage (not mere package enumeration) — **REFUTED**

- Inventory and frozen target list 16 packages, each with `intended_target` capability/procedure. Package **slot mapping** is complete.
- PKG-* behavior rows for non-pilot packages share near-identical rationales (“Mapped target capability/procedure…”) and nearly uniform authority/terminal templates.
- Deep methodology observables, improve validators, and dual evidence appear concentrated in ideation/evaluation (IMP-IDEA-*, F04 pilot). Other packages lack equivalent behavioral freeze depth.
- **Conclusion:** 16/16 is package enumeration + capability labels, not full behavioral methodology coverage.

### 2. Durable outputs and terminal states completeness — **REFUTED**

**Durable outputs**

- Rubric hard gate: `every_durable_output_mapped_or_waived`.
- F02 `research-review-case` durable sample included `REVIEW_CASE_STATUS.md`, `review-case.yaml`, `claims-ledger.json`, `findings/...`, manifests. v1.1 lists only two `references/*` paths.
- Across literature/ideation/experiment, `durable_outputs` mixes runtime pack paths with methodology materials (`references/stage-*.md`, playbooks, rubrics).
- `research-quest` lists `SKILL.md` as durable output (host packaging, not methodology).
- `research-project-setup` durable list is only two reference files.

**Terminal states**

- Most packages get the same six-value enum (`success|blocked|failed|partial|null|inconclusive`) regardless of F02 `outcomes_mentioned`.
- Specialized exceptions (idea-evaluation `selected`, quest resume terminals) prove the rest are stamped, not extracted.
- IMP-FAMILY-OUTCOME-VOCABULARY admits enforcement gaps but inventory still claims the full enum as package fact.

### 3. Stage normalization quality — **PARTIALLY UPHELD**

- **Good:** F02 literature-style noise (prose imperatives, evidence filenames as stages, inflated stage_count) is cleaned. Canonical stages separated from `reference_filenames` / aliases.
- **Residual:** Stage records use boilerplate I/O/preconditions (`stage-NN-artifacts`, `prior-gates-satisfied-or-first-stage`). IDs are credible; stage **contracts** are not methodology-complete.

### 4. Adequacy of every DFT family per workflow — **REFUTED**

- Matrix structure is combinatorial stamp: 16 packages × 14 base families (+ experiment extras + improve rows) = 256. Descriptions are copy-identical across packages.
- **Inapplicable critical stamps:** e.g. `research-quest` and `research-review-case` get critical `ordered-stage-progression` with empty canonical stages; quest gets outcome-failed/partial/null DFT though those terminals are not listed; closure-exclusivity description is “selected XOR blocked” for read-only resume.
- **Orphans:**
  - Inventory stage rows reference `DFT-*-stage-*-progression` IDs **not** present in `differential-test-matrix.json` (~50).
  - Frozen target `phase2_fixture_ids` include `DFT-COMP-001/002/003`, `DFT-ctrl-proposal-only`, `DFT-no-skill-payload` — **absent** from matrix `cases[]`.
- Matrix `coverage_rule` (“every preserve/translate behavior has positive DFT”) is **false** for COMP/CTRL behaviors.

### 5. Authority and composition mappings — **PARTIALLY UPHELD**

- Composition triple matches F02 correction; COMP-003 bounds personal-slides without private impl import; ideation↔evaluation correctly remains handoff.
- Authority fields exist everywhere but barely discriminate among worker packages (`prepare-candidate-only` / `forbidden-worker` template). Acceptable as control-plane default only if not treated as source-specific methodology freeze.

### 6. Quest vs quest-admin split — **UPHELD**

Explicit `quest_boundary`, divergent authority/terminals, preserve vs translate, and inventory purposes align with read-only resume vs write-capable admin.

### 7. Figure / slides / survey as explicit optional — **UPHELD**

Owner disposition MAP, `default_stage_capability: false`, explicit activation, owner_mappings in frozen target, `unresolved_user_owners: 0`. Predecessor condition #1 closed correctly.

### 8. Privacy / source-read-only in tracked artifacts — **UPHELD (residual)**

Reviewed v1.1 artifacts are path/hash/abstract. No private body dumps found. Policy and F07 privacy correction still apply. Residual: keep durable path lists path-only.

### 9. Two-file Procedure format left open — **UPHELD**

`procedure-support-pack-requirement.md` and contract change #6 correctly refuse premature two-file sufficiency; Phase-2 must choose packaging with digest-bound siblings only. Aligns with thin Procedure shells observed in public `idea-*-v1` PROCEDURE.md files.

### 10. SHA-256 matches file bytes — **DECLARED CONSISTENT / REHASH NOT EXECUTED HERE**

Sidecar, `_meta.json`, evaluation-contract, synthesis report, and migration ledger all pin:

`a8d49c8a87e7688fda67ede73c7b04cb92a88eebda4d650c61309da025209a78  frozen-migration-target-v1.1.json`

Independent OS-level byte rehash was not available in this review tool environment. Treat as residual verification for v1.2 freeze ceremony, **not** the primary block reason. Operators should run:

```bash
shasum -a 256 frozen-migration-target-v1.1.json
```

and confirm exact sidecar match before any pin is treated as cryptographic.

## Predecessor conditions status

| Predecessor condition | v1.1 status |
|----------------------|-------------|
| figure/slides/survey owner map/retire | **Closed** (MAP optional) |
| Live trials not run | **Closed for planning** (WVR-LIVE-PLANNING-OK) |
| Partial prose novelty/diversity | **Closed as improve** (IMP-IDEA-*) |
| F07 same-agent limitation | **Closed by this review** |

Closing predecessor conditions is **necessary but not sufficient** for pass when the v1.1 freeze introduces/exposes new material fidelity defects.

## Blocking findings (require v1.2)

1. **BLK-DURABLE-IO** — Durable outputs incomplete/misclassified vs F02 and hard gate.
2. **BLK-TERMINAL-VOCAB** — Terminal states not source-grounded; stamped universal enum.
3. **BLK-DFT-ADEQUACY** — Family stamp without applicability; orphan fixture IDs; coverage_rule false.
4. **BLK-BEHAVIOR-DEPTH** — High-confidence translate for non-pilot packages without dual methodology evidence.

## Strengths to preserve into v1.2

- Optional figure/slides/survey owner decisions and COMP-003 privacy bound
- Quest/admin split
- Live planning waiver wording (deterministic sufficiency for planning only)
- Open procedure support-pack architecture point
- IMP-IDEA improve register (do not silently preserve partial prose)
- Stage ID normalization direction (keep separation from filename noise)
- Historical v1.0.0 digest retained as evidence only

## What v1.2 must do (minimum)

1. Reclassify I/O: `runtime_durable_outputs` / `methodology_support_materials` / `host_packaging`; reconcile every F02 durable sample (map or waive).
2. Source-ground terminal states per package; mark unknowns explicitly; align DFT outcome families.
3. Rebuild DFT matrix with applicability (`required|optional|n/a+rationale`); include all frozen `phase2_fixture_ids`; resolve stage-level DFT orphans.
4. Recalibrate PKG behavior confidence and evidence refs to meet disposition_evidence_rule; stop claiming full behavioral coverage for template rows.
5. Freeze new digest; rehash with independent `shasum -a 256`; do not mutate v1.1 artifacts (immutability rule).

## Production safety

- No production Procedure/schema edits observed as part of this counter-review.
- Phase-2 methodology **implementation** must not pin `a8d49c8a…` as complete methodology truth.
- Phase-2 **planning discussions** may use v1.1 as draft input only if all blocking findings are tracked as open; formal predecessor-gate authorization remains **blocked**.

## Artifacts produced

- `counter-review-findings.json`
- `counter-review.md` (this file)
- `coverage-reconciliation.json`
- `gate-recommendation-v2.md`
