const prisma = require('../db');

/**
 * Persists EesDocument along with its nested EesEvaluationItems.
 * 
 * @param {Object} documentData - Contains eesNumber and bulletinNumber.
 * @param {Array} evaluations - Array of evaluation items to associate.
 * @returns {Promise<Object>} The created document with evaluations included.
 */
const createEesDocument = async (documentData, evaluations) => {
  return await prisma.eesDocument.create({
    data: {
      eesNumber: documentData.eesNumber,
      bulletinNumber: documentData.bulletinNumber,
      evaluations: {
        create: evaluations.map(item => ({
          itemNo: String(item.itemNo ?? ''),
          paragraph: String(item.paragraph ?? ''),
          requirementDesc: String(item.requirementDesc ?? ''),
          taskType: String(item.taskType ?? ''),
          reference: String(item.reference ?? ''),
          isApplicable: Boolean(item.isApplicable),
          adRelated: String(item.adRelated ?? ''),
          isWarranty: Boolean(item.isWarranty),
          affectedEsn: Array.isArray(item.affectedEsn) ? item.affectedEsn.map(String) : [],
          isRepetitive: Boolean(item.isRepetitive),
          dueAt: String(item.dueAt ?? ''),
          remarks: String(item.remarks ?? '')
        }))
      }
    },
    include: {
      evaluations: true
    }
  });
};

module.exports = {
  createEesDocument
};
