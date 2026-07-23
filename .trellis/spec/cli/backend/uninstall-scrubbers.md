# Uninstall Scrubbers

## 1. Scope / Trigger

`packages/cli/src/utils/uninstall-scrubbers.ts` contains pure, path-specific transformations used by `trellis uninstall` to remove only exact Trellis-owned values from mixed user configuration.

Retired host descriptors are compatibility-only. They do not create active host detection, generation, commands, or prefix ownership.

## 2. Signatures

```ts
interface ScrubResult {
  content: string;
  fullyEmpty: boolean;
  outcome: "scrubbed" | "unchanged" | "malformed";
}
```

Primary scrubbers:

```text
scrubHooksJson
scrubZcodeConfigJson
scrubOpencodePackageJson
scrubPiSettings
scrubCodexConfigToml
scrubManagedMarkdownBlock
```

`fullyEmpty` is actionable only when `outcome === "scrubbed"`.

## 3. Contracts

### Universal invariants

Every scrubber:

- is pure and has no filesystem, logging, network, or global mutation;
- never throws for malformed/unexpected input;
- returns original bytes for `unchanged` and `malformed`;
- rewrites content only after an exact successful scrub;
- validates the complete relevant shape before partial rewriting;
- is idempotent: a second pass returns byte-identical `unchanged` output.

### Caller boundary

Uninstall calls a scrubber only after the path is safe, exact, manifest-listed after pruning, mapped to a structured descriptor, and not protected Research. Execution re-reads bytes after confirmation and refuses to apply a stale plan.

### Hook JSON

- Support declared nested or flat shapes only.
- Remove an entry only when `command`, `bash`, or `powershell` ends in an exact owned hook path token (relative or absolute suffix).
- Substring mentions do not match.
- Drop empty matcher/event/hooks containers only after a match.
- Retired nested descriptors may retry exact flat compatibility only when nested validation is malformed; current Claude/Codex descriptors never use that fallback.

### Other exact formats

- ZCode recognizes only its current matcher-block and frozen direct-event schemas.
- OpenCode package scrub removes only `dependencies["@opencode-ai/plugin"]`.
- Pi settings scrub removes only exact Trellis-emitted values.
- Codex TOML scrub removes only exact managed assignments/comment markers.
- Managed Markdown scrub removes only the exact marker pair and deletes the file only if a successful scrub leaves no meaningful content.

### Hash boundary

Structured scrubbing is not whole-file hash-gated because user fields may coexist with Trellis fields. Opaque files use hash-gated deletion instead. A structured path outside manifest ownership is invisible.

## 4. Validation & Error Matrix

| Input/state | Required behavior |
|---|---|
| Exact Trellis-only structure | `scrubbed`; `fullyEmpty: true` when nothing meaningful remains. |
| Mixed Trellis/user structure | `scrubbed`; preserve all user values. |
| Valid user-only structure | `unchanged`; original bytes. |
| Malformed JSON/TOML/shape/marker pair | `malformed`; original bytes. |
| Empty but unchanged file | Preserve; `fullyEmpty` does not authorize deletion. |
| Hook command merely mentions a path | Preserve as user content. |
| One shell field matches and another does not | Remove the exact owned hook entry. |
| Current nested config has flat shape | `malformed`; no retired fallback. |
| Retired exact descriptor has valid frozen flat shape | Scrub through compatibility fallback. |
| Second pass | `unchanged`; byte-identical to first scrubbed output. |

## 5. Good / Base / Bad Cases

- **Good**: mixed Claude settings lose one exact Trellis hook while unrelated hooks and top-level fields survive.
- **Base**: a retired structured file contains no Trellis registration; return its exact original bytes as `unchanged`.
- **Bad**: recursively searching arbitrary JSON strings, using substring matching, canonicalizing a user-only file, or deleting an unchanged empty file.

## 6. Tests Required

For every scrubber:

- Trellis-only, mixed, user-only, malformed, empty, no-throw, and idempotent cases;
- exact original-byte assertions for unchanged/malformed results;
- exact user-field preservation after scrub;
- `fullyEmpty` actionable only after `scrubbed`;
- nested/flat hook modes, retired-only fallback, all supported shell fields, exact suffixes, and substring non-matches;
- ZCode current/frozen schemas and malformed-container behavior;
- managed Markdown valid/missing/malformed marker behavior;
- integration proof that confirmation-time edits are not replaced by stale scrub output.

## 7. Wrong vs Correct

```ts
// Wrong: recursively delete any string mentioning "trellis".
removeMatchingValues(parsed, /trellis/i);

// Correct: dispatch by exact path and remove only exact owned constants/paths.
const result = scrubHooksJson(content, ownedHookPaths, "nested");
```

```text
Wrong: JSON parses, so rewrite it with canonical indentation even when nothing matched.
Correct: return the exact input bytes for `unchanged` and `malformed`.
```

```text
Wrong: a retired host root implies every structured file uses a permissive parser.
Correct: only exact retired descriptors receive their declared compatibility fallback.
```
