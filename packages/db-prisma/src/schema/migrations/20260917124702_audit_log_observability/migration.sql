-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "correlation_id" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'HTTP';

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_created_at_idx" ON "audit_logs"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_correlation_id_idx" ON "audit_logs"("correlation_id");

-- Phase 7.2.3 — audit rows are append-only. UPDATE is rejected unconditionally.
-- DELETE is intentionally NOT blocked: Tenant deletion cascades here, and a future
-- retention purge (roadmap Q4) must remain possible. No application path deletes rows.
CREATE OR REPLACE FUNCTION audit_logs_reject_update() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'audit_logs is append-only: UPDATE is not permitted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_no_update
    BEFORE UPDATE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION audit_logs_reject_update();
