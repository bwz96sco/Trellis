# Source I/O Contracts

Purpose: make upstream skill file contracts explicit before distillation. Files are best evidence of what happened. Do not distill a research workflow from skill names alone.

Sections describing source systems and earlier local targets are historical distillation evidence. Only the final `## Local Mapping` section defines current runtime contracts.

## Rule For Future Distillation

For every DS/ARIS source skill considered for integration, record:

- source skill path
- expected input files or state surfaces
- expected output files
- portable concepts copied
- source-specific concepts waived
- local target file or explicit reason no target exists

If a source output is a narrative, final report, claim report, status report, or resume packet, map it to a local report artifact or explicitly waive it. Do not replace human-readable reports with YAML-only state.

## DeepScientist I/O

Source basis: installed skill copies under `/Users/zhangbowen/.config/opencode/skills/deepscientist-*`. The older ledger path `/Users/zhangbowen/Projects/NewTools-Research/DeepScientist/src/skills` was not present during this audit.

| Source skill | Main inputs | Main outputs | Portable lesson |
|---|---|---|---|
| `deepscientist-experiment` | selected idea, accepted baseline, metric contract, `PLAN.md`, `CHECKLIST.md`, run logs, baseline artifacts | run dir under `artifacts/experiment/<run_id>/` or quest equivalent, `bash.log`, run artifact, `evaluation_summary`, `claim_update`, `baseline_relation`, `failure_mode`, `next_action` | main run must end with measured outcome and claim route, not only command success |
| `deepscientist-analysis-campaign` | parent claim/result/paper gap/reviewer item, execution envelope, baseline comparison contract, active paper matrix when writing-facing | durable route record, slice outcomes, evidence paths, claim updates, comparability verdict, next route; optional `PLAN.md`/`CHECKLIST.md`; paper matrix/evidence ledger updates when writing-facing | campaign report must aggregate per-slice evidence into stable/fragile findings and route decision |
| `deepscientist-decision` | durable evidence, reports, baseline state, quest docs, recent run artifacts | decision record with verdict, action, reason, evidence paths, next stage; checkpoint memory when route changes | route decisions are artifacts, not chat conclusions |
| `deepscientist-finalize` | `SUMMARY.md`, `status.md`, latest decisions, baseline/run/analysis/writing outputs, claim/evidence ledgers | refreshed `SUMMARY.md`, `status.md`, final report artifact, final decision artifact, final claim ledger, limitations, belief-change log, resume/handoff packet | closure must say supported/partial/failed/open, limitations, recommendation, reopen conditions |
| `deepscientist-write` | paper contract, `paper/selected_outline.json`, `paper/evidence_ledger.json`, `paper/paper_experiment_matrix.*`, refs, result rows | draft/checkpoint/submission bundle, updated evidence ledger/claim map/figure refs | writing is downstream of evidence contract; completed analysis must map back to paper/report rows |
| `deepscientist-review` | paper/draft/research context, experiment inventory, evidence anchors | review report, priority revision plan, experiment inventory/gap plan, novelty matrix | review output is another report artifact with issue to evidence to action mapping |

DeepScientist report fields worth importing:

- executive state
- strongest supported findings
- weaker or partial findings
- important negative results
- limitations and claims intentionally not made
- belief-change log
- package inventory
- final recommendation
- reopen conditions
- resume packet first-read files

## ARIS I/O

Archived inspection source at distillation time: `/Users/zhangbowen/.skill-manager/sources/aris/skills/skills-codex`. Current audits must receive an explicit ARIS mirror path and do not depend on the retired manager layout.

