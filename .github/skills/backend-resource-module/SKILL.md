---
name: backend-resource-module
description: "Refactor or create a NestJS backend resource module following the 4-layer architecture (Repository → Service → Presenter → Controller) with DDD domain grouping, event-driven architecture, and full OpenAPI documentation. Use when: refactoring an existing module to the new architecture, creating a new resource module from scratch, adding a new entity to an existing domain (catalog, accounting, etc.), scaffolding CRUD backend for any resource."
---

# Backend Resource Module Refactor / Generator

Scaffold or refactor a NestJS resource module following the established 4-layer architecture.
This skill applies to **all** resource modules in `apps/api/src/modules/`.

## Architecture Overview

```
Domain Module (e.g. catalog)
└── Resource Module (e.g. units)
    ├── dto/                     ← Input/Output DTOs (class-validator + @nestjs/swagger)
    ├── events/                  ← Typed domain events extending CrudEvent
    ├── repositories/            ← Data access layer (extends CrudRepository)
    ├── services/                ← Business logic (extends CrudService)
    ├── presenters/              ← Entity → Response mapping (extends CrudPresenter)
    └── controllers/             ← HTTP layer (extends CrudController)
```

### Layer Responsibilities

| Layer | File | Responsibility |
|-------|------|---------------|
| Repository | `{resource}.repository.ts` | All Prisma queries. Scoped to tenant. No business logic. |
| Service | `{resource}.service.ts` | Business rules, validation hooks, emits domain events. |
| Presenter | `{resource}.presenter.ts` | Maps Prisma entity → response DTO. Single responsibility. |
| Controller | `{resource}.controller.ts` | HTTP verbs, Swagger docs, delegates to service. |

## When to Use

- "Refactor `currencies` module to the 4-layer architecture"
- "Create a new `warehouses` module with CRUD"
- "Add `item-categories` to the catalog domain"
- "Migrate `fiscal-periods` to use repository and presenter layers"

## Step-by-Step Procedure

