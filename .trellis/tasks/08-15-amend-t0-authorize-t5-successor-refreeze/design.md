# T0A — T5 successor refreeze design

## Boundary

```text
corrected T4 e7ed93f6
  -> governance-only T0A
  -> exact eight-path I2 integration commit
  -> exact one-path S2 freeze commit
  -> separately governed T6 Attempt-3
```

Original I1/S1 and both failed T6 attempts remain immutable historical objects.

## Successor shape

I2 mirrors the original T5 mechanism under new paths: one task record, one installed-package audit script, one focused test, and five evidence records. S2 contains only the exact-subject freeze JSON.

The successor script authenticates corrected T4 commit/tree, reads the committed G0 protected baseline, packages real Core and CLI tarballs, installs them into external temporary npm and pnpm consumers in offline mode, verifies live/dormant Procedure authority, and writes or byte-verifies four machine-derived evidence records. The fifth evidence record is the execution ledger assembled after checks.

## Compatibility and containment

No production source, contract member, package identity, Procedure package, live selection, worker authority, or semantic decision changes. Network package resolution and provider execution remain forbidden. Corrections after S2 require another forward-only subject.
