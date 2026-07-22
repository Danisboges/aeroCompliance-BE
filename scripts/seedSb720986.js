require('dotenv').config();
const prisma = require('../src/db');
const bcrypt = require('bcryptjs');
const { generateId } = require('../src/utils/idGenerator');
const sbFulfillmentService = require('../src/services/sbFulfillmentService');

async function seedSb720986() {
  console.log('🚀 Seeding CFM56-7B S/B 72-0986 & Realistic SB Status Scenarios...');

  // 1. Fetch or Create Garuda Operator
  let opGaruda = await prisma.operator.findFirst({ where: { code: 'GA' } });
  if (!opGaruda) {
    opGaruda = await prisma.operator.create({
      data: { id: generateId('OP'), code: 'GA', name: 'Garuda Indonesia' }
    });
  }

  // 2. Fetch or Create Users
  const pass = await bcrypt.hash('tech123', 10);
  let firstEng = await prisma.user.findFirst({ where: { username: 'first_engineer' } });
  if (!firstEng) {
    firstEng = await prisma.user.create({
      data: { id: generateId('USR'), email: 'firsteng@gmf.co.id', username: 'first_engineer', password: pass, role: 'ENGINEER', operatorId: opGaruda.id }
    });
  }

  // 3. Seed Related Service Bulletins with Diverse Lifecycle Statuses (SUPERSEDED, TERMINATED, DRAFT, OPEN)
  const relatedSbsData = [
    { sbNumber: 'CFM56-7B S/B 72-0581', title: 'ENGINE - HPC Stator Forward Assembly (72-32-00) - Stage 2 and Stage 3 Improved Inner Bushings', revision: 'Revision 01', status: 'OPEN' },
    { sbNumber: 'CFM56-7B S/B 72-0665', title: 'ENGINE - Compressor Front Stator Assembly (72-32-00) - Introduction of New Metallic-Composite VSV Bushing', revision: 'Revision 01', status: 'OPEN' },
    { sbNumber: 'CFM56-7B S/B 72-0958', title: 'ENGINE - Compressor Front Stator Assembly (72-32-00) - Introduction of New Stage 2 and Stage 3 Shrouds', revision: 'Revision 00', status: 'OPEN' },
    { sbNumber: 'CFM56-7B S/B 72-0100 R0', title: 'ENGINE - HPC Rotor Blade Inspection R0', revision: 'Revision 00', status: 'SUPERSEDED' }, // SUPERSEDED Status Example
    { sbNumber: 'CFM56-7B S/B 72-0050', title: 'ENGINE - Old Repetitive Shroud Inspection', revision: 'Revision 00', status: 'TERMINATED' }, // TERMINATED Status Example
    { sbNumber: 'CFM56-7B S/B 72-0800', title: 'ENGINE - Draft Borescope Inspection Draft', revision: 'Revision 00', status: 'DRAFT' }      // DRAFT Status Example
  ];

  const relSbMap = {};
  for (const rSb of relatedSbsData) {
    let record = await prisma.serviceBulletin.findUnique({ where: { sbNumber: rSb.sbNumber } });
    if (record) {
      await prisma.serviceBulletin.delete({ where: { id: record.id } });
    }
    record = await prisma.serviceBulletin.create({
      data: {
        id: generateId('SB-DOC'),
        sbNumber: rSb.sbNumber,
        title: rSb.title,
        revision: rSb.revision,
        issuer: 'CFM International',
        issueDate: new Date('2015-01-01'),
        status: rSb.status,
        operatorId: opGaruda.id,
        createdById: firstEng.id
      }
    });
    relSbMap[rSb.sbNumber] = record;
  }

  // 4. Seed Target SB: CFM56-7B S/B 72-0986 (Status: OPEN)
  let mainSb = await prisma.serviceBulletin.findUnique({ where: { sbNumber: 'CFM56-7B S/B 72-0986' } });
  if (mainSb) {
    await prisma.serviceBulletin.delete({ where: { id: mainSb.id } });
  }

  mainSb = await prisma.serviceBulletin.create({
    data: {
      id: generateId('SB-DOC'),
      sbNumber: 'CFM56-7B S/B 72-0986',
      revision: 'Revision 02',
      title: 'ENGINE - Compressor Front Stator Assembly (72-32-00) - On-Wing Flexible Borescope Inspection of Metallic/Hybrid VSV System',
      issuer: 'CFM International',
      issueDate: new Date('2017-08-01'),
      receivedAt: new Date('2017-08-01'),
      status: 'OPEN',
      sbType: 'RECOMMENDED',
      complianceCategory: 2,
      impactType: 'Impact B',
      aircraftType: 'B737-800',
      effectivityType: 'CFM56-7B',
      effectivityRange: 'ESNs 655117 and up, 89Y887, 89Z101 and up',
      compliancePeriod: 'one time',
      operatorId: opGaruda.id,
      createdById: firstEng.id,
      ocrResult: {
        create: {
          ocrStatus: 'EXTRACTED',
          draftStatus: 'VALIDATED',
          extractedAt: new Date(),
          rawPayload: {
            filename: "72-0986.pdf",
            mro_schema: {
              sb_code: "CFM56-7B S/B 72-0986",
              tittle: "ENGINE - Compressor Front Stator Assembly (72-32-00) - On-Wing Flexible Borescope Inspection of Metallic/Hybrid VSV System",
              manufacturer: "CFM International",
              revision_number: "Revision 02",
              issued_date: "August 01, 2017",
              effected_type: "CFM56-7B",
              compliance_category: 2,
              impact: "Impact B",
              task_type: "BOR",
              sb_relations: {
                post: {
                  sb: ["72-0581", "72-0665"],
                  operator: "ONE OF",
                  status: "CONCURRENT"
                },
                pre: {
                  sb: ["72-0958"],
                  operator: "ALL OF",
                  status: "TERMINATE"
                }
              },
              supersedes: { status: false, sb: null }
            }
          }
        }
      }
    }
  });

  console.log(`   - Main SB Created: ${mainSb.sbNumber} (Status: ${mainSb.status})`);

  // 5. Seed SB Relations (Including SUPERSEDES and TERMINATES)
  const relations = [
    { targetSbNumber: 'CFM56-7B S/B 72-0581', relationType: 'CONCURRENT', conditionType: 'POST' },
    { targetSbNumber: 'CFM56-7B S/B 72-0665', relationType: 'CONCURRENT', conditionType: 'POST' },
    { targetSbNumber: 'CFM56-7B S/B 72-0958', relationType: 'TERMINATES', conditionType: 'PRE' },
    { targetSbNumber: 'CFM56-7B S/B 72-0100 R0', relationType: 'SUPERSEDES', conditionType: 'NONE' },
    { targetSbNumber: 'CFM56-7B S/B 72-0050', relationType: 'TERMINATES', conditionType: 'NONE' }
  ];

  for (const rel of relations) {
    await prisma.sbRelation.create({
      data: {
        sourceSbId: mainSb.id,
        targetSbNumber: rel.targetSbNumber,
        relationType: rel.relationType,
        conditionType: rel.conditionType
      }
    });
  }

  // 6. Seed Requirement Group (ANY_OF for Post-72-0581 OR Post-72-0665)
  const groupCode = `POST-GRP-72-0986`;
  await prisma.sbRequirementGroup.upsert({
    where: { groupCode },
    create: {
      groupCode,
      groupName: `Prerequisite Group for ${mainSb.sbNumber} (72-0581 OR 72-0665)`,
      fulfillmentRule: 'ANY_OF',
      minimumRequired: 1,
      members: {
        create: [
          { targetSbNumber: 'CFM56-7B S/B 72-0581', sequenceNumber: 1 },
          { targetSbNumber: 'CFM56-7B S/B 72-0665', sequenceNumber: 1 }
        ]
      }
    },
    update: {}
  });

  // 7. Seed 4 Test Aircraft & Engines
  console.log('   - Seeding Fleet & Engine Scenarios...');

  const fleetScenarios = [
    {
      registration: 'PK-GIA',
      msn: '33501',
      esn: '655117',
      model: 'CFM56-7B26E',
      compliedSbNumber: 'CFM56-7B S/B 72-0581',
      expectedStatus: 'OPEN / PENDING (Applicable via Post-72-0581)'
    },
    {
      registration: 'PK-GIB',
      msn: '33502',
      esn: '892887',
      model: 'CFM56-7B24',
      compliedSbNumber: null,
      expectedStatus: 'NOT_APPLICABLE (Prerequisite Post-condition not met)'
    },
    {
      registration: 'PK-GIC',
      msn: '33503',
      esn: '660285',
      model: 'CFM56-7B27',
      compliedSbNumber: 'CFM56-7B S/B 72-0958',
      expectedStatus: 'NOT_APPLICABLE (Production ESN 66X285 Excluded)'
    },
    {
      registration: 'PK-GID',
      msn: '33504',
      esn: '894101',
      model: 'CFM56-7B26E',
      compliedSbNumber: 'CFM56-7B S/B 72-0665',
      expectedStatus: 'OPEN / PENDING (Applicable via Post-72-0665)'
    }
  ];

  for (const sc of fleetScenarios) {
    let ac = await prisma.aircraft.findUnique({ where: { registration: sc.registration } });
    if (!ac) {
      ac = await prisma.aircraft.create({
        data: { id: generateId('AC'), registration: sc.registration, msn: sc.msn, aircraftType: 'B737-800', operatorId: opGaruda.id, active: true }
      });
    }

    let eng = await prisma.engine.findUnique({ where: { esn: sc.esn } });
    if (!eng) {
      eng = await prisma.engine.create({
        data: { id: generateId('ENG'), esn: sc.esn, msn: sc.msn, model: sc.model, position: '1', aircraftId: ac.id, active: true }
      });
    }

    // Historical Compliance setup
    if (sc.compliedSbNumber && relSbMap[sc.compliedSbNumber]) {
      const relSb = relSbMap[sc.compliedSbNumber];
      const comp = await prisma.complianceRecord.upsert({
        where: { engineId_sbId: { engineId: eng.id, sbId: relSb.id } },
        create: {
          engineId: eng.id,
          sbId: relSb.id,
          status: 'COMPLIED',
          complianceDate: '2025-01-10',
          remarks: 'Accomplished during Shop Visit'
        },
        update: { status: 'COMPLIED' }
      });

      await sbFulfillmentService.onComplianceStatusChanged({
        complianceRecordId: comp.id,
        previousStatus: 'OPEN',
        newStatus: 'COMPLIED',
        changeSource: 'SYSTEM',
        changeReason: 'SEED_INITIALIZATION'
      });
    }

    // Main SB ComplianceRecord
    const mainCompStatus = (sc.compliedSbNumber && sc.esn !== '660285') ? 'PENDING' : 'NOT_APPLICABLE';
    await prisma.complianceRecord.upsert({
      where: { engineId_sbId: { engineId: eng.id, sbId: mainSb.id } },
      create: {
        engineId: eng.id,
        sbId: mainSb.id,
        status: mainCompStatus,
        remarks: `Scenario test for ${sc.esn}: ${sc.expectedStatus}`
      },
      update: { status: mainCompStatus }
    });

    console.log(`   - Engine ESN ${sc.esn} (${sc.model}): ${sc.expectedStatus}`);
  }

  // 8. Generate EES Document for SB 72-0986
  const eesDoc = await prisma.eesDocument.create({
    data: {
      id: generateId('EES-DOC'),
      eesNumber: 'EES-72-0986-001',
      sourceSbId: mainSb.id,
      taskType: 'BOR',
      references: 'Boeing 737-600/700/800/900 AMM; CFM56-7B S/B 72-0581; CFM56-7B S/B 72-0665; CFM56-7B S/B 72-0958',
      effectedType: 'CFM56-7B',
      aircraftType: 'B737-800',
      reviewStatus: 'PENDING',
      evaluations: {
        create: [
          {
            id: generateId('EES-EVAL'),
            itemNo: '1',
            paragraph: '3.A.(1)',
            requirementDesc: 'Perform flexible borescope inspection (BSI) of forward side of stage 2 and stage 3 HPC VSV inner shrouds.',
            remarks: 'Accomplish at 3:00 and 9:00 o clock positions.',
            taskType: 'BOR',
            isApplicable: true
          },
          {
            id: generateId('EES-EVAL'),
            itemNo: '2',
            paragraph: '3.A.(1)(f)',
            requirementDesc: 'For post-72-0581 or post-72-0665 and pre-72-0958 engines, check for honeycomb seal rotation.',
            remarks: 'Reinspect at 1600 +/- 100 cycles if rotation is between 0.50-0.90 inch.',
            taskType: 'BOR',
            isApplicable: true
          }
        ]
      }
    }
  });

  await prisma.approval.create({
    data: {
      eesId: eesDoc.id,
      approvalLevel: 1,
      status: 'PENDING',
      submittedById: firstEng.id,
      comment: 'Initial EES generated for CFM56-7B S/B 72-0986 inspection'
    }
  });

  console.log(`\n✨ SEEDER DIVERSITAS STATUS SUKSES!`);
  console.log(`   - SB OPEN: CFM56-7B S/B 72-0986, 72-0581, 72-0665, 72-0958`);
  console.log(`   - SB SUPERSEDES: CFM56-7B S/B 72-0100 R0`);
  console.log(`   - SB TERMINATED: CFM56-7B S/B 72-0050`);
  console.log(`   - SB DRAFT: CFM56-7B S/B 72-0800`);
  console.log(`   - Siap dites via GET /api/service-bulletins!\n`);
}

seedSb720986()
  .catch(err => {
    console.error('❌ Seeder failed:', err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
