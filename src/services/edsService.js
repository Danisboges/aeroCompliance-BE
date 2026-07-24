const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const prisma = require('../db');
const edsRepository = require('../repositories/edsRepository');
const edsClient = require('../clients/edsClient');

const eds_STORAGE_ROOT = path.resolve(__dirname, '../../uploads/eds-documents');

// Ensure directory exists synchronously
if (!fs.existsSync(eds_STORAGE_ROOT)) {
  fs.mkdirSync(eds_STORAGE_ROOT, { recursive: true });
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
const matchedsCompliance = async (eds) => {
  if (!eds.engineId) {
    console.log(`[eds Compliance] eds ${eds.id} has no matching Engine. Skipping compliance matching.`);
    return;
  }

  console.log(`[eds Compliance] Running compliance matching for eds ${eds.id} (ESN: ${eds.engineSerialNumber})`);

  // Fetch all active SBs and ADs from database
  const sbs = await prisma.serviceBulletin.findMany({ where: { status: 'ACTIVE' } });
  const ads = await prisma.airworthinessDirective.findMany({ where: { status: 'ACTIVE' } });

  for (const adItem of eds.adStatus) {
    const adNumClean = cleanIdentifier(adItem.adNumber);
    const refSbClean = cleanIdentifier(adItem.referenceSb);

    if (!adNumClean && !refSbClean) continue;

    // Determine compliance status based on remarks/method
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
      mocLower.includes('not performed')
    ) {
      status = 'OPEN';
    }

    // 1. Try to match with AirworthinessDirective (AD) in DB
    let matchedAd = null;
    if (adNumClean) {
      matchedAd = ads.find(dbAd => {
        const dbAdClean = cleanIdentifier(dbAd.adNumber);
        return dbAdClean && (adNumClean.includes(dbAdClean) || dbAdClean.includes(adNumClean));
      });
    }

    if (matchedAd) {
      console.log(`[eds Compliance] Matched AD: ${matchedAd.adNumber} with eds item: ${adItem.adNumber}`);
      await prisma.complianceRecord.upsert({
        where: {
          engineId_adId: {
            engineId: eds.engineId,
            adId: matchedAd.id
          }
        },
        create: {
          engineId: eds.engineId,
          adId: matchedAd.id,
          status,
          complianceDate: adItem.notificationDateOfCompliance || eds.shopOutDate || null,
          edsId: eds.id,
          remarks: adItem.remarks || adItem.methodOfCompliance || null
        },
        update: {
          status,
          complianceDate: adItem.notificationDateOfCompliance || eds.shopOutDate || null,
          edsId: eds.id,
          remarks: adItem.remarks || adItem.methodOfCompliance || null
        }
      });
      continue; // Skip SB checking if AD matched
    }

    // 2. Try to match with ServiceBulletin (SB) in DB
    let matchedSb = null;
    // Check match against adNumber (which sometimes has SB code like "CFM56-7B SB 72-1082")
    if (adNumClean) {
      matchedSb = sbs.find(dbSb => {
        const dbSbClean = cleanIdentifier(dbSb.sbNumber);
        return dbSbClean && (adNumClean.includes(dbSbClean) || dbSbClean.includes(adNumClean));
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
      console.log(`[eds Compliance] Matched SB: ${matchedSb.sbNumber} with eds item: ${adItem.adNumber || adItem.referenceSb}`);
      await prisma.complianceRecord.upsert({
        where: {
          engineId_sbId: {
            engineId: eds.engineId,
            sbId: matchedSb.id
          }
        },
        create: {
          engineId: eds.engineId,
          sbId: matchedSb.id,
          status,
          complianceDate: adItem.notificationDateOfCompliance || eds.shopOutDate || null,
          edsId: eds.id,
          remarks: adItem.remarks || adItem.methodOfCompliance || null
        },
        update: {
          status,
          complianceDate: adItem.notificationDateOfCompliance || eds.shopOutDate || null,
          edsId: eds.id,
          remarks: adItem.remarks || adItem.methodOfCompliance || null
        }
      });
    }
  }
};

/**
 * Normalizes raw JSON response/payload into database structures and saves.
 */
const processEdsJson = async (rawPayload, originalFileName = 'payload.json', storedFileName = 'PENDING', docType = 'EDS') => {
  // Dynamic unwrapping of nested eds payload
  let data = rawPayload;
  if (data && data.eds_schema) {
    if (data.eds_schema.eds_schema) {
      data = data.eds_schema.eds_schema;
    } else {
      data = data.eds_schema;
    }
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Validation Error: Invalid eds payload structure');
  }

  // Extract eds properties
  const engineSerialNumber = data.engine_serial_number ? String(data.engine_serial_number) : '';
  if (!engineSerialNumber) {
    throw new Error('Validation Error: engine_serial_number is required in eds payload');
  }

  const edsData = {
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
  edsData.configurationReport = rawConfigs.map(item => ({
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
  edsData.llpStatus = rawLlps.map(item => ({
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
  const rawAds = Array.isArray(data.airworthiness_directive_status) ? data.airworthiness_directive_status : [];
  edsData.adStatus = rawAds
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

  // Save eds to Database (Murni untuk History Log)
  const eds = await edsRepository.createEngineDataSheet(edsData);

  // Sync EngineActiveComponent (Data Terkini)
  if (eds.engineId) {
    console.log(`[eds Service] Syncing Active Components for Engine: ${eds.engineId}`);
    for (const item of edsData.configurationReport) {
      if (!item.partNumber) continue;

      if (item.inOut === 'IN' || item.inOut === 'INSTALLED') {
        // Tambahkan ke tabel aktif
        const existing = await prisma.engineActiveComponent.findFirst({
          where: { engineId: eds.engineId, partNumber: item.partNumber }
        });
        
        if (!existing) {
          await prisma.engineActiveComponent.create({
            data: {
              engineId: eds.engineId,
              partNumber: item.partNumber,
              partName: item.partName,
              module: item.module,
              tsn: item.tsn,
              csn: item.csn,
              lastUpdatedFrom: `eds-${eds.id}`
            }
          });
        }
      } else if (item.inOut === 'OUT' || item.inOut === 'REMOVED') {
        // Hapus dari tabel aktif jika dicabut
        await prisma.engineActiveComponent.deleteMany({
          where: { engineId: eds.engineId, partNumber: item.partNumber }
        });
      }
    }
  }

  // Trigger compliance matching
  await matchedsCompliance(eds);

  // Refetch eds to include newly created complianceRecords relation
  return edsRepository.findEngineDataSheetById(eds.id);
};

/**
 * Handle PDF eds Upload.
 */
const processEdsPdf = async ({ buffer, fileName, docType = 'EDS' }) => {
  // Generate random hash for file naming
  const hash = crypto.createHash('md5').update(buffer).digest('hex');
  const storedFileName = `engine-doc-${Date.now()}-${hash.slice(0, 10)}.pdf`;
  const storagePath = path.join(eds_STORAGE_ROOT, storedFileName);

  // Write PDF to disk
  fs.writeFileSync(storagePath, buffer);

  // Send to AI Extractor Client
  console.log(`[Engine Doc Service] Running AI extraction for file: ${fileName} as ${docType}`);
  const aiResult = await edsClient.analyzeEngineDocumentPdf({ fileName, buffer, docType });

  // Ingest extracted JSON
  return processEdsJson(aiResult, fileName, storedFileName, docType);
};

/**
 * Get eds File Information.
 */
const getedsFile = async (id) => {
  const eds = await edsRepository.findEngineDataSheetById(id);
  if (!eds || !eds.storedFileName || eds.storedFileName === 'PENDING') {
    throw new Error('Not Found: eds PDF file does not exist');
  }
  const storagePath = path.join(eds_STORAGE_ROOT, eds.storedFileName);
  if (!fs.existsSync(storagePath)) {
    throw new Error('Not Found: eds PDF file not found on disk');
  }
  return {
    storagePath,
    fileName: eds.originalFileName || `${eds.engineSerialNumber}-eds.pdf`,
    mimeType: 'application/pdf'
  };
};

module.exports = {
  processEdsJson,
  processEdsPdf,
  getedsFile,
  matchedsCompliance
};

