# Opportunity mining templates

Use one per-paper analysis and one index. Preserve evidence wording; proposed transformations belong only in these derivative files.

## Per-paper file

```markdown
# Opportunity analysis: <paper-id>

Target question: <verbatim target>
Source note: <path>
Source PDF: <path | unavailable>
Evidence access: note_only | note_plus_pdf

## Baseline snapshot

- Inputs and available information:
- Method and load-bearing modules:
- Output or central claim:
- Assumptions:
- Evaluation contract:

## Lens coverage

| Lens | Outcome | Evidence or reason |
| --- | --- | --- |
| SUB — method substitution | seeded / no_supported_seed / not_assessable | <anchor or reason> |
| MOD — module modification | seeded / no_supported_seed / not_assessable | <anchor or reason> |
| INP — input augmentation | seeded / no_supported_seed / not_assessable | <anchor or reason> |
| XFR — scenario transfer | seeded / no_supported_seed / not_assessable | <anchor or reason> |
| ENV — condition stress | seeded / no_supported_seed / not_assessable | <anchor or reason> |
| MET — metric redesign | seeded / no_supported_seed / not_assessable | <anchor or reason> |

## O-<paper-id>-<lens>-NN: <short seed title>

- Source paper and note:
- Lens:
- Source basis: author-stated | observed failure | analyst inference | paper property
- Evidence anchor:
- Original mechanism or claim:
- Limitation or assumption:
- Proposed mechanism provenance: paper | supplied concept | uncited candidate
- Proposed change:
- Causal rationale:
- New research question:
- Information and compute delta:
- Required data or code:
- Cheapest falsification test:
- Kill condition:
- Novelty status: unknown — requires literature search
```

Repeat the seed card only for supported seeds. A lens with no card remains visible in the coverage table.

## Index file

```markdown
# Opportunity Index

Target question: <verbatim target>

## Paper coverage

| Paper | Analysis status | Seed count | Missing evidence |
| --- | --- | ---: | --- |

## Seed inventory

| Seed ID | Paper | Lens | Underlying problem | Proposed change | Evidence basis | Cheapest probe |
| --- | --- | --- | --- | --- | --- | --- |

## Related seeds

- <cluster name>: <seed IDs and relationship; no ranking>

## Handoff

Next owner: `$research-ideation`
Novelty and selection: not assessed
```
