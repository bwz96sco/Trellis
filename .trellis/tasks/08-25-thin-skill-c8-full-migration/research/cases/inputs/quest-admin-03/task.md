# Quest administration case 03: export and authority recovery

Use the accompanying imported Quest fixture with Trellis as current writer.

## Required execution

Preview and write a complete source-compatible export, validate the exported tree, simulate loss of the recoverable export projection, and recover it from exact existing target bytes without rewriting the target or duplicating canonical evidence. Then explicitly transfer writer authority back to source using the authenticated export digest and prove one source mutation succeeds. Finally record how authority would be transferred back to Trellis; do not enable dual write.

## Acceptance focus

- Export does not transfer writer by itself.
- Recovery preserves target bytes and ledger length.
- Writer transfer is explicit and digest-bound.
- No provider or model is involved.
