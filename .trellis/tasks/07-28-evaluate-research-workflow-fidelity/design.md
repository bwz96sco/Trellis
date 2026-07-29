# Technical design — research workflow fidelity evaluation

## Boundary

This parent is an **evaluation and target-freeze** program, not a production migration. Trellis task artifacts under `.trellis/tasks/07-28-*` store abstract contracts, hashes, matrices, dispositions, and gate verdicts. Private methodology bodies remain in `agent-skills-private` and are never copied into Trellis.

```text
read-only source family (16 research-* packages)
        |
        v
F01 freeze governance + baselines + privacy + rubric
        |
        +--> F02 inventory contracts (static)
        |
        +--> F03 validator assurance (needs exec auth)
        |
        +--> F04 ideation/evaluation deep pilot
        |
        +--> F05 live trial protocol only (optional parallel after F01)
        |
        v
F06 synthesize frozen-migration-target-v1 + digests
        |
        v
F07 independent review -> parent gate verdict
        |
        v
(phase-2 successor, out of scope) Procedure methodology implementation
  + differential validation vs frozen-migration-target-v1.sha256
```

## Separation from C01–C10

| Family | Owns |
|--------|------|
| `07-23-replace-research-skills-with-trellis-procedures` (C01–C10) | Control-plane: capability, Procedure packaging, activation, workers, skill retirement |
| `07-28-evaluate-research-workflow-fidelity` (F01–F07) | Methodology fidelity evaluation + migration target freeze |

Neither family modifies the other's task tree. C08–C10 reconciliation is an external infrastructure condition, not a child of this parent.

## Evidence model

Opaque evidence IDs (stable once issued):

| Prefix | Meaning |
|--------|---------|
| SRC-* | Source contract / file hash / registry pin |
| VAL-* | Validator run or rule observation |
| FIX-* | Fixture (positive or mutation) |
| RUN-* | Evaluation run / pilot cell |
| REV-* | Reviewer judgment / adjudication |

Tracked Trellis content may cite IDs, relative source paths, SHA-256, abstract field names, aggregate scores, and short approved excerpts only.

## Privacy model

- Source repo dirty-tree stop gate (F01).
- No private Skill body, validator source, tests, prompts, raw cases, raw model output in Trellis.
- Live trial raw prompts/outputs/traces live only in operator-approved **private evidence directory** outside both repos.
- Privacy audit in F07 is a hard gate for pass verdict.

## Disposition model (F06)

Exactly one per behavior:

- **preserve** — keep observable methodology.
- **translate** — keep intent; replace host/storage/authority mechanics (e.g. skill select → Proposal + root Decision).
- **improve** — deliberate fix of demonstrated source defect.
- **retire** — omit obsolete/harmful/unsupported.
- **unresolved** — block migration pending owner decision or more evidence.

Every omitted or materially changed behavior requires an explicit **waiver** with rationale, fidelity/safety impact, compensating control, owner/approver, review trigger.

## Trellis authority translation invariant

Source workflows that “select” or “mutate quest” map to Trellis as:

```text
worker Result + pending Proposal
  -> root Decision / quest-admin owner
```

Never direct worker canonical mutation. F04 and F06 must record this translation for every selection/mutation-like behavior.

## Bias controls

- Freeze snapshot, cases, rubric, thresholds, reviewers, budgets before scoring.
- Synthetic/approved holdouts for live trials—not source validator fixtures.
- Blind condition identity and package names from reviewers.
- Case authors do not sole-review their cases.
- At most one bounded adjudication round.
- No post-launch prompt tuning, favorable reruns, or threshold relaxation.

## Parent deliverables (after F07)

- `research/evaluation-index.json` — index of all child artifacts, digests, evidence ID ranges.
- `research/predecessor-gate-verdict.md` — pass | conditional | blocked with named conditions.
