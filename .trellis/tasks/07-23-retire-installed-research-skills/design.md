# Technical Design — C08 Research Skill generation stop + pristine retirement

## 1. Scope / Trigger

C08 starts only after C06/C07 archive. It changes three surfaces together:

```text
payload generation (no Research Skills)
  + package-internal immutable retirement evidence
  + forward safe-file-delete migration + update/uninstall hardening
```

C08 does **not** delete dormant source templates or invert packed inventory (C09). It does **not** run parent closeout rehearsals (C10).

### Split authority

| Capability | Authority required |
|---|---|
| Stop generating Skills | Current source / configurator change only |
| Delete installed pristine Skill files | Immutable published artifact reproduction of exact installed bytes |
| Remove source / packed Skill payload | C09 after C08 cleanup proof |

If provenance cannot prove all 18 installed path/hash pairs, generation stop may still ship, but deletion authority is limited to the proven subset (possibly empty). Unproven paths stay preserved forever until later immutable evidence appears.

## 2. Trust boundaries

```text
immutable npm registry packument + tarball integrity
  -> verified package bytes
  -> historical renderer/template context inside that package
  -> reproduced installed bytes
  -> SHA-256 evidence records (package-internal)

forward migration safe-file-delete.allowed_hashes
  == evidence hashes (byte-for-byte set equality)

update classify/execute
  -> protection + lstat + planned bytes + hash membership
  -> unlink only after revalidation

uninstall
  -> evidence ∩ migration ∩ ownership-manifest hash match
```

Forbidden authorities:

- current mutable source as sole hash source;
- synthetic/test fixtures as production deletion authority;
- generic `legacy-0.6.7-multi-host` fixture unless independently proven;
- directory/prefix/Skill-name inference;
- root recursive ownership;
- any `.trellis/research/**` path.

## 3. Provenance model (hard stop gate)

### Planning-time finding (2026-07-27)

Primary registry metadata for `@mindfoldhq/trellis`:

- Published latest: `0.6.9`
- Published line includes `0.6.5` … `0.6.9`
- Local manifests `0.7.0-beta.0` / candidate `0.7.0-beta.1` are **not** published (404)
- Verified SHA-1 tarballs for `0.6.5`–`0.6.9` contain **zero** `bundled-skills/trellis-research-*/SKILL.md` entries
- Published multi-host packages contain generic research agents (`trellis-research.md`) and other bundled skills (`trellis-meta`, etc.), not the nine stage Skills
- Local research-only source (`variant/research-workflow`, package `0.6.7`) still has the nine stage templates; they appear unreleased on the public `@mindfoldhq/trellis` channel

### Consequence

At planning time, **no published immutable artifact has been shown to contain the nine stage Skills**. Therefore:

1. C08 execution Stage 1 must re-verify and expand candidate discovery (including any other published scopes/tags if authorized evidence surfaces).
2. Until 18 installed path/hash pairs are reproduced from verified tarballs, production `safe-file-delete` items for those paths must not be invented.
3. Generation stop remains valid without deletion authority.
4. This is not a soft warning; it is the documented hard stop gate for deletion.

### Reproduction procedure (when a candidate release exists)

For each candidate version `V`:

1. Read packument fields: `dist.tarball`, `dist.shasum` (SHA-1), `dist.integrity` (SHA-512).
2. Download tarball; verify SHA-1 and integrity before extract.
3. Inspect tar for stage Skill source entries under the historical package layout.
4. Execute/render installed Claude/Codex Skill bytes using **only** that package’s renderer and template context (not current tree).
5. Apply documented normalization (if any; prefer raw UTF-8 exact bytes with no transform).
6. Compute lowercase hex SHA-256 of exact installed bytes.
7. Record path → hash → reproducing artifacts.

Accept only path/hash pairs reproduced this way.

## 4. Evidence schema

Files (package-internal, never installed to user projects):

```text
packages/cli/src/legacy/research-skill-retirement.json
packages/cli/src/legacy/research-skill-retirement.ts
```

Conceptual schema:

