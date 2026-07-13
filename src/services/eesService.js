const prisma = require('../db');
const eesRepository = require('../repositories/eesRepository');

/**
 * Validates and processes the EES webhook payload.
 *
 * SCHEMA CHANGE: EesDocument tidak lagi menyimpan `bulletinNumber` sebagai teks.
 * Sekarang menggunakan `sourceSbId` (FK ke ServiceBulletin).
 * Service ini bertugas me-resolve bulletinNumber → ServiceBulletin.id
 * sebelum meneruskan ke repository.
 *
 * @param {Object} payload - The raw request payload from the AI.
 * @param {string} payload.eesNumber      - Nomor unik dokumen EES.
 * @param {string} payload.bulletinNumber - Nomor SB yang menjadi sumber EES ini.
 * @param {Array}  payload.evaluations    - Array of evaluation items.
 * @returns {Promise<Object>} EesDocument yang berhasil dibuat beserta evaluations.
 */

const formatReferences = (references) => {
  let refArray = [];
  if (Array.isArray(references)) {
    refArray = references;
  } else if (typeof references === 'string') {
    const cleanStr = references.replace(/[\r\n\t]+/g, ' ');
    if (cleanStr.includes(',')) {
      refArray = cleanStr
        .split(',')
        .map(r => r.trim())
        .filter(r => r.length > 0);
    } else {
      refArray = [cleanStr.trim()];
    }
  }

  const boilerplateKeywords = [
    'subject to the restrictions', 
    'proprietary information', 
    'cfm proprietary', 
    'ge proprietary', 
    'not to be used',
    'disclosed to others'
  ];

  const uniqueRefs = [];
  const seen = new Set();

  for (const ref of refArray) {
    let cleaned = ref.replace(/\s+/g, ' ').trim();
    cleaned = cleaned.replace(/-\s+/g, '-');

    if (!cleaned) continue;
    
    const lowerCleaned = cleaned.toLowerCase();
    
    if (cleaned.length <= 2) continue;
    if (['and as follows:', 'and as follows'].some(k => lowerCleaned.includes(k))) continue;
    
    const isBoilerplate = boilerplateKeywords.some(keyword => lowerCleaned.includes(keyword));
    if (isBoilerplate) continue;

    if (!seen.has(lowerCleaned)) {
      seen.add(lowerCleaned);
      uniqueRefs.push(cleaned);
    }
  }

  if (uniqueRefs.length === 0) return '-';
  
  return uniqueRefs.map(r => `- ${r}`).join('\n');
};

/**
 * Normalizes different variations of OCR/AI payloads into a standard format.
 * Supports:
 * - sb_code or bulletinNumber
 * - items object (with dynamic keys) or evaluations array
 * - paragraph mapping to requirementDesc if description is missing
 */
