# @devloggers/db-prisma

Database package containing Prisma schema and generated client for the e-dukan application.

## Usage

```typescript
import { prisma } from "@devloggers/db-prisma";
import type { User, Store } from "@devloggers/db-prisma";

// Use the Prisma client
const users = await prisma.user.findMany();

// Import types
const user: User = {
  /* ... */
};
```

## Scripts

- `pnpm db:generate` - Generate Prisma client
- `pnpm db:migrate:dev` - Run database migrations in development
- `pnpm db:migrate:deploy` - Deploy migrations to production
- `pnpm db:studio` - Open Prisma Studio
- `pnpm db:seed` - Run database seeding
- `pnpm db:reset` - Reset database and run migrations
- `pnpm db:push` - Push schema changes to database

## Environment Variables

Make sure to set the `DATABASE_URL` environment variable:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/e-dukan"
```
