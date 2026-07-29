# C08 Provenance — Immutable release scan (planning)

**Date:** 2026-07-27
**Method:** primary npm registry metadata via `npm view` + verified tarball download (SHA-1) + `tar -tzf` listing
**Package under scan:** `@mindfoldhq/trellis`
**Purpose:** establish whether any published release can authorize deletion hashes for the nine Research stage Skills.

## Registry summary

| Fact | Value |
|---|---|
| Latest published | `0.6.9` |
| Local CLI package version (this branch) | `0.6.7` |
| `0.7.0-beta.0` published? | **No** (404) |
| `0.7.0-beta.1` published? | **No** (404) |
| Other @mindfoldhq packages searched | `trellis-core` exists; no alternate published channel found packing stage Skills |

## Candidate tarball verification

| Version | Tarball | SHA-1 (registry) | Download SHA-1 | Stage Skill `SKILL.md` count |
|---|---|---|---|---|
| 0.6.5 | `…/trellis-0.6.5.tgz` | `66663eda0014599370abe58ff2719a961c4be406` | match | **0** |
| 0.6.6 | `…/trellis-0.6.6.tgz` | `4bbacedd4f66c4ad8648df9eef9087f062351d54` | match | **0** |
| 0.6.7 | `…/trellis-0.6.7.tgz` | `33f3ef321e8f65a461ab6ddfed822aa2631835b0` | match | **0** |
| 0.6.8 | `…/trellis-0.6.8.tgz` | `027bf3a4f27591fec0f320fe4b7959f88922d4be` | match | **0** |
| 0.6.9 | `…/trellis-0.6.9.tgz` | `bab4004e764f9d0dd098bdc510a989efecb27f30` | match | **0** |

Integrity strings (registry SHA-512) recorded during scan for 0.6.7 and 0.6.9; full set re-captured at execution Stage 1.

### What published packages *do* contain

Multi-host published packages include:

- generic bundled skills (`trellis-meta`, `trellis-channel`, `trellis-session-insight`, `trellis-spec-bootstrap`);
- multi-host `trellis-research` **agent** templates (e.g. `templates/claude/agents/trellis-research.md`);
- **not** `templates/common/bundled-skills/trellis-research-*/SKILL.md` stage Skills.

## Local source inventory (not release authority)

On `variant/research-workflow` current tree:

- Nine stage Skill directories under `packages/cli/src/templates/common/bundled-skills/trellis-research-*`
- Each contains exactly one file: `SKILL.md` → **18 installed targets** if generated for Claude + Codex
- Introduced in git history at commit `7cdc19ea` (`feat(research): add managed multi-repository workflow`) — branch-local research line
- Local package version pin `0.6.7` does **not** prove published 0.6.7 contains the same files (verified above: published 0.6.7 does not)

## Forbidden non-authorities

| Candidate | Status |
|---|---|
| Current mutable source hashes | Forbidden as sole production deletion authority |
| Test fixtures / synthetic bytes | Tests only |
| Generic `legacy-0.6.7-multi-host` fixture | Not Research Skill provenance unless independently proven |
| Published multi-host 0.6.5–0.6.9 | **Do not contain stage Skills** → cannot reproduce installed stage Skill bytes |
| Guessing “local 0.6.7 ≈ published 0.6.7” | Rejected by tarball listing |

## Deletion authority conclusion (planning)

**Hard stop gate for full 18-path deletion authority is currently OPEN/FAILED.**

- Proven path/hash pairs from immutable artifacts: **0 / 18**
- Generation stop does not require published Skill tarballs and may proceed under execution authorization
- `safe-file-delete` migration items for stage Skills must not be fabricated until immutable reproduction succeeds
- Unproven installed paths must remain preserved

## Execution Stage 1 reopen checklist

1. Re-fetch packument; confirm no new published versions appeared.
2. If a research-only release is published under the same or different name, verify integrity and re-scan.
3. Only then reproduce installed Claude/Codex bytes with that package’s own renderer.
4. Populate `research-skill-retirement.json` exclusively from successful reproductions.
5. Keep this note updated with accept/reject rows per version.

## Commands used (reproducible)

```bash
npm view @mindfoldhq/trellis versions --json
npm view @mindfoldhq/trellis@0.6.7 dist.tarball dist.shasum dist.integrity
npm view @mindfoldhq/trellis@0.7.0-beta.0 version   # expected 404
curl -fsSL "$tarball" -o trellis-$v.tgz
shasum -a 1 trellis-$v.tgz   # must equal dist.shasum
tar -tzf trellis-$v.tgz | rg 'bundled-skills/trellis-research-.*/SKILL\.md$'
```
