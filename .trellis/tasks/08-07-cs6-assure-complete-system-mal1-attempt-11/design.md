# CS6-7 MAL-1 attempt-11 design

## Boundary

The reviewer is an isolated machine auditor. It consumes one exact immutable subject and produces evidence only.

## Review model

1. Verify S11 and reviewer independence.
2. Extract exact subject to scratch without overlay.
3. Run each corpus command independently and continue collecting all outcomes.
4. Recompute contract/package/harness/report/authority/containment facts.
5. Write the eight evidence outputs.
6. Derive the ninth output, `machine-verdict.json`, mechanically.

## Portability

The corpus must not require `.git` inside the extraction, source-tree paths, inherited caches, network access, or shell-specific conveniences without portable wrappers. Exact argv/cwd/environment/exit/output digests are retained.

## Authority

A machine pass is evidence only. `completeSystemMachineAssuranceAccepted` remains false until a separately authorized operator decision, and even operator acceptance cannot imply activation or release.

## Retry

A failed attempt is immutable evidence. Technical defects return to the owning child and require a new I/S/M sequence. Environment failure also yields fail unless governance separately authorizes a new run from the same exact subject.
