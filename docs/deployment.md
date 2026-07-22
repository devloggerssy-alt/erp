# Deployment

## Environment Variables

### API (`apps/api/.env.<NODE_ENV>`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Environment: `development`, `test`, `production` |
| `PORT` | No | `4040` | API listen port |
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | **Yes** | — | JWT signing secret |
| `JWT_ACCESS_EXPIRES_IN` | No | `24h` | JWT access token TTL |
| `JWT_REFRESH_SECRET` | No | — | JWT refresh secret (optional feature) |
| `JWT_REFRESH_EXPIRES_IN` | No | — | JWT refresh TTL |
| `BCRYPT_SALT_ROUNDS` | No | `10` | bcrypt work factor |
| `BASE_DOMAIN` | No | `localhost` | Base domain for cookies |
| `STORAGE_TYPE` | No | `local` | File storage: `local` or `s3` |
| `AWS_REGION` | If S3 | — | AWS region (e.g. `eu-central-1`) |
| `AWS_BUCKET_NAME` | If S3 | — | S3 bucket name |
| `AWS_ACCESS_KEY_ID` | If S3 | — | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | If S3 | — | AWS secret key |
| `AWS_CLOUDFRONT_DOMAIN` | No | — | CloudFront domain for file URLs |
| `AWS_S3_PATH_STYLE` | No | `false` | Use path-style S3 URLs |
| `GEMINI_API_KEY` | No | — | Google Gemini API key (AI chat) |
| `AI_MODEL` | No | `gemini-1.5-flash` | Gemini model name |
| `TWILIO_SID` | No | — | Twilio credentials |
| `TWILIO_SECRET` | No | — | Twilio secret |
| `TWILIO_ACCOUNT_SID` | No | — | Twilio account SID |
| `TWILIO_CONTENT_SID` | No | — | Twilio content SID |
| `TWILIO_WHATSAPP_FROM` | No | — | WhatsApp sender number |

### Dashboard (`apps/dashboard/.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_BASE_URL` | API base URL (default: `http://localhost:4040`) |

### n8n (`apps/n8n/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `N8N_IMAGE` | No | `docker.n8n.io/n8nio/n8n:latest` | n8n Docker image |
| `N8N_PORT` | No | `5678` | Host port exposed for n8n |
| `N8N_HOST` | No | `localhost` | Public host used by n8n |
| `N8N_PROTOCOL` | No | `http` | Public protocol, usually `http` locally and `https` behind a proxy |
| `N8N_WEBHOOK_URL` | No | `http://localhost:5678/` | Public webhook base URL |
| `GENERIC_TIMEZONE` | No | `Asia/Damascus` | Timezone for schedule and cron nodes |
| `TZ` | No | `Asia/Damascus` | Container system timezone |
| `N8N_DB_NAME` | Yes | `n8n` | n8n PostgreSQL database name |
| `N8N_DB_USER` | Yes | `n8n` | n8n PostgreSQL user |
| `N8N_DB_PASSWORD` | Yes | — | n8n PostgreSQL password |
| `N8N_ENCRYPTION_KEY` | Yes | — | Stable key used to encrypt n8n credentials |

---

## Build Process

### Development

```bash
# Start all apps simultaneously (Turborepo concurrent dev)
pnpm dev

# Start only the API
pnpm --filter @devloggers/api dev

# Start only the dashboard
pnpm --filter @devloggers/dashboard dev

# Start n8n in the foreground
pnpm n8n:dev

# Start n8n in the background
pnpm n8n:start
```

Note: The dashboard `predev` script runs `pnpm --filter @devloggers/api run generate` automatically to regenerate OpenAPI types before starting.

### Production Build

```bash
# Build all packages and apps in dependency order
pnpm turbo run build

# Build only the API
pnpm turbo run build --filter=@devloggers/api

# Build only the dashboard
pnpm turbo run build --filter=@devloggers/dashboard
```

Turborepo output locations:
- API: `apps/api/dist/`
- Dashboard: `apps/dashboard/.next/`

### Type Checking

```bash
pnpm check-types
```

---

## Available Scripts

### Root

| Script | Command | Description |
|--------|---------|-------------|
| `build` | `turbo run build` | Build all apps + packages |
| `dev` | `turbo run dev` | Start all dev servers |
| `lint` | `turbo run lint` | Lint all packages |
| `format` | `prettier --write **/*.{ts,tsx,md}` | Format all files |
| `check-types` | `turbo run check-types` | TypeScript type check |

### API (`apps/api`)

