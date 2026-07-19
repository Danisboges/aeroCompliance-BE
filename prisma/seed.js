require('dotenv').config();
const prisma = require('../src/db');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const { generateId } = require('../src/utils/idGenerator');

async function copySampleFiles() {
  const uploadDir = path.join(__dirname, '../uploads');
  const ocrDir = path.join(uploadDir, 'ocr-documents');
  const svrDir = path.join(uploadDir, 'svr-documents');
  
  if (!fs.existsSync(ocrDir)) fs.mkdirSync(ocrDir, { recursive: true });
  if (!fs.existsSync(svrDir)) fs.mkdirSync(svrDir, { recursive: true });

  const artifactDir = 'C:\\Users\\mdani\\.gemini\\antigravity\\brain\\eaec810c-d4f3-48a5-bc67-ab02edfb7641';
  
  const filesToCopy = [
    { src: path.join(artifactDir, 'media__1784467874816.pdf'), dest: path.join(ocrDir, 'SB_GE90_72_0685.pdf') },
    { src: path.join(artifactDir, 'media__1784467894153.pdf'), dest: path.join(ocrDir, 'SB_LEAP_1A_72_0449.pdf') },
    { src: path.join(artifactDir, 'media__1784457039384.pdf'), dest: path.join(svrDir, 'SVR_660235_2026.pdf') }
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
  await prisma.svrConfigurationItem.deleteMany({});
  await prisma.svrLlpStatus.deleteMany({});
  await prisma.svrAdStatus.deleteMany({});
  await prisma.shopVisitReport.deleteMany({});
  await prisma.eesEvaluationItem.deleteMany({});
  await prisma.eesDocument.deleteMany({});
  await prisma.engineeringRecommendation.deleteMany({});
  await prisma.ocrResult.deleteMany({});

  await prisma.serviceBulletin.deleteMany({});
  await prisma.airworthinessDirective.deleteMany({});
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
  const firstEng = await prisma.user.create({ data: { id: generateId('USR'), email: 'firsteng@gmf.co.id', username: 'first_engineer', password: pass, role: 'FIRST_ENGINEER', operatorId: opGaruda.id } });
  const secondEng = await prisma.user.create({ data: { id: generateId('USR'), email: 'secondeng@gmf.co.id', username: 'second_engineer', password: pass, role: 'SECOND_ENGINEER', operatorId: opGaruda.id } });
  const tech = await prisma.user.create({ data: { id: generateId('USR'), email: 'technician@gmf.co.id', username: 'technician', password: pass, role: 'TECHNICIAN', operatorId: opGaruda.id } });

  const firstEngCiti = await prisma.user.create({ data: { id: generateId('USR'), email: 'firsteng.citilink@gmf.co.id', username: 'first_eng_citi', password: pass, role: 'FIRST_ENGINEER', operatorId: opCitilink.id } });

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
    { esn: '660235', msn: '33501', model: 'CFM56-7B26E', position: '1', aircraftRegistration: 'PK-GIA' }, // Matches SVR
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
  
  await prisma.ocrResult.create({
    data: {
      id: generateId('OCR'),
      serviceBulletinId: sb1.id,
      ocrStatus: 'EXTRACTED',
      draftStatus: 'GENERATED',
      rawPayload: JSON.stringify({
        "sb_code": "SB 72-0685 R06",
        "tittle": "ENGINE - Fan Hub Frame Assembly (72-23-00) - TGB Roller Bearing Inner Race Material Change",
        "effected_type": "GE90-100",
        "effected_model": ["-110B1", "-115B"],
        "compliance_category": 3,
        "task_type": "REP",
        "references": "GE90-100 Boeing 777 Aircraft Maintenance Manual",
        "problem_evidence": [{"requirement_desc": "Cracking has been found on the TGB radial roller bearing inner race.", "remark": "Cracks induced by fretting"}],
        "description": [{"requirement_desc": "Introduce new and reworked TGB assemblies", "remark": "New inner race of TGB radial roller bearing is made of new material"}]
      })
    }
  });

  await prisma.engineeringRecommendation.create({
    data: { id: generateId('ER'), sbId: sb1.id, recommendedAction: 'COMPLY', priorityLevel: 'HIGH', engineeringNotes: 'Perform at next shop visit' }
  });

  const ees1 = await prisma.eesDocument.create({
    data: { id: generateId('EES'), eesNumber: `EES-GA-${sb1.id.slice(-6)}`, sourceSbId: sb1.id, reviewStatus: 'APPROVED', createdAt: new Date() }
  });

  await prisma.approval.create({
    data: { id: generateId('APP'), eesId: ees1.id, approvalLevel: 2, status: 'APPROVED', submittedById: firstEng.id, assignedToId: secondEng.id, submittedAt: new Date(), reviewedAt: new Date(), comment: 'Approved for execution' }
  });
  
  await prisma.reviewAction.create({
    data: { id: generateId('REV'), eesId: ees1.id, action: 'APPROVED', actorId: secondEng.id, actorRole: 'SECOND_ENGINEER', comment: 'Looks good' }
  });

  // SCENARIO 2: NEW / DRAFT (LEAP-1A)
  const sb2 = await prisma.serviceBulletin.create({
    data: {
      id: generateId('SB'),
      sbNumber: 'LEAP-1A-72-00-0449',
      revision: '01A',
      title: 'ENGINE - GENERAL (72-00-00) - INTRODUCTION OF NEW LPTACC COOLING MANIFOLD ASSY 2 AND A NEW BRACKET',
      issuer: 'CFM International',
      issueDate: new Date('2026-02-02'),
      receivedAt: new Date(),
      status: 'ACTIVE',
      complianceCategory: 3,
      aircraftType: 'A320-200',
      impactType: 'D',
      operatorId: opCitilink.id,
      originalFileName: 'SB_LEAP_1A_72_0449.pdf',
      storedFileName: 'SB_LEAP_1A_72_0449.pdf'
    }
  });

  await prisma.ocrResult.create({
    data: {
      id: generateId('OCR'),
      serviceBulletinId: sb2.id,
      ocrStatus: 'EXTRACTED',
      draftStatus: 'REVIEW_REQUIRED',
      rawPayload: JSON.stringify({
        "sb_code": "LEAP-1A-72-00-0449",
        "tittle": "INTRODUCTION OF NEW LPTACC COOLING MANIFOLD ASSY 2 AND A NEW BRACKET",
        "effected_type": "LEAP-1A",
        "effected_model": ["LEAP-1A26"],
        "compliance_category": 3,
        "task_type": "MOD",
        "references": "Airbus A318/A319/A320/A321 AMM",
        "problem_evidence": [{"requirement_desc": "Wear on Oil Tube P/N 362-130-102-0 was detected", "remark": "Insufficient minimum gap"}],
        "description": [{"requirement_desc": "Introduction of a new Bracket", "remark": "Replacement of parts"}]
      })
    }
  });

  // SCENARIO 3: SHOP VISIT REPORT
  console.log('🏭 Seeding Shop Visit Report...');
  await prisma.shopVisitReport.create({
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
        "shop_out_date": "04 MAR 2026",
        "reason_for_shop_visit": "HPT Blades RRT (SB 72-1082)",
        "tsn": "27680",
        "csn": "17946"
      })
    }
  });

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => { console.error('❌ Seeder failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
