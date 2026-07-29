# F08 Independent counter-review — Phase-1 fidelity pack v1.2

| Field | Value |
|-------|-------|
| Reviewer | Independent counter-reviewer (did **not** author F01–F07 or the v1.2 pack) |
| Contract under review | `evaluation-contract-v1.2.0` |
| Declared target digest | `57d1956bf4453b497cce0e288c95d7194491ddac611570e8e0c8c0aefb7516bb` |
| Historical v1.1 digest | `a8d49c8a87e7688fda67ede73c7b04cb92a88eebda4d650c61309da025209a78` |
| Historical v1.0 digest | `0b09883b5233141be16ca2939f0c73a5c481523e130d61360e5580cd5849c33b` |
| Source commit pin | `9a02a533f5f3ecfd0c0789a01588fc492d321d6c` |
| Reviewed at | 2026-07-29 |
| **Verdict** | **pass** |

## Scope and independence

Read-only review of v1.2 research artifacts under `07-29-close-phase1-fidelity-pass-gate/research/`, prior v1.1 blocked counter-review, BLK remediation report, and hard-gate rubric. No production packages or private skill bodies edited. Deliverables written only as the four v1.2 counter-review files.

## Executive summary

v1.2 **closes** the four v1.1 blocking findings for **Phase-1 methodology-migration planning**:

1. **BLK-DURABLE-IO** — runtime / methodology / host split + ledger map/waive  
2. **BLK-TERMINAL-VOCAB** — asserted vs unasserted terminals; DFT outcomes follow asserted  
3. **BLK-DFT-ADEQUACY** — applicability filter; stage + COMP/CTRL/HOST fixtures closed  
4. **BLK-BEHAVIOR-DEPTH** — non-pilot medium confidence + slot-mapped depth; high reserved for pilot/quest/control-plane  

v1.2 **does not** overclaim full behavioral freeze. Non-pilot packages are explicitly `slot-mapped-methodology-depth-phase2` at `confidence: medium`. Stage contracts are explicitly `id-and-ref-only`. That honesty is what makes a planning **pass** fair.

Named residuals (stage field depth, non-pilot extraction, dual-basename I/O noise, ceremony rehash) remain **non-blocking** and are already tracked (IMP-* / Phase-2 notes).

## SHA-256 verification

Sidecar `frozen-migration-target-v1.2.sha256`:

```text
57d1956bf4453b497cce0e288c95d7194491ddac611570e8e0c8c0aefb7516bb  frozen-migration-target-v1.2.json
```

Same digest declared in `_meta.json`, `evaluation-contract-v1.2.0.md`, `blk-remediation-report.md`, and `phase-2-differential-handoff-v1.2.md`.

Ceremony residual (not methodology block):

```bash
cd .trellis/tasks/07-29-close-phase1-fidelity-pass-gate/research
shasum -a 256 frozen-migration-target-v1.2.json
# must equal sidecar line exactly
```

## Claim-by-claim refutation attempt

### 1. 16/16 mapped, zero unresolved_owner user — **UPHELD**

- 16 PKG rows with `intended_target` + `unresolved_owner: null`
- `unresolved_user_owners: 0`
- figure/slides/survey in `owner_mappings` as explicit optional

### 2. Durable I/O split + every output mapped/waived — **UPHELD (residual)**

**Closed vs v1.1**

- Inventory fields: `durable_runtime_outputs`, `methodology_support_refs`, `io_mapping`
- Ledger classes: `durable_runtime` | `methodology_support` | `host_packaging`
- F02-style runtime samples restored (e.g. review-case status/yaml/claims/findings; project-setup graphs/manifests)
- `SKILL.md` is `host_packaging` / `waived-retire` (not methodology durable)
- No `unmapped` ledger statuses observed

**Residual (non-blocking)**

- Some pack-root basenames still look methodology-like while `references/*` holds methodology_support. Split structure is correct; classification hygiene remains Phase-2 cleanup.

### 3. Terminals source-grounded (asserted vs unasserted) — **UPHELD (residual)**

**Closed vs v1.1**

- Universal success/blocked/failed/partial/null/inconclusive stamp removed
- Per-package asserted/unasserted lists; specialized quest and idea-evaluation vocabularies retained
- Critical outcome DFT rows reference asserted terminals only

**Residual (non-blocking)**

