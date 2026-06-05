---
name: api
description: NestJS API module conventions (4-layer CRUD). Load when editing apps/api/**.
scope: apps/api/**
---

# NestJS API — Rules

## Module layout (4 layers)
Each feature under `apps/api/src/modules/<domain>/<feature>/`:
- `controllers/` — `createCrudController` factory from `@devloggers/backend-core`
- `services/` — `CrudService`, business rules in `beforeCreate` / `beforeUpdate`
- `repositories/` — `CrudRepository`, Prisma delegate in `super(prisma.model)`
- `presenters/` — entity → response DTO (`CrudPresenter`)
- `dto/` — Create / Update / Response (class-validator + Swagger)
- `events/` — typed events using `resources.{key}.key`
- `<feature>.module.ts` — wire providers; export service if cross-module

## Rules
- NestJS DI, modules, guards — no raw Express in feature code
- JWT: `@UseGuards(JwtAuthGuard)` from `@/modules/identity/auth/guards`
- Resource key: `resources.{name}.key` from `@devloggers/api-contracts` — never hardcode
- Do not call Prisma from services — use repository
- Do not return raw entities from controllers — always go through presenter
- Do not re-emit CRUD events in `onCreated` / `onUpdated` / `onDeleted` — base `CrudService` already does

## Reference
`apps/api/src/modules/catalog/units/`
