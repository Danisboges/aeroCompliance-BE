--
-- PostgreSQL database dump
--

\restrict OrjdYYB12KoXdq0gsf9LOke3mX5nuljSAYyFYXoTAwyZu5KcjhLw6Re3kNU1niC

-- Dumped from database version 15.18
-- Dumped by pg_dump version 15.18

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


--
-- Name: ApprovalStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ApprovalStatus" AS ENUM (
    'PENDING',
    'PARTIALLY_APPROVED',
    'APPROVED',
    'REJECTED',
    'RETURNED'
);


ALTER TYPE public."ApprovalStatus" OWNER TO postgres;

--
-- Name: ComplianceStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ComplianceStatus" AS ENUM (
    'NOT_APPLICABLE',
    'OPEN',
    'PENDING',
    'IN_PROGRESS',
    'COMPLIED',
    'NOT_REQUIRED',
    'DEFERRED',
    'OVERDUE'
);


ALTER TYPE public."ComplianceStatus" OWNER TO postgres;

--
-- Name: DocumentStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."DocumentStatus" AS ENUM (
    'DRAFT',
    'OPEN',
    'ACTIVE',
    'SUPERSEDED',
    'TERMINATED',
    'CANCELLED',
    'CLOSED'
);


ALTER TYPE public."DocumentStatus" OWNER TO postgres;

--
-- Name: EngRecAction; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."EngRecAction" AS ENUM (
    'COMPLY',
    'DEFER',
    'NA'
);


ALTER TYPE public."EngRecAction" OWNER TO postgres;

--
-- Name: FulfillmentRule; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."FulfillmentRule" AS ENUM (
    'ANY_OF',
    'ALL_OF',
    'AT_LEAST_N',
    'SEQUENCE'
);


ALTER TYPE public."FulfillmentRule" OWNER TO postgres;

--
-- Name: FulfillmentStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."FulfillmentStatus" AS ENUM (
    'OPEN',
    'PARTIALLY_SATISFIED',
    'SATISFIED',
    'EXPIRED',
    'CANCELLED'
);


ALTER TYPE public."FulfillmentStatus" OWNER TO postgres;

--
-- Name: OcrDraftStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."OcrDraftStatus" AS ENUM (
    'DRAFT',
    'REVIEW_REQUIRED',
    'VALIDATED',
    'GENERATED'
);


ALTER TYPE public."OcrDraftStatus" OWNER TO postgres;

--
-- Name: OcrProcessingStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."OcrProcessingStatus" AS ENUM (
    'UPLOADED',
    'PROCESSING',
    'EXTRACTED',
    'REVIEW_REQUIRED',
    'FAILED'
);


ALTER TYPE public."OcrProcessingStatus" OWNER TO postgres;

--
-- Name: Priority; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."Priority" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);


ALTER TYPE public."Priority" OWNER TO postgres;

--
-- Name: Role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."Role" AS ENUM (
    'ADMIN',
    'TECHNICIAN',
    'ENGINEER',
    'MANAGER'
);


ALTER TYPE public."Role" OWNER TO postgres;

--
-- Name: SbRelationType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."SbRelationType" AS ENUM (
    'CONCURRENT',
    'SUPERSEDES',
    'TERMINATES'
);


ALTER TYPE public."SbRelationType" OWNER TO postgres;

--
-- Name: SbType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."SbType" AS ENUM (
    'MANDATORY',
    'RECOMMENDED',
    'ALERT',
    'ADVISORY'
);


ALTER TYPE public."SbType" OWNER TO postgres;

--
-- Name: TaskType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."TaskType" AS ENUM (
    'INSPECTION',
    'MODIFICATION',
    'REPLACEMENT',
    'REPAIR',
    'SOFTWARE_UPDATE',
    'RECORD_REVIEW',
    'OTHER'
);


ALTER TYPE public."TaskType" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Aircraft; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Aircraft" (
    id text NOT NULL,
    registration text NOT NULL,
    msn text,
    "aircraftType" text NOT NULL,
    "operatorId" text,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Aircraft" OWNER TO postgres;

--
-- Name: Approval; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Approval" (
    id text NOT NULL,
    "eesId" text NOT NULL,
    "approvalLevel" integer DEFAULT 1 NOT NULL,
    status public."ApprovalStatus" DEFAULT 'PENDING'::public."ApprovalStatus" NOT NULL,
    "submittedById" text NOT NULL,
    "assignedToId" text,
    "submittedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "reviewedAt" timestamp(3) without time zone,
    comment text
);


ALTER TABLE public."Approval" OWNER TO postgres;

--
-- Name: ComplianceRecord; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ComplianceRecord" (
    id text NOT NULL,
    "engineId" text NOT NULL,
    "sbId" text,
    status public."ComplianceStatus" DEFAULT 'OPEN'::public."ComplianceStatus" NOT NULL,
    "complianceDate" text,
    "svrId" text,
    "edsId" text,
    "iq03Id" text,
    remarks text,
    "sourceDate" timestamp(3) without time zone,
    "resolutionReason" text,
    "resolvedByComplianceId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ComplianceRecord" OWNER TO postgres;

--
-- Name: DocumentAccessoriesList; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."DocumentAccessoriesList" (
    id text NOT NULL,
    "svrId" text,
    "edsId" text,
    "iq03Id" text,
    "engineSerialNumber" text,
    no text,
    description text,
    "receivedPn" text,
    "receivedSn" text,
    "receivedTsn" text,
    "receivedTso" text,
    "installedPn" text,
    "installedSn" text,
    "installedTsn" text,
    "installedTso" text,
    "maintenancePerformed" text
);


ALTER TABLE public."DocumentAccessoriesList" OWNER TO postgres;

--
-- Name: DocumentConfigurationItem; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."DocumentConfigurationItem" (
    id text NOT NULL,
    "svrId" text,
    "edsId" text,
    "iq03Id" text,
    "engineSerialNumber" text,
    module text,
    "partName" text,
    "inOut" text,
    "partNumber" text,
    serial text,
    qty text,
    tsn text,
    csn text,
    tso text,
    cso text,
    "workAccompl" text
);


ALTER TABLE public."DocumentConfigurationItem" OWNER TO postgres;

--
-- Name: DocumentLlpStatus; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."DocumentLlpStatus" (
    id text NOT NULL,
    "svrId" text,
    "edsId" text,
    "iq03Id" text,
    "engineSerialNumber" text,
    no text,
    description text,
    "partNumber" text,
    "serialNumber" text,
    "totalHour" text,
    "totalCycle" text,
    "totalCyclesCategory" jsonb,
    "lifeLimitCycles" jsonb,
    "remainingCycles" jsonb,
    remark text
);


ALTER TABLE public."DocumentLlpStatus" OWNER TO postgres;

--
-- Name: DocumentSbStatus; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."DocumentSbStatus" (
    id text NOT NULL,
    "svrId" text,
    "edsId" text,
    "iq03Id" text,
    "engineSerialNumber" text,
    "sbNumber" text,
    "notificationDateOfCompliance" text,
    description text,
    "catType" text,
    "moduleApplicability" text,
    "methodOfCompliance" text,
    remarks text
);


ALTER TABLE public."DocumentSbStatus" OWNER TO postgres;

