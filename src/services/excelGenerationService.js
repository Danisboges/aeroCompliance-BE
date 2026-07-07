const ExcelJS = require('exceljs');

/**
 * Generates an EES Excel (.xlsx) buffer with the same column structure as the PDF template.
 */
const generateEesExcel = async ({ sb, items, eesNumber, sbNumber }) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'GMF AeroAsia - ORBIT System';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('EES Document', {
    pageSetup: { paperSize: 9, orientation: 'landscape' }
  });

  // ── Header ────────────────────────────────────────────────────────────────
  sheet.mergeCells('A1:K1');
  sheet.getCell('A1').value = 'AD/SB Alert/SB Mandatory Engineering Evaluation Sheet';
  sheet.getCell('A1').font = { bold: true, size: 13 };
  sheet.getCell('A1').alignment = { horizontal: 'center' };

  sheet.mergeCells('A2:D2');
  sheet.getCell('A2').value = `AD/SB Alert/SB Mandatory EES No: ${eesNumber}`;
  sheet.getCell('A2').font = { bold: true, size: 10 };

  sheet.mergeCells('H2:K2');
  sheet.getCell('H2').value = `AD/SB Alert/SB Mandatory No: ${sbNumber}`;
  sheet.getCell('H2').font = { bold: true, size: 10 };
  sheet.getCell('H2').alignment = { horizontal: 'right' };

  sheet.addRow([]); // spacer

  // ── Column Headers ─────────────────────────────────────────────────────────
  const headerRow = sheet.addRow([
    'No', 'Par', 'Requirement Descriptions & Evaluation',
    'Task Type', 'Ref', 'App (Y/N)', 'Warranty (Y/N)',
    'Affected A/C or Engine (ESN)', 'Rep (Y/N)', 'Due At', 'Remark'
  ]);

  const headerFill = {
    type: 'pattern', pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, size: 9 };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.fill = headerFill;
    cell.border = {
      top: { style: 'thin' }, left: { style: 'thin' },
      bottom: { style: 'thin' }, right: { style: 'thin' }
    };
  });

  // Column widths matching PDF proportions
  sheet.columns = [
    { width: 4 },   // No
    { width: 5 },   // Par
    { width: 40 },  // Requirement Desc
    { width: 10 },  // Task Type
    { width: 7 },   // Ref
    { width: 8 },   // App Y/N
    { width: 12 },  // Warranty Y/N
    { width: 22 },  // Affected A/C or Engine
    { width: 9 },   // Rep Y/N
    { width: 12 },  // Due At
    { width: 20 },  // Remark
  ];

  // ── Data Rows ─────────────────────────────────────────────────────────────
  items.forEach((item) => {
    const dataRow = sheet.addRow([
      item.no,
      item.par,
      item.desc,
      item.taskType,
      item.ref,
      item.app,
      item.warranty,
      item.affectedAcEngine,
      item.rep,
      item.dueAt,
      item.remarks,
    ]);

    dataRow.height = 30;
    dataRow.eachCell((cell) => {
      cell.font = { size: 9 };
      cell.alignment = { horizontal: 'center', vertical: 'top', wrapText: true };
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' }
      };
    });

    // Left-align the description column
    dataRow.getCell(3).alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
  });

  // ── Footer ────────────────────────────────────────────────────────────────
  sheet.addRow([]);
  const evalRow = sheet.addRow([`Evaluation Date: ${new Date().toLocaleDateString('id-ID')}`]);
  evalRow.getCell(1).font = { bold: true, size: 10 };

  sheet.addRow([]);
  const sigRow = sheet.addRow(['Prepared by:', '', '', 'Checked by:', '', '', 'Verified by:']);
  sigRow.getCell(1).font = { bold: true };
  sigRow.getCell(4).font = { bold: true };
  sigRow.getCell(7).font = { bold: true };

  // Merge signature cells
  sheet.mergeCells(`A${sigRow.number}:C${sigRow.number}`);
  sheet.mergeCells(`D${sigRow.number}:F${sigRow.number}`);
  sheet.mergeCells(`G${sigRow.number}:K${sigRow.number}`);

  // Return the buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
};

module.exports = { generateEesExcel };
