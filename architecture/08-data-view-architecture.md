# Data-View Architecture

## Purpose

This document explains the reusable data-view system used in the store dashboard for dynamic CRUD-oriented list pages.

This is one of the most important frontend architecture pieces in the repository because it connects:

- shared contracts and route keys
- api-client registry lookup
- server-side initial fetching
- client-side React Query synchronization
- table/grid presentation
- pagination, sorting, filtering, and row actions

## Main Files

The core data-view implementation is centered around:

- `apps/store-dashboard/modules/base/components/crud/view/data-view.tsx`
- `apps/store-dashboard/modules/base/components/crud/view/data-view-client.tsx`
- `apps/store-dashboard/modules/base/components/crud/view/data-view-context.tsx`
- `apps/store-dashboard/modules/base/hooks/crud/useDataViewClient.tsx`

## Architectural Split

The system is intentionally split into server and client responsibilities.

### Server Entry

`data-view.tsx` is the server-side entry point.

Its main role is to:

- obtain an API client in a server-capable context
- resolve the target API module through the registry
- fetch the initial list response before rendering the client view
- pass `initialData` into the client layer

This allows the page to render with server-fetched data while still transitioning into client-managed query behavior.

This is the canonical server-first usage pattern.

### Client Orchestration

`data-view-client.tsx` is the client-side orchestration layer.

It is responsible for:

- switching between display modes such as table and grid
- connecting UI controls to query params and context state
- consuming the data query from the shared hook
- coordinating actions like delete, navigation, and selection

### View Context

`data-view-context.tsx` manages local view state, such as:

- selection state
- pagination controls
- sorting state
- filtering UI state

This state is distinct from server state. It is about how the view behaves in the UI.

### Shared Query Hook

`useDataViewClient.tsx` exposes `useViewWrapperData()` and is the bridge between a generic `apiKey` and an actual typed API module.

The hook performs several important tasks:

- retrieves the registry from `useApiRegistry()`
- resolves the API module using `registry.get(apiKey)`
- normalizes query parameters
- creates a React Query `queryKey` from pagination, sort, filters, and search
- calls `api.getList()`
- hydrates React Query with `initialData`

The current hook also includes pagination, sort, filters, and search values in the query key, so query-state changes naturally drive refetch behavior.

That current implementation detail should be treated as authoritative over older simplified examples that used only a single resource key.

## Why The Registry Matters

The data-view system does not import a specific products API or categories API directly.

Instead, it depends on a shared `ApiKey` and registry lookup.

This makes the component reusable across multiple resources while still aligning with the central API client architecture.

## Query And Refresh Flow

The current flow is:

1. server entry fetches initial list data
2. client hook initializes React Query with that response
3. query parameters become part of the React Query key
4. changing page, limit, filters, sort, or search triggers a refetch
5. mutations invalidate relevant query state so the list refreshes

This produces a good balance between initial render performance and interactive client updates.

## Usage Modes

The older fullstack flow guide made a useful distinction between two usage modes.

### Server-Prefetched Mode

- a server component fetches list data first
- the response is passed into the client layer as `initialData`
- the first client render is hydrated with server data instead of waiting for a fresh request

### Client-Only Mode

- a client component renders the data-view without server `initialData`
- the shared query hook performs the first fetch in the browser
- this is simpler, but it gives up the server-first render benefits

Both modes use the same `apiKey`, registry resolution path, and list-response envelope.

This is one of the strongest architectural properties of the data-view system: server-prefetched and client-only usage do not require separate feature-specific API logic.

## Relationship To Backend Response Helpers

The data-view pattern assumes the backend returns list responses in a consistent envelope, including pagination metadata.

That is why backend helpers like `ApiResponseBuilder.success()` and `ApiResponseBuilder.buildPaginationMeta()` are directly relevant to frontend data-view behavior.

When the backend returns normalized `data` and `meta.pagination`, the frontend data-view can stay generic.

## End-To-End Example: Store Addresses

The legacy fullstack flow document used store addresses as the reference example for how the whole pattern fits together.

### Contracts And API Client

- store-address route constants define the transport path
- a store-address API client module exposes list and mutation methods
- the module is registered under a stable key such as `storeAddresses`

### Backend

- merchant-scoped store-address endpoints provide the actual route surface
- responses follow the shared API envelope shape so the view layer can stay generic

### Frontend

- a list screen resolves `storeAddresses` from the registry
- forms and dialogs use the same module for create, update, and delete behavior
- the list query invalidates and refetches through React Query after mutations

### Query Identity

For current dashboard usage, query identity is the combination of:

- `apiKey`
- page
- limit
- sort
- filters
- search

That is what allows one reusable view component to support dynamic table state without resource-specific fetch implementations.

This example is useful because it shows that the data-view system is not just a UI component. It is an architectural bridge across contracts, backend responses, api-client modules, and dashboard CRUD UX.

## Practical Constraints

The data-view abstraction works well when a resource fits a list-oriented contract with:

- a stable list endpoint
- shared pagination metadata
- predictable row identity
- mutation flows that can invalidate or refresh list queries cleanly

For highly custom screens or unusual response shapes, using the shared api-client directly may be clearer than forcing the screen into the data-view abstraction.

## Common Use Cases

This pattern is suited for:

- product listing in the dashboard
- category management
- store addresses and similar CRUD resources
- any resource that can be represented as a list with row actions and standard query controls

## What This Component Family Is Not

The data-view system is not a generic replacement for all frontend data access.

It is specifically a reusable CRUD/list abstraction for dashboard-style resource pages. Highly custom views can still bypass it and use the shared api-client directly.

## Related Documents

- [04-backend-architecture.md](./04-backend-architecture.md)
- [06-contracts-and-api-client.md](./06-contracts-and-api-client.md)
- [07-frontend-architecture.md](./07-frontend-architecture.md)