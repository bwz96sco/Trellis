# Research Procedure packages

## Schema domains

Keep separate:

1. Procedure package schema (v1 two-file, v2 hybrid support pack)
2. Research event schema
3. Worker Context schema

## v1 packages

Layout: `procedure.json` + `PROCEDURE.md` only. Digest domain `trellis-research-procedure-digest-v1`. Unnamed siblings are non-authoritative.

## v2 packages

Layout adds enumerated `methodology/` support pack via `methodology/pack.json`. Digest domain `trellis-research-procedure-digest-v2` binds:

1. canonical procedure.json
2. PROCEDURE.md bytes
3. canonical pack.json
4. ordered inventory metadata
5. exact bytes of every enumerated entry

## Resolver modes

- `registry-current` — capability registry id@version for new activations
- `activation-recorded` — exact recorded id/version for historical revalidation

Historical activations must never inherit new package bytes after a registry current-version switch.
