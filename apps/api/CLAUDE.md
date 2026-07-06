# NestJS API — Claude context

Load when working under `apps/api/`.

@../../.ai/rules/api.md

@../../.ai/skills/backend-resource-module/SKILL.md

## Golden reference

`apps/api/src/modules/catalog/units/`

## Verify after API changes

```bash
pnpm turbo run build --filter=@devloggers/api
pnpm generate:dev   # if DTOs/Swagger changed — API must be running
```
