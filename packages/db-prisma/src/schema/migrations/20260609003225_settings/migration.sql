-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "base_currency_id" TEXT,
ADD COLUMN     "default_sales_sequence_id" TEXT,
ADD COLUMN     "legal_name" TEXT,
ADD COLUMN     "tax_number" TEXT,
ADD COLUMN     "website" TEXT;

-- CreateTable
CREATE TABLE "tenant_settings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tenant_settings_tenant_id_category_idx" ON "tenant_settings"("tenant_id", "category");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_settings_tenant_id_key_key" ON "tenant_settings"("tenant_id", "key");

-- AddForeignKey
ALTER TABLE "tenant_settings" ADD CONSTRAINT "tenant_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_base_currency_id_fkey" FOREIGN KEY ("base_currency_id") REFERENCES "currencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_default_sales_sequence_id_fkey" FOREIGN KEY ("default_sales_sequence_id") REFERENCES "document_sequences"("id") ON DELETE SET NULL ON UPDATE CASCADE;
