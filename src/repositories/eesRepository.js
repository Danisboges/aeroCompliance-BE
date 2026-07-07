const prisma = require('../db');
const { generateId } = require('../utils/idGenerator');

/**
 * Persists EesDocument along with its nested EesEvaluationItems.
 */
const createEesDocument = async (documentData, evaluations) => {
  const { eesNumber, sourceSbId, taskType, references, effectedType, effectedModel, esn } = documentData;

  // Hapus EesDocument lama jika sudah ada untuk menghindari kendala keunikan
  const existingBySb = await prisma.eesDocument.findUnique({
    where: { sourceSbId },
  });

  if (existingBySb) {
    await prisma.eesDocument.delete({
      where: { id: existingBySb.id }
    });
  }

  const existingByNumber = await prisma.eesDocument.findUnique({
    where: { eesNumber },
  });

  if (existingByNumber) {
    await prisma.eesDocument.delete({
      where: { id: existingByNumber.id }
    });
  }

  return await prisma.eesDocument.create({
    data: {
      id: generateId('EES-DOC'),
      eesNumber,
      sourceSbId,
      taskType: taskType || null,
      references: references || null,
      effectedType: effectedType || null,
      effectedModel: effectedModel || null,
      esn: esn || null,
      evaluations: {
        create: evaluations.map((item) => ({
          id: generateId('ITEM'),
          itemNo: String(item.itemNo ?? ''),
          paragraph: item.paragraph ? String(item.paragraph) : null,
          requirementDesc: String(item.requirementDesc ?? ''),
          remarks: item.remarks ? String(item.remarks) : null,
          taskType: item.taskType ? String(item.taskType) : null,
          adRelated: item.adRelated ? String(item.adRelated) : null,
          warranty: item.warranty !== undefined ? Boolean(item.warranty) : null,
          rep: item.rep ? String(item.rep) : null,
          dueAt: item.dueAt ? new Date(item.dueAt) : null,
          isApplicable: item.isApplicable !== false, // default true
        })),
      },
    },
    include: {
      evaluations: true,
      sourceSb: true,
    },
  });
};

const getEesDocumentBySbId = async (sourceSbId) => {
  return await prisma.eesDocument.findUnique({
    where: { sourceSbId },
    include: {
      evaluations: true,
      sourceSb: true,
    }
  });
};

const updateEesDocumentPdfPath = async (id, storedPdfPath) => {
  return await prisma.eesDocument.update({
    where: { id },
    data: { storedPdfPath }
  });
};

module.exports = {
  createEesDocument,
  getEesDocumentBySbId,
  updateEesDocumentPdfPath
};
