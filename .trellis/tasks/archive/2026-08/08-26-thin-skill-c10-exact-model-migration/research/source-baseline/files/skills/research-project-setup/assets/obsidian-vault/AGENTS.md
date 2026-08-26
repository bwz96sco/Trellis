# Research Vault Instructions

This vault stores literature notes, research logs, and lightweight drafting support. It is not the canonical source for runnable code or final manuscript builds.

## Boundaries

- Code lives in the workspace `code/` repositories.
- Final paper source lives in the workspace `paper/` repositories.
- This vault stores reading notes, experiment control planes, computation packs, figure/slide control packs, ideas, theory control artifacts, writing control artifacts, quest/harness state, and cross-literature synthesis.
- Use `intake/` for trust-ranking existing project state before normal ideation, experiment, writing, or review work resumes.
- Do not invent data or citations. Say when a PDF cannot be read or when a claim is not supported by notes.

## Literature Workflow

- Store Markdown literature notes in `literature/notes/`.
- Store staged literature survey packs in `literature/surveys/<topic-slug>/`.
- Keep paper-derived opportunity analyses beside their target register under `literature/<topic-slug>/opportunities/`, with `opportunity-index.md` at the same target root.
- Do not mix `O#` opportunity seeds with `P#`/`B#` human-gate items or `C#` idea candidates.
- Default policy: Zotero owns metadata/citations only; NotebookLM owns selected paper PDFs for source storage and Q&A.
- Avoid storing PDFs in `literature/pdfs/`, Zotero attachments, ZotMoov, Attanger, or OneDrive unless explicitly requested. Use ignored temporary storage only while uploading/importing selected PDFs into NotebookLM.
- Use `references.bib` as the Zotero/Better BibTeX export for note workflows.
- Do not upload PDFs with `zot attach` or `zot add --pdf` unless explicitly requested.
- Use Pandoc citation syntax `[@citekey]` in drafts and notes.
- Prefer `literature-index.md` for a global overview before reading many individual notes.
- Keep raw paper-search JSON, provider logs, and temporary downloaded PDFs outside the vault or in ignored project storage; record final NotebookLM notebook/source IDs in literature handoffs.

## Writing

- Store staged research-writing control packs in `writing/<topic-slug>/`.
- Keep paper contracts, outlines, claim-evidence maps, display plans, audits, review notes, and handoffs in the vault.
- Keep final LaTeX source, PDFs, build outputs, and paper-specific bibliography in the paper repo unless the project intentionally has no paper repo yet.
- Use concrete citation keys for literature claims.
- Link existing notes with Obsidian wikilinks when useful.
- Keep project-specific links in YAML frontmatter instead of duplicating project folders in the vault.

## Experiments

- Use `experiments/` as the research-experiment control plane.
- Store new experiment packs under `experiments/packs/<topic-slug>/`, not directly beside `campaigns/`, `reports/`, `plans/`, or `campaign_data/`.
- Keep registries, campaign trackers, queues, report trees, and compact campaign evidence under `experiments/`.
- Keep large logs, checkpoints, raw outputs, provider traces, and caches in ignored project run storage such as `runs/experiments/<run-id>/`.

## Computation

- Store staged research-computation control packs in `computation/<topic-slug>/`.
- Keep briefs, environment preflights, execution logs, validation reports, computation node ledgers, and claim handoffs in the vault.
- Keep raw solver outputs, trajectories, large datasets, remote logs, and checkpoints in ignored project run storage.

## Figures And Slides

- Store staged research-figure control packs in `figures/<topic-slug>/`.
- Store staged research-slides control packs in `slides/<topic-slug>/`.
- Keep final paper figures in the paper repo figure directory and final deck files in the project deck output directory unless the project explicitly has no separate output repo.

## Intake

- Store existing-state audits under `intake/<topic-slug>/`.
- Use an intake audit when the project already has baselines, results, drafts, reviews, branches, or old notes and the next stage is not obvious.
- Goal is to recover one trustworthy state, not to re-audit forever. Do not rerun expensive work just because files exist; first decide whether a trust gap actually requires rerunning.
- Trust-rank assets as trusted, usable_with_verification, reference_only, stale_or_conflicting, or missing_context.
- Rank manuscript visibility as main_text_candidate, appendix_or_reproducibility, comparator_or_negative_evidence, reference_only, or internal_only.
- Classify overall intake state: baseline_ready, main_result_ready, draft_ready, review_ready, or unclear_state.
- Keep the current-board packet small: current mainline, incumbent, decisive result, active blocker, stale routes, next decision scope, and recommended next owner.
- Separate control or workflow artifacts from manuscript-content evidence. Do not import old results or drafts as paper-facing evidence until provenance, metric contract, and comparability are clear.

## Theory

- Store staged research-theory control packs in `theory/<topic-slug>/`.
- Keep theorem contracts, normalized statements, proof plans, obligation ledgers, proof audits, counterexample logs, and handoffs in the vault.
- Keep final theorem/proof LaTeX in the paper repo unless the project intentionally has no paper repo yet.
- Label assumptions, conjectures, proven claims, weakened claims, and blockers explicitly.

## Ideation

- Keep staged research-ideation outputs under `ideas/<topic-slug>/`.
- Store durable Markdown decisions, claim summaries, and citations in the vault.
- Keep raw fetched pages, search JSON, provider logs, PDFs, and run outputs in ignored external storage.

## Quest

- Keep project status under `_quest/` when multi-session research tracking is active.
- Keep route, next action, blockers, and milestone events under `_quest/`; do not create separate harness boards.

## Graphify

- Use Graphify as an optional map for literature notes, experiment notes, computation packs, figure/slide plans, theory packs, writing plans, ideas, quest status, and vault-local reference rules.
- The scan scope is controlled by `.graphifyignore`; it deliberately excludes PDFs, Zotero `references.bib`, Obsidian state, Git state, and Graphify outputs.
- Prefer running Graphify manually after meaningful note changes:

```bash
graphify extract . --no-cluster
graphify cluster-only . --no-viz
```

- Read `graphify-out/GRAPH_REPORT.md` before broad cross-note synthesis when it exists, then inspect the specific source notes behind any important claim.