| Source skill | Main inputs | Main outputs | Portable lesson |
|---|---|---|---|
| `research-pipeline` | `RESEARCH_BRIEF.md`, `idea-stage/IDEA_REPORT.md`, experiment outputs, `review-stage/AUTO_REVIEW.md` | `NARRATIVE_REPORT.md`, Research Pipeline Report, optional `NARRATIVE_REPORT.html`, `MANIFEST.md`; may continue to paper workflow | pipeline creates a narrative handoff before paper writing |
| `experiment-bridge` | `refine-logs/EXPERIMENT_PLAN.md`, `refine-logs/EXPERIMENT_TRACKER.md`, `refine-logs/FINAL_PROPOSAL.md`, `idea-stage/IDEA_REPORT.md`, `idea-stage/IDEA_CANDIDATES.md` | `refine-logs/EXPERIMENT_CODE_REVIEW.md`, `refine-logs/EXPERIMENT_RESULTS.md`, updated `refine-logs/EXPERIMENT_TRACKER.md`, optional `EXPERIMENT_LOG.md` | implementation bridge records initial results and tracker state |
| `experiment-queue` | YAML manifest/grid spec, remote/local run identifiers | `queue_state.json`, per-job logs, local `summary.md`, scheduler log | queues need explicit state machine and local summary |
| `analyze-results` | JSON/CSV result files under `figures/`, `results/`, project outputs | raw data table, key findings, suggested next experiments, proposed notes/report updates | result report should include observation, interpretation, implication, next step |
| `experiment-audit` | eval scripts, result files, ground-truth paths, tracker/logs, paper claims, configs | `EXPERIMENT_AUDIT.md`, `EXPERIMENT_AUDIT.json`, printed summary | integrity report checks ground truth, normalization, file existence, dead code, scope, eval type |
| `result-to-claim` | W&B/run data, `EXPERIMENT_LOG.md`, `EXPERIMENT_TRACKER.md`, logs, `docs/research_contract.md`, intended claims | structured verdict, `findings.md`, optional research-wiki experiment/claim pages, trace files | numbers need explicit support, does-not-support, missing-evidence, claim-revision fields |
| `paper-plan` | `NARRATIVE_REPORT.md` or `STORY.md`, `AUTO_REVIEW.md`, experiment results, `IDEA_REPORT.md`, `CLAIMS_FROM_RESULTS.md` | `PAPER_PLAN.md` with claims-evidence matrix, outline, figure plan, citation plan | paper plan consumes narrative report and claim report, not raw ledgers alone |
| `paper-write` | `PAPER_PLAN.md`, `NARRATIVE_REPORT.md`, figures, `.bib` | `paper/` LaTeX tree, section files, filtered refs, compiled output after compile route | narrative report is primary prose source |
| `research-review` | narrative docs, memory/notes, experiment history | self-contained review document, claims matrix, TODO, paper outline if discussed, review traces | critical review must become durable file, not chat only |
| `shared-references/output-manifest.md` | every generated output | `MANIFEST.md` rows | generated artifacts need index/manifest |

ARIS report fields worth importing:

- `NARRATIVE_REPORT.md`: problem, core claim, method summary, key quantitative results, evidence per claim, figure/table inventory, limitations, remaining TODOs
- `EXPERIMENT_AUDIT.md`: overall verdict, integrity status, checks, action items, claim impact
- result-to-claim schema: `what_results_support`, `what_results_dont_support`, `missing_evidence`, `suggested_claim_revision`, `next_experiments_needed`, `confidence`
- Research Pipeline Report: journey summary, implementation, experiments, review rounds, writing handoff, remaining TODOs
- `MANIFEST.md`: timestamp, skill, file, stage, description

## Anti-Autoresearch AIS I/O

Source basis: `/Users/zhangbowen/Projects/NewTools-Research/Anti-Autoresearch` at commit `cadb5cf23cdc7129aa35ed44a96c45029b9ccc06`.

| Source skill | Main inputs | Main outputs | Portable lesson |
|---|---|---|---|
| `skills/ai-style-impressions/SKILL.md` | paper dir or `claims.json`, manuscript/PDF text, source spans, optional cross-model reviewer output | `ai-style-impressions.findings.json`, deterministic AIS findings, trace files | AI-style findings are itemized reviewer-risk impressions with zero verdict weight, high FP risk, no authorship verdict, and handoff to substantive audits when needed |
| `tools/check_ai_style.py` | `claims.json` scope claims | `ai-style-impressions.deterministic.findings.json` | Defensive-hedge detection needs cluster thresholds; one caveat is not a signal |
| `tools/check_presentation.py` | paper text | pipeline-artifact findings | Pipeline-artifact exact-match strings for `de_ai` mode; duplicate-table detection not imported |
| `references/hack-pattern-taxonomy.md` | — | 46 integrity + 2 advisory patterns with signals, fp_cases, severity, min_evidence | Selected author-side coverage imported; forensic framing (observability, severity, adjudicator routing) excluded |

