# Runtime And Deployment

## Purpose

This document is the canonical runtime and deployment reference for the E-Dukan monorepo. It folds the previous Docker setup guide into the main architecture set so deployment assumptions are documented alongside the code structure they depend on.

This document describes the current implementation first. Where the repository contains deployment-related intent that is not fully reflected in the active Dockerfiles, that gap is called out explicitly.

## Deployable Applications

The primary deployable applications are:

- `apps/api`
- `apps/storefront`
- `apps/store-dashboard`

These applications rely on shared workspace packages such as:

- `@e-dukan/db`
- `@e-dukan/contracts`
- `@e-dukan/api-client`
- `@e-dukan/shared`

## Container Strategy

The repository uses a monorepo-aware container build model.

### Build Context

Docker builds should use the monorepo root as the build context.

That is required because application images depend on workspace packages and generated artifacts outside the individual app directories.

### Dockerfile Locations

- `apps/api/Dockerfile`
- `apps/storefront/Dockerfile`
- `apps/store-dashboard/Dockerfile`

These Dockerfiles should be invoked from the monorepo root context rather than from the individual app directory context.

### Current Build Model

The current Dockerfiles are single-image builds that perform dependency installation and application build work in the same image rather than using a strict multi-stage runtime-minimized layout.

The effective current sequence is:

1. install system packages on `node:20-slim`
2. install global `turbo` and `pnpm`
3. copy the monorepo
4. force `node-linker=hoisted`
5. install workspace dependencies
6. generate Prisma client
7. build the target app with Turbo
8. start the target app in the same image

This is simpler to reason about, but it is not the smaller multi-stage production image model described in some earlier deployment notes.

## Dependency Build Order

Container builds must respect workspace dependency order. The important sequence is:

1. `@e-dukan/db`
2. `@e-dukan/contracts`
3. `@e-dukan/api-client` and other shared packages
4. application builds

This matters because Prisma client generation and shared package compilation must complete before dependent apps are built.

The current Dockerfiles accomplish this through root-level workspace install plus Turbo filtering, not through independently built package images.

## Application-Specific Runtime Notes

### API

Current deployment characteristics from `apps/api/Dockerfile`:

- based on `node:20-slim`
- generates Prisma client during the image build
- runs `pnpm turbo run build --filter=api...`
- exposes port `4040`
- starts with `node apps/api/dist/main`
- declares `/app/uploads` as a Docker volume

The older Docker guide described a multi-stage production model with startup migration execution. The current canonical guidance should treat the Dockerfile as authoritative and the older approach as intended deployment guidance rather than active behavior.

### Important Current-State Note About Migrations

The repository contains `apps/api/start.sh`, which generates Prisma client and runs `db:migrate:deploy` before starting `dist/main.js`.

However, the current API Dockerfile does not invoke `start.sh`.

That means the active container path documented by the Dockerfile is:

- Prisma client generation during build
- direct process start with `node apps/api/dist/main`

It does not currently guarantee runtime migration execution on container startup.

If runtime migrations are required in production, either:

- the Dockerfile must be updated to use `start.sh`, or
- migrations must run in a separate deployment step before the API container becomes live

### Storefront

Current deployment characteristics from `apps/storefront/Dockerfile`:

- based on `node:20-slim`
- generates Prisma client during build
- accepts `NEXT_PUBLIC_API_URL` as a build argument and environment variable
- runs `pnpm turbo run build --filter=storefront...`
- exposes port `3006`
- sets `HOSTNAME=0.0.0.0`
- starts with `pnpm --filter storefront start`

Earlier runtime notes described a slimmer standalone-oriented production model. The current Dockerfile remains the canonical source for actual deployed behavior.

### Store Dashboard

Current deployment characteristics from `apps/store-dashboard/Dockerfile`:

- based on `node:20-slim`
- generates Prisma client during build
- accepts `NEXT_PUBLIC_API_URL` as a build argument and environment variable
- runs `pnpm turbo run build --filter=store-dashboard...`
- exposes port `3005`
- sets `HOSTNAME=0.0.0.0`
- starts with `pnpm --filter store-dashboard start`

