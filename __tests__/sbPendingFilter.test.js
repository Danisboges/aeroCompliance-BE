require('dotenv').config();
const prisma = require('../src/db');
const { findAllWithFilter } = require('../src/repositories/serviceBulletinRepository');
const { generateId } = require('../src/utils/idGenerator');

describe('GET /api/service-bulletins/pending filter logic', () => {
  const operatorId = 'test-op-1';
  let sbs = [];

  beforeAll(async () => {
    // Buat data operator dummy
    await prisma.operator.upsert({
      where: { code: 'TEST_OP' },
      update: {},
      create: { id: operatorId, code: 'TEST_OP', name: 'Test Operator' }
    });
    
    await prisma.operator.upsert({
      where: { code: 'OTHER_OP' },
      update: {},
      create: { id: 'other-op', code: 'OTHER_OP', name: 'Other Operator' }
    });

    const baseSb = {
      title: 'Test Title',
      issuer: 'Test Issuer',
      issueDate: new Date(),
      operatorId: operatorId,
    };

    // SB 1: USER_UPLOAD, REVIEW_REQUIRED, No EES -> Harus masuk
    const sb1 = await prisma.serviceBulletin.create({
      data: {
        ...baseSb,
        id: generateId('SB-DOC'),
        sbNumber: 'TEST-SB-1',
        inputSource: 'USER_UPLOAD',
        ocrResult: {
          create: { draftStatus: 'REVIEW_REQUIRED', ocrStatus: 'EXTRACTED' }
        }
      }
    });
    sbs.push(sb1.id);

    // SB 2: SYSTEM, No EES -> Harus masuk (karena semua yang belum ada EES masuk pending)
    const sb2 = await prisma.serviceBulletin.create({
      data: {
        ...baseSb,
        id: generateId('SB-DOC'),
        sbNumber: 'TEST-SB-2',
        inputSource: 'SYSTEM',
        ocrResult: {
          create: { draftStatus: 'VALIDATED', ocrStatus: 'EXTRACTED' }
        }
      }
    });
    sbs.push(sb2.id);

    // SB 3: Punya EES, reviewStatus PENDING -> Harus masuk
    const sb3 = await prisma.serviceBulletin.create({
      data: {
        ...baseSb,
        id: generateId('SB-DOC'),
        sbNumber: 'TEST-SB-3',
        inputSource: 'SYSTEM',
        generatedEes: {
          create: {
            id: generateId('EES'),
            eesNumber: 'EES-3',
            reviewStatus: 'PENDING'
          }
        }
      }
    });
    sbs.push(sb3.id);

    // SB 4: Punya EES, reviewStatus APPROVED -> TIDAK boleh masuk
    const sb4 = await prisma.serviceBulletin.create({
      data: {
        ...baseSb,
        id: generateId('SB-DOC'),
        sbNumber: 'TEST-SB-4',
        inputSource: 'SYSTEM',
        generatedEes: {
          create: {
            id: generateId('EES'),
            eesNumber: 'EES-4',
            reviewStatus: 'APPROVED'
          }
        }
      }
    });
    sbs.push(sb4.id);

    // SB 5: Operator lain -> TIDAK boleh masuk
    const sb5 = await prisma.serviceBulletin.create({
      data: {
        ...baseSb,
        id: generateId('SB-DOC'),
        sbNumber: 'TEST-SB-5',
        operatorId: 'other-op'
      }
    });
    sbs.push(sb5.id);
  });

  afterAll(async () => {
    await prisma.serviceBulletin.deleteMany({
      where: { id: { in: sbs } }
    });
    await prisma.$disconnect();
  });

  test('pendingOnly filter should return correct SBs', async () => {
    const results = await findAllWithFilter({ pendingOnly: true, operatorId });
    
    const sbNumbers = results.map(r => r.sbNumber);

    expect(sbNumbers).toContain('TEST-SB-1');
    expect(sbNumbers).toContain('TEST-SB-2');
    expect(sbNumbers).toContain('TEST-SB-3');
    
    // Yg tidak boleh masuk
    expect(sbNumbers).not.toContain('TEST-SB-4'); // Approved
    expect(sbNumbers).not.toContain('TEST-SB-5'); // Operator beda
  });
});
