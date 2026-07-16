require('dotenv').config();
const prisma = require('../src/db');
const bcrypt = require('bcryptjs');
const { generateId } = require('../src/utils/idGenerator');

async function main() {
  console.log('🧹 Cleaning up database tables (deleting all existing data)...');

  // Delete in reverse dependency order
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

  console.log('✅ Cleanup completed.\n');

  // 1. Seed Users
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
      role: 'TECHNICIAN'
    }
  });

  console.log(`   Created Admin: ${userAdmin.email}`);
  console.log(`   Created Tech: ${userTech.email}\n`);

  // 2. Seed Aircrafts
  console.log('✈️ Seeding Aircraft Fleet...');
  const aircrafts = [
    { registration: 'PK-GIA', msn: '33501', aircraftType: 'B737-800', operator: 'Garuda Indonesia' },
    { registration: 'PK-GTA', msn: '6432', aircraftType: 'A320-200', operator: 'Citilink' },
    { registration: 'PK-GLV', msn: '7100', aircraftType: 'A320neo', operator: 'Citilink' },
    { registration: 'PK-GHA', msn: '1250', aircraftType: 'A330-300', operator: 'Garuda Indonesia' },
    { registration: 'PK-GIE', msn: '37701', aircraftType: 'B777-300ER', operator: 'Garuda Indonesia' }
  ];

  const acMap = {};
  for (const ac of aircrafts) {
    const record = await prisma.aircraft.create({
      data: {
        id: generateId('AC'),
        registration: ac.registration,
        msn: ac.msn,
        aircraftType: ac.aircraftType,
        operator: ac.operator,
        active: true
      }
    });
    acMap[ac.registration] = record.id;
    console.log(`   Aircraft: ${record.registration} (MSN: ${record.msn})`);
  }
  console.log('');

  // 3. Seed Engines
  console.log('⚙️ Seeding Engines...');
  const engines = [
    // Engine for PK-GIA
    { esn: '660235', msn: '33501', model: 'CFM56-7B26E', position: '1', aircraftRegistration: 'PK-GIA' },
    { esn: '660236', msn: '33501', model: 'CFM56-7B26E', position: '2', aircraftRegistration: 'PK-GIA' },
    // Engines for PK-GTA
    { esn: 'ESN-GTA01', msn: '6432', model: 'CFM56-5B4', position: '1', aircraftRegistration: 'PK-GTA' },
    { esn: 'ESN-GTA02', msn: '6432', model: 'CFM56-5B4', position: '2', aircraftRegistration: 'PK-GTA' },
    // Engines for PK-GLV
    { esn: 'ESN-GLV01', msn: '7100', model: 'LEAP-1A26', position: '1', aircraftRegistration: 'PK-GLV' },
    { esn: 'ESN-GLV02', msn: '7100', model: 'LEAP-1A26', position: '2', aircraftRegistration: 'PK-GLV' },
    // Engines for PK-GHA
    { esn: 'ESN-RR-7001', msn: '1250', model: 'Trent 700', position: '1', aircraftRegistration: 'PK-GHA' },
    { esn: 'ESN-RR-7002', msn: '1250', model: 'Trent 700', position: '2', aircraftRegistration: 'PK-GHA' },
    // Engines for PK-GIE (B777-300ER)
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

  // 4. Seed Airworthiness Directives (AD)
  console.log('📋 Seeding Master Airworthiness Directives (AD)...');
  const ads = [
    {
      adNumber: 'FAA AD2024-06-09',
      title: 'ENGINE LIFE LIMITED PARTS REPLACEMENT',
      issuer: 'FAA',
      issueDate: new Date('2024-06-09')
    },
    {
      adNumber: 'AD 2011-24-15',
      title: 'HPT STAGE 1 BLADES INSPECTION AND REPLACEMENT',
      issuer: 'FAA',
      issueDate: new Date('2011-12-01')
    },
    {
      adNumber: 'DGCA AD 2026-003',
      title: 'RDS SEAL SLEEVE INSPECTION AND LIFE LIMIT',
      issuer: 'DGCA',
      issueDate: new Date('2026-01-15')
    }
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

  console.log('\n🎉 Master data seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeder failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
