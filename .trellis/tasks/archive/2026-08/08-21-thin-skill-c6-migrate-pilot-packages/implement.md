# C6 Implementation Plan

## Scope

Implement only the four approved pilot packages and required distribution guarantees. Preserve C1–C5 contracts. No provider or worker invocation.

## Sequence

1. **Activate and authenticate task boundary**
   - validate C6 planning/context artifacts;
   - start existing C6 task;
   - verify C1 baseline manifest and copied files without reading external source repo;
   - record protected unrelated worktree paths.

2. **Impact analysis before symbol edits**
   - run GitNexus upstream impact for `buildPackedCliInventory` and any other existing function changed;
   - report HIGH/CRITICAL risk before edits;
   - avoid Core/resolver/capability edits unless package representation proves impossible.

3. **Create package instructions and members**
   - add exact four `1.0.0` package directories;
   - write adapted English `SKILL.md` files using the frozen boundaries;
   - copy three frozen template byte streams into package-local `templates/` paths;
   - exclude host projections, Python validators/helpers, and heavy references;
   - write source-to-package migration evidence and deferred review points.

4. **Generate canonical manifests**
   - compute member SHA-256 and byte length independently;
   - write canonical schema-v3 `skill.json` bytes;
   - authenticate all packages through Core parser/digest code;
   - record normalized identity vectors for tests/review evidence.

5. **Require packages in packed distribution**
   - update packed inventory from one exact four-package declaration;
   - require manifest, instructions, and every declared member;
   - keep dynamic schema-v3 authentication;
   - do not alter host-installed retired Skill inventory.

6. **Add focused tests**
   - production package conformance against C1 source/replacement map;
   - real bundled discovery/list/show/context;
   - model/operator/profile/member rules;
   - literature lightweight/managed identity parity;
   - evaluation managed Context and Quest-admin root-only refusal;
   - packed required inventory and missing-package/member failures;
   - real tarball authentication.

7. **Update executable code-specs**
   - add exact production package matrix, package inventory, semantic replacement, packed requirement, and tests;
   - preserve seven-section cross-layer format;
   - update unit-test specs only for a reusable production-package fixture rule.

8. **Verify without extra review panel**
   - focused CLI C6 tests;
   - CLI typecheck/lint/build;
   - packed CLI tests and real package audit;
   - historical resolver/managed lifecycle compatibility tests only where directly touched;
   - task validation and `git diff --check`;
   - GitNexus `detect_changes` before commit;
   - record critical review queue for later review requested by user.

9. **Commit and archive C6**
   - preserve unrelated `AGENTS.md`, `CLAUDE.md`, and GitNexus Skill modifications;
   - commit product/spec changes with normal hooks;
   - archive C6 and record journal;
   - no push/release/publication;
   - then prepare C7, without provider execution until separate authorization.

## Expected Product Edits

New:

- `packages/cli/src/templates/research/skills/**`
- focused C6 production package tests
- task evidence under C6 `research/`

Likely modified:

- `packages/cli/scripts/packed-cli-audit.js`
- `packages/cli/test/scripts/packed-cli-audit.test.ts`
- `packages/cli/test/commands/research-execution-package-resolution.integration.test.ts`
- `packages/cli/test/commands/research-skill.integration.test.ts`
- `packages/cli/test/commands/research-managed-skill-lifecycle.integration.test.ts`
- relevant CLI executable specs

Avoid unless proven necessary:

- Core execution-package schema/parser;
- capability registry;
- resolver behavior;
- C4/C4b/C5 state and lifecycle symbols.

## Success Criteria

C6 completes only when four package versions are required and authenticated in source build and packed npm tarball, profile/authority behavior matches the matrix, source semantic replacements are explicit, focused checks pass, commits succeed through normal hooks, and C7 remains the only remaining pilot child.
