# Add Research Quest Cutover

## Goal

Make Trellis the sole canonical writer for an imported Research Quest while preserving exact source compatibility and a verified path back to source ownership.

User value: existing Quest YAML/JSONL can move into durable Trellis state without silent data loss, dual writers, inferred scientific decisions, or irreversible lock-in. Operators preview every mapping, explicitly accept cutover, keep source validation available, and can roll back only through a validated export plus explicit writer transfer.

## Background

- C1 froze the authenticated source baseline and exact Quest field-mapping/single-writer contracts. C4b consumes `.trellis/tasks/08-21-thin-skill-c1-freeze-contracts/research/source-baseline/files/` and `manifest.json`; it must not read mutable ambient source bytes.
- C4 implemented append-only H1/H2 records and deliberately deferred candidate/opportunity universe membership and coverage until canonical Quest import could define that universe.
- Current Core Quest state contains coarse Quest fields, ArtifactRefs, Claims, Workflow state, and scientific-gate state. C4b adds import, route, scientific-universe, milestone, and writer-authority state beside those existing entities rather than replacing them.
- Before cutover, source Quest files are authoritative. After cutover, Trellis ledger is authoritative and source files are compatibility input/read-only projection.

## Requirements

### R1 — Exact preview-first source import

- Add deterministic import for supported `research-quest.yaml` schema-0.2 plus supported legacy aliases and optional reviewed `research-events.jsonl`.
- No mutation flag or `--dry-run` previews by default. Only `--write` may append canonical state.
- Preview returns:
  - exact YAML and optional JSONL SHA-256 digests;
  - resolved Trellis Quest identity or proposed new Quest identity;
  - source-to-canonical field mapping;
  - ordered Artifact/Claim/route/milestone plan;
  - candidate/opportunity universe plan;
  - blocking conflicts with exact source field/path/line where available;
  - namespaced preserved extensions;
  - source-compatible export-loss report;
  - one opaque preview token bound to all validated inputs and planned output.
- Import write requires that exact preview token. It rereads source bytes, recomputes the complete plan, and refuses if bytes or semantics differ.
- Same-token replay succeeds only when the exact canonical import batch already exists. Another command family, source, Quest, mapping, or event batch owning the token is an idempotency conflict.
- Preview, replay classification, validation failure, and source-drift failure write no ledger, projection, lock, cache, runtime, authority, or source file.

### R2 — Frozen source mapping with no guessing

Apply the exact mapping already frozen in `.trellis/spec/core/backend/research-state.md`:

- source identity/schema/digests -> immutable import record;
- `title`, `objective`, status, and active stage -> existing Quest fields plus preserved source scalars;
- `first_read`, authoritative artifacts, legacy evidence, branch artifacts, claim evidence, decision evidence, and structured next-action artifacts -> contained owned ArtifactRefs;
- authoritative owner bindings, branches, open questions, blockers, current decision, structured next action, scalar legacy next-action text, and legacy board -> canonical Quest route state;
- claims -> typed Claims plus namespaced source-only fields;
- reviewed JSONL records -> ordered imported milestone events;
- unknown non-authoritative extensions -> namespaced preservation only.

Rules:

- source `quest_id` and `project_slug` remain source identity metadata and never become Trellis IDs;
- owner, status, stage, branch, evidence, event, and path values are never inferred;
- scalar legacy `next_action` is preserved verbatim but cannot become writable routing authority without explicit operator owner input;
- unknown extensions cannot control routing, ownership, gates, Workflow transitions, or writer authority;
- no source field is silently dropped.

Blocking conflicts include missing/unknown owner, unknown status/stage, competing active owners, malformed or duplicate reviewed events, unreviewed events, unknown authoritative event types, unsupported authoritative values/types, invalid branch/evidence bindings, escaping/malformed paths, and writable use of ownerless scalar legacy next action.

### R3 — Canonical scientific universe and C4 gate completion

- Import explicit source-validated stable opportunity/candidate IDs into append-only scientific-universe snapshots:
  - H1 uses opportunity refs;
  - H2 uses candidate refs.
