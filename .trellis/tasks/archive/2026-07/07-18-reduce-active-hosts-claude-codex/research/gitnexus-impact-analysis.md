# Research: GitNexus impact analysis

- **Query**: Query/context/impact analysis for C04 active-host shrink, including HIGH/CRITICAL warnings.
- **Scope**: internal
- **Date**: 2026-07-20

## Findings

### Query results

GitNexus concept queries were run for:

- active platform registry/init flow;
- update template collection/manifest pruning;
- uninstall retired cleanup;
- generated Python detection/task-store/template packaging.

Graph query ranking was noisy: unrelated Channel and generated Python flows ranked above requested platform concepts. Manual source search/read was required for exhaustive mapping. Do not use absence from query output as evidence of no consumer.

### Upstream impact results

| Target | Risk | Impact summary | C04 interpretation |
|---|---|---|---|
| `getConfiguredPlatforms` | **HIGH** | 23 impacted, 6 direct, 2 processes, 3 modules. Direct: `handleReinit`, `uninstall`, `needsCodexUpgrade`, `collectTemplateFiles`, `update`, platform tests. | Critical cross-command boundary. Warn before edit. Test init/update/uninstall together. |
| `collectPlatformTemplates` | **MEDIUM** | 23 impacted, 9 direct, 2 processes, 2 modules. Direct consumers include update collection, Codex upgrade checks, manifest known keys, tests. | Registry shrink affects update ownership and manifest pruning. Keep C03 exact keys independent. |
| `getInitToolChoices` | LOW | 13 impacted, 3 direct. Direct: init, re-init, tests. | Registry-derived two-choice flow; init integration required. |
| `resolveCliFlag` | LOW | 14 impacted, 4 direct. | Init/re-init dispatch and tests. |
| `configurePlatform` | LOW | 14 impacted, 4 direct. | Init/re-init and configurator parity tests. |
| `getPlatformsWithPythonHooks` | LOW | 1 indexed direct test; manual search also found init use at `commands/init.ts:1969-1974`. | GitNexus missed production caller. Trust manual source map. |
| `AI_TOOLS` | LOW | 0 indexed upstream. | False-low due graph limitation for const/indexed access. Manual `rg` found broad consumers. |
| `PLATFORM_FUNCTIONS` | LOW | 0 indexed upstream. | Internal dispatch accessed through wrapper functions; manual impact is larger. |
| `PLATFORM_IDS` | LOW | 0 indexed upstream. | Manual source/tests show many derived consumers. |
| `buildKnownKeys` | LOW | 14 impacted; feeds `pruneOrphanManifestKeys`, then update/uninstall. | Semantically high safety importance despite LOW graph score. |
| `uninstall` | LOW | 4 direct: CLI + three integration suites. | Cleanup behavior remains compatibility gate. |
| `collectTemplateFiles` | LOW | 6 impacted; direct `update`. | Active collector set changes package update behavior. |
| Python `detect_platform` | LOW | 1 direct indexed caller: `get_cli_adapter_auto`. | Manual tests/runtime branches much broader than graph result. |
| Python `get_cli_adapter` | LOW | 0 indexed upstream. | Dynamic/copied Python consumers are under-indexed. |
| Python `_has_subagent_platform` | LOW | 1 direct, affects `cmd_create` process. | Task JSONL seeding behavior; pin retained hosts. |

### Unknown/ambiguous targets

- `AITool` and `CliFlag`: GitNexus returned `Target not found`; TypeScript type aliases were not indexed as impact targets.
- `PLATFORM_MANAGED_DIRS`: ambiguous duplicate Function/Const graph candidates. Manual source analysis used instead.

### HIGH warning

`getConfiguredPlatforms` returned HIGH. C04 implementation must explicitly warn before editing this symbol, then proceed only with cross-command tests covering:

1. first init/re-init;
2. update template collection and legacy Codex bridge;
3. manifest prune;
4. uninstall frozen compatibility fixture.

No CRITICAL target was reported.

### Graph caveat

HIGH/MEDIUM process lists included OpenCode template execution flows through over-connected symbol/file relationships. Those process hits do not justify retaining retired OpenCode active support. Genuine direct TypeScript callers listed above are authoritative.

### Required pre-commit gate

Project instructions require change detection before commit:

```bash
npx gitnexus detect-changes
```

Expected changed flow groups:

- CLI init host selection/configuration;
- active platform detection;
- update current template collection;
- manifest current-key derivation;
- generated Python host detection/dispatch;
- shared hook distribution.

Unexpected changes to migration loading, Research storage, Channel/Mem, generic workflow selection, or core exports should block commit.

## Caveats / Not Found

- GitNexus index did not model TypeScript type aliases or dynamic Python/module packaging comprehensively.
- Manual `rg` + direct reads remain required for deleted-file impact and raw asset packaging.
