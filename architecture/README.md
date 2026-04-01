# E-Dukan Architecture Docs

This directory is the canonical architecture reference for the E-Dukan monorepo.

The goal of this documentation set is to make the codebase understandable from three angles:

- AI-oriented reference for fast architectural lookup
- team reference for implementation and maintenance
- onboarding path for new developers

## How To Use This Set

Read the documents in this order if you are new to the repository:

1. [01-monorepo-overview.md](./01-monorepo-overview.md)
2. [02-business-domains.md](./02-business-domains.md)
3. [03-domain-modeling-and-database.md](./03-domain-modeling-and-database.md)
4. [04-backend-architecture.md](./04-backend-architecture.md)
5. [05-authentication-architecture.md](./05-authentication-architecture.md)
6. [06-contracts-and-api-client.md](./06-contracts-and-api-client.md)
7. [07-frontend-architecture.md](./07-frontend-architecture.md)
8. [08-data-view-architecture.md](./08-data-view-architecture.md)
9. [09-runtime-and-deployment.md](./09-runtime-and-deployment.md)

## Documentation Map

### System Foundations

- [01-monorepo-overview.md](./01-monorepo-overview.md)
  - workspace structure
  - tools and libraries
  - app and package responsibilities
  - build and developer workflow

- [02-business-domains.md](./02-business-domains.md)
  - business capabilities
  - domain ownership
  - domain-to-code mapping

### Data And Persistence

- [03-domain-modeling-and-database.md](./03-domain-modeling-and-database.md)
  - domain modeling
  - Prisma schema organization
  - database package architecture
  - migrations, generate, seed, and studio workflows

### Backend

- [04-backend-architecture.md](./04-backend-architecture.md)
  - NestJS application structure
  - module, controller, service conventions
  - Prisma integration in backend
  - response/query helpers
  - DTO and contracts implementation patterns

- [05-authentication-architecture.md](./05-authentication-architecture.md)
  - auth and identity architecture
  - guards, strategies, and request context
  - frontend auth integration entry points

### Shared Packages

- [06-contracts-and-api-client.md](./06-contracts-and-api-client.md)
  - contracts package structure
  - route and DTO sharing
  - api-client architecture
  - frontend integration patterns

### Frontend

- [07-frontend-architecture.md](./07-frontend-architecture.md)
  - app responsibilities
  - provider hierarchy
  - state management and data flow
  - auth-aware frontend integration

- [08-data-view-architecture.md](./08-data-view-architecture.md)
  - reusable CRUD view architecture
  - dynamic API registry lookup
  - server hydration and client fetching
  - pagination, filtering, sorting, and mutations

### Runtime And Operations

- [09-runtime-and-deployment.md](./09-runtime-and-deployment.md)
  - Docker build strategy
  - Coolify deployment setup
  - environment variables and ports
  - runtime and migration notes

## Legacy Docs

The following legacy documents have been merged into the canonical files above and are retained only as redirect stubs:

- [api-backend-summary.md](./api-backend-summary.md)
- [FULLSTACK_FLOW.md](./FULLSTACK_FLOW.md)
- [sass-system-architecture.md](./sass-system-architecture.md)
- [DOCKER_SETUP.md](./DOCKER_SETUP.md)

## Current-State Note

This documentation describes the current implementation first. When the codebase contains structural drift or legacy patterns, the docs call that out explicitly instead of hiding it.