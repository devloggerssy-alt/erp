# Core Development Roadmap

> **Type:** Roadmap / tracking document — *not* an implementation ticket.
> **Last updated:** 2026-10-19
> **Owner:** Core team

This document tracks the **Core Development Priorities** of the ERP, ordered by
priority and dependency.

The items below are **proposed priorities**, not a claim that every component is
completely missing from the current codebase. Some areas require introducing new
business domains; others require completing models and capabilities that already
exist.

---

## How to use this document

1. This is a **roadmap / tracking issue**, not an implementation ticket.
2. Per the **HARD-GATE** in [`AGENTS.md`](./AGENTS.md), each numbered item must get
   its **own design spec** (a GitHub issue) — and a **plan** (child issues or a
   task list) for cross-stack work — **before any code is written**.
3. Items can be split into their own GitHub issues **once their design is
   approved** and the listed **dependency is satisfied**.
4. Keep this file up to date: tick checkboxes as work lands and link the spec,
   plan, and issue in the **Tracking** section.

### Legend

| Marker | Meaning |
|--------|---------|
| `[ ]` | Not started |
| `[~]` | In progress / spec drafted |
| `[x]` | Done (spec approved / phase complete) |
| 🅿️ | Blocked by a dependency |

> **Editable:** This file is plain Markdown. Add notes, owners, dates, or new
> rows as needed — but keep phase completion state in the checkboxes below.

---

## Dependency Overview

```
Tenant (legal entity)
  │
  ├── Branch / Business Location
  │     ├── Warehouse (may serve several branches)
  │     └── Cashbox
  │
  └── Shared master data (tenant-level, used by every branch)
        ├── Party
        │     ├── Contacts
        │     └── Addresses
        ├── Catalog
        │     └── Items / Services
        │           └── Units
        ├── Pricing
        ├── Tax
        └── Currency
              └── Exchange Rates

Branch-stamped operations
  ├── Inventory
  │     └── Reservations
  └── Commercial Documents
        ├── Invoices
        ├── Returns
        ├── Credit Notes
        └── Debit Notes
```

---

# Phase 1 — Establish the Commercial Foundation

> These establish the core business structure on which most subsequent
> commercial workflows depend.

- [ ] **Phase 1 complete**

## 1. Branches & Business Locations

**Priority:** Critical

Introduce **Branch** as the operational division of a tenant — the unit every
business operation is attributed to — and attach warehouses and cashboxes to it.
The branch/warehouse relationship is many-to-many: a branch may have zero
warehouses, and one warehouse may serve several branches.

Design is settled: ADR-0005 … ADR-0008 and `CONTEXT.md`.

- [ ] `Branch` model + `BranchWarehouse` join + backfill (one `MAIN` branch per tenant)
- [ ] Branch assignment on the warehouse form (≥ 1 branch per warehouse)
- [ ] `branchId` stamped on operational records, defaulted from a `defaultBranchId` setting
- [ ] Identify the branch responsible for each business operation

**Dependency:** This is the foundation for multi-branch operations. `Tenant` is the
legal entity; there is **no** separate Organization level (ADR-0005). Master data
stays tenant-shared (ADR-0006).

## 2. Party Relationships & Contacts

**Priority:** High

Extend the **existing** party model rather than replacing it.

- [ ] Multiple contacts per party
- [ ] Multiple addresses, with types such as billing and shipping
- [ ] Relationships between parties, such as a company and its representatives
- [ ] Commercial and tax registration information where required

**Dependency:** Builds on the existing **Party** model. These capabilities can be
developed in parallel with branches.

## 3. Catalog & Units Completion

**Priority:** High

Complete the item and service model before building generalized pricing
capabilities.

- [ ] Distinguish inventory items from services
- [ ] Different purchasing and selling units from the base unit
- [ ] Unit conversions and conversion ratios
- [ ] Support for attributes and variants when product characteristics differ

**Dependency:** **Item** and **Unit** already exist. The goal is to complete
their capabilities rather than rebuild the catalog.

