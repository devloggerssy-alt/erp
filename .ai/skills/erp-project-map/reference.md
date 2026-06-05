# ERP Repository Reference

## Root layout
```
erp/
├── apps/
│   ├── api/                 # NestJS (@devloggers/api)
│   ├── dashboard/           # Next.js (@devloggers/dashboard)
│   ├── desktop/
│   ├── docs/
│   └── web/
├── packages/
│   ├── api-contracts/       # @devloggers/api-contracts
│   ├── api-client/          # @devloggers/api-client
│   ├── backend-core/        # @devloggers/backend-core
│   ├── db-prisma/           # @devloggers/db-prisma
│   ├── ui/
│   ├── eslint-config/
│   └── typescript-config/
├── .ai/rules/               # Generic AI rules (canonical)
├── .ai/skills/              # Generic AI skills (canonical)
├── .cursor/rules/           # Cursor rules — mirrors .ai/rules/
├── .cursor/skills/          # Cursor skills — mirrors .ai/skills/
├── reference/               # Product/docs reference material
├── turbo.json
├── pnpm-workspace.yaml
└── AGENTS.md
```

## `apps/api/src/`
```
apps/api/src/
├── app.module.ts
├── config/
├── common/
└── modules/
    ├── identity/       # auth, tenants, users, roles
    ├── catalog/        # units, items, item-categories
    ├── inventory/      # warehouses, stock-ledger, stock-counts
    ├── invoicing/      # invoices, payments, cashboxes, invoice-types
    ├── accounting/     # accounts, currencies, fiscal-periods, document-sequences
    ├── parties/
    ├── reports/
    ├── audit/
    └── ai-chat/
```

Standard feature folder:
```
modules/<domain>/<feature>/
├── controllers/
├── services/
├── repositories/
├── presenters/
├── dto/
├── events/
└── <feature>.module.ts
```

## `apps/dashboard/`
```
apps/dashboard/
├── app/
│   ├── layout.tsx
│   └── [locale]/
│       ├── layout.tsx
│       ├── (auth)/login/page.tsx
│       └── (authenticated)/
│           ├── layout.tsx
│           ├── page.tsx                    # home
│           ├── @breadcrumbs/             # parallel route
│           ├── catalog/
│           │   ├── units/page.tsx
│           │   ├── units/[id]/page.tsx
│           │   ├── categories/page.tsx
│           │   └── items/page.tsx
│           └── cashier/page.tsx
├── modules/            # feature UI (one folder per entity)
├── shared/             # reusable UI + data-view + hooks
├── infrastructure/     # layout, providers
├── config/navGroups.tsx
├── messages/en.json, tr.json
└── i18n/
```

Standard feature module:
```
modules/<feature>/
├── <feature>.resource.ts      # generateResource<Client>
├── <feature>.config.ts        # zod schema, defaults, mappers
├── components/
│   ├── <feature>-page.tsx
│   ├── <feature>-form.tsx
│   └── <feature>-columns.tsx
├── hooks/
└── index.ts
```

## `packages/api-contracts/src/`
```
resources/
├── base/crud-resource.ts
├── unit.resource.ts
├── item-category.resource.ts
└── index.ts          # exports `resources` map
dto/
└── *.dto.ts
```

## `packages/api-client/src/`
```
clients/*.client.ts   # CrudClient subclasses
api.ts                # createApi() factory
infra/crud-client.ts
```

## `packages/db-prisma/src/`
```
schema/
├── schema.prisma     # generator + datasource
├── unit.prisma
├── item.prisma
└── migrations/
seed/index.ts
```

## Dashboard routes: implemented vs planned

| Nav href (from navGroups) | Page exists? |
|---------------------------|--------------|
| `/` | Yes |
| `/cashier` | Yes |
| `/catalog/units` | Yes |
| `/catalog/categories` | Yes |
| `/catalog/items` | Yes (page stub) |
| `/invoices/*`, `/parties/*`, `/inventory/*`, `/finance/*`, `/reports/*`, `/settings/*` | Planned (nav only) |

## Dependency diagram
```
db-prisma
    ↓
backend-core ← api
    ↑
api-contracts
    ↓
api-client ← dashboard
```

## Commands
```bash
pnpm dev                                          # all apps
pnpm --filter @devloggers/dashboard dev
pnpm --filter @devloggers/api dev
pnpm turbo run build
pnpm --filter @devloggers/db-prisma db:migrate:dev
pnpm --filter @devloggers/db-prisma db:seed
```
