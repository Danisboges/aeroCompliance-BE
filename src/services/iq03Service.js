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
 * Service Bulletin & AD matching logic.
 */
const matchIq03Compliance = async (iq03) => {
  if (!iq03.engineId) {
    console.log(`[IQ03 Compliance] IQ03 ${iq03.id} has no matching Engine. Skipping compliance matching.`);
    return;
  }

  console.log(`[IQ03 Compliance] Running compliance matching for IQ03 ${iq03.id} (ESN: ${iq03.engineSerialNumber})`);

  const currentDocDate = new Date(iq03.createdAt);

  // Fetch all active SBs and ADs from database
  const sbs = await prisma.serviceBulletin.findMany({ where: { status: 'ACTIVE' } });
  const ads = await prisma.airworthinessDirective.findMany({ where: { status: 'ACTIVE' } });

  // --- Match Service Bulletins ---
  for (const sbItem of iq03.sbStatus || []) {
    const sbNumClean = cleanIdentifier(sbItem.sbNumber);

    if (!sbNumClean) continue;

    let status = 'COMPLIED'; // Default
    const remarksLower = (sbItem.remarks || '').toLowerCase();
    const mocLower = (sbItem.methodOfCompliance || '').toLowerCase();
    const descLower = (sbItem.description || '').toLowerCase();

    if (
      remarksLower.includes('not applicable') || 
      mocLower.includes('not applicable') || 
      descLower.includes('not applicable')
    ) {
      status = 'NOT_APPLICABLE';
    } else if (
      remarksLower.includes('not performed') || 
      mocLower.includes('not performed') ||
      mocLower === 'open'
    ) {
      status = 'OPEN';
    }

    let matchedSb = null;
    if (sbNumClean) {
      matchedSb = sbs.find(dbSb => {
        const dbSbClean = cleanIdentifier(dbSb.sbNumber);
        return dbSbClean && (sbNumClean.includes(dbSbClean) || dbSbClean.includes(sbNumClean));
      });
    }

    if (matchedSb) {
      console.log(`[IQ03 Compliance] Matched SB: ${matchedSb.sbNumber} with IQ03 item: ${sbItem.sbNumber}`);
      
      const existingCompliance = await prisma.complianceRecord.findUnique({
        where: { engineId_sbId: { engineId: iq03.engineId, sbId: matchedSb.id } }
      });

      if (existingCompliance && existingCompliance.sourceDate && existingCompliance.sourceDate > currentDocDate) {
        console.log(`[IQ03 Compliance] Skipping SB ${matchedSb.sbNumber} because existing record is newer.`);
        continue;
      }

      const payloadData = {
        status,
        complianceDate: sbItem.notificationDateOfCompliance || null,
        iq03Id: iq03.id,
        remarks: sbItem.remarks || sbItem.methodOfCompliance || null,
        sourceDate: currentDocDate
      };

      if (existingCompliance) {
        await prisma.complianceRecord.update({
          where: { id: existingCompliance.id },
          data: payloadData
        });
      } else {
        await prisma.complianceRecord.create({
          data: {
            ...payloadData,
            engineId: iq03.engineId,
            sbId: matchedSb.id
          }
        });
      }
    }
  }

  // --- Match Airworthiness Directives ---
  for (const adItem of iq03.adStatus || []) {
    const adNumClean = cleanIdentifier(adItem.adNumber);

    if (!adNumClean) continue;

    let status = 'COMPLIED'; // Default
    const remarksLower = (adItem.remarks || '').toLowerCase();
    const mocLower = (adItem.methodOfCompliance || '').toLowerCase();
    const descLower = (adItem.description || '').toLowerCase();

    if (
      remarksLower.includes('not applicable') || 
      mocLower.includes('not applicable') || 
      descLower.includes('not applicable')
    ) {
      status = 'NOT_APPLICABLE';
    } else if (
      remarksLower.includes('not performed') || 
      mocLower.includes('not performed') ||
      mocLower === 'open'
    ) {
      status = 'OPEN';
    }

    let matchedAd = null;
    if (adNumClean) {
      matchedAd = ads.find(dbAd => {
        const dbAdClean = cleanIdentifier(dbAd.adNumber);
        return dbAdClean && (adNumClean.includes(dbAdClean) || dbAdClean.includes(adNumClean));
      });
    }

    if (matchedAd) {
      console.log(`[IQ03 Compliance] Matched AD: ${matchedAd.adNumber} with IQ03 item: ${adItem.adNumber}`);
      
      const existingCompliance = await prisma.complianceRecord.findUnique({
        where: { engineId_adId: { engineId: iq03.engineId, adId: matchedAd.id } }
      });

      if (existingCompliance && existingCompliance.sourceDate && existingCompliance.sourceDate > currentDocDate) {
        console.log(`[IQ03 Compliance] Skipping AD ${matchedAd.adNumber} because existing record is newer.`);
        continue;
      }

      const payloadData = {
        status,
        complianceDate: adItem.notificationDateOfCompliance || null,
        iq03Id: iq03.id,
        remarks: adItem.remarks || adItem.methodOfCompliance || null,
        sourceDate: currentDocDate
      };

      if (existingCompliance) {
        await prisma.complianceRecord.update({
          where: { id: existingCompliance.id },
          data: payloadData
        });
      } else {
        await prisma.complianceRecord.create({
          data: {
            ...payloadData,
            engineId: iq03.engineId,
            adId: matchedAd.id
          }
        });
      }
    }
  }
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
    originalFileName,
    storedFileName,
    rawPayload
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

  // Map LLP items
  const rawLlps = Array.isArray(data.limited_life_part_status) ? data.limited_life_part_status : [];
  iq03Data.llpStatus = rawLlps.map(item => ({
    no: item.no !== undefined && item.no !== null ? String(item.no) : '',
    description: item.part_name || item.description || '',
    partNumber: item.part_number || '',
    serialNumber: item.serial || item.serial_number || '',
    totalHour: item.tsn !== undefined && item.tsn !== null ? String(item.tsn) : '',
    totalCycle: item.csn !== undefined && item.csn !== null ? String(item.csn) : '',
    remark: item.remark || ''
  }));

  // Map SB items
  const rawSbs = Array.isArray(data.service_bulletin_status) ? data.service_bulletin_status : [];
  iq03Data.sbStatus = rawSbs
    .filter(item => item.sb_number !== null)
    .map(item => ({
      sbNumber: item.sb_number || '',
      notificationDateOfCompliance: item.notification_date_of_compliance || '',
      description: item.description || '',
      catType: item.cat_type || '',
      moduleApplicability: item.module_applicability || '',
      methodOfCompliance: item.method_of_compliance || '',
      remarks: item.remarks || ''
    }));

  // Map AD items
  const rawAds = Array.isArray(data.airworthiness_directive_status) ? data.airworthiness_directive_status : [];
  iq03Data.adStatus = rawAds
    .filter(item => item.ad_number !== null)
    .map(item => ({
      adNumber: item.ad_number || '',
      referenceSb: item.reference_sb || '',
      recurrInsp: item.recurr_insp || '',
      notificationDateOfCompliance: item.notification_date_of_compliance || '',
      description: item.description || '',
      moduleApplicability: item.module_applicability || '',
      methodOfCompliance: item.method_of_compliance || '',
      remarks: item.remarks || ''
    }));

  // Save iq03 to Database (Murni untuk History Log)
  const iq03 = await iq03Repository.createIq03Report(iq03Data);

  // Sync EngineActiveComponent (Data Terkini) berdasarkan Hirarki Waktu
  if (iq03.engineId) {
    console.log(`[IQ03 Service] Syncing Active Components for Engine: ${iq03.engineId}`);
    
    // Parse tanggal dokumen saat ini
    const currentDocDate = new Date(data.report_date || data.shop_out_date || iq03.createdAt);
    
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

  // Trigger compliance matching
  await matchIq03Compliance(iq03);

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
  getiq03File,
  matchIq03Compliance
};