- No per-terminal `source_ref` field
- Occasional thin asserted labels (e.g. literature `selected`) sit under medium confidence, not claimed as high-confidence full freeze

### 4. DFT applicability-filtered; every behavior fixture in matrix — **UPHELD**

**Closed vs v1.1**

- `case_count: 229` (was 256 stamp)
- Packages without stages omit `ordered-stage-progression`
- Stage DFT ids materialize and match inventory stage `differential_cases`
- `DFT-COMP-001/002/003`, `DFT-ctrl-proposal-only`, `DFT-no-skill-payload` present
- `coverage_rule` + `inapplicable_policy: Not listed = inapplicable`
- Sampled all frozen `phase2_fixture_ids` present in matrix

**Residual (non-blocking)**

- Matrix is sometimes a superset of PKG `phase2_fixture_ids` (extra non-critical outcome DFTs). One-way coverage rule still holds.

### 5. Figure / slides / survey explicit optional — **UPHELD**

MAP retained; `default_stage_capability: false`; activation explicit.

### 6. Quest vs quest-admin split — **UPHELD**

`quest_boundary`, divergent authority/terminals, preserve vs translate.

### 7. Improve register for prose gaps — **UPHELD**

IMP-IDEA-* plus IMP-THIN-PROCEDURE-BODIES, IMP-STAGE-FIELD-DEPTH, IMP-NON-PILOT-BEHAVIOR-DEPTH.

### 8. Live planning waiver — **UPHELD**

`WVR-LIVE-PLANNING-OK`; live trials not required for planning; deterministic DFT remains Phase-2 work.

### 9. Procedure support-pack left open — **UPHELD**

No two-file sufficiency claim; packaging decision remains Phase-2 with digest-bound siblings only.

### 10. Privacy — **UPHELD**

Tracked freeze artifacts path/id/abstract only; no private skill bodies observed; COMP-003 forbids private impl import.

### 11. Behavior-depth honesty — **UPHELD**

Non-pilot not claimed as pilot-equivalent behavioral freeze. This is the key fairness condition that converts v1.1 **blocked** into v1.2 **pass** without pretending depth that is not there.

## BLK remediation scorecard

| BLK | v1.1 | v1.2 after counter-refutation |
|-----|------|--------------------------------|
| DURABLE-IO | block | **closed for planning** (residual dual-basename noise) |
| TERMINAL-VOCAB | block | **closed for planning** (residual cite thinness) |
| DFT-ADEQUACY | block | **closed** |
| BEHAVIOR-DEPTH | block | **closed for planning** (honest medium / Phase-2 extract) |

## Predecessor / residual conditions

| Item | Status |
|------|--------|
| figure/slides/survey owner MAP | still closed |
| Live trials waived for planning | still closed |
| Prose novelty/diversity as improve | still closed (IMP-IDEA-*) |
| Independent counter-review | this document |
| Stage field depth | named non-blocking improve (`IMP-STAGE-FIELD-DEPTH`) |
| Non-pilot methodology depth | named non-blocking improve (`IMP-NON-PILOT-BEHAVIOR-DEPTH`) |

## Authorization matrix

| Activity | Authorized on v1.2? |
|----------|---------------------|
| Treat v1.2 as Phase-1 planning freeze pin | **Yes** |
| Phase-2 methodology **implementation planning** pinned to v1.2 digest | **Yes** |
| Phase-2 production Procedure/schema edits | **No** (not by this gate alone) |
| Claim full non-pilot behavioral freeze complete | **No** |
| C01–C10 infrastructure work | Separate family; unaffected |

## Explicit non-claims

- Pass does **not** mean live multi-host behavioral equivalence is proven.
- Pass does **not** mean stage contracts have full field bodies.
- Pass does **not** mean non-pilot packages have pilot-depth dual evidence.
- Pass does **not** authorize undigested sibling methodology files at runtime.

## References

- `counter-review-findings-v1.2.json`
- `coverage-reconciliation-v1.2.json`
- `gate-recommendation-v3.md`
- `evaluation-contract-v1.2.0.md`
- `frozen-migration-target-v1.2.json` / `.sha256`
- `blk-remediation-report.md`
- prior `gate-recommendation-v2.md` (blocked on v1.1)
- F01 `evaluation-rubric.yaml` hard gates
