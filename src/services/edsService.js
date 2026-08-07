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

  const currentDocDate = new Date(eds.createdAt);

  // Fetch all active SBs and ADs from database
  const sbs = await prisma.serviceBulletin.findMany({ where: { status: 'ACTIVE' } });
  const ads = await prisma.airworthinessDirective.findMany({ where: { status: 'ACTIVE' } });

  // --- Match Service Bulletins ---
  for (const sbItem of eds.sbStatus || []) {
    const sbNumClean = cleanIdentifier(sbItem.sbNumber);

    if (!sbNumClean) continue;

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
      mocLower.includes('not performed') ||
      mocLower === 'open'
    ) {
      status = 'OPEN';
    }

    // Try to match with ServiceBulletin (SB) in DB
    let matchedSb = null;
    if (sbNumClean) {
      matchedSb = sbs.find(dbSb => {
        const dbSbClean = cleanIdentifier(dbSb.sbNumber);
        return dbSbClean && (sbNumClean.includes(dbSbClean) || dbSbClean.includes(sbNumClean));
      });
    }

    if (matchedSb) {
      console.log(`[EDS Compliance] Matched SB: ${matchedSb.sbNumber} with EDS item: ${sbItem.sbNumber}`);
      
      const existingCompliance = await prisma.complianceRecord.findUnique({
        where: { engineId_sbId: { engineId: eds.engineId, sbId: matchedSb.id } }
      });

      if (existingCompliance && existingCompliance.sourceDate && existingCompliance.sourceDate > currentDocDate) {
        console.log(`[EDS Compliance] Skipping SB ${matchedSb.sbNumber} because existing record is newer.`);
        continue;
      }

      const payloadData = {
        status,
        complianceDate: sbItem.notificationDateOfCompliance || null,
        edsId: eds.id,
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
            engineId: eds.engineId,
            sbId: matchedSb.id
          }
        });
      }
    }
  }

  // --- Match Airworthiness Directives ---
  for (const adItem of eds.adStatus || []) {
    const adNumClean = cleanIdentifier(adItem.adNumber);

    if (!adNumClean) continue;

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
      mocLower.includes('not performed') ||
      mocLower === 'open'
    ) {
      status = 'OPEN';
    }

    // Try to match with AirworthinessDirective (AD) in DB
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

      const payloadData = {
        status,
        complianceDate: adItem.notificationDateOfCompliance || null,
        edsId: eds.id,
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
            engineId: eds.engineId,
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
    originalFileName,
    storedFileName,
    rawPayload
  };

  // Map configuration items
  const rawConfigs = Array.isArray(data.configuration_report) ? data.configuration_report : [];
  edsData.configurationReport = rawConfigs.map(item => ({
    module: item.module || '',
    partName: item.part_name || '',
    inOut: item.in_out || 'INSTALLED', // Default to INSTALLED for EDS if not specified
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
  edsData.llpStatus = rawLlps.map(item => ({
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
  edsData.sbStatus = rawSbs
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
  edsData.adStatus = rawAds
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

  // Map accessories installed/removed during the EDS configuration update
  const rawAccessories = Array.isArray(data.accessories_list) ? data.accessories_list : [];
  edsData.accessoriesList = rawAccessories.map(item => ({
    no: item.no !== undefined && item.no !== null ? String(item.no) : '',
    description: item.description || '',
    receivedPn: item.received?.pn || '',
    receivedSn: item.received?.sn || '',
    receivedTsn: item.received?.tsn !== undefined && item.received?.tsn !== null
      ? String(item.received.tsn)
      : '',
    receivedTso: item.received?.tso !== undefined && item.received?.tso !== null
      ? String(item.received.tso)
      : '',
    installedPn: item.installed?.pn || '',
    installedSn: item.installed?.sn || '',
    installedTsn: item.installed?.tsn !== undefined && item.installed?.tsn !== null
      ? String(item.installed.tsn)
      : '',
    installedTso: item.installed?.tso !== undefined && item.installed?.tso !== null
      ? String(item.installed.tso)
      : '',
    maintenancePerformed: item.maintenance_performed || ''
  }));

  // Save eds to Database (Murni untuk History Log)
  const eds = await edsRepository.createengineDataSubmittal(edsData);

  // Sync EngineActiveComponent (Data Terkini) berdasarkan Hirarki Waktu
  if (eds.engineId) {
    console.log(`[EDS Service] Syncing Active Components for Engine: ${eds.engineId}`);
    console.log(`[EDS Service] Extracted ${edsData.configurationReport.length} components from EDS`);
    let syncedCount = 0;
    
    // Parse tanggal dokumen saat ini
    const currentDocDate = new Date(data.report_date || data.shop_out_date || eds.createdAt);
    
    for (const item of edsData.configurationReport) {
      if (!item.partNumber) {
        console.log(`[EDS Service] Skipping component because partNumber is missing: ${JSON.stringify(item)}`);
        continue;
      }

      const existing = await prisma.engineActiveComponent.findFirst({
        where: { engineId: eds.engineId, partNumber: item.partNumber }
      });

      // Jika ada komponen aktif yang diubah oleh dokumen yang lebih baru, abaikan dokumen lama ini.
      if (existing && existing.sourceDate && existing.sourceDate > currentDocDate) {
        console.log(`[EDS Service] Skipping part ${item.partNumber} because existing active component is newer.`);
        continue;
      }

      // For EDS, all items are inherently "INSTALLED" as it's a baseline document
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
        syncedCount++;
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
        syncedCount++;
      }
    }
    console.log(`[EDS Service] Successfully synced ${syncedCount} components to EngineActiveComponent.`);
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

/**
 * List all EDS with pagination.
 */
const listEngineDataSubmittals = async (query = {}) => {
  const { page = 1, limit = 20, esn } = query;
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    edsRepository.listengineDataSubmittals({ skip, take: limit, esn }),
    edsRepository.countengineDataSubmittals({ esn })
  ]);

  const formattedItems = items.map(eds => {
    return {
      id: eds.id,
      engineSerialNumber: eds.engineSerialNumber,
      engineType: eds.engineType,
      createdAt: eds.createdAt,
      updatedAt: eds.updatedAt,
      originalFileName: eds.originalFileName,
      storedFileName: eds.storedFileName,
      hasPdf: Boolean(eds.storedFileName && eds.storedFileName !== 'PENDING'),
      engine: eds.engine,
      summary: {
        configurationItems: eds.configurationReport.length,
        llpItems: eds.llpStatus.length,
        serviceBulletins: eds.sbStatus.length,
        airworthinessDirectives: eds.adStatus.length,
        accessories: eds.accessoriesList.length,
        complianceRecords: eds.complianceRecords.length
      }
    };
  });

  return {
    items: formattedItems,
    pagination: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total,
      totalPages: Math.ceil(total / limit) || 1
    }
  };
};

/**
 * Get detailed EDS by ID.
 */
const getEngineDataSubmittalById = async (id) => {
  const eds = await edsRepository.findengineDataSubmittalById(id);
  if (!eds) {
    throw new Error('Not Found: Engine Data Submittal does not exist');
  }
  return eds;
};

module.exports = {
  processEdsJson,
  processEdsPdf,
  getedsFile,
  matchedsCompliance,
  listEngineDataSubmittals,
  getEngineDataSubmittalById
};
