-- CreateEnum
CREATE TYPE "SetupTaskType" AS ENUM ('CURRENCIES', 'FISCAL_PERIOD', 'CHART_OF_ACCOUNTS', 'FINANCIAL_MAPPINGS', 'DOCUMENT_SEQUENCES', 'CASHBOXES', 'BANK_ACCOUNTS', 'WAREHOUSES', 'PRODUCTS', 'CUSTOMERS', 'SUPPLIERS', 'OPENING_CASH_BALANCES', 'OPENING_BANK_BALANCES', 'OPENING_RECEIVABLES', 'OPENING_PAYABLES', 'OPENING_INVENTORY', 'RECONCILIATION');

-- CreateEnum
CREATE TYPE "SetupTaskStatus" AS ENUM ('BLOCKED', 'READY', 'COMPLETED', 'SKIPPED');

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "business_setup_completed_at" TIMESTAMP(3),
ADD COLUMN     "business_setup_profile" JSONB,
ADD COLUMN     "operational_readiness" JSONB;

-- CreateTable
CREATE TABLE "setup_tasks" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "type" "SetupTaskType" NOT NULL,
    "status" "SetupTaskStatus" NOT NULL DEFAULT 'BLOCKED',
    "required" BOOLEAN NOT NULL DEFAULT true,
    "dependencies" "SetupTaskType"[],
    "progress" JSONB,
    "metadata" JSONB,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "setup_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "setup_tasks_tenant_id_status_idx" ON "setup_tasks"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "setup_tasks_tenant_id_type_key" ON "setup_tasks"("tenant_id", "type");

-- AddForeignKey
ALTER TABLE "setup_tasks" ADD CONSTRAINT "setup_tasks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
