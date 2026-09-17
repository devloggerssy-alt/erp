-- CreateTable
CREATE TABLE "reconciliation_runs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "finding_count" INTEGER NOT NULL,
    "findings" JSONB NOT NULL,
    "new_findings" JSONB NOT NULL,
    "report" JSONB NOT NULL,
    "correlation_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reconciliation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reconciliation_runs_tenant_id_created_at_idx" ON "reconciliation_runs"("tenant_id", "created_at");

-- AddForeignKey
ALTER TABLE "reconciliation_runs" ADD CONSTRAINT "reconciliation_runs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