Local mapping:

| Local file | Source concepts |
|---|---|
| `skills/research-writing/references/ai-style-impressions.md` | AIS doctrine, 13-pattern catalog, refusal rules, route-if-substantive table |
| `skills/research-writing/templates/ai-style-impressions.md` | human-facing AIS report with span, location, FP case, suggested repair, route, status |
| `skills/research-writing/scripts/validate_writing_pack.py --strict-ai-style` | structural report gate, forbidden authorship/verdict wording check, pattern ID membership, per-impression field validation |
| `skills/research-writing/references/micro-editing-and-surface-rules.md` | pipeline-artifact exact-match string list for `de_ai` mode |
| `skills/research-writing/references/claim-audit-discipline.md` | 22-pattern author-side claim checklist: numeric/statistical consistency, selected method/scope checks, baseline integrity, and eval/reporting validity |
| `skills/research-writing/references/manuscript-quality-rubric.md` | expanded deceptive-pattern section cross-referencing claim-audit |
| `skills/research-experiment/references/experiment-integrity-audit.md` | artifact integrity checks with false-positive cases (family D) |
| `skills/research-theory/references/proof-audit-taxonomy.md` | false-positive cases for proof issues (family G) |

Coverage status:

| status | source patterns | local route |
|---|---|---|
| explicit rows | family A numeric/statistical consistency, selected family B method/scope checks, family C baseline integrity, family H eval/reporting validity | `claim-audit-discipline.md` |
| specialist notes | family D artifact integrity, family G proof/derivation cases, family F pipeline artifacts | `research-experiment`, `research-theory`, and micro-edit references |
| already covered elsewhere | family E citation integrity and advisory novelty/duplication checks | `citation-audit-discipline.md`, literature routing, and `research-idea-evaluation` novelty/kill criteria |
| single reviewer-side canonical skill | full families A-H, AIS, and ADV memo tracks | `skills/research-review-case/` |
| still deferred | deterministic checker code, adjudicator/report verdict, automatic dispatch, DB/daemon/UI/scheduler/vector/task graph mutation | future v2 only |

Waiver update: this AIS plus author-side integrity pass is no longer the only local target. Reviewer-side v1 now uses the single canonical `research-review-case` skill, but deterministic source tools and adjudicated verdict reports remain out of scope.

## Anti-Autoresearch Reviewer Pack I/O

Source basis: `/Users/zhangbowen/Projects/NewTools-Research/Anti-Autoresearch` at commit `cadb5cf23cdc7129aa35ed44a96c45029b9ccc06`.

