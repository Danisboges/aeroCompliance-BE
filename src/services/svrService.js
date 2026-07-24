const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const prisma = require('../db');
const svrRepository = require('../repositories/svrRepository');
const svrClient = require('../clients/svrClient');

const SVR_STORAGE_ROOT = path.resolve(__dirname, '../../uploads/svr-documents');

// Ensure directory exists synchronously
if (!fs.existsSync(SVR_STORAGE_ROOT)) {
  fs.mkdirSync(SVR_STORAGE_ROOT, { recursive: true });
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
const matchSvrCompliance = async (svr) => {
  if (!svr.engineId) {
    console.log(`[SVR Compliance] SVR ${svr.id} has no matching Engine. Skipping compliance matching.`);
    return;
  }

  console.log(`[SVR Compliance] Running compliance matching for SVR ${svr.id} (ESN: ${svr.engineSerialNumber})`);

  const currentDocDate = new Date(svr.reportDate || svr.shopOutDate || svr.createdAt);

  // Fetch all active SBs and ADs from database
  const sbs = await prisma.serviceBulletin.findMany({ where: { status: 'ACTIVE' } });

  for (const sbItem of svr.sbStatus) {
    const sbNumClean = cleanIdentifier(sbItem.adNumber);
    const refSbClean = cleanIdentifier(sbItem.referenceSb);

    if (!sbNumClean && !refSbClean) continue;

    // Determine compliance status based on remarks/method
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
      mocLower.includes('not performed')
    ) {
      status = 'OPEN';
    }

    // 2. Try to match with ServiceBulletin (SB) in DB
    let matchedSb = null;
    // Check match against adNumber (which sometimes has SB code like "CFM56-7B SB 72-1082")
    if (sbNumClean) {
      matchedSb = sbs.find(dbSb => {
        const dbSbClean = cleanIdentifier(dbSb.sbNumber);
        return dbSbClean && (sbNumClean.includes(dbSbClean) || dbSbClean.includes(sbNumClean));
      });
    }

    // Fallback: Check match against referenceSb
    if (!matchedSb && refSbClean) {
      matchedSb = sbs.find(dbSb => {
        const dbSbClean = cleanIdentifier(dbSb.sbNumber);
        return dbSbClean && (refSbClean.includes(dbSbClean) || dbSbClean.includes(refSbClean));
      });
    }

    if (matchedSb) {
      console.log(`[SVR Compliance] Matched SB: ${matchedSb.sbNumber} with SVR item: ${sbItem.adNumber || sbItem.referenceSb}`);
      
      const existingCompliance = await prisma.complianceRecord.findUnique({
        where: { engineId_sbId: { engineId: svr.engineId, sbId: matchedSb.id } }
      });

      if (existingCompliance && existingCompliance.sourceDate && existingCompliance.sourceDate > currentDocDate) {
        console.log(`[SVR Compliance] Skipping SB ${matchedSb.sbNumber} because existing record is newer.`);
        continue;
      }

      if (existingCompliance) {
        await prisma.complianceRecord.update({
          where: { id: existingCompliance.id },
          data: {
            status,
            complianceDate: sbItem.notificationDateOfCompliance || svr.shopOutDate || null,
            svrId: svr.id,
            remarks: sbItem.remarks || sbItem.methodOfCompliance || null,
            sourceDate: currentDocDate
          }
        });
      } else {
        await prisma.complianceRecord.create({
          data: {
            engineId: svr.engineId,
            sbId: matchedSb.id,
            status,
            complianceDate: sbItem.notificationDateOfCompliance || svr.shopOutDate || null,
            svrId: svr.id,
            remarks: sbItem.remarks || sbItem.methodOfCompliance || null,
            sourceDate: currentDocDate
          }
        });
      }
    }
  }
};

/**
 * Normalizes raw JSON response/payload into database structures and saves.
 */