---

# Phase 2 — Standardize Commercial Rules

> These can be developed partially in parallel once the fundamental models for
> money, currencies, and items have been established.

- [ ] **Phase 2 complete**

## 4. Pricing & Price Lists

**Priority:** High

Move pricing from a simple price attached to an item to a reusable commercial
pricing model.

- [ ] Multiple price lists
- [ ] Prices associated with units of measure and currencies
- [ ] Customer-specific or customer-group pricing
- [ ] Time-effective prices
- [ ] Discount rules and quantity-based pricing where required

**Dependency:** Catalog + Units + Currency. This should be designed **before**
significantly expanding commercial invoicing rules.

## 5. Tax Domain

**Priority:** High

Develop taxation as an independent business concept instead of relying on a
direct tax percentage inside invoice lines.

- [ ] Tax types, categories, and rates
- [ ] Tax-inclusive and tax-exclusive pricing
- [ ] Tax exemptions and different tax treatments
- [ ] Amount rounding rules and tax reporting requirements by country

**Dependency:** Currency, monetary precision, and invoicing. The model should
support multiple tax systems without assuming that all countries follow the same
rules.

## 6. Exchange Rates & Currency Valuation

**Priority:** Medium

Currency support already exists, but the commercial handling of multi-currency
transactions needs to be completed.

- [ ] Date-specific exchange rates
- [ ] Exchange rate at the time of the transaction
- [ ] Store both the original currency value and the base-currency value
- [ ] Handle exchange gains/losses during settlement where applicable

**Dependency:** Currency + Accounting + Payments. Supporting multiple currencies
is not simply a matter of changing the currency symbol or converting using the
current exchange rate.

---

# Phase 3 — Complete Commercial Operations

> Designed as interconnected business operations rather than isolated records.

- [ ] **Phase 3 complete**

## 7. Returns, Credit Notes & Debit Notes

**Priority:** Medium to High

Add proper commercial correction and return workflows without relying on fully
cancelling the original invoice.

- [ ] Sales and purchase returns
- [ ] Credit notes and debit notes
- [ ] Link corrective documents to the original document
- [ ] Handle the impact of returns on inventory, receivables/payables, and taxes

**Dependency:** Invoices, inventory, payments, and accounting. These should be
designed as interconnected business operations rather than isolated records.

## 8. Inventory Reservations & Availability

**Priority:** Medium

Extend inventory management to distinguish physical stock from stock that is
actually available for sale or use.

- [ ] On-hand quantity
- [ ] Reserved quantity
- [ ] Available quantity
- [ ] Reserve, release, and consume quantities

**Dependency:** `StockBalance` + `StockMovement`. Linking reservations to sales
orders or industry-specific operations should come once those workflows exist.

> Reservation design can begin in parallel, but connecting reservations to sales
> orders requires the order-management workflows to exist first.

---

## Implementation Order & Dependencies

| Phase | Theme | Items | Notes |
|-------|-------|-------|-------|
| **Phase 1** | Establish the Commercial Foundation | Organization & Branches, Party Relationships, Catalog & Units | Core business structure everything else depends on |
| **Phase 2** | Standardize Commercial Rules | Pricing, Tax, Exchange Rates | Partially parallel once money / currency / item models exist |
| **Phase 3** | Complete Commercial Operations | Returns & Credit/Debit Notes, Inventory Reservations | Reservations can start in parallel; order link needs order management |

---

## Current state in this repo (baseline, verified)

