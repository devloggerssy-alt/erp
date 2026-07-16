/*
  Warnings:

  - You are about to drop the column `current_balance` on the `chart_of_accounts` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "chart_of_accounts" DROP COLUMN "current_balance",
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "is_contra" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_postable" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "chart_of_accounts_parent_id_idx" ON "chart_of_accounts"("parent_id");