const processSvrJson = async (rawPayload, originalFileName = 'payload.json', storedFileName = 'PENDING', docType = 'SVR') => {
  // Dynamic unwrapping of nested SVR payload
  let data = rawPayload;
  if (data && data.svr_schema) {
    if (data.svr_schema.svr_schema) {
      data = data.svr_schema.svr_schema;
    } else {
      data = data.svr_schema;
    }
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Validation Error: Invalid SVR payload structure');
  }

  // Extract SVR properties
  const engineSerialNumber = data.engine_serial_number ? String(data.engine_serial_number) : '';
  if (!engineSerialNumber) {
    throw new Error('Validation Error: engine_serial_number is required in SVR payload');
  }

  const svrData = {
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
  svrData.configurationReport = rawConfigs.map(item => ({
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
  const rawLlps = Array.isArray(data.life_limited_part_status) ? data.life_limited_part_status : [];
  svrData.llpStatus = rawLlps.map(item => ({
    no: item.no !== undefined && item.no !== null ? String(item.no) : '',
    description: item.description || '',
    partNumber: item.part_number || '',
    serialNumber: item.serial_number || '',
    totalHour: item.total_hour || '',
    totalCycle: item.total_cycle !== undefined && item.total_cycle !== null ? String(item.total_cycle) : '',
    totalCyclesCategory: item.total_cycles_category || {},
    lifeLimitCycles: item.life_limit_cycles || {},
    remainingCycles: item.remaining_cycles || {},
    remark: item.remark || ''
  }));

  // Map AD/SB items
  const rawSbs = Array.isArray(data.airworthiness_directive_status) ? data.airworthiness_directive_status : [];
  svrData.sbStatus = rawSbs
    .filter(item => item.ad_number !== null || item.reference_sb !== null) // Filter out empty lines
    .map(item => ({
      adNumber: item.ad_number || '',
      notificationDateOfCompliance: item.notification_date_of_compliance || '',
      description: item.description || '',
      referenceSb: item.reference_sb || '',
      recurrInsp: item.recurr_insp || '',
      moduleApplicability: item.module_applicability || '',
      methodOfCompliance: item.method_of_compliance || '',
      remarks: item.remarks || ''
    }));

  // Save SVR to Database (Murni untuk History Log)
  const svr = await svrRepository.createShopVisitReport(svrData);

  // Sync EngineActiveComponent (Data Terkini) berdasarkan Hirarki Waktu
  if (svr.engineId) {
    console.log(`[SVR Service] Syncing Active Components for Engine: ${svr.engineId}`);
    
    // Parse tanggal dokumen saat ini
    const currentDocDate = new Date(svr.reportDate || svr.shopOutDate || svr.createdAt);
    
    for (const item of svrData.configurationReport) {
      if (!item.partNumber) continue;

      const existing = await prisma.engineActiveComponent.findFirst({
        where: { engineId: svr.engineId, partNumber: item.partNumber }
      });

      // Jika ada komponen aktif yang diubah oleh dokumen yang lebih baru, abaikan dokumen lama ini.
      if (existing && existing.sourceDate && existing.sourceDate > currentDocDate) {
        console.log(`[SVR Service] Skipping part ${item.partNumber} because existing active component is newer.`);
        continue;
      }

      if (item.inOut === 'IN' || item.inOut === 'INSTALLED') {
        if (!existing) {
          await prisma.engineActiveComponent.create({
            data: {
              engineId: svr.engineId,
              partNumber: item.partNumber,
              partName: item.partName,
              module: item.module,
              tsn: item.tsn,
              csn: item.csn,
              lastUpdatedFrom: `SVR-${svr.id}`,
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
              lastUpdatedFrom: `SVR-${svr.id}`,
              sourceDate: currentDocDate
            }
          });
        }
      } else if (item.inOut === 'OUT' || item.inOut === 'REMOVED') {
        await prisma.engineActiveComponent.deleteMany({
          where: { engineId: svr.engineId, partNumber: item.partNumber }
        });
      }
    }
  }

  // Trigger compliance matching
  await matchSvrCompliance(svr);

  // Refetch SVR to include newly created complianceRecords relation
  return svrRepository.findShopVisitReportById(svr.id);
};

/**
 * Handle PDF SVR Upload.
 */
const processSvrPdf = async ({ buffer, fileName, docType = 'SVR' }) => {
  // Generate random hash for file naming
  const hash = crypto.createHash('md5').update(buffer).digest('hex');
  const storedFileName = `engine-doc-${Date.now()}-${hash.slice(0, 10)}.pdf`;
  const storagePath = path.join(SVR_STORAGE_ROOT, storedFileName);

  // Write PDF to disk
  fs.writeFileSync(storagePath, buffer);

  // Send to AI Extractor Client
  console.log(`[Engine Doc Service] Running AI extraction for file: ${fileName} as ${docType}`);
  const aiResult = await svrClient.analyzeEngineDocumentPdf({ fileName, buffer, docType });

  // Ingest extracted JSON
  return processSvrJson(aiResult, fileName, storedFileName, docType);
};

/**
 * Get SVR File Information.
 */
const getSvrFile = async (id) => {
  const svr = await svrRepository.findShopVisitReportById(id);
  if (!svr || !svr.storedFileName || svr.storedFileName === 'PENDING') {
    throw new Error('Not Found: SVR PDF file does not exist');
  }
  const storagePath = path.join(SVR_STORAGE_ROOT, svr.storedFileName);
  if (!fs.existsSync(storagePath)) {
    throw new Error('Not Found: SVR PDF file not found on disk');
  }
  return {
    storagePath,
    fileName: svr.originalFileName || `${svr.engineSerialNumber}-SVR.pdf`,
    mimeType: 'application/pdf'
  };
};

module.exports = {
  processSvrJson,
  processSvrPdf,
  getSvrFile,
  matchSvrCompliance
};
