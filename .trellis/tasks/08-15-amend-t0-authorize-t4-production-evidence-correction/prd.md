# T0A — Authorize T4 production evidence correction

## Goal

Preserve committed T6 Attempt-2 as immutable nonauthoritative failure evidence and authorize the minimum T4 correction that separates observed stable-error codes from the independent `productionPrevented` disposition.

## Normative authority

`task.json` is the sole normative authorization. The other five standard files explain and validate the same boundary.

## Confirmed defect

The frozen T4 helper returned `true` for `expectedCodesPresent` whenever `productionPrevented` was true. Sixteen production-prevented cases therefore recorded an error-code-presence claim despite `actualStableErrors` being empty. Eight other cases use the pre-existing governed `PRODUCTION_CODE_EQUIVALENCE` mapping and are not part of this correction.

## Requirements

1. Keep Attempt-2 commit `1d389f3` and all earlier attempts immutable.
2. Change exactly the T4 production test and its generated 116-row evidence.
3. Make `expectedCodesPresent` mean only that every expected code has either appeared or matched an existing governed equivalent.
4. Preserve case acceptance as `expectedCodesPresent || productionPrevented`.
5. Preserve all 116 identities, expected/actual outcomes, filesystem/event observations, code-equivalence mapping, live Procedure `1.0.0`, dormant Procedure `2.0.7`, and production source.
6. Run the focused T4 production test and deterministic evidence comparison.
7. Commit the correction separately before any T5 refreeze.

## Acceptance criteria

- [ ] Governance commits exactly six standard files.
- [ ] Correction changes exactly two paths.
- [ ] All 116 rows remain present and ordered.
- [ ] Sixteen production-prevented rows record `expectedCodesPresent=false`; every other row remains true.
- [ ] Focused T4 test passes without production-source changes.
- [ ] No provider, network, activation, acceptance, release, publication, push, live-selection, worker-authority, T6 Attempt-3, or T7 action occurs.

## Out of scope

Production implementation changes, new error-code equivalences, case-population changes, T5 refreeze, T6 harness correction, Attempt-2 rewrite, and every operational action.
