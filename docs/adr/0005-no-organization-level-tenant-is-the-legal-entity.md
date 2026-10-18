# No separate Organization level; Tenant is the legal entity

## Status

accepted

## Context

Roadmap Phase 1.1 ("Organization & Branches") proposed a `Tenant → Organization →
Branch` hierarchy but left the Tenant/Organization relationship undefined, noting it
"must be defined before expanding further". Today no Organization, Branch, or Business
Location concept exists anywhere in the repo: `Tenant` is a flat row that already holds
the company's legal identity (`legalName`, `taxNumber`), base currency and document
sequences, and warehouses/cashboxes/invoices hang directly off it.

## Decision

We add only `Branch` as a child of `Tenant`. There is no `Organization` model. The
`Tenant` remains the legal entity (legal name, tax number, base currency, users, roles,
settings, document sequences) and `Branch` is its operational division. "Business
Location" is a UI synonym for Branch, not a second concept.

## Considered Options

- **(a) `Organization` as a 1:N level inside Tenant** — supports holdings / several legal
  entities on one subscription, but introduces a level the product does not need today.
- **(b) `Organization` 1:1 with Tenant** — a table created only so the model can grow,
  hidden in the UI.
- **(c) No Organization level — chosen.**

## Consequences

- Legal identity and every tenant-level concern stay exactly where they are; no data
  migration of identity fields.
- If multi-legal-entity groups are sold later, introducing Organization means adding
  `organizationId` to `Branch` (and every future branch-scoped table), backfilling, and
  widening unique constraints. This cost is accepted deliberately in exchange for not
  building a speculative level now.
- "Organization" is not project vocabulary; a future reader asking "where is the
  Organization model?" should read this ADR.