const normalizeOcrPayload = (rawPayload) => {
  let payload = rawPayload;
  if (payload && payload.provider && payload.payload) {
    payload = payload.payload;
  }
  if (payload && payload.mro_schema) {
    if (payload.mro_schema.mro_schema) {
      payload = payload.mro_schema.mro_schema;
    } else {
      payload = payload.mro_schema;
    }
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Validation Error: OCR payload must be an object');
  }

  // 1. Resolve Bulletin Number (sb_code / bulletinNumber / sbNumber)
  const bulletinNumber = payload.bulletinNumber || payload.sb_code || payload.sbNumber;
  if (!bulletinNumber) {
    throw new Error('Validation Error: OCR payload must contain bulletinNumber or sb_code');
  }

  // 2. Resolve EES Number (eesNumber / ees_number)
  // Generating a unique default if not provided
  const eesNumber = payload.eesNumber || payload.ees_number || `EES-${bulletinNumber}-${Date.now()}`;

  // 3. Resolve Compliance Category & Alert Logic
  const category = payload.compliance_category;
  const isAlert =
    (typeof category === 'string' && category.toLowerCase().includes('alert')) ||
    (typeof payload.task_type === 'string' && payload.task_type.toLowerCase().includes('alert'));
  
  const isCategoryManual = (typeof category === 'number' && category <= 3) || (typeof category === 'string' && ['1', '2', '3'].includes(category));
  const requiresManualEes = isCategoryManual || isAlert;

  // 4. Resolve Manufacturer
  const manufacturer = payload.manufacturer || (payload.mro_schema && payload.mro_schema.mro_schema && payload.mro_schema.mro_schema.manufacturer) || null;

  // 5. Resolve Evaluations / Items
  let evaluations = [];

  let rawItems = [];
  
  // NEW Format (problem_evidence + description)
  if (Array.isArray(payload.problem_evidence)) {
    rawItems = rawItems.concat(payload.problem_evidence);
  }
  if (Array.isArray(payload.description)) {
    rawItems = rawItems.concat(payload.description);
  }
  
  // OLD Format fallback
  if (rawItems.length === 0) {
    if (Array.isArray(payload.evaluations)) {
      rawItems = rawItems.concat(payload.evaluations);
    } else if (Array.isArray(payload.items)) {
      rawItems = rawItems.concat(payload.items);
    } else if (payload.items && typeof payload.items === 'object') {
      for (const key of Object.keys(payload.items)) {
        if (Array.isArray(payload.items[key])) {
          rawItems = rawItems.concat(payload.items[key]);
        }
      }
    }
  }

  // Map each raw item to schema fields
  evaluations = rawItems.map((item, index) => {
    const isApplicable = item.isApplicable !== undefined ? Boolean(item.isApplicable) : true;
    return {
      itemNo: item.itemNo !== undefined && item.itemNo !== null ? String(item.itemNo) : String(index + 1),
      requirementDesc: item.requirement_desc || item.requirementDesc || item.paragraph || 'No description provided',
      remarks: item.remark || item.remarks || '',
      taskType: item.taskType || payload.task_type || '',
      isApplicable
    };
  });

  return {
    eesNumber,
    bulletinNumber,
    title: payload.tittle || payload.title || '',
    issuer: payload.effected_type || payload.issuer || '',
    taskType: payload.task_type || '',
    references: formatReferences(payload.references),
    effectedType: payload.effected_type || '',
    effectedModel: Array.isArray(payload.effected_model) ? payload.effected_model.join(', ') : (typeof payload.effected_model === 'string' ? payload.effected_model : ''),
    aircraftType: payload.aircraftType,
    aircraftId: payload.aircraftId,
    manufacturer,
    partNumber: payload.part_number || (payload.mro_schema && payload.mro_schema.mro_schema ? payload.mro_schema.mro_schema.part_number : '') || '',
    requiresManualEes,
    evaluations,
  };
};

/**
 * Validates and processes the EES webhook payload.
 */
const processEesWebhook = async (payload, explicitSourceSbId = null) => {
  const normalized = normalizeOcrPayload(payload);
  const { eesNumber, bulletinNumber, evaluations, taskType, references, effectedType, effectedModel, aircraftType, manufacturer, partNumber } = normalized;

  let sourceSbId = explicitSourceSbId;

  if (!sourceSbId) {
    // Resolve bulletinNumber → ServiceBulletin agar bisa mengisi sourceSbId
    const sb = await prisma.serviceBulletin.findUnique({
      where: { sbNumber: bulletinNumber },
    });

    if (!sb) {
      throw new Error(
        `Validation Error: ServiceBulletin dengan sbNumber '${bulletinNumber}' tidak ditemukan. ` +
        `Pastikan ServiceBulletin sudah dibuat sebelum membuat EesDocument.`
      );
    }
    sourceSbId = sb.id;
  }

  if (manufacturer) {
    await prisma.serviceBulletin.update({
      where: { id: sourceSbId },
      data: { issuer: manufacturer }
    });
  }

  // Teruskan ke repository dengan sourceSbId yang sudah di-resolve
  return await eesRepository.createEesDocument(
    { eesNumber, sourceSbId, taskType, references, effectedType, effectedModel, aircraftType, partNumber },
    evaluations
  );
};

module.exports = {
  processEesWebhook,
  normalizeOcrPayload,
};
