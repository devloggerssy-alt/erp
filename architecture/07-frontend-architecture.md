# Frontend Architecture

## Purpose

This document explains how the frontend applications are structured, how they consume shared packages, and how data and state flow through the main application surfaces.

## Frontend Applications

The monorepo contains several frontend applications with different responsibilities:

| App | Role |
| --- | --- |
| `apps/store-dashboard` | Merchant-facing dashboard for CRUD-heavy operational workflows |
| `apps/storefront` | Customer-facing storefront experience |
| `apps/admin` | Admin surface |
| `apps/landing` | Marketing and landing experience |

The store dashboard is currently the most architecture-rich frontend surface because it contains reusable CRUD patterns, provider layering, and dynamic API-driven list views.

## Shared Frontend Dependencies

Frontend apps commonly rely on:

- `@e-dukan/api-client`
- `@e-dukan/contracts`
- `@e-dukan/shared`
- `@e-dukan/ui`

This means most frontend architecture should be understood as app-specific composition on top of shared packages rather than as isolated standalone React applications.

## Provider Hierarchy

In the store dashboard, the provider tree in [../../apps/store-dashboard/modules/base/components/providers.tsx](../../apps/store-dashboard/modules/base/components/providers.tsx) is a primary architectural entry point.

The provider stack includes:

- `QueryClientProvider` for React Query cache ownership
- `ApiClientProvider` for HTTP configuration
- `ApiRegistryProvider` for typed module lookup
- `AuthProvider` for user context
- `StoreProvider` for store context
- `NuqsAdapter` for URL/query-state integration
- supporting UX providers such as confirmation and toast layers

This stack shows that frontend data access is intentionally centralized rather than each page managing its own raw network setup.

The earlier fullstack flow document made the lifecycle explicit:

1. the API client is configured first
2. the API registry is created from that client
3. query and auth/store context providers wrap feature components
4. feature views consume the registry and query cache rather than creating isolated network stacks

This means the provider layer is part of the architecture, not just setup noise. It defines how API access, auth state, store context, and query caching become available to the rest of the application.

## Data Flow Model

The dominant frontend data flow pattern is:

1. app layout or server component obtains initial context or data
2. provider tree establishes shared runtime services and state containers
3. feature components use the api-client registry and React Query to read and mutate server state
4. URL state, auth state, and store context shape what is fetched and rendered

For dashboard CRUD screens, this often becomes a server-plus-client pattern rather than a purely client-side fetch model:

- a server entry fetch can provide initial data and context
- the client layer takes over with React Query hydration and refetching

This hybrid model is intentional because it balances:

- faster first render with server-provided data
- interactive client-side refresh and mutation handling
- reusable components that can work with or without server hydration

## State Management Strategy

The codebase primarily uses a combination of:

- React context for stable application context such as auth and store state
- TanStack React Query for server-state fetching, caching, and invalidation
- URL query state through `nuqs` for list controls and navigable filtering/pagination

There is no sign that a single global client-state store such as Redux is the architectural center of the frontend.

## Frontend And Shared API Access

Frontend features generally should not hardcode routes or invent independent data-access layers. Instead, they should:

1. get an API client through providers
2. access a typed module through the registry
3. fetch or mutate through shared api-client methods and hooks

This preserves alignment with contracts and backend expectations.

The legacy flow guide also emphasized that the HTTP base URL is configured once in the client/provider layer, so feature code should think in terms of contract routes and registry keys rather than absolute URLs.

## Store Dashboard As The Main Reference App

For documentation purposes, the store dashboard should be treated as the primary frontend architecture reference because it demonstrates:

- provider composition
- auth-aware application context
- React Query integration
- reusable CRUD view patterns
- dynamic API registry usage

It is also the best place to understand how page layouts, providers, auth-aware state, and generic API-driven components fit together.

## Storefront As A Second Reference App

The storefront is the main public-facing comparison point. It uses the same shared package ecosystem, but its UX priorities differ from the dashboard:

- customer browsing
- product detail and purchase flows
- public/store-scoped presentation rather than merchant CRUD operations

## Auth Integration

Frontend auth should be understood as part of the provider and request pipeline, not just as a login page concern.

The dashboard receives server-fetched `userData` and store data, then injects those into providers so protected UI can be rendered with current context.

In practice, frontend auth integration spans:

- server layout data loading
- auth provider composition
- store-aware provider composition
- authenticated API request execution through the shared client layer

## Deep-Dive Reference

For the most reusable data-fetching pattern in the frontend, continue to [08-data-view-architecture.md](./08-data-view-architecture.md).