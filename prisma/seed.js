require('dotenv').config();
const prisma = require('../src/db');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const { generateId } = require('../src/utils/idGenerator');

async function copySampleFiles() {
  const uploadDir = path.join(__dirname, '../uploads');
  const ocrDir = path.join(uploadDir, 'sb-documents');
  const svrDir = path.join(uploadDir, 'svr-documents');
  
  if (!fs.existsSync(ocrDir)) fs.mkdirSync(ocrDir, { recursive: true });
  if (!fs.existsSync(svrDir)) fs.mkdirSync(svrDir, { recursive: true });

  const artifactDir = path.join(__dirname, 'seed-data');
  
  const filesToCopy = [
    { src: path.join(artifactDir, 'SB_GE90_72_0685.pdf'), dest: path.join(ocrDir, 'SB_GE90_72_0685.pdf') },
    { src: path.join(artifactDir, 'SB_LEAP_1A_72_0449.pdf'), dest: path.join(ocrDir, 'SB_LEAP_1A_72_0449.pdf') },
    { src: path.join(artifactDir, 'SVR_660235_2026.pdf'), dest: path.join(svrDir, 'SVR_660235_2026.pdf') }
  ];

  for (const file of filesToCopy) {
    if (fs.existsSync(file.src)) {
      fs.copyFileSync(file.src, file.dest);
      console.log(`Copied ${path.basename(file.dest)} successfully.`);
    } else {
      console.warn(`[WARNING] Sample file not found: ${file.src}. PDF viewer might not work in demo.`);
    }
  }
}