- Universe refs remain exact nonempty trimmed stable-ID strings in source order. Duplicate refs or heuristic IDs are forbidden.
- Universe extraction may use only explicit structures recognized by the frozen C1 source contract and validators. Markdown headings, file names, array positions, or generated labels cannot fabricate IDs.
- Each universe snapshot binds Quest, gate ID, ordered refs, source Artifact refs, source snapshot digest, and import record.
- If source state contains an H1/H2 decision but lacks an explicit complete universe, import reports a blocking conflict rather than treating selected refs as the universe.
- Once a Quest has a canonical universe for a gate:
  - every newly recorded approved/rejected ref must belong to the current universe;
  - approved plus rejected refs must cover the current universe exactly once;
  - a gate record older than the current universe snapshot cannot satisfy a transition;
  - imported existing effective gates that are out of-universe, incomplete, or older than imported universe state are reported as conflicts and require an explicit new gate record.
- C4 gate records remain unchanged and append-only. C4b adds membership/coverage validation and stale-universe satisfaction checks; it does not automate scientific judgment.

### R4 — Canonical route, milestones, and preserved source state

- Add typed import/route/milestone state without duplicating existing coarse Quest, Claim, Artifact, Workflow, Approval, or Decision authority.
- `current_decision` remains source route compatibility state. It does not become operational Approval or a Trellis Proposal Decision.
- Imported milestones preserve source event ID, source order, timestamp, actor, reviewed status, recognized payload, bound refs, and namespaced extensions.
- Source-only state is immutable per import record. Later imports append a new import snapshot and route/universe/milestone changes; they do not rewrite old records.
- Deterministic rebuild reproduces identical import, route, universe, milestone, and writer projections.

### R5 — Explicit single-writer cutover

- Add canonical `QuestWriterAuthority` state with exactly one effective writer: `source` or `trellis`.
- Import preview does not change writer. Import write to a new or source-owned Quest includes one explicit transfer to Trellis in the same canonical batch.
- Before any Trellis-authority batch is appended, create a fail-closed cutover fence visible to the source-admin guard. The fence only denies source writes; it cannot grant Trellis authority.
- After ledger commit, write and verify committed writer projection, then remove the fence. Failure after fence creation leaves source mutation denied until deterministic projection rebuild/recovery completes.
- Source `research-quest-admin` must consult the cutover fence and committed writer projection before opening any target for write or creating/replacing files. `TRELLIS_RESEARCH_ROOT`, when set, takes precedence over ancestor discovery and must resolve a valid Trellis Research control root whose Repository authority matches the source; when unset, ancestor discovery remains supported, while a potentially imported sibling-root layout fails closed rather than assuming an unknown writer.
- When effective writer is `trellis`, every source mutating path—including init, migrate, write-status, and append-event write paths—refuses before filesystem mutation. Read-only validation/status remains available.
- CLI text, preview tokens, export files, loss reports, or uncommitted sidecars never grant writer authority.
- Missing or ambiguous authority matches fail closed for an already imported/cutover source identity.

### R6 — Source-compatible export

- Export reconstructs supported schema-0.2 YAML, optional reviewed JSONL, and explicit machine-readable/human-readable loss report from canonical Quest, route, Claim, Artifact, milestone, scientific-universe, and preserved extension state. That control-output set (with JSONL present when reviewed milestones exist), plus every canonical source Artifact referenced by the YAML/JSONL or required by frozen H1/H2 validation, forms the complete normalized source-relative exact-byte export inventory.
- Export preserves source IDs, owner-qualified refs, exact preserved scalars, stable ordering where semantically meaningful, and unknown non-authoritative extensions.
- Export preview writes nothing. Export write requires a nonexistent target or target with no differing colliding output paths; C4b adds no implicit overwrite behavior. A complete existing target with exact planned paths/bytes may be authenticated as read-only replay/recovery input.
- Written output must pass frozen source validators and mapped-content comparison before being reported as validated.
- Export creates an immutable export digest covering all output bytes plus loss report.
- Export never changes writer authority.

### R7 — Explicit verified writer transfer and rollback

Command surface:

```text
trellis research quest import --source <research-quest.yaml> \
  [--events <research-events.jsonl>] [--preview-token <token>] \
  [--dry-run] [--write] [--json]

trellis research quest export --quest <id> --target <directory> \
  [--dry-run] [--write] [--json]

trellis research quest transfer-writer --quest <id> --to <trellis|source> \
  --rationale <text> --export-digest <sha256> \
  [--dry-run] [--write] [--json]
```

