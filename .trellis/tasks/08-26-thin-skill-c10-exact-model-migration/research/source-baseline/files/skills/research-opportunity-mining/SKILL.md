---
name: research-opportunity-mining
description: Derive evidence-bound research opportunity seeds from existing full-paper notes using method substitution, module modification, input augmentation, scenario transfer, condition stress, and metric redesign. Use explicitly after literature reading and before research ideation; never judges novelty or selects a direction.
disable-model-invocation: true
---

# Research Opportunity Mining

Transform paper-local evidence into atomic opportunity seeds. This is a deliberate optional layer between `$research-literature` and `$research-ideation`; it does not search for new papers, create complete candidates, rank seeds, or select a route.

## Workspace

Use the existing literature workspace. Write `opportunities/<paper-id>.md` and one `opportunity-index.md` beside `register.md`. Never edit the source register, notes, or PDFs. Follow `opportunity-template.md` for both output surfaces.

## Workflow

1. **Lock inputs.** Require the target question, `register.md`, and one or more `status=read` notes. Accept both `Analyst: evidence-backed defects` and legacy `Analyst: defects and unresolved problems`. An abstract-only note yields no deep seed; return it to `$research-literature` for full reading.
2. **Reconstruct the paper.** Extract its inputs, method modules, assumptions, outputs, and evaluation contract from the note. If one required detail is missing, inspect only the relevant section of the local PDF recorded in the note. If unavailable, mark the affected lens `not_assessable`; do not launch a new paper search.
3. **Apply six lenses.** Cover `SUB` method substitution, `MOD` module modification, `INP` input augmentation, `XFR` scenario transfer, `ENV` experimental-condition stress, and `MET` evaluation redesign. Per lens record `seeded`, `no_supported_seed`, or `not_assessable`. Never force a seed.
4. **Write atomic seeds.** Use IDs `O-<paper-id>-<lens>-NN`. Each seed needs an anchored source basis, proposed-mechanism provenance (`paper`, `supplied concept`, or `uncited candidate`), exact transformation, causal rationale, new research question, information/compute delta, required assets, cheapest falsification test, kill condition, and `Novelty status: unknown — requires literature search`.
5. **Merge without judging.** Build `opportunity-index.md`, inventory every seed, and cluster duplicates or complements by seed ID. Do not score, rank, select, remove a source because it overlaps, or convert seeds into `P#`, `B#`, or `C#` items.
6. **Hand off.** Name `$research-ideation` as the next owner and stop. Never invoke it automatically.

Complete when every selected full-paper note has six-lens coverage, every seed traces to an evidence anchor and falsification test, unsupported lenses abstain, the index includes every seed, and no novelty or winner claim appears.

## Lens guards

- `SUB`: name the original bottleneck and why the replacement capability addresses it; keep information and compute comparisons fair.
- `MOD`: require an ablation, observed failure, or explicit assumption that identifies the weak module.
- `INP`: new information must be available at deployment and must not leak labels, solutions, or oracle knowledge.
- `XFR`: the transfer must change a scientific difficulty, not only the application noun.
- `ENV`: the stressor must be reachable through supported use, not merely constructible.
- `MET`: the metric must be capable of changing a conclusion, system ranking, or operational decision.

Methods may come from the paper, supplied synthesis, or a user-provided concept. Record which source applies. An uncited mechanism is labeled `uncited candidate` and remains unverified; never invent a citation from memory.

## Quest boundary

When `research-quest.yaml` governs the project and opportunity artifacts changed, prepare one event, tell the user to invoke `$research-quest-admin` explicitly, then stop. This skill never writes quest state. Formal H1/H2 gates remain owned by `$research-ideation`.
