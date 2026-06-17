# File Structure

## Top-Level Directory Map

```
erp/
├── apps/
│   ├── api/                      NestJS REST API
│   ├── dashboard/                Next.js App Router dashboard
│   └── desktop/                  Desktop app (Electron or similar — minimal code)
├── packages/
│   ├── api-client/               Typed HTTP clients (CrudClient subclasses)
│   ├── api-contracts/            Resource definitions + shared DTOs (source of truth)
│   ├── backend-core/             Shared NestJS infrastructure (CRUD bases, factories)
│   ├── db-prisma/                Prisma schema, migrations, seed, PrismaModule
│   ├── eslint-config/            Shared ESLint config
│   ├── i18n/                     Shared translation messages (ar, en, tr)
│   ├── typescript-config/        Shared tsconfig bases
│   ├── ui/                       Shared UI components
│   └── utils/                    Shared utilities
├── scripts/                      Utility scripts (e.g. OpenAPI type generation)
├── reference/                    Reference files / specs
├── docs/                         Documentation (this directory)
├── AGENTS.md                     Agent guide
├── CLAUDE.md                     Claude Code project instructions (thin adapter)
├── PRODUCT.md                    Product brief (target users, brand, design principles)
├── DESIGN.md                     Design documentation
├── turbo.json                    Turborepo task graph
├── pnpm-workspace.yaml           pnpm workspace definition
└── package.json                  Root package (scripts: build, dev, lint, check-types)
```

---

## `apps/api` Structure

```
apps/api/
├── src/
│   ├── main.ts                   Bootstrap: NestJS app, Swagger setup, port, CORS
│   ├── app.module.ts             Root module — imports all domain modules
│   ├── config/
│   │   ├── configuration.ts      Typed config factory (port, DB, JWT, AI, storage)
│   │   └── envValidator.ts       Joi schema for environment variable validation
│   ├── common/                   Framework-level helpers (pipes, decorators)
│   └── modules/
│       ├── identity/
│       │   ├── auth/             Login, JWT strategy, guards, roles
│       │   ├── tenants/          Tenant management
│       │   ├── users/            User management
│       │   └── settings/         Tenant settings (localization, financial, docs)
│       ├── catalog/
│       │   ├── units/            Units of measure
│       │   ├── items/            Product/service catalog
│       │   ├── item-categories/  Hierarchical item categories
│       │   ├── brands/           Item brands
│       │   ├── tags/             Tagging system
│       │   ├── tag-assignments/  Tag-to-entity assignments
│       │   ├── item-relations/   Item relationships (variants, bundles)
│       │   ├── catalog-entities/ Extensible catalog entity tree
│       │   └── item-catalog-entities/ Item-to-catalog-entity links
│       ├── inventory/
│       │   ├── warehouses/       Warehouse management
│       │   ├── stock-ledger/     Stock movement ledger
│       │   └── stock-counts/     Physical stock counts
│       ├── invoicing/
│       │   ├── invoice-types/    Invoice type configuration (sales/purchase)
│       │   ├── invoices/         Invoice CRUD + posting + cancellation
│       │   ├── payments/         Payment receipts/disbursements
│       │   ├── cashboxes/        Cash register management
│       │   └── expenses/         Expense vouchers
│       ├── accounting/
│       │   ├── accounts/         Chart of accounts
│       │   ├── currencies/       Multi-currency management
│       │   ├── fiscal-periods/   Fiscal period management
│       │   └── document-sequences/ Auto-numbering sequences
│       ├── parties/              Customers and suppliers (unified Party model)
│       ├── reports/              Dashboard metrics, stock/sales/purchase reports
│       ├── ai-chat/              Gemini AI chat sessions and messages
│       ├── audit/                Append-only audit log
│       ├── files/                File upload (local/S3), metadata storage
│       ├── custom-fields/        Per-tenant extensible fields
│       └── tenants/              (separate from identity/tenants — tenancy context)
├── test/                         E2E tests
├── .env.development              Development environment variables
├── .env.production               Production environment variables
├── nest-cli.json                 NestJS CLI configuration
├── tsconfig.json
└── package.json
```

### Module File Layout Pattern

Each resource module (`apps/api/src/modules/<domain>/<resource>/`) follows:

```
<resource>/
├── controllers/
│   └── <resource>s.controller.ts   createCrudController() extension
├── services/
│   └── <resource>s.service.ts      CrudService extension with business hooks
├── repositories/
│   └── <resource>s.repository.ts   CrudRepository extension (Prisma delegate)
├── presenters/
│   └── <resource>.presenter.ts     CrudPresenter extension (entity → DTO)
├── dto/
│   ├── <resource>.dto.ts           Create / Update / Response DTOs
│   └── index.ts
├── events/
│   └── <resource>.events.ts        ResourceCreatedEvent etc. subclasses
└── <resource>s.module.ts           NestJS @Module()
```

---

## `apps/dashboard` Structure

