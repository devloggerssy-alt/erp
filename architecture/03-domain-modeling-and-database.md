# Domain Modeling And Database

## Purpose

This document explains how E-Dukan models its business entities, how Prisma is organized inside the monorepo, and how the shared database package is consumed by the backend and other packages.

## Database Package Role

`packages/db` is the persistence foundation of the monorepo. It owns:

- Prisma schema files
- generated Prisma client output
- NestJS database integration through `PrismaModule` and `PrismaService`
- seed scripts
- database-related shared types and extensions

The package is not only a place for schema definitions. It is also the shared runtime integration point for backend database access.

## Prisma Package Structure

Important paths:

- `packages/db/prisma.config.ts`
- `packages/db/src/schema`
- `packages/db/src/nest/prisma.module.ts`
- `packages/db/src/nest/prisma.service.ts`
- `packages/db/src/client.ts`
- `packages/db/src/extention`
- `packages/db/src/types`
- `packages/db/src/seed`

## Schema Organization

The Prisma schema is modularized by domain instead of being kept in a single large file.

This is important because the business model spans multiple bounded areas:

- identity and users
- stores and store-related configuration
- catalog and product variants
- orders
- billing and subscriptions
- content and promotions
- currency and supporting reference data

That structure mirrors the backend module layout and makes schema ownership easier to understand.

The active schema slices called out in the earlier SaaS architecture analysis include:

- banners
- billing
- cart
- categories
- city
- collections
- currency
- files
- homepage
- notifications
- orders
- pages
- payment methods
- products
- promotions
- reviews
- stores
- system
- themes
- users

Some planned areas are visible as future-oriented or commented sections, especially inventory and fulfillment.

## Core Modeling Approach

At a high level, the platform model is centered around the store as a business unit, with related domains branching from it.

Examples of high-level relationships visible in the codebase and repository memory:

- a store owns operational data and configuration
- a store can have subscriptions and allowed currencies
- products belong to catalog structures and can carry pricing context
- orders connect customers, stores, and purchasable items
- billing entities such as plans, subscriptions, invoices, and receipts connect commercial platform behavior to store lifecycle

## Entity Categories

### Dominant Aggregate Roots

The legacy modeling analysis identified several dominant aggregate roots that are useful for understanding system boundaries:

- `Store` as the main store-scoped anchor
- `Product` as the main sellable catalog aggregate
- `Cart` as the pre-order shopping aggregate
- `Order` as the post-checkout transactional aggregate
- `PaymentMethod` as a platform-managed payment capability aggregate
- `StorePaymentConfig` as a store-level operational payment aggregate
- `Plan` and `Subscription` as SaaS billing aggregates

### Important Caveat About Store Ownership

`Store` is the dominant store-scoped root in the data model, but not every store-owned entity should be forced into one backend code module.

That distinction matters when reading both Prisma schema and Nest module organization.

### Separate Store-Scoped Aggregates

Several store-scoped entities still deserve separate aggregate treatment in documentation and code organization:

- collections
- banners and banner sliders
- homepage sections
- pages
- coupons and promotions
- store addresses and domains
- notification templates

### Association Models

The system also contains relationship-heavy models that are best documented as association models:

- `BannerOnSlider`
- `CollectionProduct`
- `ProductProductOption`
- `VariantOption`
- `StoreAllowedCurrency`
- `PaymentMethodCurrency`
- `UserRole`

## Generated Types And Upstream Reuse

Prisma-generated types are reused upward through the stack:

1. Prisma models and generated types originate in `packages/db`
2. selected database types are re-exported or referenced in `packages/contracts`
3. backend services use the Prisma client and Prisma types directly
4. frontend-facing DTOs and API envelopes are defined separately in contracts, but may align with or derive from database-backed shapes

This keeps the database package as the source of truth for persistence-level typing without forcing the transport layer to expose raw persistence shapes everywhere.

## NestJS Integration

The backend consumes the database package through two main entry points:

- `PrismaModule`, a global Nest module
- `PrismaService`, an injectable service that extends the shared Prisma client

The implementation in `packages/db/src/nest/prisma.module.ts` marks the module as global so feature modules do not need to import it repeatedly.

The implementation in `packages/db/src/nest/prisma.service.ts` wraps the extended Prisma client and hooks into Nest lifecycle methods:

- `onModuleInit()` connects to the database
- `onModuleDestroy()` disconnects from the database

This makes the db package both a schema owner and a backend integration package.

## Extensions And Shared Database Logic

The db package also contains custom extensions under `packages/db/src/extention`.

These are useful when the repository wants shared query behavior or reusable enriched client behavior without duplicating it in each backend service.

Current documentation should treat extensions as an advanced layer, not the primary database access pattern.

## Seed Data

Seed scripts live under `packages/db/src/seed` and initialize reference data such as:

- currencies
- cities
- catalog seed data
- payment methods
- theme presets
- identity-related baseline data

The legacy pricing and schema notes also identified catalog and business-category seed flows as part of the baseline system setup.

This is important because the platform has several reference domains that must exist before the dashboard and storefront are fully usable.

## Operational Scripts

The root workspace proxies database workflows to `packages/db`. Common commands include:

- `pnpm db:generate`
- `pnpm db:migrate:dev`
- `pnpm db:migrate:deploy`
- `pnpm db:seed`
- `pnpm db:studio`
- `pnpm db:reset`
- `pnpm db:push`

These commands are defined at the root so app developers do not need to remember package-local paths.

## How Database Modeling Connects To Other Layers

### Backend

Backend services inject `PrismaService` and perform business logic and database access in the same service class. The architecture deliberately does not force a repository layer everywhere.

### Contracts

The contracts package defines transport-layer DTOs and shared envelopes. It sits above the database layer and should not be treated as a raw dump of Prisma models.

### Frontend

Frontend apps should never use the db package directly. They consume API responses shaped by backend controllers, shared contracts, and the api-client package.

## Structural Modeling Guidance

The older SaaS architecture analysis produced a useful no-logic-change principle for future refactors:

- preserve routes, DTOs, Prisma behavior, and service logic
- improve module and folder ownership without changing runtime semantics
- use aggregate boundaries to clarify ownership, not to force premature rewrites

This principle is especially relevant when schema ownership is broad but backend module boundaries are still converging.

## Practical Notes

- schema changes start in `packages/db`
- migrations and client generation happen from the db package workflow
- backend behavior changes may require updates in contracts and api-client if transport shapes change
- database entities and API DTOs are related but not interchangeable concepts

## Next Reading

Continue with [04-backend-architecture.md](./04-backend-architecture.md) for the controller-to-Prisma execution path.