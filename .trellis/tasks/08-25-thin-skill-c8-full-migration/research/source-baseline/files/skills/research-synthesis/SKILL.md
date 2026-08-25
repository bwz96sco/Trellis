---
name: research-synthesis
description: Cross-paper synthesis over an existing research-literature register and notes. Use when combining or comparing findings across read papers, building a taxonomy of a field with judgment, resolving contradictions between papers, or turning per-paper notes into one answer to the target question.
---

# Research Synthesis

Turn a `research-literature` register plus its per-paper notes into one argued answer to the target question. This skill reads notes, never the papers — the notes did that work. Output shape follows the question, not a fixed standard: a two-paper comparison may be a page, a field map may need sections. Add structure only where the material demands it.

## Workspace

`synthesis.md` next to `register.md` in the literature workspace. No other artifacts.

## Workflow

1. **Load.** Read `register.md` and every note — the skeleton sections, relation-to-target judgment, and either `Analyst: evidence-backed defects` or legacy `Analyst: defects and unresolved problems`. Notes are compact by design; hold them all in one context, no subagents. Papers still `candidate` or `skimmed` are out of scope: synthesize what was read, name what wasn't.
2. **Build the taxonomy from the notes' Field maps.** The papers already say how the field categorizes itself — merge those maps into a few axes and assign each read paper to a cell. A paper the axes cannot place is a finding about the axes, not noise to discard.
3. **Write by cell, not by paper.** Each section compares the papers in one cell against each other. Paper-by-paper prose is an annotated bibliography, not synthesis.
4. **Resolve contradictions by condition.** When notes disagree, pull the deciding difference from their Theoretical assumptions and Experiments sections — dataset, scale, assumption, metric. "A holds when Z, B when not Z" is the target; if no condition explains it, say so and name the experiment that would decide.
5. **Harvest corpus gaps.** Empty taxonomy cells and anchored note defects form issues unresolved within the reviewed corpus. A legacy `Still open: yes` field is provisional evidence from that note, not a current global novelty claim.
6. **Answer.** `synthesis.md` opens with the target question verbatim and closes by answering it, with what remains unresolved stated plainly.

Complete when the target question has an explicit answer, every read paper appears in exactly the cells it belongs to, each contradiction carries a deciding condition or a named deciding experiment, and every corpus-level unresolved issue traces to cells or note defects.

## Rules

- Claims trace to notes: cite the paper id and the note's anchor (section/page/table), not memory of the paper.
- A thin corpus is reported as thin — synthesis over two notes does not pretend to survey a field.
- Do not turn gaps into replacement methods, transfers, new inputs, stressors, or metrics. When the user wants those transformations, name the exact explicit invocation `$research-opportunity-mining` and stop after the synthesis requested here.
- When `research-quest.yaml` governs the project and `synthesis.md` changed, prepare one event, tell the user to invoke `$research-quest-admin` explicitly, then stop; this skill never writes quest state.