```ts
interface ResearchSkillRetirementSnapshot {
  schemaVersion: 1;
  normalization: "utf8-raw" | string; // pinned exact rule id
  entries: ResearchSkillRetirementEntry[]; // length === 18 when complete
}

interface ResearchSkillRetirementEntry {
  host: "claude" | "codex";
  root: ".claude/skills" | ".agents/skills";
  /** Exact safe relative path from project root, e.g. .claude/skills/trellis-research-setup/SKILL.md */
  path: string;
  /** Source path inside verified tarball package/ layout */
  sourceTarEntry: string;
  /** Historical rendering profile id used to reproduce installed bytes */
  renderingProfile: string;
  /** Sorted unique lowercase SHA-256 digests */
  sha256: string[];
  /** Immutable artifacts that reproduce each hash */
  artifacts: Array<{
    packageName: "@mindfoldhq/trellis";
    version: string;
    tarballUrl: string;
    shasumSha1: string;
    integritySha512: string;
  }>;
}
```

Loader rejects:

- wrong schemaVersion;
- != expected entry count when claiming complete authority;
- duplicate paths;
- empty or unsorted/non-unique hash arrays;
- non-lowercase digests;
- unsafe paths (absolute, `..`, `\`, NUL, wildcards, trailing `/`);
- host/root mismatch with path prefix;
- any path under `.trellis/research/**`;
- missing artifact metadata.

Offline reproduced-byte fixtures may support tests only. Production deletion reads validated evidence + migration, never fixtures.

## 5. Exact installed paths (target set)

Nine stage names (current source inventory):

```text
trellis-research-audit
trellis-research-computation
trellis-research-experiment
trellis-research-ideation
trellis-research-literature
trellis-research-quest
trellis-research-setup
trellis-research-theory
trellis-research-writing
```

Installed SKILL.md targets:

```text
.claude/skills/<name>/SKILL.md          # Claude (9)
.agents/skills/<name>/SKILL.md          # Codex shared skill root (9)
```

If historical packages also wrote additional relative files under each skill directory, each file needs its own exact path/hash entry. Initial C08 target is the 18 `SKILL.md` paths unless provenance proves additional exact files that were generated.

## 6. Forward migration

### Version selection

1. Confirm registry: no published `@mindfoldhq/trellis@0.7.0-beta.0` / `@0.7.0-beta.1` (already 404 at planning).
2. Local `packages/cli/src/migrations/manifests/0.7.0-beta.0.json` already exists for **generic** current-host cleanup — do **not** overload it with Research Skill deletes unless a later explicit decision merges unpublished streams.
3. Preferred: new forward file `0.7.0-beta.1.json` (candidate name; finalize only after re-check) containing only Research Skill `safe-file-delete` items proven by evidence.
4. Never amend a published manifest.

Each item:

```json
{
  "type": "safe-file-delete",
  "from": ".claude/skills/trellis-research-setup/SKILL.md",
  "description": "Retire pristine Trellis-owned Research stage Skill after Procedure cutover.",
  "allowed_hashes": ["<lowercase-sha256-from-evidence>"]
}
```

Validation helper/test:

```text
for each evidence path: exactly one migration item with equal allowed_hashes set
for each research retirement migration item: evidence entry exists with equal hashes
fail closed on disagreement, missing, extra, or partial sets
```

No prefix ownership. Preserve `update.skip` with no Research-specific bypass.

## 7. Generation stop

Modify `packages/cli/src/configurators/research-payload.ts`:

```text
collectClaudePayload / collectCodexPayload
  start empty Map
  add worker
  add hooks/config/settings/statusline
  do NOT call collectResearchSkills / getResearchStageSkillTemplates
```

Preserve:

- `collectResearchPlatformPayload(platformId, cwd?, options?)`
- `writeResearchPlatformPayload(platformId, cwd, options?)`
- collect/write byte parity for remaining successor assets
- `RESEARCH_PAYLOAD_PATHS` and worker names

Keep for C08 (dormant, C09-owned removal):

- `packages/cli/src/templates/common/bundled-skills/trellis-research-*/**`
- `getResearchStageSkillTemplates` / `RESEARCH_STAGE_SKILL_NAMES` source exports if still required by packed audit or tests
- packed positive inventory requiring those templates

Fresh init/update must create zero `trellis-research-*` Skill directories while Procedures/workers remain.

### Impact note

Plan flags prior HIGH risk on `collectResearchSkills` and `collectResearchPlatformPayload`. Before editing those functions, run fresh GitNexus upstream impact; warn and stop for user confirmation if still HIGH/CRITICAL.

## 8. Update safe deletion hardening

Reuse `collectSafeFileDeletes` / `executeSafeFileDeletes` in `packages/cli/src/commands/update.ts`. Do not create a Research-specific engine.

Required behavior (strengthen existing where gaps exist):

**Classify**

1. Protection check before resolution.
2. Honor current-template ownership (suppress delete if path still in current template set).
3. Honor `update.skip` (no Research bypass).
4. `lstat` only; accept regular non-symlink files.
5. Capture planned content + hash.
6. Missing / modified / unsafe / protected / skipped are classifications, not writes.

**Execute (immediately before unlink)**

1. Re-run exact path + protection validation.
2. Re-`lstat` regular non-symlink.
3. Byte equality with planned content.
4. SHA-256 ∈ `allowed_hashes`.

Post-success:

- remove ownership hash only after successful delete or precisely defined converged disappearance;
- confirmed-empty non-recursive `rmdir` only after successful file delete;
- retain ownership on real failed deletion.

Zero-write cases: dry-run, cancel, refuse, malformed evidence, evidence/migration disagree, failed revalidation.

## 9. Uninstall binding

In `packages/cli/src/commands/uninstall.ts`, for the 18 retired paths deletion authority is:

```text
validated retirement evidence
  ∩ exact matching safe-file-delete migration
  ∩ ownership-manifest entry with matching stored hash and current bytes
```

Do not delete untracked files merely because evidence names them. Preserve symlinks, directories, modified bytes, malformed entries, unknown descendants, external `research-*` Skills, concurrent changes. Revalidate type and exact bytes immediately before deletion. Generic uninstall outside these paths remains unchanged.

Prefer proving `manifest-prune.ts` already retains exact migration keys (tests preferred over code change).

## 10. Spec reconciliation (C08-stage wording)

Update executable specs to distinguish three states:

1. **Active generation retired** — fresh payload has no Research Skills.
2. **Historical source + positive packed inventory temporarily retained** — C08 still packs dormant templates; C09 removes.
3. **Immutable evidence + exact-path cleanup active** — update/uninstall may delete only proven pristine owned files.

Primary surfaces:

- `.trellis/spec/cli/backend/migrations.md`
- `release-process.md`
- `directory-structure.md`
- `platform-integration.md`
- `research-worker-hooks.md`
- `commands-update.md`
- `commands-uninstall.md`
- `filesystem-safety.md`
- unit-test integration/conventions specs

Update scenarios in place; do not duplicate.

## 11. Compatibility matrix

| Scenario | Expected |
|---|---|
| Fresh Claude/Codex/dual init | No stage Skill dirs; workers/hooks present |
| Update pristine owned Skill (proven hash) | Deleted + ownership removed + empty parent rmdir |
| Update modified Skill | Preserved + skip-modified |
| Update symlink / dir | Preserved |
| `update.skip` path | Preserved |
| Current-template still owns path | Suppressed |
| Uninstall untracked Skill | Preserved |
| Uninstall owned pristine | Deleted under triple intersection |
| `.trellis/research/**` | Always preserved |
| Dry-run / cancel | Zero writes |
| Evidence/migration disagree | Fail closed, zero writes |

## 12. Rollout / rollback

**Rollout order**

1. Provenance research note + evidence files (possibly empty complete-authority until proven).
2. Loader + agreement tests.
3. Generation stop.
4. Forward migration only for proven paths.
5. Update/uninstall hardening + tests.
6. Specs + audits that still require dormant source/packed Skills.

**Rollback points**

- After evidence-only: delete new legacy files; no behavior change.
- After generation stop: restore skill collection call; dormant templates still present.
- After migration: remove forward manifest entries; do not rewrite history of other manifests.
- Never use force-push, reset, or broad clean.

## 13. Out of scope

- C09 source/packed removal and packed negative Skill inventory.
- C10 install smoke / historical upgrade parent closeout.
- Publishing any release.
- Editing frozen 137/1009 generic cleanup inventories for Research Skill hashes.
- Docs-site / marketplace / AGENTS.md / CLAUDE.md.
