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

  console.log(`[EDS Compliance] Running compliance matching for EDS ${eds.id} (ESN: ${eds.engineSerialNumber})`);

  const currentDocDate = new Date(eds.reportDate || eds.shopOutDate || eds.createdAt);

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
      console.log(`[EDS Compliance] Matched AD: ${matchedAd.adNumber} with EDS item: ${adItem.adNumber}`);
      
      const existingCompliance = await prisma.complianceRecord.findUnique({
        where: { engineId_adId: { engineId: eds.engineId, adId: matchedAd.id } }
      });

      if (existingCompliance && existingCompliance.sourceDate && existingCompliance.sourceDate > currentDocDate) {
        console.log(`[EDS Compliance] Skipping AD ${matchedAd.adNumber} because existing record is newer.`);
        continue;
      }

      if (existingCompliance) {
        await prisma.complianceRecord.update({
          where: { id: existingCompliance.id },
          data: {
            status,
            complianceDate: adItem.notificationDateOfCompliance || eds.shopOutDate || null,
            edsId: eds.id,
            remarks: adItem.remarks || adItem.methodOfCompliance || null,
            sourceDate: currentDocDate
          }
        });
      } else {
        await prisma.complianceRecord.create({
          data: {
            engineId: eds.engineId,
            adId: matchedAd.id,
            status,
            complianceDate: adItem.notificationDateOfCompliance || eds.shopOutDate || null,
            edsId: eds.id,
            remarks: adItem.remarks || adItem.methodOfCompliance || null,
            sourceDate: currentDocDate
          }
        });
      }
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
      console.log(`[EDS Compliance] Matched SB: ${matchedSb.sbNumber} with EDS item: ${adItem.adNumber || adItem.referenceSb}`);
      
      const existingCompliance = await prisma.complianceRecord.findUnique({
        where: { engineId_sbId: { engineId: eds.engineId, sbId: matchedSb.id } }
      });

      if (existingCompliance && existingCompliance.sourceDate && existingCompliance.sourceDate > currentDocDate) {
        console.log(`[EDS Compliance] Skipping SB ${matchedSb.sbNumber} because existing record is newer.`);
        continue;
      }

      if (existingCompliance) {
        await prisma.complianceRecord.update({
          where: { id: existingCompliance.id },
          data: {
            status,
            complianceDate: adItem.notificationDateOfCompliance || eds.shopOutDate || null,
            edsId: eds.id,
            remarks: adItem.remarks || adItem.methodOfCompliance || null,
            sourceDate: currentDocDate
          }
        });
      } else {
        await prisma.complianceRecord.create({
          data: {
            engineId: eds.engineId,
            sbId: matchedSb.id,
            status,
            complianceDate: adItem.notificationDateOfCompliance || eds.shopOutDate || null,
            edsId: eds.id,
            remarks: adItem.remarks || adItem.methodOfCompliance || null,
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
  const eds = await edsRepository.createengineDataSubmittal(edsData);

  // Sync EngineActiveComponent (Data Terkini) berdasarkan Hirarki Waktu
  if (eds.engineId) {
    console.log(`[EDS Service] Syncing Active Components for Engine: ${eds.engineId}`);
    
    // Parse tanggal dokumen saat ini
    const currentDocDate = new Date(eds.reportDate || eds.shopOutDate || eds.createdAt);
    
    for (const item of edsData.configurationReport) {
      if (!item.partNumber) continue;

      const existing = await prisma.engineActiveComponent.findFirst({
        where: { engineId: eds.engineId, partNumber: item.partNumber }
      });

      // Jika ada komponen aktif yang diubah oleh dokumen yang lebih baru, abaikan dokumen lama ini.
      if (existing && existing.sourceDate && existing.sourceDate > currentDocDate) {
        console.log(`[EDS Service] Skipping part ${item.partNumber} because existing active component is newer.`);
        continue;
      }

      if (item.inOut === 'IN' || item.inOut === 'INSTALLED') {
        if (!existing) {
          await prisma.engineActiveComponent.create({
            data: {
              engineId: eds.engineId,
              partNumber: item.partNumber,
              partName: item.partName,
              module: item.module,
              tsn: item.tsn,
              csn: item.csn,
              lastUpdatedFrom: `EDS-${eds.id}`,
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
              lastUpdatedFrom: `EDS-${eds.id}`,
              sourceDate: currentDocDate
            }
          });
        }
      } else if (item.inOut === 'OUT' || item.inOut === 'REMOVED') {
        await prisma.engineActiveComponent.deleteMany({
          where: { engineId: eds.engineId, partNumber: item.partNumber }
        });
      }
    }
  }

  // Trigger compliance matching
  await matchedsCompliance(eds);

  // Refetch eds to include newly created complianceRecords relation
  return edsRepository.findengineDataSubmittalById(eds.id);
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
  const eds = await edsRepository.findengineDataSubmittalById(id);
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