| Area | Exists today | Missing / to complete |
|------|--------------|-----------------------|
| **Tenant** | `packages/db-prisma/src/schema/tenant.prisma` — flat single-tenant record with settings, financial settings, base currency | No Organization / Branch / business-location model; warehouses, cashboxes and invoices hang directly off Tenant |
| **Party** | `party.prisma` — `PartyType { CUSTOMER, SUPPLIER, CUSTOMER_SUPPLIER }`, single phone / email / address strings, receivable & payable accounts | Contacts, typed addresses (billing/shipping), party-to-party relationships, commercial/tax registration fields |
| **Catalog** | `item.prisma` — `ItemType { product, service }` already exists, `defaultSellingPrice`, `latestPurchasePrice`, brands, categories, item relations | Purchasing/selling units beyond `baseUnitId`, unit conversions, attributes/variants |
| **Units** | `unit.prisma` — localized name + abbreviation | Conversion ratios and unit-of-measure relationships |
| **Pricing** | Item-level `defaultSellingPrice` / `latestPurchasePrice` only | Price lists, per-unit/per-currency prices, customer-group pricing, time-effective prices, discounts |
| **Tax** | Invoice-level `taxPercent` / `taxAmount` (`invoice.prisma`) plus `defaultTaxAccountId` (`financial-setting.prisma`) | Any independent tax domain: types, categories, rates, inclusive/exclusive handling, exemptions, rounding rules |
| **Currency** | `currency.prisma` — code, localized name/symbol, `isBase`; design tracked as a GitHub issue | No `ExchangeRate` model in the schema; no transaction-date rate capture, no original + base-currency value pairs, no FX gain/loss handling |
| **Inventory** | `warehouse.prisma` + `stock.prisma` (`Warehouse`, `WarehouseItem`, `StockBalance`, `StockMovement`), stock counts | Reserved/available quantities and reserve/release/consume operations |
| **Commercial documents** | `invoice.prisma`, payments, accounting/GL posting, POS | Returns, credit notes, debit notes, corrections linked to the original document |

**API modules today:** `accounting`, `ai-agent`, `audit`, `catalog`, `custom-fields`, `files`, `identity`, `inventory`, `invoicing`, `parties`, `platform`, `pos`, `reports` (`apps/api/src/modules`).

---

## Tracking

Specs and plans are tracked as GitHub issues.
Tick a row once its **design spec is approved**; tick the phase checkbox above
once **all** of its items are complete.

### Phase 1 — Establish the Commercial Foundation

- [~] **1. Branches & Business Locations** — design spec approved 2026-10-19
      - Spec: #29 · Plan: #30 → #31 → #32, #33, #34 · Issue: #30 (first slice)
      - Design: ADR-0005 … ADR-0008 · Glossary: `CONTEXT.md`
      - Slices: #30 branch CRUD · #31 default branch · #32 invoices · #33 payments/expenses/cashboxes · #34 POS
- [ ] **2. Party Relationships & Contacts** — design spec approved
      - Spec: _TBD_ · Plan: _TBD_ · Issue: _TBD_
- [ ] **3. Catalog & Units Completion** — design spec approved
      - Spec: _TBD_ · Plan: _TBD_ · Issue: _TBD_

### Phase 2 — Standardize Commercial Rules

- [ ] **4. Pricing & Price Lists** — design spec approved
      - Spec: _TBD_ · Plan: _TBD_ · Issue: _TBD_
- [ ] **5. Tax Domain** — design spec approved
      - Spec: _TBD_ · Plan: _TBD_ · Issue: _TBD_
- [ ] **6. Exchange Rates & Currency Valuation** — design spec approved
      - Spec: _TBD_ · Plan: _TBD_ · Issue: _TBD_

### Phase 3 — Complete Commercial Operations

- [ ] **7. Returns, Credit Notes & Debit Notes** — design spec approved
      - Spec: _TBD_ · Plan: _TBD_ · Issue: _TBD_
- [ ] **8. Inventory Reservations & Availability** — design spec approved
      - Spec: _TBD_ · Plan: _TBD_ · Issue: _TBD_

---

## Change log

| Date | Change |
|------|--------|
| 2026-10-19 | Phase 1.1 design agreed: no Organization level (ADR-0005), branch scopes operations only (ADR-0006), warehouses shared across branches (ADR-0007), numbering stays tenant-level (ADR-0008). Item renamed to **Branches & Business Locations**; dependency diagram redrawn. |
| 2026-10-18 | Initial roadmap created from Core Development Priorities (Phase 1–3, 8 items). |
