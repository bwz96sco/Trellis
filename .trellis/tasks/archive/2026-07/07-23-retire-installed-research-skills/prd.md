# C08 Stop generation and safely retire installed Research Skills

## Goal

Stop Claude/Codex Research Skill generation for fresh installs and updates, while giving `trellis update` and `trellis uninstall` exact-path authority to delete only pristine Trellis-owned installed Research Skill files proven from immutable published package artifacts.

## Predecessor gate

- C06 and C07 are complete and archived.
- Generic Claude/Codex Research workers and approved Dispatch Context/Result consumption are the active runtime.
- Parent migration `07-23-replace-research-skills-with-trellis-procedures` is 7/10 complete.
- C09 and C10 remain planning stubs and must not start until C08 acceptance.

## Product Requirements

1. Fresh Claude-only, Codex-only, and dual-host generation must create **no** `trellis-research-*` Skill directories under `.claude/skills/` or `.agents/skills/`.
2. Successor payload assets must remain present and byte-exact: generic workers, hooks/config, settings, optional Claude statusline, Procedures, and existing Research workflow/policy surfaces owned by earlier children.
3. Historical installed Research Skill files may be deleted only when every of the following is true:
   - path is one of the exact 18 retired paths (9 Claude + 9 Codex);
   - current bytes match an immutable released SHA-256 in package-internal retirement evidence;
   - a forward migration `safe-file-delete` entry names the same path with the same `allowed_hashes` set;
   - for uninstall, an ownership-manifest entry also records that exact path with a matching hash.
4. Modified, missing, symlinked, directory, protected, `update.skip`, non-owned, unknown sibling/descendant, external `research-*`, and concurrent-mutated files must be preserved (classification / zero-write), never force-deleted.
5. `.trellis/research/**` must be fully preserved by path, type, and byte content across update and uninstall cleanup paths.
6. Research Skill retirement evidence is package-internal only; it is never installed into user projects.
7. C08 keeps the nine dormant source Skill templates and positive packed inventory of those templates; C09 owns source/packed removal after cleanup proof.
8. No Research-specific deletion engine; reuse and harden the existing `safe-file-delete` plan/execute model.

## Provenance Requirements

1. Deletion hashes must come only from immutable npm registry/tarball reproduction of published `@mindfoldhq/trellis` releases that actually contained and could generate the nine stage Skills.
2. For each candidate release, record version, tarball URL, registry SHA-1, and SHA-512 integrity; verify integrity before extraction or execution.
3. Reproduce Claude and Codex installed bytes using the historical package's own renderer/template context, not current mutable source.
4. Document any byte normalization and hash exact installed bytes with lowercase SHA-256.
5. Accept a path/hash pair only when an immutable artifact reproduces it.
6. **Hard stop gate:** if all 18 exact paths cannot be proven, unproven paths remain preserved and receive no deletion authority.
7. Do not treat the generic `legacy-0.6.7-multi-host` fixture as Research Skill provenance unless a verified artifact independently proves that relationship.
8. Local package version `0.6.7` is not sufficient authority by itself; published release membership must be proven.

## Compatibility Requirements

- Preserve current command signatures for update/uninstall/init except for Skill-free payload content.
- Preserve `collectResearchPlatformPayload()` and `writeResearchPlatformPayload()` public signatures and collect/write byte parity for successor assets.
- Preserve workers, hooks, Procedures, migration history, package versions, exports, dependency pins, and frozen generic cleanup evidence (137 / 1,009 paths).
- Do not amend any published migration manifest; add only a new forward manifest after unpublished-version check.
- Preserve `update.skip`; add no Research-specific bypass.
- Do not touch docs-site, marketplace, `AGENTS.md`, or `CLAUDE.md` dirty trees.
- No commit, archive, publication, or push without later explicit authorization.

## Safety Requirements

- Protection checks run before path resolution writes.
- Classification uses `lstat`, accepts only regular non-symlink files, and captures planned content/hash.
- Immediately before `unlink`, revalidate exact path/protection, regular non-symlink file, byte equality with planned content, and SHA-256 membership in `allowed_hashes`.
- Remove ownership only after successful deletion or precisely defined converged disappearance.
- Confirmed-empty `rmdir` only after successful file deletion; never recursive.
- Dry-run, cancellation, refusal, malformed evidence, evidence/migration disagreement, and failed revalidation are zero-write.
- Uninstall never deletes an untracked file merely because evidence names it.

## Acceptance Criteria

### Provenance and evidence

- [ ] Every published release that packs/generates the nine stage Skills is identified with immutable registry metadata (version, tarball URL, SHA-1, SHA-512 integrity).
- [ ] Integrity is verified before extract/execute for each used artifact.
- [ ] Exactly 18 path records exist (9 Claude + 9 Codex) with schema version, normalization rule, host/root, exact safe relative path, source tar entry, historical rendering profile, sorted unique lowercase SHA-256 hashes, and reproducing immutable artifacts.
- [ ] Loader rejects malformed schemas, duplicates, empty/unsorted hashes, unsafe paths, traversal, absolute paths, backslashes, NULs, wildcards, trailing slashes, host/root mismatches, and every `.trellis/research/**` path.
- [ ] If any of the 18 paths is unproven, C08 stops without deletion authority for those paths.

### Generation stop

- [ ] Fresh Claude-only, Codex-only, and dual-host generation create zero `trellis-research-*` Skill directories.
- [ ] Successor worker/hook/config/statusline/Procedure assets remain byte-exact vs current successor contract.
- [ ] Active configurator no longer calls `getResearchStageSkillTemplates` / `RESEARCH_STAGE_SKILL_NAMES` for generation.
- [ ] Nine dormant source templates remain present through C08; packed positive Skill inventory remains required until C09.

### Migration and cleanup

- [ ] New forward unpublished migration manifest contains one `safe-file-delete` per proven path; each `allowed_hashes` set equals retirement evidence exactly.
- [ ] Evidence ↔ migration agreement helper/test fails closed on disagreement.
- [ ] Update dry-run, cancellation, `update.skip`, current-template precedence, pristine deletion, modified preservation, symlink rejection, and classify/execute races are covered and safe.
- [ ] Uninstall requires evidence ∩ migration ∩ ownership-manifest hash match; malformed/concurrent/untracked cases preserve bytes.
- [ ] `.trellis/research/**` is completely preserved.

### Verification gates

- [ ] Focused + full Core/CLI tests, lint, typecheck, builds, task validation, `git diff --check`, packed Core/CLI audits, GitNexus changed-scope detection, and independent review pass.
- [ ] Specs distinguish: active generation retired; historical source and positive packed inventory temporarily retained; immutable evidence and exact-path cleanup active.
- [ ] No production edit, activation, commit, archive, publish, or push occurs under planning-only authorization.

## Non-Goals

- No dormant Skill source or packed-path deletion (C09).
- No clean-install/historical-upgrade parent closeout (C10).
- No generic cleanup inventory edits.
- No package version bumps, publish, docs-site, marketplace, or generic core export changes.
- No Research runtime Procedure/worker behavior changes beyond payload generation stop and cleanup.

## Notes

- Task root: `.trellis/tasks/07-23-retire-installed-research-skills`
- Parent: `.trellis/tasks/07-23-replace-research-skills-with-trellis-procedures`
- Planning approval of the parent continuation plan does **not** authorize production edits, `task.py start`, commits, archives, publication, or push.
- Activate only after complete planning artifacts, independent planning review PASS, and an explicit execution instruction.
