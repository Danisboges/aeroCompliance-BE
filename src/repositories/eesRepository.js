const prisma = require('../db');
const { generateId } = require('../utils/idGenerator');

/**
 * Persists EesDocument along with its nested EesEvaluationItems.
 */
const createEesDocument = async (documentData, evaluations) => {
  const { eesNumber, sourceSbId, taskType, references, effectedType, effectedModel, esn, aircraftType } = documentData;

  return await prisma.$transaction(async (tx) => {
    // Hapus EesDocument lama jika sudah ada untuk menghindari kendala keunikan
    await tx.eesDocument.deleteMany({
      where: { sourceSbId }
    });

    const existingByNumber = await tx.eesDocument.findUnique({
      where: { eesNumber },
    });

    if (existingByNumber) {
      await tx.eesDocument.delete({
        where: { id: existingByNumber.id }
      });
    }

    return await tx.eesDocument.create({
      data: {
        id: generateId('EES-DOC'),
        eesNumber,
        sourceSbId,
        taskType: taskType || null,
        references: references || null,
        effectedType: effectedType || null,
        effectedModel: effectedModel || null,
        esn: esn || null,
        aircraftType: aircraftType || null,
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
          operator: true,
          createdBy: {
            select: { id: true, username: true, role: true, email: true }
          }
        }
      }
    }
  });
};

const countEesDocuments = async () => {
  return await prisma.eesDocument.count();
};

module.exports = {
  createEesDocument,
  getEesDocumentBySbId,
  updateEesDocumentPdfPath,
  listEesDocuments,
  countEesDocuments
};