```
apps/dashboard/
├── app/
│   ├── layout.tsx                  Root layout (fonts, providers)
│   ├── globals.css                 Tailwind v4 imports, CSS custom properties, themes
│   └── [locale]/
│       ├── layout.tsx              Locale layout (next-intl provider)
│       ├── (auth)/                 Unauthenticated routes
│       │   └── login/page.tsx      Login page
│       ├── (authenticated)/        Protected routes (JWT required)
│       │   ├── layout.tsx          Sidebar + header shell
│       │   ├── @breadcrumbs/       Parallel route for breadcrumb slot
│       │   ├── page.tsx            Dashboard home
│       │   ├── catalog/            /catalog/* routes
│       │   ├── inventory/          /inventory/* routes
│       │   ├── sales/              /sales/* routes
│       │   ├── purchases/          /purchases/* routes
│       │   ├── parties/            /parties/* routes
│       │   ├── finance/            /finance/* routes
│       │   └── settings/           /settings/* routes
│       └── landing/                Public landing page
├── modules/                        Feature modules (page logic, forms, columns)
│   ├── units/                      Unit of measure CRUD
│   ├── categories/                 Item categories CRUD
│   ├── items/                      Item catalog CRUD
│   ├── brands/                     Brands CRUD
│   ├── tags/                       Tags CRUD
│   ├── catalog-entities/           Catalog entity tree CRUD
│   ├── custom-fields/              Custom fields management
│   ├── warehouses/                 Warehouse CRUD
│   ├── stock-balances/             Stock balance view
│   ├── stock-movements/            Stock movement ledger
│   ├── stock-counts/               Physical stock counts
│   ├── invoices/                   Invoice list + form
│   ├── parties/                    Party (customer/supplier) CRUD
│   ├── customers/                  Customer-filtered view
│   ├── suppliers/                  Supplier-filtered view
│   ├── accounts/                   Chart of accounts CRUD
│   ├── currencies/                 Currency CRUD
│   ├── fiscal-periods/             Fiscal periods CRUD
│   ├── document-sequences/         Document sequence CRUD
│   ├── roles/                      Role management CRUD
│   ├── users/                      User management CRUD
│   ├── settings/                   Settings pages (company, localization, etc.)
│   ├── home/                       Dashboard metrics
│   └── auth/                       Login flow
├── shared/
│   ├── data-view/
│   │   ├── resource/               generateResource, ResourceProvider, compound components
│   │   │   ├── generate-resource.tsx
│   │   │   ├── resource-context.tsx
│   │   │   ├── resource-page.tsx
│   │   │   ├── resource-list-page.tsx
│   │   │   ├── resource-table.tsx
│   │   │   ├── resource-form-dialog.tsx
│   │   │   ├── resource-search.tsx
│   │   │   ├── resource-filter.tsx
│   │   │   ├── resource-toolbar.tsx
│   │   │   ├── resource-grid.tsx
│   │   │   ├── resource-pagination.tsx
│   │   │   └── types.ts
│   │   ├── table-view/             DataTable, ColumnHeader, BooleanCell, pagination
│   │   └── filter/                 Filter panel components
│   ├── components/                 Shared UI primitives, IconTooltip, form fields
│   ├── hooks/                      useFormMutation, useResourceForm, etc.
│   ├── stores/                     Zustand stores (auth-store)
│   ├── lib/                        Utility functions
│   ├── useApi.ts                   Re-export of useApi from api-client/react
│   └── api.ts                      getAuthApi() for server-side usage
├── infrastructure/
│   ├── components/                 Layout shell, sidebar, header
│   └── types/                      Navigation types
├── config/
│   └── navGroups.tsx               Sidebar navigation tree (all routes)
├── i18n/                           Next-intl config
├── middleware.ts                   next-intl middleware (locale routing)
├── next.config.mjs                 Next.js config
├── tailwind.config                 (via @theme in globals.css — Tailwind v4)
└── package.json
```

---

## `packages/*` Purpose

| Package | Key Files | Purpose |
|---------|-----------|---------|
| `db-prisma` | `src/schema/*.prisma`, `src/seed/`, `generated/client/` | Schema, migrations, generated Prisma client |
| `api-contracts` | `src/resources/index.ts`, `src/dto/`, `src/types/` | Resource definitions + DTOs (source of truth) |
| `api-client` | `src/api.ts`, `src/clients/`, `src/infra/` | Typed HTTP clients + `createApi()` factory |
| `backend-core` | `src/base/`, `src/api/`, `src/decorators/` | CRUD infrastructure for NestJS modules |
| `i18n` | `src/ar/`, `src/en/`, `src/tr/` | Shared translation JSON files |
| `ui` | (components) | Shared UI component library |
| `eslint-config` | config files | Shared ESLint rules |
| `typescript-config` | `tsconfig*.json` | Shared TS base configurations |
| `utils` | utilities | Shared utility functions |

---

## Important Files

| File | Purpose |
|------|---------|
| `apps/api/src/main.ts` | API bootstrap, Swagger, CORS, port |
| `apps/api/src/app.module.ts` | Root NestJS module, global providers |
| `apps/api/src/config/envValidator.ts` | Required env variables |
| `packages/api-contracts/src/resources/index.ts` | All resource definitions + `resources` map |
| `packages/api-client/src/api.ts` | `createApi()` factory — all clients registered here |
| `apps/dashboard/config/navGroups.tsx` | Sidebar navigation tree |
| `apps/dashboard/app/globals.css` | CSS custom properties, Tailwind theme, Tajawal font |
| `apps/dashboard/middleware.ts` | next-intl locale routing |
| `apps/dashboard/shared/data-view/resource/generate-resource.tsx` | Compound component factory |
| `packages/db-prisma/src/schema/schema.prisma` | Prisma datasource + generator config |
| `turbo.json` | Turborepo task graph and caching configuration |
| `pnpm-workspace.yaml` | pnpm workspace package glob definitions |
