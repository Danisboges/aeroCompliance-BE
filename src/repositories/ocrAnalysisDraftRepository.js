const prisma = require('../db');

const includeRelations = {
  upload: true,
  generatedEesDocument: {
    include: {
      evaluations: true
    }
  }
};

const createDraft = async (data) => {
  return prisma.ocrAnalysisDraft.create({
    data,
    include: includeRelations
  });
};

const listDrafts = async ({ skip = 0, take = 20, status, uploadId } = {}) => {
  return prisma.ocrAnalysisDraft.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(uploadId ? { uploadId } : {})
    },
    skip,
    take,
    orderBy: {
      createdAt: 'desc'
    },
    include: includeRelations
  });
};

const countDrafts = async ({ status, uploadId } = {}) => {
  return prisma.ocrAnalysisDraft.count({
    where: {
      ...(status ? { status } : {}),
      ...(uploadId ? { uploadId } : {})
    }
  });
};

const findDraftById = async (id) => {
  return prisma.ocrAnalysisDraft.findUnique({
    where: { id },
    include: includeRelations
  });
};

const updateDraft = async (id, data) => {
  return prisma.ocrAnalysisDraft.update({
    where: { id },
    data,
    include: includeRelations
  });
};

const deleteDraft = async (id) => {
  return prisma.ocrAnalysisDraft.delete({
    where: { id }
  });
};

module.exports = {
  createDraft,
  listDrafts,
  countDrafts,
  findDraftById,
  updateDraft,
  deleteDraft
};