As with the storefront image, earlier notes described a more aggressively minimized runtime image. That should be treated as an optimization direction, not as the currently documented implementation.

## Environment Variables

### API

Common required variables:

- `DATABASE_URL`
- `PORT`

Common optional or environment-specific variables include:

- `NODE_ENV`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- any other configuration consumed by Nest config and environment validation

### Storefront

The storefront requires at least:

- `NEXT_PUBLIC_API_URL`

Because this value is used during the Next.js build, it should be treated as both a build-time and runtime deployment concern.

### Store Dashboard

The dashboard commonly requires:

- `NEXT_PUBLIC_API_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`

As with the storefront, `NEXT_PUBLIC_API_URL` should be treated as a build-time value in the current container strategy.

## Ports And Routing

The current runtime ports reflected by the Dockerfiles are:

- API on `4040`
- store-dashboard on `3005`
- storefront on `3006`

Operational routing should expose these through the relevant domains or subdomains instead of treating them as fixed local-only ports.

## Coolify Notes

When deploying through Coolify or a similar environment:

- use the monorepo root as the build context
- point each service to its app-specific Dockerfile path
- configure per-app environment variables explicitly
- ensure port and domain mappings are consistent with the app role
- supply build arguments for frontend images when public API URLs are needed at build time

Typical per-service setup is:

1. build context set to `./`
2. Dockerfile path set to the target app Dockerfile
3. domain or subdomain routed to the correct exposed port

## Storage And Uploads

The API Dockerfile creates and mounts `/app/uploads` as a volume.

This is relevant only if uploads remain on local container-backed storage. If the application is configured to use object storage such as S3, local volume persistence becomes less critical for file durability.

## Operational Risks And Checks

The most important deployment-time checks are:

- confirm workspace dependency builds succeed in container context
- confirm Prisma generation succeeds during the build
- confirm runtime database connectivity
- confirm the migration strategy is explicit, because the current API Dockerfile does not run `start.sh`
- confirm frontend apps can reach the API base URL used in their build and runtime environment
- confirm upload persistence assumptions match the actual storage provider in use

## Local Validation Commands

Use root-context builds when validating locally:

- API image from `apps/api/Dockerfile`
- storefront image from `apps/storefront/Dockerfile`
- dashboard image from `apps/store-dashboard/Dockerfile`

Example pattern:

```bash
docker build -f apps/api/Dockerfile -t e-dukan-api .
docker build -f apps/storefront/Dockerfile -t e-dukan-storefront .
docker build -f apps/store-dashboard/Dockerfile -t e-dukan-dashboard .
```

These are good checks before first deployment or when Dockerfiles change materially.

## Troubleshooting

### Build Failures

Common causes include:

- outdated lockfile or dependency resolution issues
- Prisma generation failures during image build
- package build-order issues in monorepo container context
- TypeScript or application build errors that surface only inside Docker

### Runtime Issues

Common causes include:

- invalid or missing `DATABASE_URL`
- migration failures or migration steps never being invoked
- incorrect frontend API URL at build time or runtime
- static asset or standalone runtime copy mismatches for frontend apps

## Security And Deployment Hygiene

The older Docker guide highlighted a few baseline practices that remain useful even where the active Dockerfiles differ:

- prefer non-root runtime users where practical
- keep runtime images minimal when build strategy allows it
- manage secrets through the deployment platform instead of source control
- verify uploads persistence explicitly instead of relying on ephemeral container storage by accident

## Deployment Checklist

- [ ] Use the monorepo root as Docker build context
- [ ] Point each deployment target at the correct app Dockerfile
- [ ] Provide required environment variables and build arguments
- [ ] Verify exposed ports match the reverse-proxy or platform routing configuration
- [ ] Decide where migrations run before production rollout
- [ ] Verify uploads persistence or object-storage configuration
- [ ] Validate API and frontend connectivity after deployment