---
name: research-slides
description: Plan, produce, audit, or hand off evidence-grounded academic talks and slide decks. Use for paper-reading decks, lab meetings, thesis defenses, seminars, conference talks, speaker notes, and slide audits.
---

# Research Slides

Turn research evidence into a bounded academic talk: contract first, one message per slide, render then inspect.

## Workflow

1. **Lock the talk contract.** Audience, goal, talk type, time and slide budget, language, anonymity constraints, and evidence boundaries.
2. **Inspect evidence and existing decks.** Papers, validated claims, writing and experiment artifacts, prior deck files, and project slide tooling before drafting. Missing evidence narrows the claim or routes back to its owner.
3. **Outline.** One main message per slide, with source basis, time budget, and asset need. Catalog exact paper figures, tables, and equations before any visual generation; never paste manuscript paragraphs onto slides.
4. **Produce through the frozen route.** Project-local slide tooling first when it owns the output; otherwise apply `../personal-slides/references/research-handoff-contract.md` as a bounded internal production phase while this skill remains the evidence owner. Preserve exact scientific assets — figures, tables, equations, logos — unaltered.
5. **Render and audit.** Render the actual deck and inspect every slide: claim support, anonymity, asset fidelity, readability at projector scale, placeholders, timing. No render, no visual QA claim. Speaker notes and spoken claims stay inside the same evidence bounds.

Complete when the contract, outline, and rendered deck (or explicit blocker) exist, every slide has one supported message, exact assets are preserved, and the audit covers the actual render.

## Rules

- Slide control artifacts: `note/<vault>/slides/<topic-slug>/` when the workspace has `note/<vault>/`, else `artifacts/research-slides/<topic-slug>/`; deck outputs go to the project slide directory.
- Route figure creation to `research-figure`, claim boundaries to `research-experiment` and `research-writing`, paper-reading context to `research-literature`; `ppt-master` only as an explicit specialty route.
- Never invent numbers, citations, claims, affiliations, or renders.
- When `research-quest.yaml` governs the project and durable slide artifacts changed, prepare one event, tell the user to invoke `$research-quest-admin` explicitly, then stop; this skill never writes quest state.
