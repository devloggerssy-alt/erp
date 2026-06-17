# Security

## Authentication

### JWT Strategy

Authentication uses JSON Web Tokens signed with `JWT_ACCESS_SECRET`.

**Token extraction** (in order):
1. `access_token` HTTP-only cookie (set on login response)
2. `Authorization: Bearer <token>` header

**JWT payload**:
```typescript
{
    sub: string,       // userId
    tenantId: string,  // tenant scope
    email: string,
}
```

**Guard**: `JwtAuthGuard` (Passport JWT strategy) is applied to all resource controllers via `@UseGuards(JwtAuthGuard)`. The guard validates the token signature and expiry, and populates `req.user`.

**Token TTL**: Configurable via `JWT_ACCESS_EXPIRES_IN` (default `24h`). The development env uses `15d` — this is too long for production; recommended 15m–1h with refresh tokens.

### Login Flow

```
POST /auth/login
  Body: { email, password }
  → Load AppUser by (tenantId, email)
  → bcrypt.compare(password, passwordHash)
  → Sign JWT with { sub: user.id, tenantId, email }
  → Return { accessToken, user } + set access_token cookie
```

Password hashing: bcrypt with configurable salt rounds (default 10, development uses 12).

---

## Authorization

### Tenant Isolation

**Every query** in `CrudRepository.findMany()`, `findById()`, `findByIdOrFail()`, and `exists()` automatically includes `tenantId` from the JWT payload. This is enforced at the repository base class level — individual developers cannot accidentally omit the tenant scope.

```typescript
// From CrudRepository — tenantId always merged into where clause:
const scopedWhere = { ...where, tenantId }
await this.model.findMany({ where: scopedWhere, ... })
```

Cascade deletes on the `Tenant` relation ensure that no orphaned tenant data can exist.

### Role-Based Access Control

The system has the data model for roles (`Role`, `UserRole`) but, based on code inspection, granular per-endpoint RBAC is not yet fully implemented. Current protection is:

- **Authenticated vs. unauthenticated** — `JwtAuthGuard` on all resource endpoints.
- **Tenant scope** — All data is tenant-scoped via the JWT payload.
- **Role assignment** — Users can be assigned roles, but controller-level role checks (e.g., `@Roles('admin')`) are not observed in the reviewed controllers.

This represents a gap: any authenticated user within a tenant can perform all CRUD operations on all resources.

---

## Sensitive Data Handling

| Data | Handling |
|------|---------|
| Passwords | Hashed with bcrypt (never stored in plaintext) |
| JWT secret | Env var (`JWT_ACCESS_SECRET`), never in code |
| AWS credentials | Env vars (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) |
| Database URL | Env var (`DATABASE_URL`) |
| Twilio credentials | Env vars (`TWILIO_*`) |
| Gemini API key | Env var (`GEMINI_API_KEY`) |

**Warning**: The `.env.development` file committed to this repository contains real AWS and Twilio credentials. These should be rotated immediately and excluded from version control (add `.env.*` to `.gitignore`).

---

## API Security Considerations

### Input Validation

Global `ValidationPipe` with:
- `whitelist: true` — strips unknown properties (prevents property injection)
- `forbidNonWhitelisted: true` — throws 400 on unexpected properties
- `transform: true` — implicit type coercion (numbers from strings in query params)

### SQL Injection

Prisma ORM uses parameterized queries by default. No raw SQL strings are visible in the codebase.

### CORS

Currently configured as `origin: true` (allow all origins) for development. Must be locked down to specific origins in production.

### File Upload Security

- Multer handles multipart uploads
- File metadata (original name, MIME type, size, extension) stored in DB
- Local storage serves files via `/uploads` static prefix (no directory traversal protection beyond Express's built-in)
- S3 storage uses pre-signed URLs or direct S3 URLs

Potential risk: no MIME type validation beyond what Multer provides by default. Consider restricting allowed MIME types for uploads.

### CSRF

No explicit CSRF protection is configured. The JWT-in-cookie approach is vulnerable to CSRF if the API accepts cookie auth for state-changing operations. Mitigations:
- Use `SameSite=Strict` or `SameSite=Lax` on the `access_token` cookie.
- Alternatively, use Authorization header exclusively (not cookies) for API calls from the dashboard.

### Rate Limiting

No rate limiting is configured in the reviewed code. For production, consider adding `@nestjs/throttler` on auth endpoints (`/auth/login`) at minimum.

### Audit Logging

The `AuditLog` model records mutations with:
- `userId` — who performed the action
- `action` — CREATE, UPDATE, DELETE, POST, CANCEL
- `entityType` + `entityId` — what was changed
- `oldValues` + `newValues` — JSONB snapshots
- `ipAddress` — request origin

This provides a comprehensive change history for compliance and debugging.

---

## Security Checklist (Current State)

| Control | Status |
|---------|--------|
| Password hashing (bcrypt) | Implemented |
| JWT authentication | Implemented |
| Tenant isolation (all queries) | Implemented |
| Input validation (class-validator) | Implemented |
| SQL injection prevention (Prisma parameterized) | Implemented |
| Audit logging | Implemented (model exists; decorator integration TBD) |
| RBAC (role-based permissions) | Data model exists; enforcement not implemented |
| CORS lockdown | Not production-ready (allow all) |
| Rate limiting | Not implemented |
| CSRF protection | Not explicitly configured |
| Cookie security flags | Partially (review `access_token` cookie settings) |
| Secrets management | Env vars; `.env.development` contains live credentials (risk) |
| File upload type validation | Basic only |
