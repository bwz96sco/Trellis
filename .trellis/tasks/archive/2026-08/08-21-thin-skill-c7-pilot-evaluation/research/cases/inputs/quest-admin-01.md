# Quest administration case 01: import preview/write exactness

Use the accompanying source fixture as the complete compatibility input.

## Required execution

For each arm, first produce a preview with exact source and artifact digests, mapping, conflicts, and intended writes. Verify preview is zero-write. Only then perform the explicit write action appropriate to that arm. For Trellis, require the exact preview token and unchanged source digest.

## Acceptance focus

- No source field is silently guessed or dropped.
- Preview and write remain separate.
- The committed writer becomes Trellis only after successful import.
- No provider or model is involved.
