# Trellis research workflow V1

## Goal

Add a research-native control plane to Trellis for multi-repository projects while preserving existing engineering Tasks, native workflows, Channels, hooks, and memory behavior.

## Requirements

- Root workspace owns research state and routes bounded work into registered child repositories.
- Model Quest, Campaign, Run, Evidence, and Claim as research entities.
- Store machine lifecycle in a strict append-only ledger with deterministic tracked projections.
- Keep detailed scientific content in stage-owner artifacts; store compact pointers and digests in research state.
- Require root review before worker proposals mutate canonical research state.
- Keep child Git histories independent; full Trellis installation in child repos remains optional.
- Provide portable repository locators; never commit machine-local absolute paths.
- Keep Trellis Task optional and linked only through `task.json.meta.research`.
- Add managed bundled `research` workflow through existing `--workflow` mechanism.
- Add small stage-owner skills and narrow Claude Code dispatch/orientation hooks.
- Keep Mempal optional semantic memory and `trellis mem` raw-history fallback.
- Preserve existing native/custom/marketplace workflow ownership and update behavior.
- V1 automatic root-to-child routing supports Claude Code; core and CLI stay platform-neutral.

## Child task map

1. `07-17-research-core-store` — entity schemas, ledger, reducer, projections, core export.
2. `07-17-research-lifecycle-cli` — lifecycle commands and validation/rebuild UX.
3. `07-17-research-repositories-dispatch` — portable repositories, dispatch, proposals, root apply.
4. `07-17-managed-research-workflow` — bundled workflow selection/hash/update contract.
5. `07-17-research-task-session-integration` — optional Task links and `current_run` pointer safety.
6. `07-17-research-skills-claude-hooks` — stage skills, worker card, compact hooks.
7. `07-17-research-specs-e2e` — specs, compatibility guidance, full integration proof.

## Constraints

- No scheduler, UI, remote execution service, automatic commits, automatic scientific judge, or mandatory Channel runtime.
- No broad `Stop`, `SessionEnd`, `PostToolUse`, or per-write research hooks.
- No automatic Mempal writes or knowledge lifecycle changes.
- No automatic migration/move of existing research notes.
- No public raw-event append bypass.
- Run GitNexus impact analysis before editing existing symbols; warn before HIGH/CRITICAL changes.

## Accepted V1 Deferrals

The shipped V1 contracts intentionally defer Claim reopening, Quest blocker/final-synthesis completion gates, Campaign relaunch or supersession, richer Run/Evidence/Claim scientific fields, direct Mempal references and automatic semantic projection, convenience lifecycle aliases, generated `brief.md`/`protocol.md`/`verdict.md`/`notes.md`, and shared Channel/research lock extraction. These require separate high-impact work and are not implied by the V1 end-to-end proof.

## Acceptance Criteria

- [x] Fresh root workspace can initialize and select bundled research workflow.
- [x] Quest → Campaign → Run → Evidence → Claim lifecycle is valid, durable, and Git-reviewable.
- [x] Malformed ledger data fails closed; projections rebuild deterministically after failure.
- [x] Root can dispatch into independent child repos without child Trellis installation.
- [x] Worker Result/Proposal cannot mutate canonical state until explicit root apply.
- [x] Tracked research files contain no absolute machine paths.
- [x] Optional Task links do not alter engineering phase/status semantics.
- [x] Clearing/archiving a Task preserves active `current_run`.
- [x] Native and custom/marketplace workflow behavior remains compatible.
- [x] Research hooks remain silent when state is unchanged and inject bounded pointers only.
- [x] Core/CLI work without Mempal.
- [x] Full unit, integration, template, Python hook, lint, typecheck, build, and end-to-end checks pass.
- [x] GitNexus `detect_changes` shows only expected symbols and execution flows.

Final verification passed: the complete CLI suite reports 1477/1477 tests, the complete core suite reports 368 passed with 1 skipped, and lint, Python analysis, typecheck, build, end-to-end, template parity, path-leak, and diff checks pass. The GitNexus comparison remains HIGH because all seven V1 slices are intentionally uncommitted relative to `HEAD`; affected flows remain confined to expected research command, initialization, reduction, rendering, hook, and workflow-update paths. Standalone docs-site package checks remain dependency-blocked by an unavailable `@commitlint/cli@20.4.0` tarball; focused MDX formatting, Markdown lint, JSON navigation, bilingual symmetry, and docs diff checks pass.
