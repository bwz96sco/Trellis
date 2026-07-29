# Gate recommendation v2 — Phase-1 fidelity pass gate

## Verdict: **blocked**

| Field | Value |
|-------|-------|
| evaluation_contract_version_reviewed | `evaluation-contract-v1.1.0` |
| frozen-migration-target-v1.1 declared sha256 | `a8d49c8a87e7688fda67ede73c7b04cb92a88eebda4d650c61309da025209a78` |
| historical v1.0.0 sha256 | `0b09883b5233141be16ca2939f0c73a5c481523e130d61360e5580cd5849c33b` |
| source_commit | `9a02a533f5f3ecfd0c0789a01588fc492d321d6c` |
| reviewed_at | 2026-07-29 |
| reviewer | independent counter-reviewer (F08; not F01–F07 author) |
| next_contract_required | **`evaluation-contract-v1.2.0`** + **`frozen-migration-target-v1.2`** |

## Meaning of blocked

- Phase-1 predecessor-gate does **not** convert to **pass** on v1.1.
- Phase-2 Procedure **methodology implementation planning** is **not authorized** against the v1.1 digest as a complete freeze.
- v1.1 remains useful **draft evidence** (owner maps, improve register, live waiver, quest split) but must not be treated as authoritative methodology migration target until v1.2 closes blocking findings.
- Do **not** mutate launched v1.1.0 artifacts; corrections ship as v1.2.0+.

## Blocking items (must fix in v1.2)

1. **BLK-DURABLE-IO** — Reconcile durable outputs: split runtime vs methodology support vs host packaging; restore/map/waive F02 durable samples (notably audit/setup packs). Satisfy hard gate `every_durable_output_mapped_or_waived`.
2. **BLK-TERMINAL-VOCAB** — Replace universal terminal enum with source/validator-grounded states per package; align DFT outcome families; stop over-claiming completeness.
3. **BLK-DFT-ADEQUACY** — Per-family applicability analysis (not 16×14 stamp); remove or reclassify inapplicable critical cases; materialize or delete stage-level DFT refs; add missing COMP/CTRL/HOST fixtures referenced by frozen behaviors so `coverage_rule` is true.
4. **BLK-BEHAVIOR-DEPTH** — Non-pilot packages must not claim high-confidence full behavioral coverage on template PKG rows; deepen observables + dual evidence or lower confidence / mark methodology-unknown with explicit Phase-2 discovery work.

## Named residual conditions (non-blocking alone; still require tracking)

- Stage contract field boilerplate (IDs OK; content thin)
- Activation / `default_stage_capability` minor inconsistencies (explicit vs automatic-or-explicit; false vs null)
- Independent byte rehash of v1.1 (and then v1.2) with `shasum -a 256` at freeze ceremony
- Uniform `confidence: high` recalibration
- Live trials remain unrun — acceptable for planning **after** pass, not a substitute for durable/DFT correctness

## Predecessor F07 conditions (for record)

| Condition | Status after F08 |
|-----------|------------------|
| figure/slides/survey owner disposition | **Addressed** in v1.1 (MAP optional) |
| Live trials not run | **Addressed** as planning waiver |
| Partial prose novelty/diversity | **Addressed** as IMP-IDEA improve |
| Same-agent F07 limitation | **Addressed** by this independent review |

These do **not** override new material methodology defects found in v1.1 inventory/matrix quality.

## Authorization matrix

| Activity | Authorized on v1.1? |
|----------|---------------------|
| Treat v1.1 as historical/draft evidence | Yes |
| Phase-2 methodology **implementation planning** pinned to v1.1 digest | **No** |
| Phase-2 production Procedure/schema edits | **No** (never authorized by this gate alone) |
| Open v1.2 correction task | **Yes (required)** |
| C01–C10 infrastructure work | Separate family; unaffected |

## Required next actions

1. Open **evaluation-contract-v1.2.0** correction task with the four BLK-* findings as acceptance criteria.
2. Produce `normalized-workflow-inventory` + `differential-test-matrix` + `frozen-migration-target-v1.2` + `.sha256` under a new or extended research path; leave v1.1 immutable.
3. Re-run independent counter-review (or human review) against v1.2 only.
4. Only then update parent `predecessor-gate-verdict` toward pass/conditional.

## Explicit non-claims

- This blocked verdict does **not** assert that source private skills lack methodology value.
- This blocked verdict does **not** assert that figure/slides/survey should be retired.
- This blocked verdict does **not** require live trials for Phase-1 planning once a clean freeze exists.
- Public Trellis `idea-*-v1` PROCEDURE.md shells remain thin (~tens of lines); IMP-THIN-PROCEDURE-BODIES remains valid.

## References

- `counter-review-findings.json`
- `counter-review.md`
- `coverage-reconciliation.json`
- `evaluation-contract-v1.1.0.md`
- `frozen-migration-target-v1.1.json` / `.sha256`
- F07 `predecessor-gate-verdict.md` (conditional)
- F01 `evaluation-rubric.yaml` hard gates
- F02 `workflow-contract-matrix.json` durable samples
