-- CreateEnum
CREATE TYPE "OcrProcessingStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'EXTRACTED', 'REVIEW_REQUIRED', 'FAILED');

-- CreateEnum
CREATE TYPE "OcrDraftStatus" AS ENUM ('DRAFT', 'REVIEW_REQUIRED', 'VALIDATED', 'GENERATED');

-- CreateTable
CREATE TABLE "OcrDocumentUpload" (
    "id" SERIAL NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "storedFileName" TEXT NOT NULL DEFAULT 'PENDING',
    "storagePath" TEXT NOT NULL DEFAULT 'PENDING',
    "fileUrl" TEXT NOT NULL DEFAULT 'PENDING',
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "status" "OcrProcessingStatus" NOT NULL DEFAULT 'UPLOADED',
    "ocrProvider" TEXT NOT NULL DEFAULT 'MOCK',
    "rawOcrResult" JSONB,
    "errorMessage" TEXT,
    "eesDocumentId" INTEGER,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OcrDocumentUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OcrAnalysisDraft" (
    "id" SERIAL NOT NULL,
    "uploadId" INTEGER NOT NULL,
    "status" "OcrDraftStatus" NOT NULL DEFAULT 'DRAFT',
    "extractedPayload" JSONB NOT NULL,
    "validatedPayload" JSONB,
    "generatedEesDocumentId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OcrAnalysisDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OcrDocumentUpload_status_idx" ON "OcrDocumentUpload"("status");

-- CreateIndex
CREATE INDEX "OcrDocumentUpload_checksum_idx" ON "OcrDocumentUpload"("checksum");

-- CreateIndex
CREATE INDEX "OcrDocumentUpload_storedFileName_idx" ON "OcrDocumentUpload"("storedFileName");

-- CreateIndex
CREATE INDEX "OcrDocumentUpload_eesDocumentId_idx" ON "OcrDocumentUpload"("eesDocumentId");

-- CreateIndex
CREATE INDEX "OcrDocumentUpload_createdById_idx" ON "OcrDocumentUpload"("createdById");

-- CreateIndex
CREATE INDEX "OcrAnalysisDraft_uploadId_idx" ON "OcrAnalysisDraft"("uploadId");

-- CreateIndex
CREATE INDEX "OcrAnalysisDraft_status_idx" ON "OcrAnalysisDraft"("status");

-- CreateIndex
CREATE INDEX "OcrAnalysisDraft_generatedEesDocumentId_idx" ON "OcrAnalysisDraft"("generatedEesDocumentId");

-- AddForeignKey
ALTER TABLE "OcrDocumentUpload" ADD CONSTRAINT "OcrDocumentUpload_eesDocumentId_fkey" FOREIGN KEY ("eesDocumentId") REFERENCES "EesDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OcrDocumentUpload" ADD CONSTRAINT "OcrDocumentUpload_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OcrAnalysisDraft" ADD CONSTRAINT "OcrAnalysisDraft_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "OcrDocumentUpload"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OcrAnalysisDraft" ADD CONSTRAINT "OcrAnalysisDraft_generatedEesDocumentId_fkey" FOREIGN KEY ("generatedEesDocumentId") REFERENCES "EesDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
