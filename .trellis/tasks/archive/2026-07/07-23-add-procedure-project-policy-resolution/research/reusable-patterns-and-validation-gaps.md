# Research: Reusable Patterns and Validation Gaps

- **Query**: Find reusable filesystem, strict JSON, schema, hashing, canonical serialization, error, and package-audit patterns for C04.
- **Scope**: internal
- **Date**: 2026-07-24

## Findings

### Files Found

| File Path | Description |
|---|---|
| `packages/core/src/research/schema.ts` | Strict runtime object schema and SHA-256 binding format. |
| `packages/core/src/research/projections.ts` | `stableResearchJson`. |
| `packages/cli/src/utils/atomic-write.ts` | Same-directory atomic replacement. |
| `packages/cli/src/commands/research/dispatch-context.ts` | Containment, regular-file, symlink rejection patterns. |
| `packages/cli/src/commands/research/errors.ts` | Typed Research error classes/codes. |
| `packages/cli/scripts/packed-cli-audit.js` | Required/forbidden tar inventory and safe path normalization. |
| `packages/cli/scripts/release-preflight.js` | Clean build + real tarball verification. |
| `packages/core/scripts/verify-packed-core.js` | Packed public-subpath runtime/type consumer fixture. |

### Code Patterns

#### Strict object schemas

`packages/core/src/research/schema.ts:80-102` rejects null, arrays, non-plain prototypes, unknown keys, and missing required keys. C04 should match this behavior in new pure schemas rather than add Zod to core.

Existing digest binding validator at `schema.ts:153-159` enforces:

```text
^sha256:[0-9a-f]{64}$
```

#### Stable policy serializer

`packages/core/src/research/projections.ts:19-33` recursively sorts object keys, preserves array order, emits two-space JSON, and adds one final LF:

```ts
export function stableResearchJson(value: unknown): string {
  return `${JSON.stringify(stableValue(value), null, 2)}\n`;
}
```

Use unchanged for policy digest. It is not Procedure manifest serializer: manifest requires frozen field order and compact canonical bytes, not recursive lexical order.

#### Atomic write

`packages/cli/src/utils/atomic-write.ts:14-31` writes a temp file in the target directory and renames with replacement semantics. Call it unchanged and do not modify it, but do not target final `policy.json` directly for absent-only creation; stage at a unique sibling and use exclusive no-replace publication.

#### Containment and symlink safety

`dispatch-context.ts:251-259` uses `path.relative` containment. Request resolution combines `stat`, `lstat`, `realpath`, directory identity, filename identity, and symlink rejection (`:286-360`). Repository paths canonicalize nearest existing ancestor to reject symlink escapes even for missing write targets (`:402-482`). C04 should use equivalent isolated logic for Procedure/policy reads.

#### Typed errors

Patterns:

```ts
class ResearchCapabilityResolutionError extends Error {
  readonly code: ResearchCapabilityResolutionErrorCode;
}

class ResearchDispatchContextError extends Error {
  readonly code: ResearchDispatchContextErrorCode;
}
```

C04 should expose separate typed errors, likely `ResearchProcedureResolutionError` and `ResearchProjectPolicyError`, using C01 stable codes:

- `INVALID_PROJECT_PROCEDURE`
- `INVALID_BUNDLED_PROCEDURE`
- `INVALID_RESEARCH_POLICY`
- `POLICY_WIDENS_AUTHORITY`

Digest mismatch codes belong later revalidation/authorization paths, not new C04 event or Context behavior.

#### Package proof

`copy-templates.js:25-73` copies non-TS assets. `packed-cli-audit.js:105-208` normalizes tar paths before required/forbidden checks. `release-preflight.js` clean-builds and packs a real CLI tarball. `verify-packed-core.js:38-153` creates isolated runtime/type consumers for public exports.

### Missing Reusable Components

#### Duplicate-key JSON detection

Repository uses `JSON.parse`; it cannot report duplicate object keys. No reusable duplicate-key parser found. Post-parse Zod/custom schema cannot recover overwritten keys.

C04 needs one isolated byte-level JSON scanner/parser. Required behavior:

- reject UTF-8 BOM before decode;
- decode with fatal UTF-8 validation;
- reject comments/trailing tokens through JSON grammar;
- track object-key sets independently at every nesting level;
- report duplicate key before `JSON.parse` result is trusted;
- then pass parsed value through strict plain-object/allowed-key schemas.

Avoid regex-only duplicate detection: escaped keys, nested objects, strings, and Unicode escapes make it unsafe.

#### Exact Procedure UTF-8/newline validation

No reusable helper covers all C01 byte rules. New helper must inspect raw bytes:

- `procedure.json`: non-empty, no BOM, valid UTF-8, exactly one terminal `0x0A`, no earlier extra terminal LF, canonical byte equality.
- `PROCEDURE.md`: non-empty, no BOM/NUL, valid UTF-8, no line-ending or final-newline normalization.
- Policy: no BOM, valid UTF-8, strict JSON; source formatting retained but digest uses parsed complete policy.

#### SemVer validation

No core SemVer dependency or exact validator found. CLI version comparison is precedence logic, not C01 grammar. C04 should use a narrow exact SemVer regex/parser in core: no leading `v`, whitespace, build metadata, or leading-zero numeric identifiers. Do not add package dependency for one grammar.

### External References

None. User prohibited web/network research.

### Related Specs

- `.trellis/spec/cli/backend/filesystem-safety.md` — validate-before-resolution and exact-byte rules.
- `.trellis/spec/cli/unit-test/conventions.md` — digest framing vectors.
- `.trellis/spec/cli/unit-test/integration-patterns.md` — real filesystem and packed-artifact proof.

## Caveats / Not Found

- Existing `computeHash()` in `template-hash.ts:44-47` normalizes CRLF. It is invalid for Procedure digest.
- `stableResearchJson` sorts all object keys. It is valid for policy digest only, not frozen-order manifest serialization.
- `writeFileAtomic` assumes parent directory exists and renames with replacement semantics. New create-policy helper must create/validate the contained parent, stage through the unchanged writer at a unique sibling, and publish with an exclusive no-replace link so a concurrent policy is never overwritten.
