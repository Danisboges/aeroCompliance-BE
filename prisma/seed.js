require('dotenv').config();
const prisma = require('../src/db');
const { generateId } = require('../src/utils/idGenerator');

async function main() {
  console.log('Seeding Indonesian Aircraft database...');

  const aircrafts = [
    { registration: 'PK-GTA', aircraftType: 'A320-200', operator: 'Citilink' },
    { registration: 'PK-GLV', aircraftType: 'A320neo', operator: 'Citilink' },
    { registration: 'PK-GIA', aircraftType: 'B737-800', operator: 'Garuda Indonesia' },
    { registration: 'PK-GHA', aircraftType: 'A330-300', operator: 'Garuda Indonesia' },
    { registration: 'PK-GHG', aircraftType: 'A330-900neo', operator: 'Garuda Indonesia' },
    { registration: 'PK-LGP', aircraftType: 'B737-900ER', operator: 'Lion Air' },
    { registration: 'PK-WGI', aircraftType: 'ATR 72-600', operator: 'Wings Air' },
  ];

  for (const ac of aircrafts) {
    const existing = await prisma.aircraft.findUnique({ where: { registration: ac.registration } });
    if (!existing) {
      await prisma.aircraft.create({
        data: {
          id: generateId('AC'),
          registration: ac.registration,
          aircraftType: ac.aircraftType,
          operator: ac.operator,
          active: true,
        },
      });
      console.log('Created aircraft: ' + ac.registration);
    } else {
      console.log('Aircraft ' + ac.registration + ' already exists.');
    }
  }

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
