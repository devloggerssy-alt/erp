-- ─────────────────────────────────────────────────────────────────────────────
-- Backfill (Phase 1.1): the tenant's MAIN branch becomes its default branch, so
-- creation forms pre-fill the branch that the migration / onboarding created.
--
-- Existing tenants that already chose a default keep it. Idempotent by
-- construction: a tenant with a `defaultBranchId` row is skipped.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO "tenant_settings" ("id", "tenant_id", "category", "key", "value", "created_at", "updated_at")
SELECT gen_random_uuid()::text,
       b."tenant_id",
       'defaults',
       'defaultBranchId',
       to_jsonb(b."id"),
       now(),
       now()
FROM "branches" b
WHERE b."code" = 'MAIN'
  AND NOT EXISTS (
      SELECT 1
      FROM "tenant_settings" ts
      WHERE ts."tenant_id" = b."tenant_id"
        AND ts."key" = 'defaultBranchId'
  );
