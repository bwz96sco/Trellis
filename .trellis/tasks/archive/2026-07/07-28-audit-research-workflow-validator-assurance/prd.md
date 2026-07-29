# F03 Audit research workflow validator assurance

## Goal

Inventory source validators and fixtures; after **separate execution authorization**, run each source validator unchanged against frozen isolated fixture copies; measure fail-closed behavior and classify defects without fixing source.

## Predecessor gate

- F01 freeze complete.
- F02 inventory complete enough to list validator entrypoints (or F03 may start inventory of validators in parallel with F02 **only** for static inventory files; execution runs after F02 validator entrypoints frozen).
- Separate **execution** authorization for validator runs (distinct from F01/F02 activation).

## Deliverables (`research/`)

- `validator-inventory.csv` and `validator-inventory.json`
- `fixture-manifest.json`
- `mutation-catalog.json`
- `deterministic-run-ledger.jsonl`
- `validator-assurance-report.md`

## Per-validator records

- owner, dependencies, invocation, inputs, outputs, exit codes, diagnostics
- rules enforced in code vs prose-only
- positive/negative fixture coverage
- provenance, authority, closure, stable-ID, handoff checks
- fail-open/fail-closed, repeatability, environment dependencies, input mutation

## Execution requirements (after auth)

1. Isolated fixture copies only; never mutate source tree.
2. Each deterministic fixture run ≥ twice.
3. Hash fixtures before and after every run.
4. Include invalid mutations: missing evidence, provenance drift, ID drift, illegal authority, invalid closure/composition, malformed handoffs.
5. Classify false accepts/rejects, nondeterminism, mutation, ambiguous diagnostics as **source defects**—do not fix in this task.

## Hard result gate

- Valid fixtures accepted **100%**
- Critical invalid fixtures rejected **100%**
- No source or fixture mutation
- Any miss → explicit improve or unresolved evidence for F06

## Out of Scope

- Fixing validators or fixtures in private source
- Live model trials
- Production Trellis validator implementation