async function main() {
  console.log('🧹 Cleaning up database tables...');
  await prisma.reviewAction.deleteMany({});
  await prisma.approval.deleteMany({});
  await prisma.serviceBulletinRead.deleteMany({});
  await prisma.complianceRecord.deleteMany({});
  
  // Updated model names based on current schema
  await prisma.documentConfigurationItem.deleteMany({});
  await prisma.documentLlpStatus.deleteMany({});
  await prisma.documentSbStatus.deleteMany({});
  await prisma.documentAccessoriesList.deleteMany({});
  
  await prisma.sbGroupResult.deleteMany({});
  await prisma.sbRequirementMember.deleteMany({});
  await prisma.sbRequirementGroup.deleteMany({});
  await prisma.sbComplianceAudit.deleteMany({});
  await prisma.engineHistoryLog.deleteMany({});
  await prisma.engineActiveComponent.deleteMany({});
  await prisma.iq03Report.deleteMany({});
  await prisma.engineDataSubmittal.deleteMany({});
  
  await prisma.shopVisitReport.deleteMany({});
  await prisma.eesEvaluationItem.deleteMany({});
  await prisma.eesDocument.deleteMany({});
  await prisma.engineeringRecommendation.deleteMany({});
  await prisma.ocrResult.deleteMany({});

  await prisma.sbRelation.deleteMany({});
  await prisma.serviceBulletin.deleteMany({});
  await prisma.engine.deleteMany({});
  await prisma.aircraft.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.operator.deleteMany({});
  console.log('✅ Cleanup completed.\n');

  await copySampleFiles();
  console.log('\n🏢 Seeding Operators...');
  const opGaruda = await prisma.operator.create({ data: { id: generateId('OP'), code: 'GA', name: 'Garuda Indonesia' } });
  const opCitilink = await prisma.operator.create({ data: { id: generateId('OP'), code: 'QG', name: 'Citilink' } });

  console.log('👤 Seeding Users...');
  const pass = await bcrypt.hash('tech123', 10);
  const adminPass = await bcrypt.hash('admin123', 10);
  
  const userAdmin = await prisma.user.create({ data: { id: generateId('USR'), email: 'admin@gmf.co.id', username: 'admin', password: adminPass, role: 'ADMIN' } });
  const firstEng = await prisma.user.create({ data: { id: generateId('USR'), email: 'firsteng@gmf.co.id', username: 'first_engineer', password: pass, role: 'ENGINEER', operatorId: opGaruda.id } });
  const secondEng = await prisma.user.create({ data: { id: generateId('USR'), email: 'secondeng@gmf.co.id', username: 'second_engineer', password: pass, role: 'MANAGER', operatorId: opGaruda.id } });
  const tech = await prisma.user.create({ data: { id: generateId('USR'), email: 'technician@gmf.co.id', username: 'technician', password: pass, role: 'TECHNICIAN', operatorId: opGaruda.id } });

  const firstEngCiti = await prisma.user.create({ data: { id: generateId('USR'), email: 'firsteng.citilink@gmf.co.id', username: 'first_eng_citi', password: pass, role: 'ENGINEER', operatorId: opCitilink.id } });

  console.log('✈️ Seeding Aircraft Fleet...');
  const aircrafts = [
    { registration: 'PK-GIA', msn: '33501', aircraftType: 'B737-800', operatorId: opGaruda.id },
    { registration: 'PK-GTA', msn: '6432', aircraftType: 'A320-200', operatorId: opCitilink.id },
    { registration: 'PK-GIE', msn: '37701', aircraftType: 'B777-300ER', operatorId: opGaruda.id }
  ];
  const acMap = {};
  for (const ac of aircrafts) {
    const record = await prisma.aircraft.create({ data: { id: generateId('AC'), registration: ac.registration, msn: ac.msn, aircraftType: ac.aircraftType, operatorId: ac.operatorId, active: true } });
    acMap[ac.registration] = record.id;
  }

  console.log('⚙️ Seeding Engines...');
  const engines = [
    { esn: '660235', msn: '33501', model: 'CFM56-7B26E', position: '1', aircraftRegistration: 'PK-GIA' },
    { esn: 'ESN-GTA01', msn: '6432', model: 'LEAP-1A26', position: '1', aircraftRegistration: 'PK-GTA' },
    { esn: '906101', msn: '37701', model: 'GE90-115B', position: '1', aircraftRegistration: 'PK-GIE' }
  ];
  const engMap = {};
  for (const eng of engines) {
    const record = await prisma.engine.create({ data: { id: generateId('ENG'), esn: eng.esn, msn: eng.msn, model: eng.model, position: eng.position, aircraftId: acMap[eng.aircraftRegistration], active: true } });
    engMap[eng.esn] = record.id;
  }

  console.log('📑 Seeding Realistic SBs & Scenarios...');
  
  // SCENARIO 1: COMPLETED (GE90)
  const sb1 = await prisma.serviceBulletin.create({
    data: {
      id: generateId('SB'),
      sbNumber: 'GE90 SB 72-0685 R06',
      revision: 'R06',
      title: 'ENGINE - Fan Hub Frame Assembly (72-23-00) - TGB Roller Bearing Inner Race Material Change',
      issuer: 'GE Aerospace',
      issueDate: new Date('2025-12-22'),
      receivedAt: new Date('2026-07-01'),
      status: 'ACTIVE',
      complianceCategory: 3,
      aircraftType: 'B777-300ER',
      impactType: 'E',
      operatorId: opGaruda.id,
      originalFileName: 'SB_GE90_72_0685.pdf',
      storedFileName: 'SB_GE90_72_0685.pdf'
    }
  });

  const ees1 = await prisma.eesDocument.create({
    data: { id: generateId('EES'), eesNumber: `EES-GA-${sb1.id.slice(-6)}`, sourceSbId: sb1.id, reviewStatus: 'APPROVED', createdAt: new Date() }
  });

  await prisma.approval.create({
    data: { id: generateId('APP'), eesId: ees1.id, approvalLevel: 2, status: 'APPROVED', submittedById: firstEng.id, assignedToId: secondEng.id, submittedAt: new Date(), reviewedAt: new Date(), comment: 'Approved for execution' }
  });
  
  await prisma.reviewAction.create({
    data: { id: generateId('REV'), eesId: ees1.id, action: 'APPROVED', actorId: secondEng.id, actorRole: 'MANAGER', comment: 'Looks good' }
  });

  // SCENARIO 2: PENDING SECOND ENGINEER (Category 4)
  const sb2 = await prisma.serviceBulletin.create({
    data: {
      id: generateId('SB'),
      sbNumber: 'GE90 SB 72-0686 R01',
      revision: 'R01',
      title: 'ENGINE - Fan Hub Frame Assembly - Routine Inspection',
      issuer: 'GE Aerospace',
      issueDate: new Date('2026-01-10'),
      receivedAt: new Date('2026-07-02'),
      status: 'ACTIVE',
      complianceCategory: 4, // >= 4 goes to Second Engineer
      aircraftType: 'B777-300ER',
      impactType: 'E',
      operatorId: opGaruda.id,
    }
  });

  const ees2 = await prisma.eesDocument.create({
    data: { id: generateId('EES'), eesNumber: `EES-GA-${sb2.id.slice(-6)}`, sourceSbId: sb2.id, reviewStatus: 'PENDING', createdAt: new Date() }
  });

  await prisma.approval.create({
    data: { id: generateId('APP'), eesId: ees2.id, approvalLevel: 1, status: 'PENDING', submittedById: firstEng.id, assignedToId: firstEng.id, submittedAt: new Date() }
  });

  // SCENARIO 3: PENDING MANAGER (Category 3)
  const sb3 = await prisma.serviceBulletin.create({
    data: {
      id: generateId('SB'),
      sbNumber: 'LEAP-1A-72-00-0449',
      revision: '01A',
      title: 'ENGINE - GENERAL (72-00-00) - INTRODUCTION OF NEW LPTACC COOLING MANIFOLD',
      issuer: 'CFM International',
      issueDate: new Date('2026-02-02'),
      receivedAt: new Date(),
      status: 'ACTIVE',
      complianceCategory: 3, // < 4 goes to Manager for GA, but this is Citilink? Let's use Garuda to test pending-manager properly.
      aircraftType: 'B737-800',
      impactType: 'D',
      operatorId: opGaruda.id, 
    }
  });

  const ees3 = await prisma.eesDocument.create({
    data: { id: generateId('EES'), eesNumber: `EES-GA-${sb3.id.slice(-6)}`, sourceSbId: sb3.id, reviewStatus: 'PENDING', createdAt: new Date() }
  });

  await prisma.approval.create({
    data: { id: generateId('APP'), eesId: ees3.id, approvalLevel: 1, status: 'PENDING', submittedById: firstEng.id, assignedToId: secondEng.id, submittedAt: new Date() }
  });

  console.log('🔗 Seeding SB Relations...');
  // Scenario 4: A Service Bulletin to be superseded
  const sb4 = await prisma.serviceBulletin.create({
    data: {
      id: generateId('SB'),
      sbNumber: 'GE90 SB 72-0680',
      revision: 'R00',
      title: 'OLD ENGINE - Fan Hub Frame Assembly',
      issuer: 'GE Aerospace',
      issueDate: new Date('2024-01-01'),
      receivedAt: new Date('2024-02-01'),
      status: 'SUPERSEDED',
      complianceCategory: 3,
      aircraftType: 'B777-300ER',
      operatorId: opGaruda.id,
    }
  });

  // SB1 supersedes SB4
  await prisma.sbRelation.create({
    data: {
      sourceSbId: sb1.id,
      targetSbNumber: sb4.sbNumber,
      relationType: 'SUPERSEDES',
      conditionType: 'NONE'
    }
  });

  console.log('🏭 Seeding Shop Visit Report...');
  const svr1 = await prisma.shopVisitReport.create({
    data: {
      id: generateId('SVR'),
      engine: { connect: { id: engMap['660235'] } },
      engineSerialNumber: '660235',
      originalFileName: 'SVR_660235_2026.pdf',
      storedFileName: 'SVR_660235_2026.pdf',
      rawPayload: JSON.stringify({
        "engine_type": "CFM56-7B26E",
        "engine_serial_number": "660235",
        "shop_in_date": "23 FEB 2026",
        "shop_out_date": "04 MAR 2026"
      }),
      configurationReport: {
        create: [
          { engineSerialNumber: '660235', module: 'FAN', partName: 'FAN BLADE', inOut: 'IN', partNumber: '340-001-026-0', serial: 'FB12345' }
        ]
      },
      llpStatus: {
        create: [
          { engineSerialNumber: '660235', no: '1', description: 'FAN DISK', partNumber: '340-123-01', serialNumber: 'FD555' }
        ]
      },
      sbStatus: { // Replaced adStatus with sbStatus
        create: [
          { engineSerialNumber: '660235', sbNumber: '2020-0044', notificationDateOfCompliance: '01 JAN 2026', methodOfCompliance: 'INSPECTED PER SB' }
        ]
      }
    }
  });

  console.log('🔗 Seeding Compliance Record...');
  const cmp1 = await prisma.complianceRecord.create({
    data: {
      id: generateId('CMP'),
      engineId: engMap['660235'],
      sbId: sb1.id,
      svrId: svr1.id,
      status: 'COMPLIED',
      complianceDate: '04 MAR 2026',
      remarks: 'Complied during Shop Visit'
    }
  });

  console.log('📋 Seeding additional important models (EES Evaluations, EDS, IQ03, Groups, History, Audits)...');
  
  // 1. EES Evaluation Items
  await prisma.eesEvaluationItem.create({
    data: {
      id: generateId('EVAL'),
      eesDocumentId: ees1.id,
      itemNo: '1',
      requirementDesc: 'Inspect Fan Hub Frame Assembly',
      remarks: 'No cracks found',
      isApplicable: true
    }
  });

  // 2. Engine Data Submittal (EDS)
  const eds1 = await prisma.engineDataSubmittal.create({
    data: {
      id: generateId('EDS'),
      engine: { connect: { id: engMap['906101'] } },
      engineSerialNumber: '906101',
      engineType: 'GE90-115B',
      originalFileName: 'EDS_906101_2026.pdf',
      rawPayload: JSON.stringify({ "date": "10 JAN 2026", "tsn": "15000", "csn": "12000" }),
      accessoriesList: {
        create: [
          { engineSerialNumber: '906101', no: '1', description: 'Fuel Pump', installedPn: 'FP-123', installedSn: 'SN-001' }
        ]
      }
    }
  });

  // 3. IQ03 Report
  const iq03_1 = await prisma.iq03Report.create({
    data: {
      id: generateId('IQ03'),
      engine: { connect: { id: engMap['ESN-GTA01'] } },
      engineSerialNumber: 'ESN-GTA01',
      engineType: 'LEAP-1A26',
      originalFileName: 'IQ03_GTA01_2026.pdf',
      rawPayload: JSON.stringify({ "date": "15 MAR 2026" })
    }
  });

  // 4. Engine Active Component
  await prisma.engineActiveComponent.create({
    data: {
      engineId: engMap['660235'],
      partNumber: '340-001-026-0',
      partName: 'FAN BLADE',
      module: 'FAN',
      tsn: '1500',
      csn: '1200',
      lastUpdatedFrom: 'SVR'
    }
  });

  // 5. SB Requirement Group & Member & Result
  const reqGroup = await prisma.sbRequirementGroup.create({
    data: {
      groupCode: 'GRP-GE90-001',
      groupName: 'GE90 Essential Mods',
      fulfillmentRule: 'ALL_OF',
      minimumRequired: 1
    }
  });

  await prisma.sbRequirementMember.create({
    data: {
      requirementGroupId: reqGroup.id,
      targetSbNumber: sb1.sbNumber,
      sequenceNumber: 1
    }
  });

  await prisma.sbGroupResult.create({
    data: {
      requirementGroupId: reqGroup.id,
      engineId: engMap['660235'],
      fulfillmentStatus: 'SATISFIED',
      satisfiedByComplianceId: cmp1.id,
      satisfiedAt: new Date()
    }
  });

  // 6. Engine History Log
  await prisma.engineHistoryLog.create({
    data: {
      engineId: engMap['660235'],
      documentType: 'SVR',
      svrId: svr1.id,
      changedById: tech.id,
      notes: 'Initial SVR processed'
    }
  });

  // 7. SB Compliance Audit
  await prisma.sbComplianceAudit.create({
    data: {
      complianceRecordId: cmp1.id,
      previousStatus: 'OPEN',
      newStatus: 'COMPLIED',
      changeSource: 'SYSTEM',
      changeReason: 'SVR upload matched requirements',
      changedById: tech.id
    }
  });

  // 8. Service Bulletin Read
  await prisma.serviceBulletinRead.create({
    data: {
      userId: firstEng.id,
      serviceBulletinId: sb1.id
    }
  });

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => { console.error('❌ Seeder failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
