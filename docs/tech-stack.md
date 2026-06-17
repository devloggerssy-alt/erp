# Tech Stack

## Languages

| Language | Usage |
|----------|-------|
| **TypeScript 5.9** | All application code — API, dashboard, and packages |
| **SQL** | Prisma migrations |
| **CSS** | Tailwind v4 utility classes + CSS custom properties |

---

## Frameworks

### Backend — NestJS 11
- Module-based dependency injection
- Passport + JWT for authentication
- `@nestjs/swagger` for OpenAPI documentation
- `@nestjs/event-emitter` for domain events
- `@nestjs/config` + Joi for environment validation
- NestJS Express platform (`@nestjs/platform-express`)

### Frontend — Next.js 16 (App Router)
- Server components + client components
- Turbopack for development builds
- `next-intl` for i18n (Arabic, English, Turkish)
- `next-themes` for dark/light mode
- Parallel routes (`@breadcrumbs`) for breadcrumb slots
- Route groups: `(authenticated)` and `(auth)`

### ORM — Prisma
- Schema split into per-entity `.prisma` files, merged at generate time
- Generated client output to `packages/db-prisma/generated/client`
- `PrismaModule` for NestJS dependency injection

---

## Libraries

### API (NestJS)

| Library | Purpose |
|---------|---------|
| `class-validator` | DTO validation via decorators |
| `class-transformer` | DTO transformation (implicit type conversion) |
| `passport-jwt` / `passport-local` | JWT and local auth strategies |
| `bcryptjs` | Password hashing |
| `@nestjs-modules/mailer` + `nodemailer` | Email sending |
| `@aws-sdk/client-s3` | AWS S3 file uploads |
| `multer` | Multipart file handling |
| `twilio` | SMS / WhatsApp |
| `slugify` | Tenant slug generation |
| `js-yaml` | YAML parsing (Swagger export) |
| `cookie-parser` | Cookie middleware for JWT cookie extraction |
| `joi` | Environment variable validation schema |

### Dashboard (Next.js)

| Library | Purpose |
|---------|---------|
| `@tanstack/react-query` | Server state management, cache invalidation |
| `@tanstack/react-table` | Headless table with sorting/pagination |
| `react-hook-form` | Form state management |
| `@hookform/resolvers` | Zod schema integration with RHF |
| `zod` v4 | Form validation schemas |
| `radix-ui` | Accessible UI primitives |
| `shadcn` | Component library built on Radix UI |
| `lucide-react` | Icon set |
| `class-variance-authority` | Variant-based component styling |
| `clsx` + `tailwind-merge` | Conditional class composition |
| `next-intl` | i18n with RTL support |
| `nuqs` | URL search params state management |
| `zustand` | Client-side auth store |
| `recharts` | Charts for dashboard metrics |
| `sonner` | Toast notifications |
| `cmdk` | Command palette |
| `date-fns` | Date utilities |
| `embla-carousel-react` | Carousel components |
| `react-day-picker` | Date picker |
| `vaul` | Drawer component |
| `react-resizable-panels` | Resizable panel layouts |
| `object-to-formdata` | DTO → FormData conversion |
| `input-otp` | OTP input field |
| `@base-ui/react` | Base UI components |
| `tw-animate-css` | Tailwind animation utilities |

---

## Build Tools

| Tool | Purpose |
|------|---------|
| **Turborepo 2.7** | Monorepo task orchestration, build caching |
| **pnpm 9** | Package manager with workspace support |
| **NestJS CLI** | API build (`nest build` → `dist/`) |
| **Next.js Turbopack** | Dashboard dev server |
| **TypeScript `tsc`** | Type checking (`check-types` task) |
| **ESLint** | Linting (both API and dashboard) |
| **Prettier** | Code formatting |
| **Vitest** | Dashboard unit tests |
| **Jest** | API unit tests |
| **Cypress** | Dashboard E2E tests |

---

## Infrastructure

| Component | Details |
|-----------|---------|
| **Database** | PostgreSQL (any version compatible with Prisma v5+) |
| **File Storage** | Local filesystem (`uploads/`) OR AWS S3 (configurable via `STORAGE_TYPE`) |
| **CDN** | AWS CloudFront (optional, via `AWS_CLOUDFRONT_DOMAIN`) |
| **Runtime** | Node.js 18+ |
| **API port** | 4040 (default), configurable via `PORT` |
| **Dashboard** | Default Next.js ports (3000 dev) |

No Docker Compose file is present in the repository. The development setup requires a locally running PostgreSQL instance and manual environment configuration.

---

## Third-Party Services

| Service | Integration | Required |
|---------|------------|---------|
| **Google Gemini** | AI chat assistant | Optional (`GEMINI_API_KEY`) |
| **AWS S3 + CloudFront** | File storage | Optional (falls back to local) |
| **Twilio** | SMS/WhatsApp notifications | Optional |
| **SMTP server** | Email delivery | Optional |
