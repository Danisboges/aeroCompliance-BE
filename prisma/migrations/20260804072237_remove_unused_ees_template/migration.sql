/*
  Warnings:

  - You are about to drop the column `eesTemplate` on the `EesDocument` table. All the data in the column will be lost.
  - You are about to drop the column `selectedEesTemplate` on the `ServiceBulletin` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "EesDocument" DROP COLUMN "eesTemplate";

-- AlterTable
ALTER TABLE "ServiceBulletin" DROP COLUMN "selectedEesTemplate";

-- DropEnum
DROP TYPE "EesTemplate";
