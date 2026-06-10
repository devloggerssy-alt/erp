-- Reclassify any legacy EXPENSE payments before removing the enum value,
-- otherwise the enum recreation below would fail on rows still using it.
-- (Expenses are now tracked by the dedicated `expenses` table.)
UPDATE "payments" SET "type" = 'ADJUSTMENT' WHERE "type" = 'EXPENSE';

-- AlterEnum: drop EXPENSE from PaymentType (Postgres requires recreating the type)
BEGIN;
CREATE TYPE "PaymentType_new" AS ENUM ('RECEIPT', 'PAYMENT', 'ADJUSTMENT');
ALTER TABLE "payments" ALTER COLUMN "type" TYPE "PaymentType_new" USING ("type"::text::"PaymentType_new");
ALTER TYPE "PaymentType" RENAME TO "PaymentType_old";
ALTER TYPE "PaymentType_new" RENAME TO "PaymentType";
DROP TYPE "PaymentType_old";
COMMIT;
