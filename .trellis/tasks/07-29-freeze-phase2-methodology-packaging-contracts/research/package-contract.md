# Procedure package contract (schema v1 + v2)

## Schema-v1 compatibility (byte/digest)

v1 package layout remains exactly:

```text
<procedure-id>/1.0.0/
  procedure.json
  PROCEDURE.md
```

- Existing `parseResearchProcedure` / `computeResearchProcedureDigest` v1 vectors must remain byte-identical for v1 packages.
- Historical activations bind `procedure.id` + `procedure.version` + `procedure.digest` and must revalidate against **recorded** package bytes.
- Unnamed sibling files are non-authoritative for v1.

## Schema-v2 hybrid package

```text
<procedure-id>/2.0.0/
  procedure.json
  PROCEDURE.md
  methodology/
    pack.json
    instructions/...
    artifacts/...
    templates/...
    rubrics/...
    validators/...
```

### pack.json requirements

Every authoritative support-pack entry must be:

1. explicitly enumerated in `pack.json`
2. normalized path-contained under `methodology/`
3. non-symlinked regular file
4. role-typed and media-typed
5. contract-versioned
6. provenance-bound (source evidence id / abstract contract id)
7. SHA-256-bound
8. size-bounded
9. included in stable ordering for digest

Support packs contain **no** commands, executable modules, model/network calls, launch authority, or mutation authority. Declarative validator descriptors only.

## Digest domains

| Domain | Binds |
|--------|--------|
| v1 | canonical procedure.json + exact PROCEDURE.md bytes |
| v2 | v1 materials + canonical pack.json + normalized ordered inventory + exact bytes of every enumerated entry |

Do not embed a self-referential final Procedure digest inside pack.json.

## Resolver modes

| Mode | Use |
|------|-----|
| `registry-current` | preparing new activations |
| `activation-recorded` | revalidating existing activations (exact id/version/digest) |

Present-invalid project overrides must fail closed with **no** silent bundled fallback when an override is present but invalid.

## Version domains (separate)

1. Procedure package schema v1/v2
2. Research event schema v1/v2
3. Worker Context v1/v2

A package schema change must not imply event migration or silently upgrade historical Context.
