---
name: research-writing
description: Write and revise author-side research manuscripts from validated evidence. Use for outlines, section or LaTeX drafting, substantive revision, claim and citation audits, reviewer responses, rebuttals, and submission checks. Referee-side audits belong to research-review-case.
---

# Research Writing

Turn validated literature, experiment, and theory evidence into author-side manuscript text. Every claim stays inside its evidence; missing evidence narrows the claim, routes back to its owner, or blocks visibly.

## Workflow

1. **Lock the surface.** Read the supplied files, the paper repo, and current evidence before asking. Identify the exact requested output — outline, draft, build, audit, revision, or rebuttal — and produce only that.
2. **Establish the evidence boundary.** Which claims, numbers, equations, citations, figures, and reviewer statements are authoritative — from the literature register and notes, experiment artifacts, and theory proofs.
3. **Draft or revise inside it.** Preserve claims, numbers, equations, notation, citations, and qualifiers unless the user or stronger evidence authorizes a change; make material changes explicit. Hedging and transitions follow `references/academic-phrasebank.md`.
4. **Build for real.** When the deliverable touches LaTeX, run the project build and record the actual command, result, and warnings. Never report a build that was not run.
5. **Audit before submission claims.** Verify claim strength, numbers, equations, citation support, display references, and logic on the affected surface. Map each reviewer issue to evidence, manuscript delta, and response delta.

Complete when the requested output is delivered or explicitly blocked, affected claims remain evidence-bound, technical content is preserved or deliberately changed, and missing evidence is visible.

## Rules

- Never invent claims, citations, experiments, figures, proofs, reviewer statements, or successful builds.
- No prose polish that makes an unsupported claim sound stronger; AI-style impressions never become authorship or integrity verdicts.
- No workflow state, ports, or prompt text in manuscript prose.
- Writing artifacts: `note/<vault>/writing/<topic-slug>/` when the workspace has `note/<vault>/`, else `artifacts/research-writing/<topic-slug>/`; LaTeX lives in the paper repo.
- `paper-search-cli` validates DOIs, arXiv IDs, and BibTeX; `zotero-cli` for library ops; `smart-search-cli` for venue rules and non-paper facts; referee-side audits route to `research-review-case`.
- When `research-quest.yaml` governs the project and durable writing artifacts changed, prepare one event, tell the user to invoke `$research-quest-admin` explicitly, then stop; this skill never writes quest state.