- Transfer preview is default; explicit `--write` is required.
- Transfer to source requires a validated current export digest whose mapped content equals current canonical Quest state.
- Transfer to Trellis requires a successful canonical import record matching current source snapshot. For initial import, transfer is part of the import batch; standalone transfer handles an already imported source-owned Quest. Because the frozen command signature always requires `--export-digest`, this direction requires that value to equal the import record's source snapshot digest; the option is compatibility syntax and does not turn source input into export evidence.
- Transfer records actor/provenance, rationale, prior writer, next writer, source snapshot digest, validated export digest when required, and timestamp.
- Transfer to same writer is replay/no-op only when exact authority evidence matches; otherwise it fails.
- Rollback order is fixed: export -> validate -> compare -> explicit transfer event -> committed projection update -> source writes resume.
- Trellis and source must never accept writes concurrently.

### R8 — Compatibility and boundaries

- Historical Research schema-v1/v2/v3 events and C4 gate records remain readable without byte rewriting.
- Add only typed schema-v3 Quest-cutover event kinds, reducers, store mutations, projections, and CLI commands. Generic raw ledger append remains forbidden.
- Existing Quest/Claim/Artifact behavior remains valid for Quests without import state.
- No command invokes a Skill, model, worker, provider, Dispatch, Activation, Approval, Workflow transition, or automatic next step.
- Implementation must consume frozen C1 source bytes. A changed upstream source requires a new forward baseline task/version, not mutation of C1 evidence.

## Acceptance Criteria

- [ ] Preview reports exact digests, complete mapping, universe, conflicts, preserved extensions, loss report, and opaque token with zero writes.
- [ ] Write accepts only an unchanged exact preview plan and commits one replay-safe typed batch; source drift returns `research_quest_source_drift` with zero writes.
- [ ] Every supported YAML/JSONL field has canonical mapping, blocking behavior, or namespaced preservation; no authoritative value is guessed or dropped.
- [ ] H1 opportunity and H2 candidate universes use explicit source stable IDs; post-import gate records require exact membership and total coverage, and stale-universe gates cannot satisfy transitions.
- [ ] Import/rebuild deterministically reproduces Quest, Claims, Artifacts, route, milestones, universe, and writer state.
- [ ] Cutover fence plus committed authority projection prevents source mutation throughout transfer; real source-admin integration proves byte-identical refusal under `writer=trellis`.
- [ ] Read-only source validation/status remains usable while Trellis owns writes.
- [ ] Export reconstructs validator-compatible YAML/JSONL, emits explicit loss report and digest, refuses colliding targets before mutation, and does not transfer authority.
- [ ] Transfer to source fails with `research_quest_transfer_unverified` unless export digest is current, validated, and mapped-content-equal.
- [ ] Verified rollback updates canonical authority before source writes resume; no state permits both writers.
- [ ] Preview/read-only/error paths are byte-identical zero-write across ledger, projections, locks/fences, runtime/cache, source files, and export targets.
- [ ] Historical Research/Workflow/gate fixtures and Quests without import state remain compatible.
- [ ] No managed execution, real pilot package migration, provider call, slash wrapper, automatic continuation, push, release, publication, or activation is added.

## Out of Scope

- Reimplementing H1/H2 scientific judgment or changing C4 record meaning.
- Inferring candidate/opportunity IDs from free-form Markdown.
- Managed Skill Dispatch/Activation/Approval integration (C5).
- Shipping or migrating real pilot Skill packages (C6).
- Provider/model A/B/C evaluation (C7).
- Full migration of every source Research methodology or artifact.
- Automatic continuation, cycles, retries, step-budget engines, or generated slash wrappers.
- Source repository changes beyond minimum pre-write authority guard and validator-compatible cutover integration.
- Push, release, publication, production activation, or history rewriting.

## Blocking Questions

None. C1 frozen mapping/source evidence, parent single-writer decision, and completed C4 gate boundary determine C4b behavior. Implementation must stop rather than guess if frozen source bytes fail to expose an explicit stable candidate/opportunity universe required by this contract.
