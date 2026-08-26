# Optional Graphify Setup

Use Graphify for cross-note synthesis, not as a replacement for GitNexus/ABCoder in code repositories.

1. Install with `uv tool install graphifyy` if missing.
2. Whitelist durable Markdown paths in `.graphifyignore`: `AGENTS.md`, `literature-index.md`, `_references/`, `_templates/`, `_quest/`, `literature/notes/`, `literature/surveys/`, `experiments/`, `computation/`, `figures/`, `slides/`, `intake/`, `writing/`, `theory/`, and `ideas/`.
3. Exclude PDFs, `references.bib`, `.obsidian/`, `.git/`, `.trash/`, and `graphify-out/`.
4. Keep execution manual unless the user asks for hooks or platform integration.
5. Ignore Graphify cache, cost, and manifest files. Tracking `graphify-out/GRAPH_REPORT.md`, `graph.json`, or `graph.html` is optional for private repositories.
6. Run `graphify extract . --no-cluster`, then `graphify cluster-only . --no-viz`.
