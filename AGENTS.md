# AGENTS.md

This document defines the architectural and development rules for AI agents
working inside this repository.

AI assistants **must** follow these rules when generating code, APIs, DTOs,
or frontend integrations.

---

## 1. Monorepo Structure

```
apps/
  api/          NestJS backend application
  web/          Next.js frontend application
  docs/         Documentation application

packages/
  contracts/    Shared DTOs, enums, API types, route constants
  api-client/   Typed frontend API client with React hooks
  db-prisma/    Prisma schema and database client
  backend-core/ Shared backend utilities (guards, interceptors, response builders)
  frontend-core/ Shared frontend utilities
  ui/           Shared UI component library
  utils/        Generic utilities
  eslint-config/ Shared ESLint configuration
  typescript-config/ Shared TypeScript configuration
```

### Dependency Rules

```
db-prisma     → used only by api
contracts     → used by api, web, api-client
api-client    → used by web
backend-core  → used by api
frontend-core → used by web

web must NEVER import db-prisma
web must NEVER import backend-core
```

---

## 2. Project Architecture Principles

This project follows:

- **Domain Driven** — APIs represent domain use cases, not DB tables or UI components
- **Resource Driven API** — every API entity is a resource with standard CRUD + domain actions
- **Contract First Integration** — shared types via `packages/contracts` before implementation
- **Strong Type Safety** — end-to-end typing from DB to frontend
- **Reusable DTO Composition** — small, composable DTOs instead of monolithic structures

---

## 3. Data Flow

The system follows a strict layered data flow:

```
DB Model (Prisma)
→ Repository
→ Service / UseCase
→ Backend DataView Mapper
→ API Response DTO
→ ApiClient (packages/api-client)
→ ApiCall / React Query Hook
→ Frontend Mapper / Presenter
→ ViewModel
→ UI Component
```

**Critical rule:**

```
DB Model ≠ API DTO ≠ Frontend ViewModel
```

Each layer has its own representation. Never leak internal types across boundaries.

---

## 4. API Response Standard

All API responses must follow the unified shape defined in `packages/contracts/src/api/ApiResponse.ts`:

```ts
interface ApiSuccessResponse<T = any> {
  status: "success"
  data: T
  message: string
  meta?: ApiMeta
}
```

Where `ApiMeta` is:

```ts
interface ApiMeta {
  pagination?: Pagination
  cursor?: Cursor
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}
```

---

## 5. API Error Standard

All errors must follow the shape in `packages/contracts/src/api/ApiError.ts`:

```ts
interface ApiErrorResponse {
  status: "error"
  code: ApiErrorCode | string
  message: string
  errors?: FieldError[]
  traceId?: string
}

interface FieldError {
  field: string
  message: string
  code?: string
}
```

Error codes must be **stable constants** from `ApiErrorCode` enum:

```ts
enum ApiErrorCode {
  VALIDATION_ERROR
  UNAUTHORIZED
  FORBIDDEN
  NOT_FOUND
  INTERNAL_SERVER_ERROR
  USER_ALREADY_EXISTS
  INSUFFICIENT_FUNDS
  // ...domain-specific codes
}
```

Frontend logic must rely on **error codes**, never on error messages.

---

## 6. HTTP Status Usage

```
200  success with body
201  resource created
204  success with no body
400  bad request
401  unauthenticated
403  forbidden
404  not found
409  conflict
422  validation error
500  internal error
```

---

## 7. Query Contract Standard

All list endpoints must support unified querying via `ApiQueryOptions` from `packages/contracts/src/api/ApiQueryOptions.ts`:

```ts
interface ApiQueryOptions<TFields extends string = string> {
  pagination?: PaginationOptions
  sort?: SortOptions<TFields>
  filters?: FilterOptions
  include?: IncludeOptions
  search?: SearchOptions
}
```

Every resource must use the **same query structure**. Do not invent custom query parameter formats.

---

## 8. Resource Definitions (Routes + Paths)

All domain resources are the single source of truth for routes and NestJS paths.
Defined in `packages/api-contracts/src/resources/`.

**No separate `routes/` folder.** Every resource carries both:

```ts
export const itemResource = {
  key: 'items',

  /** Full paths with leading slash — api-client fetch */
  routes: {
    list:    '/items',
    details: '/items/:id',
    status:  '/items/:id/status',
  },

  /** Segments without slash — NestJS @Controller / @Get */
  paths: {
    root:   'items',
    byId:   ':id',
    status: ':id/status',
  },
} as const
```

Backend controllers use `resource.paths.*`. Frontend and api-client use `resource.routes.*`.
Neither must ever hard-code route strings.

---

## 9. DTO Rules

Frontend must **never depend on database entities (Prisma models)**.

Entities are internal to the backend.

Only DTOs (defined in `packages/contracts/src/dto/`) are exposed.

```
PrismaModel (internal)  →  CreateDto / UpdateDto (public contract)
```

