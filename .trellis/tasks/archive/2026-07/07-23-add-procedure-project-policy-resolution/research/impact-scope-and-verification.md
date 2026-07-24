# Research: C04 Impact, File Scope, and Verification

- **Query**: Run fresh upstream impact analysis for likely C04 touchpoints; identify production/test/spec scope and verification commands.
- **Scope**: internal
- **Date**: 2026-07-24

## Findings

### GitNexus State

Index refreshed successfully at commit `5034ac0` on 2026-07-24. Graph: 15,288 nodes, 20,598 edges, 207 clusters, 300 flows. Direction: upstream, depth 3, tests included.

### Fresh Impact Results

| Symbol | Risk | Impacted / direct / processes | Direct callers or static consumers | C04 decision |
|---|---:|---:|---|---|
| `stableResearchJson` | **CRITICAL** | 29 / 7 / 7 | `writeJson`, `writeRuntimeJson`, `writeResearchProjections`, `writeProjectionCache`, 3 compatibility/Context tests | Reuse unchanged. No edit. |
| `writeFileAtomic` | **CRITICAL** | 62 / 10 / 14 | file writer, Research tracked/runtime writers, update, uninstall, template hashes, workflow selection | Call unchanged. No edit. |
| `collectResearchPlatformPayload` | **HIGH** | 14 / 3 / 2 | `writeResearchPlatformPayload`, configurator collection, exact payload test; reaches update/prune | C04 freeze: no edit. |
| `init` | MEDIUM | 12 / 10 / 0 | CLI parser plus init/update/uninstall/workflow tests | Avoid edit; policy belongs explicit Research init. |
| `initializeResearch` | LOW | 3 / 3 / 0 | 3 Research integration test files; graph misses production Commander caller | Likely only existing production function edited. |
| `writeResearchPlatformPayload` | LOW | 2 / 2 / 0 | Claude and Codex configurators | No edit. |
| `configurePlatform` | LOW | 16 / 3 / 1 | root init, re-init, platform tests | No edit. |
| `collectTemplateFiles` | LOW | 8 / 1 / 1 | `update` | No edit; protection already complete. |
| `pruneOrphanManifestKeys` | LOW | 12 / 3 / 1 | update, uninstall, test | No edit. |
| `buildPackedCliInventory` | LOW | 3 / 1 / 1 | `verifyPackedCli` -> release preflight | C04 adds only 28 positive Procedure paths and retains all current positive Skill paths; C09 owns negative Skill removal. |
| `getResearchCapabilityDefinition` | LOW | 1 / 1 / 0 | registry test; public/static consumers under-reported | Consume unchanged. |
| `resolveResearchCapability` | LOW | 1 / 1 / 0 | registry test; packed consumer/static users under-reported | Consume unchanged. |

`stableResearchJson` affected processes: proposal review, Dispatch prepare, command registration, Result recording, repository Dispatch mutation, Run invalidation, evidence creation.

`writeFileAtomic` affected processes include Dispatch prepare/review/result, Research command registration, migrations, update, uninstall, init, projection/hash/workflow state.

`collectResearchPlatformPayload` affects update `collectTemplateFiles` and manifest `pruneOrphanManifestKeys`.

### Mandatory C04 Freeze

- Do not modify **HIGH** `collectResearchPlatformPayload`.
- Do not modify **CRITICAL** `writeFileAtomic`.
- Do not modify **CRITICAL** `stableResearchJson`.
- Do not modify worker templates, current Skill collectors, Context, result recording, event emitters, schema-v2 state, cleanup evidence, export map, package version, or root barrel.

Any implementation pressure requiring those edits means C04 scope expanded into C05-C09. Stop and re-plan.

### Likely Production File Scope

New core files:

```text
packages/core/src/research/strict-json.ts
packages/core/src/research/procedure-policy.ts
```

Existing core file:

```text
packages/core/src/research/index.ts              # additive /research exports only
```

New CLI files:

```text
packages/cli/src/commands/research/procedure-resolution.ts
packages/cli/src/commands/research/project-policy.ts
packages/cli/src/commands/research/bundled-procedure-root.ts
packages/cli/src/templates/research/procedures/<14-id>/1.0.0/procedure.json
packages/cli/src/templates/research/procedures/<14-id>/1.0.0/PROCEDURE.md
```

Existing CLI file likely edited:

```text
packages/cli/src/commands/research/command.ts     # create missing policy during explicit Research init
```

Existing release file deliberately edited for additive C04 proof:

```text
packages/cli/scripts/packed-cli-audit.js  # add 28 positive Procedure paths; retain Skill positives
```

Files that should remain unchanged:

