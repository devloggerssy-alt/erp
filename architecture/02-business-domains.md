# Business Domains

## Purpose

This document maps the business capabilities of E-Dukan to the codebase structure so that features can be located quickly across backend modules, Prisma schema, shared contracts, and frontend applications.

## Domain Summary

E-Dukan is a commerce platform with multiple operating surfaces:

- merchant management through the store dashboard
- customer shopping through the storefront
- administrative control surfaces
- shared backend infrastructure for identity, catalog, orders, billing, and content

The repository already reflects two views of the business model:

- the current runtime module layout in `apps/api/src/modules`
- the broader domain/entity model expressed in `packages/db/src/schema`

The canonical domain map below merges both views.

## Primary Business Domains

### Identity And Access

Owns:

- authentication
- user identity
- merchant onboarding entry points
- auth-related request context

Main code areas:

- `apps/api/src/modules/identity`
- `packages/contracts/src/routes/auth.routes.ts`
- `packages/contracts/src/dto/auth`
- frontend auth providers and login flows

### Store Management

Owns:

- store profile and lookup
- store settings
- store addresses
- store theme configuration
- store-level operational data

Main code areas:

- `apps/api/src/modules/store`
- `packages/contracts/src/routes/store.routes.ts`
- `packages/contracts/src/routes/store-addresses.routes.ts`
- `packages/contracts/src/routes/store-theme.routes.ts`
- store-dashboard store module and provider layer

### Catalog

Owns:

- products
- categories
- collections
- variants
- merchandising data

Main code areas:

- `apps/api/src/modules/catalog`
- Prisma schema modules for products and related catalog entities
- store-dashboard CRUD flows for categories and products
- storefront listing and product presentation

### Orders

Owns:

- cart-to-order conversion support on the backend side
- order lifecycle
- merchant order management
- customer order access

Main code areas:

- `apps/api/src/modules/orders`
- `packages/contracts/src/routes/orders.routes.ts`
- frontend order management screens and storefront checkout/order flows

### Billing And Pricing

Owns:

- pricing calculations
- plans and subscriptions
- invoices and receipts
- store billing-related data

Main code areas:

- `apps/api/src/modules/billing`
- `apps/api/src/common/services/pricing.service.ts`
- Prisma billing schema files

### Currency

Owns:

- active currencies
- exchange rate support
- currency-aware pricing context

Main code areas:

- `apps/api/src/modules/currency`
- pricing service integration
- frontend currency header handling in provider setup

### Promotions And Marketing Content

Owns:

- promotions
- coupons
- homepage sections
- banners and sliders
- reusable marketing content structures

Main code areas:

- `apps/api/src/modules/promotions`
- `apps/api/src/modules/content`
- matching contracts and frontend clients/components

### Content And Merchandising

For architectural analysis, it is useful to separate pure content and merchandising concerns from discounting logic.

This area includes:

- banners
- banner sliders
- homepage sections
- pages
- collections
- reviews

In the older architecture analysis, these were called out because some of them are customer-facing content structures while others are catalog-adjacent merchandising structures.

### Payments And Currency

This area combines:

- payment method catalog
- store payment configuration
- payment records
- currencies and exchange rates
- store-allowed currencies

In current runtime code, currency and payment-related capabilities are not fully grouped under a single top-level payments domain, but architecturally they are closely related.

### Billing And SaaS Platform

This area is distinct from storefront customer payments.

It covers the store-to-platform commercial relationship:

- plans
- subscriptions
- manual invoices
- payment receipts

### Notifications And Audit

This area covers operational messaging and activity-like system behavior, including:

- notification templates
- user-facing notifications
- activity or audit-style records where present

### Shared Reference And Support

Some entities exist primarily as reference or support data used by multiple domains, such as:

- cities
- files
- business categories
- theme presets

### Planned But Inactive Domains

The legacy SaaS architecture analysis highlighted several planned or placeholder areas that should remain visible in documentation even if they are not yet fully active in runtime wiring:

- onboarding
- analytics
- payments workflow expansion
- purchase
- shipping
- inventory and fulfillment schema areas that are present as future-oriented models or comments

### Notifications And System Infrastructure

Owns:

- outbound notifications
- platform/system support capabilities
- shared infrastructure that is not part of a merchant-facing business entity

Main code areas:

- `apps/api/src/modules/notifications`
- `apps/api/src/modules/system`

## Domain To Code Mapping

| Domain | Backend | Database | Contracts | Frontend |
| --- | --- | --- | --- | --- |
| Identity | `modules/identity` | user/auth-related Prisma models | auth routes and DTOs | auth providers, login flows |
| Store | `modules/store` | store, address, theme-related models | store routes and DTOs | store-dashboard store module |
| Catalog | `modules/catalog` | products, categories, variants, collections | product/category routes and DTOs | dashboard CRUD, storefront product views |
| Orders | `modules/orders` | order and line item models | order routes and DTOs | dashboard orders, storefront checkout/history |
| Billing | `modules/billing` | plans, subscriptions, invoices, receipts | billing-related DTOs/types | merchant billing UX |
| Currency | `modules/currency` | currency and rates | currency routes and DTOs | currency-aware API requests and pricing display |
| Content / Promotions | `modules/content`, `modules/promotions` | content and promo-related models | content and promotion routes | storefront and dashboard content management |

## Entity Ownership View

The older SaaS architecture write-up included an ownership breakdown that is useful for navigation.

### Platform-Wide Entities

- user and role entities
- business categories and theme presets
- payment methods
- currencies and exchange rates
- plans
- shared lookup/support entities such as city and file

### Store-Scoped Entities

- store, store members, store addresses, and domains
- catalog entities such as categories, products, product options, and variants
- content and merchandising entities such as banners, sliders, collections, homepage sections, and pages
- promotions, coupons, carts, checkout sessions, orders, store payment configuration, subscriptions, and notification templates

### User-Scoped Or User-Targeted Entities

- customer addresses
- notifications

### Association Models

Several models mainly serve as relationship glue and should be understood as association models rather than primary aggregates:

- user-role joins
- collection-product joins
- banner-on-slider joins
- product-option and variant-option joins
- allowed-currency and payment-method-currency joins

## Audience Split

A core backend design choice is separating many routes by audience rather than by deployable service.

Typical audiences are:

- public storefront traffic
- authenticated merchant dashboard traffic
- admin traffic

This pattern appears in several modules through separate controllers such as public, merchant, and admin controllers.

## Cross-Domain Flows

Several business flows cross more than one domain:

- merchant onboarding touches identity, store, and possibly billing
- product pricing touches catalog, billing/pricing, and currency
- checkout and order handling touch storefront, orders, store configuration, and pricing
- dashboard CRUD screens often combine contracts, api-client, backend query helpers, and store-scoped authorization

## Current Runtime Domains vs Target Domain Grouping

The runtime backend is already split into business modules, but the older SaaS analysis identified a cleaner target grouping for long-term structure:

- identity
- stores
- catalog
- content
- promotions
- checkout
- orders
- payments
- billing
- system
- shared

That target grouping is useful as a documentation lens even when the implementation still contains mixed-domain modules or placeholder areas.

## Reading Guidance

- For persistence and entity structure, continue to [03-domain-modeling-and-database.md](./03-domain-modeling-and-database.md).
- For backend execution structure, continue to [04-backend-architecture.md](./04-backend-architecture.md).
- For shared package integration, continue to [06-contracts-and-api-client.md](./06-contracts-and-api-client.md).