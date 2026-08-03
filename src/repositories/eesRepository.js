const prisma = require('../db');
const { generateId } = require('../utils/idGenerator');

const toNullableBoolean = (value) => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'y', 'yes'].includes(normalized)) return true;
  if (['false', '0', 'n', 'no'].includes(normalized)) return false;
  return null;
};

const toNullableDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Validation Error: invalid evaluation dueAt value '${value}'`);
  }
  return date;
};

const mapEvaluations = (evaluations) => evaluations.map((item) => ({
  id: generateId('ITEM'),
  itemNo: String(item.itemNo ?? ''),
  paragraph: item.paragraph ? String(item.paragraph) : null,
  requirementDesc: String(item.requirementDesc ?? ''),
  remarks: item.remarks ? String(item.remarks) : null,
  taskType: item.taskType ? String(item.taskType) : null,
  references: item.references || null,
  adRelated: item.adRelated !== undefined && item.adRelated !== null
    ? String(item.adRelated)
    : null,
  warranty: toNullableBoolean(item.warranty),
  rep: item.rep ? String(item.rep) : null,
  dueAt: toNullableDate(item.dueAt),
  isApplicable: toNullableBoolean(item.isApplicable) !== false,
}));

/**
 * Persists EesDocument along with its nested EesEvaluationItems.
 */
const createEesDocument = async (documentData, evaluations) => {
  const { eesNumber, sourceSbId, taskType, references, effectedType, effectedModel, esn, aircraftType, partNumber, componentType, complianceTimeType, isRepetitive, note, isManualEdited, eesTemplate } = documentData;

  return await prisma.$transaction(async (tx) => {
    const existingForSource = await tx.eesDocument.findUnique({
      where: { sourceSbId },
    });
    const existingByNumber = await tx.eesDocument.findUnique({
      where: { eesNumber },
    });

    if (existingByNumber && existingByNumber.id !== existingForSource?.id) {
      throw new Error(`Conflict: EES number '${eesNumber}' is already used by another document`);
    }

    const values = {
      eesNumber,
      sourceSbId,
      taskType: taskType || null,
      references: references || null,
      effectedType: effectedType || null,
      effectedModel: Array.isArray(effectedModel) ? effectedModel.join(', ') : effectedModel || null,
      esn: esn || null,
      aircraftType: aircraftType || null,
      partNumber: partNumber || null,
      componentType: componentType || null,
      complianceTimeType: complianceTimeType || null,
      isRepetitive: toNullableBoolean(isRepetitive),
      note: note || null,
      isManualEdited: Boolean(isManualEdited),
      eesTemplate: eesTemplate || null,
    };
    const evaluationData = mapEvaluations(Array.isArray(evaluations) ? evaluations : []);

    if (existingForSource) {
      await tx.eesEvaluationItem.deleteMany({
        where: { eesDocumentId: existingForSource.id },
      });
      return tx.eesDocument.update({
        where: { id: existingForSource.id },
        data: { ...values, evaluations: { create: evaluationData } },
        include: { evaluations: true, sourceSb: true, approval: true },
      });
    }

    return tx.eesDocument.create({
      data: {
        id: generateId('EES-DOC'),
        ...values,
        evaluations: { create: evaluationData },
      },
      include: {
        evaluations: true,
        sourceSb: true,
        approval: true,
      },
    });
  });
};

const getEesDocumentBySbId = async (sourceSbId) => {
  return await prisma.eesDocument.findUnique({
    where: { sourceSbId },
    include: {
      evaluations: true,
      sourceSb: true,
      approval: true,
    }
  });
};

const getEesDocumentById = async (id) => {
  return await prisma.eesDocument.findUnique({
    where: { id },
    include: {
      evaluations: true,
      sourceSb: true,
      approval: true
    }
  });
};

const updateEesDocumentPdfPath = async (id, storedPdfPath) => {
  return await prisma.eesDocument.update({
    where: { id },
    data: { storedPdfPath }
  });
};

const listEesDocuments = async ({ skip = 0, take = 20 } = {}) => {
  return await prisma.eesDocument.findMany({
    skip: parseInt(skip, 10),
    take: parseInt(take, 10),
    orderBy: { createdAt: 'desc' },
    include: {
      sourceSb: {
        select: {
          id: true,
          sbNumber: true,
          title: true,
          complianceCategory: true,
          operator: true,
          createdBy: {
            select: { id: true, username: true, role: true, email: true }
          }
        }
      },
      approval: true
    }
  });
};

const countEesDocuments = async () => {
  return await prisma.eesDocument.count();
};

module.exports = {
  createEesDocument,
  getEesDocumentBySbId,
  getEesDocumentById,
  updateEesDocumentPdfPath,
  listEesDocuments,
  countEesDocuments
};