```text
packages/cli/src/configurators/research-payload.ts
packages/cli/src/utils/atomic-write.ts
packages/core/src/research/projections.ts
packages/cli/src/commands/init.ts
packages/cli/src/commands/update.ts
packages/cli/src/commands/uninstall.ts
packages/cli/src/utils/manifest-prune.ts
packages/core/package.json
packages/core/src/index.ts
packages/cli/package.json
```

### Likely Test Scope

New focused tests:

```text
packages/core/test/research/procedure-policy.test.ts
packages/core/test/research/strict-json.test.ts
packages/cli/test/commands/research-procedure-resolution.integration.test.ts
packages/cli/test/commands/research-policy-init.integration.test.ts
```

Existing static/compat consumers to update or retain:

```text
packages/core/test/research/stage-capabilities.test.ts
packages/core/test/compatibility/package-exports.test.ts
packages/core/scripts/verify-packed-core.js
packages/cli/test/compatibility/core-import-boundary.test.ts
packages/cli/test/commands/research.integration.test.ts
packages/cli/test/commands/update.integration.test.ts
packages/cli/test/commands/uninstall.integration.test.ts
packages/cli/test/scripts/packed-cli-audit.test.ts       # additive Procedure positives; retain Skill positives
```

Required matrices:

- canonical manifest acceptance; missing/unknown/duplicate/reordered/pretty/CRLF/extra-LF/BOM/invalid UTF-8/invalid SemVer/duplicate arrays;
- instruction BOM/NUL/empty/invalid UTF-8 and LF/CRLF/final-newline digest differences;
- bundled/project source, absent override fallback, present-invalid no fallback, symlink at every component, file/dir replacement, containment escape, unreadable and concurrent drift cases;
- policy strictness, missing failure, exact conservative creation, repeated init preservation, dry-run zero-write, malformed/symlink policy failure, and concurrent valid/invalid creator races with no overwrite;
- full tightening matrix across all 14 registry entries, omitted Procedure limits, high global defaults, capability overrides, workflow/automatic gates;
- exact Procedure and policy digest vectors including domain bytes, NUL, separator LF, lowercase prefix, array order, optional omission, Unicode;
- package root works from source tests and clean `dist` build;
- `.trellis/research/**` byte snapshots across root init, host addition, force init, update, dry-run, uninstall.

### Focused Verification Commands

```bash
pnpm --dir packages/core exec vitest run \
  test/research/strict-json.test.ts \
  test/research/procedure-policy.test.ts \
  test/research/stage-capabilities.test.ts \
  test/compatibility/package-exports.test.ts

pnpm --dir packages/cli exec vitest run \
  test/commands/research-procedure-resolution.integration.test.ts \
  test/commands/research-policy-init.integration.test.ts \
  test/commands/research.integration.test.ts \
  test/commands/update.integration.test.ts \
  test/commands/uninstall.integration.test.ts \
  test/compatibility/core-import-boundary.test.ts

pnpm --dir packages/core typecheck
pnpm --dir packages/cli typecheck
pnpm --dir packages/core lint
pnpm --dir packages/cli lint
pnpm --dir packages/cli run build
```

Full verification:

```bash
pnpm --dir packages/core test
pnpm --dir packages/cli test
node packages/core/scripts/verify-packed-core.js
node packages/cli/scripts/release-preflight.js verify-packed-cli
git diff --check
npx gitnexus detect-changes --repo Trellis --scope unstaged
```

### Related Specs

Update implemented C04 sections only:

- `.trellis/spec/core/backend/research-state.md` — public C04 types/signatures, strict validation, digest and effective-authority matrix.
- `.trellis/spec/cli/backend/filesystem-safety.md` — implemented containment/symlink/project-first/policy-create rules.
- `.trellis/spec/cli/backend/commands-research.md` — explicit Research-init missing-policy creation only; no C05/C06 claims.
- `.trellis/spec/cli/unit-test/conventions.md` — exact vectors and preservation matrix if signatures need concrete names.
- `.trellis/spec/cli/backend/release-process.md` — record C04 additive Procedure presence proof while preserving C09 ownership of negative Skill removal/final cutover.

Do not update `platform-integration.md` to claim Skill/worker cutover. C07-C09 own that behavior.

### External References

None. User prohibited web/network research.

## Caveats / Not Found

- GitNexus under-reports public exports, static imports, aliased imports, and test-file callers. `initializeResearch` graph omits `registerResearchCommand`; capability APIs graph omits packed/public consumers. Static search remains required.
- New symbols cannot be impact-analyzed before creation. Implementation must run `detect-changes` and fresh impact for any additional existing symbol it edits.
