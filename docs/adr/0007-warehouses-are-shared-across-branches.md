# Warehouses are shared across branches; stock stays keyed to the warehouse

## Status

accepted

## Context

A branch needs to be identified as responsible for each business operation, but the
business also has physical warehouses that serve more than one branch (a central
store, a shared cold room, a single receiving dock). Stock is physically located in a
warehouse, not in a branch, and `StockBalance` / `StockMovement` are already keyed by
`warehouseId`.

## Decision

`Warehouse` and `Branch` are **many-to-many** (`BranchWarehouse`). A warehouse must
belong to at least one branch; a branch may have zero warehouses. Stock balances and
movements keep `warehouseId` and carry **no** `branchId`. Branch stock figures are
computed by summing the branch's linked warehouses, which means a shared warehouse's
stock is counted for every branch it serves.

## Considered Options

- **`isPrimary` flag on the join**, counting a shared warehouse only under one branch —
  rejected: it hides stock from the other branches that physically use it.
- **Excluding shared warehouses from branch stock reports** — rejected: branches that
  own no warehouse would then show no stock at all.

## Consequences

- Branch stock totals may overlap and therefore need not sum to the company total.
  Reports must label shared warehouses ("included in N branches") rather than imply
  that branch totals add up.
- Inter-branch stock movement is still modelled as a transfer between two warehouses,
  never as moving a warehouse.
- Branch attribution of an operation is never derived from the warehouse, because a
  shared warehouse has no single branch.
