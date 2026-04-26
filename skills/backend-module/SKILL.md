# Skill: Backend Module Structure

Use this skill when creating or modifying a NestJS module inside `apps/api/src/modules/`.

## Trigger

> "Create the backend module for [resource]"
> "Add a NestJS service/controller for [resource]"

## Directory Layout

```
apps/api/src/modules/<resource>/
  domain/
    <resource>.entity.ts        ← internal domain model (not exported as DTO)
  application/
    <resource>.service.ts       ← all business logic
  infrastructure/
    <resource>.repository.ts    ← all Prisma queries
  api/
    <resource>.controller.ts    ← HTTP layer only
    <resource>.validation.ts    ← class-validator request DTOs (optional)
  <resource>.module.ts          ← NestJS module wiring
```

## Controller — HTTP Only

```ts
import { ITEMS } from "@repo/contracts"
import type { CreateItemDto, UpdateItemDto, ApiQueryOptions } from "@repo/contracts"

@Controller(ITEMS.ROOT)
@UseGuards(JwtAuthGuard)
export class ItemsController {
  constructor(private readonly service: ItemsService) {}

  @Get()
  findAll(@Query() query: ApiQueryOptions) {
    return this.service.findAll(query)
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findOne(id)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateItemDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user.tenantId)
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateItemDto) {
    return this.service.update(id, dto)
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id") id: string) {
    return this.service.remove(id)
  }
}
```

**Controllers must NOT contain:** business logic, Prisma calls, if/throw decisions, data mapping.

## Service — Business Logic

```ts
@Injectable()
export class ItemsService {
  constructor(private readonly repo: ItemsRepository) {}

  async create(dto: CreateItemDto, tenantId: string): Promise<ItemDetailsDto> {
    const exists = await this.repo.findByCode(dto.code, tenantId)
    if (exists) {
      throw new ConflictException({
        status: "error",
        code: ApiErrorCode.ITEM_CODE_ALREADY_EXISTS,
        message: `Item with code "${dto.code}" already exists`,
      })
    }
    const item = await this.repo.create({ ...dto, tenantId })
    return this.toDetailsDto(item)
  }

  async findAll(query: ApiQueryOptions): Promise<ApiSuccessResponse<ItemTableDto[]>> {
    const { items, total } = await this.repo.findAll(query)
    return ApiResponseBuilder.success(
      items.map(this.toTableDto),
      "Items retrieved successfully",
      {
        pagination: {
          page: query.pagination?.page ?? 1,
          limit: query.pagination?.limit ?? 20,
          total,
          totalPages: Math.ceil(total / (query.pagination?.limit ?? 20)),
        },
      }
    )
  }

  private toDetailsDto(item: Item): ItemDetailsDto { /* map fields */ }
  private toTableDto(item: Item): ItemTableDto { /* map fields */ }
}
```

**Services must NOT:** import HTTP decorators, access `PrismaService` directly.

## Repository — Prisma Only

```ts
@Injectable()
export class ItemsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByCode(code: string, tenantId: string) {
    return this.prisma.item.findFirst({ where: { code, tenantId } })
  }

  async findAll(query: ApiQueryOptions, tenantId: string) {
    const page  = query.pagination?.page  ?? 1
    const limit = query.pagination?.limit ?? 20

    const [items, total] = await this.prisma.$transaction([
      this.prisma.item.findMany({
        where: { tenantId },
        orderBy: query.sort?.field
          ? { [query.sort.field]: query.sort.order ?? "asc" }
          : { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.item.count({ where: { tenantId } }),
    ])
    return { items, total }
  }

  async create(data: CreateItemDto & { tenantId: string }) {
    return this.prisma.item.create({ data })
  }
}
```

**Repositories must NOT:** contain business logic, throw business errors, return DTOs.

## Module Wiring

```ts
@Module({
  providers: [ItemsService, ItemsRepository],
  controllers: [ItemsController],
  exports: [ItemsService],
})
export class ItemsModule {}
```
