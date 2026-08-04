require('dotenv').config();

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const prisma = require('../src/db');
const { generateId } = require('../src/utils/idGenerator');

const SB_NUMBER = 'SB 72-0846 R02';
const EES_NUMBER = 'EES-GA-SB-72-0846-R02';
const PDF_FILE_NAME = 'SB_GE90_72_0846_R02.pdf';
const PDF_SHA256 = '80be0a7a89fdc4b939017356393e6d1deb9631ac0ee69d3acbe118d71ac9b7f2';
const effectivityRange =
  'GE90-110B1 and GE90-115B; ESN 906-101 through 906-999, 907-001 through 907-999, ' +
  'and 901-001 through 901-411. Excludes ESN 901-412 and up and engines that have ' +
  'complied with GE90-100 S/B 72-0763.';

const references = [
  'GE90-100 Boeing 777 Aircraft Maintenance Manual (AMM), 72-00-00, Task 72-00-00-290-803-H01',
  'GEK 109993, GE90-100 Engine Manual (EM), 72-00-01, Special Procedure 004',
  'GE90-100 S/B 72-0763, Introduction of New Stages 5 through 8 Borescope Vane Assemblies without Locating Pins and Rework Procedure',
];

const rawPayload = {
  sb_code: SB_NUMBER,
  ees_number: EES_NUMBER,
  title:
    'ENGINE - Compressor Module Assembly (72-30-00) - Module Level BSI of High Pressure Compressor Stator Stage 5 Vane Sector Pin Condition',
  manufacturer: 'GE Aerospace',
  issuer: 'GE Aerospace',
  revision: 'R02',
  issue_date: '2020-10-30',
  revision_date: '2024-02-21',
  compliance_category: 7,
  impact_type: 'E',
  task_type: 'INSPECTION',
  effected_type: 'GE90-100',
  effected_model: ['GE90-110B1', 'GE90-115B'],
  aircraftType: 'B777-300ER',
  component_type: 'HPC Stator Stage 5 Vane Sector Pin',
  compliance_time_type: 'SHOP_VISIT',
  repetitive: false,
  recommendation: "Accomplish at the customer's convenience when the engine is in shop.",
  references,
  effectivity: [
    {
      itemNo: '1',
      requirement_desc:
        'Applicable to GE90-100 engines, ESN 906-101 through 906-999, 907-001 through 907-999, and 901-001 through 901-411.',
      remark:
        'Applicable models: GE90-110B1 and GE90-115B. ESN 901-412 and up are not applicable.',
      references: ['Planning Information, paragraph 1.A'],
      isApplicable: true,
      ad_related: 'N',
    },
    {
      itemNo: '2',
      requirement_desc:
        'Not applicable to engines that have complied with GE90-100 S/B 72-0763.',
      remark: 'S/B 72-0763 is the terminating action for this module-level BSI.',
      references: ['Planning Information, paragraph 1.A', 'Accomplishment Instructions, paragraph 3.C'],
      isApplicable: true,
      ad_related: 'N',
    },
  ],
  problem_evidence: [
    {
      itemNo: '3',
      requirement_desc:
        'Inspect the HPC stator stage 5 vane sector pin condition for loose, protruded, missing, or intact pins.',
      remark:
        'Loose or protruded pins can damage HPC and downstream hardware during engine operation.',
      references: ['Planning Information, paragraph 1.E', 'Figure 2', 'Figure 3'],
      isApplicable: true,
      ad_related: 'N',
    },
  ],
  description: [
    {
      itemNo: '4',
      requirement_desc:
        'Perform a module-level borescope inspection of the HPC stage 5 vane sector for pin migration through borescope port G.',
      remark:
        'Use SPL-115 right-angle flexscope or equivalent and AMM Task 72-00-00-290-803-H01.',
      references: ['Accomplishment Instructions, paragraph 3.B(1)', 'Figure 1', 'Figure 2'],
      isApplicable: true,
      ad_related: 'N',
    },
    {
      itemNo: '5',
      requirement_desc:
        'Take pictures of the pin condition and share the BSI results with the GE90 Product Support Engineer.',
      remark: 'Submit the inspection evidence through my.GEAerospace.com.',
      references: ['Accomplishment Instructions, paragraph 3.B(1)(a)5'],
      isApplicable: true,
      ad_related: 'N',
    },
    {
      itemNo: '6',
      requirement_desc:
        'If the pin is loose or protruded, remove it in accordance with GE90-100 EM 72-00-01, Special Procedure 004.',
      remark: 'If the pin is missing or intact, no corrective action is required.',
      references: ['Accomplishment Instructions, paragraphs 3.B(1)(c) and 3.B(1)(d)', 'Figure 4'],
      isApplicable: true,
      ad_related: 'N',
    },
  ],
  tooling: [
    {
      tool_number: 'SPL-115',
      description: 'Borescope - Right Angle Flexscope',
      part_numbers: ['9C1301P01', '9C1301P03'],
      cage_code: '06083',
    },
  ],
  manpower: {
    man_hours: 1,
    condition: 'After access to the compressor module assembly is available.',
  },
  concurrent_requirements: [],
  material_requirements: [],
  note:
    'Category 7; can be accomplished in shop. The BSI is no longer applicable after GE90-100 S/B 72-0763 is accomplished.',
  extraction_source: {
    file_name: 'GE90-100 SB 72-0846 R2.pdf',
    sha256: PDF_SHA256,
    page_count: 9,
    extracted_manually: true,
  },
};

