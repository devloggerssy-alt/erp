# Backend Architecture

## Purpose

This document explains how the NestJS backend is structured, how it integrates with the shared database package, and how shared backend helpers shape requests and responses.

## Application Shape

The backend lives in `apps/api` and is organized as a modular NestJS monolith.

The root module in [../../apps/api/src/app.module.ts](../../apps/api/src/app.module.ts) wires together platform-level infrastructure and feature modules, including:

- configuration loading
- i18n
- Prisma integration through `PrismaModule`
- business feature modules such as identity, catalog, store, orders, promotions, currency, billing, content, notifications, and system

## Bootstrap And Platform Setup

The application bootstrap in [../../apps/api/src/main.ts](../../apps/api/src/main.ts) establishes several platform-level behaviors:

- Nest app creation
- Swagger generation for merchant/public and admin surfaces
- cookie parsing
- CORS configuration with local and base-domain support
- static asset exposure for uploads

Two Swagger surfaces are created:

- `/docs` for merchant and storefront-oriented endpoints
- `/admin/docs` for admin endpoints

## Module Structure

The backend uses a feature-first layout under `apps/api/src/modules`.

Examples include:

- `identity`
- `catalog`
- `store`
- `orders`
- `billing`
- `currency`
- `content`
- `promotions`
- `notifications`
- `system`

The intended pattern is:

- module owns wiring
- controller owns transport and route mapping
- service owns business logic and Prisma access

When a domain has meaningful subdomains, the older fullstack flow documentation recommends nesting them under the parent module rather than flattening everything into one file set.

Typical example:

- parent store module for core store behavior
- child modules for addresses and theme

That keeps route ownership clear without forcing unrelated responsibilities into one service.

The practical rule is:

- parent modules import submodules
- parent modules should not re-register submodule controllers or services
- submodules own their own controller, service, and export surface

## Audience-Specific Controllers

Several domains split controllers by audience, typically using separate controllers for:

- public traffic
- merchant traffic
- admin traffic

This makes sense in this repository because permissions, response shapes, and route ownership differ across clients.

Example pattern:

- public controllers serve storefront or public lookup needs
- merchant controllers serve authenticated store dashboard behavior
- admin controllers serve platform administration behavior

This audience split is a good fit for the repository because the backend serves multiple clients with different permissions, route scopes, and response needs.

It stops being a good pattern only when it creates:

- duplicated controller code
- duplicated response mapping
- route sprawl
- unclear service ownership

Controller responsibilities should stay narrow:

- define route path and HTTP method
- accept DTO and query input
- apply guards and decorators
- delegate to a service
- shape the response through shared response helpers

## Database Integration In Backend

### Shared Integration Layer

Database access is shared through `@e-dukan/db/nest`.

Important pieces:

- `PrismaModule` is global
- `PrismaService` is injectable and lifecycle-aware

The backend root module imports `PrismaModule`, and services consume `PrismaService` directly.

### Typical Execution Flow

The common request path is:

1. controller receives request and DTO/query params
2. controller delegates to service
3. service runs business logic and Prisma operations
4. controller returns a normalized API response

| Layer | Responsibility |
| --- | --- |
| Module | wire controllers and services, import submodules, export reusable providers |
| Controller | map routes to service calls, validate input, apply auth and response shape |
| Service | business logic and Prisma access without HTTP concerns |

### Controller To Service To Prisma Is Valid

For this codebase, `controller -> service -> Prisma` is a valid baseline architecture.

The older backend review explicitly concluded that a repository layer is not mandatory for NestJS plus Prisma. The more useful rule is:

- simple CRUD can stay in service classes
- medium or high-complexity domains can split into application services, query services, or use-case classes when that improves clarity

In practice, that means the architecture should evolve by need, not by forcing generic repository layers everywhere.

## Shared API Response Helpers

The backend uses shared helpers under `apps/api/src/common/api` to keep controller behavior consistent.

### ApiResponseBuilder

`ApiResponseBuilder` in [../../apps/api/src/common/api/api-response-builder.ts](../../apps/api/src/common/api/api-response-builder.ts) provides three core behaviors:

- `success(data, message, meta)` returns a normalized success envelope
- `error(message, code, details)` returns a normalized error envelope
- `buildPaginationMeta(query, total)` computes pagination metadata from query input and total count