| Source surface | Main inputs | Main outputs | Local target | Portable lesson |
|---|---|---|---|---|
| `workflows/anti-autoresearch/SKILL.md` | paper dir, PDF/text/source/repo/result artifacts, claims ledger, auditor outputs | artifact manifest, claims ledger, per-dimension findings, advisory memos, adjudicated report | `research-review-case` | one canonical router owns case state and dimension routing; v1 emits no case-level verdict |
| `skills/evidence-ledger/SKILL.md` | paper/source/repo/result files | `artifact_manifest.json`, `claims.json` | `research-review-case` ledger dimension, `artifact-manifest.json`, `claims-ledger.json` | reviewers need stable relative artifacts and verbatim claim spans before auditing |
| `schemas/claims.schema.json` | source spans and artifact anchors | `claims.json` | `claims-ledger.json`, validator | every finding cites `claim_id` and a span inside that claim |
| `schemas/finding.schema.json` | auditor-specific checks plus ledger | `<skill>.findings.json` | `findings/<dimension>.findings.json`, validator | findings are local, span-anchored, observability-aware review questions |
| `schemas/artifact_manifest.schema.json` | source files and hashes | `artifact_manifest.json` | `artifact-manifest.json`, validator | artifact paths stay relative; observability derives from available evidence |
| `schemas/report.schema.json` | findings plus adjudicator | `report.json`, `REPORT.md` | waived for v1 | local reviewer pack has status, findings, and memos only |
| `skills/consistency-audit/SKILL.md` | ledger numeric/method/scope/stat claims | consistency findings | `research-review-case` consistency dimension | internal self-consistency is checkable at low observability when spans exist |
| `skills/citation-forensics/SKILL.md` | citation claims, bib/source metadata, external lookups | citation findings | `research-review-case` citation dimension | citation support needs existence, metadata, and context evidence |
| `skills/baseline-comparison-audit/SKILL.md` | comparison/SOTA/baseline claims, prior/leaderboard sources | baseline findings | `research-review-case` baseline dimension | comparison fairness and public SOTA claims need explicit source-backed scope |
| `skills/experiment-forensics/SKILL.md` | claims, repo, result files, metric scripts | experiment findings | `research-review-case` experiment dimension | code/result integrity requires level 2 evidence; lower levels record limits |
| `skills/proof-derivation-forensics/SKILL.md` | theorem/proof/derivation claims | proof findings | `research-review-case` proof dimension | proof issues need paired claim/formal-step anchors and assumption discipline |
| `skills/eval-design-forensics/SKILL.md` | evaluation protocol claims, judge/metric/setup descriptions | eval-design findings | `research-review-case` eval-design dimension | leakage, judge validity, and selective reporting are protocol questions |
| `skills/presentation-signals/SKILL.md` | figures, tables, captions, appendix, generated-surface text | presentation findings | `research-review-case` presentation dimension | surface signals are auxiliary unless tied to substantive claims |
| `skills/ai-style-impressions/SKILL.md` | manuscript text and claim spans | AIS findings | `research-review-case` style-impressions dimension | AIS stays zero-verdict and routes substantive issues elsewhere |
| `skills/adversarial-case-builder/SKILL.md` | ledger plus merged findings | adversarial memo | `research-review-case` adversarial dimension | strongest objection is memo-only and evidence-bound |
| `skills/novelty-duplication-advisory/SKILL.md` | contribution claims plus prior work | novelty/duplication memo | `research-review-case` novelty dimension | novelty overlap is advisory until source-backed and human-reviewed |

Local reviewer pack files:

```text
skills/research-review-case/
  references/dimension-adversarial.md
  references/dimension-baseline.md
  references/dimension-citation.md
  references/dimension-consistency.md
  references/dimension-eval-design.md
  references/dimension-experiment.md
  references/dimension-ledger.md
  references/dimension-novelty.md
  references/dimension-presentation.md
  references/dimension-proof.md
  references/dimension-style-impressions.md
  references/finding-contract.md
  references/observability-and-independence.md
  references/pattern-routing.md
  references/hack-pattern-taxonomy.md
  references/adjudicator-gates.md
  templates/finding.json
  scripts/validate_review_case.py
```

Deferred source content (deterministic tool code only; operational concepts and thresholds are ported):

- `tools/adjudicate_findings.py` and adjudicated report schema (gate concepts ported as `adjudicator-gates.md`).
- `tools/build_claim_ledger.py` and `tools/build_manifest.py` (ledger architecture concepts ported).
- `tools/check_numeric_consistency.py`, `tools/check_stat_consistency.py`, `tools/check_presentation.py` (check thresholds and FP discipline ported into dimension references).
- Source eval fixtures, tests, CI, install shell script, docs positioning, and GitHub metadata.

## Supervisor-Skills I/O

Source basis: `/Users/zhangbowen/Projects/NewTools-Research/Supervisor-Skills` at commit `0b77a1b98794f8341d57685a0e829a3fa175d05f`; wave-2 rows below inspected at `aff5de9e5b902df0ef51e955d4c78b22793d763a` (v2.1.0, layout flattened to `skills/`).

