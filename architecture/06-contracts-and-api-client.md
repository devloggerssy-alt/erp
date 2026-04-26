# Contracts And API Client

## Purpose

This document explains how routes, DTOs, API envelopes, and typed HTTP access are shared across the monorepo.

The core architectural idea is that transport-level definitions live in reusable packages instead of being duplicated separately in backend and frontend applications.

## Contracts Package

`packages/contracts` is the source of truth for shared transport definitions.

Important areas include:

- `packages/contracts/src/routes`
- `packages/contracts/src/dto`
- `packages/contracts/src/api`
- `packages/contracts/src/resources`
- `packages/contracts/src/types`

## What Contracts Own

### Route Constants

Route constants prevent string duplication across the stack.

Examples of route groups include:

- auth
- store
- store addresses
- store theme
- products
- categories
- orders
- promotions
- currency

These constants are used by the api-client package and reflect the backend route structure.

The older fullstack flow guide stressed one important rule: frontend code should not invent route literals when a contract constant exists. Route constants are part of the integration contract, not just a convenience.

Representative examples include relative route paths such as:

- `store`
- `store/lookup`
- `store/addresses`
- `store/theme`

These values are not full URLs. The runtime base URL and any audience prefix are supplied by frontend client configuration.

### DTOs

The contracts package also owns request and response DTO definitions used across backend and frontend.

This keeps transport shapes explicit and enables shared typing between:

- backend controllers
- api-client modules
- frontend components and hooks

### API Envelopes

Shared API envelope types such as `ApiResponse`, `ApiMeta`, and query option types make it possible for both backend and frontend to agree on list-response structure, pagination metadata, and error shape.

## API Client Package

`packages/api-client` turns shared transport definitions into typed runtime access.

Important areas include:

- `packages/api-client/src/apiClient.ts`
- `packages/api-client/src/apiService.ts`
- `packages/api-client/src/modules`
- `packages/api-client/src/modulesRegistry.ts`
- `packages/api-client/src/react`

## API Client Architecture

### ApiClient

The core client encapsulates HTTP behavior and shared request configuration.

In the fullstack flow description, this layer sits on top of a lower-level HTTP client implementation and normalizes response handling through a shared `ApiResponse<T>` shape.

Feature code should therefore think in terms of typed methods and contract routes, not low-level fetch configuration.

### ApiService

Feature-specific client modules build on a shared base service pattern. This keeps CRUD-style behavior and request conventions consistent across modules.

The shared base service is responsible for the common request verbs and list-oriented methods such as `getList(query?)`, which is why generic consumers like the data-view system can work across multiple resources.

The base pattern is:

- a feature API class receives `ApiClient` and a module root path
- the shared service provides `get`, `post`, `put`, and `delete`
- `getList()` targets the module root with optional query parameters
- feature methods can call more specific route constants when needed

### Modules Registry

The registry in [../../packages/api-client/src/modulesRegistry.ts](../../packages/api-client/src/modulesRegistry.ts) is a key architectural piece.

It defines:

- the typed set of available API modules
- the `ApiKey` union used by frontend consumers
- the `createApiRegistry()` function that binds route-based modules to runtime accessors

The registry pattern matters because it allows reusable frontend abstractions, including the data-view system, to fetch data dynamically by `apiKey` without giving up type-aware module organization.

The older flow guide adds two implementation details that are worth keeping visible:

- the registry is created once from an `ApiClient`
- route-based module identifiers are mapped into stable frontend registry keys such as `storeAddresses` and `storeTheme`

That distinction matters:

- contract route strings are transport identifiers
- registry keys are frontend lookup identifiers

The registry keeps UI code independent from raw path strings.

## React Integration

The `react` entry points in the api-client package provide:

- `ApiClientProvider`
- `ApiRegistryProvider`
- hooks for query and mutation operations

This makes the api-client package the bridge between shared transport definitions and frontend state/data layers.

In application code, the usual pattern is:

1. `ApiClientProvider` creates the configured client
2. `ApiRegistryProvider` creates and exposes the registry
3. hooks and components resolve feature APIs from the registry instead of constructing URLs directly

At runtime, a request path is effectively formed as:

- environment-specific API origin
- optional audience prefix such as `/merchant/`
- contract-defined route path such as `store/addresses`

## End-To-End Type Sharing Loop

The main cross-layer flow is:

1. persistence shapes originate in `packages/db`
2. transport-level contracts are defined in `packages/contracts`
3. typed runtime access is implemented in `packages/api-client`
4. backend controllers/services and frontend applications consume those shared types and routes

This does not mean all database models become frontend DTOs directly. It means the stack shares intentional contracts rather than duplicating transport definitions.

## Adding A New Domain

The intended sequence for a new API domain is:

1. add or update persistence structures in `packages/db` if needed
2. define routes and DTOs in `packages/contracts`
3. create or extend a feature client module in `packages/api-client`
4. implement backend controller/service/module logic in `apps/api`
5. consume the typed client from frontend applications

## End-To-End Example: Store Addresses

The legacy fullstack flow document included a concrete end-to-end example that is worth retaining in canonical form.

### Backend

- store functionality is exposed through store-related backend modules and controllers
- store addresses are served through merchant-scoped routes that map to a store-address capability

### Contracts

- route constants define the store-address path
- DTOs define request and response shapes for address create/update/list operations

### API Client

- a `StoreAddressesApi` module extends the shared base service pattern
- the module is registered under a stable registry key such as `storeAddresses`

### Frontend

- dashboard forms and list views resolve the module by registry key
- the same key can be used by a generic list component and a feature-specific dialog or form

This end-to-end example is expanded from the frontend perspective in [08-data-view-architecture.md](./08-data-view-architecture.md).

## Quick Reference

| Layer | Role |
| --- | --- |
| Contract route | relative transport path such as `store/addresses` |
| Base URL | runtime API origin plus any audience prefix |
| API class | typed wrapper over shared HTTP methods |
| Registry key | frontend lookup key such as `storeAddresses` |
| Provider layer | creates and exposes the shared client and registry |

## Why This Matters

Without contracts and a shared api-client, the repository would have to maintain:

- duplicated route strings
- duplicated DTO types
- duplicated query/response assumptions
- weaker guarantees between frontend and backend changes

These two packages are central to keeping the monorepo cohesive.

## Next Reading

- [04-backend-architecture.md](./04-backend-architecture.md)
- [07-frontend-architecture.md](./07-frontend-architecture.md)
- [08-data-view-architecture.md](./08-data-view-architecture.md)