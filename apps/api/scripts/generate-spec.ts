/**
 * CI / manual equivalent of the watch-mode generation in main.ts.
 * Bootstraps NestJS without starting the HTTP server.
 *
 * Must run against the Nest-compiled output (`dist/`) so the `@nestjs/swagger`
 * decorator plugin is applied identically to watch mode. The `generate:spec`
 * script builds the API (and its workspace dependencies) before invoking this.
 *
 * Usage (from repo root): pnpm generate
 * Usage (from apps/api):  pnpm generate:spec
 */
// Must be set before the app module is required so PrismaService skips $connect()
// and PermissionSyncService skips its DB writes.
process.env.GENERATE_SPEC = 'true';

// Bootstrapping the app runs ConfigModule's Joi validation, which requires
// DATABASE_URL and JWT_ACCESS_SECRET. Generation never touches the database, and
// a fresh clone / CI checkout has no gitignored `.env.<NODE_ENV>`, so supply
// throwaway values unless the environment already provides them.
process.env.DATABASE_URL ??= 'postgresql://generate-spec:generate-spec@localhost:5432/generate-spec';
process.env.JWT_ACCESS_SECRET ??= 'generate-spec-secret';

import { NestFactory } from '@nestjs/core';

async function run() {
  // Required lazily so a failure while loading the app (e.g. ConfigModule's env
  // validation) rejects this function and is reported by the catch handler below.
  /* eslint-disable @typescript-eslint/no-var-requires */
  const { AppModule } = require('../dist/src/app.module');
  const { buildContractDocument, writeContractArtifacts } = require('../dist/src/contracts/contract-generation');
  /* eslint-enable @typescript-eslint/no-var-requires */

  // `abortOnError: false` is required for observability: with the default (`true`)
  // Nest handles bootstrap errors itself — logging them through the Nest logger,
  // which `logger: false` disables — and then calls process.exit(1). The failure
  // is then silent and this script's catch handler never runs (which is exactly
  // how the CI freshness step failed invisibly). Letting Nest rethrow fixes that.
  const app = await NestFactory.create(AppModule, { logger: false, abortOnError: false });

  const document = buildContractDocument(app);
  await app.close();

  writeContractArtifacts(document);
  console.log('✅  Contract artifacts written (openapi.yaml + api-contracts types)');
}

run().catch((err) => {
  console.error(err);
  // Report the failure and let Node exit on its own so stdout/stderr are flushed;
  // process.exit() here can truncate output when stderr is a pipe (Linux/CI).
  process.exitCode = 1;
});
