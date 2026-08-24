# Quest administration case 02: source writer refusal

Use the accompanying source fixture and establish Trellis as canonical writer through the supported import path.

## Required execution

Invoke the real frozen source-admin entrypoint for each mutating command (`init --write`, `migrate --write`, `status --write`, and `append-event --write`) while Trellis owns the Quest. Snapshot the complete source tree before each refusal and compare all relative paths and bytes afterward. Read-only status and validation must remain available and zero-write.

## Acceptance focus

The source and Trellis must never both accept writes. Refusal must happen before source filesystem mutation. No provider or model is involved.
