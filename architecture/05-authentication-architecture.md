# Authentication Architecture

## Purpose

This document explains the authentication architecture across backend and frontend surfaces. It focuses on how identity flows are implemented, how request context is established, and where authentication touches client applications.

Authentication and authorization are related but different concerns. This document focuses primarily on authentication, while noting where authorization boundaries begin.

## Backend Auth Location

The main auth implementation lives under:

- `apps/api/src/modules/identity/auth`

This area contains:

- controllers
- guards
- strategies
- auth services
- OTP-related services
- auth-related request types

## Core Backend Pieces

### Controllers

The auth module uses separate controllers to represent different audiences and flows, including public and protected surfaces.

Typical responsibilities include:

- public login and registration flows
- merchant-oriented auth entry points
- admin-oriented auth entry points

This mirrors the broader audience-split pattern used across the backend and is one reason auth should be documented as its own architectural concern rather than only as guard wiring.

### Guards

The main guard visible in the codebase is `JwtAuthGuard`.

In practical terms, this means authenticated routes typically rely on Passport-backed JWT validation before business logic is reached.

### Strategies

The auth module includes at least:

- JWT strategy
- local strategy

This supports both credential-based authentication flow and token-based authenticated request handling.

The older backend review also flagged token-handling hardening as an important area for explicit verification, especially around expiration behavior and production-safe defaults.

### OTP And External Providers

The auth implementation also includes OTP and Twilio services, indicating support for verification or login-related out-of-band flows.

## Request Context

Once authentication succeeds, request handlers can operate on an authenticated request shape from the identity module types.

This is important because merchant-scoped routes commonly derive store or user context from the authenticated request rather than from open request parameters alone.

In the earlier backend review, this repeated request-context extraction was identified as a candidate for stronger decorators or policy helpers such as current-user or current-store abstractions.

## Authentication vs Authorization

The repository clearly uses route protection through guards, but authorization should be treated as a separate layer.

In this codebase, authentication answers questions like:

- who is the caller
- is there a valid JWT or accepted login flow

Authorization answers questions like:

- can this merchant access this store resource
- can this user call this admin endpoint
- what actions are allowed for the current role or context

This distinction matters because the platform serves multiple audiences from one backend.

For this repository, a useful working rule is:

- authentication proves identity and session/token validity
- authorization enforces audience, role, and store-scoped access rules

That rule is especially important because the same backend serves admin, merchant, public, and storefront-oriented traffic.

## Frontend Auth Integration

### Store Dashboard

The main frontend auth integration entry points in the dashboard include:

- `apps/store-dashboard/modules/base/components/auth/auth-provider.tsx`
- `apps/store-dashboard/modules/base/components/providers.tsx`

The dashboard provider tree accepts server-fetched `userData` and injects it into an auth provider. This means the dashboard architecture is not purely client-auth driven; it mixes server-loaded context with client-side provider composition.

### Logout And Session Transitions

The dashboard also has an auth logout route under:

- `apps/store-dashboard/app/api/auth/logout/route.ts`

This is part of the frontend auth lifecycle, even though authentication authority lives in the backend.

### API Request Context

Once the frontend has auth context, API requests flow through the shared api-client layer. Auth-aware applications should treat the api-client and backend cookies/tokens as the transport mechanism rather than building ad hoc request code in each feature.

In the dashboard, auth state influences more than route protection. It also determines which provider tree can render, which store-aware data can be requested, and which protected backend routes can succeed.

## Auth In The System Flow

The full auth-aware path is generally:

1. user authenticates through auth routes
2. backend establishes or validates auth state
3. frontend providers receive user context
4. protected pages and components consume that context
5. API requests are made through the shared api-client and protected backend routes

## Related Documents

- [04-backend-architecture.md](./04-backend-architecture.md)
- [06-contracts-and-api-client.md](./06-contracts-and-api-client.md)
- [07-frontend-architecture.md](./07-frontend-architecture.md)