| Source surface | Main inputs | Main outputs | Local target | Portable lesson |
|---|---|---|---|---|
| `plugins/phd-research/skills/idea-evaluator/SKILL.md` | draft idea, prior-work context, resources, timeline, capability | first impression, fatal flaws, lifecycle fit, five-dimension scores, paradigm probe, feasibility, verdict | `research-idea-evaluation` selected/rejected idea artifacts | advisor evaluation blocks weak ideas before months of work |
| `plugins/phd-research/skills/tech-paper-template/SKILL.md` | stable idea, background, limitations, key idea/goal, challenges, modules, contributions | thinking template, consistency report, methodology outline | `research-writing/02_paper_outline.md` | skeleton first; challenge-module-contribution alignment before prose |
| `plugins/phd-research/skills/intro-drafter/SKILL.md` | paper skeleton and motivation | six-paragraph Introduction outline, running example, contribution mapping | `research-writing/02_paper_outline.md`, section draft notes | Introduction is auditable flow, not prose polish |
| `plugins/phd-research/skills/benchmark-paper-template/SKILL.md` | benchmark gap, construction approach, evaluation framework, scale, findings | five-pillar audit, six-part Introduction, section skeleton, checklist | `research-writing/02_paper_outline.md`, `03_display_plan.md`, review report; reviewer eval/presentation checks | benchmark papers need evaluation gap, construction pipeline, taxonomy, and actionable findings |
| `plugins/phd-research/skills/pre-submission-reviewer/SKILL.md` | full draft, figures/tables, bibliography, LaTeX/PDF, deadline context | severity-ranked author-side findings and fix list | `research-writing/review_report.md`, `revision_plan.md`, claim/citation/display audits | pre-submission review is author readiness audit, not external verdict |
| `plugins/phd-research/skills/figure-designer/SKILL.md` | figure intent, paper context, target figure type, optional image | figure paradigm, layout sketch, labels/tool choice, universal audit | `research-figure/figure_brief.md`, `figure_catalog.csv`, `caption_audit.md` | core figures have distinct reader jobs and audit rules |
| `plugins/phd-research/skills/drawio-reconstruction/SKILL.md` | reference image(s), output target | `.drawio`, preview PNG, audit file | waived as tool implementation; concept routed to `research-figure` audit | visual comparison is required; semantic approximation is not enough |
| `plugins/phd-research/skills/vibe-research-workflow/SKILL.md` | AI-assisted research session context | workflow plan and integrity reminders | waived | active workflow ownership, user authorization boundaries, and writing-integrity rules already cover the durable lesson |
| `skills/deep-research/SKILL.md` + references (v2.1.0) | topic or research questions, retrieval tools | RQ brief, multi-perspective corpus, taxonomy, survey-grade cited report | `research-survey` workflow consuming `research-literature` evidence packs; search/citation deltas into `research-literature` | survey synthesis is a distinct deliverable genre: RQ loop closure, weaving, taxonomy, hedge calibration, angle gate |
| `skills/paper-writer/SKILL.md` + references (v2.1.0) | claims, evidence files, section targets | evidence-gated section prose, verification report | `research-writing` evidence/citation/section references | graded evidence caps, citation-verification statuses, fabrication red-flag families strengthen existing drafting contract |
| `skills/paper-polish/SKILL.md` + references (v2.1.0) | draft prose, polish scope | meaning-preserving polished prose | `research-writing` phrasebank + micro-editing references | constructive phrasing resources absorbed; detection wordlists waived per local AIS policy |

Local mapping:

| Local file | Source concepts |
|---|---|
| `skills/research-idea-evaluation/references/advisor-idea-evaluation.md` | fatal flaws, lifecycle/capability fit, five-dimension lift scoring, paradigm-shift probe, feasibility risks |
| `skills/research-writing/references/paper-structure-templates.md` | technical/new-problem positioning, thinking table, consistency checks, six-paragraph Introduction, running example |
| `skills/research-writing/references/benchmark-paper-planning.md` | benchmark five pillars, construction pipeline, taxonomy, RQ-driven findings, section skeleton |
| `skills/research-writing/references/pre-submission-author-audit.md` | macro logic, writing detail, grammar/style, LaTeX, figure/table audit for author-side submission readiness |
| `skills/research-figure/references/paper-figure-paradigms.md` | motivated example, solution overview, experimental results figures, visual-fidelity audit |
| `skills/research-review-case/references/dimension-eval-design.md` | benchmark/resource evaluation gap, construction pipeline, taxonomy, findings checks |
| `skills/research-review-case/references/dimension-presentation.md` | running-example drift, pipeline mismatch, missing benchmark comparison surface, caption overreach |

