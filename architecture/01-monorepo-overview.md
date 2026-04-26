# Monorepo Overview

## Purpose

The E-Dukan repository is a Turborepo-based TypeScript monorepo that contains:

- customer-facing storefront applications
- merchant-facing dashboard applications
- a shared NestJS API backend
- shared packages for database access, contracts, API consumption, UI, and utilities

The monorepo is designed so that backend and frontend applications share route constants, DTOs, Prisma-derived types, and infrastructure helpers instead of duplicating them per app.

## Top-Level Structure

### Apps

`apps/` contains deployable applications:

| App | Responsibility | Main stack |
| --- | --- | --- |
| `apps/api` | Shared backend API for merchant, storefront, and admin use cases | NestJS, Prisma, Swagger, Passport, i18n |
| `apps/store-dashboard` | Merchant dashboard for CRUD workflows and operations | Next.js App Router, React Query, NextAuth, nuqs |
| `apps/storefront` | Public storefront experience | Next.js App Router, React Query, shared API client |
| `apps/admin` | Admin-facing application surface | Next.js |
| `apps/landing` | Landing and marketing site | Next.js |

### Packages

`packages/` contains reusable modules shared across applications:

| Package | Responsibility |
| --- | --- |
| `packages/db` | Prisma schema, generated client, NestJS Prisma integration, seed scripts |
| `packages/contracts` | Shared API routes, DTOs, API envelopes, resource keys, shared domain types |
| `packages/api-client` | Typed HTTP client, feature-specific client modules, API registry, React integration |
| `packages/shared` | Shared utilities for React, Next.js, and general helpers |
| `packages/ui` | Shared UI components |
| `packages/locales` | Shared localization resources |
| `packages/eslint-config` | Shared lint configuration |
| `packages/typescript-config` | Shared TypeScript base configs |

### Documentation And Assets

| Path | Responsibility |
| --- | --- |
| `docs/architecture` | Canonical architecture documentation |
| `assets/docs` | Documentation assets |
| `assets/fav` | Shared favicon and manifest resources |

## Workspace Tooling

The workspace is driven by the root [package.json](../../package.json) and [turbo.json](../../turbo.json).

### Core Toolchain

| Tool | Role |
| --- | --- |
| `pnpm@9` | Workspace package manager |
| `turbo@2.5.6` | Task graph orchestration for build, dev, lint, and type-check |
| `TypeScript 5.9.x` | Shared type system across apps and packages |
| `Prettier 3.x` | Formatting |

### Root Scripts

The root scripts are workspace entry points rather than app-specific commands:

- `pnpm build` runs `turbo run build`
- `pnpm dev` runs `turbo run dev`
- `pnpm start` runs `turbo run start`
- `pnpm lint` runs `turbo run lint`
- `pnpm check-types` runs `turbo run check-types`
- `pnpm db:*` proxies database workflows into `packages/db`

### Turbo Task Model

The task graph has a few important properties:

- `build` depends on upstream package builds
- `lint` and `check-types` also depend on upstream package tasks
- `dev` is persistent and uncached
- `start` is uncached
- build inputs include environment files through `.env*`

This means package outputs are expected to flow upward into dependent apps instead of each app rebuilding dependency logic independently.

## Main Libraries By Layer

### Backend

From [apps/api/package.json](../../apps/api/package.json), the main backend stack is:

- NestJS 11
- Prisma via `@e-dukan/db`
- Passport JWT and local strategies
- `class-validator` and `class-transformer`
- `nestjs-i18n`
- Swagger via `@nestjs/swagger`
- mailer, S3 SDK, Twilio, Multer, cookie-parser

### Frontend

From [apps/store-dashboard/package.json](../../apps/store-dashboard/package.json) and the storefront app, the main frontend stack is:

- Next.js 15 App Router
- React 19
- TanStack React Query 5
- NextAuth
- next-intl
- nuqs for query state
- React Hook Form with Zod
- Radix UI primitives
- Tailwind CSS 4

### Shared Type And Data Flow Stack

The architectural backbone is:

1. Prisma models and types in `packages/db`
2. routes and DTOs in `packages/contracts`
3. typed client modules in `packages/api-client`
4. backend services/controllers and frontend providers/components consuming the same shared contracts

## Responsibility Boundaries

The monorepo is intentionally split by responsibility:

- `apps/*` own runtime behavior and UI/API entry points
- `packages/contracts` owns shared transport contracts
- `packages/db` owns persistence structure and Prisma integration
- `packages/api-client` owns typed API consumption
- frontend apps assemble providers and domain-specific UX on top of those packages

## Key Architectural Consequences

This layout has several practical effects:

- route strings should come from shared contracts, not hardcoded frontend literals
- API request and response types should be shared through contracts where possible
- backend services should use the shared Prisma client integration from the db package
- frontend apps should consume typed registry-based API modules instead of raw fetch calls for core business APIs

## Runtime And Deployment Surfaces

The repository also supports a container-first deployment model for the main runtime applications.

The main deployable services are:

- `apps/api`
- `apps/storefront`
- `apps/store-dashboard`

Key operational characteristics carried over from the legacy Docker documentation are:

- Docker builds should use the monorepo root as build context
- application Dockerfiles live inside each app directory
- workspace packages must be built in dependency order rather than treated as isolated app dependencies
- the API container is responsible for production-safe migration deployment on startup
- Next.js apps rely on standalone output for leaner production images

For deployment-specific details, see [09-runtime-and-deployment.md](./09-runtime-and-deployment.md).

## Recommended Reading After This

Continue with [02-business-domains.md](./02-business-domains.md) and [03-domain-modeling-and-database.md](./03-domain-modeling-and-database.md).