#!/bin/sh

echo "Generating Prisma Client..."
pnpm --filter @e-dukan/db db:generate

echo "Running Prisma migrations (production mode)..."
pnpm --filter @e-dukan/db db:migrate:deploy || {
    echo "Migration failed, continuing anyway..."
}

echo "Starting API..."
node dist/main.js
