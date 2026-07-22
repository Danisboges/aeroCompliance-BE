require('dotenv').config();
const prisma = require('../src/db');
const bcrypt = require('bcryptjs');
const { generateId } = require('../src/utils/idGenerator');

async function seedBeforeUploadScenario() {
  console.log('🧹 Clearing old SBs to prepare BEFORE-UPLOAD testing state...');

  // Reset SBs and Relations
  await prisma.sbComplianceAudit.deleteMany({});
  await prisma.sbGroupResult.deleteMany({});
  await prisma.sbRequirementMember.deleteMany({});
  await prisma.sbRequirementGroup.deleteMany({});
  await prisma.sbRelation.deleteMany({});
  await prisma.reviewAction.deleteMany({});
  await prisma.approval.deleteMany({});
  await prisma.complianceRecord.deleteMany({});
  await prisma.eesEvaluationItem.deleteMany({});
  await prisma.eesDocument.deleteMany({});
  await prisma.engineeringRecommendation.deleteMany({});
  await prisma.ocrResult.deleteMany({});
  await prisma.serviceBulletin.deleteMany({});

  let opGaruda = await prisma.operator.findFirst({ where: { code: 'GA' } });
  if (!opGaruda) {
    opGaruda = await prisma.operator.create({
      data: { id: generateId('OP'), code: 'GA', name: 'Garuda Indonesia' }
    });
  }

  const pass = await bcrypt.hash('tech123', 10);
  let firstEng = await prisma.user.findFirst({ where: { username: 'first_engineer' } });
  if (!firstEng) {
    firstEng = await prisma.user.create({
      data: { id: generateId('USR'), email: 'firsteng@gmf.co.id', username: 'first_engineer', password: pass, role: 'ENGINEER', operatorId: opGaruda.id }
    });
  }

  console.log('🌱 Seeding pre-existing Service Bulletins (All currently status: OPEN)...');

  const preExistingSbs = [
    { sbNumber: 'CFM56-7B S/B 72-0100 R0', title: 'ENGINE - HPC Rotor Blade Inspection R0 (Akan di-SUPERSEDE oleh 72-0986)' },
    { sbNumber: 'CFM56-7B S/B 72-0050', title: 'ENGINE - Old Repetitive Shroud Inspection (Akan di-TERMINATE oleh 72-0986)' },
    { sbNumber: 'CFM56-7B S/B 72-0581', title: 'ENGINE - HPC Stator Forward Assembly - Stage 2/3 Bushings (Prerequisite Post)' },
    { sbNumber: 'CFM56-7B S/B 72-0665', title: 'ENGINE - Compressor Front Stator - Composite Bushing (Prerequisite Post)' },
    { sbNumber: 'CFM56-7B S/B 72-0958', title: 'ENGINE - Compressor Front Stator - New Stage 2/3 Shrouds' }
  ];

  for (const sbData of preExistingSbs) {
    await prisma.serviceBulletin.create({
      data: {
        id: generateId('SB-DOC'),
        sbNumber: sbData.sbNumber,
        title: sbData.title,
        revision: 'Revision 00',
        issuer: 'CFM International',
        issueDate: new Date('2015-01-01'),
        status: 'OPEN', // ALL START AS OPEN!
        operatorId: opGaruda.id,
        createdById: firstEng.id
      }
    });
    console.log(`   - Created Pre-existing SB: ${sbData.sbNumber} (Status: OPEN)`);
  }

  console.log('\n✨ SCENARIO SEEDER SELESAI!');
  console.log('📌 STATUS SEBELUM UPLOAD:');
  console.log('   - CFM56-7B S/B 72-0100 R0: OPEN');
  console.log('   - CFM56-7B S/B 72-0050: OPEN');
  console.log('   - CFM56-7B S/B 72-0986: BELUM ADA DI DB');
  console.log('\n🎯 UJI COBA:');
  console.log('   Tembak Webhook atau Upload SB CFM56-7B S/B 72-0986, lalu lihat hasilnya!');
  console.log('   - CFM56-7B S/B 72-0100 R0 akan otomatis berubah dari OPEN menjadi SUPERSEDED!');
  console.log('   - CFM56-7B S/B 72-0050 akan otomatis berubah dari OPEN menjadi TERMINATED!\n');
}

seedBeforeUploadScenario()
  .catch(err => {
    console.error('❌ Seeder failed:', err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
