# GitNexus impact map — Child C

## Index state

- Repository: `Trellis`
- Initial commit index was current but omitted untracked Child B source.
- Refreshed with global `gitnexus analyze .` before final impact checks.
- Refreshed graph: 19,135 nodes, 26,625 edges, 338 clusters, 300 flows.

## User-reviewed elevated-risk gates

### Research payload collector — HIGH

User approved bounded edits with configure/collect byte parity and focused/full safety gates.

| Symbol | Risk | Direct callers | Affected modules / boundary |
| --- | --- | ---: | --- |
| `readExisting` | HIGH | 2 | Claude and Codex payload collectors |
| `warnMalformed` | HIGH | 3 | Claude settings, Codex hooks, Codex config merges |
| `collectResearchSkills` | HIGH | 2 | Claude and Codex payload collectors |
| `collectResearchPlatformPayload` | HIGH | 2 | shared collector/writer; indirect init/update/manifest callers |

`collectResearchPlatformPayload` reaches 14 symbols across Configurators, Commands, and Migrations. Required preservation: exact current output keys/bytes, malformed structured-file behavior, and write/collect parity.

### Channel closed subsystem — CRITICAL

User approved deleting the closed Channel subsystem as one unit after parser zero-write proof. Partial path/store refactoring is forbidden.

Per-symbol analysis completed for every indexed Channel function/class/method:

| Symbol kind | LOW | MEDIUM | HIGH | CRITICAL | UNKNOWN |
| --- | ---: | ---: | ---: | ---: | ---: |
| Function | 180 | 2 | 23 | 12 | 0 |
| Class | 0 | 1 | 0 | 0 | 0 |
| Method | 38 | 0 | 0 | 0 | 0 |

Critical functions are internal Channel path/store chokepoints: `channelRoot`, `projectKey`, `currentProjectKey`, `projectDir`, `isSafeName`, `assertSafeName`, `channelDir`, `eventsPath`, `workerFile`, `migrateLegacyChannels`, `listProjects`, and `resolveExistingChannelRef`.

Cross-boundary graph query found one production inbound boundary only:

```text
packages/cli/src/cli/index.ts
  -> packages/cli/src/commands/channel/index.ts
  -> registerChannelCommand
```

All other production callers are inside `packages/cli/src/commands/channel/**`. Delete registration first, prove parser behavior, then delete complete tree plus Channel-only tests.

### Registry/template fetch closed subsystem — CRITICAL

User approved deleting remote generic workflow/spec fetch code after removing `init` and workflow-resolver callers. Preserve only proven read-only registry compatibility.

Per-symbol analysis for candidate utility files:

| Symbol kind | LOW | MEDIUM | HIGH | CRITICAL | UNKNOWN |
| --- | ---: | ---: | ---: | ---: | ---: |
| Function | 53 | 0 | 24 | 2 | 0 |
| Class | 0 | 0 | 0 | 1 | 0 |
| Method | 1 | 0 | 0 | 0 | 0 |

Critical symbols: `cloneRegistryRef`, `getGitRegistryRoot`, and `RegistryBackendError`.

Production inbound callers are limited to:

```text
packages/cli/src/commands/init.ts
packages/cli/src/utils/workflow-resolver.ts
```

Remove those active generic branches first. Then direct caller search and typecheck must prove `template-fetcher.ts` is caller-free before deletion.

## Other planned symbol results

### Parser and command roots

| Symbol | Risk | Direct callers | Notes |
| --- | --- | ---: | --- |
| `init` | MEDIUM | 11 | parser plus init/update/uninstall/workflow fixtures |
| `registerResearchCommand` | MEDIUM | 5 | parser and Research command tests |
| `linkResearchTask` | LOW | 2 | Research Task and workflow fixture tests |
| `unlinkResearchTask` | LOW | 1 | Research Task tests |
| `runMem` | LOW | 1 | root parser only |
| `runWorkflowCommand` | LOW | 2 | root parser plus command test |
| `registerChannelCommand` | LOW | 1 | root parser only |
| `createWorkflowStructure` | LOW | 1 | `init` |

Retired Mem/Workflow/Research-Task trees: 36 LOW functions, 6 MEDIUM functions, 1 LOW class, 1 LOW method; no HIGH/CRITICAL symbols.

### Workflow compatibility

All checked resolver/classifier symbols were LOW:

- `isBundledWorkflowId`;
- `resolveBundledWorkflowTemplate`;
- marketplace list/resolve/fetch helpers;
- `classifyWorkflowMigration`;
- `collectWorkflowMigrationPlan`.

`update` is MEDIUM with six direct test/parser callers. `collectTemplateFiles` is LOW with `update` as sole direct caller.

### Manifest pruning

- `buildKnownKeys`: LOW, one direct caller.
- `shouldKeepAgentsMd`: LOW, one direct caller.
- `pruneOrphanManifestKeys`: LOW, three direct callers.

Required boundary: active Research keys may change; frozen cleanup keys, migration endpoints, protected paths, and exact-key behavior remain unchanged.

### Template APIs

Elevated APIs expected from broad collectors:

- common `listDirectories`, `listBundledSkillFiles`, `getBundledSkillTemplates`: HIGH;
- Trellis `getAllScripts`, `getAllAgents`: HIGH;
- template `getTrellisSourcePath`: HIGH.

Claude exact settings/statusline and worker getters were LOW. Codex broad `getAllAgents` was MEDIUM. Replace broad discovery only after exact Research asset tests exist.

### Release package verification

`verifyPackedCli`: LOW, one direct flow. Safe extension point for required/forbidden tarball inventory.

## Edit order forced by impact map

1. Add parser/compatibility characterization tests.
2. Remove root registrations and generic init options.
3. Remove Research Task registration.
4. Collapse direct Research init/workflow generation.
5. Replace native workflow bytes with exact legacy digest evidence.
6. Add exact Research template getters and prove parity.
7. Remove generic collector dependencies from manifest pruning.
8. Delete closed Channel subsystem as one unit.
9. Delete closed template-fetch subsystem only after active callers disappear.
10. Delete remaining caller-free generic commands/templates/utilities.
11. Run clean build/tarball and full compatibility/security gates.

No production source was edited before all elevated-risk gates were shown to and approved by the user.
