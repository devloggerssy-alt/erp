# Code Patterns

## Coding Conventions

### TypeScript
- **Strict mode** enforced via shared `tsconfig` base.
- Explicit return types on all public API methods.
- `interface` preferred over `type` for object shapes (better error messages, declaration merging).
- `satisfies` operator for type-narrowing config objects.
- No `as any` — regenerate OpenAPI types instead.

### Naming
- Files: `kebab-case.ts` / `kebab-case.tsx`
- Classes: `PascalCase`
- Functions/methods: `camelCase`
- Constants: `UPPER_SNAKE_CASE` for top-level config
- Database tables: `snake_case` (mapped via `@@map`)
- TypeScript properties: `camelCase` (mapped via `@map`)

---

## CRUD Factory Pattern

The `createCrudController()` factory from `@devloggers/backend-core` eliminates controller boilerplate:

```typescript
// 1. Define OpenAPI metadata
const UNITS_CRUD_OPENAPI = {
    list:   { operation: { summary: 'List units' }, responseDescription: 'Paginated list' },
    show:   { operation: { summary: 'Get a unit by ID' }, idParam: { description: 'Unit UUID' } },
    create: { operation: { summary: 'Create a unit' } },
    update: { operation: { summary: 'Update a unit' } },
    delete: { operation: { summary: 'Delete a unit' } },
} satisfies CrudOpenApi

// 2. Generate base class
const UnitsCrudBase = createCrudController({
    responseDto: UnitResponseDto,
    createDto: CreateUnitDto,
    updateDto: UpdateUnitDto,
    openApi: UNITS_CRUD_OPENAPI,
})

// 3. Concrete controller — only class decorators + constructor
@ApiTags('Catalog / Units')
@Controller('units')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UnitsController extends UnitsCrudBase {
    constructor(service: UnitsService) { super(service, 'Unit') }
}
```

The factory generates: `@Get()` list, `@Get(':id')` show, `@Post()` create, `@Patch(':id')` update, `@Delete(':id')` delete — all with pagination, tenant scoping, Swagger decorators, and `ApiResponseBuilder` envelopes.

---

## Repository Pattern

```typescript
@Injectable()
export class UnitsRepository extends CrudRepository<Unit> {
    constructor(private readonly prisma: PrismaService) {
        super(prisma.unit)   // ← pass Prisma model delegate
    }

    // Custom queries go here:
    async isNameTaken(tenantId: string, name: string, excludeId?: string): Promise<boolean> {
        const count = await this.prisma.unit.count({
            where: { tenantId, name, ...(excludeId ? { id: { not: excludeId } } : {}) },
        })
        return count > 0
    }
}
```

**Rules**:
- `CrudRepository` always filters by `tenantId` automatically in `findMany`, `findById`, `exists`.
- Never throw HTTP exceptions in the repository — only throw in the service layer.
- Custom queries use the injected `PrismaService` directly (not just the model delegate).

---

## Presenter Pattern

```typescript
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
        }
    }
}
```

**Rules**:
- Date fields must use `.toISOString()`.
- Never call repository or service from presenter.
- `toResponseList()` is provided by base class — calls `toResponse` for each item.

---

## Service Lifecycle Hooks

```typescript
@Injectable()
export class UnitsService extends CrudService<Unit, UnitResponseDto, CreateUnitDto, UpdateUnitDto> {
    protected readonly resourceName = resources.units.key  // 'units'

    constructor(repo: UnitsRepository, presenter: UnitPresenter, emitter: EventEmitter2) {
        super(repo, presenter, emitter)
    }

    // Business rule hook — throw to abort
    protected override async beforeCreate(tenantId: string, dto: CreateUnitDto): Promise<void> {
        const taken = await this.unitsRepository.isNameTaken(tenantId, dto.name)
        if (taken) throw new ConflictException(`A unit named "${dto.name}" already exists`)
    }

    // Update hook — receives current entity snapshot
    protected override async beforeUpdate(tenantId: string, id: string, dto: UpdateUnitDto): Promise<void> {
        if (dto.name) {
            const taken = await this.unitsRepository.isNameTaken(tenantId, dto.name, id)
            if (taken) throw new ConflictException(`A unit named "${dto.name}" already exists`)
        }
    }
}
```

**Do NOT** re-emit `ResourceCreatedEvent` / `ResourceUpdatedEvent` / `ResourceDeletedEvent` in `onCreated` / `onUpdated` / `onDeleted` — the base class already handles this.

---

## Dashboard Resource Pattern

### Resource Definition

```typescript
// units.resource.ts
export const UnitsResource = generateResource<UnitsClient>({
    getClient: (api) => api.units,
    paramKey: "units",
    list: {
        searchIn: ["name", "abbreviation"],
        defaultSort: { field: "name", order: "asc" },
    },
})
```

### Page Composition

```tsx
"use client"
export function UnitsPage() {
    return (
        <UnitsResource>
            <UnitsResource.Page
                title="Units"
                actions={
                    <UnitsResource.FormDialog
                        title={(it) => (it?.id ? it.name : "Add unit")}
                        form={UnitsForm}
                    />
                }
            >
                <UnitsResource.Table columns={createUnitsColumns} />
            </UnitsResource.Page>
        </UnitsResource>
    )
}
```

**Default toolbar layout** (no `toolbar` prop): Filter (start) · Search (center) · `actions` (end).

### Columns Definition

