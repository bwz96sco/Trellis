# Managed research workflow

## Goal

Ship `research` as second Trellis-managed bundled workflow, persist active bundled selection, and update only selected bundled workflow while preserving native defaults and marketplace/custom ownership.

## Requirements

### Bundled workflow registry

- Keep `native` as default bundled workflow.
- Add `research` as offline bundled workflow with exported `RESEARCH_WORKFLOW_ID`.
- Listing includes both bundled workflows before marketplace entries.
- Without explicit marketplace source, `research` resolves bundled.
- With explicit source, non-native IDs including `research` may resolve from that source; `native` remains reserved bundled behavior.
- Marketplace/custom resolution and errors remain compatible.

### Selection metadata

- Persist active bundled workflow in tracked `.trellis/.workflow.json`:

```json
{
  "schemaVersion": 1,
  "id": "research",
  "source": "bundled"
}
```

- Write metadata atomically.
- Strictly validate exact fields, version, source, and known bundled ID.
- Missing metadata triggers conservative legacy inference: manage as native only when current bytes equal bundled native or the existing workflow hash proves a pristine native install; otherwise treat workflow as unknown/user-owned and omit it from the update plan.
- Malformed or unknown metadata must never fall back to native silently; update warns and excludes `workflow.md` from its desired-template plan.
- Marketplace/custom selection clears bundled metadata and removes workflow template hash.
- `.workflow.json` is durable state, not generated template content, and is excluded from template hashes.

### Init and switch ownership

- `trellis init` remains native by default and writes native bundled selection metadata.
- `trellis init --workflow research` installs bundled research bytes, hashes active workflow, and records research selection.
- `trellis workflow --template research` uses existing conflict protection, then hashes active workflow and records research selection after successful replacement.
- `--create-new` changes neither active workflow, hash, nor selection metadata.
- Marketplace/custom workflows remain user-managed: no workflow hash and no bundled selection metadata.

### Update ownership

- `trellis update` selects desired `workflow.md` from valid bundled metadata.
- Missing metadata preserves legacy native behavior.
- Valid research metadata updates pristine research to current research, never native.
- Locally modified bundled workflow uses existing conflict policy.
- Marketplace/custom workflow remains preserved because it has neither bundled metadata nor managed hash.
- Invalid metadata preserves active workflow while allowing unrelated update planning.
- Update must not fetch marketplace workflow content.

### Research workflow template

- Bundle platform-neutral `research` workflow under CLI templates.
- Preserve parser-significant native grammar: Phase Index, Phase headings, numbered step headings, platform markers, and `[workflow-state:*]` blocks.
- Express root research control-plane flow: Quest/Campaign/Run/Evidence/Claim authority, bounded dispatch, worker Result + Proposal, explicit root apply/reject, optional Task use.
- Do not implement research skills, hooks, Task/session links, Mempal integration, or worker automation in this child.

### Compatibility

- Existing native installs and updates remain unchanged except new explicit bundled metadata on successful init/switch.
- Existing projects lacking metadata remain supported as legacy native.
- Existing marketplace/custom workflows remain user-owned.
- Existing conflict, force, skip, create-new, and local-edit protection semantics remain intact.
- Research template must be copied to `dist` and npm package through existing recursive template packaging.

## Acceptance Criteria

- [ ] Native remains default and offline-resolvable.
- [ ] Research lists and resolves offline as bundled.
- [ ] Explicit custom-source collision behavior is tested.
- [ ] Fresh native and research init write correct workflow, hash, and selection metadata.
- [ ] Marketplace/custom init clears selection metadata and workflow hash.
- [ ] Workflow switching updates ownership only after active replacement.
- [ ] `--create-new` leaves active ownership unchanged.
- [ ] Update chooses selected bundled workflow and is idempotent.
- [ ] Pristine research updates to research; modified research is protected.
- [ ] Missing metadata infers legacy native only from safe bytes/hash evidence; unknown/custom content remains unmanaged.
- [ ] Invalid/unknown metadata never restores native or overwrites active workflow.
- [ ] Marketplace/custom workflow is preserved by update without remote fetch.
- [ ] `.workflow.json` is atomically written and excluded from template hashes.
- [ ] Research workflow passes parser-facing structure tests and built-package smoke.
- [ ] Existing native/workflow/update regressions pass, except documented uninitialized marketplace-submodule fixture failures.
- [ ] CLI lint, typecheck, build, root typecheck, `git diff --check`, and GitNexus change detection pass.
- [ ] No commit unless user explicitly requests it.
