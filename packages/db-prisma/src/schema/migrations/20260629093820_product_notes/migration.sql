/*
  Warnings:

  - The values [bundle] on the enum `ItemType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ItemType_new" AS ENUM ('product', 'service');
ALTER TABLE "public"."items" ALTER COLUMN "item_type" DROP DEFAULT;
ALTER TABLE "items" ALTER COLUMN "item_type" TYPE "ItemType_new" USING ("item_type"::text::"ItemType_new");
ALTER TYPE "ItemType" RENAME TO "ItemType_old";
ALTER TYPE "ItemType_new" RENAME TO "ItemType";
DROP TYPE "public"."ItemType_old";
ALTER TABLE "items" ALTER COLUMN "item_type" SET DEFAULT 'product';
COMMIT;

-- AlterTable
ALTER TABLE "items" ADD COLUMN     "description" TEXT,
ADD COLUMN     "note" TEXT;
