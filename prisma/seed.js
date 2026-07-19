require('dotenv').config();
const prisma = require('../src/db');
const bcrypt = require('bcryptjs');
const { generateId } = require('../src/utils/idGenerator');

async function main() {
  console.log('🧹 Cleaning up database tables (deleting all existing data)...');

  // Delete in reverse dependency order
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

  // 1. Seed Operators
  console.log('🏢 Seeding Operators...');
  const opGaruda = await prisma.operator.create({
    data: { id: generateId('OP'), code: 'GA', name: 'Garuda Indonesia' }
  });
  const opCitilink = await prisma.operator.create({
    data: { id: generateId('OP'), code: 'QG', name: 'Citilink' }
  });
  console.log(`   Created Operator: ${opGaruda.name}`);
  console.log(`   Created Operator: ${opCitilink.name}\n`);

  // 2. Seed Users
  console.log('👤 Seeding Users...');
  const saltRounds = 10;
  const adminPassword = await bcrypt.hash('admin123', saltRounds);
  const techPassword = await bcrypt.hash('tech123', saltRounds);

  const userAdmin = await prisma.user.create({
    data: {
      id: generateId('USR'),
      email: 'admin@gmf.co.id',
      username: 'admin',
      password: adminPassword,
      role: 'ADMIN'
    }
  });

  const userTech = await prisma.user.create({
    data: {
      id: generateId('USR'),
      email: 'technician@gmf.co.id',
      username: 'technician',
      password: techPassword,
      role: 'TECHNICIAN',
      operatorId: opGaruda.id
    }
  });

  const firstEng = await prisma.user.create({
    data: {
      id: generateId('USR'),
      email: 'firsteng@gmf.co.id',
      username: 'first_engineer',
      password: techPassword,
      role: 'FIRST_ENGINEER',
      operatorId: opGaruda.id
    }
  });

  const secondEng = await prisma.user.create({
    data: {
      id: generateId('USR'),
      email: 'secondeng@gmf.co.id',
      username: 'second_engineer',
      password: techPassword,
      role: 'SECOND_ENGINEER',
      operatorId: opGaruda.id
    }
  });

  console.log(`   Created Admin: ${userAdmin.email}`);
  console.log(`   Created Tech: ${userTech.email}`);
  console.log(`   Created 1st Eng: ${firstEng.email}`);
  console.log(`   Created 2nd Eng: ${secondEng.email}\n`);

  // 3. Seed Aircrafts
  console.log('✈️ Seeding Aircraft Fleet...');
  const aircrafts = [
    { registration: 'PK-GIA', msn: '33501', aircraftType: 'B737-800', operatorId: opGaruda.id },
    { registration: 'PK-GTA', msn: '6432', aircraftType: 'A320-200', operatorId: opCitilink.id },
    { registration: 'PK-GLV', msn: '7100', aircraftType: 'A320neo', operatorId: opCitilink.id },
    { registration: 'PK-GHA', msn: '1250', aircraftType: 'A330-300', operatorId: opGaruda.id },
    { registration: 'PK-GIE', msn: '37701', aircraftType: 'B777-300ER', operatorId: opGaruda.id }
  ];

  const acMap = {};
  for (const ac of aircrafts) {
    const record = await prisma.aircraft.create({
      data: {
        id: generateId('AC'),
        registration: ac.registration,
        msn: ac.msn,
        aircraftType: ac.aircraftType,
        operatorId: ac.operatorId,
        active: true
      }
    });
    acMap[ac.registration] = record.id;
    console.log(`   Aircraft: ${record.registration} (MSN: ${record.msn})`);
  }
  console.log('');

  // 4. Seed Engines
  console.log('⚙️ Seeding Engines...');
  const engines = [
    { esn: '660235', msn: '33501', model: 'CFM56-7B26E', position: '1', aircraftRegistration: 'PK-GIA' },
    { esn: '660236', msn: '33501', model: 'CFM56-7B26E', position: '2', aircraftRegistration: 'PK-GIA' },
    { esn: 'ESN-GTA01', msn: '6432', model: 'CFM56-5B4', position: '1', aircraftRegistration: 'PK-GTA' },
    { esn: 'ESN-GTA02', msn: '6432', model: 'CFM56-5B4', position: '2', aircraftRegistration: 'PK-GTA' },
    { esn: 'ESN-GLV01', msn: '7100', model: 'LEAP-1A26', position: '1', aircraftRegistration: 'PK-GLV' },
    { esn: 'ESN-GLV02', msn: '7100', model: 'LEAP-1A26', position: '2', aircraftRegistration: 'PK-GLV' },
    { esn: 'ESN-RR-7001', msn: '1250', model: 'Trent 700', position: '1', aircraftRegistration: 'PK-GHA' },
    { esn: 'ESN-RR-7002', msn: '1250', model: 'Trent 700', position: '2', aircraftRegistration: 'PK-GHA' },
    { esn: '906101', msn: '37701', model: 'GE90-115B', position: '1', aircraftRegistration: 'PK-GIE' },
    { esn: '906102', msn: '37701', model: 'GE90-115B', position: '2', aircraftRegistration: 'PK-GIE' }
  ];

  for (const eng of engines) {
    const record = await prisma.engine.create({
      data: {
        id: generateId('ENG'),
        esn: eng.esn,
        msn: eng.msn,
        model: eng.model,
        position: eng.position,
        aircraftId: acMap[eng.aircraftRegistration],
        active: true
      }
    });
    console.log(`   Engine ESN: ${record.esn} on ${eng.aircraftRegistration} [Pos: ${record.position}]`);
  }
  console.log('');

  // 5. Seed Airworthiness Directives (AD)
  console.log('📋 Seeding Master Airworthiness Directives (AD)...');
  const ads = [
    { adNumber: 'FAA AD2024-06-09', title: 'ENGINE LIFE LIMITED PARTS REPLACEMENT', issuer: 'FAA', issueDate: new Date('2024-06-09') },
    { adNumber: 'AD 2011-24-15', title: 'HPT STAGE 1 BLADES INSPECTION AND REPLACEMENT', issuer: 'FAA', issueDate: new Date('2011-12-01') },
    { adNumber: 'DGCA AD 2026-003', title: 'RDS SEAL SLEEVE INSPECTION AND LIFE LIMIT', issuer: 'DGCA', issueDate: new Date('2026-01-15') }
  ];

  for (const ad of ads) {
    const record = await prisma.airworthinessDirective.create({
      data: {
        id: generateId('AD'),
        adNumber: ad.adNumber,
        title: ad.title,
        issuer: ad.issuer,
        issueDate: ad.issueDate,
        status: 'ACTIVE'
      }
    });
    console.log(`   AD: ${record.adNumber} - ${record.title}`);
  }
  console.log('');

  // 6. Seed Dashboard Mock Data
  console.log('📊 Seeding Dashboard Data (SB, EES, Approval, ReviewAction)...');
  
  // Create an SB for Garuda
  const sb1 = await prisma.serviceBulletin.create({
    data: {
      id: generateId('SB'),
      sbNumber: 'GE90 SB 72-1215 R01',
      revision: 'R01',
      title: 'Engine Fuel System Improvement',
      issuer: 'GE Aviation',
      issueDate: new Date('2026-07-01'),
      receivedAt: new Date('2026-07-15'),
      status: 'ACTIVE',
      complianceCategory: 3,
      aircraftType: 'B777-300ER',
      impactType: 'C',
      operatorId: opGaruda.id
    }
  });

  const ees1 = await prisma.eesDocument.create({
    data: {
      id: generateId('EES'),
      eesNumber: 'EES-GA-001',
      sourceSbId: sb1.id,
      reviewStatus: 'PENDING',
      createdAt: new Date('2026-07-16')
    }
  });

  const approval1 = await prisma.approval.create({
    data: {
      id: generateId('APP'),
      eesId: ees1.id,
      approvalLevel: 2,
      status: 'PENDING',
      submittedById: firstEng.id,
      assignedToId: secondEng.id,
      submittedAt: new Date('2026-07-16')
    }
  });

  // Create another SB for Garuda (Approved)
  const sb2 = await prisma.serviceBulletin.create({
    data: {
      id: generateId('SB'),
      sbNumber: 'CFM SB 72-0001',
      revision: 'ORIGINAL',
      title: 'HPT Blade Inspection',
      issuer: 'CFM International',
      issueDate: new Date('2026-06-01'),
      receivedAt: new Date('2026-07-10'),
      status: 'ACTIVE',
      complianceCategory: 4,
      aircraftType: 'B737-800',
      impactType: 'S',
      operatorId: opGaruda.id
    }
  });

  const ees2 = await prisma.eesDocument.create({
    data: {
      id: generateId('EES'),
      eesNumber: 'EES-GA-002',
      sourceSbId: sb2.id,
      reviewStatus: 'APPROVED',
      createdAt: new Date('2026-07-11')
    }
  });

  const approval2 = await prisma.approval.create({
    data: {
      id: generateId('APP'),
      eesId: ees2.id,
      approvalLevel: 2,
      status: 'APPROVED',
      submittedById: firstEng.id,
      assignedToId: secondEng.id,
      submittedAt: new Date('2026-07-11'),
      reviewedAt: new Date('2026-07-12'),
      comment: 'Approved for implementation'
    }
  });

  await prisma.reviewAction.create({
    data: {
      id: generateId('REV'),
      eesId: ees2.id,
      action: 'APPROVED',
      actorId: secondEng.id,
      actorRole: 'SECOND_ENGINEER',
      createdAt: new Date('2026-07-12'),
      comment: 'Approved for implementation'
    }
  });

  console.log(`   Created mock SB and EES data for dashboard.\n`);

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeder failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
