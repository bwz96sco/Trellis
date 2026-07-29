# Evidence privacy policy — evaluation-contract-v1.0.0

Frozen at: 2026-07-29T01:55:45Z

## Allowed in tracked Trellis artifacts

- Source-relative path identifiers
- SHA-256 hashes and byte sizes
- Abstract contracts (field names, stage IDs, outcome enums, authority roles)
- Package names and registry membership
- Aggregate scores, terminal outcomes, disposition labels
- Opaque evidence IDs (SRC-*, VAL-*, FIX-*, RUN-*, REV-*)
- Approved short excerpts only if explicitly justified and redacted (default freeze policy: **zero body excerpts**)

## Forbidden in tracked Trellis artifacts

- Private Skill bodies (full SKILL.md / reference markdown content)
- Validator source code copied from agent-skills-private
- Tests, prompts, raw fixtures, raw model outputs
- Blind keys for live trials
- Detailed private call traces

## Private evidence directory

When live trials or raw fixtures must be retained, use an operator-approved directory **outside** both Trellis and agent-skills-private git trees. Tracked Trellis may store only the directory policy reference and content hashes, not the private files.

## Source access

- `/Users/zhangbowen/Projects/agent-skills-private` is **read-only** evidence.
- Never write, commit, or modify that repository as part of this evaluation.

## Default excerpt policy for evaluation-contract-v1.0.0

`max_body_excerpt_chars: 0` for freeze and static inventory. F02–F06 may raise only with explicit per-artifact justification ≤ 200 chars and no private prompts.
