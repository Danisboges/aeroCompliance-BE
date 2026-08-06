const prisma = require('../db');
const eesRepository = require('../repositories/eesRepository');

const normalizeAdRelated = (value) => {
  if (value === undefined || value === null || value === '') return null;
  if (value === true || value === 1) return 'Y';
  if (value === false || value === 0) return 'N';

  const normalized = String(value).trim();
  const lower = normalized.toLowerCase();
  if (['true', 'yes', 'y', '1'].includes(lower)) return 'Y';
  if (['false', 'no', 'n', '0'].includes(lower)) return 'N';
  return normalized || null;
};

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
  
  // NEW Format (effectivity + problem_evidence + description)
  if (Array.isArray(payload.effectivity)) {
    rawItems = rawItems.concat(payload.effectivity.map(i => ({ ...i, paragraph: 'EFFECTIVITY' })));
  }
  if (Array.isArray(payload.problem_evidence)) {
    rawItems = rawItems.concat(payload.problem_evidence.map(i => ({ ...i, paragraph: 'PROBLEM_EVIDENCE' })));
  }
  if (Array.isArray(payload.description)) {
    rawItems = rawItems.concat(payload.description.map(i => ({ ...i, paragraph: 'DESCRIPTION' })));
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

  const normalizeBoolean = (val) => {
    if (val === true || val === false) return val;
    if (typeof val === 'string') {
      const lower = val.toLowerCase().trim();
      if (lower === 'true' || lower === '1') return true;
      if (lower === 'false' || lower === '0') return false;
    }
    if (val === 1) return true;
    if (val === 0) return false;
    return null; // Fallback
  };

  // Map each raw item to schema fields
  evaluations = rawItems.map((item, index) => {
    let isApplicable = normalizeBoolean(item.isApplicable);
    if (isApplicable === null) isApplicable = true; // Default

    let requirementDesc = item.requirement_desc || item.requirementDesc || item.paragraph;
    if (!requirementDesc || typeof requirementDesc !== 'string' || requirementDesc.trim() === '') {
      requirementDesc = 'No description provided';
    }

    let dueAt = null;
    if (item.dueAt) {
      const parsedDate = new Date(item.dueAt);
      if (!isNaN(parsedDate.getTime())) {
        dueAt = parsedDate;
      }
    }

    return {
      itemNo: item.itemNo !== undefined && item.itemNo !== null ? String(item.itemNo) : String(index + 1),
      paragraph: item.paragraph || item.paragraph_number || null,
      requirementDesc,
      remarks: item.remark || item.remarks || '',
      taskType: item.taskType || payload.task_type || '',
      references: item.references || item.reference || item.ref || null,
      adRelated: normalizeAdRelated(
        item.adRelated ??
        item.ad_related ??
        payload.adRelated ??
        payload.ad_related
      ),
      warranty: normalizeBoolean(item.warranty ?? payload.warranty),
      rep: item.rep ?? payload.rep ?? null,
      isApplicable,
      dueAt,
      affectedAcEngine: item.affectedAcEngine || item.affected_engine || item.effected_engine || item.effectivity || null
    };
  });

  const effectedModel = Array.isArray(payload.effected_model)
    ? payload.effected_model
        .map(String)
        .map((value) => value.trim())
        .filter(Boolean)
        .join(", ")
    : typeof payload.effected_model === "string"
      ? payload.effected_model.trim()
      : null;

    let recommendedAction = payload.recommendedAction || payload.recommended_action || null;
    if (!recommendedAction && Array.isArray(payload.engineeringAction)) {
      const ea = payload.engineeringAction;
      if (ea.includes('Yes')) recommendedAction = 'COMPLY';
      else if (ea.includes('Hold/Postpone')) recommendedAction = 'DEFER';
      else if (ea.includes('No')) recommendedAction = 'NA';
    }

  return {
    eesNumber,
    bulletinNumber,
    title: payload.tittle || payload.title || '',
    issuer: payload.manufacturer || payload.effected_type || payload.issuer || '',
    taskType: payload.task_type || payload.taskType || '',
    recommendedAction,
    references: payload.references || null,
    effectedType: payload.effected_type || payload.effectivityType || '',
    effectedModel,
    aircraftType: payload.aircraftType,
    aircraftId: payload.aircraftId,
    manufacturer,
    partNumber: payload.part_number || payload.partNumber || (payload.mro_schema && payload.mro_schema.mro_schema ? payload.mro_schema.mro_schema.part_number : '') || '',
    componentType: payload.component_type || payload.componentType || null,
    complianceTimeType: payload.compliance_time_type || payload.complianceTimeType || null,
    isRepetitive: normalizeBoolean(payload.repetitive !== undefined ? payload.repetitive : payload.isRepetitive),
    note: payload.note || payload.remarks || payload.remark || null,
    requiresManualEes,
    isManualEdited: normalizeBoolean(payload.isManualEdited) || false,
    esn: payload.esn || null,
    
    evaluations,
  };
};

