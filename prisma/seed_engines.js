const prisma = require('../src/db');

async function main() {
  console.log('Seeding Aircraft and Engines for GE90-100 & LEAP-1A testing...');

  // Create or find Aircrafts
  const ac1 = await prisma.aircraft.upsert({
    where: { msn: 'MSN-777-01' },
    update: {},
    create: {
      id: 'AC-777-01',
      msn: 'MSN-777-01',
      aircraftType: 'B777-300ER',
      registration: 'PK-GIA-TEST',
    }
  });

  const ac2 = await prisma.aircraft.upsert({
    where: { msn: 'MSN-320-01' },
    update: {},
    create: {
      id: 'AC-320-01',
      msn: 'MSN-320-01',
      aircraftType: 'A320-200',
      registration: 'PK-GLA-TEST',
    }
  });

  // Create GE90-100 engines for B777
  await prisma.engine.upsert({
    where: { esn: 'GE-110B1-9901' },
    update: {},
    create: {
      id: 'ENG-GE-9901',
      esn: 'GE-110B1-9901',
      model: 'GE90-110B1',
      aircraftId: ac1.id,
      active: true,
    }
  });
  
  await prisma.engine.upsert({
    where: { esn: 'GE-115B-9902' },
    update: {},
    create: {
      id: 'ENG-GE-9902',
      esn: 'GE-115B-9902',
      model: 'GE90-115B',
      aircraftId: ac1.id,
      active: true,
    }
  });

  // Create LEAP-1A engines for A320
  await prisma.engine.upsert({
    where: { esn: 'LEAP-1A-8801' },
    update: {},
    create: {
      id: 'ENG-LEAP-8801',
      esn: 'LEAP-1A-8801',
      model: 'LEAP-1A26',
      aircraftId: ac2.id,
      active: true,
    }
  });

  console.log('Successfully seeded Engines and Aircrafts!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
