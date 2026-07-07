/**
 * Test Script: Generate Citilink EES PDF using Seeded Data
 * 
 * Script ini akan mengambil Service Bulletin 'SB-V25-73-0234' (hasil seeder),
 * lalu men-generate PDF-nya menggunakan template CITILINK (CT-3-18.1),
 * dan menyimpannya sebagai 'citilink-ees-test.pdf'.
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();
const prisma = require('../src/db/index');
const pdfGenerationService = require('../src/services/pdfGenerationService');

async function testGenerate() {
  console.log('🔄 Fetching Service Bulletin from database...');
  
  // Ambil SB hasil seeder
  const sb = await prisma.serviceBulletin.findUnique({
    where: { sbNumber: 'SB-V25-73-0234' },
    include: {
      generatedEes: { include: { evaluations: true } },
      engineeringRec: true
    }
  });

  if (!sb) {
    console.error('❌ SB-V25-73-0234 not found in database. Please run seeder first: npx prisma db seed');
    process.exit(1);
  }

  // Jika belum ada ees divalidasi, buat mock rawPayload agar datanya terisi di form
  if (!sb.rawPayload) {
    sb.rawPayload = {
      sb_code: sb.sbNumber,
      compliance_category: sb.complianceCategory || 4,
      effected_type: sb.effectivityType || 'V2527-A5',
      tittle: sb.title,
      task_type: 'non-mod',
      problem_evidence: [
        {
          itemNo: "1",
          paragraph: "AMM 73-21-11",
          requirementDesc: "Inspect Fuel Control Unit for signs of fuel leak or wear.",
          taskType: "Inspection",
          ref: "AMM 73-21",
          remarks: "Within 12 months"
        },
        {
          itemNo: "2",
          paragraph: "AMM 73-21-12",
          requirementDesc: "Perform functional test of FCU following inspection.",
          taskType: "Functional Test",
          ref: "AMM 73-21",
          remarks: "Immediately after inspect"
        }
      ]
    };
  }

  // Set mock engineeringRec if not exists
  if (!sb.engineeringRec) {
    sb.engineeringRec = {
      recommendedAction: 'COMPLY',
      priorityLevel: 'HIGH',
      engineeringNotes: 'Inspection is mandatory for fleet reliability. Comply at next scheduled opportunity.'
    };
  }

  console.log('📄 Generating PDF using CITILINK template...');
  const pdfBuffer = await pdfGenerationService.generateEesPdf({ sb, templateType: 'CITILINK' });

  const outputPath = path.join(__dirname, 'citilink-ees-test.pdf');
  fs.writeFileSync(outputPath, pdfBuffer);

  console.log(`\n    SUCCESS: Citilink EES PDF generated successfully!`);
  console.log(`    Saved to: ${outputPath}`);
}

testGenerate()
  .catch(err => {
    console.error('❌ Error during generation:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