const evaluations = [
  {
    id: 'ITEM-SB720846-01',
    itemNo: '1',
    paragraph: '1.A Effectivity',
    requirementDesc:
      'Applicable to GE90-100 engines, ESN 906-101 through 906-999, 907-001 through 907-999, and 901-001 through 901-411.',
    remarks:
      'Models GE90-110B1 and GE90-115B. ESN 901-412 and up are not applicable.',
    references: ['Planning Information, paragraph 1.A'],
    adRelated: 'N',
  },
  {
    id: 'ITEM-SB720846-02',
    itemNo: '2',
    paragraph: '1.A / 3.C',
    requirementDesc:
      'Confirm the engine has not complied with GE90-100 S/B 72-0763 before applying this module-level inspection.',
    remarks: 'S/B 72-0763 terminates the applicability of this BSI.',
    references: ['Planning Information, paragraph 1.A', 'Accomplishment Instructions, paragraph 3.C'],
    adRelated: 'N',
  },
  {
    id: 'ITEM-SB720846-03',
    itemNo: '3',
    paragraph: '3.B(1)',
    requirementDesc:
      'Perform a borescope inspection of the HPC stage 5 vane sector for pin migration through borescope port G.',
    remarks:
      'Use SPL-115 right-angle flexscope or equivalent and AMM Task 72-00-00-290-803-H01.',
    references: ['Accomplishment Instructions, paragraph 3.B(1)', 'Figure 1', 'Figure 2'],
    adRelated: 'N',
  },
  {
    id: 'ITEM-SB720846-04',
    itemNo: '4',
    paragraph: '3.B(1)(a)5',
    requirementDesc:
      'Take pictures of the pin condition and share the BSI results with the GE90 Product Support Engineer.',
    remarks: 'Submit the inspection evidence through my.GEAerospace.com.',
    references: ['Accomplishment Instructions, paragraph 3.B(1)(a)5'],
    adRelated: 'N',
  },
  {
    id: 'ITEM-SB720846-05',
    itemNo: '5',
    paragraph: '3.B(1)(c)',
    requirementDesc:
      'If the stage 5 vane sector pin is loose or protruded, remove the pin using GE90-100 EM 72-00-01, Special Procedure 004.',
    remarks: 'Refer to Figure 4 for the pin removal location.',
    references: ['GEK 109993, GE90-100 Engine Manual, Special Procedure 004', 'Figure 4'],
    adRelated: 'N',
  },
  {
    id: 'ITEM-SB720846-06',
    itemNo: '6',
    paragraph: '3.B(1)(d)',
    requirementDesc:
      'If the stage 5 vane sector pin is missing or intact, no corrective action is required.',
    remarks: 'Record the inspection condition and retain the supporting pictures.',
    references: ['Accomplishment Instructions, paragraph 3.B(1)(d)', 'Figure 3'],
    adRelated: 'N',
  },
];

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function ensurePdfFile() {
  const uploadDir = path.resolve(__dirname, '../uploads/sb-documents');
  const destination = path.join(uploadDir, PDF_FILE_NAME);
  fs.mkdirSync(uploadDir, { recursive: true });

  if (fs.existsSync(destination) && sha256(destination) === PDF_SHA256) {
    return destination;
  }

  const candidates = [];
  if (process.env.SB_720846_SOURCE_PDF) {
    candidates.push(path.resolve(process.env.SB_720846_SOURCE_PDF));
  }

  for (const fileName of fs.readdirSync(uploadDir)) {
    if (fileName.toLowerCase().endsWith('.pdf')) {
      candidates.push(path.join(uploadDir, fileName));
    }
  }

  const source = candidates.find((candidate) => {
    try {
      return fs.statSync(candidate).isFile() && sha256(candidate) === PDF_SHA256;
    } catch {
      return false;
    }
  });

  if (!source) {
    throw new Error(
      `Source PDF for ${SB_NUMBER} was not found. Put the PDF in ${uploadDir} ` +
        'or set SB_720846_SOURCE_PDF to its absolute path.'
    );
  }

  if (path.resolve(source) !== path.resolve(destination)) {
    fs.copyFileSync(source, destination);
  }

  return destination;
}

