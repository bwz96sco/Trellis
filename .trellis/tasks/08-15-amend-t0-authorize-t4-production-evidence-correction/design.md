# T0A — T4 production evidence correction design

## Boundary

This is a forward-only governance overlay followed by an exact two-path T4 correction. It changes no production source and does not reinterpret or overwrite T6 Attempt-2.

```text
exact S1
  -> T6 Attempt-2 M0
  -> immutable Attempt-2 failure evidence 1d389f3
  -> standalone T0A T4 correction authority
  -> exact two-path T4 evidence correction
  -> separately governed T5 refreeze
```

## Evidence semantics

`expectedCodesPresent` and `productionPrevented` are independent observations:

- `expectedCodesPresent`: expected stable code or an already governed equivalent was observed.
- `productionPrevented`: the semantic mutation cannot enter through the authenticated production input boundary.

A case is acceptable when either observation is true. Neither field may impersonate the other.

## Compatibility

The existing `PRODUCTION_CODE_EQUIVALENCE` mapping remains unchanged. The 116 case identities, mutations, expected and actual production outcomes, write observations, Procedure allocation, and live selection remain unchanged.

## Failure routing

If the focused test exposes a production implementation defect, stop and route it to the owning T1–T3 stage. T4 does not repair production behavior. After a passing correction commit, T5 must create a new exact subject and freeze; T6 cannot reuse the old S1.
