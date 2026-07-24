const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const prisma = require('../db');
const iq03Repository = require('../repositories/iq03Repository');
const iq03Client = require('../clients/iq03Client');

const iq03_STORAGE_ROOT = path.resolve(__dirname, '../../uploads/iq03-documents');

// Ensure directory exists synchronously
if (!fs.existsSync(iq03_STORAGE_ROOT)) {
  fs.mkdirSync(iq03_STORAGE_ROOT, { recursive: true });
}

/**
 * Normalizes numbers/strings for robust substring matching.
 * E.g., "AD 2024-06-09" -> "20240609"
 */
const cleanIdentifier = (str) => {
  if (!str) return '';
  return str.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
};



/**
 * Normalizes raw JSON response/payload into database structures and saves.
 */
const processIq03Json = async (rawPayload, originalFileName = 'payload.json', storedFileName = 'PENDING', docType = 'IQ03') => {
  // Dynamic unwrapping of nested iq03 payload
  let data = rawPayload;
  if (data && data.iq03_schema) {
    if (data.iq03_schema.iq03_schema) {
      data = data.iq03_schema.iq03_schema;
    } else {
      data = data.iq03_schema;
    }
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Validation Error: Invalid iq03 payload structure');
  }

  // Extract iq03 properties
  const engineSerialNumber = data.engine_serial_number ? String(data.engine_serial_number) : '';
  if (!engineSerialNumber) {
    throw new Error('Validation Error: engine_serial_number is required in iq03 payload');
  }

  const iq03Data = {
    engineSerialNumber,
    engineType: data.engine_type || '',
    shopInDate: data.shop_in_date || '',
    shopOutDate: data.shop_out_date || '',
    reportDate: data.report_date || data.shop_out_date || '', // Date when report was written
    reasonForShopVisit: data.reason_for_shop_visit || '',
    tsn: data.tsn || '',
    csn: data.csn || '',
    tslv: data.tslv || '',
    cslv: data.cslv || '',
    authorizedReleaseStatus: data.authorized_release_status || '',
    originalFileName,
    storedFileName,
    rawPayload,
    docType
  };

  // Map configuration items
  const rawConfigs = Array.isArray(data.configuration_report) ? data.configuration_report : [];
  iq03Data.configurationReport = rawConfigs.map(item => ({
    module: item.module || '',
    partName: item.part_name || '',
    inOut: item.in_out || '',
    partNumber: item.part_number || '',
    serial: item.serial || '',
    qty: item.qty !== undefined && item.qty !== null ? String(item.qty) : '',
    tsn: item.tsn !== undefined && item.tsn !== null ? String(item.tsn) : '',
    csn: item.csn !== undefined && item.csn !== null ? String(item.csn) : '',
    tso: item.tso !== undefined && item.tso !== null ? String(item.tso) : '',
    cso: item.cso !== undefined && item.cso !== null ? String(item.cso) : '',
    workAccompl: item.work_accompl || ''
  }));



  // Save iq03 to Database (Murni untuk History Log)
  const iq03 = await iq03Repository.createIq03Report(iq03Data);

  // Sync EngineActiveComponent (Data Terkini) berdasarkan Hirarki Waktu
  if (iq03.engineId) {
    console.log(`[IQ03 Service] Syncing Active Components for Engine: ${iq03.engineId}`);
    
    // Parse tanggal dokumen saat ini
    const currentDocDate = new Date(iq03.reportDate || iq03.shopOutDate || iq03.createdAt);
    
    for (const item of iq03Data.configurationReport) {
      if (!item.partNumber) continue;

      const existing = await prisma.engineActiveComponent.findFirst({
        where: { engineId: iq03.engineId, partNumber: item.partNumber }
      });

      // Jika ada komponen aktif yang diubah oleh dokumen yang lebih baru, abaikan dokumen lama ini.
      if (existing && existing.sourceDate && existing.sourceDate > currentDocDate) {
        console.log(`[IQ03 Service] Skipping part ${item.partNumber} because existing active component is newer.`);
        continue;
      }

      if (item.inOut === 'IN' || item.inOut === 'INSTALLED') {
        if (!existing) {
          await prisma.engineActiveComponent.create({
            data: {
              engineId: iq03.engineId,
              partNumber: item.partNumber,
              partName: item.partName,
              module: item.module,
              tsn: item.tsn,
              csn: item.csn,
              lastUpdatedFrom: `IQ03-${iq03.id}`,
              sourceDate: currentDocDate
            }
          });
        } else {
          await prisma.engineActiveComponent.update({
            where: { id: existing.id },
            data: {
              partName: item.partName,
              module: item.module,
              tsn: item.tsn,
              csn: item.csn,
              lastUpdatedFrom: `IQ03-${iq03.id}`,
              sourceDate: currentDocDate
            }
          });
        }
      } else if (item.inOut === 'OUT' || item.inOut === 'REMOVED') {
        await prisma.engineActiveComponent.deleteMany({
          where: { engineId: iq03.engineId, partNumber: item.partNumber }
        });
      }
    }
  }

  // Refetch iq03 to include newly created complianceRecords relation
  return iq03Repository.findIq03ReportById(iq03.id);
};

/**
 * Handle PDF iq03 Upload.
 */
const processIq03Pdf = async ({ buffer, fileName, docType = 'IQ03' }) => {
  // Generate random hash for file naming
  const hash = crypto.createHash('md5').update(buffer).digest('hex');
  const storedFileName = `engine-doc-${Date.now()}-${hash.slice(0, 10)}.pdf`;
  const storagePath = path.join(iq03_STORAGE_ROOT, storedFileName);

  // Write PDF to disk
  fs.writeFileSync(storagePath, buffer);

  // Send to AI Extractor Client
  console.log(`[Engine Doc Service] Running AI extraction for file: ${fileName} as ${docType}`);
  const aiResult = await iq03Client.analyzeEngineDocumentPdf({ fileName, buffer, docType });

  // Ingest extracted JSON
  return processIq03Json(aiResult, fileName, storedFileName, docType);
};

/**
 * Get iq03 File Information.
 */
const getiq03File = async (id) => {
  const iq03 = await iq03Repository.findIq03ReportById(id);
  if (!iq03 || !iq03.storedFileName || iq03.storedFileName === 'PENDING') {
    throw new Error('Not Found: iq03 PDF file does not exist');
  }
  const storagePath = path.join(iq03_STORAGE_ROOT, iq03.storedFileName);
  if (!fs.existsSync(storagePath)) {
    throw new Error('Not Found: iq03 PDF file not found on disk');
  }
  return {
    storagePath,
    fileName: iq03.originalFileName || `${iq03.engineSerialNumber}-iq03.pdf`,
    mimeType: 'application/pdf'
  };
};

module.exports = {
  processIq03Json,
  processIq03Pdf,
  getiq03File
};