--
-- Name: EesDocument; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."EesDocument" (
    id text NOT NULL,
    "eesNumber" text NOT NULL,
    "sourceSbId" text NOT NULL,
    "taskType" text,
    "references" jsonb,
    "effectedType" text,
    "effectedModel" text,
    "componentType" text,
    "complianceTimeType" text,
    "isRepetitive" boolean,
    note text,
    "aircraftType" text,
    esn text,
    "partNumber" text,
    "storedGarudaPdfPath" text,
    "storedCitilinkPdfPath" text,
    "storedExcelPath" text,
    "reviewStatus" public."ApprovalStatus" DEFAULT 'PENDING'::public."ApprovalStatus" NOT NULL,
    "isManualEdited" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."EesDocument" OWNER TO postgres;

--
-- Name: EesEvaluationItem; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."EesEvaluationItem" (
    id text NOT NULL,
    "eesDocumentId" text NOT NULL,
    "itemNo" text NOT NULL,
    paragraph text,
    "requirementDesc" text NOT NULL,
    remarks text,
    "references" jsonb,
    "taskType" text,
    warranty boolean,
    rep text,
    "dueAt" timestamp(3) without time zone,
    "isApplicable" boolean DEFAULT true NOT NULL
);


ALTER TABLE public."EesEvaluationItem" OWNER TO postgres;

--
-- Name: Engine; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Engine" (
    id text NOT NULL,
    esn text NOT NULL,
    msn text,
    model text NOT NULL,
    "position" text,
    "aircraftId" text,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Engine" OWNER TO postgres;

--
-- Name: EngineActiveComponent; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."EngineActiveComponent" (
    id text NOT NULL,
    "engineId" text NOT NULL,
    "partNumber" text NOT NULL,
    "partName" text,
    module text,
    tsn text,
    csn text,
    "lastUpdatedFrom" text,
    "sourceDate" timestamp(3) without time zone,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."EngineActiveComponent" OWNER TO postgres;

--
-- Name: EngineDataSubmittal; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."EngineDataSubmittal" (
    id text NOT NULL,
    "engineSerialNumber" text NOT NULL,
    "engineId" text,
    "engineType" text,
    "originalFileName" text,
    "storedFileName" text,
    "rawPayload" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."EngineDataSubmittal" OWNER TO postgres;

--
-- Name: EngineHistoryLog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."EngineHistoryLog" (
    id text NOT NULL,
    "engineId" text NOT NULL,
    "previousLogId" text,
    "documentType" text,
    "svrId" text,
    "edsId" text,
    "iq03Id" text,
    "eesId" text,
    "changedById" text,
    notes text,
    "recordedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."EngineHistoryLog" OWNER TO postgres;

--
-- Name: EngineeringRecommendation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."EngineeringRecommendation" (
    id text NOT NULL,
    "sbId" text NOT NULL,
    "recommendedAction" public."EngRecAction" NOT NULL,
    "priorityLevel" public."Priority" DEFAULT 'HIGH'::public."Priority" NOT NULL,
    "engineeringNotes" text,
    "isDeferable" boolean DEFAULT false NOT NULL,
    "egtMarginCheck" boolean DEFAULT false NOT NULL,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."EngineeringRecommendation" OWNER TO postgres;

--
-- Name: Iq03Report; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Iq03Report" (
    id text NOT NULL,
    "engineSerialNumber" text NOT NULL,
    "engineId" text,
    "engineType" text,
    "originalFileName" text,
    "storedFileName" text,
    "rawPayload" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Iq03Report" OWNER TO postgres;

--
-- Name: OcrResult; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."OcrResult" (
    id text NOT NULL,
    "serviceBulletinId" text NOT NULL,
    "ocrStatus" public."OcrProcessingStatus" DEFAULT 'UPLOADED'::public."OcrProcessingStatus" NOT NULL,
    "draftStatus" public."OcrDraftStatus" DEFAULT 'DRAFT'::public."OcrDraftStatus" NOT NULL,
    "rawPayload" jsonb,
    "extractedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."OcrResult" OWNER TO postgres;

--
-- Name: Operator; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Operator" (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL
);


ALTER TABLE public."Operator" OWNER TO postgres;

--
-- Name: ReviewAction; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ReviewAction" (
    id text NOT NULL,
    "eesId" text NOT NULL,
    action public."ApprovalStatus" NOT NULL,
    "actorId" text NOT NULL,
    "actorRole" public."Role" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    comment text,
    "signaturePath" text
);


ALTER TABLE public."ReviewAction" OWNER TO postgres;

--
-- Name: SbComplianceAudit; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SbComplianceAudit" (
    id text NOT NULL,
    "complianceRecordId" text NOT NULL,
    "previousStatus" public."ComplianceStatus",
    "newStatus" public."ComplianceStatus" NOT NULL,
    "changeSource" text NOT NULL,
    "changeReason" text,
    "triggeredByComplianceId" text,
    "changedById" text,
    "changedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."SbComplianceAudit" OWNER TO postgres;

--
-- Name: SbGroupResult; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SbGroupResult" (
    id text NOT NULL,
    "requirementGroupId" text NOT NULL,
    "engineId" text NOT NULL,
    "fulfillmentStatus" public."FulfillmentStatus" DEFAULT 'OPEN'::public."FulfillmentStatus" NOT NULL,
    "satisfiedByComplianceId" text,
    "satisfiedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."SbGroupResult" OWNER TO postgres;

--
-- Name: SbRelation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SbRelation" (
    id text NOT NULL,
    "sourceSbId" text NOT NULL,
    "targetSbNumber" text NOT NULL,
    "relationType" public."SbRelationType" NOT NULL,
    "conditionType" text,
    "effectiveDate" timestamp(3) without time zone,
    "isActive" boolean DEFAULT true NOT NULL,
    remarks text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."SbRelation" OWNER TO postgres;

--
-- Name: SbRequirementGroup; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SbRequirementGroup" (
    id text NOT NULL,
    "groupCode" text NOT NULL,
    "groupName" text NOT NULL,
    "fulfillmentRule" public."FulfillmentRule" NOT NULL,
    "minimumRequired" integer DEFAULT 1 NOT NULL,
    description text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."SbRequirementGroup" OWNER TO postgres;

--
-- Name: SbRequirementMember; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SbRequirementMember" (
    id text NOT NULL,
    "requirementGroupId" text NOT NULL,
    "targetSbNumber" text NOT NULL,
    "sequenceNumber" integer,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."SbRequirementMember" OWNER TO postgres;

--
-- Name: ServiceBulletin; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ServiceBulletin" (
    id text NOT NULL,
    "sbNumber" text NOT NULL,
    revision text,
    title text NOT NULL,
    issuer text NOT NULL,
    "issueDate" timestamp(3) without time zone NOT NULL,
    "receivedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status public."DocumentStatus" DEFAULT 'ACTIVE'::public."DocumentStatus" NOT NULL,
    "sbType" public."SbType",
    "complianceCategory" integer,
    "effectivityType" text,
    "effectivityRange" jsonb,
    "compliancePeriod" text,
    "aircraftType" text,
    "impactType" text,
    "operatorId" text,
    "originalFileName" text,
    "storedFileName" text,
    "createdById" text,
    "updatedById" text,
    "applicabilitySummary" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ServiceBulletin" OWNER TO postgres;

--
-- Name: ServiceBulletinRead; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ServiceBulletinRead" (
    "userId" text NOT NULL,
    "serviceBulletinId" text NOT NULL,
    "readAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ServiceBulletinRead" OWNER TO postgres;

--
-- Name: ShopVisitReport; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ShopVisitReport" (
    id text NOT NULL,
    "engineSerialNumber" text NOT NULL,
    "engineId" text,
    "engineType" text,
    "shopInDate" text,
    "shopOutDate" text,
    "reportDate" text,
    "reasonForShopVisit" text,
    tsn text,
    csn text,
    tslv text,
    cslv text,
    "authorizedReleaseStatus" text,
    "originalFileName" text,
    "storedFileName" text,
    "rawPayload" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ShopVisitReport" OWNER TO postgres;

--
-- Name: User; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."User" (
    id text NOT NULL,
    email text NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    role public."Role" DEFAULT 'TECHNICIAN'::public."Role" NOT NULL,
    "operatorId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "employeeNumber" text,
    name text,
    unit text,
    active boolean DEFAULT true NOT NULL
);


ALTER TABLE public."User" OWNER TO postgres;

--
-- Data for Name: Aircraft; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Aircraft" (id, registration, msn, "aircraftType", "operatorId", active, "createdAt", "updatedAt") FROM stdin;
AC-1ACC9FCB	PK-GIA	33501	B737-800	OP-E424AD25	t	2026-07-28 01:40:29.113	2026-07-28 01:40:29.113
AC-338DB0E6	PK-GTA	6432	A320-200	OP-8DCE3536	t	2026-07-28 01:40:29.113	2026-07-28 01:40:29.113
AC-3AE6C8D6	PK-GIE	37701	B777-300ER	OP-E424AD25	t	2026-07-28 01:40:29.114	2026-07-28 01:40:29.114
\.


--
-- Data for Name: Approval; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Approval" (id, "eesId", "approvalLevel", status, "submittedById", "assignedToId", "submittedAt", "reviewedAt", comment) FROM stdin;
APP-6E4F3EFB	EES-580F626C	2	APPROVED	USR-ADB1DEC7	USR-6EC087FF	2026-07-28 01:40:29.123	2026-07-28 01:40:29.123	Approved for execution
APP-7B9122AA	EES-6BB4C999	1	PENDING	USR-ADB1DEC7	USR-6EC087FF	2026-07-28 01:40:29.13	\N	\N
\.


--
-- Data for Name: ComplianceRecord; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ComplianceRecord" (id, "engineId", "sbId", status, "complianceDate", "svrId", "edsId", "iq03Id", remarks, "sourceDate", "resolutionReason", "resolvedByComplianceId", "createdAt", "updatedAt") FROM stdin;
CMP-4F924C7D	ENG-151892FC	SB-F6FB042C	COMPLIED	04 MAR 2026	SVR-7F898B72	\N	\N	Complied during Shop Visit	\N	\N	\N	2026-07-28 01:40:29.151	2026-07-28 01:40:29.151
cb824b3c-129d-4e91-a1b1-e5d44ff44ec6	ENG-151892FC	SB-98265829	OPEN	\N	\N	\N	\N	\N	\N	\N	\N	2026-07-28 06:38:32.611	2026-07-28 06:38:32.611
166be34c-7e9b-440b-86ae-b8255628b91e	ENG-8FAE6400	SB-98265829	OPEN	\N	\N	\N	\N	\N	\N	\N	\N	2026-07-28 06:38:32.613	2026-07-28 06:38:32.613
007dee10-72e3-4191-b89c-57de22375b88	ENG-A98D2E86	SB-98265829	OPEN	\N	\N	\N	\N	\N	\N	\N	\N	2026-07-28 06:38:32.614	2026-07-28 06:38:32.614
1732a88e-505c-4d3b-af0f-3b3bc7e31675	ENG-151892FC	SB-DOC-F46491F8	NOT_APPLICABLE	\N	\N	\N	\N	\N	\N	\N	\N	2026-07-28 07:04:32.114	2026-07-28 07:04:32.114
e5f0271d-550a-4c70-9075-5a02e048d606	ENG-8FAE6400	SB-DOC-F46491F8	NOT_APPLICABLE	\N	\N	\N	\N	\N	\N	\N	\N	2026-07-28 07:04:32.116	2026-07-28 07:04:32.116
55f07e62-118c-4dcf-afb7-be6f02633063	ENG-A98D2E86	SB-DOC-F46491F8	NOT_APPLICABLE	\N	\N	\N	\N	\N	\N	\N	\N	2026-07-28 07:04:32.118	2026-07-28 07:04:32.118
\.


--
-- Data for Name: DocumentAccessoriesList; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."DocumentAccessoriesList" (id, "svrId", "edsId", "iq03Id", "engineSerialNumber", no, description, "receivedPn", "receivedSn", "receivedTsn", "receivedTso", "installedPn", "installedSn", "installedTsn", "installedTso", "maintenancePerformed") FROM stdin;
558ad073-a77e-481c-892f-33d4414222e8	\N	EDS-7D6B1DFB	\N	906101	1	Fuel Pump	\N	\N	\N	\N	FP-123	SN-001	\N	\N	\N
\.


--
-- Data for Name: DocumentConfigurationItem; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."DocumentConfigurationItem" (id, "svrId", "edsId", "iq03Id", "engineSerialNumber", module, "partName", "inOut", "partNumber", serial, qty, tsn, csn, tso, cso, "workAccompl") FROM stdin;
a47bc1d6-9b7d-4d1d-9f07-210120ee2656	SVR-7F898B72	\N	\N	660235	FAN	FAN BLADE	IN	340-001-026-0	FB12345	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: DocumentLlpStatus; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."DocumentLlpStatus" (id, "svrId", "edsId", "iq03Id", "engineSerialNumber", no, description, "partNumber", "serialNumber", "totalHour", "totalCycle", "totalCyclesCategory", "lifeLimitCycles", "remainingCycles", remark) FROM stdin;
2bb47237-f106-4f83-bbe4-5e4ba82e31c3	SVR-7F898B72	\N	\N	660235	1	FAN DISK	340-123-01	FD555	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: DocumentSbStatus; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."DocumentSbStatus" (id, "svrId", "edsId", "iq03Id", "engineSerialNumber", "sbNumber", "notificationDateOfCompliance", description, "catType", "moduleApplicability", "methodOfCompliance", remarks) FROM stdin;
64ae84d8-15a9-4c5e-ad8e-8c9c15698382	SVR-7F898B72	\N	\N	660235	2020-0044	01 JAN 2026	\N	\N	\N	INSPECTED PER SB	\N
\.


--
-- Data for Name: EesDocument; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."EesDocument" (id, "eesNumber", "sourceSbId", "taskType", "references", "effectedType", "effectedModel", "componentType", "complianceTimeType", "isRepetitive", note, "aircraftType", esn, "partNumber", "storedGarudaPdfPath", "storedCitilinkPdfPath", "storedExcelPath", "reviewStatus", "isManualEdited", "createdAt") FROM stdin;
EES-DOC-444D4899	EES-SB 72-0685-1785224436010	SB-DOC-F46491F8	INS	["test", "test", "test"]	GE90-100	\N	\N	\N	\N	tetst 1\n\ntest 2	B777-300ER	\N	2115M33G12	/uploads/ees-documents/EES-EES-SB 72-0685-1785224436010-GARUDA.pdf	\N	\N	PENDING	t	2026-07-28 07:40:36.015
EES-DOC-D128E9E5	EES-GA-SB-72-0846-R02	SB-DOC-E80FDDF7	INSPECTION	["GE90-100 Boeing 777 Aircraft Maintenance Manual (AMM), 72-00-00, Task 72-00-00-290-803-H01", "GEK 109993, GE90-100 Engine Manual (EM), 72-00-01, Special Procedure 004", "GE90-100 S/B 72-0763, Introduction of New Stages 5 through 8 Borescope Vane Assemblies without Locating Pins and Rework Procedure"]	GE90-100	GE90-110B1, GE90-115B	HPC Stator Stage 5 Vane Sector Pin	SHOP_VISIT	f	Category 7; can be accomplished in shop. The BSI is no longer applicable after GE90-100 S/B 72-0763 is accomplished.	B777-300ER	906-101 through 906-999; 907-001 through 907-999; 901-001 through 901-411	\N	/uploads/ees-documents/EES-EES-GA-SB-72-0846-R02-GARUDA.pdf	\N	\N	PENDING	f	2026-07-28 07:11:34.469
EES-580F626C	EES-GA-FB042C	SB-F6FB042C	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	APPROVED	f	2026-07-28 01:40:29.121
EES-6BB4C999	EES-GA-7BFB27	SB-487BFB27	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	PENDING	f	2026-07-28 01:40:29.129
EES-DOC-CBCF8EEC	EES-GE90 SB 72-0686 R01-1785221558353	SB-98265829	INS	["test", "test", "test"]	—	\N	\N	\N	\N	testtestetst\n\ntest 2	B777-300ER	\N	\N	/uploads/ees-documents/EES-EES-GE90 SB 72-0686 R01-1785221558353-GARUDA.pdf	\N	\N	PENDING	t	2026-07-28 06:52:38.358
\.


--
-- Data for Name: EesEvaluationItem; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."EesEvaluationItem" (id, "eesDocumentId", "itemNo", paragraph, "requirementDesc", remarks, "references", "taskType", warranty, rep, "dueAt", "isApplicable") FROM stdin;
ITEM-SB720846-03	EES-DOC-D128E9E5	3	3.B(1)	Perform a borescope inspection of the HPC stage 5 vane sector for pin migration through borescope port G.	Use SPL-115 right-angle flexscope or equivalent and AMM Task 72-00-00-290-803-H01.	["Accomplishment Instructions, paragraph 3.B(1)", "Figure 1", "Figure 2"]	INSPECTION	f	NO	\N	t
ITEM-SB720846-04	EES-DOC-D128E9E5	4	3.B(1)(a)5	Take pictures of the pin condition and share the BSI results with the GE90 Product Support Engineer.	Submit the inspection evidence through my.GEAerospace.com.	["Accomplishment Instructions, paragraph 3.B(1)(a)5"]	INSPECTION	f	NO	\N	t
EVAL-B8BC6392	EES-580F626C	1	\N	Inspect Fan Hub Frame Assembly	No cracks found	\N	\N	\N	\N	\N	t
ITEM-BDA272AF	EES-DOC-CBCF8EEC	1	test 1	test 11	testtestetst	null	INS	\N	\N	\N	t
ITEM-76267D44	EES-DOC-CBCF8EEC	2	test 2	test 2	test 2	null	INS	\N	\N	\N	t
ITEM-SB720846-05	EES-DOC-D128E9E5	5	3.B(1)(c)	If the stage 5 vane sector pin is loose or protruded, remove the pin using GE90-100 EM 72-00-01, Special Procedure 004.	Refer to Figure 4 for the pin removal location.	["GEK 109993, GE90-100 Engine Manual, Special Procedure 004", "Figure 4"]	INSPECTION	f	NO	\N	t
ITEM-SB720846-06	EES-DOC-D128E9E5	6	3.B(1)(d)	If the stage 5 vane sector pin is missing or intact, no corrective action is required.	Record the inspection condition and retain the supporting pictures.	["Accomplishment Instructions, paragraph 3.B(1)(d)", "Figure 3"]	INSPECTION	f	NO	\N	t
ITEM-SB720846-01	EES-DOC-D128E9E5	1	1.A Effectivity	Applicable to GE90-100 engines, ESN 906-101 through 906-999, 907-001 through 907-999, and 901-001 through 901-411.	Models GE90-110B1 and GE90-115B. ESN 901-412 and up are not applicable.	["Planning Information, paragraph 1.A"]	INSPECTION	f	NO	\N	t
ITEM-SB720846-02	EES-DOC-D128E9E5	2	1.A / 3.C	Confirm the engine has not complied with GE90-100 S/B 72-0763 before applying this module-level inspection.	S/B 72-0763 terminates the applicability of this BSI.	["Planning Information, paragraph 1.A", "Accomplishment Instructions, paragraph 3.C"]	INSPECTION	f	NO	\N	t
ITEM-A533379D	EES-DOC-444D4899	1	test 1	test 1	tetst 1	null	INS	\N	\N	\N	t
ITEM-19DE8030	EES-DOC-444D4899	2	test 2	test 2	test 2	null	INS	\N	\N	\N	t
\.


--
-- Data for Name: Engine; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Engine" (id, esn, msn, model, "position", "aircraftId", active, "createdAt", "updatedAt") FROM stdin;
ENG-151892FC	660235	33501	CFM56-7B26E	1	AC-1ACC9FCB	t	2026-07-28 01:40:29.115	2026-07-28 01:40:29.115
ENG-8FAE6400	ESN-GTA01	6432	LEAP-1A26	1	AC-338DB0E6	t	2026-07-28 01:40:29.115	2026-07-28 01:40:29.115
ENG-A98D2E86	906101	37701	GE90-115B	1	AC-3AE6C8D6	t	2026-07-28 01:40:29.116	2026-07-28 01:40:29.116
\.


--
-- Data for Name: EngineActiveComponent; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."EngineActiveComponent" (id, "engineId", "partNumber", "partName", module, tsn, csn, "lastUpdatedFrom", "sourceDate", "updatedAt") FROM stdin;
1633c809-2b6c-48c1-a130-87d347eae2ef	ENG-151892FC	340-001-026-0	FAN BLADE	FAN	1500	1200	SVR	\N	2026-07-28 01:40:29.16
\.


--
-- Data for Name: EngineDataSubmittal; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."EngineDataSubmittal" (id, "engineSerialNumber", "engineId", "engineType", "originalFileName", "storedFileName", "rawPayload", "createdAt", "updatedAt") FROM stdin;
EDS-7D6B1DFB	906101	ENG-A98D2E86	GE90-115B	EDS_906101_2026.pdf	\N	"{\\"date\\":\\"10 JAN 2026\\",\\"tsn\\":\\"15000\\",\\"csn\\":\\"12000\\"}"	2026-07-28 01:40:29.156	2026-07-28 01:40:29.156
\.


--
-- Data for Name: EngineHistoryLog; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."EngineHistoryLog" (id, "engineId", "previousLogId", "documentType", "svrId", "edsId", "iq03Id", "eesId", "changedById", notes, "recordedAt") FROM stdin;
b7162a49-06d4-4a72-b993-b91139ed4940	ENG-151892FC	\N	SVR	SVR-7F898B72	\N	\N	\N	USR-53A5FFBE	Initial SVR processed	2026-07-28 01:40:29.164
\.


--
-- Data for Name: EngineeringRecommendation; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."EngineeringRecommendation" (id, "sbId", "recommendedAction", "priorityLevel", "engineeringNotes", "isDeferable", "egtMarginCheck", "createdById", "createdAt", "updatedAt") FROM stdin;
ER-7FD92B2B	SB-DOC-E80FDDF7	COMPLY	LOW	Perform the module-level BSI at the customer's convenience during a shop visit. Remove loose or protruded pins per EM Special Procedure 004.	t	f	\N	2026-07-28 07:11:34.491	2026-07-28 07:29:41.931
\.


--
-- Data for Name: Iq03Report; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Iq03Report" (id, "engineSerialNumber", "engineId", "engineType", "originalFileName", "storedFileName", "rawPayload", "createdAt", "updatedAt") FROM stdin;
IQ03-7A202A91	ESN-GTA01	ENG-8FAE6400	LEAP-1A26	IQ03_GTA01_2026.pdf	\N	"{\\"date\\":\\"15 MAR 2026\\"}"	2026-07-28 01:40:29.158	2026-07-28 01:40:29.158
\.


--
-- Data for Name: OcrResult; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."OcrResult" (id, "serviceBulletinId", "ocrStatus", "draftStatus", "rawPayload", "extractedAt", "createdAt", "updatedAt") FROM stdin;
OCR-1511FB2C	SB-DOC-E80FDDF7	EXTRACTED	GENERATED	{"note": "Category 7; can be accomplished in shop. The BSI is no longer applicable after GE90-100 S/B 72-0763 is accomplished.", "title": "ENGINE - Compressor Module Assembly (72-30-00) - Module Level BSI of High Pressure Compressor Stator Stage 5 Vane Sector Pin Condition", "issuer": "GE Aerospace", "sb_code": "SB 72-0846 R02", "tooling": [{"cage_code": "06083", "description": "Borescope - Right Angle Flexscope", "tool_number": "SPL-115", "part_numbers": ["9C1301P01", "9C1301P03"]}], "manpower": {"condition": "After access to the compressor module assembly is available.", "man_hours": 1}, "revision": "R02", "task_type": "INSPECTION", "ees_number": "EES-GA-SB-72-0846-R02", "issue_date": "2020-10-30", "references": ["GE90-100 Boeing 777 Aircraft Maintenance Manual (AMM), 72-00-00, Task 72-00-00-290-803-H01", "GEK 109993, GE90-100 Engine Manual (EM), 72-00-01, Special Procedure 004", "GE90-100 S/B 72-0763, Introduction of New Stages 5 through 8 Borescope Vane Assemblies without Locating Pins and Rework Procedure"], "repetitive": false, "description": [{"itemNo": "4", "remark": "Use SPL-115 right-angle flexscope or equivalent and AMM Task 72-00-00-290-803-H01.", "references": ["Accomplishment Instructions, paragraph 3.B(1)", "Figure 1", "Figure 2"], "isApplicable": true, "requirement_desc": "Perform a module-level borescope inspection of the HPC stage 5 vane sector for pin migration through borescope port G."}, {"itemNo": "5", "remark": "Submit the inspection evidence through my.GEAerospace.com.", "references": ["Accomplishment Instructions, paragraph 3.B(1)(a)5"], "isApplicable": true, "requirement_desc": "Take pictures of the pin condition and share the BSI results with the GE90 Product Support Engineer."}, {"itemNo": "6", "remark": "If the pin is missing or intact, no corrective action is required.", "references": ["Accomplishment Instructions, paragraphs 3.B(1)(c) and 3.B(1)(d)", "Figure 4"], "isApplicable": true, "requirement_desc": "If the pin is loose or protruded, remove it in accordance with GE90-100 EM 72-00-01, Special Procedure 004."}], "effectivity": [{"itemNo": "1", "remark": "Applicable models: GE90-110B1 and GE90-115B. ESN 901-412 and up are not applicable.", "references": ["Planning Information, paragraph 1.A"], "isApplicable": true, "requirement_desc": "Applicable to GE90-100 engines, ESN 906-101 through 906-999, 907-001 through 907-999, and 901-001 through 901-411."}, {"itemNo": "2", "remark": "S/B 72-0763 is the terminating action for this module-level BSI.", "references": ["Planning Information, paragraph 1.A", "Accomplishment Instructions, paragraph 3.C"], "isApplicable": true, "requirement_desc": "Not applicable to engines that have complied with GE90-100 S/B 72-0763."}], "impact_type": "E", "aircraftType": "B777-300ER", "manufacturer": "GE Aerospace", "effected_type": "GE90-100", "revision_date": "2024-02-21", "component_type": "HPC Stator Stage 5 Vane Sector Pin", "effected_model": ["GE90-110B1", "GE90-115B"], "recommendation": "Accomplish at the customer's convenience when the engine is in shop.", "problem_evidence": [{"itemNo": "3", "remark": "Loose or protruded pins can damage HPC and downstream hardware during engine operation.", "references": ["Planning Information, paragraph 1.E", "Figure 2", "Figure 3"], "isApplicable": true, "requirement_desc": "Inspect the HPC stator stage 5 vane sector pin condition for loose, protruded, missing, or intact pins."}], "extraction_source": {"sha256": "80be0a7a89fdc4b939017356393e6d1deb9631ac0ee69d3acbe118d71ac9b7f2", "file_name": "GE90-100 SB 72-0846 R2.pdf", "page_count": 9, "extracted_manually": true}, "compliance_category": 7, "compliance_time_type": "SHOP_VISIT", "material_requirements": [], "concurrent_requirements": []}	2026-07-28 00:00:00	2026-07-28 07:11:34.46	2026-07-28 07:29:41.913
55630558-6d5a-4ddb-be53-41770955def4	SB-98265829	UPLOADED	GENERATED	{"note": "testtestetst\\n\\ntest 2", "title": "ENGINE - Fan Hub Frame Assembly - Routine Inspection", "sb_code": "GE90 SB 72-0686 R01", "task_type": "INS", "references": ["test", "test", "test"], "evaluations": [{"itemNo": "1", "remarks": "testtestetst", "taskType": "INS", "paragraph": "test 1", "isApplicable": true, "requirementDesc": "test 11"}, {"itemNo": "2", "remarks": "test 2", "taskType": "INS", "paragraph": "test 2", "isApplicable": true, "requirementDesc": "test 2"}], "aircraftType": "B777-300ER", "manufacturer": "GE Aerospace", "effected_type": "—", "compliance_period": "next SV", "compliance_category": 4}	\N	2026-07-28 06:38:32.587	2026-07-28 06:52:38.363
cb4d1472-e546-44af-8ee9-1dd96f923d53	SB-DOC-F46491F8	EXTRACTED	GENERATED	{"esn": "engin1, engin2", "note": "tetst 1\\n\\ntest 2", "title": "SB 72-0685 R06 ENGINE - FAN HUB FRAME ASSEMBLY (72-23-00) - TGB ROLLER BEARING INNER RACE MATERIAL CHANGE", "sb_code": "SB 72-0685", "task_type": "INS", "references": ["test", "test", "test"], "evaluations": [{"rep": "Y", "dueAt": "nextSV", "itemNo": "1", "remarks": "tetst 1", "taskType": "INS", "warranty": true, "adRelated": "-", "paragraph": "test 1", "isApplicable": true, "requirementDesc": "test 1", "affectedAcEngine": "engin1, engin2"}, {"rep": "Y", "dueAt": "nextSV", "itemNo": "2", "remarks": "test 2", "taskType": "INS", "warranty": true, "adRelated": "-", "paragraph": "test 2", "isApplicable": true, "requirementDesc": "test 2", "affectedAcEngine": "engin1, engin2"}], "part_number": "2115M33G12", "aircraftType": "B777-300ER", "manufacturer": "GE", "effected_type": "GE90-100", "compliance_period": "next SV", "compliance_category": 3}	2026-07-28 06:56:28.84	2026-07-28 06:55:44.285	2026-07-28 07:40:36.02
b9985989-a4ce-476c-b042-272ac27d2a1d	SB-DOC-A34B97CF	REVIEW_REQUIRED	DRAFT	\N	\N	2026-07-28 06:59:53.436	2026-07-28 07:00:01.389
\.


--
-- Data for Name: Operator; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Operator" (id, code, name) FROM stdin;
OP-E424AD25	GA	Garuda Indonesia
OP-8DCE3536	QG	Citilink
\.


--
-- Data for Name: ReviewAction; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ReviewAction" (id, "eesId", action, "actorId", "actorRole", "createdAt", comment, "signaturePath") FROM stdin;
REV-898C5085	EES-580F626C	APPROVED	USR-6EC087FF	MANAGER	2026-07-28 01:40:29.124	Looks good	\N
\.


--
-- Data for Name: SbComplianceAudit; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SbComplianceAudit" (id, "complianceRecordId", "previousStatus", "newStatus", "changeSource", "changeReason", "triggeredByComplianceId", "changedById", "changedAt") FROM stdin;
382d1c07-8f40-4b2a-811f-7aa94e8012e1	CMP-4F924C7D	OPEN	COMPLIED	SYSTEM	SVR upload matched requirements	\N	USR-53A5FFBE	2026-07-28 01:40:29.165
\.


--
-- Data for Name: SbGroupResult; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SbGroupResult" (id, "requirementGroupId", "engineId", "fulfillmentStatus", "satisfiedByComplianceId", "satisfiedAt", "createdAt", "updatedAt") FROM stdin;
813ad596-d49a-45ca-b8c4-f286657269e8	69fc4b16-c1a0-494c-b8e7-df5bfa3d6948	ENG-151892FC	SATISFIED	CMP-4F924C7D	2026-07-28 01:40:29.162	2026-07-28 01:40:29.163	2026-07-28 01:40:29.163
\.


--
-- Data for Name: SbRelation; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SbRelation" (id, "sourceSbId", "targetSbNumber", "relationType", "conditionType", "effectiveDate", "isActive", remarks, "createdAt", "updatedAt") FROM stdin;
e193df4d-dd64-4b95-a020-71ba4200afc4	SB-F6FB042C	GE90 SB 72-0680	SUPERSEDES	NONE	\N	t	\N	2026-07-28 01:40:29.133	2026-07-28 01:40:29.133
\.


--
-- Data for Name: SbRequirementGroup; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SbRequirementGroup" (id, "groupCode", "groupName", "fulfillmentRule", "minimumRequired", description, "isActive", "createdAt", "updatedAt") FROM stdin;
69fc4b16-c1a0-494c-b8e7-df5bfa3d6948	GRP-GE90-001	GE90 Essential Mods	ALL_OF	1	\N	t	2026-07-28 01:40:29.161	2026-07-28 01:40:29.161
\.


--
-- Data for Name: SbRequirementMember; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SbRequirementMember" (id, "requirementGroupId", "targetSbNumber", "sequenceNumber", "isActive", "createdAt") FROM stdin;
af44752a-ee11-45d9-bbb8-b52f9b500b13	69fc4b16-c1a0-494c-b8e7-df5bfa3d6948	GE90 SB 72-0685 R06	1	t	2026-07-28 01:40:29.161
\.


--
-- Data for Name: ServiceBulletin; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ServiceBulletin" (id, "sbNumber", revision, title, issuer, "issueDate", "receivedAt", status, "sbType", "complianceCategory", "effectivityType", "effectivityRange", "compliancePeriod", "aircraftType", "impactType", "operatorId", "originalFileName", "storedFileName", "createdById", "updatedById", "applicabilitySummary", "createdAt") FROM stdin;
SB-DOC-A34B97CF	FAILED-SB-DOC-A34B97CF-1785222001376	\N	Upload Failed: GE90-100 SB 72-0846 R2.pdf	Unknown	2026-07-28 06:59:53.434	2026-07-28 06:59:53.436	ACTIVE	\N	\N	\N	\N	\N	B777-300ER	\N	\N	GE90-100 SB 72-0846 R2.pdf	sb-SB-DOC-A34B97CF-80be0a7a89fd.pdf	USR-28F30537	\N	{"applicableEngines": ["660235", "ESN-GTA01", "906101"], "notApplicableEngines": []}	2026-07-28 06:59:53.436
SB-F6FB042C	GE90 SB 72-0685 R06	R06	ENGINE - Fan Hub Frame Assembly (72-23-00) - TGB Roller Bearing Inner Race Material Change	GE Aerospace	2025-12-22 00:00:00	2026-07-01 00:00:00	ACTIVE	\N	3	\N	\N	\N	B777-300ER	E	OP-E424AD25	SB_GE90_72_0685.pdf	SB_GE90_72_0685.pdf	\N	\N	\N	2026-07-28 01:40:29.118
SB-487BFB27	LEAP-1A-72-00-0449	01A	ENGINE - GENERAL (72-00-00) - INTRODUCTION OF NEW LPTACC COOLING MANIFOLD	CFM International	2026-02-02 00:00:00	2026-07-28 01:40:29.128	ACTIVE	\N	3	\N	\N	\N	B737-800	D	OP-E424AD25	\N	\N	\N	\N	\N	2026-07-28 01:40:29.128
SB-CD464159	GE90 SB 72-0680	R00	OLD ENGINE - Fan Hub Frame Assembly	GE Aerospace	2024-01-01 00:00:00	2024-02-01 00:00:00	SUPERSEDED	\N	3	\N	\N	\N	B777-300ER	\N	OP-E424AD25	\N	\N	\N	\N	\N	2026-07-28 01:40:29.131
SB-DOC-E80FDDF7	SB 72-0846 R02	R02	ENGINE - Compressor Module Assembly (72-30-00) - Module Level BSI of High Pressure Compressor Stator Stage 5 Vane Sector Pin Condition	GE Aerospace	2020-10-30 00:00:00	2026-07-09 00:00:00	ACTIVE	RECOMMENDED	7	GE90-100	"GE90-110B1 and GE90-115B; ESN 906-101 through 906-999, 907-001 through 907-999, and 901-001 through 901-411. Excludes ESN 901-412 and up and engines that have complied with GE90-100 S/B 72-0763."	At the customer's convenience; accomplish when the engine is in shop.	B777-300ER	E	OP-E424AD25	GE90-100 SB 72-0846 R2.pdf	SB_GE90_72_0846_R02.pdf	\N	\N	{"applicableEngines": ["906101"], "notApplicableEngines": [{"esn": "660235", "reason": "1. Explicit ESN or Engine Model does not match"}, {"esn": "ESN-GTA01", "reason": "1. Explicit ESN or Engine Model does not match"}]}	2026-07-28 07:11:34.451
SB-98265829	GE90 SB 72-0686 R01	R01	ENGINE - Fan Hub Frame Assembly - Routine Inspection	GE Aerospace	2026-01-10 00:00:00	2026-07-02 00:00:00	ACTIVE	\N	4	—	null	next SV	B777-300ER	E	OP-E424AD25	\N	\N	\N	USR-28F30537	{"applicableEngines": [], "notApplicableEngines": [{"esn": "660235", "reason": "1. Explicit ESN or Engine Model does not match"}, {"esn": "ESN-GTA01", "reason": "1. Explicit ESN or Engine Model does not match"}, {"esn": "906101", "reason": "1. Explicit ESN or Engine Model does not match"}]}	2026-07-28 01:40:29.125
SB-DOC-F46491F8	SB 72-0685	\N	SB 72-0685 R06 ENGINE - FAN HUB FRAME ASSEMBLY (72-23-00) - TGB ROLLER BEARING INNER RACE MATERIAL CHANGE	GE	2025-12-22 00:00:00	2026-07-28 06:55:44.285	ACTIVE	\N	3	GE90-100	"-110B1, -115B"	next SV	B777-300ER	\N	\N	GE90-100 SB 72-0685 R06.pdf	sb-SB-DOC-F46491F8-92c9f2ce52ee.pdf	USR-28F30537	USR-28F30537	{"applicableEngines": ["906101"], "notApplicableEngines": [{"esn": "660235", "reason": "1. Explicit ESN or Engine Model does not match"}, {"esn": "ESN-GTA01", "reason": "1. Explicit ESN or Engine Model does not match"}]}	2026-07-28 06:55:44.285
\.


--
-- Data for Name: ServiceBulletinRead; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ServiceBulletinRead" ("userId", "serviceBulletinId", "readAt") FROM stdin;
USR-5A0C56BD	SB-DOC-F46491F8	2026-07-28 08:44:23.155
USR-28F30537	SB-DOC-A34B97CF	2026-07-28 14:43:18.183
USR-28F30537	SB-DOC-F46491F8	2026-07-29 04:33:32.494
USR-28F30537	SB-F6FB042C	2026-07-29 04:33:35.97
USR-28F30537	SB-CD464159	2026-07-29 04:33:36.77
USR-28F30537	SB-98265829	2026-07-29 04:33:42.626
USR-28F30537	SB-487BFB27	2026-07-29 04:34:35.335
USR-28F30537	SB-DOC-E80FDDF7	2026-07-29 04:40:24.171
USR-ADB1DEC7	SB-F6FB042C	2026-07-28 01:40:29.167
\.


--
-- Data for Name: ShopVisitReport; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ShopVisitReport" (id, "engineSerialNumber", "engineId", "engineType", "shopInDate", "shopOutDate", "reportDate", "reasonForShopVisit", tsn, csn, tslv, cslv, "authorizedReleaseStatus", "originalFileName", "storedFileName", "rawPayload", "createdAt", "updatedAt") FROM stdin;
SVR-7F898B72	660235	ENG-151892FC	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	SVR_660235_2026.pdf	SVR_660235_2026.pdf	"{\\"engine_type\\":\\"CFM56-7B26E\\",\\"engine_serial_number\\":\\"660235\\",\\"shop_in_date\\":\\"23 FEB 2026\\",\\"shop_out_date\\":\\"04 MAR 2026\\"}"	2026-07-28 01:40:29.148	2026-07-28 01:40:29.148
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."User" (id, email, username, password, role, "operatorId", "createdAt", "updatedAt", "employeeNumber", name, unit, active) FROM stdin;
USR-28F30537	admin@gmf.co.id	admin	$2b$10$/sIKw1zMy/OZebp6A5wa6OuV.51U23wUF2sW0yLs5.jQAtpYsFgEK	ADMIN	\N	2026-07-28 01:40:29.013	2026-07-28 01:40:29.013	\N	\N	\N	t
USR-ADB1DEC7	firsteng@gmf.co.id	first_engineer	$2b$10$pnCCJav613AM1lLT/o3YdeVEmHITE7.0ShomTB7W3nGEMXNrtzSvW	ENGINEER	OP-E424AD25	2026-07-28 01:40:29.018	2026-07-28 01:40:29.018	\N	\N	\N	t
USR-6EC087FF	secondeng@gmf.co.id	second_engineer	$2b$10$pnCCJav613AM1lLT/o3YdeVEmHITE7.0ShomTB7W3nGEMXNrtzSvW	MANAGER	OP-E424AD25	2026-07-28 01:40:29.02	2026-07-28 01:40:29.02	\N	\N	\N	t
USR-53A5FFBE	technician@gmf.co.id	technician	$2b$10$pnCCJav613AM1lLT/o3YdeVEmHITE7.0ShomTB7W3nGEMXNrtzSvW	TECHNICIAN	OP-E424AD25	2026-07-28 01:40:29.021	2026-07-28 01:40:29.021	\N	\N	\N	t
USR-87824AEF	firsteng.citilink@gmf.co.id	first_eng_citi	$2b$10$pnCCJav613AM1lLT/o3YdeVEmHITE7.0ShomTB7W3nGEMXNrtzSvW	ENGINEER	OP-8DCE3536	2026-07-28 01:40:29.022	2026-07-28 01:40:29.022	\N	\N	\N	t
USR-5A0C56BD	rizky.pratama@gmf.co.id	rizky_pratama	$2b$10$FQQ/9RrPwGY8ZgNveNJY.uJlJMC.4lfKVV9ipMhMo.bD6SD5IfqA.	ENGINEER	OP-E424AD25	2026-07-28 01:40:29.1	2026-07-28 01:40:29.1	GA-ENG-001	Rizky Pratama	TEA-2	t
USR-9ADA4B23	siti.rahmawati@gmf.co.id	siti_rahmawati	$2b$10$FQQ/9RrPwGY8ZgNveNJY.uJlJMC.4lfKVV9ipMhMo.bD6SD5IfqA.	ENGINEER	OP-E424AD25	2026-07-28 01:40:29.101	2026-07-28 01:40:29.101	GA-ENG-002	Siti Rahmawati	TEA-2	t
USR-70C47E3C	maya.puspitasari@gmf.co.id	maya_puspitasari	$2b$10$FQQ/9RrPwGY8ZgNveNJY.uJlJMC.4lfKVV9ipMhMo.bD6SD5IfqA.	MANAGER	OP-E424AD25	2026-07-28 01:40:29.108	2026-07-28 01:40:29.108	GA-MGR-002	Maya Puspitasari	TEA	t
USR-00E5AD88	rina.kurniawati@citilink.co.id	rina_kurniawati	$2b$10$FQQ/9RrPwGY8ZgNveNJY.uJlJMC.4lfKVV9ipMhMo.bD6SD5IfqA.	MANAGER	OP-8DCE3536	2026-07-28 01:40:29.109	2026-07-28 01:40:29.109	CT-MGR-001	Rina Kurniawati	Engineering	t
USR-7AF3C1E3	andi.wijaya@citilink.co.id	andi_wijaya	$2b$10$FQQ/9RrPwGY8ZgNveNJY.uJlJMC.4lfKVV9ipMhMo.bD6SD5IfqA.	MANAGER	OP-8DCE3536	2026-07-28 01:40:29.111	2026-07-28 01:40:29.111	CT-MGR-002	Andi Wijaya	Engineering	t
USR-A47F66F3	kurniaputra.irham@gmail.com	davy_febrynzki	$2b$10$FQQ/9RrPwGY8ZgNveNJY.uJlJMC.4lfKVV9ipMhMo.bD6SD5IfqA.	MANAGER	OP-E424AD25	2026-07-28 01:40:29.107	2026-07-28 01:40:29.107	GA-MGR-001	Davy Febrynzki	TEA-2	t
\.


--
-- Name: Aircraft Aircraft_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Aircraft"
    ADD CONSTRAINT "Aircraft_pkey" PRIMARY KEY (id);


--
-- Name: Approval Approval_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Approval"
    ADD CONSTRAINT "Approval_pkey" PRIMARY KEY (id);


--
-- Name: ComplianceRecord ComplianceRecord_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ComplianceRecord"
    ADD CONSTRAINT "ComplianceRecord_pkey" PRIMARY KEY (id);


--
-- Name: DocumentAccessoriesList DocumentAccessoriesList_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DocumentAccessoriesList"
    ADD CONSTRAINT "DocumentAccessoriesList_pkey" PRIMARY KEY (id);


--
-- Name: DocumentConfigurationItem DocumentConfigurationItem_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DocumentConfigurationItem"
    ADD CONSTRAINT "DocumentConfigurationItem_pkey" PRIMARY KEY (id);


--
-- Name: DocumentLlpStatus DocumentLlpStatus_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DocumentLlpStatus"
    ADD CONSTRAINT "DocumentLlpStatus_pkey" PRIMARY KEY (id);


--
-- Name: DocumentSbStatus DocumentSbStatus_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DocumentSbStatus"
    ADD CONSTRAINT "DocumentSbStatus_pkey" PRIMARY KEY (id);


--
-- Name: EesDocument EesDocument_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EesDocument"
    ADD CONSTRAINT "EesDocument_pkey" PRIMARY KEY (id);


--
-- Name: EesEvaluationItem EesEvaluationItem_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EesEvaluationItem"
    ADD CONSTRAINT "EesEvaluationItem_pkey" PRIMARY KEY (id);


--
-- Name: EngineActiveComponent EngineActiveComponent_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EngineActiveComponent"
    ADD CONSTRAINT "EngineActiveComponent_pkey" PRIMARY KEY (id);


--
-- Name: EngineDataSubmittal EngineDataSubmittal_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EngineDataSubmittal"
    ADD CONSTRAINT "EngineDataSubmittal_pkey" PRIMARY KEY (id);


--
-- Name: EngineHistoryLog EngineHistoryLog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EngineHistoryLog"
    ADD CONSTRAINT "EngineHistoryLog_pkey" PRIMARY KEY (id);


--
-- Name: Engine Engine_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Engine"
    ADD CONSTRAINT "Engine_pkey" PRIMARY KEY (id);


--
-- Name: EngineeringRecommendation EngineeringRecommendation_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EngineeringRecommendation"
    ADD CONSTRAINT "EngineeringRecommendation_pkey" PRIMARY KEY (id);


--
-- Name: Iq03Report Iq03Report_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Iq03Report"
    ADD CONSTRAINT "Iq03Report_pkey" PRIMARY KEY (id);


--
-- Name: OcrResult OcrResult_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."OcrResult"
    ADD CONSTRAINT "OcrResult_pkey" PRIMARY KEY (id);


--
-- Name: Operator Operator_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Operator"
    ADD CONSTRAINT "Operator_pkey" PRIMARY KEY (id);


--
-- Name: ReviewAction ReviewAction_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ReviewAction"
    ADD CONSTRAINT "ReviewAction_pkey" PRIMARY KEY (id);


--
-- Name: SbComplianceAudit SbComplianceAudit_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SbComplianceAudit"
    ADD CONSTRAINT "SbComplianceAudit_pkey" PRIMARY KEY (id);


--
-- Name: SbGroupResult SbGroupResult_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SbGroupResult"
    ADD CONSTRAINT "SbGroupResult_pkey" PRIMARY KEY (id);


--
-- Name: SbRelation SbRelation_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SbRelation"
    ADD CONSTRAINT "SbRelation_pkey" PRIMARY KEY (id);


--
-- Name: SbRequirementGroup SbRequirementGroup_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SbRequirementGroup"
    ADD CONSTRAINT "SbRequirementGroup_pkey" PRIMARY KEY (id);


--
-- Name: SbRequirementMember SbRequirementMember_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SbRequirementMember"
    ADD CONSTRAINT "SbRequirementMember_pkey" PRIMARY KEY (id);


--
-- Name: ServiceBulletinRead ServiceBulletinRead_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ServiceBulletinRead"
    ADD CONSTRAINT "ServiceBulletinRead_pkey" PRIMARY KEY ("userId", "serviceBulletinId");


--
-- Name: ServiceBulletin ServiceBulletin_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ServiceBulletin"
    ADD CONSTRAINT "ServiceBulletin_pkey" PRIMARY KEY (id);


--
-- Name: ShopVisitReport ShopVisitReport_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ShopVisitReport"
    ADD CONSTRAINT "ShopVisitReport_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: Aircraft_msn_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Aircraft_msn_key" ON public."Aircraft" USING btree (msn);


--
-- Name: Aircraft_registration_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Aircraft_registration_key" ON public."Aircraft" USING btree (registration);


--
-- Name: Approval_assignedToId_status_submittedAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Approval_assignedToId_status_submittedAt_idx" ON public."Approval" USING btree ("assignedToId", status, "submittedAt");


--
-- Name: Approval_eesId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Approval_eesId_key" ON public."Approval" USING btree ("eesId");


--
-- Name: ComplianceRecord_engineId_sbId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ComplianceRecord_engineId_sbId_key" ON public."ComplianceRecord" USING btree ("engineId", "sbId");


--
-- Name: EesDocument_eesNumber_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "EesDocument_eesNumber_key" ON public."EesDocument" USING btree ("eesNumber");


--
-- Name: EesDocument_sourceSbId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "EesDocument_sourceSbId_key" ON public."EesDocument" USING btree ("sourceSbId");


--
-- Name: EngineHistoryLog_previousLogId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "EngineHistoryLog_previousLogId_key" ON public."EngineHistoryLog" USING btree ("previousLogId");


--
-- Name: Engine_esn_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Engine_esn_key" ON public."Engine" USING btree (esn);


--
-- Name: EngineeringRecommendation_sbId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "EngineeringRecommendation_sbId_key" ON public."EngineeringRecommendation" USING btree ("sbId");


--
-- Name: OcrResult_serviceBulletinId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "OcrResult_serviceBulletinId_key" ON public."OcrResult" USING btree ("serviceBulletinId");


--
-- Name: Operator_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Operator_code_key" ON public."Operator" USING btree (code);


--
-- Name: ReviewAction_action_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ReviewAction_action_createdAt_idx" ON public."ReviewAction" USING btree (action, "createdAt");


--
-- Name: ReviewAction_eesId_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ReviewAction_eesId_createdAt_idx" ON public."ReviewAction" USING btree ("eesId", "createdAt");


--
-- Name: SbComplianceAudit_complianceRecordId_changedAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SbComplianceAudit_complianceRecordId_changedAt_idx" ON public."SbComplianceAudit" USING btree ("complianceRecordId", "changedAt");


--
-- Name: SbGroupResult_requirementGroupId_engineId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "SbGroupResult_requirementGroupId_engineId_key" ON public."SbGroupResult" USING btree ("requirementGroupId", "engineId");


--
-- Name: SbRelation_sourceSbId_relationType_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SbRelation_sourceSbId_relationType_idx" ON public."SbRelation" USING btree ("sourceSbId", "relationType");


--
-- Name: SbRelation_targetSbNumber_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SbRelation_targetSbNumber_idx" ON public."SbRelation" USING btree ("targetSbNumber");


--
-- Name: SbRequirementGroup_groupCode_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "SbRequirementGroup_groupCode_key" ON public."SbRequirementGroup" USING btree ("groupCode");


--
-- Name: SbRequirementMember_requirementGroupId_targetSbNumber_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "SbRequirementMember_requirementGroupId_targetSbNumber_key" ON public."SbRequirementMember" USING btree ("requirementGroupId", "targetSbNumber");


--
-- Name: ServiceBulletin_operatorId_receivedAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ServiceBulletin_operatorId_receivedAt_idx" ON public."ServiceBulletin" USING btree ("operatorId", "receivedAt");


--
-- Name: ServiceBulletin_sbNumber_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ServiceBulletin_sbNumber_key" ON public."ServiceBulletin" USING btree ("sbNumber");


--
-- Name: ServiceBulletin_status_receivedAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ServiceBulletin_status_receivedAt_idx" ON public."ServiceBulletin" USING btree (status, "receivedAt");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: User_employeeNumber_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_employeeNumber_key" ON public."User" USING btree ("employeeNumber");


--
-- Name: User_username_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_username_key" ON public."User" USING btree (username);


--
-- Name: Aircraft Aircraft_operatorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Aircraft"
    ADD CONSTRAINT "Aircraft_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES public."Operator"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Approval Approval_eesId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Approval"
    ADD CONSTRAINT "Approval_eesId_fkey" FOREIGN KEY ("eesId") REFERENCES public."EesDocument"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ComplianceRecord ComplianceRecord_edsId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ComplianceRecord"
    ADD CONSTRAINT "ComplianceRecord_edsId_fkey" FOREIGN KEY ("edsId") REFERENCES public."EngineDataSubmittal"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ComplianceRecord ComplianceRecord_engineId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ComplianceRecord"
    ADD CONSTRAINT "ComplianceRecord_engineId_fkey" FOREIGN KEY ("engineId") REFERENCES public."Engine"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ComplianceRecord ComplianceRecord_iq03Id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ComplianceRecord"
    ADD CONSTRAINT "ComplianceRecord_iq03Id_fkey" FOREIGN KEY ("iq03Id") REFERENCES public."Iq03Report"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ComplianceRecord ComplianceRecord_resolvedByComplianceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ComplianceRecord"
    ADD CONSTRAINT "ComplianceRecord_resolvedByComplianceId_fkey" FOREIGN KEY ("resolvedByComplianceId") REFERENCES public."ComplianceRecord"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ComplianceRecord ComplianceRecord_sbId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ComplianceRecord"
    ADD CONSTRAINT "ComplianceRecord_sbId_fkey" FOREIGN KEY ("sbId") REFERENCES public."ServiceBulletin"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ComplianceRecord ComplianceRecord_svrId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ComplianceRecord"
    ADD CONSTRAINT "ComplianceRecord_svrId_fkey" FOREIGN KEY ("svrId") REFERENCES public."ShopVisitReport"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DocumentAccessoriesList DocumentAccessoriesList_edsId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DocumentAccessoriesList"
    ADD CONSTRAINT "DocumentAccessoriesList_edsId_fkey" FOREIGN KEY ("edsId") REFERENCES public."EngineDataSubmittal"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DocumentAccessoriesList DocumentAccessoriesList_iq03Id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DocumentAccessoriesList"
    ADD CONSTRAINT "DocumentAccessoriesList_iq03Id_fkey" FOREIGN KEY ("iq03Id") REFERENCES public."Iq03Report"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DocumentAccessoriesList DocumentAccessoriesList_svrId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DocumentAccessoriesList"
    ADD CONSTRAINT "DocumentAccessoriesList_svrId_fkey" FOREIGN KEY ("svrId") REFERENCES public."ShopVisitReport"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DocumentConfigurationItem DocumentConfigurationItem_edsId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DocumentConfigurationItem"
    ADD CONSTRAINT "DocumentConfigurationItem_edsId_fkey" FOREIGN KEY ("edsId") REFERENCES public."EngineDataSubmittal"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DocumentConfigurationItem DocumentConfigurationItem_iq03Id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DocumentConfigurationItem"
    ADD CONSTRAINT "DocumentConfigurationItem_iq03Id_fkey" FOREIGN KEY ("iq03Id") REFERENCES public."Iq03Report"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DocumentConfigurationItem DocumentConfigurationItem_svrId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DocumentConfigurationItem"
    ADD CONSTRAINT "DocumentConfigurationItem_svrId_fkey" FOREIGN KEY ("svrId") REFERENCES public."ShopVisitReport"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DocumentLlpStatus DocumentLlpStatus_edsId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DocumentLlpStatus"
    ADD CONSTRAINT "DocumentLlpStatus_edsId_fkey" FOREIGN KEY ("edsId") REFERENCES public."EngineDataSubmittal"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DocumentLlpStatus DocumentLlpStatus_iq03Id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DocumentLlpStatus"
    ADD CONSTRAINT "DocumentLlpStatus_iq03Id_fkey" FOREIGN KEY ("iq03Id") REFERENCES public."Iq03Report"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DocumentLlpStatus DocumentLlpStatus_svrId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DocumentLlpStatus"
    ADD CONSTRAINT "DocumentLlpStatus_svrId_fkey" FOREIGN KEY ("svrId") REFERENCES public."ShopVisitReport"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DocumentSbStatus DocumentSbStatus_edsId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DocumentSbStatus"
    ADD CONSTRAINT "DocumentSbStatus_edsId_fkey" FOREIGN KEY ("edsId") REFERENCES public."EngineDataSubmittal"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DocumentSbStatus DocumentSbStatus_iq03Id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DocumentSbStatus"
    ADD CONSTRAINT "DocumentSbStatus_iq03Id_fkey" FOREIGN KEY ("iq03Id") REFERENCES public."Iq03Report"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DocumentSbStatus DocumentSbStatus_svrId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DocumentSbStatus"
    ADD CONSTRAINT "DocumentSbStatus_svrId_fkey" FOREIGN KEY ("svrId") REFERENCES public."ShopVisitReport"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EesDocument EesDocument_sourceSbId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EesDocument"
    ADD CONSTRAINT "EesDocument_sourceSbId_fkey" FOREIGN KEY ("sourceSbId") REFERENCES public."ServiceBulletin"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EesEvaluationItem EesEvaluationItem_eesDocumentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EesEvaluationItem"
    ADD CONSTRAINT "EesEvaluationItem_eesDocumentId_fkey" FOREIGN KEY ("eesDocumentId") REFERENCES public."EesDocument"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EngineActiveComponent EngineActiveComponent_engineId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EngineActiveComponent"
    ADD CONSTRAINT "EngineActiveComponent_engineId_fkey" FOREIGN KEY ("engineId") REFERENCES public."Engine"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EngineDataSubmittal EngineDataSubmittal_engineId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EngineDataSubmittal"
    ADD CONSTRAINT "EngineDataSubmittal_engineId_fkey" FOREIGN KEY ("engineId") REFERENCES public."Engine"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: EngineHistoryLog EngineHistoryLog_changedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EngineHistoryLog"
    ADD CONSTRAINT "EngineHistoryLog_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: EngineHistoryLog EngineHistoryLog_edsId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EngineHistoryLog"
    ADD CONSTRAINT "EngineHistoryLog_edsId_fkey" FOREIGN KEY ("edsId") REFERENCES public."EngineDataSubmittal"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: EngineHistoryLog EngineHistoryLog_eesId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EngineHistoryLog"
    ADD CONSTRAINT "EngineHistoryLog_eesId_fkey" FOREIGN KEY ("eesId") REFERENCES public."EesDocument"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: EngineHistoryLog EngineHistoryLog_engineId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EngineHistoryLog"
    ADD CONSTRAINT "EngineHistoryLog_engineId_fkey" FOREIGN KEY ("engineId") REFERENCES public."Engine"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EngineHistoryLog EngineHistoryLog_iq03Id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EngineHistoryLog"
    ADD CONSTRAINT "EngineHistoryLog_iq03Id_fkey" FOREIGN KEY ("iq03Id") REFERENCES public."Iq03Report"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: EngineHistoryLog EngineHistoryLog_previousLogId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EngineHistoryLog"
    ADD CONSTRAINT "EngineHistoryLog_previousLogId_fkey" FOREIGN KEY ("previousLogId") REFERENCES public."EngineHistoryLog"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: EngineHistoryLog EngineHistoryLog_svrId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EngineHistoryLog"
    ADD CONSTRAINT "EngineHistoryLog_svrId_fkey" FOREIGN KEY ("svrId") REFERENCES public."ShopVisitReport"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Engine Engine_aircraftId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Engine"
    ADD CONSTRAINT "Engine_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES public."Aircraft"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: EngineeringRecommendation EngineeringRecommendation_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EngineeringRecommendation"
    ADD CONSTRAINT "EngineeringRecommendation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: EngineeringRecommendation EngineeringRecommendation_sbId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EngineeringRecommendation"
    ADD CONSTRAINT "EngineeringRecommendation_sbId_fkey" FOREIGN KEY ("sbId") REFERENCES public."ServiceBulletin"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Iq03Report Iq03Report_engineId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Iq03Report"
    ADD CONSTRAINT "Iq03Report_engineId_fkey" FOREIGN KEY ("engineId") REFERENCES public."Engine"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: OcrResult OcrResult_serviceBulletinId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."OcrResult"
    ADD CONSTRAINT "OcrResult_serviceBulletinId_fkey" FOREIGN KEY ("serviceBulletinId") REFERENCES public."ServiceBulletin"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ReviewAction ReviewAction_actorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ReviewAction"
    ADD CONSTRAINT "ReviewAction_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ReviewAction ReviewAction_eesId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ReviewAction"
    ADD CONSTRAINT "ReviewAction_eesId_fkey" FOREIGN KEY ("eesId") REFERENCES public."EesDocument"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SbComplianceAudit SbComplianceAudit_changedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SbComplianceAudit"
    ADD CONSTRAINT "SbComplianceAudit_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SbComplianceAudit SbComplianceAudit_complianceRecordId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SbComplianceAudit"
    ADD CONSTRAINT "SbComplianceAudit_complianceRecordId_fkey" FOREIGN KEY ("complianceRecordId") REFERENCES public."ComplianceRecord"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SbGroupResult SbGroupResult_engineId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SbGroupResult"
    ADD CONSTRAINT "SbGroupResult_engineId_fkey" FOREIGN KEY ("engineId") REFERENCES public."Engine"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SbGroupResult SbGroupResult_requirementGroupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SbGroupResult"
    ADD CONSTRAINT "SbGroupResult_requirementGroupId_fkey" FOREIGN KEY ("requirementGroupId") REFERENCES public."SbRequirementGroup"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SbGroupResult SbGroupResult_satisfiedByComplianceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SbGroupResult"
    ADD CONSTRAINT "SbGroupResult_satisfiedByComplianceId_fkey" FOREIGN KEY ("satisfiedByComplianceId") REFERENCES public."ComplianceRecord"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SbRelation SbRelation_sourceSbId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SbRelation"
    ADD CONSTRAINT "SbRelation_sourceSbId_fkey" FOREIGN KEY ("sourceSbId") REFERENCES public."ServiceBulletin"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SbRequirementMember SbRequirementMember_requirementGroupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SbRequirementMember"
    ADD CONSTRAINT "SbRequirementMember_requirementGroupId_fkey" FOREIGN KEY ("requirementGroupId") REFERENCES public."SbRequirementGroup"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ServiceBulletin ServiceBulletin_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ServiceBulletin"
    ADD CONSTRAINT "ServiceBulletin_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ServiceBulletin ServiceBulletin_operatorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ServiceBulletin"
    ADD CONSTRAINT "ServiceBulletin_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES public."Operator"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ServiceBulletin ServiceBulletin_updatedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ServiceBulletin"
    ADD CONSTRAINT "ServiceBulletin_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ShopVisitReport ShopVisitReport_engineId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ShopVisitReport"
    ADD CONSTRAINT "ShopVisitReport_engineId_fkey" FOREIGN KEY ("engineId") REFERENCES public."Engine"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: User User_operatorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES public."Operator"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict OrjdYYB12KoXdq0gsf9LOke3mX5nuljSAYyFYXoTAwyZu5KcjhLw6Re3kNU1niC

