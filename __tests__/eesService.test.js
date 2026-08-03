const eesService = require('../src/services/eesService');
const eesRepository = require('../src/repositories/eesRepository');
const prisma = require('../src/db');

// Mock external dependencies
jest.mock('../src/repositories/eesRepository', () => ({
  createEesDocument: jest.fn(),
  listEesDocuments: jest.fn(),
  countEesDocuments: jest.fn(),
}));

jest.mock('../src/db', () => ({
  serviceBulletin: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  sbRequirementGroup: { upsert: jest.fn() },
  sbRelation: { findFirst: jest.fn(), create: jest.fn() },
  sbRequirementMember: { upsert: jest.fn() }
}));

describe('eesService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('normalizeOcrPayload', () => {
    it('1. Payload tanpa effected_model menghasilkan effectedModel: null', () => {
      const payload = { bulletinNumber: 'SB-123', tittle: 'Test SB', effected_type: 'CFM56' };
      const normalized = eesService.normalizeOcrPayload(payload);
      expect(normalized.effectedModel).toBeNull();
    });

    it('2. effected_model string menghasilkan string', () => {
      const payload = { bulletinNumber: 'SB-123', tittle: 'Test SB', effected_model: 'B737-800' };
      const normalized = eesService.normalizeOcrPayload(payload);
      expect(normalized.effectedModel).toBe('B737-800');
    });

    it('3. effected_model array menghasilkan string yang sesuai Prisma', () => {
      const payload = { bulletinNumber: 'SB-123', tittle: 'Test SB', effected_model: ['B737-800', 'B737-900'] };
      const normalized = eesService.normalizeOcrPayload(payload);
      expect(normalized.effectedModel).toBe('B737-800, B737-900');
    });

    it('4. references array tetap valid sebagai JSON', () => {
      const payload = { bulletinNumber: 'SB-123', tittle: 'Test SB', references: ['ref1', 'ref2'] };
      const normalized = eesService.normalizeOcrPayload(payload);
      expect(normalized.references).toEqual(['ref1', 'ref2']);
    });

    it('5. isApplicable: false tetap false', () => {
      const payload = {
        bulletinNumber: 'SB-123',
        evaluations: [{ isApplicable: false }]
      };
      const normalized = eesService.normalizeOcrPayload(payload);
      expect(normalized.evaluations[0].isApplicable).toBe(false);
    });

    it('6. isApplicable: "false" dinormalisasi menjadi false', () => {
      const payload = {
        bulletinNumber: 'SB-123',
        evaluations: [{ isApplicable: "false" }]
      };
      const normalized = eesService.normalizeOcrPayload(payload);
      expect(normalized.evaluations[0].isApplicable).toBe(false);
    });

    it('7. isApplicable: "true" dinormalisasi menjadi true', () => {
      const payload = {
        bulletinNumber: 'SB-123',
        evaluations: [{ isApplicable: "true" }]
      };
      const normalized = eesService.normalizeOcrPayload(payload);
      expect(normalized.evaluations[0].isApplicable).toBe(true);
    });

    it('8. evaluations kosong dapat diproses sesuai keputusan kontrak', () => {
      const payload = {
        bulletinNumber: 'SB-123',
        evaluations: []
      };
      const normalized = eesService.normalizeOcrPayload(payload);
      expect(normalized.evaluations).toEqual([]);
    });
  });

  describe('processEesWebhook', () => {
    const payload = {
      note: "test 1\n\ntest 2",
      title: "ENGINE - GENERAL",
      sb_code: "LEAP-1A-72-00-0449",
      task_type: "MOD",
      ees_number: "EES-GA-E6C223",
      references: ["test"],
      evaluations: [
        {
          itemNo: "1",
          paragraph: "test 1",
          requirementDesc: "test 1",
          remarks: "test 1",
          taskType: "MOD",
          isApplicable: true,
          dueAt: "2026-12-31"
        }
      ],
      aircraftType: "B737-800",
      manufacturer: "CFM International",
      effected_type: "test",
      compliance_period: "next SV",
      compliance_category: 3,
      component_type: "engine",
      compliance_time_type: "calendar",
      repetitive: "true",
      isManualEdited: true,
      part_number: "PN-123"
    };

    it('9, 10, 12. processEesWebhook passes correctly typed fields and no ReferenceError', async () => {
      prisma.serviceBulletin.findUnique.mockResolvedValue({ id: 'uuid-123' });
      eesRepository.createEesDocument.mockResolvedValue({ id: 'ees-123' });

      await expect(eesService.processEesWebhook(payload, 'uuid-123')).resolves.toBeDefined();

      expect(eesRepository.createEesDocument).toHaveBeenCalledTimes(1);
      
      const createArgs = eesRepository.createEesDocument.mock.calls[0][0];
      
      expect(createArgs).toMatchObject({
        eesNumber: expect.any(String),
        sourceSbId: expect.any(String),
        taskType: expect.any(String),
        references: expect.anything(),
        effectedType: expect.any(String),
        aircraftType: expect.any(String),
        partNumber: expect.any(String),
        componentType: expect.any(String),
        complianceTimeType: expect.any(String),
        isRepetitive: expect.any(Boolean),
        note: expect.any(String),
        isManualEdited: expect.any(Boolean)
      });
      // Allow null for effectedModel if not specified
      expect(createArgs.effectedModel === null || typeof createArgs.effectedModel === 'string').toBeTruthy();
    });

    it('11. Prisma error diteruskan sebagai HTTP 500/log error (simulated by throwing)', async () => {
      prisma.serviceBulletin.findUnique.mockResolvedValue({ id: 'uuid-123' });
      const dbError = new Error('Prisma execution failed');
      eesRepository.createEesDocument.mockRejectedValue(dbError);

      await expect(eesService.processEesWebhook(payload, 'uuid-123')).rejects.toThrow('Prisma execution failed');
    });
  });
});