| Script | Description |
|--------|-------------|
| `pnpm dev` | NestJS dev server with hot reload (`nest start --watch`) |
| `pnpm build` | Production build (`nest build` → `dist/`) |
| `pnpm start:prod` | Run built API (`node dist/main`) |
| `pnpm test` | Jest unit tests |
| `pnpm test:e2e` | Jest E2E tests |

### Dashboard (`apps/dashboard`)

| Script | Description |
|--------|-------------|
| `pnpm dev` | Next.js Turbopack dev server |
| `pnpm build` | Next.js production build |
| `pnpm start` | Serve production build |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test:unit` | Vitest unit tests |
| `pnpm test:e2e` | Cypress E2E tests |

### Database (`packages/db-prisma`)

| Script | Description |
|--------|-------------|
| `pnpm --filter @devloggers/db-prisma db:generate` | Regenerate Prisma client |
| `pnpm --filter @devloggers/db-prisma db:migrate:dev` | Create + apply migration |
| `pnpm --filter @devloggers/db-prisma db:seed` | Run seed (idempotent) |
| `pnpm --filter @devloggers/db-prisma db:studio` | Open Prisma Studio |

### n8n (`apps/n8n`)

| Script | Description |
|--------|-------------|
| `pnpm n8n:dev` | Start n8n + its PostgreSQL database in the foreground |
| `pnpm n8n:start` | Start n8n + its PostgreSQL database in the background |
| `pnpm n8n:stop` | Stop and remove the n8n containers |
| `pnpm n8n:logs` | Follow n8n container logs |
| `pnpm n8n:config` | Render the resolved Docker Compose config |

### OpenAPI Types

```bash
# Regenerate OpenAPI-derived types (API must be running)
pnpm generate:dev

# Rebuild api-contracts after type regeneration
pnpm --filter @devloggers/api-contracts build
```

---

## Docker Setup

The API and dashboard are still run directly with pnpm in development. The development setup requires:

1. A locally running PostgreSQL instance for the ERP API (or remote, via `DATABASE_URL`).
2. Manual `.env.development` configuration in `apps/api/`.
3. Optional: `.env.local` in `apps/dashboard/` for `NEXT_PUBLIC_API_BASE_URL`.

n8n is provided as an isolated Docker Compose app at `apps/n8n`. It runs n8n plus a dedicated PostgreSQL container and stores state in Docker volumes:

- `n8n_data` for n8n user data and credential encryption metadata.
- `n8n_postgres_data` for the n8n database.
- `apps/n8n/local-files` mounted into n8n at `/files` for workflows that read or write local files.

For production, put n8n behind HTTPS, set `N8N_PROTOCOL=https`, set `N8N_WEBHOOK_URL` to the public URL, replace local secrets in `apps/n8n/.env`, and keep `N8N_ENCRYPTION_KEY` stable across deployments. Containerization of the NestJS API and Next.js app would follow standard Node.js container patterns. A PostgreSQL managed service (e.g., AWS RDS, Supabase) is recommended for the ERP database.

---

## Database Migration Workflow

```bash
# 1. Edit schema files in packages/db-prisma/src/schema/*.prisma

# 2. Create and apply migration
pnpm --filter @devloggers/db-prisma db:migrate:dev
# → Prompts for migration name
# → Creates migration file in src/schema/migrations/
# → Applies migration to database
# → Regenerates Prisma client

# 3. If only regenerating client (no schema changes):
pnpm --filter @devloggers/db-prisma db:generate

# 4. Run seed if needed
pnpm --filter @devloggers/db-prisma db:seed
```

---

## Production Considerations

1. **JWT secrets** — Use strong, randomly generated secrets for `JWT_ACCESS_SECRET`. Rotate regularly.
2. **Database** — Use connection pooling (PgBouncer or Prisma's connection pool). The `.env.development` references a remote PostgreSQL instance — ensure production uses a separate database.
3. **File storage** — Use S3 in production (`STORAGE_TYPE=s3`). Local storage is not suitable for multi-instance deployments.
4. **CORS** — Currently set to `origin: true` (allow all) in development. Restrict to your dashboard domain in production via `app.enableCors({ origin: 'https://your-domain.com' })`.
5. **Cookie security** — Ensure `secure: true` and `httpOnly: true` on the `access_token` cookie in production.
6. **Environment validation** — The Joi schema in `envValidator.ts` validates env vars at startup; missing required vars cause an immediate crash.
7. **Turborepo caching** — Configure `TURBO_TEAM` and `TURBO_TOKEN` for remote caching in CI/CD pipelines.
8. **API key exposure** — The `.env.development` file in this repo contains actual AWS and Twilio credentials. These should be rotated and never committed to version control in production.
