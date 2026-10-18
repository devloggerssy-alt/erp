# Master data is tenant-shared; branches stamp operational records only

## Status

accepted

## Context

The roadmap's Phase 1.1 dependency diagram nests `Party`, `Catalog`, `Pricing`, `Tax`
and `Currency` under `Branch`, which read literally would make every customer, item,
unit and price list branch-specific. Taken literally that would duplicate master data
per branch and break tenant-wide reporting.

## Decision

`branchId` is stamped on **operational records and physical resources only**:
warehouse links, cashboxes, bank accounts, invoices, payments, expenses, stock counts
and movements (via their warehouse), POS sessions, and journal entries. Master data —
parties, items, units, price lists, chart of accounts — stays **tenant-level and
shared** across all branches. The roadmap diagram is read as expressing which
workflows depend on branches, not table ownership.

## Consequences

- One customer and one item exist once per tenant and are usable by every branch.
- Branch-level reporting is derived from the branch stamped on documents, never from
  duplicated master rows.
- If a market later needs genuinely branch-specific items or prices, that is added as
  an optional refinement on the master record (e.g. a nullable `branchId` or a
  branch-scoped price list), not as tenant-wide re-scoping of master data.
- A future reader comparing the code to the roadmap diagram will see a deliberate
  divergence; this ADR is why.
