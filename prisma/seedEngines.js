/**
 * Engine & Aircraft Fleet Seeder
 * 
 * Menyediakan data fleet lengkap dengan pencocokan ESN ↔ MSN yang realistis.
 * 
 * Aturan pencocokan:
 * - Aircraft.msn  = Nomor seri pesawat (dari pabrik Airbus/Boeing)
 * - Engine.esn    = Engine Serial Number (nomor seri mesin dari pabrik mesin)
 * - Engine.msn    = Manufacture Serial Number PESAWAT tempat mesin ini dipasang
 *                   (digunakan untuk mencocokkan "mesin ini ada di pesawat mana")
 * 
 * Jadi: Engine.msn = Aircraft.msn (matching key)
 */

require('dotenv').config();
const prisma = require('../src/db/index.js');
const { generateId } = require('../src/utils/idGenerator.js');

async function main() {
  console.log('🧹 Cleaning up existing Engine & Aircraft data...');
  await prisma.complianceTask.deleteMany({});
  await prisma.engine.deleteMany({});
  await prisma.aircraft.deleteMany({});
  console.log('✅ Cleanup done.\n');

  // ═══════════════════════════════════════════════════════════════
  // FLEET DATA — Garuda Indonesia & Citilink Fleet
  // Format: Aircraft (registration, MSN) → Engines (ESN, model, position)
  // ESN = Engine Serial Number (unique per mesin)
  // MSN = Manufacture Serial Number PESAWAT (link mesin ke pesawat)
  // ═══════════════════════════════════════════════════════════════

  const fleetData = [
    // ─── A320 Fleet (Engine: V2527-A5 / IAE) ──────────────────────
    {
      registration: 'PK-GPX', msn: '6432', aircraftType: 'A320', operator: 'Garuda Indonesia',
      engines: [
        { esn: 'ESN-881432', msn: '6432', model: 'V2527-A5', position: '1' },
        { esn: 'ESN-881433', msn: '6432', model: 'V2527-A5', position: '2' },
      ]
    },
    {
      registration: 'PK-GPS', msn: '5432', aircraftType: 'A320', operator: 'Garuda Indonesia',
      engines: [
        { esn: 'ESN-870001', msn: '5432', model: 'V2527-A5', position: '1' },
        { esn: 'ESN-870002', msn: '5432', model: 'V2527-A5', position: '2' },
      ]
    },
    {
      registration: 'PK-GPY', msn: '6501', aircraftType: 'A320', operator: 'Garuda Indonesia',
      engines: [
        { esn: 'ESN-885011', msn: '6501', model: 'V2527-A5', position: '1' },
        { esn: 'ESN-885012', msn: '6501', model: 'V2527-A5', position: '2' },
      ]
    },
    {
      registration: 'PK-GPC', msn: '7100', aircraftType: 'A320', operator: 'Citilink Indonesia',
      engines: [
        { esn: 'ESN-780101', msn: '7100', model: 'V2527-A5', position: '1' },
        { esn: 'ESN-780102', msn: '7100', model: 'V2527-A5', position: '2' },
      ]
    },

    // ─── A321 Fleet (Engine: CFM56-5B4 / CFM International) ───────
    {
      registration: 'PK-GPA', msn: '6789', aircraftType: 'A321', operator: 'Garuda Indonesia',
      engines: [
        { esn: 'ESN-992341', msn: '6789', model: 'CFM56-5B4', position: '1' },
        { esn: 'ESN-992342', msn: '6789', model: 'CFM56-5B4', position: '2' },
      ]
    },
    {
      registration: 'PK-GPB', msn: '6810', aircraftType: 'A321', operator: 'Garuda Indonesia',
      engines: [
        { esn: 'ESN-993001', msn: '6810', model: 'CFM56-5B4', position: '1' },
        { esn: 'ESN-993002', msn: '6810', model: 'CFM56-5B4', position: '2' },
      ]
    },
    {
      registration: 'PK-GLA', msn: '8100', aircraftType: 'A321', operator: 'Citilink Indonesia',
      engines: [
        { esn: 'ESN-994100', msn: '8100', model: 'CFM56-5B4', position: '1' },
        { esn: 'ESN-994101', msn: '8100', model: 'CFM56-5B4', position: '2' },
      ]
    },

    // ─── A330 Fleet (Engine: Trent 700 / Rolls-Royce) ─────────────
    {
      registration: 'PK-GPI', msn: '1250', aircraftType: 'A330-300', operator: 'Garuda Indonesia',
      engines: [
        { esn: 'ESN-RR-T7-001', msn: '1250', model: 'Trent 700', position: '1' },
        { esn: 'ESN-RR-T7-002', msn: '1250', model: 'Trent 700', position: '2' },
      ]
    },
    {
      registration: 'PK-GPJ', msn: '1302', aircraftType: 'A330-300', operator: 'Garuda Indonesia',
      engines: [
        { esn: 'ESN-RR-T7-011', msn: '1302', model: 'Trent 700', position: '1' },
        { esn: 'ESN-RR-T7-012', msn: '1302', model: 'Trent 700', position: '2' },
      ]
    },

    // ─── B737-800 Fleet (Engine: CFM56-7B / CFM International) ────
    {
      registration: 'PK-GNA', msn: '33501', aircraftType: 'B737-800', operator: 'Garuda Indonesia',
      engines: [
        { esn: 'ESN-737-B701', msn: '33501', model: 'CFM56-7B', position: '1' },
        { esn: 'ESN-737-B702', msn: '33501', model: 'CFM56-7B', position: '2' },
      ]
    },
    {
      registration: 'PK-GNB', msn: '33502', aircraftType: 'B737-800', operator: 'Garuda Indonesia',
      engines: [
        { esn: 'ESN-737-B711', msn: '33502', model: 'CFM56-7B', position: '1' },
        { esn: 'ESN-737-B712', msn: '33502', model: 'CFM56-7B', position: '2' },
      ]
    },

    // ─── Engine in spare/shop (tidak terpasang di pesawat) ────────
    {
      registration: null, msn: null, aircraftType: null, operator: null,
      engines: [
        { esn: 'ESN-SPARE-001', msn: null, model: 'V2527-A5', position: 'SPARE' },
        { esn: 'ESN-SPARE-002', msn: null, model: 'CFM56-5B4', position: 'SHOP' },
        { esn: 'ESN-SPARE-003', msn: null, model: 'Trent 700', position: 'SPARE' },
      ]
    }
  ];

  // ═══════════════════════════════════════════════════════════════
  // INSERT DATA
  // ═══════════════════════════════════════════════════════════════
  let totalAircraft = 0;
  let totalEngines = 0;

  for (const fleet of fleetData) {
    // Aircraft entries (skip spare engines without aircraft)
    let aircraftRecord = null;
    if (fleet.registration) {
      aircraftRecord = await prisma.aircraft.create({
        data: {
          id: generateId('AC'),
          registration: fleet.registration,
          msn: fleet.msn,
          aircraftType: fleet.aircraftType,
          operator: fleet.operator,
          active: true,
        }
      });
      totalAircraft++;
      console.log(`✈️  ${aircraftRecord.registration} (MSN: ${aircraftRecord.msn}, ${aircraftRecord.aircraftType}) — ${aircraftRecord.operator}`);
    } else {
      console.log(`🔧 Spare/Shop Engines (not installed):`);
    }

    // Engine entries
    for (const eng of fleet.engines) {
      const engine = await prisma.engine.create({
        data: {
          id: generateId('ENG'),
          esn: eng.esn,
          msn: eng.msn,         // ESN ↔ MSN matching: msn of engine = msn of aircraft
          model: eng.model,
          position: eng.position,
          aircraftId: aircraftRecord?.id ?? null,
          active: true,
        }
      });
      totalEngines++;
      const installedOn = aircraftRecord
        ? `→ ${aircraftRecord.registration} (MSN: ${aircraftRecord.msn})`
        : `→ [${eng.position}]`;
      console.log(`   ⚙️  ESN: ${engine.esn} | MSN: ${engine.msn || 'N/A'} | Model: ${engine.model} | Pos: ${engine.position} ${installedOn}`);
    }

    console.log('');
  }

  console.log('════════════════════════════════════════════');
  console.log('🎉 Engine & Aircraft seeder completed!');
  console.log(`   Aircraft inserted : ${totalAircraft}`);
  console.log(`   Engines inserted  : ${totalEngines}`);
  console.log('════════════════════════════════════════════\n');
  console.log('📌 ESN ↔ MSN Matching Logic:');
  console.log('   Engine.esn = Engine Serial Number (unique per engine)');
  console.log('   Engine.msn = MSN of the AIRCRAFT it is installed on');
  console.log('   Aircraft.msn = Manufacture Serial Number of the aircraft');
  console.log('   Match condition: Engine.msn === Aircraft.msn');
}

main()
  .catch((error) => {
    console.error('❌ Seeder failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