/**
 * Validates and processes the EES webhook payload.
 */
const processEesWebhook = async (payload, explicitSourceSbId = null) => {
  const normalized = normalizeOcrPayload(payload);
  const {
    eesNumber,
    bulletinNumber,
    evaluations,
    taskType,
    recommendedAction,
    references,
    effectedType,
    effectedModel,
    aircraftType,
    manufacturer,
    partNumber,
    componentType,
    complianceTimeType,
    isRepetitive,
    note,
    isManualEdited,
    esn,
    
  } = normalized;

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

  // Parse & Store AI SB Relations & Requirement Groups
  const rawData = payload?.mro_schema?.mro_schema ? payload.mro_schema.mro_schema : (payload?.mro_schema || payload);
  if (rawData) {
    await parseAiSbRelations(sourceSbId, rawData.sb_relations, rawData.supersedes);
  }

  if (normalized.requiresManualEes && !explicitSourceSbId) {
    console.log(`[EesWebhook] Skipping automatic EES generation for manual category / alert SB: ${bulletinNumber}`);
    return null; // Skip EES generation for manual category
  }

  // Teruskan ke repository dengan sourceSbId yang sudah di-resolve
  return await eesRepository.createEesDocument(
    { 
      eesNumber, sourceSbId, taskType, recommendedAction, references, effectedType, effectedModel, aircraftType, 
      partNumber, componentType, complianceTimeType, isRepetitive, note, isManualEdited, esn
    },
    evaluations
  );
};

const listEesDocuments = async (query = {}) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    eesRepository.listEesDocuments({ skip, take: limit }),
    eesRepository.countEesDocuments()
  ]);

  // Extract unique assignedToIds
  const assignedToIds = [...new Set(items.map(i => i.approval?.assignedToId).filter(Boolean))];
  
  let userMap = {};
  if (assignedToIds.length > 0) {
    const users = await prisma.user.findMany({
      where: { id: { in: assignedToIds } },
      select: { id: true, username: true, email: true, role: true }
    });
    userMap = users.reduce((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {});
  }

  // Format the output items
  const formattedItems = items.map(item => {
    const assignedEngineer = item.approval?.assignedToId ? userMap[item.approval.assignedToId] : null;
    
    return {
      ...item,
      category: item.sourceSb?.complianceCategory,
      assignedEngineer: assignedEngineer ? {
        id: assignedEngineer.id,
        username: assignedEngineer.username,
        role: assignedEngineer.role
      } : null
    };
  });

  return {
    items: formattedItems,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1
    }
  };
};

const getEesDocumentById = async (id) => {
  const doc = await eesRepository.getEesDocumentById(id);
  if (!doc) {
    throw new Error('Not Found: EES Document does not exist');
  }

  // Fetch assigned engineer if exists
  let assignedEngineer = null;
  if (doc.approval && doc.approval.assignedToId) {
    const user = await prisma.user.findUnique({
      where: { id: doc.approval.assignedToId },
      select: { id: true, username: true, role: true }
    });
    assignedEngineer = user;
  }

  return {
    ...doc,
    category: doc.sourceSb?.complianceCategory,
    assignedEngineer
  };
};

