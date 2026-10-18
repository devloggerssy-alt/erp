# Document numbering stays tenant-level in Phase 1.1

## Status

accepted

## Context

`DocumentSequence` (invoice numbering) and `CodeSequence` (master-data codes) are
per-tenant today, and `Invoice` is uniquely constrained by `@@unique([tenantId,
number])`. Per-branch sequential numbering is a common legal requirement in the
markets this ERP targets, but re-constraining numbering later means renumbering or
re-keying historical documents.

## Decision

Numbering remains **per tenant** in this phase. `Branch` does not own sequences.
`DocumentSequence` gains a nullable `branchId` so that a future per-branch scheme is
an additive change, and `Invoice` keeps `@@unique([tenantId, number])`.

## Consequences

- Branches share one invoice number series, so two branches can act on documents from
  the same series and numbering is not accepted as per-branch statutory numbering.
- If per-branch registration becomes a requirement, the change is: backfill
  `DocumentSequence.branchId`, postfix-collide existing numbers, then narrow the
  unique constraint to `[tenantId, branchId, number]`. The nullable column is the
  deliberate seam that makes this possible without a table rewrite.
- A future reader should not assume an ERP with branches numbers per branch; this ADR
  records that the choice was deliberate.
