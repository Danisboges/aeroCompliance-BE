jest.mock('puppeteer', () => ({
  executablePath: jest.fn(() => ''),
  launch: jest.fn(),
}));

const ExcelJS = require('exceljs');
const {
  normalizeOcrPayload,
} = require('../src/services/eesService');
const {
  extractPdfItems,
} = require('../src/services/pdfGenerationService');
const {
  generateEesExcel,
} = require('../src/services/excelGenerationService');

describe('EES AD Related data flow', () => {
  test.each([
    ['camelCase', { adRelated: true }, 'Y'],
    ['snake_case', { ad_related: 'no' }, 'N'],
    ['AD number', { adRelated: 'AD 2026-01-01' }, 'AD 2026-01-01'],
  ])('normalizes %s input', (_label, adField, expected) => {
    const normalized = normalizeOcrPayload({
      sb_code: 'SB-TEST',
      problem_evidence: [
        {
          requirement_desc: 'Inspect component',
          ...adField,
        },
      ],
    });

    expect(normalized.evaluations[0].adRelated).toBe(expected);
  });

  test('PDF uses persisted EES evaluation as the canonical value', () => {
    const items = extractPdfItems({
      ocrResult: {
        rawPayload: {
          sb_code: 'SB-TEST',
          evaluations: [
            {
              itemNo: '1',
              requirementDesc: 'Stale OCR value',
              adRelated: 'Y',
            },
          ],
        },
      },
      generatedEes: {
        evaluations: [
          {
            itemNo: '1',
            requirementDesc: 'User validated value',
            adRelated: 'N',
          },
        ],
      },
    });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      desc: 'User validated value',
      adRelated: 'N',
    });
  });

  test('Excel export includes AD Related column and value', async () => {
    const buffer = await generateEesExcel({
      sb: {},
      eesNumber: 'EES-TEST',
      sbNumber: 'SB-TEST',
      items: [
        {
          no: '1',
          par: '1.A',
          desc: 'Inspect component',
          taskType: 'INSPECTION',
          ref: '-',
          app: 'Y',
          adRelated: 'N',
          warranty: 'N',
          affectedAcEngine: '-',
          rep: 'N',
          dueAt: '-',
          remarks: '-',
        },
      ],
    });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.getWorksheet('EES Document');

    expect(sheet.getCell('G4').value).toBe('AD Related');
    expect(sheet.getCell('G5').value).toBe('N');
  });
});
