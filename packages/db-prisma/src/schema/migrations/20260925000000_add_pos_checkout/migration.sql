-- CreateTable
CREATE TABLE "pos_settings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "default_party_id" TEXT NOT NULL,
    "invoice_type_id" TEXT NOT NULL,
    "cashbox_id" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pos_settings_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN "client_request_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "pos_settings_tenant_id_key" ON "pos_settings"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_tenant_id_client_request_id_key" ON "invoices"("tenant_id", "client_request_id");

-- AddForeignKey
ALTER TABLE "pos_settings" ADD CONSTRAINT "pos_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_settings" ADD CONSTRAINT "pos_settings_default_party_id_fkey" FOREIGN KEY ("default_party_id") REFERENCES "parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_settings" ADD CONSTRAINT "pos_settings_invoice_type_id_fkey" FOREIGN KEY ("invoice_type_id") REFERENCES "invoice_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_settings" ADD CONSTRAINT "pos_settings_cashbox_id_fkey" FOREIGN KEY ("cashbox_id") REFERENCES "cashboxes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_settings" ADD CONSTRAINT "pos_settings_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
