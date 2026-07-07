/*
  Warnings:

  - You are about to drop the column `compliedAt` on the `ComplianceTask` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `ComplianceTask` table. All the data in the column will be lost.
  - You are about to drop the column `documentId` on the `ComplianceTask` table. All the data in the column will be lost.
  - You are about to drop the column `isRepetitive` on the `ComplianceTask` table. All the data in the column will be lost.
  - You are about to drop the column `priority` on the `ComplianceTask` table. All the data in the column will be lost.
  - You are about to drop the column `reference` on the `ComplianceTask` table. All the data in the column will be lost.
  - You are about to drop the column `remarks` on the `ComplianceTask` table. All the data in the column will be lost.
  - You are about to drop the column `taskType` on the `ComplianceTask` table. All the data in the column will be lost.
  - You are about to drop the column `bulletinNumber` on the `EesDocument` table. All the data in the column will be lost.
  - You are about to drop the column `documentId` on the `EesDocument` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `EesDocument` table. All the data in the column will be lost.
  - You are about to drop the column `adRelated` on the `EesEvaluationItem` table. All the data in the column will be lost.
  - You are about to drop the column `affectedEsn` on the `EesEvaluationItem` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `EesEvaluationItem` table. All the data in the column will be lost.
  - You are about to drop the column `dueAt` on the `EesEvaluationItem` table. All the data in the column will be lost.
  - You are about to drop the column `isRepetitive` on the `EesEvaluationItem` table. All the data in the column will be lost.
  - You are about to drop the column `isWarranty` on the `EesEvaluationItem` table. All the data in the column will be lost.
  - You are about to drop the column `paragraph` on the `EesEvaluationItem` table. All the data in the column will be lost.
  - You are about to drop the column `reference` on the `EesEvaluationItem` table. All the data in the column will be lost.
  - You are about to drop the column `remarks` on the `EesEvaluationItem` table. All the data in the column will be lost.
  - You are about to drop the column `taskType` on the `EesEvaluationItem` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `EesEvaluationItem` table. All the data in the column will be lost.
  - You are about to drop the column `checksum` on the `OcrDocumentUpload` table. All the data in the column will be lost.
  - You are about to drop the column `eesDocumentId` on the `OcrDocumentUpload` table. All the data in the column will be lost.
  - You are about to drop the column `errorMessage` on the `OcrDocumentUpload` table. All the data in the column will be lost.
  - You are about to drop the column `fileSize` on the `OcrDocumentUpload` table. All the data in the column will be lost.
  - You are about to drop the column `fileUrl` on the `OcrDocumentUpload` table. All the data in the column will be lost.
  - You are about to drop the column `mimeType` on the `OcrDocumentUpload` table. All the data in the column will be lost.
  - You are about to drop the column `ocrProvider` on the `OcrDocumentUpload` table. All the data in the column will be lost.
  - You are about to drop the column `rawOcrResult` on the `OcrDocumentUpload` table. All the data in the column will be lost.
  - You are about to drop the column `storagePath` on the `OcrDocumentUpload` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `OcrDocumentUpload` table. All the data in the column will be lost.
  - You are about to drop the `AirworthinessDocument` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OcrAnalysisDraft` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[sourceSbId]` on the table `EesDocument` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `sourceSbId` to the `EesDocument` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "AirworthinessDocument" DROP CONSTRAINT "AirworthinessDocument_createdById_fkey";

-- DropForeignKey
ALTER TABLE "AirworthinessDocument" DROP CONSTRAINT "AirworthinessDocument_supersedesId_fkey";

-- DropForeignKey
ALTER TABLE "ComplianceTask" DROP CONSTRAINT "ComplianceTask_documentId_fkey";

-- DropForeignKey
ALTER TABLE "EesDocument" DROP CONSTRAINT "EesDocument_documentId_fkey";

-- DropForeignKey
ALTER TABLE "OcrAnalysisDraft" DROP CONSTRAINT "OcrAnalysisDraft_generatedEesDocumentId_fkey";

-- DropForeignKey
ALTER TABLE "OcrAnalysisDraft" DROP CONSTRAINT "OcrAnalysisDraft_uploadId_fkey";

-- DropForeignKey
ALTER TABLE "OcrDocumentUpload" DROP CONSTRAINT "OcrDocumentUpload_eesDocumentId_fkey";

-- DropIndex
DROP INDEX "Aircraft_active_idx";

-- DropIndex
DROP INDEX "Aircraft_aircraftType_idx";

-- DropIndex
DROP INDEX "ComplianceTask_aircraftId_idx";

-- DropIndex
DROP INDEX "ComplianceTask_documentId_idx";

-- DropIndex
DROP INDEX "ComplianceTask_dueDate_idx";

-- DropIndex
DROP INDEX "ComplianceTask_engineId_idx";

-- DropIndex
DROP INDEX "ComplianceTask_priority_idx";

-- DropIndex
DROP INDEX "ComplianceTask_status_idx";

-- DropIndex
DROP INDEX "EesDocument_bulletinNumber_idx";

-- DropIndex
DROP INDEX "EesEvaluationItem_eesDocumentId_idx";

-- DropIndex
DROP INDEX "EesEvaluationItem_isApplicable_idx";

-- DropIndex
DROP INDEX "Engine_active_idx";

-- DropIndex
DROP INDEX "Engine_aircraftId_idx";

-- DropIndex
DROP INDEX "Engine_model_idx";

-- DropIndex
DROP INDEX "OcrDocumentUpload_checksum_idx";

-- DropIndex
DROP INDEX "OcrDocumentUpload_createdById_idx";

-- DropIndex
DROP INDEX "OcrDocumentUpload_eesDocumentId_idx";

-- DropIndex
DROP INDEX "OcrDocumentUpload_status_idx";

-- DropIndex
DROP INDEX "OcrDocumentUpload_storedFileName_idx";

-- AlterTable
ALTER TABLE "ComplianceTask" DROP COLUMN "compliedAt",
DROP COLUMN "description",
DROP COLUMN "documentId",
DROP COLUMN "isRepetitive",
DROP COLUMN "priority",
DROP COLUMN "reference",
DROP COLUMN "remarks",
DROP COLUMN "taskType",
ADD COLUMN     "adId" INTEGER,
ADD COLUMN     "eesId" INTEGER,
ADD COLUMN     "sbId" INTEGER;

-- AlterTable
ALTER TABLE "EesDocument" DROP COLUMN "bulletinNumber",
DROP COLUMN "documentId",
DROP COLUMN "updatedAt",
ADD COLUMN     "sourceSbId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "EesEvaluationItem" DROP COLUMN "adRelated",
DROP COLUMN "affectedEsn",
DROP COLUMN "createdAt",
DROP COLUMN "dueAt",
DROP COLUMN "isRepetitive",
DROP COLUMN "isWarranty",
DROP COLUMN "paragraph",
DROP COLUMN "reference",
DROP COLUMN "remarks",
DROP COLUMN "taskType",
DROP COLUMN "updatedAt",
ALTER COLUMN "isApplicable" SET DEFAULT true;

-- AlterTable
ALTER TABLE "OcrDocumentUpload" DROP COLUMN "checksum",
DROP COLUMN "eesDocumentId",
DROP COLUMN "errorMessage",
DROP COLUMN "fileSize",
DROP COLUMN "fileUrl",
DROP COLUMN "mimeType",
DROP COLUMN "ocrProvider",
DROP COLUMN "rawOcrResult",
DROP COLUMN "storagePath",
DROP COLUMN "updatedAt",
ALTER COLUMN "storedFileName" DROP DEFAULT;

-- DropTable
DROP TABLE "AirworthinessDocument";

-- DropTable
DROP TABLE "OcrAnalysisDraft";

-- DropEnum
DROP TYPE "DocumentType";

-- CreateTable
CREATE TABLE "AirworthinessDirective" (
    "id" SERIAL NOT NULL,
    "adNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "status" "DocumentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AirworthinessDirective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceBulletin" (
    "id" SERIAL NOT NULL,
    "sbNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceBulletin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OcrAnalysisResult" (
    "id" SERIAL NOT NULL,
    "sbId" INTEGER NOT NULL,
    "uploadId" INTEGER NOT NULL,
    "rawPayload" JSONB NOT NULL,
    "status" "OcrDraftStatus" NOT NULL DEFAULT 'DRAFT',
    "extractedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OcrAnalysisResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AirworthinessDirective_adNumber_key" ON "AirworthinessDirective"("adNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceBulletin_sbNumber_key" ON "ServiceBulletin"("sbNumber");

-- CreateIndex
CREATE UNIQUE INDEX "OcrAnalysisResult_sbId_key" ON "OcrAnalysisResult"("sbId");

-- CreateIndex
CREATE UNIQUE INDEX "OcrAnalysisResult_uploadId_key" ON "OcrAnalysisResult"("uploadId");

-- CreateIndex
CREATE UNIQUE INDEX "EesDocument_sourceSbId_key" ON "EesDocument"("sourceSbId");

-- AddForeignKey
ALTER TABLE "EesDocument" ADD CONSTRAINT "EesDocument_sourceSbId_fkey" FOREIGN KEY ("sourceSbId") REFERENCES "ServiceBulletin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OcrAnalysisResult" ADD CONSTRAINT "OcrAnalysisResult_sbId_fkey" FOREIGN KEY ("sbId") REFERENCES "ServiceBulletin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OcrAnalysisResult" ADD CONSTRAINT "OcrAnalysisResult_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "OcrDocumentUpload"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceTask" ADD CONSTRAINT "ComplianceTask_adId_fkey" FOREIGN KEY ("adId") REFERENCES "AirworthinessDirective"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceTask" ADD CONSTRAINT "ComplianceTask_sbId_fkey" FOREIGN KEY ("sbId") REFERENCES "ServiceBulletin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceTask" ADD CONSTRAINT "ComplianceTask_eesId_fkey" FOREIGN KEY ("eesId") REFERENCES "EesDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
