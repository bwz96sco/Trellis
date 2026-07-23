# C10 contract, boundaries, and decomposition

## C09 gate

C09 is archived with all Claude/Codex parity and zero-write gates passing. Channel removal may proceed.

## Product choices

- Top-level description becomes Research-specific; C12 later aligns full root docs/branding.
- Uninstall help states that managed files are removed while canonical Research data is preserved.
- Keep `--with-statusline` for Claude only, as approved in parent target; rewrite output to Research state or remove implementation if no useful Research signal remains.
- Remove active generic init flags: user/monorepo/template/registry/overwrite/append and already-retired workflow source flags.
- Keep `.workflow.json` temporarily as fixed bundled-Research ownership metadata; remove user-facing switching.
- Remove `trellis-meta` instead of inventing a new Research meta product.
- Stop creating `.trellis/scripts` after Research workflow/hooks are decoupled.
- Remove new-write `--task-ref` and caller-selected `--owner-skill` surfaces when final callers are verified; preserve schema-v1 reads. Keep `provider` only if still needed as warning-only compatibility hint, never authority.
- Preserve modified historical files and unknown descendants; never recursive-delete generic roots.

## Why split C10

C10 crosses three different blast radii:

1. ownership/migration safety;
2. mixed Research host/init/update generation;
3. active command/source/package deletion.

Delete-first implementation risks losing manifest ownership, breaking Research hooks, or crossing C11/C16 compatibility boundaries. Use ordered children.

## Child A — Freeze current-host generic retirement ownership

Deliverables:

- exact current-host generated-path and released-hash inventory;
- cleanup migration/structured descriptors;
- `manifest-prune` recognition after active collectors disappear;
- pristine delete, modified preserve, unknown preserve, mixed scrub, idempotency tests;
- no source collector deletion yet.

Gate: every retiring path remains classifiable without active template collectors.

## Child B — Make generation Research-only

Deliverables:

- Research-only init/update/re-init path;
- no generic Task/workspace/spec/developer/script generation;
- no migration Task creation;
- Research-only workflow, hooks, config, gitignore, root managed instructions, and statusline;
- only bounded workers plus nine Research stage skills generated;
- init/update byte parity and protected Research state tests.

Gate: fresh/update output no longer depends on generic assets; cleanup inventory already exists.

## Child C — Remove active generic surfaces and package payload

Deliverables:

- unregister Channel/Mem/Workflow/Research Task;
- remove command-only source/tests/specs;
- remove caller-free registry/resolver/task helpers;
- delete generic template sources now covered by cleanup inventory;
- exact CLI help/negative parser tests;
- clean build and packed payload audit;
- production CLI has no generic core-subpath imports;
- 0.7 core exports still resolve.

Gate: full tests/lint/typecheck/build/package audit and independent review.

## C10 parent integration gate

C10 parent archives only after A -> B -> C complete and combined verification proves:

- five top-level product commands only;
- canonical Research command set without Task;
- fresh Claude/Codex install is Research-only;
- update safely removes pristine generic assets and preserves modified/unknown content;
- `.trellis/research/**` byte-identical across update/uninstall fixtures;
- schema-v1 and workflow metadata remain readable;
- core Channel/Mem/Task compatibility imports remain valid;
- generic source/templates absent from packed CLI;
- `docs-site` and `marketplace` untouched;
- no commit unless explicitly requested.

## Risk notes

Highest safety risk: `update.ts` + `manifest-prune.ts` ownership transition.

Highest architecture risk: removing Task scripts before mixed hooks/workflow stop consuming them.

Highest release risk: accidentally deleting generic core exports before C16.

Symbol impact must be run per child before every existing function/class/method edit. HIGH/CRITICAL results require warning and possible further split.
