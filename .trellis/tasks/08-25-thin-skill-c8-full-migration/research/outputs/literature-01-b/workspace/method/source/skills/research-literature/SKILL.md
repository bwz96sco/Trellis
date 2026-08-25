---
name: research-literature
description: Question-scoped paper register with skeleton reading notes and evidence-grounded critical analysis. Use when collecting or organizing papers for a research question, reading or critically inspecting a paper, finding paper-local methodological weaknesses, or verifying paper identifiers and metadata before citing.
---

# Research Literature

Papers are recorded only against a target question. Reading is skeleton-first: extract the paper's structure — question, gap, field map, method modules, experiments, ablations — before analyzing defects.

## Workspace

One folder per target: `note/<vault>/literature/<topic-slug>/` when the workspace has `note/<vault>/`, else `artifacts/research-literature/<topic-slug>/`. Contains `register.md` and `notes/<paper-id>.md`. PDFs live in a local ignored archive (`note/<vault>/literature/pdfs/` when available), never committed.

## Workflow

1. **Lock the target.** `register.md` opens with the target question, verbatim from the user or project. No question, no register — ask.
2. **Verify before registering.** Every identifier and metadata field goes through `paper-search-cli` before it enters the register. Check the existing register and Zotero first; a paper already noted is reused, not re-read.
3. **Register.** One row per paper: `| id | title | year | status | relevance |`. Status: `candidate` / `skimmed` / `read` / `dropped`. Relevance: one line stating what the paper does for THIS question, not a generic summary.
4. **Read via one clean subagent per paper.** Give the subagent only: the PDF path, the target question, and `note-template.md` from this skill's directory. It reads skeleton-first per the template and returns the completed note. One paper per subagent — a fresh context per read.
5. **Merge.** Save the note to `notes/<paper-id>.md`, update the paper's status and relevance line.

Complete when every registered paper has a status, every read paper has a note with the skeleton and paper-local defect analysis filled, key evidence anchored (section/page/table), and each relevance line answers the target question.

## Rules

- A section with nothing to report says `not found in paper` — one line.
- Keep author-stated limitations, directly observed failures, and analyst-inferred defects distinct. Never present an inference as a demonstrated failure.
- Defect analysis diagnoses what this paper supports. Do not propose replacement methods, module changes, new inputs, transfers, stress conditions, or metrics here; name the exact explicit invocation `$research-opportunity-mining` when that derivative analysis is requested.
- Legacy notes headed `Analyst: defects and unresolved problems` remain valid inputs. New notes use `Analyst: evidence-backed defects`; neither heading establishes that a defect remains globally open.
- Abstract-only access: fill Research question and Gap, mark the note `abstract_only`. arXiv `/abs/` pages count as abstract-only; full reading needs the PDF.
- `zotero-cli` for library ops; NotebookLM optional as a reading index over local PDFs; `smart-search-cli` for non-paper facts only.
- Blocked access or uncertain metadata is reported as such in the note.
- When `research-quest.yaml` governs the project and the register or notes changed, prepare one event, tell the user to invoke `$research-quest-admin` explicitly, then stop; this skill never writes quest state.
