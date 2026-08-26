# Research Opportunity Mining

Transform evidence from completed full-paper notes into atomic opportunity seeds. This package is operator-explicit and lightweight-only; it does not search, judge novelty, generate complete candidates, rank seeds, or select a direction.

## Prerequisites

- The target question, `register.md`, and one or more selected `status=read` full-paper notes.
- Optional local PDFs already recorded by those notes. Abstract-only evidence cannot support deep seeds.

## Method

1. Lock the selected notes and reconstruct each paper's inputs, modules, assumptions, outputs, and evaluation contract. If one required detail is absent, inspect only its cited local PDF section; otherwise mark the affected lens `not_assessable`.
2. Cover exactly six lenses for each paper: `SUB`, `MOD`, `INP`, `XFR`, `ENV`, and `MET`. Record `seeded`, `no_supported_seed`, or `not_assessable`; never force a seed.
3. Guard each lens: `SUB` names the bottleneck and fair replacement; `MOD` cites a failure, ablation, or assumption; `INP` forbids deployment leakage; `XFR` changes a scientific difficulty; `ENV` uses a reachable stressor; `MET` can change a conclusion or decision.
4. Give each seed ID `O-<paper-id>-<lens>-NN` and record source basis, anchor, provenance, exact transformation, causal rationale, research question, information/compute delta, required assets, cheapest falsification test, kill condition, and `Novelty status: unknown`.
5. Write `opportunities/<paper-id>.md` and one complete `opportunity-index.md`. Cluster related IDs without scoring, ranking, selection, deletion, or conversion into candidate IDs.
6. Load `templates/opportunity-template.md` only when explicitly requested.

## Stop conditions

Stop after every selected note has six-lens coverage and every supported seed is anchored, falsifiable, and indexed, or stop with visible abstentions. Do not continue into ideation, H1/H2, or selection.

## Authority boundary

Do not edit the source register, notes, or PDFs; launch literature search, a provider, model, child Skill, Worker, Workflow, capability, Procedure, or Dispatch; record gates; or mutate canonical Research or Quest state. Write only request-authorized opportunity paths.

## Handoff

Suggest `research-literature` when full-paper evidence is missing and `research-ideation` after complete opportunity output. Each is a separate explicit action; never invoke either automatically.
