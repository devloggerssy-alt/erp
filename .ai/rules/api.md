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

---

## Swagger / OpenAPI decorator requirements (MANDATORY)

Every DTO field **must** carry a complete `@ApiProperty` / `@ApiPropertyOptional` that
lets `openapi-typescript` generate the exact TypeScript type. Missing or wrong
decorators → wrong generated types → type workarounds in the dashboard. That chain
is **never acceptable**.

### Required decorator properties by field type

| Field type | Decorator | Required options |
|---|---|---|
| `string` (required) | `@ApiProperty` | `type: 'string'` |
| `number` (required) | `@ApiProperty` | `type: 'number'` |
| `boolean` (required) | `@ApiProperty` | `type: 'boolean'` |
| `string \| null` (optional nullable) | `@ApiPropertyOptional` | `type: 'string', nullable: true` |
| `number \| null` (optional nullable) | `@ApiPropertyOptional` | `type: 'number', nullable: true` |
| `boolean \| null` (optional nullable) | `@ApiPropertyOptional` | `type: 'boolean', nullable: true` |
| `string` (optional, never null) | `@ApiPropertyOptional` | `type: 'string'` |
| Enum | `@ApiProperty` | `enum: MyEnum, enumName: 'MyEnum'` |
| Nested object | `@ApiProperty` | `type: () => NestedDto` |
| Array | `@ApiProperty` | `type: () => ItemDto, isArray: true` |

**Examples of correct decorators:**

```typescript
// optional nullable string — the pattern that bit us
@ApiPropertyOptional({ type: 'string', nullable: true, example: 'abc-123' })
@IsOptional() @IsString()
accountId?: string | null;

// required string
@ApiProperty({ type: 'string', example: 'kg' })
@IsString() @IsNotEmpty()
code: string = '';

// required enum
@ApiProperty({ enum: InvoiceStatus, enumName: 'InvoiceStatus' })
@IsEnum(InvoiceStatus)
status: InvoiceStatus = InvoiceStatus.Draft;

// optional boolean (never null)
@ApiPropertyOptional({ type: 'boolean', example: true })
@IsOptional() @IsBoolean()
isActive?: boolean;
```

**Forbidden patterns:**

```typescript
// ❌ No type option — generates Record<string, never> for nullable fields
@ApiPropertyOptional({ example: 'abc-123', description: 'Account ID' })
accountId?: string | null;

// ❌ No decorator at all — field is invisible to OpenAPI, missing from generated types
isActive?: boolean;
```

---

## Mandatory: regenerate types after every backend DTO/controller change

After **any** change to a DTO class, Swagger decorator, or controller route in `apps/api/**`,
you **must** regenerate types. This applies whether or not the dev server is running.

```bash
# Always works — no running server, no running database required
pnpm generate
```

`pnpm generate` bootstraps NestJS without starting the HTTP server and without connecting
to the database (`GENERATE_SPEC=true` skips `PrismaService.$connect()`). It can always
run safely after a backend change.

**In watch mode** (`pnpm dev` running): types regenerate automatically on every NestJS
restart — `pnpm generate` is still the right call if you want to confirm the output
without waiting for a restart.

A backend task is **not complete** until:
1. Swagger decorators are correct (see table above)
2. `pnpm generate` has been run and succeeded
3. `packages/api-contracts/types/index.ts` reflects the new types
4. `packages/api-contracts` builds without errors

**Never** use `as any`, `as never`, `@ts-ignore`, or local interface re-declarations to work
around a type mismatch that stems from stale or incorrect generated types. Fix the decorator,
regenerate, rebuild.

## Reference
`apps/api/src/modules/catalog/units/`