```tsx
// units-columns.tsx  (must be .tsx — uses JSX)
export function createUnitsColumns(helpers: ResourceTableHelpers<UnitsClient>) {
    return [
        {
            accessorKey: "name",
            header: ({ column }) => <ColumnHeader column={column} title="Name" />,
        },
        {
            accessorKey: "isActive",
            header: ({ column }) => <ColumnHeader column={column} title="Active" />,
            cell: ({ row }) => <BooleanCell value={row.getValue("isActive") as boolean} />,
        },
        helpers.actionsColumn(),  // edit + delete row menu
    ]
}
```

---

## Form Pattern

### Config File (`.config.ts` — no JSX)

```typescript
export const unitFormSchema = z.object({
    name: z.string().trim().min(1, "Name is required"),
    abbreviation: z.string().trim().min(1, "Abbreviation is required"),
    isActive: z.boolean().optional(),
})

export type UnitFormValues = z.infer<typeof unitFormSchema>

export const DEFAULT_UNIT_FORM_VALUES: UnitFormValues = { name: "", abbreviation: "", isActive: true }

export function mapUnitToFormValues(data: unknown): UnitFormValues {
    const resolved = (data && typeof data === "object" && "data" in data
        ? (data as { data?: Partial<UnitFormValues> }).data
        : data) as Partial<UnitFormValues> | null | undefined
    return {
        name: resolved?.name ?? "",
        abbreviation: resolved?.abbreviation ?? "",
        isActive: resolved?.isActive ?? true,
    }
}
```

### Form Component

```tsx
"use client"
export function UnitsForm({ resourceId, initialData, onSuccess, paramKey }) {
    const api = useApi()
    const { close } = useFormDialog(paramKey)

    const { form, isEditing, isInitializing } = useResourceForm<UnitFormValues, unknown>({
        schema: unitFormSchema,
        defaultValues: DEFAULT_UNIT_FORM_VALUES,
        resourceId,
        initialize: (id) => api.units.show(id),
        initialData,
        queryKey: [unitResource.routes.show, resourceId],
        mapToFormValues: mapUnitToFormValues,
    })

    const { mutate, error, isPending } = useFormMutation(form, {
        mutationFn: (values) =>
            isEditing
                ? api.units.update(resourceId!, values)
                : api.units.create(values),
        onSuccess: () => { form.reset(DEFAULT_UNIT_FORM_VALUES); close(); onSuccess?.() },
    })
}
```

### Relational Fields

```tsx
<RhfResourceSelect<TValues, "invoiceType", InvoiceTypesClient, RelationalField>
    client={(api) => api.invoiceTypes}
    getLabel={(it) => it.name}
    getValue={(it) => it}           // stores full object; extracts .id in mapper
/>
```

- Field name drops the `Id` suffix (`invoiceType` not `invoiceTypeId`)
- Schema: `z.object({ id: z.string() }).passthrough().nullable()`
- DTO mapper: `values.invoiceType?.id ?? ""`

---

## Error Handling

### API Layer

| Exception | HTTP Status | When |
|-----------|-------------|------|
| `NotFoundException` | 404 | `findByIdOrFail` or explicit check |
| `ConflictException` | 409 | Duplicate name/code |
| `BadRequestException` | 400 | Invalid business state (e.g., posting a non-draft invoice) |
| `UnauthorizedException` | 401 | JWT invalid or missing |
| `ForbiddenException` | 403 | Action not permitted |
| NestJS `ValidationPipe` | 400 | DTO validation failures |

### Dashboard Layer

`ApiError` class captures:
- `status` — HTTP status code
- `statusText`
- `endpoint`
- `method`
- `payload.validationErrors` — mapped by `useFormMutation` to form field errors

```typescript
// useFormMutation maps server validation errors to form fields automatically:
onError: (err) => {
    if (err instanceof ApiError && err.validationErrors) {
        Object.entries(err.validationErrors).forEach(([field, msgs]) => {
            form.setError(field, { message: msgs[0] })
        })
    }
}
```

---

## Validation Strategy

| Layer | Library | Where |
|-------|---------|-------|
| **API DTOs** | `class-validator` + `@IsString()`, `@IsNotEmpty()`, etc. | `dto/*.dto.ts` |
| **API global** | `ValidationPipe` (whitelist, forbidNonWhitelisted, transform) | `app.module.ts` |
| **Dashboard forms** | `zod` v4 schemas | `*.config.ts` |
| **RHF integration** | `@hookform/resolvers/zod` | Forms |

---

## i18n Pattern

Three locales: **Arabic** (`ar`, primary / RTL), **English** (`en`), **Turkish** (`tr`).

Messages split into namespaces:
- `system.*` — UI framework strings (tables, search, pagination, form dialogs)
- `business.*` — Business domain strings (navigation, entity labels, field names)
- `shared.*` — Cross-cutting strings (Arabic only, based on code inspection)

```typescript
// In components:
const t = useTranslations("business.navigation")
<span>{t("items.units")}</span>

// In config/navGroups.tsx:
{ titleKey: "business.navigation.items.units", href: "/catalog/units" }
```

Locale routing via `next-intl` middleware in `middleware.ts`. All routes are prefixed with `/[locale]/`.

RTL support: logical CSS properties (`start`/`end` instead of `left`/`right`). Tajawal font for Arabic text.

---

## OpenAPI Type Generation

The `packages/api-contracts/src/types/` directory is **auto-generated** and must never be edited manually:

```bash
# Requires API to be running on localhost:4040
pnpm generate:dev

# Rebuild contracts package so downstream consumers pick up new types
pnpm --filter @devloggers/api-contracts build
```

Run after: new API endpoints, renamed fields, added DTOs.