---

## 10. DTO Composition

DTOs must be **small and composable**.

Example:

```ts
// Base fields shared across views
interface ItemBaseDto {
  id: string
  code: string
  name: string
}

// Extended for table views
interface ItemTableDto extends ItemBaseDto {
  category: CategoryRefDto
  isActive: boolean
}
```

Avoid duplicating large DTO structures. Build larger DTOs by composing smaller ones.

---

## 11. Shared Enums

All enums must come from `packages/contracts/src/enums/`.

```ts
import { OrderStatus } from "@repo/contracts"
```

Enums must **never** be redefined separately in frontend or backend applications.

Use `UPPER_SNAKE_CASE` for enum values.

---

## 12. Naming Conventions

| Element       | Convention          | Example                        |
|---------------|---------------------|--------------------------------|
| JSON fields   | `camelCase`         | `createdAt`, `isActive`        |
| Enums         | `UPPER_SNAKE_CASE`  | `VALIDATION_ERROR`             |
| Resources     | plural nouns        | `items`, `warehouses`          |
| Routes        | kebab-case paths    | `/items/:id/status`            |
| DTO files     | `kebab.dto.ts`      | `item.dto.ts`                  |
| Route files   | `kebab.routes.ts`   | `items.routes.ts`              |

---

## 13. Backend Module Structure

Each backend module follows:

```
modules/
  items/
    domain/           Entities and domain logic
    application/      Services and use cases
    infrastructure/   Repository implementations
    api/              Controllers and request DTOs
    items.module.ts   NestJS module definition
```

Rules:

- Controllers contain **no business logic**
- Services do not know about HTTP
- Repositories handle all database access
- Use `ApiResponseBuilder` from `backend-core` for consistent responses

---

## 14. Frontend Data Handling

Frontend components must **not** reshape raw API responses directly.

Use:

```
API Response → Mapper / Presenter → ViewModel → UI Component
```

The data-view system (`data-view.tsx`) provides a reusable CRUD/list abstraction
that connects to the API registry, handles server-side prefetching, pagination,
sorting, filtering, and React Query synchronization.

---

## 15. API Client & Registry

The `packages/api-client` provides:

- `ApiClient` — core HTTP client with shared configuration
- `ApiService` — base class for feature-specific API modules
- `ModulesRegistry` — typed registry resolving `ApiKey` to API modules
- React providers and hooks for frontend consumption

Feature code resolves API modules via **registry keys**, never by constructing URLs.

---

## 16. Adding a New Domain

When adding a new resource/domain, follow this sequence:

1. Add/update Prisma schema in `packages/db-prisma`
2. Define the **resource** in `packages/api-contracts/src/resources/` (`key` + `routes` + `paths`)
3. Define DTOs in `packages/api-contracts/src/dto/`
4. Create backend module in `apps/api/src/modules/` — use `resource.paths.*` in controllers
5. Create API client module in `packages/api-client/src/modules/` — use `resource.routes.*`
6. Register in `modulesRegistry.ts`
7. Consume from frontend via registry hooks — use `resource.key` for React Query

See `skills/add-domain/SKILL.md` for the full checklist.

---

## 17. Versioning

APIs must support versioning:

```
/api/v1/items
```

Breaking changes require a version bump.

---

## 18. AI Agent Restrictions

AI agents **must**:

- Follow the repository structure exactly as documented
- Reuse existing DTOs and enums from `packages/contracts`
- Follow the unified `ApiSuccessResponse` / `ApiErrorResponse` format
- Use shared `ApiQueryOptions` for all list endpoints
- Use route constants, never hard-coded strings
- Use `ApiResponseBuilder` for backend responses

AI agents must **never**:

- Invent API response shapes
- Expose Prisma models to frontend
- Duplicate API types in frontend applications
- Create custom query parameter formats
- Hard-code route strings
- Add business logic to controllers
- Import `db-prisma` from frontend packages

**When unsure, prefer existing patterns in the repository.**

---

## 19. Skills Reference

Reusable workflow patterns are in the `skills/` directory.
Read the relevant skill file **before** implementing a feature.

| Skill | When to use |
|-------|-------------|
| `skills/add-domain/` | Adding a full new resource end-to-end |
| `skills/backend-module/` | Creating a NestJS module (controller/service/repository) |
| `skills/dto-composition/` | Defining or composing DTOs in contracts |
| `skills/api-contracts/` | Response format, error codes, HTTP status, query options, package exports |
| `skills/resource-definitions/` | Defining a resource (`key` + `routes` + `paths`) — the single source of truth |
| `skills/api-client-module/` | Creating and registering an API client module |
| `skills/frontend-data/` | Frontend mappers, ViewModels, data-view system |
| `skills/route-constants/` | ⚠️ Deprecated — see `skills/resource-definitions/` |
| `skills/shared-enums/` | Defining and using shared enums |
