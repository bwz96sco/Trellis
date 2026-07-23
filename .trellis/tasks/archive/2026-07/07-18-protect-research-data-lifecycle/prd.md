# Protect research data lifecycle

## Goal

Redesign `trellis uninstall` and migration/update ownership rules so canonical research state and modified user content survive by default.

## Requirements

- Treat `.trellis/research/**` as protected canonical user data in uninstall, update, migrations, safe-file-delete, backup planning, and manifest pruning.
- Default uninstall must never recursively remove `.trellis/`.
- Opaque manifest-owned files may be deleted only when current content matches its recorded hash under the existing manifest hash contract (SHA-256 after line-ending normalization); this child introduces no hash-schema migration.
- Modified opaque files must be preserved and released from Trellis ownership.
- Mixed-ownership files must use their path-specific structured scrubber. Preserve unrelated user fields/content.
- Malformed or unexpected mixed files must remain byte-identical and be reported as malformed/preserved.
- Missing manifest-owned files are non-errors.
- Unknown or poisoned manifest keys must be pruned from ownership without deleting the corresponding file.
- Dry-run must write nothing, including manifest, structured config, hashes, version, backups, or directories.
- Update and migration classification must reject any operation whose source or destination is inside `.trellis/research/**`.
- Empty-directory cleanup may remove only confirmed-empty managed directories; it must stop before protected research data and must not remove `.trellis/` while protected/user-owned content remains.
- Do not add `--purge-research` or any automatic research deletion path.
- Preserve current CLI flags and host registry in this child.

## Acceptance Criteria

- [x] Uninstall preserves a complete C01 schema-v1 research fixture byte-for-byte.
- [x] Uninstall no longer calls recursive removal on `.trellis/`.
- [x] Pristine opaque generated files are removed.
- [x] Modified opaque generated files survive and lose stale manifest ownership.
- [x] Structured mixed files lose only Trellis-owned fields; unrelated user content survives.
- [x] Malformed mixed files remain byte-identical and are reported without throwing.
- [x] Unknown manifest entries are pruned while their files remain untouched.
- [x] Dry-run produces zero filesystem mutations, including manifest pruning.
- [x] Update safe-file-delete and regular migration paths cannot source from or target `.trellis/research/**`.
- [x] Repeated uninstall/update is idempotent. A workspace containing only protected research data and no managed ownership entries is a friendly uninstall no-op.
- [x] Result/plan output distinguishes deleted, scrubbed, protected, modified, malformed, missing, and unknown paths.
- [x] Existing uninstall/update safety tests plus new research-preservation tests pass.
- [x] No retired-host registry or template removal occurs in this child.

## Notes

- C01 compatibility fixtures are prerequisite evidence.
- Historical generic `.trellis/spec`, `.trellis/tasks`, and `.trellis/workspace` behavior is not broadened into research deletion. This child guarantees research preservation first; broader research-only layout cleanup belongs to later children.
