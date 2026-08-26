# Quest administration case 02: guarded source writer refusal

Use the accompanying source fixture and establish Trellis as canonical writer through the supported import path.

## Required execution

Invoke the exact guarded C8 source-admin entrypoint from source commit `86df5a676c52950592ff9fe5966b9c1753160cb5` for each mutating command (`init --force --write`, `migrate --force --write`, `status --write`, and `append-event --write`) while Trellis owns the Quest. Snapshot the complete source tree before each refusal and compare all relative paths and bytes afterward. Read-only status and validation must remain available and zero-write.

## Acceptance focus

The source and Trellis must never both accept writes. Refusal must happen before source filesystem mutation. Explicit transfer back to source is the only route that restores source writes. No provider, model, worker, or nested process is involved beyond the deterministic command processes under test.