async function seed() {
  const storedPdfPath = ensurePdfFile();

  const result = await prisma.$transaction(async (tx) => {
    let operator = await tx.operator.findUnique({ where: { code: 'GA' } });
    if (!operator) {
      operator = await tx.operator.create({
        data: {
          id: generateId('OP'),
          code: 'GA',
          name: 'Garuda Indonesia',
        },
      });
    }

    const serviceBulletin = await tx.serviceBulletin.upsert({
      where: { sbNumber: SB_NUMBER },
      create: {
        id: generateId('SB-DOC'),
        sbNumber: SB_NUMBER,
        revision: 'R02',
        title: rawPayload.title,
        issuer: 'GE Aerospace',
        issueDate: new Date('2020-10-30T00:00:00.000Z'),
        receivedAt: new Date('2026-07-09T00:00:00.000Z'),
        status: 'ACTIVE',
        
        complianceCategory: 7,
        effectivityType: 'GE90-100',
        effectivityRange,
        compliancePeriod: "At the customer's convenience; accomplish when the engine is in shop.",
        aircraftType: 'B777-300ER',
        impactType: 'E',
        operatorId: operator.id,
        originalFileName: 'GE90-100 SB 72-0846 R2.pdf',
        storedFileName: PDF_FILE_NAME,
        applicabilitySummary: {
          engineFamily: 'GE90-100',
          models: ['GE90-110B1', 'GE90-115B'],
          shopVisitOnly: true,
          terminatingAction: 'GE90-100 S/B 72-0763',
        },
      },
      update: {
        revision: 'R02',
        title: rawPayload.title,
        issuer: 'GE Aerospace',
        issueDate: new Date('2020-10-30T00:00:00.000Z'),
        status: 'ACTIVE',
        
        complianceCategory: 7,
        effectivityType: 'GE90-100',
        effectivityRange,
        compliancePeriod: "At the customer's convenience; accomplish when the engine is in shop.",
        aircraftType: 'B777-300ER',
        impactType: 'E',
        operatorId: operator.id,
        originalFileName: 'GE90-100 SB 72-0846 R2.pdf',
        storedFileName: PDF_FILE_NAME,
        applicabilitySummary: {
          engineFamily: 'GE90-100',
          models: ['GE90-110B1', 'GE90-115B'],
          shopVisitOnly: true,
          terminatingAction: 'GE90-100 S/B 72-0763',
        },
      },
    });

    const ocrResult = await tx.ocrResult.upsert({
      where: { serviceBulletinId: serviceBulletin.id },
      create: {
        id: generateId('OCR'),
        serviceBulletinId: serviceBulletin.id,
        ocrStatus: 'EXTRACTED',
        draftStatus: 'GENERATED',
        rawPayload,
        extractedAt: new Date('2026-07-28T00:00:00.000Z'),
      },
      update: {
        ocrStatus: 'EXTRACTED',
        draftStatus: 'GENERATED',
        rawPayload,
        extractedAt: new Date('2026-07-28T00:00:00.000Z'),
      },
    });

    const conflictingEes = await tx.eesDocument.findUnique({ where: { eesNumber: EES_NUMBER } });
    if (conflictingEes && conflictingEes.sourceSbId !== serviceBulletin.id) {
      throw new Error(`${EES_NUMBER} is already linked to Service Bulletin ${conflictingEes.sourceSbId}`);
    }

    const eesDocument = await tx.eesDocument.upsert({
      where: { sourceSbId: serviceBulletin.id },
      create: {
        id: generateId('EES-DOC'),
        eesNumber: EES_NUMBER,
        sourceSbId: serviceBulletin.id,
        taskType: 'INSPECTION',
        references,
        effectedType: 'GE90-100',
        effectedModel: 'GE90-110B1, GE90-115B',
        componentType: 'HPC Stator Stage 5 Vane Sector Pin',
        complianceTimeType: 'SHOP_VISIT',
        isRepetitive: false,
        note: rawPayload.note,
        aircraftType: 'B777-300ER',
        esn: '906-101 through 906-999; 907-001 through 907-999; 901-001 through 901-411',
        reviewStatus: 'PENDING',
        isManualEdited: false,
      },
      update: {
        eesNumber: EES_NUMBER,
        taskType: 'INSPECTION',
        references,
        effectedType: 'GE90-100',
        effectedModel: 'GE90-110B1, GE90-115B',
        componentType: 'HPC Stator Stage 5 Vane Sector Pin',
        complianceTimeType: 'SHOP_VISIT',
        isRepetitive: false,
        note: rawPayload.note,
        aircraftType: 'B777-300ER',
        esn: '906-101 through 906-999; 907-001 through 907-999; 901-001 through 901-411',
        isManualEdited: false,
      },
    });

    for (const evaluation of evaluations) {
      await tx.eesEvaluationItem.upsert({
        where: { id: evaluation.id },
        create: {
          ...evaluation,
          eesDocumentId: eesDocument.id,
          taskType: 'INSPECTION',
          warranty: false,
          rep: 'NO',
          isApplicable: true,
        },
        update: {
          eesDocumentId: eesDocument.id,
          itemNo: evaluation.itemNo,
          paragraph: evaluation.paragraph,
          requirementDesc: evaluation.requirementDesc,
          remarks: evaluation.remarks,
          references: evaluation.references,
          adRelated: evaluation.adRelated,
          taskType: 'INSPECTION',
          warranty: false,
          rep: 'NO',
          dueAt: null,
          isApplicable: true,
        },
      });
    }

    const engineeringRecommendation = await tx.engineeringRecommendation.upsert({
      where: { sbId: serviceBulletin.id },
      create: {
        id: generateId('ER'),
        sbId: serviceBulletin.id,
        recommendedAction: 'COMPLY',
        priorityLevel: 'LOW',
        engineeringNotes:
          "Perform the module-level BSI at the customer's convenience during a shop visit. Remove loose or protruded pins per EM Special Procedure 004.",
        isDeferable: true,
        egtMarginCheck: false,
      },
      update: {
        recommendedAction: 'COMPLY',
        priorityLevel: 'LOW',
        engineeringNotes:
          "Perform the module-level BSI at the customer's convenience during a shop visit. Remove loose or protruded pins per EM Special Procedure 004.",
        isDeferable: true,
        egtMarginCheck: false,
      },
    });

    return {
      operator,
      serviceBulletin,
      ocrResult,
      eesDocument,
      engineeringRecommendation,
    };
  });

  const evaluationCount = await prisma.eesEvaluationItem.count({
    where: { eesDocumentId: result.eesDocument.id },
  });

  console.log('Seed completed successfully.');
  console.table({
    serviceBulletin: {
      id: result.serviceBulletin.id,
      number: result.serviceBulletin.sbNumber,
    },
    ocrResult: {
      id: result.ocrResult.id,
      status: result.ocrResult.ocrStatus,
    },
    eesDocument: {
      id: result.eesDocument.id,
      number: result.eesDocument.eesNumber,
    },
    evaluationItems: {
      id: String(evaluationCount),
      number: 'records',
    },
    pdf: {
      id: path.basename(storedPdfPath),
      number: PDF_SHA256.slice(0, 12),
    },
  });
}

seed()
  .catch((error) => {
    console.error('Seeder failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
