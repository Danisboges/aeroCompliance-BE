const mockPrisma = { $transaction: jest.fn() };
jest.mock('../src/db', () => mockPrisma);

const { createEesDocument } = require('../src/repositories/eesRepository');

describe('EES in-place regeneration', () => {
  test('updates an existing EES without deleting its approval/history parent', async () => {
    const tx = {
      eesDocument: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({ id: 'EES-EXISTING', sourceSbId: 'SB-1', eesNumber: 'EES-1' })
          .mockResolvedValueOnce({ id: 'EES-EXISTING', sourceSbId: 'SB-1', eesNumber: 'EES-1' }),
        update: jest.fn(async ({ data }) => ({ id: 'EES-EXISTING', ...data })),
        create: jest.fn(),
      },
      eesEvaluationItem: {
        deleteMany: jest.fn(async () => ({ count: 1 })),
      },
    };
    mockPrisma.$transaction.mockImplementation(async (callback) => callback(tx));

    const result = await createEesDocument({
      eesNumber: 'EES-1',
      sourceSbId: 'SB-1',
      taskType: 'INSPECTION',
      isManualEdited: true,
    }, [{ itemNo: 1, requirementDesc: 'Revised requirement', isApplicable: true }]);

    expect(result.id).toBe('EES-EXISTING');
    expect(tx.eesEvaluationItem.deleteMany).toHaveBeenCalledWith({
      where: { eesDocumentId: 'EES-EXISTING' },
    });
    expect(tx.eesDocument.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'EES-EXISTING' },
    }));
    expect(tx.eesDocument.create).not.toHaveBeenCalled();
    expect(tx.eesDocument.deleteMany).toBeUndefined();
  });
});