Deferred source content:

- Upstream handbook, case-study prose, images, PDFs, README marketing/community content, changelog, and contribution docs.
- Raw upstream skills as installed local skills; local route remains existing research/review pack.
- Draw.io reconstruction scripts and batch worker protocol; local figure pack already routes editable SVG/illustration work through existing tools.

## Orchestra AI Research Skills Pending Audit

Source basis: `registry/source-audits/orchestra-ai-research-skills-model-training.md` and `.json`, generated from `https://github.com/Orchestra-Research/AI-Research-SKILLs.git` at commit `773a52944ba4747a18bd4ae9ade53fff041adcbc`.

Status: selected v1 model-training review complete. Keep unreviewed Orchestra training-core or training-adjacent records pending until they receive manual source read, local target mapping, package validation, and repository validation.

Local active target: `skills/model-training-workflow/`.

## Local Mapping

Current policy uses compact Markdown artifacts. Source tables above remain evidence of upstream systems; their old local pack paths are not runtime contracts.

| Local owner | Current durable surface | Mechanical gate |
|---|---|---|
| `research-literature` | `register.md`, `notes/<paper-id>.md` | research-skill structural validator |
| `research-opportunity-mining` | `opportunities/<paper-id>.md`, `opportunity-index.md` | research-skill structural validator |
| `research-synthesis` | `synthesis.md` | research-skill structural validator |
| `research-ideation` | `opportunity_board.md`, `h1_decision.md`, `ideas.md`, `h2_decision.md` | `scripts/validate-research-gates.py` |
| `research-idea-evaluation` | `attacks/<candidate-id>.md`, `decision.md` | `scripts/validate-research-gates.py` |
| `research-experiment` | experiment artifacts plus optional `runs.md` | evidence and claim rules in the skill |
| `research-computation`, `research-theory` | bounded computation or proof artifacts | execution/proof status in the skill |
| `research-figure`, `research-slides`, `research-writing` | requested asset, deck, or manuscript surface plus compact audit evidence | real render/build checks in the skill |
| `research-review-case` | anchored case findings plus optional `cases.md` | finding and no-verdict rules in the skill |
| `research-project-setup` | requested workspace changes or diagnosis; optional vault scaffold | state reinspection in the skill |
| `research-quest`, `research-quest-admin` | `research-quest.yaml`, `research-events.jsonl`, `QUEST_STATUS.md` | packaged read/admin helpers |

Human-readable state is required, but no separate HTML report, provenance hash, manifest, numbered evidence pack, registry, queue, or campaign wrapper is required. Write only the surface requested by the user or needed for durable continuation.

Quest-governed ideation keeps two semantic human gates. H1 authorizes stable `P#`/`B#` opportunity IDs before candidate generation; H2 authorizes stable `C#` candidate IDs before explicit evaluation. Human wording is preserved verbatim, and the shared gate validator enforces approval, ID membership, coverage, attack scope, and selected-or-blocked closure.

Existing numbered packs, campaign roots, and HTML reports remain readable historical inputs. Deleted pack validators and report commands are not current interfaces and must not be recommended for new work.

## Distillation Guardrail

Before marking a source skill "distilled":

1. List source input files.
2. List source output files.
3. Mark each output as one of: `state`, `raw_result`, `summary`, `claim`, `report`, `paper`, `review`, `manifest`.
4. For every `summary`, `claim`, `report`, or `review` output, name the local target.
5. If no local target exists, create one or record a waiver with reason.

This prevents future mistake: integrating machine-verifiable state while dropping human-readable understanding.
