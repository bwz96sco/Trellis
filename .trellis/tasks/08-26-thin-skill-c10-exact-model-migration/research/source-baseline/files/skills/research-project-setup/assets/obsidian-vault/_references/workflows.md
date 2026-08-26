# Workflow Prompts

## Literature Summary

Use `literature-index.md` to identify relevant notes, then read the specific notes needed for the question. Write a concise synthesis with `[@citekey]` citations for claims.

## Parameter Comparison

Read notes whose YAML fields match the requested method, benchmark, dataset, or metric. Produce a comparison table with concrete settings, measured values, and caveats.

## Critical Review

Read the target note and related notes. Check whether the experimental design has missing controls, unsupported conclusions, weak baselines, insufficient sample size, or mismatches with prior evidence.

## Existing Project Intake

Read `intake/<topic-slug>/state_audit.md`, `current_board_packet.md`, and `recommended_next_step.md` when they exist. Continue from trusted assets and the recommended next owner instead of restarting the project from zero. If the recommended next owner is review or revision, route to research-writing review or rebuttal rather than restarting ideation or experiments.

## Paper Writing

Read `writing/<topic-slug>/01_writing_contract.md`, `02_paper_outline.md`, `claim_evidence_map.csv`, and `03_display_plan.md`. Draft or revise only claims that point to durable evidence or verified citations.

## Experiment Campaigns

Read `experiments/experiment_registry.yaml`, active `experiments/campaigns/<campaign>.yaml`, `experiments/plans/<campaign>_queue.yaml`, and `experiments/reports/<campaign>/index.html` before changing experiment state. Existing Markdown-only campaigns keep their legacy entry point. New packs belong under `experiments/packs/<topic-slug>/`.

## Computation Evidence

Read `computation/<topic-slug>/evidence/01_computation_brief.md`, `03_execution_log.md`, `04_validation_report.md`, and `05_claim_handoff.md` before using computation results as research evidence.

## Figures And Slides

Read `figures/<topic-slug>/figure_catalog.csv` and `figure_handoff.md` before reusing paper figures. Read `slides/<topic-slug>/slide_outline.md`, `slide_asset_map.csv`, and `deck_route.md` before producing or auditing a deck.

## Theory Proof Work

Read `theory/<topic-slug>/01_theory_contract.md`, `02_statement_normalization.md`, `03_proof_plan.md`, `proof_obligation_ledger.csv`, and `05_proof_audit.md`. Draft or revise theorem claims only when assumptions, quantifiers, obligations, and blockers are explicit.

## Weekly Progress Summary

Read recently modified files under `_quest/`, `experiments/`, `computation/`, `figures/`, `slides/`, `ideas/`, `theory/`, and `writing/`. Summarize completed work, open problems, key findings, and next-week actions.