The response shape uses a common envelope with:

- `message`
- `data`
- optional `meta`
- optional `error`

### Pagination Meta Example

When a controller calls `ApiResponseBuilder.buildPaginationMeta`, the helper resolves:

- `page`, defaulting to `1` if missing or invalid
- `limit`, defaulting to `10` if missing or invalid
- `totalPages`, computed from `total / limit`

This is why even simple endpoints like the currency public controller can return pagination metadata consistently for list responses.

### Query Helpers

Related helpers in `common/api` handle:

- pagination resolution
- sorting resolution
- filter-to-where mapping
- search query construction

These utilities reduce repeated Prisma query boilerplate across modules.

They also act as part of the backend-to-frontend contract, because generic consumers such as the dashboard data-view rely on consistent list-query behavior and pagination metadata.

## DTOs, Contracts, And Transport Boundaries

The backend frequently aligns DTOs with the contracts package.

The main pattern is:

1. shared routes, API envelopes, and DTO contracts live in `packages/contracts`
2. backend controllers and services consume or implement those shapes
3. frontend apps consume the same shapes through the api-client package

This is the core mechanism for transport-layer consistency.

The intended split is:

- Prisma models describe persistence
- contract DTOs describe transport
- backend DTO classes may implement or align with contract interfaces
- controllers return shared API envelopes rather than raw Prisma arrays when metadata or error shape matters

## Current Strengths

The legacy backend assessment identified several strengths that should be preserved:

- feature-first modular structure
- separate controllers per audience where the route surface genuinely differs
- shared services reused behind audience-specific controllers
- direct Prisma usage in services where complexity does not justify another layer
- reusable query and response helpers under `common/api`
- existing cross-cutting infrastructure for config, i18n, file handling, auth, Swagger, and database integration

## Current Risks And Structural Drift

The same assessment also identified several implementation risks that belong in the canonical backend reference:

### Controller Duplication

Some modules still show duplicate or legacy controller layouts, with controllers defined both at feature root and under `controllers/` folders.

### Missing Global Platform Policies

The current bootstrap does not clearly show a global validation pipe, global exception filter, or a consistent response serialization policy.

### Sensitive Or Noisy Logging

The existing backend review called out direct `console.*` logging in runtime paths as a security and observability risk when it includes request or environment details.

### Auth Tightening Needed

The older review flagged JWT expiration handling and broader auth hardening as areas that need careful validation.

### Guard-Based Auth Without A Clear Policy Layer

Authentication is visible through guards, but authorization and role/policy enforcement need to remain explicit because the backend serves multiple audiences.

### Repeated Request Context Extraction

Merchant controllers often have to derive store context from authenticated request data. Over time, that should move toward decorators, guard-derived context, or clearer policy helpers.

### Testing Gaps

The older backend summary also noted limited visible automated test coverage in the API app, which is relevant when documenting confidence boundaries.

## Recommended Conventions

To keep the backend architecture coherent as it grows, the older backend review recommended a set of conventions that are now part of the canonical guidance:

- one audience controller per file
- consistent names such as `public.controller.ts`, `merchant.controller.ts`, and `admin.controller.ts`
- no root-level legacy duplicates when a module already uses `controllers/`
- DTO folders for larger features
- split complex services by responsibility before introducing generic repository layers

## Recommended Improvement Order

The previous review also produced a practical sequence for backend hardening:

1. add global validation and consistent error handling
2. remove sensitive debug logging
3. tighten auth and token handling
4. consolidate duplicate controller layouts
5. standardize controller naming and feature structure
6. strengthen authorization and store-scoped policy enforcement
7. expand service and end-to-end test coverage

## Infrastructure Beyond Business Modules

The backend also contains shared infrastructure outside the business modules, including:

- file handling under `infrastructure/files`
- config loading and validation
- localization setup through shared locales
- common decorators and utility functions

## Current-State Observations

There is evidence of structural drift in the current codebase, especially around controller layout consistency in some modules. This documentation set keeps the current implementation visible and does not assume all modules already follow one perfectly clean convention.

## Next Reading

- [05-authentication-architecture.md](./05-authentication-architecture.md)
- [06-contracts-and-api-client.md](./06-contracts-and-api-client.md)