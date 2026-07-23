# Research: Migration Cleanup Paths and Known Hashes

- **Query**: Inventory migration path coverage and every persisted `safe-file-delete.allowed_hashes` set relevant to legacy cleanup.
- **Scope**: internal
- **Date**: 2026-07-18

## Findings

### Summary

- Migration manifests are dynamically loaded by `packages/cli/src/migrations/index.ts:loadManifests`.
- `packages/cli/src/types/migration.ts:MigrationItem` defines `rename`, `rename-dir`, `delete`, and `safe-file-delete`; `allowed_hashes` is the bounded pristine-byte evidence for safe deletion.
- All manifests contain 394 migration items, 365 unique `from` paths, 173 unique `to` paths, and 485 unique paths in their union.
- The retired-host/legacy-alias filter below finds 275 entries.
- There are 192 `safe-file-delete` entries carrying 236 unique known hashes; one path has up to 11 accepted historical hashes.
- Historical aliases outside the current 19-host registry include `.iflow/**` and `.windsurf/**`. Their migration knowledge already survives active registry changes, but their roots are not currently supplied by `ALL_MANAGED_DIRS` for backup/empty-root cleanup.

### Exact Retired-Host and Alias Migration Entries

| Manifest | Type | From | To | Allowed hashes |
|---|---|---|---|---|
| `0.1.9.json` | `rename` | `.cursor/commands/onboard-developer.md` | `.cursor/commands/onboard.md` |  |
| `0.1.9.json` | `rename` | `.cursor/commands/record-agent-flow.md` | `.cursor/commands/record-session.md` |  |
| `0.2.14.json` | `rename` | `.cursor/commands/start.md` | `.cursor/commands/trellis-start.md` |  |
| `0.2.14.json` | `rename` | `.cursor/commands/finish-work.md` | `.cursor/commands/trellis-finish-work.md` |  |
| `0.2.14.json` | `rename` | `.cursor/commands/before-frontend-dev.md` | `.cursor/commands/trellis-before-frontend-dev.md` |  |
| `0.2.14.json` | `rename` | `.cursor/commands/before-backend-dev.md` | `.cursor/commands/trellis-before-backend-dev.md` |  |
| `0.2.14.json` | `rename` | `.cursor/commands/check-frontend.md` | `.cursor/commands/trellis-check-frontend.md` |  |
| `0.2.14.json` | `rename` | `.cursor/commands/check-backend.md` | `.cursor/commands/trellis-check-backend.md` |  |
| `0.2.14.json` | `rename` | `.cursor/commands/check-cross-layer.md` | `.cursor/commands/trellis-check-cross-layer.md` |  |
| `0.2.14.json` | `rename` | `.cursor/commands/record-session.md` | `.cursor/commands/trellis-record-session.md` |  |
| `0.2.14.json` | `rename` | `.cursor/commands/update-spec.md` | `.cursor/commands/trellis-update-spec.md` |  |
| `0.2.14.json` | `rename` | `.cursor/commands/onboard.md` | `.cursor/commands/trellis-onboard.md` |  |
| `0.2.14.json` | `rename` | `.cursor/commands/break-loop.md` | `.cursor/commands/trellis-break-loop.md` |  |
| `0.2.14.json` | `rename` | `.cursor/commands/integrate-skill.md` | `.cursor/commands/trellis-integrate-skill.md` |  |
| `0.2.14.json` | `rename` | `.cursor/commands/create-command.md` | `.cursor/commands/trellis-create-command.md` |  |
| `0.2.14.json` | `rename` | `.cursor/commands/parallel.md` | `.cursor/commands/trellis-parallel.md` |  |
| `0.3.0-beta.0.json` | `rename` | `.cursor/commands/start.md` | `.cursor/commands/trellis-start.md` |  |
| `0.3.0-beta.0.json` | `rename` | `.cursor/commands/finish-work.md` | `.cursor/commands/trellis-finish-work.md` |  |
| `0.3.0-beta.0.json` | `rename` | `.cursor/commands/before-frontend-dev.md` | `.cursor/commands/trellis-before-frontend-dev.md` |  |
| `0.3.0-beta.0.json` | `rename` | `.cursor/commands/before-backend-dev.md` | `.cursor/commands/trellis-before-backend-dev.md` |  |
| `0.3.0-beta.0.json` | `rename` | `.cursor/commands/check-frontend.md` | `.cursor/commands/trellis-check-frontend.md` |  |
| `0.3.0-beta.0.json` | `rename` | `.cursor/commands/check-backend.md` | `.cursor/commands/trellis-check-backend.md` |  |
| `0.3.0-beta.0.json` | `rename` | `.cursor/commands/check-cross-layer.md` | `.cursor/commands/trellis-check-cross-layer.md` |  |
| `0.3.0-beta.0.json` | `rename` | `.cursor/commands/record-session.md` | `.cursor/commands/trellis-record-session.md` |  |
| `0.3.0-beta.0.json` | `rename` | `.cursor/commands/update-spec.md` | `.cursor/commands/trellis-update-spec.md` |  |
| `0.3.0-beta.0.json` | `rename` | `.cursor/commands/onboard.md` | `.cursor/commands/trellis-onboard.md` |  |
| `0.3.0-beta.0.json` | `rename` | `.cursor/commands/break-loop.md` | `.cursor/commands/trellis-break-loop.md` |  |
| `0.3.0-beta.0.json` | `rename` | `.cursor/commands/integrate-skill.md` | `.cursor/commands/trellis-integrate-skill.md` |  |
| `0.3.0-beta.0.json` | `rename` | `.cursor/commands/create-command.md` | `.cursor/commands/trellis-create-command.md` |  |
| `0.3.0-beta.0.json` | `rename` | `.cursor/commands/parallel.md` | `.cursor/commands/trellis-parallel.md` |  |
| `0.3.4.json` | `rename-dir` | `.kilocode/commands/trellis` | `.kilocode/workflows` |  |
| `0.3.4.json` | `delete` | `.kilocode/commands` | `` |  |
| `0.4.0-beta.1.json` | `safe-file-delete` | `.cursor/commands/trellis-before-backend-dev.md` | `` | `7e35444de2a5779ef39944f17f566ea21d2ed7f4994246f4cfe6ebf9a11dd3e3` |
| `0.4.0-beta.1.json` | `safe-file-delete` | `.cursor/commands/trellis-before-frontend-dev.md` | `` | `a6225f9d123dbd4a7aec822652030cae50be3f5b308297015e04d42b23a27b2a` |
| `0.4.0-beta.1.json` | `safe-file-delete` | `.cursor/commands/trellis-check-backend.md` | `` | `4e81a28d681ea770f780df55a212fd504ce21ee49b44ba16023b74b5c243cef3` |
| `0.4.0-beta.1.json` | `safe-file-delete` | `.cursor/commands/trellis-check-frontend.md` | `` | `5e8e3b682032ba0dd6bb843dd4826fff0159f78a7084964ccb119c6cf98b3d91` |
| `0.4.0-beta.1.json` | `safe-file-delete` | `.iflow/commands/trellis/before-backend-dev.md` | `` | `7e35444de2a5779ef39944f17f566ea21d2ed7f4994246f4cfe6ebf9a11dd3e3` |
| `0.4.0-beta.1.json` | `safe-file-delete` | `.iflow/commands/trellis/before-frontend-dev.md` | `` | `a6225f9d123dbd4a7aec822652030cae50be3f5b308297015e04d42b23a27b2a` |
| `0.4.0-beta.1.json` | `safe-file-delete` | `.iflow/commands/trellis/check-backend.md` | `` | `4e81a28d681ea770f780df55a212fd504ce21ee49b44ba16023b74b5c243cef3` |
| `0.4.0-beta.1.json` | `safe-file-delete` | `.iflow/commands/trellis/check-frontend.md` | `` | `5e8e3b682032ba0dd6bb843dd4826fff0159f78a7084964ccb119c6cf98b3d91` |
| `0.4.0-beta.1.json` | `safe-file-delete` | `.opencode/commands/trellis/before-backend-dev.md` | `` | `7e35444de2a5779ef39944f17f566ea21d2ed7f4994246f4cfe6ebf9a11dd3e3` |
| `0.4.0-beta.1.json` | `safe-file-delete` | `.opencode/commands/trellis/before-frontend-dev.md` | `` | `a6225f9d123dbd4a7aec822652030cae50be3f5b308297015e04d42b23a27b2a` |
| `0.4.0-beta.1.json` | `safe-file-delete` | `.opencode/commands/trellis/check-backend.md` | `` | `4e81a28d681ea770f780df55a212fd504ce21ee49b44ba16023b74b5c243cef3` |
| `0.4.0-beta.1.json` | `safe-file-delete` | `.opencode/commands/trellis/check-frontend.md` | `` | `5e8e3b682032ba0dd6bb843dd4826fff0159f78a7084964ccb119c6cf98b3d91` |
| `0.4.0-beta.1.json` | `safe-file-delete` | `.kilocode/workflows/before-backend-dev.md` | `` | `7e35444de2a5779ef39944f17f566ea21d2ed7f4994246f4cfe6ebf9a11dd3e3` |
| `0.4.0-beta.1.json` | `safe-file-delete` | `.kilocode/workflows/before-frontend-dev.md` | `` | `a6225f9d123dbd4a7aec822652030cae50be3f5b308297015e04d42b23a27b2a` |
| `0.4.0-beta.1.json` | `safe-file-delete` | `.kilocode/workflows/check-backend.md` | `` | `4e81a28d681ea770f780df55a212fd504ce21ee49b44ba16023b74b5c243cef3` |
| `0.4.0-beta.1.json` | `safe-file-delete` | `.kilocode/workflows/check-frontend.md` | `` | `5e8e3b682032ba0dd6bb843dd4826fff0159f78a7084964ccb119c6cf98b3d91` |
| `0.4.0-beta.1.json` | `safe-file-delete` | `.gemini/commands/trellis/before-backend-dev.toml` | `` | `c384cda35b0e57de4a84d2812d59fd223c998be2aaa16a0620d7b987a08f6e33` |
| `0.4.0-beta.1.json` | `safe-file-delete` | `.gemini/commands/trellis/before-frontend-dev.toml` | `` | `3e1ad82280f2aaabe60b93ec3e76c1017ef6282319d061e1a3de556b421317e2` |
| `0.4.0-beta.1.json` | `safe-file-delete` | `.gemini/commands/trellis/check-backend.toml` | `` | `8f872a2eea659abce0cbdc40ee6a197e70ffa4a4e0cbdc42ea9bb026af1cfe79` |
| `0.4.0-beta.1.json` | `safe-file-delete` | `.gemini/commands/trellis/check-frontend.toml` | `` | `4fb9eecf75f5efc0d9a38becc459d503261ecc5e69906cdfc489b2ef065944a6` |
| `0.4.0-beta.1.json` | `safe-file-delete` | `.agents/skills/before-backend-dev/SKILL.md` | `` | `4537ccee0071353beee636a052c01642a27a87b6b0a73e7bc872b2501547fa64` |
| `0.4.0-beta.1.json` | `safe-file-delete` | `.agents/skills/before-frontend-dev/SKILL.md` | `` | `679c1708a4d9fbad5214db299a38366581684a9383cf51a5d8ac21f890d6ba0d` |
| `0.4.0-beta.1.json` | `safe-file-delete` | `.agents/skills/check-backend/SKILL.md` | `` | `9b312cfd7a07ed036769b387d84d642cd5e20f06b88e7b6a4626705fa8beb6fa` |
| `0.4.0-beta.1.json` | `safe-file-delete` | `.agents/skills/check-frontend/SKILL.md` | `` | `27b75f9eea472ed104f39a65bb78ae559cfe8730c85e0742e55fd575a4a2f854` |
| `0.4.0-beta.1.json` | `safe-file-delete` | `.kiro/skills/before-backend-dev/SKILL.md` | `` | `4537ccee0071353beee636a052c01642a27a87b6b0a73e7bc872b2501547fa64` |
| `0.4.0-beta.1.json` | `safe-file-delete` | `.kiro/skills/before-frontend-dev/SKILL.md` | `` | `679c1708a4d9fbad5214db299a38366581684a9383cf51a5d8ac21f890d6ba0d` |
| `0.4.0-beta.1.json` | `safe-file-delete` | `.kiro/skills/check-backend/SKILL.md` | `` | `9b312cfd7a07ed036769b387d84d642cd5e20f06b88e7b6a4626705fa8beb6fa` |
| `0.4.0-beta.1.json` | `safe-file-delete` | `.kiro/skills/check-frontend/SKILL.md` | `` | `27b75f9eea472ed104f39a65bb78ae559cfe8730c85e0742e55fd575a4a2f854` |
| `0.4.0-beta.1.json` | `safe-file-delete` | `.qoder/skills/before-backend-dev/SKILL.md` | `` | `4537ccee0071353beee636a052c01642a27a87b6b0a73e7bc872b2501547fa64` |
| `0.4.0-beta.1.json` | `safe-file-delete` | `.qoder/skills/before-frontend-dev/SKILL.md` | `` | `679c1708a4d9fbad5214db299a38366581684a9383cf51a5d8ac21f890d6ba0d` |
| `0.4.0-beta.1.json` | `safe-file-delete` | `.qoder/skills/check-backend/SKILL.md` | `` | `9b312cfd7a07ed036769b387d84d642cd5e20f06b88e7b6a4626705fa8beb6fa` |
| `0.4.0-beta.1.json` | `safe-file-delete` | `.qoder/skills/check-frontend/SKILL.md` | `` | `27b75f9eea472ed104f39a65bb78ae559cfe8730c85e0742e55fd575a4a2f854` |
| `0.4.0-beta.8.json` | `safe-file-delete` | `.agents/skills/parallel/SKILL.md` | `` | `b67b30c4e4fe00e5bc6b2f0da078e6cdfc4f082d5660b00b9ce6cfd6308d7dec` |
| `0.5.0-beta.0.json` | `rename` | `.cursor/commands/trellis-before-dev.md` | `.cursor/skills/trellis-before-dev/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.cursor/commands/trellis-brainstorm.md` | `.cursor/skills/trellis-brainstorm/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.cursor/commands/trellis-break-loop.md` | `.cursor/skills/trellis-break-loop/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.cursor/commands/trellis-check.md` | `.cursor/skills/trellis-check/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.cursor/commands/trellis-update-spec.md` | `.cursor/skills/trellis-update-spec/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.opencode/commands/trellis/before-dev.md` | `.opencode/skills/trellis-before-dev/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.opencode/commands/trellis/brainstorm.md` | `.opencode/skills/trellis-brainstorm/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.opencode/commands/trellis/break-loop.md` | `.opencode/skills/trellis-break-loop/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.opencode/commands/trellis/check.md` | `.opencode/skills/trellis-check/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.opencode/commands/trellis/update-spec.md` | `.opencode/skills/trellis-update-spec/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.codebuddy/commands/trellis/before-dev.md` | `.codebuddy/skills/trellis-before-dev/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.codebuddy/commands/trellis/brainstorm.md` | `.codebuddy/skills/trellis-brainstorm/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.codebuddy/commands/trellis/break-loop.md` | `.codebuddy/skills/trellis-break-loop/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.codebuddy/commands/trellis/check.md` | `.codebuddy/skills/trellis-check/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.codebuddy/commands/trellis/update-spec.md` | `.codebuddy/skills/trellis-update-spec/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.factory/commands/trellis/before-dev.md` | `.factory/skills/trellis-before-dev/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.factory/commands/trellis/brainstorm.md` | `.factory/skills/trellis-brainstorm/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.factory/commands/trellis/break-loop.md` | `.factory/skills/trellis-break-loop/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.factory/commands/trellis/check.md` | `.factory/skills/trellis-check/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.factory/commands/trellis/update-spec.md` | `.factory/skills/trellis-update-spec/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.gemini/commands/trellis/before-dev.toml` | `.gemini/skills/trellis-before-dev/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.gemini/commands/trellis/brainstorm.toml` | `.gemini/skills/trellis-brainstorm/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.gemini/commands/trellis/break-loop.toml` | `.gemini/skills/trellis-break-loop/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.gemini/commands/trellis/check.toml` | `.gemini/skills/trellis-check/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.gemini/commands/trellis/update-spec.toml` | `.gemini/skills/trellis-update-spec/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.github/prompts/before-dev.prompt.md` | `.github/skills/trellis-before-dev/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.github/prompts/brainstorm.prompt.md` | `.github/skills/trellis-brainstorm/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.github/prompts/break-loop.prompt.md` | `.github/skills/trellis-break-loop/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.github/prompts/check.prompt.md` | `.github/skills/trellis-check/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.github/prompts/update-spec.prompt.md` | `.github/skills/trellis-update-spec/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.kilocode/workflows/before-dev.md` | `.kilocode/skills/trellis-before-dev/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.kilocode/workflows/brainstorm.md` | `.kilocode/skills/trellis-brainstorm/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.kilocode/workflows/break-loop.md` | `.kilocode/skills/trellis-break-loop/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.kilocode/workflows/check.md` | `.kilocode/skills/trellis-check/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.kilocode/workflows/update-spec.md` | `.kilocode/skills/trellis-update-spec/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.agent/workflows/before-dev.md` | `.agent/skills/trellis-before-dev/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.agent/workflows/brainstorm.md` | `.agent/skills/trellis-brainstorm/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.agent/workflows/break-loop.md` | `.agent/skills/trellis-break-loop/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.agent/workflows/check.md` | `.agent/skills/trellis-check/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.agent/workflows/update-spec.md` | `.agent/skills/trellis-update-spec/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.windsurf/workflows/trellis-before-dev.md` | `.windsurf/skills/trellis-before-dev/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.windsurf/workflows/trellis-brainstorm.md` | `.windsurf/skills/trellis-brainstorm/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.windsurf/workflows/trellis-break-loop.md` | `.windsurf/skills/trellis-break-loop/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.windsurf/workflows/trellis-check.md` | `.windsurf/skills/trellis-check/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.windsurf/workflows/trellis-update-spec.md` | `.windsurf/skills/trellis-update-spec/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.kiro/skills/before-dev/SKILL.md` | `.kiro/skills/trellis-before-dev/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.kiro/skills/brainstorm/SKILL.md` | `.kiro/skills/trellis-brainstorm/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.kiro/skills/break-loop/SKILL.md` | `.kiro/skills/trellis-break-loop/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.kiro/skills/check/SKILL.md` | `.kiro/skills/trellis-check/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.kiro/skills/update-spec/SKILL.md` | `.kiro/skills/trellis-update-spec/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.qoder/skills/before-dev/SKILL.md` | `.qoder/skills/trellis-before-dev/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.qoder/skills/brainstorm/SKILL.md` | `.qoder/skills/trellis-brainstorm/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.qoder/skills/break-loop/SKILL.md` | `.qoder/skills/trellis-break-loop/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.qoder/skills/check/SKILL.md` | `.qoder/skills/trellis-check/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.qoder/skills/update-spec/SKILL.md` | `.qoder/skills/trellis-update-spec/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.agents/skills/before-dev/SKILL.md` | `.agents/skills/trellis-before-dev/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.agents/skills/brainstorm/SKILL.md` | `.agents/skills/trellis-brainstorm/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.agents/skills/break-loop/SKILL.md` | `.agents/skills/trellis-break-loop/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.agents/skills/check/SKILL.md` | `.agents/skills/trellis-check/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.agents/skills/update-spec/SKILL.md` | `.agents/skills/trellis-update-spec/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.kiro/skills/finish-work/SKILL.md` | `.kiro/skills/trellis-finish-work/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.qoder/skills/finish-work/SKILL.md` | `.qoder/skills/trellis-finish-work/SKILL.md` |  |
| `0.5.0-beta.0.json` | `rename` | `.agents/skills/finish-work/SKILL.md` | `.agents/skills/trellis-finish-work/SKILL.md` |  |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.cursor/commands/trellis-onboard.md` | `` | `420fe6681008e36017e77d1ebcd5db8cba8b966ddc53363aea942b9fefb21892`<br>`ebfbe707f428f036b7d716061dfc33187b940ef9acdf3f824d1c43d1e2035ecb` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.cursor/commands/trellis-parallel.md` | `` | `d2b76e732e625d3d843f97bed96ab5c4b2308aad4b64a93fa1f85553f567e256`<br>`f4c81fe1a468be214caf362263b14b6a6f40935497363109148cb7b19e644738` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.cursor/commands/trellis-create-command.md` | `` | `6147b410be59a00b886162ee0785f4bb020998ef8f9fa2bbc68ed5deea20f36c`<br>`9a9283add72832e0e015de770531edf37cf3720e4a72782c1cea6e9941603490` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.cursor/commands/trellis-integrate-skill.md` | `` | `bb15144c308939abfd41cb008da71088910b6ec432c763ab4c0762dd6f0819e8` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.cursor/commands/trellis-check-cross-layer.md` | `` | `a79fe38f29f84a4524a70987e9fecfca569430df476082bff9dde31596ca3951` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.cursor/commands/trellis-record-session.md` | `` | `33b5626fcf03a57578f46133b2a14c6bbe19c4ef29652af3f828f24f448f5926`<br>`a69db6163674ec95c98b7bcbed414ad1d0747b0f48f3d404dd051a2a5d33979d`<br>`0c4f61283c2f262c1f9c900d9207309107497d4ac848cca86eb62bc5b7189fe7`<br>`1eed78b300672b7f8064d226e93d1025062cf3a5c19e45aa6343838158fc37bc`<br>`c151abf0271cc2f4e374f168658dcdf61c5fcf903c2ef641ebdb79615a88d88b` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.opencode/commands/trellis/onboard.md` | `` | `cf9591fcddc412ff80772bf441c8d94d7724e6713fdf38a04a3348ab8949e64e`<br>`a5dbd5db094b13fd006ec856efa53a688e209bcdc3ed1680b63b15f1e3293ab4` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.opencode/commands/trellis/create-command.md` | `` | `b3c3ad4e34113cf67af8a94ac78d7d32078e93d318c23a1c27596944b4cb2c1d`<br>`230640908f2863f0cf2d7dc0cd2b61782b77d75fc02636d6d46b22d00ccb3465` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.opencode/commands/trellis/integrate-skill.md` | `` | `3940442485341832257c595ddfb45582e2d60e5a4716f2bd15b7bce0498b130a` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.opencode/commands/trellis/check-cross-layer.md` | `` | `b9ab24515ead84330d6634f6ad912ca3547db3a36139d62c5688161824097d60` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.opencode/commands/trellis/record-session.md` | `` | `33b5626fcf03a57578f46133b2a14c6bbe19c4ef29652af3f828f24f448f5926`<br>`a69db6163674ec95c98b7bcbed414ad1d0747b0f48f3d404dd051a2a5d33979d`<br>`0c4f61283c2f262c1f9c900d9207309107497d4ac848cca86eb62bc5b7189fe7`<br>`1eed78b300672b7f8064d226e93d1025062cf3a5c19e45aa6343838158fc37bc`<br>`c151abf0271cc2f4e374f168658dcdf61c5fcf903c2ef641ebdb79615a88d88b` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.opencode/commands/trellis/parallel.md` | `` | `9c383b9622c6bedc45f4184cc05f73a0e5087a1d88072e31ad84703d07a14c70`<br>`82e7a5214b48ffdea9063109f89a8428d7c077e0beb4cc86d4836394e47a1e21` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.gemini/commands/trellis/onboard.toml` | `` | `8e819f01e69476d667bad174bd3ad3f1fae639b56fb05a888675e78e64a3d43d`<br>`d4343f29d5e9cb56c03150e58d000f3a9adc088216f07fbc4d6b615f7c2f74a7` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.gemini/commands/trellis/create-command.toml` | `` | `41e2e59d4da80a37c8e6fe71a6670fc07772f3eb4f4894e5621dc428714656c6`<br>`80718724d2c2421fda719fec3be9a0dcd0e90085be87d4fcf43df93ef6c7e570` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.gemini/commands/trellis/integrate-skill.toml` | `` | `47a522dac5f78eef666a05bb72b14e86023a5dda44d9b5c2355798fc54e9bbd0` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.gemini/commands/trellis/check-cross-layer.toml` | `` | `2f2e6d2167c335d5fa29147266e831aa066c18b0449707dbd864a2fb849c08c2` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.gemini/commands/trellis/record-session.toml` | `` | `eea81b0ea17256abdbf4005c609738b01f3029c5e34e16935d8c10c5bb710c3e`<br>`17f08b3158fb47320df88f942429ac2568e80a375c753ff69d4b1ac66568d1f3`<br>`0a2c7139b13bfccd862db4a27a53dbd65803d3875eb82302418c6bfaaac68ff7`<br>`d08a2fc7f463844d4fde0e20dd9c709728a1593e9704a2bcc912a7b488d5e7a6`<br>`02219ef096bb0fa171e20268ee8a29e82f385dcfbda70956ba771859f2364457` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.kilocode/workflows/onboard.md` | `` | `cf9591fcddc412ff80772bf441c8d94d7724e6713fdf38a04a3348ab8949e64e`<br>`a5dbd5db094b13fd006ec856efa53a688e209bcdc3ed1680b63b15f1e3293ab4` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.kilocode/workflows/create-command.md` | `` | `8534191135a7a352e7b9c45b8eb64b4bf2efd11d24605718967673fca73b4e77`<br>`4cbee2084b89f57bf135fc7105c4134d6096c78473396cb3fe43761fdaa6bcc5` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.kilocode/workflows/integrate-skill.md` | `` | `3940442485341832257c595ddfb45582e2d60e5a4716f2bd15b7bce0498b130a` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.kilocode/workflows/check-cross-layer.md` | `` | `b9ab24515ead84330d6634f6ad912ca3547db3a36139d62c5688161824097d60` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.kilocode/workflows/record-session.md` | `` | `33b5626fcf03a57578f46133b2a14c6bbe19c4ef29652af3f828f24f448f5926`<br>`a69db6163674ec95c98b7bcbed414ad1d0747b0f48f3d404dd051a2a5d33979d`<br>`0c4f61283c2f262c1f9c900d9207309107497d4ac848cca86eb62bc5b7189fe7`<br>`1eed78b300672b7f8064d226e93d1025062cf3a5c19e45aa6343838158fc37bc`<br>`c151abf0271cc2f4e374f168658dcdf61c5fcf903c2ef641ebdb79615a88d88b` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.kilocode/workflows/parallel.md` | `` | `9c383b9622c6bedc45f4184cc05f73a0e5087a1d88072e31ad84703d07a14c70`<br>`82e7a5214b48ffdea9063109f89a8428d7c077e0beb4cc86d4836394e47a1e21` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.iflow/commands/trellis/onboard.md` | `` | `cf9591fcddc412ff80772bf441c8d94d7724e6713fdf38a04a3348ab8949e64e`<br>`a5dbd5db094b13fd006ec856efa53a688e209bcdc3ed1680b63b15f1e3293ab4` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.iflow/commands/trellis/create-command.md` | `` | `b61fd91086641eb31bda18a8bf6824e9ecfc59e381d9bfd028744ff26021d760`<br>`bbad48da343dfc8dc9536bf4a1a2134fadb4e8665471a6c60ae9344344989994` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.iflow/commands/trellis/integrate-skill.md` | `` | `fbed52bfb80d2ef58d9267cd79ecdc9ee2ca9ff4a971a0318bf3c467e00b8aeb` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.iflow/commands/trellis/check-cross-layer.md` | `` | `b9ab24515ead84330d6634f6ad912ca3547db3a36139d62c5688161824097d60` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.iflow/commands/trellis/record-session.md` | `` | `33b5626fcf03a57578f46133b2a14c6bbe19c4ef29652af3f828f24f448f5926`<br>`a69db6163674ec95c98b7bcbed414ad1d0747b0f48f3d404dd051a2a5d33979d`<br>`0c4f61283c2f262c1f9c900d9207309107497d4ac848cca86eb62bc5b7189fe7`<br>`1eed78b300672b7f8064d226e93d1025062cf3a5c19e45aa6343838158fc37bc`<br>`c151abf0271cc2f4e374f168658dcdf61c5fcf903c2ef641ebdb79615a88d88b` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.iflow/commands/trellis/parallel.md` | `` | `d2b76e732e625d3d843f97bed96ab5c4b2308aad4b64a93fa1f85553f567e256`<br>`f4c81fe1a468be214caf362263b14b6a6f40935497363109148cb7b19e644738` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.kiro/skills/onboard/SKILL.md` | `` | `ec6db142f763c81a3273be45b5d7726f695c32aaa5404e90dbd6e40aec92fb98`<br>`1d0dac79bdf4e1e9151ec726f31007653c318af39ff90c141d6b213d86315682`<br>`1808f578d21eae3cbcf650d6aa4cf35ac42bf466df740b830593c9bda212d51a` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.kiro/skills/create-command/SKILL.md` | `` | `da455ed21ab4e242ba1f59d23481daef9ee142550641681996e73a8261003c74`<br>`b93d71dfd83ee688659fb62507a2433049e66bbe3542b97ada347e47b2867b76`<br>`e564e1efc9c3d505673982ba4390f93dcefc10b02cd24c750ac968cddae53c71` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.kiro/skills/integrate-skill/SKILL.md` | `` | `26508bea3ccf8c9c6c9fed5edb0c41706f16a57e39b9104e0cab9b6d14853e60`<br>`acce65fe98da9017372071d219f89ae8d5ace11e8e301436c2b7df895da26f5d` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.kiro/skills/check-cross-layer/SKILL.md` | `` | `4de11e856524f2cc5d4ff78aa85c286a553e82714c3c4506da5ad00d32d76324`<br>`bc72df11d79a8ee809f45eae120c1cce91ab997541ce30d665af9978c83843f6` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.kiro/skills/record-session/SKILL.md` | `` | `6707f3df209a4064d1617ea92807265829a62a0343b3da9fdeac289187730626`<br>`2f3781d894b7a45b517d36845fa18e6fac98acad40e77438a3d85760f1d7d247`<br>`9e10edd5723b54944b82ee85a4bd52fc0e066e6fd9dbed2761d9c4bcfbb5f9c2`<br>`ce27e953630a71ef989c5582790e9c8a600a2614ec668b674816c1daac73ce0a`<br>`8d9659b68d765a1bf5ca345150f1f4d39f174767d0ebec04d24d147afa7023cf`<br>`d1257c53757ca590c18b341ac250e943570e263e7103bd07a129cfc10d3a7978` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.qoder/skills/onboard/SKILL.md` | `` | `d58cbf875f3abe1ec510a9491119ddbabafb817decdbe391ba93824c76c6e69e`<br>`c6ba149e58e8bf45c6be58ef1f427c80977daf49afb99b50df4727abce6e4039`<br>`7694740d79d1e1baeb414072ec94b1d909f37aea06dbe23e5be3b0e9b03d01ed` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.qoder/skills/create-command/SKILL.md` | `` | `1912619f50523ae55e6055c0d89fba3b9d0b0e378c33cd9842281376ccf4f7f3`<br>`efe15fccf3cd0455d919cf89d9522a7eec559ed4b0c967baba67bdc5a85a1f0f`<br>`58a574f3336cb0cd9b01f10fa8979b0801ea77387461781f50850877754ac5b1` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.qoder/skills/integrate-skill/SKILL.md` | `` | `ebabaa7c6f706a03f73e04888f54bcfaba17db5c3c0713603b31c93622bcb86a`<br>`155d2820fdfe0d0edfd58a335d3190d2c6a5d1a51c5314b975001c14cc269ab6` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.qoder/skills/check-cross-layer/SKILL.md` | `` | `894c6b7673725d7a82b72ee5ee00580ff9805ca587e654f4577288c58d85a529`<br>`826eae1f9cca5d9789ec8e5b0cde13b1fafcd26426d6571c491b7a13afcae001` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.qoder/skills/record-session/SKILL.md` | `` | `eb8a56a09572dd1d926c9dcaccc82e1973e3f1f4dcb0497eae1733b3bec0d086`<br>`27d1a5bdeb28660955d679de7109b1379ebf9f5c6a0666c786e50c6bb9035a5d`<br>`cde5ba881fca8402345515dbaad59d140e5a2d5881d0319d390cbc184156f597`<br>`2a41536bb6e22a604522e7e03db139ac67dd9227bbbda6fa67048bfb207ce110`<br>`a0d3703f64cb23f7a686e4183876b971f3b6a899424030a385d5bc91f57e1794`<br>`7772b7404fd5585eaafb4f5e35ad672d55397d865f52ec715f7d1a93f90f475b` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.agents/skills/onboard/SKILL.md` | `` | `ec6db142f763c81a3273be45b5d7726f695c32aaa5404e90dbd6e40aec92fb98`<br>`1d0dac79bdf4e1e9151ec726f31007653c318af39ff90c141d6b213d86315682`<br>`1808f578d21eae3cbcf650d6aa4cf35ac42bf466df740b830593c9bda212d51a` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.agents/skills/create-command/SKILL.md` | `` | `ede895ad28e53c960736043f03e105dc95d0038f2965860d1c32de63dc77ba88`<br>`679cd2f00751642845b81ce7dd35368f2232d2b364292d4a056d7b9f8c90ae52`<br>`5c24ca19c1cec64486f1a147e1dd4a37200270cbf3d0987dc6536f7de85a78f2` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.agents/skills/integrate-skill/SKILL.md` | `` | `2d4da52f3f09fb8b92011f2019ad9e28a20054d577c212c9ed6f2bf156b59d52`<br>`47b7374345d8a31f9df07c5e8e875ca4fdc30d0cc45860d77df893250e2d97fc` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.agents/skills/check-cross-layer/SKILL.md` | `` | `4de11e856524f2cc5d4ff78aa85c286a553e82714c3c4506da5ad00d32d76324`<br>`bc72df11d79a8ee809f45eae120c1cce91ab997541ce30d665af9978c83843f6` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.agents/skills/record-session/SKILL.md` | `` | `6707f3df209a4064d1617ea92807265829a62a0343b3da9fdeac289187730626`<br>`2f3781d894b7a45b517d36845fa18e6fac98acad40e77438a3d85760f1d7d247`<br>`9e10edd5723b54944b82ee85a4bd52fc0e066e6fd9dbed2761d9c4bcfbb5f9c2`<br>`ce27e953630a71ef989c5582790e9c8a600a2614ec668b674816c1daac73ce0a`<br>`8d9659b68d765a1bf5ca345150f1f4d39f174767d0ebec04d24d147afa7023cf`<br>`d1257c53757ca590c18b341ac250e943570e263e7103bd07a129cfc10d3a7978` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.agents/skills/parallel/SKILL.md` | `` | `b4f963df475b818e26a9edea718c630b289cb137c11994d8395535de6ab0931c` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.windsurf/workflows/trellis-onboard.md` | `` | `6706be65564d5612d3add01c7731e25ccfb5d9c8eba0e639049f549ef3728dbf` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.windsurf/workflows/trellis-create-command.md` | `` | `fac03e217edc159cd4b24d6bd39564bce55720aa2908eaf9575b1df02af0b93a` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.windsurf/workflows/trellis-integrate-skill.md` | `` | `bb8e1b732275e6302390b90df71be4f7ff97b2da9300e6f08e50eb7b5d7091aa` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.windsurf/workflows/trellis-check-cross-layer.md` | `` | `7140c99e063b38f6c51b3ade0bc9fb1eb9c651dbc10f6f38a4618b6a9ddf13f8` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.windsurf/workflows/trellis-record-session.md` | `` | `6ab51c9db85650b90dc86d8c57223f2d551462f27bd79a78d02e9c76bb9df39a` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.codebuddy/commands/trellis/onboard.md` | `` | `cf9591fcddc412ff80772bf441c8d94d7724e6713fdf38a04a3348ab8949e64e` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.codebuddy/commands/trellis/create-command.md` | `` | `105637633b1f75165afabe4e3437cdef16a9ee821b957712f7c082be062e402a` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.codebuddy/commands/trellis/integrate-skill.md` | `` | `3940442485341832257c595ddfb45582e2d60e5a4716f2bd15b7bce0498b130a` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.codebuddy/commands/trellis/check-cross-layer.md` | `` | `b9ab24515ead84330d6634f6ad912ca3547db3a36139d62c5688161824097d60` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.codebuddy/commands/trellis/record-session.md` | `` | `a69db6163674ec95c98b7bcbed414ad1d0747b0f48f3d404dd051a2a5d33979d` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.factory/commands/trellis/onboard.md` | `` | `aace2b0bc63296dc34e8665d1048fbb5e91288c91e837f7070e95e466bffadc4` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.factory/commands/trellis/create-command.md` | `` | `8d450d7ff866d05bce66cb43deac3ccd6cc504b0079d1e6924ab349e4f6d4fe7` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.factory/commands/trellis/integrate-skill.md` | `` | `f8d5e68afe6358f04392469300af32d9bd0e8161990f27d208b8841c656bfd15` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.factory/commands/trellis/check-cross-layer.md` | `` | `248388092ce8a6baa1bbb987d46e8311a80f824d340c315070d24113a1a1220f` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.factory/commands/trellis/record-session.md` | `` | `2702b84edbb6eb1fcb46a5ea70d6beeb0186b1bdea4817e059f2881d6e09d2ca` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.github/prompts/onboard.prompt.md` | `` | `dc320c2fa8cf54dec1f4abae7b620c812311eab02bbcf6c65a7904b4d8cc63ed` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.github/prompts/create-command.prompt.md` | `` | `e73b8bb6f078262f734c729ca339f958814b1309f539c140810fb2502d10bee0` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.github/prompts/integrate-skill.prompt.md` | `` | `149f13388f8dc3f51c9cda8398a5f6f445198e6c2e8ab324273112b3d6e2f1b7` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.github/prompts/check-cross-layer.prompt.md` | `` | `5400f00a393debed6d9b45e9896270378e5f148e05451e45c978eab129c810ee` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.github/prompts/record-session.prompt.md` | `` | `2e088414e2a47e23f3e363f0e96af94a6716d49001dacfa168fdb4f43eb71cb3` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.github/prompts/parallel.prompt.md` | `` | `83dfdd76fb4afa44c48ba3d518dd3649a1e35cbfb037db3e359cfc13aa55255b` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.iflow/agents/debug.md` | `` | `b707543aa4020e25694522583b7a4695243d057e253f437a8444c0acb7d7ee4f` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.iflow/agents/dispatch.md` | `` | `157338d0143fa1ff307adb97f776df8b4d3db8757786b9006c1aafa484c2f27e`<br>`f8a0928be1fa822c8247bf7c0da8709c38da83d4cca3359f381d9619b91b46bc` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.iflow/agents/plan.md` | `` | `38a853094523b65734578b23f00fc40768a9a32553a9812a46f9385bff125b7f` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.opencode/agents/debug.md` | `` | `0bac1d723fb3634ea95c471a22245eff2b4c9d6bd98bc66cafacf6a0092609bb` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.opencode/agents/dispatch.md` | `` | `f1e90f5967c7c4d61fce58df2a1e8592d1bfd4e76f2d1761916b8dc3b0b435b9`<br>`cb1c9270d509e44f0f7242f7a17927d23353ef7e68d834a4dc0027d44cccc0cb`<br>`23d7834c540907c98f7988661849db5d949ee394470952215c373aef926fec81` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.opencode/agents/trellis-plan.md` | `` | `36de06c7eddbff290acb3c200f30af96291048e492ce2f2d8b7038662eeb572b` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.iflow/hooks/ralph-loop.py` | `` | `e627124495ade6811ef6f28082cd22f24936bb7a35f12ff8705e484e12b2fc94`<br>`a367a5dd4f605730cf8157c61658e848176ae480be19029126ff9bbd90a37712` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.iflow/hooks/session-start.py` | `` | `73274720fc83529dd25cdd8a97b1111ce85f34ece3d28317dbe60a89680ec683`<br>`9e7f3dea72900d3d6353ecd1a5b1b670260325233dd5eb13e855addfcc93e3fe`<br>`9e1b3e5a0362e43b5e282ef7d5b32d14beababa708aec3882259b800f72f03d7`<br>`4f1792cb545f895d7a55bbaaaa00c91100bda27d371610e1c524ad1cb09b6e6a`<br>`223caadc717949125eb574abc79b09365324c6a85357c8e9bc28d5cf232a931a`<br>`40738a6c1fa98cc47047b5d89eaf22c18be0e3ff1ccf0a5b2ee9244ad941c3b9`<br>`5b4fde809b552790de9f14c0fb99acc2195edf456cc8f2e68e800458e6019f84`<br>`8d0a944ae82b15e02c2db12374f0dc186144d6c43de13528dbbe19299514150f`<br>`f27aa113830e149699131c27cdcb506687b95677680f132a3c20969260c87d0d`<br>`57c9a517327f0ebbee00835ec22305847a2626cd07fb70af9eda4afd1ce1b94b`<br>`3c9e382013ad0bce2ce20eb9a5b27414bfe7c688b6212e918340437daaeb53d5` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.iflow/hooks/inject-subagent-context.py` | `` | `0ed34553db3c52cd9fc8d53a102a42bac4d41d31960bf749c5b9c201a2772d08`<br>`07b5837e1676e465413782cd1aafc1b848f0f539b29208e1d54e328487f6ede0`<br>`ba8b9c7087c702e459d9038ade263e76b9ce4bbcf212477d21c0542c0b01a8b5` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.iflow/agents/check.md` | `` | `2b5ef0bfd9d43c3f7c3042d60eb94ff443ca0aa7b7181812196fc8a434baf2e3` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.iflow/agents/implement.md` | `` | `9f5dcf3aafc522d300cf4c7ac8a86cf6b7809dbea3694453233ea455cb272911`<br>`2452f31c5b698bd855fc94eb5fa8d40cc5fd971801d1dfecbf01f8da8b4bca6a` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.iflow/agents/research.md` | `` | `a72142d146df1b0c239aebc20db2186781fe9e8ddb3d61c48e9ad7391ecc4599` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.iflow/settings.json` | `` | `d06ecd16d3eb81f6b5b7ed80662f3b50c0efb3e7f5419119de89c4c515289c89`<br>`2165c47b15e7ac38a575cf816e7c9f1bf04c3f5e87955685e13154e1bf0ff5d8` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.iflow/commands/trellis/before-dev.md` | `` | `dd926596f3139c12d42469fb5147ac90724e3a7baca5591384f4f4bbdd530b54` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.iflow/commands/trellis/brainstorm.md` | `` | `7c7731eda092275a5d87f2569a69584f3c39b544a126a76e727a1e9d250c4a65` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.iflow/commands/trellis/break-loop.md` | `` | `ba4dd4022dde1e4bbcfc1cc99e6a118e51b9db95bd962d88f1c29d0c9c433112` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.iflow/commands/trellis/check.md` | `` | `8b0d20b425b6030d13ac5aa0c876c5ec97cf7aca9b050f574f07f281ad25bd06` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.iflow/commands/trellis/finish-work.md` | `` | `cc92cad9e94ce1cc4f29e3de16a640db7e9176e3ecfc9c19a566153671ca2168` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.iflow/commands/trellis/start.md` | `` | `34ecead84912a4338575f8648a9d449f89dfb4d4725416c889dac03586f98800`<br>`2d4259d8d146d32c7b6c33dda36c14da76e1c3f1be35b27dc18e5eb5551c9276`<br>`98fd4a940788f73da22f81632d3c271b61d6bcb7c515ecc609ae4a651b0579d7`<br>`7f3c447ca608a6ae69d31bca69bf795e15457b2d151c1202cf86ba6bbcfa3e05`<br>`a46a479f3626beb595aa45a6124df8b1a6a67bbf5cdda8850c1a5fd18f5f5c05` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.iflow/commands/trellis/update-spec.md` | `` | `ff4d5a0405a763e61936f5b9df175fd25ea20ec5c20fa999855020ab78a919b6` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.agents/skills/start/SKILL.md` | `` | `8853e4ddc1681e043dec34be76c7c6fd961a3d52cbd0a2320225d72440425639` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.codebuddy/commands/trellis/start.md` | `` | `110f0976b965b4d50adb2898e609cee7f5f57f19ea48750c727895bb9bc1d2f3` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.cursor/commands/trellis-start.md` | `` | `f03c7c1fde78c60ac8604938f1af7b2b54ef3cb4caf200d88edbbc8fc8d58c8f` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.factory/commands/trellis/start.md` | `` | `bf9800dff1819312e6a00fb8382c58ee7ca9d6828048ae447c036683f3801fb9` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.gemini/commands/trellis/start.toml` | `` | `ed53363d1d98c5d7ff1493cf585493820743339cf33e7ecd63349e46b28156c7` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.github/prompts/start.prompt.md` | `` | `7c99eedf8649a7242f741c099e80bb92df111de36292b33505760f7c0cb105f9` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.kiro/skills/start/SKILL.md` | `` | `8853e4ddc1681e043dec34be76c7c6fd961a3d52cbd0a2320225d72440425639` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.opencode/commands/trellis/start.md` | `` | `84e76dea69542515e234f8b551491ca6bb31fe441ef702a43ff12c3b8397d5fe` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.qoder/skills/start/SKILL.md` | `` | `ec6034801518a14aaf09fbf4aeab5f210a3d16177bafdd01b5a11883efa85b9e` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.agent/workflows/improve-ut.md` | `` | `48ec1a0178adf224709773a90a95a6c5a16587c39940393fa4a1a1631bc4c920` |
| `0.5.0-beta.0.json` | `safe-file-delete` | `.agents/skills/improve-ut/SKILL.md` | `` | `b63988e1b7de101dedc79cf7acba53f8d4bbcc05750aab19bbe23c74ee2e693e` |
| `0.5.0-beta.15.json` | `safe-file-delete` | `.cursor/hooks/statusline.py` | `` | `87c01ee786ca9e1f25b591f0ed67564cd430586d57516d5b6fc57c34b6e7a3ec`<br>`c92c0020a0c60308437b66f024a244303e708519c97089cf654ceddc144f7435`<br>`b9b0a39a486643f2b78ecb3c757459182a6326ea070ba34a49887e23adc40bbb` |
| `0.5.0-beta.15.json` | `safe-file-delete` | `.gemini/hooks/statusline.py` | `` | `87c01ee786ca9e1f25b591f0ed67564cd430586d57516d5b6fc57c34b6e7a3ec`<br>`c92c0020a0c60308437b66f024a244303e708519c97089cf654ceddc144f7435`<br>`b9b0a39a486643f2b78ecb3c757459182a6326ea070ba34a49887e23adc40bbb` |
| `0.5.0-beta.15.json` | `safe-file-delete` | `.qoder/hooks/statusline.py` | `` | `87c01ee786ca9e1f25b591f0ed67564cd430586d57516d5b6fc57c34b6e7a3ec`<br>`c92c0020a0c60308437b66f024a244303e708519c97089cf654ceddc144f7435`<br>`b9b0a39a486643f2b78ecb3c757459182a6326ea070ba34a49887e23adc40bbb` |
| `0.5.0-beta.15.json` | `safe-file-delete` | `.github/copilot/hooks/statusline.py` | `` | `87c01ee786ca9e1f25b591f0ed67564cd430586d57516d5b6fc57c34b6e7a3ec`<br>`c92c0020a0c60308437b66f024a244303e708519c97089cf654ceddc144f7435`<br>`b9b0a39a486643f2b78ecb3c757459182a6326ea070ba34a49887e23adc40bbb` |
| `0.5.0-beta.15.json` | `safe-file-delete` | `.codebuddy/hooks/statusline.py` | `` | `87c01ee786ca9e1f25b591f0ed67564cd430586d57516d5b6fc57c34b6e7a3ec`<br>`c92c0020a0c60308437b66f024a244303e708519c97089cf654ceddc144f7435`<br>`b9b0a39a486643f2b78ecb3c757459182a6326ea070ba34a49887e23adc40bbb` |
| `0.5.0-beta.15.json` | `safe-file-delete` | `.factory/hooks/statusline.py` | `` | `87c01ee786ca9e1f25b591f0ed67564cd430586d57516d5b6fc57c34b6e7a3ec`<br>`c92c0020a0c60308437b66f024a244303e708519c97089cf654ceddc144f7435`<br>`b9b0a39a486643f2b78ecb3c757459182a6326ea070ba34a49887e23adc40bbb` |
| `0.5.0-beta.15.json` | `safe-file-delete` | `.kiro/hooks/statusline.py` | `` | `87c01ee786ca9e1f25b591f0ed67564cd430586d57516d5b6fc57c34b6e7a3ec`<br>`c92c0020a0c60308437b66f024a244303e708519c97089cf654ceddc144f7435`<br>`b9b0a39a486643f2b78ecb3c757459182a6326ea070ba34a49887e23adc40bbb` |
| `0.5.0-beta.15.json` | `safe-file-delete` | `.kiro/hooks/session-start.py` | `` | `26b52ad72259316aa5adc8068d0df2a002273d5eda659ac3c71f3f5ecd9ebd08`<br>`ddd59c6fc5e6fa8c8535d6ac375ecaad60f15b87abc6dfc279007e610c636dd8`<br>`597409062bed8f9977750fa6262bb997facce7d8377d3482d4bcb2054e19c491`<br>`6cf36cffba3cf4a3caff99606d9fc9dde07fa4f74b7227aeb08d3de00ced7ca2`<br>`373f2f41c5506982cef1049f0203ca9e442c8074f54880aa021f037c0b9300b0`<br>`bc2026f6b1c195432e1126e1388d11fccec2df7a72010d0daa9fb6af76f683dd`<br>`cf355e44ace5e9b7c7d9a416462d4057a6cff9d5905b8db1839e6e4c892cfd13`<br>`a1b0db7c264da8e7abeb378a16ba8132b99b9918c9546627137d69427108f4b6`<br>`a0256292a2ade20728d71d2ea9a7ce866f6955efe034934eaecbf820244e9ad8` |
| `0.5.0-beta.15.json` | `safe-file-delete` | `.kiro/hooks/inject-workflow-state.py` | `` | `281939a51a62467a5dd73947fdec7143d0e936b4b64b5224ce0484186eb5b018`<br>`4231e4e0d52c9b05d66a215c870db30a876201a51350e5191953418ca4ec4637`<br>`50bd086d40654b9fe8cb902d2f321ce06e39b6d4020a6e9aa49154cc371bdb16` |
| `0.5.0-beta.5.json` | `rename` | `.cursor/agents/implement.md` | `.cursor/agents/trellis-implement.md` |  |
| `0.5.0-beta.5.json` | `rename` | `.cursor/agents/check.md` | `.cursor/agents/trellis-check.md` |  |
| `0.5.0-beta.5.json` | `rename` | `.cursor/agents/research.md` | `.cursor/agents/trellis-research.md` |  |
| `0.5.0-beta.5.json` | `rename` | `.opencode/agents/implement.md` | `.opencode/agents/trellis-implement.md` |  |
| `0.5.0-beta.5.json` | `rename` | `.opencode/agents/check.md` | `.opencode/agents/trellis-check.md` |  |
| `0.5.0-beta.5.json` | `rename` | `.opencode/agents/research.md` | `.opencode/agents/trellis-research.md` |  |
| `0.5.0-beta.5.json` | `rename` | `.kiro/agents/implement.json` | `.kiro/agents/trellis-implement.json` |  |
| `0.5.0-beta.5.json` | `rename` | `.kiro/agents/check.json` | `.kiro/agents/trellis-check.json` |  |
| `0.5.0-beta.5.json` | `rename` | `.kiro/agents/research.json` | `.kiro/agents/trellis-research.json` |  |
| `0.5.0-beta.5.json` | `rename` | `.gemini/agents/implement.md` | `.gemini/agents/trellis-implement.md` |  |
| `0.5.0-beta.5.json` | `rename` | `.gemini/agents/check.md` | `.gemini/agents/trellis-check.md` |  |
| `0.5.0-beta.5.json` | `rename` | `.gemini/agents/research.md` | `.gemini/agents/trellis-research.md` |  |
| `0.5.0-beta.5.json` | `rename` | `.qoder/agents/implement.md` | `.qoder/agents/trellis-implement.md` |  |
| `0.5.0-beta.5.json` | `rename` | `.qoder/agents/check.md` | `.qoder/agents/trellis-check.md` |  |
| `0.5.0-beta.5.json` | `rename` | `.qoder/agents/research.md` | `.qoder/agents/trellis-research.md` |  |
| `0.5.0-beta.5.json` | `rename` | `.codebuddy/agents/implement.md` | `.codebuddy/agents/trellis-implement.md` |  |
| `0.5.0-beta.5.json` | `rename` | `.codebuddy/agents/check.md` | `.codebuddy/agents/trellis-check.md` |  |
| `0.5.0-beta.5.json` | `rename` | `.codebuddy/agents/research.md` | `.codebuddy/agents/trellis-research.md` |  |
| `0.5.0-beta.5.json` | `rename` | `.github/agents/implement.agent.md` | `.github/agents/trellis-implement.agent.md` |  |
| `0.5.0-beta.5.json` | `rename` | `.github/agents/check.agent.md` | `.github/agents/trellis-check.agent.md` |  |
| `0.5.0-beta.5.json` | `rename` | `.github/agents/research.agent.md` | `.github/agents/trellis-research.agent.md` |  |
| `0.5.0-beta.5.json` | `rename` | `.factory/droids/implement.md` | `.factory/droids/trellis-implement.md` |  |
| `0.5.0-beta.5.json` | `rename` | `.factory/droids/check.md` | `.factory/droids/trellis-check.md` |  |
| `0.5.0-beta.5.json` | `rename` | `.factory/droids/research.md` | `.factory/droids/trellis-research.md` |  |
| `0.5.0-beta.9.json` | `safe-file-delete` | `.qoder/skills/trellis-finish-work/SKILL.md` | `` | `c0f3ffa74e1e9990f93e5d44d03bd088c8698da1db4750b74d3eee4809a84aea`<br>`2027d8ea610e0a929a7ce147b29045406db8a8c9c2a767f98d779e5d53162f0c` |
| `0.5.0-beta.9.json` | `safe-file-delete` | `.qoder/skills/trellis-continue/SKILL.md` | `` | `914545dab290e508a4c6b84d0a9f8debe68bcf9117cebe0fa85be0ef709d8fc1`<br>`3d2c83ad710b3b667851e28a473fb259a1330475e6b7417c769432f4a55a76f9` |
| `0.6.0-beta.23.json` | `rename-dir` | `.cursor/skills/trellis-spec-bootstarp` | `.cursor/skills/trellis-spec-bootstrap` |  |
| `0.6.0-beta.23.json` | `rename-dir` | `.opencode/skills/trellis-spec-bootstarp` | `.opencode/skills/trellis-spec-bootstrap` |  |
| `0.6.0-beta.23.json` | `rename-dir` | `.agents/skills/trellis-spec-bootstarp` | `.agents/skills/trellis-spec-bootstrap` |  |
| `0.6.0-beta.23.json` | `rename-dir` | `.kiro/skills/trellis-spec-bootstarp` | `.kiro/skills/trellis-spec-bootstrap` |  |
| `0.6.0-beta.23.json` | `rename-dir` | `.qoder/skills/trellis-spec-bootstarp` | `.qoder/skills/trellis-spec-bootstrap` |  |
| `0.6.0-beta.23.json` | `rename-dir` | `.codebuddy/skills/trellis-spec-bootstarp` | `.codebuddy/skills/trellis-spec-bootstrap` |  |
| `0.6.0-beta.23.json` | `rename-dir` | `.github/skills/trellis-spec-bootstarp` | `.github/skills/trellis-spec-bootstrap` |  |
| `0.6.0-beta.23.json` | `rename-dir` | `.factory/skills/trellis-spec-bootstarp` | `.factory/skills/trellis-spec-bootstrap` |  |
| `0.6.0-beta.23.json` | `rename-dir` | `.pi/skills/trellis-spec-bootstarp` | `.pi/skills/trellis-spec-bootstrap` |  |
| `0.6.0-beta.23.json` | `rename-dir` | `.agent/skills/trellis-spec-bootstarp` | `.agent/skills/trellis-spec-bootstrap` |  |
| `0.6.0-beta.23.json` | `rename-dir` | `.windsurf/skills/trellis-spec-bootstarp` | `.windsurf/skills/trellis-spec-bootstrap` |  |
| `0.6.0-beta.23.json` | `rename-dir` | `.kilocode/skills/trellis-spec-bootstarp` | `.kilocode/skills/trellis-spec-bootstrap` |  |
| `0.6.3.json` | `rename-dir` | `.windsurf/workflows` | `.devin/workflows` |  |
| `0.6.3.json` | `rename-dir` | `.windsurf/skills` | `.devin/skills` |  |
| `0.6.6.json` | `rename-dir` | `.zcode/cli/agents` | `.zcode/agents` |  |

