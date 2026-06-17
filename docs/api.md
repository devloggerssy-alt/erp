# API

## API Structure

- **Framework**: NestJS 11 on Express
- **Default port**: 4040 (configurable via `PORT` env var)
- **No global prefix** — routes are mounted at root (e.g., `/units`, `/invoices`)
- **Swagger UI**: `http://localhost:4040/docs`
- **Swagger JSON**: `http://localhost:4040/swagger.json`
- **Swagger YAML**: `http://localhost:4040/swagger.yaml`

---

## Authentication

The API uses **JWT Bearer tokens** extracted from:
1. `access_token` HTTP-only cookie (set on login)
2. `Authorization: Bearer <token>` header (fallback)

The `JwtStrategy` validates tokens against `JWT_ACCESS_SECRET` and sets `req.user`:

```typescript
{
    id: string,       // userId (from JWT sub)
    tenantId: string, // tenant scope
    email: string,
}
```

All resource endpoints require `@UseGuards(JwtAuthGuard)`. The `@CurrentUser()` decorator extracts the user from the request.

### Login Flow

```
POST /auth/login
Body: { email, password }
Response: { accessToken, user: { id, email, tenantId } }
         + sets access_token cookie
```

---

## Request/Response Shape

### Success Response

```typescript
{
    status: "success",
    message: string,
    data: T | T[],
    meta?: {
        pagination?: {
            total: number,
            page: number,
            limit: number,
            totalPages: number,
        },
        filterOptions?: FilterField[],
    }
}
```

### Error Response

```typescript
{
    status: "error",
    message: string,
    data: null,
    error: {
        code: string,    // e.g. "NOT_FOUND", "CONFLICT"
        message: string,
        details?: unknown,
    }
}
```

### Validation Error (400)

NestJS `ValidationPipe` with `whitelist: true, forbidNonWhitelisted: true` returns:

```json
{
    "statusCode": 400,
    "message": ["name should not be empty"],
    "error": "Bad Request"
}
```

---

## Query Parameters (List Endpoints)

All list endpoints accept via `ApiQueryOptionsDto`:

| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Page size (default: 10) |
| `sortBy` | string | Field to sort by |
| `sortOrder` | `asc` \| `desc` | Sort direction |
| `search` | string | Full-text search across configured fields |
| `filters` | object | Per-field filter values (deepObject format) |

The `buildPrismaWhere()` utility in `backend-core` translates query params to Prisma `where` clauses using a per-resource `FilterSchema` safelist.

---

## Swagger/OpenAPI Setup

Configured in `apps/api/src/main.ts`:

- Title: `Devloggers ERP API`
- Bearer auth scheme: `JWT-auth` (used with `@ApiBearerAuth('JWT-auth')`)
- `operationIdFactory`: generates IDs as `ControllerName.methodName`
- `persistAuthorization: true` in Swagger UI options
- `displayRequestDuration: true`
- `tryItOutEnabled: true`

OpenAPI types in `packages/api-contracts/src/types/` are auto-generated from the running API's spec using `pnpm generate:dev`. Never edit these files manually.

---

## Endpoint Groups by Domain

### Identity (`/auth`, `/tenants`, `/users`, `/roles`, `/settings`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/login` | Authenticate user |
| POST | `/auth/logout` | Invalidate session |
| GET | `/auth/me` | Get current user profile |
| POST | `/auth/register` | Register new user |
| GET | `/tenants` | List tenants |
| GET/PATCH | `/tenants/:id` | Get/update tenant |
| GET/POST/PATCH/DELETE | `/users` | User CRUD |
| GET/POST/PATCH/DELETE | `/roles` | Role CRUD |
| GET/PATCH | `/settings` | Tenant settings |

### Catalog (`/units`, `/item-categories`, `/items`, `/brands`, `/tags`, `/tag-assignments`, `/custom-fields`, `/catalog-entities`, `/item-catalog-entities`)

All follow standard CRUD: `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `DELETE /:id`.

Additional:
- `GET /items` — searchable, filterable by category, itemType, brand
- `GET /custom-fields` — filtered by module

### Inventory (`/warehouses`, `/inventory`, `/stock-movements`, `/stock-counts`)

| Method | Path | Description |
|--------|------|-------------|
| GET/POST/PATCH/DELETE | `/warehouses` | Warehouse CRUD |
| GET | `/inventory` | Stock balances (current quantities) |
| GET | `/stock-movements` | Stock movement ledger |
| GET/POST/PATCH/DELETE | `/stock-counts` | Stock count CRUD |
| POST | `/stock-counts/:id/post` | Post a stock count (generates movements) |

### Invoicing (`/invoice-types`, `/invoices`, `/payments`, `/cashboxes`, `/expenses`)

| Method | Path | Description |
|--------|------|-------------|
| GET/POST/PATCH/DELETE | `/invoice-types` | Invoice type CRUD |
| GET/POST | `/invoices` | List/create invoices |
| GET/PATCH | `/invoices/:id` | Get/update invoice (DRAFT only) |
| POST | `/invoices/:id/post-purchase` | Post purchase invoice |
| POST | `/invoices/:id/post-sale` | Post sales invoice |
| POST | `/invoices/:id/cancel` | Cancel posted invoice |
| GET/POST/PATCH/DELETE | `/payments` | Payment CRUD |
| GET/POST/PATCH/DELETE | `/cashboxes` | Cashbox CRUD |
| GET/POST/PATCH/DELETE | `/expenses` | Expense CRUD |

### Accounting (`/accounts`, `/currencies`, `/fiscal-periods`, `/document-sequences`)

All standard CRUD with additional:
- `POST /fiscal-periods/:id/close` — Close fiscal period
- `POST /fiscal-periods/:id/lock` — Lock fiscal period

### Parties (`/parties`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/parties` | List all parties (filterable by type: CUSTOMER, SUPPLIER) |
| GET/POST/PATCH/DELETE | `/parties` | Standard CRUD |

### Reports (`/reports`, `/dashboard`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/dashboard` | Home dashboard KPIs |
| GET | `/reports/stock` | Stock level report |
| GET | `/reports/sales` | Sales summary report |
| GET | `/reports/purchases` | Purchase summary report |

### AI Chat (`/ai-chat`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/ai-chat/sessions` | List chat sessions |
| POST | `/ai-chat/sessions` | Create new session |
| GET | `/ai-chat/sessions/:id` | Get session with messages |
| POST | `/ai-chat/sessions/:id/messages` | Send a message (Gemini response) |

### Audit (`/audit-logs`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/audit-logs` | List audit logs (filterable by entityType, entityId) |

### Files (`/files`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/files/upload` | Upload file (multipart/form-data) |
| GET | `/files/:id` | Get file metadata |
| DELETE | `/files/:id` | Delete file |

---

## Key Controller Patterns

### Standard CRUD Controller

```typescript
@ApiTags('Catalog / Units')
@Controller('units')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UnitsController extends createCrudController({
    responseDto: UnitResponseDto,
    createDto: CreateUnitDto,
    updateDto: UpdateUnitDto,
    openApi: UNITS_CRUD_OPENAPI,
}) {
    constructor(service: UnitsService) {
        super(service, 'Unit')
    }
}
```

The factory auto-generates all 5 routes. No manual `@Get`/`@Post` decorators needed.

### Non-CRUD Controller (Invoices)

Invoice posting/cancellation controllers add custom routes beyond the base CRUD by defining additional `@Post` methods in the concrete controller class, or in a separate `InvoicePostingController`.
