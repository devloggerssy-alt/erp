-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "onboarding_completed_at" TIMESTAMP(3),
ADD COLUMN     "onboarding_step" INTEGER NOT NULL DEFAULT 0;
