# Attempt-3 governance design

## Topology
Canonical Phase-2 parent -> Attempt-3 governance -> Author -> Assurance -> Decision. G133 owns governance only.

## Correction boundary
The sole correction class is `candidate-evidence/provenance-target-closure`. A133 must regenerate, never hand-edit, a 19-key frozen target from authenticated sources. Ten candidate outputs remain byte-identical; only target, assurance corpus, validation, generator, and output manifest change.

## Provenance closure
All 14 frozen-target pointers must resolve with correct plain/wrapped shape and semantic equality. `DEC-*`, `NA-*`, and `BLK-*` resolve against the normative decision ledger; `CS6-*` against the correction ledger; `EV-*` against the public evidence index.

## Digest topology
The candidate manifest excludes the target and remains unchanged. The target hashes the manifest and is the root semantic digest source. No self-hash or cycle is permitted.

## Failure
Any fifth normative change, provenance-row drift, placeholder-only value, role reuse, authority widening, or identity mismatch stops the attempt.
