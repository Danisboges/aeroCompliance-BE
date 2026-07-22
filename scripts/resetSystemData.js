require('dotenv').config();
const prisma = require('../src/db');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { generateId } = require('../src/utils/idGenerator');

/**
 * Delete all files inside a directory
 */
const clearDirectoryFiles = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    return;
  }

  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    if (file === '.gitkeep') continue;
    const filePath = path.join(dirPath, file);
    try {
      if (fs.lstatSync(filePath).isDirectory()) {
        fs.rmSync(filePath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.warn(`Failed to delete ${filePath}:`, err.message);
    }
  }
};

async function resetAllData() {
  console.log('🧹 [1/3] Deleting all uploaded PDF files and generated documents...');
  
  const uploadDirs = [
    path.join(__dirname, '../uploads/sb-documents'),
    path.join(__dirname, '../uploads/ocr-documents'),
    path.join(__dirname, '../uploads/ees-documents'),
    path.join(__dirname, '../uploads/signatures'),
    path.join(__dirname, '../uploads/svr-documents')
  ];

  for (const dir of uploadDirs) {
    clearDirectoryFiles(dir);
    console.log(`   - Cleared: ${path.relative(path.join(__dirname, '..'), dir)}`);
  }

  console.log('\n🗑️  [2/3] Truncating all database records...');
  
  // Delete relation & compliance tables
  await prisma.sbComplianceAudit.deleteMany({});
  await prisma.sbGroupResult.deleteMany({});
  await prisma.sbRequirementMember.deleteMany({});
  await prisma.sbRequirementGroup.deleteMany({});
  await prisma.sbRelation.deleteMany({});

  // Delete approvals & reviews
  await prisma.reviewAction.deleteMany({});
  await prisma.approval.deleteMany({});
  await prisma.serviceBulletinRead.deleteMany({});

  // Delete compliance & SVR
  await prisma.complianceRecord.deleteMany({});
  await prisma.svrConfigurationItem.deleteMany({});
  await prisma.svrLlpStatus.deleteMany({});
  await prisma.svrAdStatus.deleteMany({});
  await prisma.shopVisitReport.deleteMany({});

  // Delete EES, Rec, OCR, SB, AD
  await prisma.eesEvaluationItem.deleteMany({});
  await prisma.eesDocument.deleteMany({});
  await prisma.engineeringRecommendation.deleteMany({});
  await prisma.ocrResult.deleteMany({});
  await prisma.serviceBulletin.deleteMany({});
  await prisma.airworthinessDirective.deleteMany({});

  // Delete Fleet & Users
  await prisma.engine.deleteMany({});
  await prisma.aircraft.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.operator.deleteMany({});

  console.log('   - Database successfully wiped clean!');

  console.log('\n🌱 [3/3] Re-seeding default Operators, Users, Aircraft, and Engines...');
  
  const opGaruda = await prisma.operator.create({
    data: { id: generateId('OP'), code: 'GA', name: 'Garuda Indonesia' }
  });
  const opCitilink = await prisma.operator.create({
    data: { id: generateId('OP'), code: 'QG', name: 'Citilink' }
  });

  const pass = await bcrypt.hash('tech123', 10);
  const adminPass = await bcrypt.hash('admin123', 10);
  
  await prisma.user.create({
    data: { id: generateId('USR'), email: 'admin@gmf.co.id', username: 'admin', password: adminPass, role: 'ADMIN' }
  });
  await prisma.user.create({
    data: { id: generateId('USR'), email: 'firsteng@gmf.co.id', username: 'first_engineer', password: pass, role: 'ENGINEER', operatorId: opGaruda.id }
  });
  await prisma.user.create({
    data: { id: generateId('USR'), email: 'secondeng@gmf.co.id', username: 'second_engineer', password: pass, role: 'MANAGER', operatorId: opGaruda.id }
  });
  await prisma.user.create({
    data: { id: generateId('USR'), email: 'technician@gmf.co.id', username: 'technician', password: pass, role: 'TECHNICIAN', operatorId: opGaruda.id }
  });
  await prisma.user.create({
    data: { id: generateId('USR'), email: 'firsteng.citilink@gmf.co.id', username: 'first_eng_citi', password: pass, role: 'ENGINEER', operatorId: opCitilink.id }
  });

  // Fleet
  const acGarudaB737 = await prisma.aircraft.create({
    data: { id: generateId('AC'), registration: 'PK-GIA', msn: '33501', aircraftType: 'B737-800', operatorId: opGaruda.id, active: true }
  });
  const acCitilinkA320 = await prisma.aircraft.create({
    data: { id: generateId('AC'), registration: 'PK-GTA', msn: '6432', aircraftType: 'A320-200', operatorId: opCitilink.id, active: true }
  });
  const acGarudaB777 = await prisma.aircraft.create({
    data: { id: generateId('AC'), registration: 'PK-GIE', msn: '37701', aircraftType: 'B777-300ER', operatorId: opGaruda.id, active: true }
  });

  await prisma.engine.create({
    data: { id: generateId('ENG'), esn: '660235', msn: '33501', model: 'CFM56-7B26E', position: '1', aircraftId: acGarudaB737.id, active: true }
  });
  await prisma.engine.create({
    data: { id: generateId('ENG'), esn: 'ESN-GTA01', msn: '6432', model: 'LEAP-1A26', position: '1', aircraftId: acCitilinkA320.id, active: true }
  });
  await prisma.engine.create({
    data: { id: generateId('ENG'), esn: '906101', msn: '37701', model: 'GE90-115B', position: '1', aircraftId: acGarudaB777.id, active: true }
  });

  console.log('\n✨ RESET SELESAI TOTAL! Seluruh PDF & data SB/EES/SVR telah dibersihkan.');
  console.log('   Sistem 100% siap digunakan untuk testing menyeluruh dari nol!\n');
}

resetAllData()
  .catch(err => {
    console.error('❌ Reset failed:', err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