Follow these steps **in order**. Read the [Reference Files](#reference-files) section before writing code.

---

### Step 1 — Identify the Domain

Determine which **domain module** the resource belongs to:

| Domain | Module path | Resources |
|--------|-------------|-----------|
| `catalog` | `modules/catalog/` | units, items, item-categories |
| `accounting` | `modules/accounting/` | fiscal-periods, document-sequences, currencies |
| `parties` | `modules/parties/` | customers, suppliers, contacts |
| `inventory` | `modules/inventory/` | warehouses, stock-ledger, stock-counts |
| `invoicing` | `modules/invoicing/` | invoices, invoice-types, payments |
| `auth` | `modules/auth/` | users, roles, tenants |

If the domain module's `catalog.module.ts` doesn't exist yet, create it (see [Domain Module Template](#domain-module-template)).

If the domain already exists, add the new resource module to its `imports` and `exports` arrays.

---

### Step 2 — Read the Prisma Schema

Look at `packages/db-prisma/src/schema/{resource}.prisma` (or the generated `generated/client/schema.prisma`) to understand the entity fields.

The entity must have:
- `id: String @id @default(uuid())`
- `tenantId: String` (for tenant scoping)
- `createdAt: DateTime @default(now())`
- `updatedAt: DateTime @updatedAt`

---

### Step 3 — Create DTOs

**File:** `modules/{domain}/{resource}/dto/{resource}.dto.ts`

Rules:
- `CreateXDto` — required fields only, `@IsNotEmpty()` on strings
- `UpdateXDto` — all fields optional, `@IsOptional()` before every validator
- `XResponseDto` — all fields the API returns, with `@ApiProperty` + examples
- No inheritance between Create/Update — keep them explicit

```typescript
// modules/catalog/units/dto/unit.dto.ts  (reference implementation)
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUnitDto {
  @ApiProperty({ example: 'Kilogram', description: 'Unit display name' })
  @IsString()
  @IsNotEmpty()
  name: string = '';

  @ApiProperty({ example: 'kg', description: 'Short abbreviation used on documents' })
  @IsString()
  @IsNotEmpty()
  abbreviation: string = '';
}

export class UpdateUnitDto {
  @ApiPropertyOptional({ example: 'Kilogram (Updated)' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ example: 'kg' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  abbreviation?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UnitResponseDto {
  @ApiProperty({ example: '018e1234-abcd-7000-a001-000000000001' })
  id: string = '';

  @ApiProperty({ example: 'Kilogram' })
  name: string = '';

  @ApiProperty({ example: 'kg' })
  abbreviation: string = '';

  @ApiProperty({ example: true })
  isActive: boolean = true;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt: string = '';

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  updatedAt: string = '';
}
```

**File:** `modules/{domain}/{resource}/dto/index.ts`
```typescript
export * from './{resource}.dto';
```

---

### Step 4 — Create Events

**File:** `modules/{domain}/{resource}/events/{resource}.events.ts`

```typescript
import { ResourceCreatedEvent, ResourceUpdatedEvent, ResourceDeletedEvent } from '@devloggers/backend-core';
import type { Unit } from '@devloggers/db-prisma'; // ← replace with your entity type

export class UnitCreatedEvent extends ResourceCreatedEvent<Unit> {
  static readonly NAME = ResourceCreatedEvent.eventName('unit'); // ← use resource name
}

export class UnitUpdatedEvent extends ResourceUpdatedEvent<Unit> {
  static readonly NAME = ResourceUpdatedEvent.eventName('unit');
}

export class UnitDeletedEvent extends ResourceDeletedEvent<Unit> {
  static readonly NAME = ResourceDeletedEvent.eventName('unit');
}
```

> Event names follow `{resource}.{action}` convention (e.g. `unit.created`, `item.deleted`).
> Listeners can `@OnEvent('unit.created')` in any other module.

---

### Step 5 — Create Repository

**File:** `modules/{domain}/{resource}/repositories/{resource}s.repository.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import { CrudRepository } from '@devloggers/backend-core';
import type { Unit } from '@devloggers/db-prisma'; // ← your entity type

@Injectable()
export class UnitsRepository extends CrudRepository<Unit> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.unit); // ← pass the Prisma model delegate
  }

  // Add domain-specific queries here:
  async isNameTaken(tenantId: string, name: string, excludeId?: string): Promise<boolean> {
    const count = await this.prisma.unit.count({
      where: {
        tenantId,
        name,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    return count > 0;
  }
}
```

Rules:
- The constructor passes `prisma.{modelName}` (lowercase) to `super()`.
- The repository knows nothing about HTTP, services, or response shapes.
- Add `findByX()`, `countBy()`, relationship-specific queries here.
- Never throw HTTP exceptions in the repository — only in the service.

---

### Step 6 — Create Presenter

**File:** `modules/{domain}/{resource}/presenters/{resource}.presenter.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { CrudPresenter } from '@devloggers/backend-core';
import type { Unit } from '@devloggers/db-prisma';
import { UnitResponseDto } from '../dto';

@Injectable()
export class UnitPresenter extends CrudPresenter<Unit, UnitResponseDto> {
  toResponse(entity: Unit): UnitResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      abbreviation: entity.abbreviation,
      isActive: entity.isActive,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}
```

Rules:
- One `toResponse()` per presenter. The base class provides `toResponseList()` for free.
- Date fields must be serialized to `.toISOString()`.
- If the response includes nested relations, map them here too.
- Never call the repository or service from the presenter.

---

### Step 7 — Create Service

**File:** `modules/{domain}/{resource}/services/{resource}s.service.ts`

```typescript
import { Injectable, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CrudService } from '@devloggers/backend-core';
import type { Unit } from '@devloggers/db-prisma';
import { UnitsRepository } from '../repositories/units.repository';
import { UnitPresenter } from '../presenters/unit.presenter';
import { CreateUnitDto, UpdateUnitDto, UnitResponseDto } from '../dto';
import { UnitCreatedEvent, UnitUpdatedEvent, UnitDeletedEvent } from '../events/unit.events';

@Injectable()
export class UnitsService extends CrudService<Unit, UnitResponseDto, CreateUnitDto, UpdateUnitDto> {
  protected readonly resourceName = 'unit'; // used in error messages & event names

  constructor(
    private readonly unitsRepository: UnitsRepository,
    private readonly unitPresenter: UnitPresenter,
    private readonly emitter: EventEmitter2,
  ) {
    super(unitsRepository, unitPresenter, emitter);
  }

  // ── beforeCreate / beforeUpdate / beforeDelete ─────────────────────────────
  // Throw ConflictException / BadRequestException / ForbiddenException to abort.

  protected override async beforeCreate(tenantId: string, dto: CreateUnitDto): Promise<void> {
    const taken = await this.unitsRepository.isNameTaken(tenantId, dto.name);
    if (taken) throw new ConflictException(`A unit named "${dto.name}" already exists`);
  }

  protected override async beforeUpdate(tenantId: string, id: string, dto: UpdateUnitDto): Promise<void> {
    if (dto.name) {
      const taken = await this.unitsRepository.isNameTaken(tenantId, dto.name, id);
      if (taken) throw new ConflictException(`A unit named "${dto.name}" already exists`);
    }
  }

  // ── onCreated / onUpdated / onDeleted ──────────────────────────────────────
  // Emit domain-specific events here. The base class already emits generic ones.

  protected override async onCreated(tenantId: string, entity: Unit): Promise<void> {
    this.emitter.emit(UnitCreatedEvent.NAME, new UnitCreatedEvent(tenantId, this.resourceName, entity));
  }

  protected override async onUpdated(tenantId: string, entity: Unit, previous: Unit): Promise<void> {
    this.emitter.emit(UnitUpdatedEvent.NAME, new UnitUpdatedEvent(tenantId, this.resourceName, entity, previous));
  }

  protected override async onDeleted(tenantId: string, entity: Unit): Promise<void> {
    this.emitter.emit(UnitDeletedEvent.NAME, new UnitDeletedEvent(tenantId, this.resourceName, entity));
  }
}
```

#### CrudService lifecycle hooks

| Hook | When it runs | Typical use |
|------|-------------|-------------|
| `beforeCreate(tenantId, dto)` | Before `repository.create()` | Uniqueness checks, data enrichment |
| `beforeUpdate(tenantId, id, dto, existing)` | Before `repository.update()` | Uniqueness on rename, status transition guards |
| `beforeDelete(tenantId, id, existing)` | Before `repository.delete()` | FK constraint checks, soft-delete guards |
| `onCreated(tenantId, entity)` | After successful create | Emit domain events, side effects |
| `onUpdated(tenantId, entity, previous)` | After successful update | Emit domain events, invalidate caches |
| `onDeleted(tenantId, entity)` | After successful delete | Emit domain events, cleanup |

---

### Step 8 — Create Controller

**File:** `modules/{domain}/{resource}/controllers/{resource}s.controller.ts`

```typescript
import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation,
  ApiCreatedResponse, ApiNoContentResponse, ApiParam,
  getSchemaPath, ApiExtraModels,
} from '@nestjs/swagger';
import { UnitsService } from '../services/units.service';
import { CreateUnitDto, UpdateUnitDto, UnitResponseDto } from '../dto';
import { JwtAuthGuard } from '../../../auth/guards';
import { CurrentUser, RequestUser } from '../../../auth/decorators';
import { ApiQueryOptionsDto } from '../../../../common/api/api-query-options.dto';
import {
  ApiOkResponseStandard,
  ApiOkResponsePaginated,
  ApiStandardErrors,
} from '../../../../common/decorators/api-swagger.decorators';
import { CrudController } from '../../../../common/base/crud-controller';
import { ApiSuccessResponseDto } from '../../../../common/api/api-responses.dto';

@ApiTags('Catalog / Units')    // ← "{Domain} / {Resource}" format
@Controller('units')           // ← kebab-case route
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UnitsController extends CrudController<UnitResponseDto, CreateUnitDto, UpdateUnitDto> {
  constructor(private readonly unitsService: UnitsService) {
    super(unitsService, 'Unit'); // ← resource label for success messages
  }

  @Get()
  @ApiOperation({ summary: 'List units of measure' })
  @ApiOkResponsePaginated(UnitResponseDto, { description: 'Paginated list of units' })
  @ApiStandardErrors()
  async list(@CurrentUser() user: RequestUser, @Query() query: ApiQueryOptionsDto) {
    return this.handleList(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a unit by ID' })
  @ApiParam({ name: 'id', description: 'Unit UUID' })
  @ApiOkResponseStandard(UnitResponseDto, { description: 'Unit details' })
  @ApiStandardErrors()
  async show(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.handleShow(user, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a unit of measure' })
  @ApiExtraModels(ApiSuccessResponseDto, UnitResponseDto)
  @ApiCreatedResponse({
    description: 'Unit created',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiSuccessResponseDto) },
        { properties: { data: { $ref: getSchemaPath(UnitResponseDto) } } },
      ],
    },
  })
  @ApiStandardErrors()
  async create(@CurrentUser() user: RequestUser, @Body() dto: CreateUnitDto) {
    return this.handleCreate(user, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a unit of measure' })
  @ApiParam({ name: 'id', description: 'Unit UUID' })
  @ApiOkResponseStandard(UnitResponseDto, { description: 'Updated unit' })
  @ApiStandardErrors()
  async update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: UpdateUnitDto) {
    return this.handleUpdate(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a unit of measure' })
  @ApiParam({ name: 'id', description: 'Unit UUID' })
  @ApiNoContentResponse({ description: 'Unit deleted' })
  @ApiStandardErrors()
  async delete(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<void> {
    return this.handleDelete(user, id);
  }
}
```

#### CrudController protected handlers

| Handler | Builds response from |
|---------|---------------------|
| `handleList(user, query)` | `service.list()` + `ApiResponseBuilder.buildPaginationMeta()` |
| `handleShow(user, id)` | `service.findById()` |
| `handleCreate(user, dto)` | `service.create()` |
| `handleUpdate(user, id, dto)` | `service.update()` |
| `handleDelete(user, id)` | `service.delete()` → returns void (204) |

---

### Step 9 — Create Feature Module

**File:** `modules/{domain}/{resource}/{resource}s.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { UnitsRepository } from './repositories/units.repository';
import { UnitsService } from './services/units.service';
import { UnitPresenter } from './presenters/unit.presenter';
import { UnitsController } from './controllers/units.controller';

@Module({
  controllers: [UnitsController],
  providers: [UnitsRepository, UnitsService, UnitPresenter],
  exports: [UnitsService], // export so CatalogModule (or other domains) can inject it
})
export class UnitsModule {}
```

---

### Step 10 — Register in Domain Module

**File:** `modules/{domain}/{domain}.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { UnitsModule } from './units/units.module';
// import { ItemsModule } from './items/items.module'; // ← add as you build more resources

@Module({
  imports: [UnitsModule],
  exports: [UnitsModule],
})
export class CatalogModule {}
```

If the domain module is new, also register it in `app.module.ts`.

---

### Step 11 — Register EventEmitterModule (once per app)

In `app.module.ts`, ensure `EventEmitterModule` is registered globally (already done if you see it in the imports):

```typescript
import { EventEmitterModule } from '@nestjs/event-emitter';

// In AppModule imports:
EventEmitterModule.forRoot({ wildcard: false, delimiter: '.', global: true }),
```

---

## Reference Files

The fully implemented reference module lives at:
```
apps/api/src/modules/catalog/units/
├── dto/unit.dto.ts
├── events/unit.events.ts
├── repositories/units.repository.ts
├── presenters/unit.presenter.ts
├── services/units.service.ts
├── controllers/units.controller.ts
└── units.module.ts
```

Base classes:
- `packages/backend-core/src/base/crud-repository.ts`
- `packages/backend-core/src/base/crud-service.ts`
- `packages/backend-core/src/base/crud-presenter.ts`
- `packages/backend-core/src/base/crud-events.ts`
- `apps/api/src/common/base/crud-controller.ts`

---

## Domain Module Template

When creating a new domain module:

```typescript
// modules/{domain}/{domain}.module.ts
import { Module } from '@nestjs/common';

@Module({
  imports: [],
  exports: [],
})
export class {Domain}Module {}
```

Then add to `app.module.ts`:
```typescript
import { {Domain}Module } from './modules/{domain}/{domain}.module';
// ...
@Module({ imports: [..., {Domain}Module] })
export class AppModule {}
```

---

## Response Shape Contract

All controller endpoints must use `ApiResponseBuilder` — never return raw objects.

| Operation | HTTP status | Response |
|-----------|-------------|---------|
| list | 200 | `{ status:'success', message:'X list', data: T[], meta: { pagination } }` |
| show | 200 | `{ status:'success', message:'X details', data: T }` |
| create | 201 | `{ status:'success', message:'X created', data: T }` |
| update | 200 | `{ status:'success', message:'X updated', data: T }` |
| delete | 204 | (empty body) |

Error codes come from `ApiErrorCode` in `@devloggers/api-contracts`.

---

## Common Mistakes to Avoid

1. **Do NOT** call `PrismaService` directly from the service — use the repository.
2. **Do NOT** return raw Prisma entities from controllers — always use the presenter.
3. **Do NOT** add Swagger docs on abstract base methods — add them on the concrete controller methods.
4. **Do NOT** use `@InjectRepository()` (TypeORM pattern) — this project uses Prisma.
5. **Do NOT** create a new `EventEmitter2` instance — inject it; it's globally registered.
6. **Do NOT** forget `@Injectable()` on Repository, Service, and Presenter.
7. **Do NOT** omit `tenantId` from repository queries — all data is tenant-scoped.

---

## Checklist

Before declaring a module done, verify:

- [ ] `{resource}.dto.ts` has `CreateXDto`, `UpdateXDto`, `XResponseDto` with `@ApiProperty` on all fields
- [ ] `{resource}.events.ts` exports `XCreatedEvent`, `XUpdatedEvent`, `XDeletedEvent`
- [ ] `{resource}s.repository.ts` extends `CrudRepository<T>` and passes `prisma.{model}` to `super()`
- [ ] `{resource}.presenter.ts` extends `CrudPresenter<Entity, ResponseDto>` and implements `toResponse()`
- [ ] `{resource}s.service.ts` extends `CrudService<...>`, sets `resourceName`, implements business hooks
- [ ] `{resource}s.controller.ts` extends `CrudController<...>`, has `@ApiTags`, `@ApiBearerAuth`, full Swagger on every route
- [ ] `{resource}s.module.ts` lists all providers and exports the service
- [ ] Domain `{domain}.module.ts` imports the new feature module
- [ ] `app.module.ts` imports the domain module (or it already did)
- [ ] `EventEmitterModule` is registered in `app.module.ts`
