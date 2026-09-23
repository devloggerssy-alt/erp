-- CreateTable
CREATE TABLE "code_sequences" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "next_value" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "code_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "code_sequences_tenant_id_idx" ON "code_sequences"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "code_sequences_tenant_id_entity_key" ON "code_sequences"("tenant_id", "entity");

-- AddForeignKey
ALTER TABLE "code_sequences" ADD CONSTRAINT "code_sequences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