### Complete `safe-file-delete` Hash Inventory

| Manifest | Path | Allowed hashes |
|---|---|---|
| `0.4.0-beta.1.json` | `.claude/commands/trellis/before-backend-dev.md` | `7e35444de2a5779ef39944f17f566ea21d2ed7f4994246f4cfe6ebf9a11dd3e3` |
| `0.4.0-beta.1.json` | `.claude/commands/trellis/before-frontend-dev.md` | `a6225f9d123dbd4a7aec822652030cae50be3f5b308297015e04d42b23a27b2a` |
| `0.4.0-beta.1.json` | `.claude/commands/trellis/check-backend.md` | `4e81a28d681ea770f780df55a212fd504ce21ee49b44ba16023b74b5c243cef3` |
| `0.4.0-beta.1.json` | `.claude/commands/trellis/check-frontend.md` | `5e8e3b682032ba0dd6bb843dd4826fff0159f78a7084964ccb119c6cf98b3d91` |
| `0.4.0-beta.1.json` | `.cursor/commands/trellis-before-backend-dev.md` | `7e35444de2a5779ef39944f17f566ea21d2ed7f4994246f4cfe6ebf9a11dd3e3` |
| `0.4.0-beta.1.json` | `.cursor/commands/trellis-before-frontend-dev.md` | `a6225f9d123dbd4a7aec822652030cae50be3f5b308297015e04d42b23a27b2a` |
| `0.4.0-beta.1.json` | `.cursor/commands/trellis-check-backend.md` | `4e81a28d681ea770f780df55a212fd504ce21ee49b44ba16023b74b5c243cef3` |
| `0.4.0-beta.1.json` | `.cursor/commands/trellis-check-frontend.md` | `5e8e3b682032ba0dd6bb843dd4826fff0159f78a7084964ccb119c6cf98b3d91` |
| `0.4.0-beta.1.json` | `.iflow/commands/trellis/before-backend-dev.md` | `7e35444de2a5779ef39944f17f566ea21d2ed7f4994246f4cfe6ebf9a11dd3e3` |
| `0.4.0-beta.1.json` | `.iflow/commands/trellis/before-frontend-dev.md` | `a6225f9d123dbd4a7aec822652030cae50be3f5b308297015e04d42b23a27b2a` |
| `0.4.0-beta.1.json` | `.iflow/commands/trellis/check-backend.md` | `4e81a28d681ea770f780df55a212fd504ce21ee49b44ba16023b74b5c243cef3` |
| `0.4.0-beta.1.json` | `.iflow/commands/trellis/check-frontend.md` | `5e8e3b682032ba0dd6bb843dd4826fff0159f78a7084964ccb119c6cf98b3d91` |
| `0.4.0-beta.1.json` | `.opencode/commands/trellis/before-backend-dev.md` | `7e35444de2a5779ef39944f17f566ea21d2ed7f4994246f4cfe6ebf9a11dd3e3` |
| `0.4.0-beta.1.json` | `.opencode/commands/trellis/before-frontend-dev.md` | `a6225f9d123dbd4a7aec822652030cae50be3f5b308297015e04d42b23a27b2a` |
| `0.4.0-beta.1.json` | `.opencode/commands/trellis/check-backend.md` | `4e81a28d681ea770f780df55a212fd504ce21ee49b44ba16023b74b5c243cef3` |
| `0.4.0-beta.1.json` | `.opencode/commands/trellis/check-frontend.md` | `5e8e3b682032ba0dd6bb843dd4826fff0159f78a7084964ccb119c6cf98b3d91` |
| `0.4.0-beta.1.json` | `.kilocode/workflows/before-backend-dev.md` | `7e35444de2a5779ef39944f17f566ea21d2ed7f4994246f4cfe6ebf9a11dd3e3` |
| `0.4.0-beta.1.json` | `.kilocode/workflows/before-frontend-dev.md` | `a6225f9d123dbd4a7aec822652030cae50be3f5b308297015e04d42b23a27b2a` |
| `0.4.0-beta.1.json` | `.kilocode/workflows/check-backend.md` | `4e81a28d681ea770f780df55a212fd504ce21ee49b44ba16023b74b5c243cef3` |
| `0.4.0-beta.1.json` | `.kilocode/workflows/check-frontend.md` | `5e8e3b682032ba0dd6bb843dd4826fff0159f78a7084964ccb119c6cf98b3d91` |
| `0.4.0-beta.1.json` | `.gemini/commands/trellis/before-backend-dev.toml` | `c384cda35b0e57de4a84d2812d59fd223c998be2aaa16a0620d7b987a08f6e33` |
| `0.4.0-beta.1.json` | `.gemini/commands/trellis/before-frontend-dev.toml` | `3e1ad82280f2aaabe60b93ec3e76c1017ef6282319d061e1a3de556b421317e2` |
| `0.4.0-beta.1.json` | `.gemini/commands/trellis/check-backend.toml` | `8f872a2eea659abce0cbdc40ee6a197e70ffa4a4e0cbdc42ea9bb026af1cfe79` |
| `0.4.0-beta.1.json` | `.gemini/commands/trellis/check-frontend.toml` | `4fb9eecf75f5efc0d9a38becc459d503261ecc5e69906cdfc489b2ef065944a6` |
| `0.4.0-beta.1.json` | `.agents/skills/before-backend-dev/SKILL.md` | `4537ccee0071353beee636a052c01642a27a87b6b0a73e7bc872b2501547fa64` |
| `0.4.0-beta.1.json` | `.agents/skills/before-frontend-dev/SKILL.md` | `679c1708a4d9fbad5214db299a38366581684a9383cf51a5d8ac21f890d6ba0d` |
| `0.4.0-beta.1.json` | `.agents/skills/check-backend/SKILL.md` | `9b312cfd7a07ed036769b387d84d642cd5e20f06b88e7b6a4626705fa8beb6fa` |
| `0.4.0-beta.1.json` | `.agents/skills/check-frontend/SKILL.md` | `27b75f9eea472ed104f39a65bb78ae559cfe8730c85e0742e55fd575a4a2f854` |
| `0.4.0-beta.1.json` | `.kiro/skills/before-backend-dev/SKILL.md` | `4537ccee0071353beee636a052c01642a27a87b6b0a73e7bc872b2501547fa64` |
| `0.4.0-beta.1.json` | `.kiro/skills/before-frontend-dev/SKILL.md` | `679c1708a4d9fbad5214db299a38366581684a9383cf51a5d8ac21f890d6ba0d` |
| `0.4.0-beta.1.json` | `.kiro/skills/check-backend/SKILL.md` | `9b312cfd7a07ed036769b387d84d642cd5e20f06b88e7b6a4626705fa8beb6fa` |
| `0.4.0-beta.1.json` | `.kiro/skills/check-frontend/SKILL.md` | `27b75f9eea472ed104f39a65bb78ae559cfe8730c85e0742e55fd575a4a2f854` |
| `0.4.0-beta.1.json` | `.qoder/skills/before-backend-dev/SKILL.md` | `4537ccee0071353beee636a052c01642a27a87b6b0a73e7bc872b2501547fa64` |
| `0.4.0-beta.1.json` | `.qoder/skills/before-frontend-dev/SKILL.md` | `679c1708a4d9fbad5214db299a38366581684a9383cf51a5d8ac21f890d6ba0d` |
| `0.4.0-beta.1.json` | `.qoder/skills/check-backend/SKILL.md` | `9b312cfd7a07ed036769b387d84d642cd5e20f06b88e7b6a4626705fa8beb6fa` |
| `0.4.0-beta.1.json` | `.qoder/skills/check-frontend/SKILL.md` | `27b75f9eea472ed104f39a65bb78ae559cfe8730c85e0742e55fd575a4a2f854` |
| `0.4.0-beta.8.json` | `.agents/skills/parallel/SKILL.md` | `b67b30c4e4fe00e5bc6b2f0da078e6cdfc4f082d5660b00b9ce6cfd6308d7dec` |
| `0.4.0-beta.8.json` | `.codex/agents/trellis-implementer.toml` | `e2f46f9df38485c5a0cbb562310d326a9a612dc32286bad91494a83d00c7bb3f` |
| `0.4.0-beta.8.json` | `.codex/agents/trellis-researcher.toml` | `dfda47b432b653d29dbe30f07648614e6636b1120ab718b4a640a9b51da90242` |
| `0.4.0-beta.8.json` | `.codex/agents/trellis-reviewer.toml` | `b7ebff2a15c73ccd6d851122a4d202fc02adb9706942acd6601aad614e09ebc9` |
| `0.5.0-beta.0.json` | `.claude/commands/trellis/onboard.md` | `cf9591fcddc412ff80772bf441c8d94d7724e6713fdf38a04a3348ab8949e64e`<br>`a5dbd5db094b13fd006ec856efa53a688e209bcdc3ed1680b63b15f1e3293ab4` |
| `0.5.0-beta.0.json` | `.claude/commands/trellis/create-command.md` | `9faa6e68e28ecaa4077dc651eee2a656ef4f4d090da865c891b4b07194a53b90`<br>`c2825c7941b4ef4a3f3365c4c807ff138096a39aece3d051776f3c11a4e4857d` |
| `0.5.0-beta.0.json` | `.claude/commands/trellis/integrate-skill.md` | `3940442485341832257c595ddfb45582e2d60e5a4716f2bd15b7bce0498b130a` |
| `0.5.0-beta.0.json` | `.claude/commands/trellis/check-cross-layer.md` | `b9ab24515ead84330d6634f6ad912ca3547db3a36139d62c5688161824097d60` |
| `0.5.0-beta.0.json` | `.claude/commands/trellis/record-session.md` | `33b5626fcf03a57578f46133b2a14c6bbe19c4ef29652af3f828f24f448f5926`<br>`a69db6163674ec95c98b7bcbed414ad1d0747b0f48f3d404dd051a2a5d33979d`<br>`0c4f61283c2f262c1f9c900d9207309107497d4ac848cca86eb62bc5b7189fe7`<br>`1eed78b300672b7f8064d226e93d1025062cf3a5c19e45aa6343838158fc37bc`<br>`c151abf0271cc2f4e374f168658dcdf61c5fcf903c2ef641ebdb79615a88d88b` |
| `0.5.0-beta.0.json` | `.claude/commands/trellis/parallel.md` | `d2b76e732e625d3d843f97bed96ab5c4b2308aad4b64a93fa1f85553f567e256`<br>`f4c81fe1a468be214caf362263b14b6a6f40935497363109148cb7b19e644738` |
| `0.5.0-beta.0.json` | `.cursor/commands/trellis-onboard.md` | `420fe6681008e36017e77d1ebcd5db8cba8b966ddc53363aea942b9fefb21892`<br>`ebfbe707f428f036b7d716061dfc33187b940ef9acdf3f824d1c43d1e2035ecb` |
| `0.5.0-beta.0.json` | `.cursor/commands/trellis-parallel.md` | `d2b76e732e625d3d843f97bed96ab5c4b2308aad4b64a93fa1f85553f567e256`<br>`f4c81fe1a468be214caf362263b14b6a6f40935497363109148cb7b19e644738` |
| `0.5.0-beta.0.json` | `.cursor/commands/trellis-create-command.md` | `6147b410be59a00b886162ee0785f4bb020998ef8f9fa2bbc68ed5deea20f36c`<br>`9a9283add72832e0e015de770531edf37cf3720e4a72782c1cea6e9941603490` |
| `0.5.0-beta.0.json` | `.cursor/commands/trellis-integrate-skill.md` | `bb15144c308939abfd41cb008da71088910b6ec432c763ab4c0762dd6f0819e8` |
| `0.5.0-beta.0.json` | `.cursor/commands/trellis-check-cross-layer.md` | `a79fe38f29f84a4524a70987e9fecfca569430df476082bff9dde31596ca3951` |
| `0.5.0-beta.0.json` | `.cursor/commands/trellis-record-session.md` | `33b5626fcf03a57578f46133b2a14c6bbe19c4ef29652af3f828f24f448f5926`<br>`a69db6163674ec95c98b7bcbed414ad1d0747b0f48f3d404dd051a2a5d33979d`<br>`0c4f61283c2f262c1f9c900d9207309107497d4ac848cca86eb62bc5b7189fe7`<br>`1eed78b300672b7f8064d226e93d1025062cf3a5c19e45aa6343838158fc37bc`<br>`c151abf0271cc2f4e374f168658dcdf61c5fcf903c2ef641ebdb79615a88d88b` |
| `0.5.0-beta.0.json` | `.opencode/commands/trellis/onboard.md` | `cf9591fcddc412ff80772bf441c8d94d7724e6713fdf38a04a3348ab8949e64e`<br>`a5dbd5db094b13fd006ec856efa53a688e209bcdc3ed1680b63b15f1e3293ab4` |
| `0.5.0-beta.0.json` | `.opencode/commands/trellis/create-command.md` | `b3c3ad4e34113cf67af8a94ac78d7d32078e93d318c23a1c27596944b4cb2c1d`<br>`230640908f2863f0cf2d7dc0cd2b61782b77d75fc02636d6d46b22d00ccb3465` |
| `0.5.0-beta.0.json` | `.opencode/commands/trellis/integrate-skill.md` | `3940442485341832257c595ddfb45582e2d60e5a4716f2bd15b7bce0498b130a` |
| `0.5.0-beta.0.json` | `.opencode/commands/trellis/check-cross-layer.md` | `b9ab24515ead84330d6634f6ad912ca3547db3a36139d62c5688161824097d60` |
| `0.5.0-beta.0.json` | `.opencode/commands/trellis/record-session.md` | `33b5626fcf03a57578f46133b2a14c6bbe19c4ef29652af3f828f24f448f5926`<br>`a69db6163674ec95c98b7bcbed414ad1d0747b0f48f3d404dd051a2a5d33979d`<br>`0c4f61283c2f262c1f9c900d9207309107497d4ac848cca86eb62bc5b7189fe7`<br>`1eed78b300672b7f8064d226e93d1025062cf3a5c19e45aa6343838158fc37bc`<br>`c151abf0271cc2f4e374f168658dcdf61c5fcf903c2ef641ebdb79615a88d88b` |
| `0.5.0-beta.0.json` | `.opencode/commands/trellis/parallel.md` | `9c383b9622c6bedc45f4184cc05f73a0e5087a1d88072e31ad84703d07a14c70`<br>`82e7a5214b48ffdea9063109f89a8428d7c077e0beb4cc86d4836394e47a1e21` |
| `0.5.0-beta.0.json` | `.gemini/commands/trellis/onboard.toml` | `8e819f01e69476d667bad174bd3ad3f1fae639b56fb05a888675e78e64a3d43d`<br>`d4343f29d5e9cb56c03150e58d000f3a9adc088216f07fbc4d6b615f7c2f74a7` |
| `0.5.0-beta.0.json` | `.gemini/commands/trellis/create-command.toml` | `41e2e59d4da80a37c8e6fe71a6670fc07772f3eb4f4894e5621dc428714656c6`<br>`80718724d2c2421fda719fec3be9a0dcd0e90085be87d4fcf43df93ef6c7e570` |
| `0.5.0-beta.0.json` | `.gemini/commands/trellis/integrate-skill.toml` | `47a522dac5f78eef666a05bb72b14e86023a5dda44d9b5c2355798fc54e9bbd0` |
| `0.5.0-beta.0.json` | `.gemini/commands/trellis/check-cross-layer.toml` | `2f2e6d2167c335d5fa29147266e831aa066c18b0449707dbd864a2fb849c08c2` |
| `0.5.0-beta.0.json` | `.gemini/commands/trellis/record-session.toml` | `eea81b0ea17256abdbf4005c609738b01f3029c5e34e16935d8c10c5bb710c3e`<br>`17f08b3158fb47320df88f942429ac2568e80a375c753ff69d4b1ac66568d1f3`<br>`0a2c7139b13bfccd862db4a27a53dbd65803d3875eb82302418c6bfaaac68ff7`<br>`d08a2fc7f463844d4fde0e20dd9c709728a1593e9704a2bcc912a7b488d5e7a6`<br>`02219ef096bb0fa171e20268ee8a29e82f385dcfbda70956ba771859f2364457` |
| `0.5.0-beta.0.json` | `.kilocode/workflows/onboard.md` | `cf9591fcddc412ff80772bf441c8d94d7724e6713fdf38a04a3348ab8949e64e`<br>`a5dbd5db094b13fd006ec856efa53a688e209bcdc3ed1680b63b15f1e3293ab4` |
| `0.5.0-beta.0.json` | `.kilocode/workflows/create-command.md` | `8534191135a7a352e7b9c45b8eb64b4bf2efd11d24605718967673fca73b4e77`<br>`4cbee2084b89f57bf135fc7105c4134d6096c78473396cb3fe43761fdaa6bcc5` |
| `0.5.0-beta.0.json` | `.kilocode/workflows/integrate-skill.md` | `3940442485341832257c595ddfb45582e2d60e5a4716f2bd15b7bce0498b130a` |
| `0.5.0-beta.0.json` | `.kilocode/workflows/check-cross-layer.md` | `b9ab24515ead84330d6634f6ad912ca3547db3a36139d62c5688161824097d60` |
| `0.5.0-beta.0.json` | `.kilocode/workflows/record-session.md` | `33b5626fcf03a57578f46133b2a14c6bbe19c4ef29652af3f828f24f448f5926`<br>`a69db6163674ec95c98b7bcbed414ad1d0747b0f48f3d404dd051a2a5d33979d`<br>`0c4f61283c2f262c1f9c900d9207309107497d4ac848cca86eb62bc5b7189fe7`<br>`1eed78b300672b7f8064d226e93d1025062cf3a5c19e45aa6343838158fc37bc`<br>`c151abf0271cc2f4e374f168658dcdf61c5fcf903c2ef641ebdb79615a88d88b` |
| `0.5.0-beta.0.json` | `.kilocode/workflows/parallel.md` | `9c383b9622c6bedc45f4184cc05f73a0e5087a1d88072e31ad84703d07a14c70`<br>`82e7a5214b48ffdea9063109f89a8428d7c077e0beb4cc86d4836394e47a1e21` |
| `0.5.0-beta.0.json` | `.iflow/commands/trellis/onboard.md` | `cf9591fcddc412ff80772bf441c8d94d7724e6713fdf38a04a3348ab8949e64e`<br>`a5dbd5db094b13fd006ec856efa53a688e209bcdc3ed1680b63b15f1e3293ab4` |
| `0.5.0-beta.0.json` | `.iflow/commands/trellis/create-command.md` | `b61fd91086641eb31bda18a8bf6824e9ecfc59e381d9bfd028744ff26021d760`<br>`bbad48da343dfc8dc9536bf4a1a2134fadb4e8665471a6c60ae9344344989994` |
| `0.5.0-beta.0.json` | `.iflow/commands/trellis/integrate-skill.md` | `fbed52bfb80d2ef58d9267cd79ecdc9ee2ca9ff4a971a0318bf3c467e00b8aeb` |
| `0.5.0-beta.0.json` | `.iflow/commands/trellis/check-cross-layer.md` | `b9ab24515ead84330d6634f6ad912ca3547db3a36139d62c5688161824097d60` |
| `0.5.0-beta.0.json` | `.iflow/commands/trellis/record-session.md` | `33b5626fcf03a57578f46133b2a14c6bbe19c4ef29652af3f828f24f448f5926`<br>`a69db6163674ec95c98b7bcbed414ad1d0747b0f48f3d404dd051a2a5d33979d`<br>`0c4f61283c2f262c1f9c900d9207309107497d4ac848cca86eb62bc5b7189fe7`<br>`1eed78b300672b7f8064d226e93d1025062cf3a5c19e45aa6343838158fc37bc`<br>`c151abf0271cc2f4e374f168658dcdf61c5fcf903c2ef641ebdb79615a88d88b` |
| `0.5.0-beta.0.json` | `.iflow/commands/trellis/parallel.md` | `d2b76e732e625d3d843f97bed96ab5c4b2308aad4b64a93fa1f85553f567e256`<br>`f4c81fe1a468be214caf362263b14b6a6f40935497363109148cb7b19e644738` |
| `0.5.0-beta.0.json` | `.kiro/skills/onboard/SKILL.md` | `ec6db142f763c81a3273be45b5d7726f695c32aaa5404e90dbd6e40aec92fb98`<br>`1d0dac79bdf4e1e9151ec726f31007653c318af39ff90c141d6b213d86315682`<br>`1808f578d21eae3cbcf650d6aa4cf35ac42bf466df740b830593c9bda212d51a` |
| `0.5.0-beta.0.json` | `.kiro/skills/create-command/SKILL.md` | `da455ed21ab4e242ba1f59d23481daef9ee142550641681996e73a8261003c74`<br>`b93d71dfd83ee688659fb62507a2433049e66bbe3542b97ada347e47b2867b76`<br>`e564e1efc9c3d505673982ba4390f93dcefc10b02cd24c750ac968cddae53c71` |
| `0.5.0-beta.0.json` | `.kiro/skills/integrate-skill/SKILL.md` | `26508bea3ccf8c9c6c9fed5edb0c41706f16a57e39b9104e0cab9b6d14853e60`<br>`acce65fe98da9017372071d219f89ae8d5ace11e8e301436c2b7df895da26f5d` |
| `0.5.0-beta.0.json` | `.kiro/skills/check-cross-layer/SKILL.md` | `4de11e856524f2cc5d4ff78aa85c286a553e82714c3c4506da5ad00d32d76324`<br>`bc72df11d79a8ee809f45eae120c1cce91ab997541ce30d665af9978c83843f6` |
| `0.5.0-beta.0.json` | `.kiro/skills/record-session/SKILL.md` | `6707f3df209a4064d1617ea92807265829a62a0343b3da9fdeac289187730626`<br>`2f3781d894b7a45b517d36845fa18e6fac98acad40e77438a3d85760f1d7d247`<br>`9e10edd5723b54944b82ee85a4bd52fc0e066e6fd9dbed2761d9c4bcfbb5f9c2`<br>`ce27e953630a71ef989c5582790e9c8a600a2614ec668b674816c1daac73ce0a`<br>`8d9659b68d765a1bf5ca345150f1f4d39f174767d0ebec04d24d147afa7023cf`<br>`d1257c53757ca590c18b341ac250e943570e263e7103bd07a129cfc10d3a7978` |
| `0.5.0-beta.0.json` | `.qoder/skills/onboard/SKILL.md` | `d58cbf875f3abe1ec510a9491119ddbabafb817decdbe391ba93824c76c6e69e`<br>`c6ba149e58e8bf45c6be58ef1f427c80977daf49afb99b50df4727abce6e4039`<br>`7694740d79d1e1baeb414072ec94b1d909f37aea06dbe23e5be3b0e9b03d01ed` |
| `0.5.0-beta.0.json` | `.qoder/skills/create-command/SKILL.md` | `1912619f50523ae55e6055c0d89fba3b9d0b0e378c33cd9842281376ccf4f7f3`<br>`efe15fccf3cd0455d919cf89d9522a7eec559ed4b0c967baba67bdc5a85a1f0f`<br>`58a574f3336cb0cd9b01f10fa8979b0801ea77387461781f50850877754ac5b1` |
| `0.5.0-beta.0.json` | `.qoder/skills/integrate-skill/SKILL.md` | `ebabaa7c6f706a03f73e04888f54bcfaba17db5c3c0713603b31c93622bcb86a`<br>`155d2820fdfe0d0edfd58a335d3190d2c6a5d1a51c5314b975001c14cc269ab6` |
| `0.5.0-beta.0.json` | `.qoder/skills/check-cross-layer/SKILL.md` | `894c6b7673725d7a82b72ee5ee00580ff9805ca587e654f4577288c58d85a529`<br>`826eae1f9cca5d9789ec8e5b0cde13b1fafcd26426d6571c491b7a13afcae001` |
| `0.5.0-beta.0.json` | `.qoder/skills/record-session/SKILL.md` | `eb8a56a09572dd1d926c9dcaccc82e1973e3f1f4dcb0497eae1733b3bec0d086`<br>`27d1a5bdeb28660955d679de7109b1379ebf9f5c6a0666c786e50c6bb9035a5d`<br>`cde5ba881fca8402345515dbaad59d140e5a2d5881d0319d390cbc184156f597`<br>`2a41536bb6e22a604522e7e03db139ac67dd9227bbbda6fa67048bfb207ce110`<br>`a0d3703f64cb23f7a686e4183876b971f3b6a899424030a385d5bc91f57e1794`<br>`7772b7404fd5585eaafb4f5e35ad672d55397d865f52ec715f7d1a93f90f475b` |
| `0.5.0-beta.0.json` | `.agents/skills/onboard/SKILL.md` | `ec6db142f763c81a3273be45b5d7726f695c32aaa5404e90dbd6e40aec92fb98`<br>`1d0dac79bdf4e1e9151ec726f31007653c318af39ff90c141d6b213d86315682`<br>`1808f578d21eae3cbcf650d6aa4cf35ac42bf466df740b830593c9bda212d51a` |
| `0.5.0-beta.0.json` | `.agents/skills/create-command/SKILL.md` | `ede895ad28e53c960736043f03e105dc95d0038f2965860d1c32de63dc77ba88`<br>`679cd2f00751642845b81ce7dd35368f2232d2b364292d4a056d7b9f8c90ae52`<br>`5c24ca19c1cec64486f1a147e1dd4a37200270cbf3d0987dc6536f7de85a78f2` |
| `0.5.0-beta.0.json` | `.agents/skills/integrate-skill/SKILL.md` | `2d4da52f3f09fb8b92011f2019ad9e28a20054d577c212c9ed6f2bf156b59d52`<br>`47b7374345d8a31f9df07c5e8e875ca4fdc30d0cc45860d77df893250e2d97fc` |
| `0.5.0-beta.0.json` | `.agents/skills/check-cross-layer/SKILL.md` | `4de11e856524f2cc5d4ff78aa85c286a553e82714c3c4506da5ad00d32d76324`<br>`bc72df11d79a8ee809f45eae120c1cce91ab997541ce30d665af9978c83843f6` |
| `0.5.0-beta.0.json` | `.agents/skills/record-session/SKILL.md` | `6707f3df209a4064d1617ea92807265829a62a0343b3da9fdeac289187730626`<br>`2f3781d894b7a45b517d36845fa18e6fac98acad40e77438a3d85760f1d7d247`<br>`9e10edd5723b54944b82ee85a4bd52fc0e066e6fd9dbed2761d9c4bcfbb5f9c2`<br>`ce27e953630a71ef989c5582790e9c8a600a2614ec668b674816c1daac73ce0a`<br>`8d9659b68d765a1bf5ca345150f1f4d39f174767d0ebec04d24d147afa7023cf`<br>`d1257c53757ca590c18b341ac250e943570e263e7103bd07a129cfc10d3a7978` |
| `0.5.0-beta.0.json` | `.agents/skills/parallel/SKILL.md` | `b4f963df475b818e26a9edea718c630b289cb137c11994d8395535de6ab0931c` |
| `0.5.0-beta.0.json` | `.windsurf/workflows/trellis-onboard.md` | `6706be65564d5612d3add01c7731e25ccfb5d9c8eba0e639049f549ef3728dbf` |
| `0.5.0-beta.0.json` | `.windsurf/workflows/trellis-create-command.md` | `fac03e217edc159cd4b24d6bd39564bce55720aa2908eaf9575b1df02af0b93a` |
| `0.5.0-beta.0.json` | `.windsurf/workflows/trellis-integrate-skill.md` | `bb8e1b732275e6302390b90df71be4f7ff97b2da9300e6f08e50eb7b5d7091aa` |
| `0.5.0-beta.0.json` | `.windsurf/workflows/trellis-check-cross-layer.md` | `7140c99e063b38f6c51b3ade0bc9fb1eb9c651dbc10f6f38a4618b6a9ddf13f8` |
| `0.5.0-beta.0.json` | `.windsurf/workflows/trellis-record-session.md` | `6ab51c9db85650b90dc86d8c57223f2d551462f27bd79a78d02e9c76bb9df39a` |
| `0.5.0-beta.0.json` | `.codebuddy/commands/trellis/onboard.md` | `cf9591fcddc412ff80772bf441c8d94d7724e6713fdf38a04a3348ab8949e64e` |
| `0.5.0-beta.0.json` | `.codebuddy/commands/trellis/create-command.md` | `105637633b1f75165afabe4e3437cdef16a9ee821b957712f7c082be062e402a` |
| `0.5.0-beta.0.json` | `.codebuddy/commands/trellis/integrate-skill.md` | `3940442485341832257c595ddfb45582e2d60e5a4716f2bd15b7bce0498b130a` |
| `0.5.0-beta.0.json` | `.codebuddy/commands/trellis/check-cross-layer.md` | `b9ab24515ead84330d6634f6ad912ca3547db3a36139d62c5688161824097d60` |
| `0.5.0-beta.0.json` | `.codebuddy/commands/trellis/record-session.md` | `a69db6163674ec95c98b7bcbed414ad1d0747b0f48f3d404dd051a2a5d33979d` |
| `0.5.0-beta.0.json` | `.factory/commands/trellis/onboard.md` | `aace2b0bc63296dc34e8665d1048fbb5e91288c91e837f7070e95e466bffadc4` |
| `0.5.0-beta.0.json` | `.factory/commands/trellis/create-command.md` | `8d450d7ff866d05bce66cb43deac3ccd6cc504b0079d1e6924ab349e4f6d4fe7` |
| `0.5.0-beta.0.json` | `.factory/commands/trellis/integrate-skill.md` | `f8d5e68afe6358f04392469300af32d9bd0e8161990f27d208b8841c656bfd15` |
| `0.5.0-beta.0.json` | `.factory/commands/trellis/check-cross-layer.md` | `248388092ce8a6baa1bbb987d46e8311a80f824d340c315070d24113a1a1220f` |
| `0.5.0-beta.0.json` | `.factory/commands/trellis/record-session.md` | `2702b84edbb6eb1fcb46a5ea70d6beeb0186b1bdea4817e059f2881d6e09d2ca` |
| `0.5.0-beta.0.json` | `.github/prompts/onboard.prompt.md` | `dc320c2fa8cf54dec1f4abae7b620c812311eab02bbcf6c65a7904b4d8cc63ed` |
| `0.5.0-beta.0.json` | `.github/prompts/create-command.prompt.md` | `e73b8bb6f078262f734c729ca339f958814b1309f539c140810fb2502d10bee0` |
| `0.5.0-beta.0.json` | `.github/prompts/integrate-skill.prompt.md` | `149f13388f8dc3f51c9cda8398a5f6f445198e6c2e8ab324273112b3d6e2f1b7` |
| `0.5.0-beta.0.json` | `.github/prompts/check-cross-layer.prompt.md` | `5400f00a393debed6d9b45e9896270378e5f148e05451e45c978eab129c810ee` |
| `0.5.0-beta.0.json` | `.github/prompts/record-session.prompt.md` | `2e088414e2a47e23f3e363f0e96af94a6716d49001dacfa168fdb4f43eb71cb3` |
| `0.5.0-beta.0.json` | `.github/prompts/parallel.prompt.md` | `83dfdd76fb4afa44c48ba3d518dd3649a1e35cbfb037db3e359cfc13aa55255b` |
| `0.5.0-beta.0.json` | `.codex/skills/parallel/SKILL.md` | `b4f963df475b818e26a9edea718c630b289cb137c11994d8395535de6ab0931c` |
| `0.5.0-beta.0.json` | `.claude/agents/debug.md` | `94be0b1cfbae4c64caee4775ef504f43acfcd4a80427a26d6f680ceaddcbee24` |
| `0.5.0-beta.0.json` | `.claude/agents/dispatch.md` | `90446e5b2bce1bc416856eb728361e21452ada9fb1cd05b1b29cd1a660f34c38`<br>`20e699a87aeb0b046c51d8485e433190916c645e21db9a06f9e468272738347e` |
| `0.5.0-beta.0.json` | `.claude/agents/plan.md` | `d796f689b8b8945d1809679d0c74475f419325b30f36ef0c59b7fae73386e90b` |
| `0.5.0-beta.0.json` | `.iflow/agents/debug.md` | `b707543aa4020e25694522583b7a4695243d057e253f437a8444c0acb7d7ee4f` |
| `0.5.0-beta.0.json` | `.iflow/agents/dispatch.md` | `157338d0143fa1ff307adb97f776df8b4d3db8757786b9006c1aafa484c2f27e`<br>`f8a0928be1fa822c8247bf7c0da8709c38da83d4cca3359f381d9619b91b46bc` |
| `0.5.0-beta.0.json` | `.iflow/agents/plan.md` | `38a853094523b65734578b23f00fc40768a9a32553a9812a46f9385bff125b7f` |
| `0.5.0-beta.0.json` | `.opencode/agents/debug.md` | `0bac1d723fb3634ea95c471a22245eff2b4c9d6bd98bc66cafacf6a0092609bb` |
| `0.5.0-beta.0.json` | `.opencode/agents/dispatch.md` | `f1e90f5967c7c4d61fce58df2a1e8592d1bfd4e76f2d1761916b8dc3b0b435b9`<br>`cb1c9270d509e44f0f7242f7a17927d23353ef7e68d834a4dc0027d44cccc0cb`<br>`23d7834c540907c98f7988661849db5d949ee394470952215c373aef926fec81` |
| `0.5.0-beta.0.json` | `.opencode/agents/trellis-plan.md` | `36de06c7eddbff290acb3c200f30af96291048e492ce2f2d8b7038662eeb572b` |
| `0.5.0-beta.0.json` | `.claude/hooks/ralph-loop.py` | `df864b971ea5faf5801a88f013f230c92d458f52f64731a91f02cd78d7b932c3`<br>`e627124495ade6811ef6f28082cd22f24936bb7a35f12ff8705e484e12b2fc94`<br>`a367a5dd4f605730cf8157c61658e848176ae480be19029126ff9bbd90a37712` |
| `0.5.0-beta.0.json` | `.iflow/hooks/ralph-loop.py` | `e627124495ade6811ef6f28082cd22f24936bb7a35f12ff8705e484e12b2fc94`<br>`a367a5dd4f605730cf8157c61658e848176ae480be19029126ff9bbd90a37712` |
| `0.5.0-beta.0.json` | `.iflow/hooks/session-start.py` | `73274720fc83529dd25cdd8a97b1111ce85f34ece3d28317dbe60a89680ec683`<br>`9e7f3dea72900d3d6353ecd1a5b1b670260325233dd5eb13e855addfcc93e3fe`<br>`9e1b3e5a0362e43b5e282ef7d5b32d14beababa708aec3882259b800f72f03d7`<br>`4f1792cb545f895d7a55bbaaaa00c91100bda27d371610e1c524ad1cb09b6e6a`<br>`223caadc717949125eb574abc79b09365324c6a85357c8e9bc28d5cf232a931a`<br>`40738a6c1fa98cc47047b5d89eaf22c18be0e3ff1ccf0a5b2ee9244ad941c3b9`<br>`5b4fde809b552790de9f14c0fb99acc2195edf456cc8f2e68e800458e6019f84`<br>`8d0a944ae82b15e02c2db12374f0dc186144d6c43de13528dbbe19299514150f`<br>`f27aa113830e149699131c27cdcb506687b95677680f132a3c20969260c87d0d`<br>`57c9a517327f0ebbee00835ec22305847a2626cd07fb70af9eda4afd1ce1b94b`<br>`3c9e382013ad0bce2ce20eb9a5b27414bfe7c688b6212e918340437daaeb53d5` |
| `0.5.0-beta.0.json` | `.iflow/hooks/inject-subagent-context.py` | `0ed34553db3c52cd9fc8d53a102a42bac4d41d31960bf749c5b9c201a2772d08`<br>`07b5837e1676e465413782cd1aafc1b848f0f539b29208e1d54e328487f6ede0`<br>`ba8b9c7087c702e459d9038ade263e76b9ce4bbcf212477d21c0542c0b01a8b5` |
| `0.5.0-beta.0.json` | `.iflow/agents/check.md` | `2b5ef0bfd9d43c3f7c3042d60eb94ff443ca0aa7b7181812196fc8a434baf2e3` |
| `0.5.0-beta.0.json` | `.iflow/agents/implement.md` | `9f5dcf3aafc522d300cf4c7ac8a86cf6b7809dbea3694453233ea455cb272911`<br>`2452f31c5b698bd855fc94eb5fa8d40cc5fd971801d1dfecbf01f8da8b4bca6a` |
| `0.5.0-beta.0.json` | `.iflow/agents/research.md` | `a72142d146df1b0c239aebc20db2186781fe9e8ddb3d61c48e9ad7391ecc4599` |
| `0.5.0-beta.0.json` | `.iflow/settings.json` | `d06ecd16d3eb81f6b5b7ed80662f3b50c0efb3e7f5419119de89c4c515289c89`<br>`2165c47b15e7ac38a575cf816e7c9f1bf04c3f5e87955685e13154e1bf0ff5d8` |
| `0.5.0-beta.0.json` | `.iflow/commands/trellis/before-dev.md` | `dd926596f3139c12d42469fb5147ac90724e3a7baca5591384f4f4bbdd530b54` |
| `0.5.0-beta.0.json` | `.iflow/commands/trellis/brainstorm.md` | `7c7731eda092275a5d87f2569a69584f3c39b544a126a76e727a1e9d250c4a65` |
| `0.5.0-beta.0.json` | `.iflow/commands/trellis/break-loop.md` | `ba4dd4022dde1e4bbcfc1cc99e6a118e51b9db95bd962d88f1c29d0c9c433112` |
| `0.5.0-beta.0.json` | `.iflow/commands/trellis/check.md` | `8b0d20b425b6030d13ac5aa0c876c5ec97cf7aca9b050f574f07f281ad25bd06` |
| `0.5.0-beta.0.json` | `.iflow/commands/trellis/finish-work.md` | `cc92cad9e94ce1cc4f29e3de16a640db7e9176e3ecfc9c19a566153671ca2168` |
| `0.5.0-beta.0.json` | `.iflow/commands/trellis/start.md` | `34ecead84912a4338575f8648a9d449f89dfb4d4725416c889dac03586f98800`<br>`2d4259d8d146d32c7b6c33dda36c14da76e1c3f1be35b27dc18e5eb5551c9276`<br>`98fd4a940788f73da22f81632d3c271b61d6bcb7c515ecc609ae4a651b0579d7`<br>`7f3c447ca608a6ae69d31bca69bf795e15457b2d151c1202cf86ba6bbcfa3e05`<br>`a46a479f3626beb595aa45a6124df8b1a6a67bbf5cdda8850c1a5fd18f5f5c05` |
| `0.5.0-beta.0.json` | `.iflow/commands/trellis/update-spec.md` | `ff4d5a0405a763e61936f5b9df175fd25ea20ec5c20fa999855020ab78a919b6` |
| `0.5.0-beta.0.json` | `.trellis/scripts/multi_agent/__init__.py` | `af6fceb4d9a64da04be03ba0f5a6daf71066503eca832b8b58d8a7d4b2844fa4` |
| `0.5.0-beta.0.json` | `.trellis/scripts/multi_agent/_bootstrap.py` | `4d0c06e41ba17e33172974783719731551607400de0c751c13414fed9d0c8c30` |
| `0.5.0-beta.0.json` | `.trellis/scripts/multi_agent/cleanup.py` | `046ad29aa533e41d8952bf02c2dcfcdab2755002222d92455d194ef97a6e82e2`<br>`a4fad65fe298f811eb659b743c3815c1a349c65d9e2ba8e06319996a3c6ed6db`<br>`db50c4fbb32261905a8278c2760b33029f187963cd4e448938e57f3db3facd6c` |
| `0.5.0-beta.0.json` | `.trellis/scripts/multi_agent/create_pr.py` | `03018c0c50a45758c28da5751afea1822be0acffe9053587cdf9d514a83ae27e`<br>`c425cd1b345db5367f19cfb3c1467a11f35a6ad6ee2a6918c01a5cb6d66bff46`<br>`6a2423aba5720a2150c32349faa957cdc59c6bb96511e56c79ca08d92d69c666` |
| `0.5.0-beta.0.json` | `.trellis/scripts/multi_agent/plan.py` | `011481ad0024a91f6a9e16535c6f5c4c7ba8eb311c46428104f1aeea7fc934e7`<br>`990282720374f418ffb7080fd4111f987f0f0a33e85e9bc14864c1c805eddd21`<br>`713ebb9a0b30e6b034c95c05ed247d3f5589536dbafcd681728a4a1509bc1cb4`<br>`242b870b7667f730c910d629f16d44d5d3fd0a58f6451d9003c175fb2e77cee5` |
| `0.5.0-beta.0.json` | `.trellis/scripts/multi_agent/start.py` | `01e7f81fac53078a24a9fda50dc3000c2cee49179e05b8f7284747eebec1a543`<br>`d27ead3963b9c8200f2f255fbe74b48d9b3333034fd5fa2d9f3997cfc5c11988`<br>`1ffea0c95de3f5682c5f573edf2087906b93f3f5cf3a185d063d4236ed5b881a`<br>`ec0be1543dc8c470c093a27e124fbc4c7c3ba45ab13780565cec9f40679872d9`<br>`62a3ee003bc64f48d6805f1ffd9de2b7313020c677d1e2d4e231a2edc35409d7`<br>`d3af7b0fe2220513dc2dd7f1419c7652f7cddd69a0f2a5802de264413c20e47c`<br>`32ed1a13405b7c71881b2507a79e1a3733bc3fcedbc92fcee0d733ce00d759d0` |
| `0.5.0-beta.0.json` | `.trellis/scripts/multi_agent/status.py` | `06b3d2c5a9f7bea884962ace3b25113a3b01bf50dc12ad2f473e4f0c914fff7e`<br>`a46987c778bbdc8520d0b06e16aabc208e7eeb272b193a43250ebb56c199d512`<br>`d985b8189b3070471805e0a72ae99128e2c73f9a623b020038960d862b5fbf58`<br>`5fc46b6d605c69b6044967a6b33ffb0c9d6f99dd919374572ac614222864a811` |
| `0.5.0-beta.0.json` | `.trellis/scripts/multi_agent/status_display.py` | `d432446644b07dcbea7fd3aeba1d31ae42a9c664e91eebbdab503fbb698bccac` |
| `0.5.0-beta.0.json` | `.trellis/scripts/multi_agent/status_monitor.py` | `11ba35180a568aa4d14ccaee81cc213ff3d5ab83025f264ac57ca70385f11f4c` |
| `0.5.0-beta.0.json` | `.trellis/worktree.yaml` | `c57de79e40d5f748f099625ed4a17d5f0afbf25cac598aced0b3c964e7b7c226` |
| `0.5.0-beta.0.json` | `.trellis/scripts-shell-archive/add-session.sh` | `5e8e4ebf9e85684c130e636b67c6def49bab4aa6e4e303d591173b1797e82c37` |
| `0.5.0-beta.0.json` | `.trellis/scripts-shell-archive/common/developer.sh` | `fac965c73fa93cb9656f1fdda71dc525ac53309fc702f306f68a4914fc0d5788` |
| `0.5.0-beta.0.json` | `.trellis/scripts-shell-archive/common/git-context.sh` | `45bb7e038fca57ef54852c5d9c5e5f78bd2f6bc27505bbaeb4fe22855ad2008a` |
| `0.5.0-beta.0.json` | `.trellis/scripts-shell-archive/common/paths.sh` | `c2b38f795668071e40b4fb817f1f710d61db76b38d09e1f47d71573d4ee7475a` |
| `0.5.0-beta.0.json` | `.trellis/scripts-shell-archive/common/phase.sh` | `08ab369480d3a3c226de8ecf084dc34c297c27950ebcb2aa2bc8df1cec686288` |
| `0.5.0-beta.0.json` | `.trellis/scripts-shell-archive/common/registry.sh` | `2bf06ca0b100aa960e14590fb2c41c5aa1c40f156a406429757da038e92ead65` |
| `0.5.0-beta.0.json` | `.trellis/scripts-shell-archive/common/task-queue.sh` | `fbc168ee801a5986e8bd5ec6cfceb7384c2d93a9985f9c37f35c238b8d633ea9` |
| `0.5.0-beta.0.json` | `.trellis/scripts-shell-archive/common/task-utils.sh` | `8ad2ee44df470183f536319f88b446dc603e3fddcdd1b71396960d8dd52045ea` |
| `0.5.0-beta.0.json` | `.trellis/scripts-shell-archive/common/worktree.sh` | `7a420eecab9dfe361bea1b0a5cb9ce4b42b984fbffb570a75e2d9ac59f4b569d` |
| `0.5.0-beta.0.json` | `.trellis/scripts-shell-archive/create-bootstrap.sh` | `1192954732832fc1d72bd2b63b049b66b867c9e7287f6677ee2316dd40bdd03a`<br>`388905f88cf89035005eff84ae3828fdd4936707481ba702c08c6a206117b205` |
| `0.5.0-beta.0.json` | `.trellis/scripts-shell-archive/get-context.sh` | `e42bcf4b167b1d322b069d795110e4947cab4073e495be285ed7a9b8c1a3d728` |
| `0.5.0-beta.0.json` | `.trellis/scripts-shell-archive/get-developer.sh` | `82f62484fceef79954bb8aa77588789c476b7187bf0ff48d355d50108425dc67` |
| `0.5.0-beta.0.json` | `.trellis/scripts-shell-archive/init-developer.sh` | `34bbd2db4198196ec3297116ff0d8455b2af32ec6a297c978bdf8cb5abffa2f8` |
| `0.5.0-beta.0.json` | `.trellis/scripts-shell-archive/multi-agent/cleanup.sh` | `205993cc945ed2224ec45fa51e55f18624a6a7743fcfd44090308b1099bcb87b` |
| `0.5.0-beta.0.json` | `.trellis/scripts-shell-archive/multi-agent/create-pr.sh` | `0818c371031eed810e404997c10713ab685ca5eb4b5815f9a646ad1e5862e96c` |
| `0.5.0-beta.0.json` | `.trellis/scripts-shell-archive/multi-agent/plan.sh` | `a2349c913314561349b92e506962b9ef9c716f61ee310a18b2fc53cde3ddf04d` |
| `0.5.0-beta.0.json` | `.trellis/scripts-shell-archive/multi-agent/start.sh` | `a03217ac90f48f42f4d7bd45709bfd7ce50e98a8b2538c02c753b42df87b478d` |
| `0.5.0-beta.0.json` | `.trellis/scripts-shell-archive/multi-agent/status.sh` | `b92fcc3adc728f9cc85a69e17225a4ba3dfb6bac2907582f49ce85b27a454bf5` |
| `0.5.0-beta.0.json` | `.trellis/scripts-shell-archive/task.sh` | `85457600b714f6b6ca851939e31b223b7a9ae7858fa7a0abc713bdafb2212a3a` |
| `0.5.0-beta.0.json` | `.agents/skills/start/SKILL.md` | `8853e4ddc1681e043dec34be76c7c6fd961a3d52cbd0a2320225d72440425639` |
| `0.5.0-beta.0.json` | `.claude/commands/trellis/start.md` | `34ecead84912a4338575f8648a9d449f89dfb4d4725416c889dac03586f98800` |
| `0.5.0-beta.0.json` | `.codebuddy/commands/trellis/start.md` | `110f0976b965b4d50adb2898e609cee7f5f57f19ea48750c727895bb9bc1d2f3` |
| `0.5.0-beta.0.json` | `.cursor/commands/trellis-start.md` | `f03c7c1fde78c60ac8604938f1af7b2b54ef3cb4caf200d88edbbc8fc8d58c8f` |
| `0.5.0-beta.0.json` | `.factory/commands/trellis/start.md` | `bf9800dff1819312e6a00fb8382c58ee7ca9d6828048ae447c036683f3801fb9` |
| `0.5.0-beta.0.json` | `.gemini/commands/trellis/start.toml` | `ed53363d1d98c5d7ff1493cf585493820743339cf33e7ecd63349e46b28156c7` |
| `0.5.0-beta.0.json` | `.github/prompts/start.prompt.md` | `7c99eedf8649a7242f741c099e80bb92df111de36292b33505760f7c0cb105f9` |
| `0.5.0-beta.0.json` | `.kiro/skills/start/SKILL.md` | `8853e4ddc1681e043dec34be76c7c6fd961a3d52cbd0a2320225d72440425639` |
| `0.5.0-beta.0.json` | `.opencode/commands/trellis/start.md` | `84e76dea69542515e234f8b551491ca6bb31fe441ef702a43ff12c3b8397d5fe` |
| `0.5.0-beta.0.json` | `.qoder/skills/start/SKILL.md` | `ec6034801518a14aaf09fbf4aeab5f210a3d16177bafdd01b5a11883efa85b9e` |
| `0.5.0-beta.0.json` | `.agent/workflows/improve-ut.md` | `48ec1a0178adf224709773a90a95a6c5a16587c39940393fa4a1a1631bc4c920` |
| `0.5.0-beta.0.json` | `.agents/skills/improve-ut/SKILL.md` | `b63988e1b7de101dedc79cf7acba53f8d4bbcc05750aab19bbe23c74ee2e693e` |
| `0.5.0-beta.15.json` | `.cursor/hooks/statusline.py` | `87c01ee786ca9e1f25b591f0ed67564cd430586d57516d5b6fc57c34b6e7a3ec`<br>`c92c0020a0c60308437b66f024a244303e708519c97089cf654ceddc144f7435`<br>`b9b0a39a486643f2b78ecb3c757459182a6326ea070ba34a49887e23adc40bbb` |
| `0.5.0-beta.15.json` | `.codex/hooks/statusline.py` | `87c01ee786ca9e1f25b591f0ed67564cd430586d57516d5b6fc57c34b6e7a3ec`<br>`c92c0020a0c60308437b66f024a244303e708519c97089cf654ceddc144f7435`<br>`b9b0a39a486643f2b78ecb3c757459182a6326ea070ba34a49887e23adc40bbb` |
| `0.5.0-beta.15.json` | `.gemini/hooks/statusline.py` | `87c01ee786ca9e1f25b591f0ed67564cd430586d57516d5b6fc57c34b6e7a3ec`<br>`c92c0020a0c60308437b66f024a244303e708519c97089cf654ceddc144f7435`<br>`b9b0a39a486643f2b78ecb3c757459182a6326ea070ba34a49887e23adc40bbb` |
| `0.5.0-beta.15.json` | `.qoder/hooks/statusline.py` | `87c01ee786ca9e1f25b591f0ed67564cd430586d57516d5b6fc57c34b6e7a3ec`<br>`c92c0020a0c60308437b66f024a244303e708519c97089cf654ceddc144f7435`<br>`b9b0a39a486643f2b78ecb3c757459182a6326ea070ba34a49887e23adc40bbb` |
| `0.5.0-beta.15.json` | `.github/copilot/hooks/statusline.py` | `87c01ee786ca9e1f25b591f0ed67564cd430586d57516d5b6fc57c34b6e7a3ec`<br>`c92c0020a0c60308437b66f024a244303e708519c97089cf654ceddc144f7435`<br>`b9b0a39a486643f2b78ecb3c757459182a6326ea070ba34a49887e23adc40bbb` |
| `0.5.0-beta.15.json` | `.codebuddy/hooks/statusline.py` | `87c01ee786ca9e1f25b591f0ed67564cd430586d57516d5b6fc57c34b6e7a3ec`<br>`c92c0020a0c60308437b66f024a244303e708519c97089cf654ceddc144f7435`<br>`b9b0a39a486643f2b78ecb3c757459182a6326ea070ba34a49887e23adc40bbb` |
| `0.5.0-beta.15.json` | `.factory/hooks/statusline.py` | `87c01ee786ca9e1f25b591f0ed67564cd430586d57516d5b6fc57c34b6e7a3ec`<br>`c92c0020a0c60308437b66f024a244303e708519c97089cf654ceddc144f7435`<br>`b9b0a39a486643f2b78ecb3c757459182a6326ea070ba34a49887e23adc40bbb` |
| `0.5.0-beta.15.json` | `.kiro/hooks/statusline.py` | `87c01ee786ca9e1f25b591f0ed67564cd430586d57516d5b6fc57c34b6e7a3ec`<br>`c92c0020a0c60308437b66f024a244303e708519c97089cf654ceddc144f7435`<br>`b9b0a39a486643f2b78ecb3c757459182a6326ea070ba34a49887e23adc40bbb` |
| `0.5.0-beta.15.json` | `.kiro/hooks/session-start.py` | `26b52ad72259316aa5adc8068d0df2a002273d5eda659ac3c71f3f5ecd9ebd08`<br>`ddd59c6fc5e6fa8c8535d6ac375ecaad60f15b87abc6dfc279007e610c636dd8`<br>`597409062bed8f9977750fa6262bb997facce7d8377d3482d4bcb2054e19c491`<br>`6cf36cffba3cf4a3caff99606d9fc9dde07fa4f74b7227aeb08d3de00ced7ca2`<br>`373f2f41c5506982cef1049f0203ca9e442c8074f54880aa021f037c0b9300b0`<br>`bc2026f6b1c195432e1126e1388d11fccec2df7a72010d0daa9fb6af76f683dd`<br>`cf355e44ace5e9b7c7d9a416462d4057a6cff9d5905b8db1839e6e4c892cfd13`<br>`a1b0db7c264da8e7abeb378a16ba8132b99b9918c9546627137d69427108f4b6`<br>`a0256292a2ade20728d71d2ea9a7ce866f6955efe034934eaecbf820244e9ad8` |
| `0.5.0-beta.15.json` | `.kiro/hooks/inject-workflow-state.py` | `281939a51a62467a5dd73947fdec7143d0e936b4b64b5224ce0484186eb5b018`<br>`4231e4e0d52c9b05d66a215c870db30a876201a51350e5191953418ca4ec4637`<br>`50bd086d40654b9fe8cb902d2f321ce06e39b6d4020a6e9aa49154cc371bdb16` |
| `0.5.0-beta.9.json` | `.trellis/scripts/common/phase.py` | `412b7096ef0e48b8a95a79060121a586e0d9d44f1b350d6ed818c6f84330bb01` |
| `0.5.0-beta.9.json` | `.trellis/scripts/create_bootstrap.py` | `33b40df671ba7828fd8d3ba8c019823a8b03e938797b1cae218c55d6c7ebe57a`<br>`ce1503c052dadf2470ddb1cade42f331c0fd70d34e895d8d07044ba27548e17e`<br>`aa5dd1f39a77b2f4bb827fd14ce7a83fb51870e77f556fe508afce3f8eac0b4e` |
| `0.5.0-beta.9.json` | `.qoder/skills/trellis-finish-work/SKILL.md` | `c0f3ffa74e1e9990f93e5d44d03bd088c8698da1db4750b74d3eee4809a84aea`<br>`2027d8ea610e0a929a7ce147b29045406db8a8c9c2a767f98d779e5d53162f0c` |
| `0.5.0-beta.9.json` | `.qoder/skills/trellis-continue/SKILL.md` | `914545dab290e508a4c6b84d0a9f8debe68bcf9117cebe0fa85be0ef709d8fc1`<br>`3d2c83ad710b3b667851e28a473fb259a1330475e6b7417c769432f4a55a76f9` |

## Caveats / Not Found

- No host-specific migration paths were found for Trae, OMP, Grok, or Reasonix. Their retirement cleanup therefore depends on installation-manifest ownership plus a frozen generated-path inventory, not migration history.
- `safe-file-delete` hashes and `.template-hashes.json` hashes serve different purposes: accepted historical pristine bytes versus the exact bytes Trellis recorded as installed.
- The migration inventory must remain runtime-loaded; copying its paths into a legacy host inventory is unnecessary duplication unless a later task deliberately retires the migration subsystem itself.
