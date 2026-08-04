-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'TECHNICIAN', 'ENGINEER', 'MANAGER');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'OPEN', 'ACTIVE', 'SUPERSEDED', 'TERMINATED', 'CANCELLED', 'CLOSED', 'CONCURRENT');

-- CreateEnum
CREATE TYPE "ComplianceStatus" AS ENUM ('OPEN', 'NOT_APPLICABLE', 'PENDING', 'IN_PROGRESS', 'COMPLIED', 'NOT_REQUIRED', 'DEFERRED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "SbRelationType" AS ENUM ('CONCURRENT', 'SUPERSEDES', 'TERMINATES');

-- CreateEnum
CREATE TYPE "FulfillmentRule" AS ENUM ('ANY_OF', 'ALL_OF', 'AT_LEAST_N', 'SEQUENCE');

-- CreateEnum
CREATE TYPE "FulfillmentStatus" AS ENUM ('OPEN', 'PARTIALLY_SATISFIED', 'SATISFIED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('INSPECTION', 'MODIFICATION', 'REPLACEMENT', 'REPAIR', 'SOFTWARE_UPDATE', 'RECORD_REVIEW', 'OTHER');

-- CreateEnum
CREATE TYPE "OcrProcessingStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'EXTRACTED', 'REVIEW_REQUIRED', 'FAILED');

-- CreateEnum
CREATE TYPE "OcrDraftStatus" AS ENUM ('DRAFT', 'REVIEW_REQUIRED', 'VALIDATED', 'GENERATED');

-- CreateEnum
CREATE TYPE "SbInputSource" AS ENUM ('SYSTEM', 'USER_UPLOAD');

-- CreateEnum
CREATE TYPE "EesTemplate" AS ENUM ('GARUDA', 'CITILINK');

-- CreateEnum
CREATE TYPE "EngRecAction" AS ENUM ('COMPLY', 'DEFER', 'NA');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'PARTIALLY_APPROVED', 'APPROVED', 'REJECTED', 'RETURNED');

-- CreateTable
CREATE TABLE "Operator" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Operator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "employeeNumber" TEXT,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'TECHNICIAN',
    "operatorId" TEXT,
    "unit" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Aircraft" (
    "id" TEXT NOT NULL,
    "registration" TEXT NOT NULL,
    "msn" TEXT,
    "aircraftType" TEXT NOT NULL,
    "operatorId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Aircraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Engine" (
    "id" TEXT NOT NULL,
    "esn" TEXT NOT NULL,
    "msn" TEXT,
    "model" TEXT NOT NULL,
    "position" TEXT,
    "aircraftId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Engine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AirworthinessDirective" (
    "id" TEXT NOT NULL,
    "adNumber" TEXT NOT NULL,
    "title" TEXT,
    "issueDate" TIMESTAMP(3),
    "status" "DocumentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AirworthinessDirective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceBulletin" (
    "id" TEXT NOT NULL,
    "sbNumber" TEXT NOT NULL,
    "revision" TEXT,
    "title" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "DocumentStatus" NOT NULL DEFAULT 'ACTIVE',
    "complianceCategory" INTEGER,
    "effectivityType" TEXT,
    "effectivityRange" JSONB,
    "compliancePeriod" TEXT,
    "aircraftType" TEXT,
    "impactType" TEXT,
    "inputSource" "SbInputSource" NOT NULL DEFAULT 'SYSTEM',
    "selectedEesTemplate" "EesTemplate",
    "operatorId" TEXT,
    "originalFileName" TEXT,
    "storedFileName" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "applicabilitySummary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceBulletin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OcrResult" (
    "id" TEXT NOT NULL,
    "serviceBulletinId" TEXT NOT NULL,
    "ocrStatus" "OcrProcessingStatus" NOT NULL DEFAULT 'UPLOADED',
    "draftStatus" "OcrDraftStatus" NOT NULL DEFAULT 'DRAFT',
    "rawPayload" JSONB,
    "confidenceScore" JSONB,
    "modelConfidenceScore" JSONB,
    "extractedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OcrResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EesDocument" (
    "id" TEXT NOT NULL,
    "eesNumber" TEXT NOT NULL,
    "sourceSbId" TEXT NOT NULL,
    "taskType" TEXT,
    "references" JSONB,
    "effectedType" TEXT,
    "effectedModel" TEXT,
    "componentType" TEXT,
    "complianceTimeType" TEXT,
    "isRepetitive" BOOLEAN,
    "note" TEXT,
    "aircraftType" TEXT,
    "esn" TEXT,
    "partNumber" TEXT,
    "storedGarudaPdfPath" TEXT,
    "storedCitilinkPdfPath" TEXT,
    "storedExcelPath" TEXT,
    "reviewStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "isManualEdited" BOOLEAN NOT NULL DEFAULT false,
    "eesTemplate" "EesTemplate",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EesDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EesEvaluationItem" (
    "id" TEXT NOT NULL,
    "eesDocumentId" TEXT NOT NULL,
    "itemNo" TEXT NOT NULL,
    "paragraph" TEXT,
    "requirementDesc" TEXT NOT NULL,
    "remarks" TEXT,
    "references" JSONB,
    "taskType" TEXT,
    "adRelated" TEXT,
    "warranty" BOOLEAN,
    "rep" TEXT,
    "dueAt" TIMESTAMP(3),
    "isApplicable" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "EesEvaluationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EngineeringRecommendation" (
    "id" TEXT NOT NULL,
    "sbId" TEXT NOT NULL,
    "recommendedAction" "EngRecAction" NOT NULL,
    "priorityLevel" "Priority" NOT NULL DEFAULT 'HIGH',
    "engineeringNotes" TEXT,
    "isDeferable" BOOLEAN NOT NULL DEFAULT false,
    "egtMarginCheck" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EngineeringRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EngineHistoryLog" (
    "id" TEXT NOT NULL,
    "engineId" TEXT NOT NULL,
    "previousLogId" TEXT,
    "documentType" TEXT,
    "svrId" TEXT,
    "edsId" TEXT,
    "iq03Id" TEXT,
    "eesId" TEXT,
    "changedById" TEXT,
    "notes" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EngineHistoryLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopVisitReport" (
    "id" TEXT NOT NULL,
    "engineSerialNumber" TEXT NOT NULL,
    "engineId" TEXT,
    "engineType" TEXT,
    "shopInDate" TEXT,
    "shopOutDate" TEXT,
    "reportDate" TEXT,
    "reasonForShopVisit" TEXT,
    "tsn" TEXT,
    "csn" TEXT,
    "tslv" TEXT,
    "cslv" TEXT,
    "authorizedReleaseStatus" TEXT,
    "originalFileName" TEXT,
    "storedFileName" TEXT,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopVisitReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EngineDataSubmittal" (
    "id" TEXT NOT NULL,
    "engineSerialNumber" TEXT NOT NULL,
    "engineId" TEXT,
    "engineType" TEXT,
    "originalFileName" TEXT,
    "storedFileName" TEXT,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EngineDataSubmittal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Iq03Report" (
    "id" TEXT NOT NULL,
    "engineSerialNumber" TEXT NOT NULL,
    "engineId" TEXT,
    "engineType" TEXT,
    "originalFileName" TEXT,
    "storedFileName" TEXT,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Iq03Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EngineActiveComponent" (
    "id" TEXT NOT NULL,
    "engineId" TEXT NOT NULL,
    "partNumber" TEXT NOT NULL,
    "partName" TEXT,
    "module" TEXT,
    "tsn" TEXT,
    "csn" TEXT,
    "lastUpdatedFrom" TEXT,
    "sourceDate" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EngineActiveComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentConfigurationItem" (
    "id" TEXT NOT NULL,
    "svrId" TEXT,
    "edsId" TEXT,
    "iq03Id" TEXT,
    "engineSerialNumber" TEXT,
    "module" TEXT,
    "partName" TEXT,
    "inOut" TEXT,
    "partNumber" TEXT,
    "serial" TEXT,
    "qty" TEXT,
    "tsn" TEXT,
    "csn" TEXT,
    "tso" TEXT,
    "cso" TEXT,
    "workAccompl" TEXT,

    CONSTRAINT "DocumentConfigurationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentLlpStatus" (
    "id" TEXT NOT NULL,
    "svrId" TEXT,
    "edsId" TEXT,
    "iq03Id" TEXT,
    "engineSerialNumber" TEXT,
    "no" TEXT,
    "description" TEXT,
    "partNumber" TEXT,
    "serialNumber" TEXT,
    "totalHour" TEXT,
    "totalCycle" TEXT,
    "totalCyclesCategory" JSONB,
    "lifeLimitCycles" JSONB,
    "remainingCycles" JSONB,
    "remark" TEXT,

    CONSTRAINT "DocumentLlpStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentAdStatus" (
    "id" TEXT NOT NULL,
    "svrId" TEXT,
    "edsId" TEXT,
    "iq03Id" TEXT,
    "engineSerialNumber" TEXT,
    "adNumber" TEXT,
    "notificationDateOfCompliance" TEXT,
    "description" TEXT,
    "referenceSb" TEXT,
    "recurrInsp" TEXT,
    "moduleApplicability" TEXT,
    "methodOfCompliance" TEXT,
    "remarks" TEXT,

    CONSTRAINT "DocumentAdStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentSbStatus" (
    "id" TEXT NOT NULL,
    "svrId" TEXT,
    "edsId" TEXT,
    "iq03Id" TEXT,
    "engineSerialNumber" TEXT,
    "sbNumber" TEXT,
    "notificationDateOfCompliance" TEXT,
    "description" TEXT,
    "catType" TEXT,
    "moduleApplicability" TEXT,
    "methodOfCompliance" TEXT,
    "remarks" TEXT,

    CONSTRAINT "DocumentSbStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentAccessoriesList" (
    "id" TEXT NOT NULL,
    "svrId" TEXT,
    "edsId" TEXT,
    "iq03Id" TEXT,
    "engineSerialNumber" TEXT,
    "no" TEXT,
    "description" TEXT,
    "receivedPn" TEXT,
    "receivedSn" TEXT,
    "receivedTsn" TEXT,
    "receivedTso" TEXT,
    "installedPn" TEXT,
    "installedSn" TEXT,
    "installedTsn" TEXT,
    "installedTso" TEXT,
    "maintenancePerformed" TEXT,

    CONSTRAINT "DocumentAccessoriesList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceRecord" (
    "id" TEXT NOT NULL,
    "engineId" TEXT NOT NULL,
    "sbId" TEXT,
    "adId" TEXT,
    "status" "ComplianceStatus" NOT NULL DEFAULT 'OPEN',
    "complianceDate" TEXT,
    "svrId" TEXT,
    "edsId" TEXT,
    "iq03Id" TEXT,
    "remarks" TEXT,
    "sourceDate" TIMESTAMP(3),
    "resolutionReason" TEXT,
    "resolvedByComplianceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SbRelation" (
    "id" TEXT NOT NULL,
    "sourceSbId" TEXT NOT NULL,
    "targetSbNumber" TEXT NOT NULL,
    "relationType" "SbRelationType" NOT NULL,
    "conditionType" TEXT,
    "effectiveDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SbRelation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SbRequirementGroup" (
    "id" TEXT NOT NULL,
    "groupCode" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "fulfillmentRule" "FulfillmentRule" NOT NULL,
    "minimumRequired" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SbRequirementGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SbRequirementMember" (
    "id" TEXT NOT NULL,
    "requirementGroupId" TEXT NOT NULL,
    "targetSbNumber" TEXT NOT NULL,
    "sequenceNumber" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SbRequirementMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SbGroupResult" (
    "id" TEXT NOT NULL,
    "requirementGroupId" TEXT NOT NULL,
    "engineId" TEXT NOT NULL,
    "fulfillmentStatus" "FulfillmentStatus" NOT NULL DEFAULT 'OPEN',
    "satisfiedByComplianceId" TEXT,
    "satisfiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SbGroupResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SbComplianceAudit" (
    "id" TEXT NOT NULL,
    "complianceRecordId" TEXT NOT NULL,
    "previousStatus" "ComplianceStatus",
    "newStatus" "ComplianceStatus" NOT NULL,
    "changeSource" TEXT NOT NULL,
    "changeReason" TEXT,
    "triggeredByComplianceId" TEXT,
    "changedById" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SbComplianceAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceBulletinRead" (
    "userId" TEXT NOT NULL,
    "serviceBulletinId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceBulletinRead_pkey" PRIMARY KEY ("userId","serviceBulletinId")
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL,
    "eesId" TEXT NOT NULL,
    "approvalLevel" INTEGER NOT NULL DEFAULT 1,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "submittedById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "comment" TEXT,

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewAction" (
    "id" TEXT NOT NULL,
    "eesId" TEXT NOT NULL,
    "action" "ApprovalStatus" NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorRole" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "comment" TEXT,
    "signaturePath" TEXT,

    CONSTRAINT "ReviewAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Operator_code_key" ON "Operator"("code");

-- CreateIndex
CREATE UNIQUE INDEX "User_employeeNumber_key" ON "User"("employeeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Aircraft_registration_key" ON "Aircraft"("registration");

-- CreateIndex
CREATE UNIQUE INDEX "Aircraft_msn_key" ON "Aircraft"("msn");

-- CreateIndex
CREATE UNIQUE INDEX "Engine_esn_key" ON "Engine"("esn");

-- CreateIndex
CREATE UNIQUE INDEX "AirworthinessDirective_adNumber_key" ON "AirworthinessDirective"("adNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceBulletin_sbNumber_key" ON "ServiceBulletin"("sbNumber");

-- CreateIndex
CREATE INDEX "ServiceBulletin_operatorId_receivedAt_idx" ON "ServiceBulletin"("operatorId", "receivedAt");

-- CreateIndex
CREATE INDEX "ServiceBulletin_status_receivedAt_idx" ON "ServiceBulletin"("status", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "OcrResult_serviceBulletinId_key" ON "OcrResult"("serviceBulletinId");

-- CreateIndex
CREATE UNIQUE INDEX "EesDocument_eesNumber_key" ON "EesDocument"("eesNumber");

-- CreateIndex
CREATE UNIQUE INDEX "EesDocument_sourceSbId_key" ON "EesDocument"("sourceSbId");

-- CreateIndex
CREATE UNIQUE INDEX "EngineeringRecommendation_sbId_key" ON "EngineeringRecommendation"("sbId");

-- CreateIndex
CREATE UNIQUE INDEX "EngineHistoryLog_previousLogId_key" ON "EngineHistoryLog"("previousLogId");

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceRecord_engineId_sbId_key" ON "ComplianceRecord"("engineId", "sbId");

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceRecord_engineId_adId_key" ON "ComplianceRecord"("engineId", "adId");

-- CreateIndex
CREATE INDEX "SbRelation_sourceSbId_relationType_idx" ON "SbRelation"("sourceSbId", "relationType");

-- CreateIndex
CREATE INDEX "SbRelation_targetSbNumber_idx" ON "SbRelation"("targetSbNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SbRequirementGroup_groupCode_key" ON "SbRequirementGroup"("groupCode");

-- CreateIndex
CREATE UNIQUE INDEX "SbRequirementMember_requirementGroupId_targetSbNumber_key" ON "SbRequirementMember"("requirementGroupId", "targetSbNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SbGroupResult_requirementGroupId_engineId_key" ON "SbGroupResult"("requirementGroupId", "engineId");

-- CreateIndex
CREATE INDEX "SbComplianceAudit_complianceRecordId_changedAt_idx" ON "SbComplianceAudit"("complianceRecordId", "changedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Approval_eesId_key" ON "Approval"("eesId");

-- CreateIndex
CREATE INDEX "Approval_assignedToId_status_submittedAt_idx" ON "Approval"("assignedToId", "status", "submittedAt");

-- CreateIndex
CREATE INDEX "ReviewAction_action_createdAt_idx" ON "ReviewAction"("action", "createdAt");

-- CreateIndex
CREATE INDEX "ReviewAction_eesId_createdAt_idx" ON "ReviewAction"("eesId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aircraft" ADD CONSTRAINT "Aircraft_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Engine" ADD CONSTRAINT "Engine_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "Aircraft"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceBulletin" ADD CONSTRAINT "ServiceBulletin_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceBulletin" ADD CONSTRAINT "ServiceBulletin_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceBulletin" ADD CONSTRAINT "ServiceBulletin_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OcrResult" ADD CONSTRAINT "OcrResult_serviceBulletinId_fkey" FOREIGN KEY ("serviceBulletinId") REFERENCES "ServiceBulletin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EesDocument" ADD CONSTRAINT "EesDocument_sourceSbId_fkey" FOREIGN KEY ("sourceSbId") REFERENCES "ServiceBulletin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EesEvaluationItem" ADD CONSTRAINT "EesEvaluationItem_eesDocumentId_fkey" FOREIGN KEY ("eesDocumentId") REFERENCES "EesDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngineeringRecommendation" ADD CONSTRAINT "EngineeringRecommendation_sbId_fkey" FOREIGN KEY ("sbId") REFERENCES "ServiceBulletin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngineeringRecommendation" ADD CONSTRAINT "EngineeringRecommendation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngineHistoryLog" ADD CONSTRAINT "EngineHistoryLog_engineId_fkey" FOREIGN KEY ("engineId") REFERENCES "Engine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngineHistoryLog" ADD CONSTRAINT "EngineHistoryLog_previousLogId_fkey" FOREIGN KEY ("previousLogId") REFERENCES "EngineHistoryLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngineHistoryLog" ADD CONSTRAINT "EngineHistoryLog_svrId_fkey" FOREIGN KEY ("svrId") REFERENCES "ShopVisitReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngineHistoryLog" ADD CONSTRAINT "EngineHistoryLog_edsId_fkey" FOREIGN KEY ("edsId") REFERENCES "EngineDataSubmittal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngineHistoryLog" ADD CONSTRAINT "EngineHistoryLog_iq03Id_fkey" FOREIGN KEY ("iq03Id") REFERENCES "Iq03Report"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngineHistoryLog" ADD CONSTRAINT "EngineHistoryLog_eesId_fkey" FOREIGN KEY ("eesId") REFERENCES "EesDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngineHistoryLog" ADD CONSTRAINT "EngineHistoryLog_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopVisitReport" ADD CONSTRAINT "ShopVisitReport_engineId_fkey" FOREIGN KEY ("engineId") REFERENCES "Engine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngineDataSubmittal" ADD CONSTRAINT "EngineDataSubmittal_engineId_fkey" FOREIGN KEY ("engineId") REFERENCES "Engine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Iq03Report" ADD CONSTRAINT "Iq03Report_engineId_fkey" FOREIGN KEY ("engineId") REFERENCES "Engine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngineActiveComponent" ADD CONSTRAINT "EngineActiveComponent_engineId_fkey" FOREIGN KEY ("engineId") REFERENCES "Engine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentConfigurationItem" ADD CONSTRAINT "DocumentConfigurationItem_svrId_fkey" FOREIGN KEY ("svrId") REFERENCES "ShopVisitReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentConfigurationItem" ADD CONSTRAINT "DocumentConfigurationItem_edsId_fkey" FOREIGN KEY ("edsId") REFERENCES "EngineDataSubmittal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentConfigurationItem" ADD CONSTRAINT "DocumentConfigurationItem_iq03Id_fkey" FOREIGN KEY ("iq03Id") REFERENCES "Iq03Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentLlpStatus" ADD CONSTRAINT "DocumentLlpStatus_svrId_fkey" FOREIGN KEY ("svrId") REFERENCES "ShopVisitReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentLlpStatus" ADD CONSTRAINT "DocumentLlpStatus_edsId_fkey" FOREIGN KEY ("edsId") REFERENCES "EngineDataSubmittal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentLlpStatus" ADD CONSTRAINT "DocumentLlpStatus_iq03Id_fkey" FOREIGN KEY ("iq03Id") REFERENCES "Iq03Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAdStatus" ADD CONSTRAINT "DocumentAdStatus_svrId_fkey" FOREIGN KEY ("svrId") REFERENCES "ShopVisitReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAdStatus" ADD CONSTRAINT "DocumentAdStatus_edsId_fkey" FOREIGN KEY ("edsId") REFERENCES "EngineDataSubmittal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAdStatus" ADD CONSTRAINT "DocumentAdStatus_iq03Id_fkey" FOREIGN KEY ("iq03Id") REFERENCES "Iq03Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentSbStatus" ADD CONSTRAINT "DocumentSbStatus_svrId_fkey" FOREIGN KEY ("svrId") REFERENCES "ShopVisitReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentSbStatus" ADD CONSTRAINT "DocumentSbStatus_edsId_fkey" FOREIGN KEY ("edsId") REFERENCES "EngineDataSubmittal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentSbStatus" ADD CONSTRAINT "DocumentSbStatus_iq03Id_fkey" FOREIGN KEY ("iq03Id") REFERENCES "Iq03Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAccessoriesList" ADD CONSTRAINT "DocumentAccessoriesList_svrId_fkey" FOREIGN KEY ("svrId") REFERENCES "ShopVisitReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAccessoriesList" ADD CONSTRAINT "DocumentAccessoriesList_edsId_fkey" FOREIGN KEY ("edsId") REFERENCES "EngineDataSubmittal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAccessoriesList" ADD CONSTRAINT "DocumentAccessoriesList_iq03Id_fkey" FOREIGN KEY ("iq03Id") REFERENCES "Iq03Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceRecord" ADD CONSTRAINT "ComplianceRecord_engineId_fkey" FOREIGN KEY ("engineId") REFERENCES "Engine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceRecord" ADD CONSTRAINT "ComplianceRecord_sbId_fkey" FOREIGN KEY ("sbId") REFERENCES "ServiceBulletin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceRecord" ADD CONSTRAINT "ComplianceRecord_adId_fkey" FOREIGN KEY ("adId") REFERENCES "AirworthinessDirective"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceRecord" ADD CONSTRAINT "ComplianceRecord_svrId_fkey" FOREIGN KEY ("svrId") REFERENCES "ShopVisitReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceRecord" ADD CONSTRAINT "ComplianceRecord_edsId_fkey" FOREIGN KEY ("edsId") REFERENCES "EngineDataSubmittal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceRecord" ADD CONSTRAINT "ComplianceRecord_iq03Id_fkey" FOREIGN KEY ("iq03Id") REFERENCES "Iq03Report"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceRecord" ADD CONSTRAINT "ComplianceRecord_resolvedByComplianceId_fkey" FOREIGN KEY ("resolvedByComplianceId") REFERENCES "ComplianceRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SbRelation" ADD CONSTRAINT "SbRelation_sourceSbId_fkey" FOREIGN KEY ("sourceSbId") REFERENCES "ServiceBulletin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SbRequirementMember" ADD CONSTRAINT "SbRequirementMember_requirementGroupId_fkey" FOREIGN KEY ("requirementGroupId") REFERENCES "SbRequirementGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SbGroupResult" ADD CONSTRAINT "SbGroupResult_requirementGroupId_fkey" FOREIGN KEY ("requirementGroupId") REFERENCES "SbRequirementGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SbGroupResult" ADD CONSTRAINT "SbGroupResult_engineId_fkey" FOREIGN KEY ("engineId") REFERENCES "Engine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SbGroupResult" ADD CONSTRAINT "SbGroupResult_satisfiedByComplianceId_fkey" FOREIGN KEY ("satisfiedByComplianceId") REFERENCES "ComplianceRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SbComplianceAudit" ADD CONSTRAINT "SbComplianceAudit_complianceRecordId_fkey" FOREIGN KEY ("complianceRecordId") REFERENCES "ComplianceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SbComplianceAudit" ADD CONSTRAINT "SbComplianceAudit_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_eesId_fkey" FOREIGN KEY ("eesId") REFERENCES "EesDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewAction" ADD CONSTRAINT "ReviewAction_eesId_fkey" FOREIGN KEY ("eesId") REFERENCES "EesDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewAction" ADD CONSTRAINT "ReviewAction_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
