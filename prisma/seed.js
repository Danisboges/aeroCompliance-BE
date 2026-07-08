require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('../src/db/index.js');
const { generateId } = require('../src/utils/idGenerator.js');

async function main() {
  console.log('🧹 Cleaning up existing data...');
  await prisma.complianceTask.deleteMany({});
  await prisma.eesEvaluationItem.deleteMany({});
  await prisma.eesDocument.deleteMany({});
  await prisma.engineeringRecommendation.deleteMany({});
  await prisma.engine.deleteMany({});
  await prisma.aircraft.deleteMany({});
  await prisma.serviceBulletin.deleteMany({});
  await prisma.airworthinessDirective.deleteMany({});
  await prisma.user.deleteMany({});
  console.log('✅ Cleanup completed.\n');

  // ─────────────────────────────────────────────
  // USERS
  // ─────────────────────────────────────────────
  console.log('👤 Seeding users...');
  const adminPassword = await bcrypt.hash('admin123', 10);
  const technicianPassword = await bcrypt.hash('tech123', 10);

  const admin = await prisma.user.create({
    data: { id: generateId('USR'), email: 'admin@gmf.com', username: 'admin', password: adminPassword, role: 'ADMIN' }
  });
  const technician = await prisma.user.create({
    data: { id: generateId('USR'), email: 'technician@gmf.com', username: 'technician', password: technicianPassword, role: 'TECHNICIAN' }
  });
  console.log(`  ✔ ${admin.email} (ADMIN)`);
  console.log(`  ✔ ${technician.email} (TECHNICIAN)\n`);

  // ─────────────────────────────────────────────
  // FLEET — AIRCRAFT
  // ─────────────────────────────────────────────
  console.log('✈️  Seeding fleet aircrafts...');
  const [acA, acB, acC, acD] = await Promise.all([
    prisma.aircraft.create({
      data: { id: generateId('AC'), registration: 'PK-GPX', msn: '6432', aircraftType: 'A320', operator: 'Garuda Indonesia', active: true }
    }),
    prisma.aircraft.create({
      data: { id: generateId('AC'), registration: 'PK-GPS', msn: '5432', aircraftType: 'A320', operator: 'Garuda Indonesia', active: true }
    }),
    prisma.aircraft.create({
      data: { id: generateId('AC'), registration: 'PK-GPA', msn: '6789', aircraftType: 'A321', operator: 'Garuda Indonesia', active: true }
    }),
    prisma.aircraft.create({
      data: { id: generateId('AC'), registration: 'PK-GIA', msn: '7777', aircraftType: 'B777-300ER', operator: 'Garuda Indonesia', active: true }
    }),
  ]);
  console.log(`  ✔ ${acA.registration} (MSN-${acA.msn}, A320)`);
  console.log(`  ✔ ${acB.registration} (MSN-${acB.msn}, A320)`);
  console.log(`  ✔ ${acC.registration} (MSN-${acC.msn}, A321)`);
  console.log(`  ✔ ${acD.registration} (MSN-${acD.msn}, B777-300ER)\n`);

  // ─────────────────────────────────────────────
  // FLEET — ENGINES
  // ─────────────────────────────────────────────
  console.log('⚙️  Seeding fleet engines...');
  const [eng1, eng2, eng3, eng4, eng5, eng6] = await Promise.all([
    prisma.engine.create({
      data: { id: generateId('ENG'), esn: 'ESN-881432', msn: 'MSN-5432', model: 'V2527-A5', position: '1', aircraftId: acA.id, active: true }
    }),
    prisma.engine.create({
      data: { id: generateId('ENG'), esn: 'ESN-881433', msn: 'MSN-5433', model: 'V2527-A5', position: '2', aircraftId: acA.id, active: true }
    }),
    prisma.engine.create({
      data: { id: generateId('ENG'), esn: 'ESN-992341', msn: 'MSN-6789', model: 'CFM56-5B4', position: '1', aircraftId: acC.id, active: true }
    }),
    prisma.engine.create({
      data: { id: generateId('ENG'), esn: 'ESN-870001', msn: 'MSN-5432', model: 'V2527-A5', position: '1', aircraftId: acB.id, active: true }
    }),
    prisma.engine.create({
      data: { id: generateId('ENG'), esn: 'ESN-901111', msn: 'MSN-7777', model: 'GE90-100-115B', position: '1', aircraftId: acD.id, active: true }
    }),
    prisma.engine.create({
      data: { id: generateId('ENG'), esn: 'ESN-901112', msn: 'MSN-7777', model: 'GE90-100-110B1', position: '2', aircraftId: acD.id, active: true }
    }),
  ]);
  console.log(`  ✔ ${eng1.esn} (V2527-A5, pos:1, ${acA.registration})`);
  console.log(`  ✔ ${eng2.esn} (V2527-A5, pos:2, ${acA.registration})`);
  console.log(`  ✔ ${eng3.esn} (CFM56-5B4, pos:1, ${acC.registration})`);
  console.log(`  ✔ ${eng4.esn} (V2527-A5, pos:1, ${acB.registration})`);
  console.log(`  ✔ ${eng5.esn} (GE90-100-115B, pos:1, ${acD.registration})`);
  console.log(`  ✔ ${eng6.esn} (GE90-100-110B1, pos:2, ${acD.registration})\n`);

  // ─────────────────────────────────────────────
  // SERVICE BULLETINS (Representasi Database Perusahaan)
  // ─────────────────────────────────────────────
  console.log('📄 Seeding Service Bulletins (fleet SB database)...');
  const sbs = await Promise.all([
    prisma.serviceBulletin.create({
      data: {
        id: generateId('SB-DOC'),
        sbNumber: 'SB-V25-73-0234',
        title: 'Fuel Control Unit Inspection',
        issuer: 'IAE International Aero Engines',
        issueDate: new Date('2024-01-15'),
        status: 'ACTIVE',
        sbType: 'MANDATORY',
        complianceCategory: 4,
        effectivityType: 'V2527-A5',
        effectivityRange: 'All V2527-A5',
        compliancePeriod: '12 months',
        draftStatus: 'DRAFT',
        ocrStatus: 'UPLOADED',
      }
    }),
    prisma.serviceBulletin.create({
      data: {
        id: generateId('SB-DOC'),
        sbNumber: 'SB-CFM56-72-1123',
        title: 'HPC Blade Inspection - Stage 5',
        issuer: 'CFM International',
        issueDate: new Date('2024-03-01'),
        status: 'ACTIVE',
        sbType: 'ALERT',
        complianceCategory: 2,
        effectivityType: 'CFM56-5B4',
        effectivityRange: 'All CFM56-5B4',
        compliancePeriod: '6 months',
        draftStatus: 'DRAFT',
        ocrStatus: 'UPLOADED',
      }
    }),
    prisma.serviceBulletin.create({
      data: {
        id: generateId('SB-DOC'),
        sbNumber: 'SB-LEAP-72-0089',
        title: 'CMC Software Update v4.12',
        issuer: 'CFM International (LEAP)',
        issueDate: new Date('2024-06-10'),
        status: 'ACTIVE',
        sbType: 'RECOMMENDED',
        complianceCategory: 6,
        effectivityType: 'LEAP-1A26',
        effectivityRange: 'All LEAP-1A26',
        compliancePeriod: '24 months',
        draftStatus: 'DRAFT',
        ocrStatus: 'UPLOADED',
      }
    }),
    prisma.serviceBulletin.create({
      data: {
        id: generateId('SB-DOC'),
        sbNumber: 'SB-V25-79-0041',
        title: 'Oil Pump Seal Replacement',
        issuer: 'IAE International Aero Engines',
        issueDate: new Date('2024-08-20'),
        status: 'ACTIVE',
        sbType: 'MANDATORY',
        complianceCategory: 5,
        effectivityType: 'V2527-A5',
        effectivityRange: 'ESN below 882000',
        compliancePeriod: '3 months',
        draftStatus: 'DRAFT',
        ocrStatus: 'UPLOADED',
      }
    }),
    prisma.serviceBulletin.create({
      data: {
        id: generateId('SB-DOC'),
        sbNumber: 'SB-CFM56-78-0221',
        title: 'Thrust Reverser Actuator Check',
        issuer: 'CFM International',
        issueDate: new Date('2024-09-05'),
        status: 'ACTIVE',
        sbType: 'MANDATORY',
        complianceCategory: 4,
        effectivityType: 'CFM56-5B',
        effectivityRange: 'All CFM56-5B',
        compliancePeriod: '6 months',
        draftStatus: 'DRAFT',
        ocrStatus: 'UPLOADED',
      }
    }),
    prisma.serviceBulletin.create({
      data: {
        id: generateId('SB-DOC'),
        sbNumber: 'SB-GE98-71-0345',
        title: 'Fan Blade Inspection - FOD Assessment',
        issuer: 'GE Aviation',
        issueDate: new Date('2024-11-01'),
        status: 'ACTIVE',
        sbType: 'ALERT',
        complianceCategory: 1,
        effectivityType: 'GE90-115B',
        effectivityRange: 'All GE90-115B',
        compliancePeriod: 'On Event',
        draftStatus: 'DRAFT',
        ocrStatus: 'UPLOADED',
      }
    }),
    // SB for existing test compatibility
    prisma.serviceBulletin.create({
      data: {
        id: generateId('SB-DOC'),
        sbNumber: 'RB211-73-AJ366',
        title: 'Trent 700 Series Propulsion System Modification',
        issuer: 'Rolls-Royce',
        issueDate: new Date('2026-03-10'),
        status: 'ACTIVE',
        sbType: 'MANDATORY',
        complianceCategory: 4,
        effectivityType: 'Trent 700',
        effectivityRange: 'All Trent 700',
        compliancePeriod: '12 months',
        draftStatus: 'DRAFT',
        ocrStatus: 'UPLOADED',
      }
    }),
  ]);

  sbs.forEach(sb => console.log(`  ✔ ${sb.sbNumber} [${sb.sbType}] — ${sb.title}`));

  // ─────────────────────────────────────────────
  // AD (Airworthiness Directive)
  // ─────────────────────────────────────────────
  console.log('\n📋 Seeding Airworthiness Directives (AD)...');
  const ad = await prisma.airworthinessDirective.create({
    data: {
      id: generateId('AD'),
      adNumber: 'EASA-AD-2024-0189',
      title: 'CFM56-5B Engine — Fan Blade Inspection',
      issuer: 'EASA',
      issueDate: new Date('2024-01-15'),
      dueDate: new Date('2024-12-31'),
      status: 'ACTIVE'
    }
  });
  console.log(`  ✔ ${ad.adNumber} (EASA)\n`);

  console.log('🎉 Database seeding successfully completed!');
  console.log('\n📊 Summary:');
  console.log(`   Users:           2`);
  console.log(`   Aircraft:        3`);
  console.log(`   Engines:         4`);
  console.log(`   Service Bulletins: ${sbs.length}`);
  console.log(`   ADs:             1`);
}

main()
  .catch((error) => {
    console.error('❌ Seeding failed with error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });