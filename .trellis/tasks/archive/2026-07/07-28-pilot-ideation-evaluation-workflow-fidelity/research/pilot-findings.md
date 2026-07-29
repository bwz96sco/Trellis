# Pilot findings — ideation + evaluation

## Suite oracle

Idea-related unit tests exit code: **0** (0=pass).

## Aggregate score

Weighted mean across required cases: **3.22 / 4.00**.

## Key findings

1. Source methodology is real and test-backed for ownership split, method-flaw gates, and fail-closed closures.
2. Trellis Procedures do not preserve methodology depth — PROCEDURE.md shells are ~1037/1091 bytes vs multi-reference packages.
3. Authority translation is mandatory: select/block → Proposal + root Decision.
4. Partial coverage remains for some diversity/novelty prose-heavy edges.
5. Ideation↔evaluation is a **handoff** with shared contract, not a frozen composition edge.

## Recommendation for F06

- preserve stages, fail-closed closures, ownership split, validator intent
- translate selection to Proposal+Decision; pack storage to Trellis artifacts
- improve thin Trellis procedure bodies
- retire host skill packaging
