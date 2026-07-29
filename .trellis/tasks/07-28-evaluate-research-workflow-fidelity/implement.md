# Implementation plan — evaluation parent (planning/orchestration only)

## Authorization boundary (current)

**Authorized now:** create parent + F01–F07 skeletons and complete planning artifacts; validate with Trellis task tooling; `git diff --check` on planning artifacts.

**Not authorized yet:**

- `task.py start` / child activation
- F01 baseline pin execution, validator runs, pilot fixture execution
- live model/network calls
- production or private-source edits
- commits, archives, publication, push

## Step 0 — Bootstrap (this turn)

1. Create parent `07-28-evaluate-research-workflow-fidelity`.
2. Create children F01–F07 with `--parent` and `--no-start`.
3. Write parent + all children `prd.md`, `design.md`, `implement.md`, `implement.jsonl`, `check.jsonl`.
4. Validate each task; confirm children order and links.
5. `git diff --check` on planning paths only.
6. Stop for independent planning review + explicit F01 activation authorization.

## Step 1 — F01 freeze (needs activation auth)

- Pin source commit, registry of 16 packages, Trellis commit, Procedure inventory.
- Write charter, baselines, privacy policy, rubric, taxonomy, blinding, evidence schema under F01 `research/`.
- Stop if source dirty, registry unreproducible, or privacy unresolved.

## Step 2 — F02 inventory

- Static inventory of all 16 packages into matrices and graphs.
- Hard gate: 16/16 coverage; every output mapped/waived/unresolved; three composition edges; quest vs quest-admin; host packaging ≠ methodology.

## Step 3 — F03 validator assurance

- Requires separate **execution** authorization.
- Isolated fixture copies; double-run; pre/post hashes; mutation catalog; defect classification only.

## Step 4 — F04 pilot

- Coupled ideation (01–04) + evaluation (05–07) case battery.
- Score against F01 rubric; record migration targets for the couple.

## Step 5 — F05 live protocol (parallel-capable after F01)

- Protocol + authorization templates only.
- If no auth: write `live-trial-not-run-decision.md`.
- If auth later: create **new** execution child; do not mutate F05 into an executor.

## Step 6 — F06 synthesis

- Only after F02–F04 deterministic evidence frozen and live evidence sealed or not-run.
- Emit decision ledger, defect/waiver registers, `frozen-migration-target-v1.json` + sha256, phase-2 handoff.

## Step 7 — F07 review + parent gate

- Independent coverage/privacy/integrity review.
- Parent publishes evaluation-index + predecessor-gate-verdict.
- Procedure methodology implementation starts only on **pass** or user acceptance of every named **conditional** item.

## Validation commands (planning phase)

```bash
python3 ./.trellis/scripts/task.py validate 07-28-evaluate-research-workflow-fidelity
for t in freeze inventory audit pilot prepare-optional synthesize review; do
  python3 ./.trellis/scripts/task.py validate "07-28-"*"${t}"* 2>/dev/null || true
done
# exact dirs:
for d in \
  07-28-evaluate-research-workflow-fidelity \
  07-28-freeze-research-workflow-evaluation-contract \
  07-28-inventory-research-workflow-contracts \
  07-28-audit-research-workflow-validator-assurance \
  07-28-pilot-ideation-evaluation-workflow-fidelity \
  07-28-prepare-optional-live-research-workflow-trials \
  07-28-synthesize-research-workflow-migration-target \
  07-28-review-research-workflow-evaluation-gate; do
  python3 ./.trellis/scripts/task.py validate "$d"
done
git diff --check -- .trellis/tasks/07-28-evaluate-research-workflow-fidelity \
  .trellis/tasks/07-28-freeze-research-workflow-evaluation-contract \
  .trellis/tasks/07-28-inventory-research-workflow-contracts \
  .trellis/tasks/07-28-audit-research-workflow-validator-assurance \
  .trellis/tasks/07-28-pilot-ideation-evaluation-workflow-fidelity \
  .trellis/tasks/07-28-prepare-optional-live-research-workflow-trials \
  .trellis/tasks/07-28-synthesize-research-workflow-migration-target \
  .trellis/tasks/07-28-review-research-workflow-evaluation-gate
```

## Rollback

Planning-only: delete the eight task directories if abandoned before activation. No production rollback needed.
