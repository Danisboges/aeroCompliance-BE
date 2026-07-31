const mockPrisma = {
  serviceBulletin: {
    findMany: jest.fn(),
  },
  airworthinessDirective: {
    findMany: jest.fn(),
  },
};

const mockEdsRepository = {
  createengineDataSubmittal: jest.fn(),
  findengineDataSubmittalById: jest.fn(),
  listengineDataSubmittals: jest.fn(),
  countengineDataSubmittals: jest.fn(),
};

jest.mock('../src/db', () => mockPrisma);
jest.mock('../src/repositories/edsRepository', () => mockEdsRepository);

const {
  processEdsJson,
  listEngineDataSubmittals,
} = require('../src/services/edsService');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('EDS normalized data flow', () => {
  test('maps accessories from extracted payload into normalized database fields', async () => {
    mockEdsRepository.createengineDataSubmittal.mockImplementation(async (data) => ({
      id: 'EDS-TEST',
      engineId: null,
      ...data,
    }));
    mockEdsRepository.findengineDataSubmittalById.mockResolvedValue({
      id: 'EDS-TEST',
    });

    await processEdsJson({
      eds_schema: {
        engine_serial_number: '906101',
        engine_type: 'GE90-115B',
        accessories_list: [
          {
            no: 1,
            description: 'Fuel Pump',
            received: {
              pn: 'FP-OLD',
              sn: 'SN-OLD',
              tsn: 12000,
              tso: 4000,
            },
            installed: {
              pn: 'FP-NEW',
              sn: 'SN-NEW',
              tsn: 50,
              tso: 0,
            },
            maintenance_performed: 'Replaced and tested',
          },
        ],
      },
    });

    expect(mockEdsRepository.createengineDataSubmittal).toHaveBeenCalledWith(
      expect.objectContaining({
        engineSerialNumber: '906101',
        accessoriesList: [
          {
            no: '1',
            description: 'Fuel Pump',
            receivedPn: 'FP-OLD',
            receivedSn: 'SN-OLD',
            receivedTsn: '12000',
            receivedTso: '4000',
            installedPn: 'FP-NEW',
            installedSn: 'SN-NEW',
            installedTsn: '50',
            installedTso: '0',
            maintenancePerformed: 'Replaced and tested',
          },
        ],
      })
    );
  });

  test('formats list response with engine context, PDF availability, and relation counts', async () => {
    const engine = {
      id: 'ENG-TEST',
      esn: '906101',
      model: 'GE90-115B',
      aircraft: {
        registration: 'PK-GIE',
        operator: {
          code: 'GA',
          name: 'Garuda Indonesia',
        },
      },
    };

    mockEdsRepository.listengineDataSubmittals.mockResolvedValue([
      {
        id: 'EDS-TEST',
        engineSerialNumber: '906101',
        engineType: 'GE90-115B',
        createdAt: new Date('2026-07-30T00:00:00.000Z'),
        updatedAt: new Date('2026-07-30T01:00:00.000Z'),
        originalFileName: 'EDS_906101.pdf',
        storedFileName: 'engine-doc-906101.pdf',
        engine,
        configurationReport: [{ id: 'CFG-1' }],
        llpStatus: [{ id: 'LLP-1' }],
        sbStatus: [{ id: 'SB-1' }],
        adStatus: [{ id: 'AD-1' }],
        accessoriesList: [{ id: 'ACC-1' }],
        complianceRecords: [{ id: 'CMP-1' }],
      },
    ]);
    mockEdsRepository.countengineDataSubmittals.mockResolvedValue(1);

    const result = await listEngineDataSubmittals({
      page: 1,
      limit: 20,
      esn: '906101',
    });

    expect(result.items[0]).toMatchObject({
      id: 'EDS-TEST',
      hasPdf: true,
      engine,
      summary: {
        configurationItems: 1,
        llpItems: 1,
        serviceBulletins: 1,
        airworthinessDirectives: 1,
        accessories: 1,
        complianceRecords: 1,
      },
    });
    expect(result.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
  });
});