const parseAiSbRelations = async (sourceSbId, sbRelations, supersedesObj) => {
  if (!sourceSbId) return;

  const sourceSb = await prisma.serviceBulletin.findUnique({
    where: { id: sourceSbId },
    select: { sbNumber: true }
  });

  if (!sourceSb) return;

  // 1. Process "post" relations (Disjunctive OR / ANY_OF)
  if (sbRelations && sbRelations.post && Array.isArray(sbRelations.post.sb) && sbRelations.post.sb.length > 0) {
    const rule = sbRelations.post.operator === 'ONE OF' ? 'ANY_OF' : 'ALL_OF';
    const groupCode = `POST-GRP-${sourceSbId.slice(0, 8)}`;

    const reqGroup = await prisma.sbRequirementGroup.upsert({
      where: { groupCode },
      create: {
        groupCode,
        groupName: `Post-condition Prerequisite Group for ${sourceSb.sbNumber}`,
        fulfillmentRule: rule,
        minimumRequired: rule === 'ANY_OF' ? 1 : sbRelations.post.sb.length
      },
      update: {
        fulfillmentRule: rule,
        minimumRequired: rule === 'ANY_OF' ? 1 : sbRelations.post.sb.length
      }
    });

    for (const targetSbNum of sbRelations.post.sb) {
      const fullTargetSb = targetSbNum.includes('S/B') || targetSbNum.includes('SB') ? targetSbNum : `CFM56-7B S/B ${targetSbNum}`;
      
      const existingRel = await prisma.sbRelation.findFirst({
        where: { sourceSbId, targetSbNumber: fullTargetSb, relationType: 'CONCURRENT', conditionType: 'POST' }
      });

      if (!existingRel) {
        await prisma.sbRelation.create({
          data: {
            sourceSbId,
            targetSbNumber: fullTargetSb,
            relationType: 'CONCURRENT',
            conditionType: 'POST'
          }
        });
      }

      await prisma.sbRequirementMember.upsert({
        where: {
          requirementGroupId_targetSbNumber: {
            requirementGroupId: reqGroup.id,
            targetSbNumber: fullTargetSb
          }
        },
        create: { requirementGroupId: reqGroup.id, targetSbNumber: fullTargetSb },
        update: {}
      });

      // Update status target SB menjadi CONCURRENT jika ada di DB
      const targetSbInDb = await prisma.serviceBulletin.findUnique({
        where: { sbNumber: fullTargetSb }
      });
      if (targetSbInDb) {
        await prisma.serviceBulletin.update({
          where: { id: targetSbInDb.id },
          data: { status: 'CONCURRENT' }
        });
      }
    }
  }

  // 2. Process "pre" relations (Termination Boundary)
  if (sbRelations && sbRelations.pre && Array.isArray(sbRelations.pre.sb) && sbRelations.pre.sb.length > 0) {
    for (const targetSbNum of sbRelations.pre.sb) {
      const fullTargetSb = targetSbNum.includes('S/B') || targetSbNum.includes('SB') ? targetSbNum : `CFM56-7B S/B ${targetSbNum}`;
      const relType = sbRelations.pre.status === 'TERMINATE' ? 'TERMINATES' : 'CONCURRENT';

      const existingRel = await prisma.sbRelation.findFirst({
        where: { sourceSbId, targetSbNumber: fullTargetSb, relationType: relType, conditionType: 'PRE' }
      });

      if (!existingRel) {
        await prisma.sbRelation.create({
          data: {
            sourceSbId,
            targetSbNumber: fullTargetSb,
            relationType: relType,
            conditionType: 'PRE'
          }
        });
      }

      if (relType === 'TERMINATES') {
        const targetSbInDb = await prisma.serviceBulletin.findUnique({
          where: { sbNumber: fullTargetSb }
        });
        if (targetSbInDb) {
          await prisma.serviceBulletin.update({
            where: { id: targetSbInDb.id },
            data: { status: 'TERMINATED' }
          });
        }
      } else if (relType === 'CONCURRENT') {
        const targetSbInDb = await prisma.serviceBulletin.findUnique({
          where: { sbNumber: fullTargetSb }
        });
        if (targetSbInDb) {
          await prisma.serviceBulletin.update({
            where: { id: targetSbInDb.id },
            data: { status: 'CONCURRENT' }
          });
        }
      }
    }
  }

  // 3. Process "supersedes"
  if (supersedesObj && supersedesObj.status && supersedesObj.sb) {
    const sbs = Array.isArray(supersedesObj.sb) ? supersedesObj.sb : [supersedesObj.sb];
    for (const targetSbNum of sbs) {
      const fullTargetSb = targetSbNum.includes('S/B') || targetSbNum.includes('SB') ? targetSbNum : `CFM56-7B S/B ${targetSbNum}`;

      const existingRel = await prisma.sbRelation.findFirst({
        where: { sourceSbId, targetSbNumber: fullTargetSb, relationType: 'SUPERSEDES' }
      });

      if (!existingRel) {
        await prisma.sbRelation.create({
          data: {
            sourceSbId,
            targetSbNumber: fullTargetSb,
            relationType: 'SUPERSEDES',
            conditionType: 'NONE'
          }
        });
      }

      const targetSbInDb = await prisma.serviceBulletin.findUnique({
        where: { sbNumber: fullTargetSb }
      });
      if (targetSbInDb) {
        await prisma.serviceBulletin.update({
          where: { id: targetSbInDb.id },
          data: { status: 'SUPERSEDED' }
        });
      }
    }
  }
};

module.exports = {
  processEesWebhook,
  normalizeOcrPayload,
  normalizeAdRelated,
  listEesDocuments,
  getEesDocumentById,
  parseAiSbRelations
};
