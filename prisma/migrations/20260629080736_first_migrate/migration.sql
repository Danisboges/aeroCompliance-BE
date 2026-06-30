-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'TECHNICIAN');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('AD', 'SB', 'EES');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUPERSEDED', 'CANCELLED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ComplianceStatus" AS ENUM ('NOT_APPLICABLE', 'OPEN', 'IN_PROGRESS', 'COMPLIED', 'DEFERRED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('INSPECTION', 'MODIFICATION', 'REPLACEMENT', 'REPAIR', 'SOFTWARE_UPDATE', 'RECORD_REVIEW', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'TECHNICIAN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EesDocument" (
    "id" SERIAL NOT NULL,
    "eesNumber" TEXT NOT NULL,
    "bulletinNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "documentId" INTEGER,

    CONSTRAINT "EesDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EesEvaluationItem" (
    "id" SERIAL NOT NULL,
    "eesDocumentId" INTEGER NOT NULL,
    "itemNo" TEXT NOT NULL,
    "paragraph" TEXT NOT NULL,
    "requirementDesc" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "isApplicable" BOOLEAN NOT NULL DEFAULT false,
    "adRelated" TEXT NOT NULL,
    "isWarranty" BOOLEAN NOT NULL DEFAULT false,
    "affectedEsn" TEXT[],
    "isRepetitive" BOOLEAN NOT NULL DEFAULT false,
    "dueAt" TEXT NOT NULL,
    "remarks" TEXT NOT NULL,
    "complianceTaskId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EesEvaluationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AirworthinessDocument" (
    "id" SERIAL NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "issuer" TEXT,
    "revision" TEXT,
    "status" "DocumentStatus" NOT NULL DEFAULT 'ACTIVE',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "issueDate" TIMESTAMP(3),
    "effectiveDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "description" TEXT,
    "sourceUrl" TEXT,
    "supersedesId" INTEGER,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AirworthinessDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Aircraft" (
    "id" SERIAL NOT NULL,
    "registration" TEXT NOT NULL,
    "msn" TEXT,
    "aircraftType" TEXT NOT NULL,
    "operator" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Aircraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Engine" (
    "id" SERIAL NOT NULL,
    "esn" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "position" TEXT,
    "aircraftId" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Engine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceTask" (
    "id" SERIAL NOT NULL,
    "documentId" INTEGER NOT NULL,
    "aircraftId" INTEGER,
    "engineId" INTEGER,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "taskType" "TaskType" NOT NULL DEFAULT 'OTHER',
    "status" "ComplianceStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "isRepetitive" BOOLEAN NOT NULL DEFAULT false,
    "dueDate" TIMESTAMP(3),
    "compliedAt" TIMESTAMP(3),
    "reference" TEXT,
    "remarks" TEXT,
    "assignedToId" INTEGER,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "EesDocument_eesNumber_key" ON "EesDocument"("eesNumber");

-- CreateIndex
CREATE INDEX "EesDocument_bulletinNumber_idx" ON "EesDocument"("bulletinNumber");

-- CreateIndex
CREATE INDEX "EesEvaluationItem_eesDocumentId_idx" ON "EesEvaluationItem"("eesDocumentId");

-- CreateIndex
CREATE INDEX "EesEvaluationItem_isApplicable_idx" ON "EesEvaluationItem"("isApplicable");

-- CreateIndex
CREATE INDEX "AirworthinessDocument_documentType_status_idx" ON "AirworthinessDocument"("documentType", "status");

-- CreateIndex
CREATE INDEX "AirworthinessDocument_priority_idx" ON "AirworthinessDocument"("priority");

-- CreateIndex
CREATE INDEX "AirworthinessDocument_dueDate_idx" ON "AirworthinessDocument"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "AirworthinessDocument_documentType_documentNumber_revision_key" ON "AirworthinessDocument"("documentType", "documentNumber", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "Aircraft_registration_key" ON "Aircraft"("registration");

-- CreateIndex
CREATE UNIQUE INDEX "Aircraft_msn_key" ON "Aircraft"("msn");

-- CreateIndex
CREATE INDEX "Aircraft_aircraftType_idx" ON "Aircraft"("aircraftType");

-- CreateIndex
CREATE INDEX "Aircraft_active_idx" ON "Aircraft"("active");

-- CreateIndex
CREATE UNIQUE INDEX "Engine_esn_key" ON "Engine"("esn");

-- CreateIndex
CREATE INDEX "Engine_model_idx" ON "Engine"("model");

-- CreateIndex
CREATE INDEX "Engine_aircraftId_idx" ON "Engine"("aircraftId");

-- CreateIndex
CREATE INDEX "Engine_active_idx" ON "Engine"("active");

-- CreateIndex
CREATE INDEX "ComplianceTask_documentId_idx" ON "ComplianceTask"("documentId");

-- CreateIndex
CREATE INDEX "ComplianceTask_aircraftId_idx" ON "ComplianceTask"("aircraftId");

-- CreateIndex
CREATE INDEX "ComplianceTask_engineId_idx" ON "ComplianceTask"("engineId");

-- CreateIndex
CREATE INDEX "ComplianceTask_status_idx" ON "ComplianceTask"("status");

-- CreateIndex
CREATE INDEX "ComplianceTask_priority_idx" ON "ComplianceTask"("priority");

-- CreateIndex
CREATE INDEX "ComplianceTask_dueDate_idx" ON "ComplianceTask"("dueDate");

-- AddForeignKey
ALTER TABLE "EesDocument" ADD CONSTRAINT "EesDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "AirworthinessDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EesEvaluationItem" ADD CONSTRAINT "EesEvaluationItem_eesDocumentId_fkey" FOREIGN KEY ("eesDocumentId") REFERENCES "EesDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EesEvaluationItem" ADD CONSTRAINT "EesEvaluationItem_complianceTaskId_fkey" FOREIGN KEY ("complianceTaskId") REFERENCES "ComplianceTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AirworthinessDocument" ADD CONSTRAINT "AirworthinessDocument_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "AirworthinessDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AirworthinessDocument" ADD CONSTRAINT "AirworthinessDocument_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Engine" ADD CONSTRAINT "Engine_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "Aircraft"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceTask" ADD CONSTRAINT "ComplianceTask_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "AirworthinessDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceTask" ADD CONSTRAINT "ComplianceTask_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "Aircraft"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceTask" ADD CONSTRAINT "ComplianceTask_engineId_fkey" FOREIGN KEY ("engineId") REFERENCES "Engine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceTask" ADD CONSTRAINT "ComplianceTask_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceTask" ADD CONSTRAINT "ComplianceTask_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
