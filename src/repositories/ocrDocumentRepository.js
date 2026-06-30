const prisma = require('../db');

const createUpload = async (data) => {
  return prisma.ocrDocumentUpload.create({ data });
};

const updateUpload = async (id, data) => {
  return prisma.ocrDocumentUpload.update({
    where: { id },
    data,
    include: {
      eesDocument: {
        include: {
          evaluations: true
        }
      }
    }
  });
};

const listUploads = async ({ skip = 0, take = 20, status } = {}) => {
  return prisma.ocrDocumentUpload.findMany({
    where: status ? { status } : undefined,
    skip,
    take,
    orderBy: {
      createdAt: 'desc'
    },
    include: {
      eesDocument: true,
      createdBy: {
        select: {
          id: true,
          email: true,
          role: true
        }
      }
    }
  });
};

const countUploads = async ({ status } = {}) => {
  return prisma.ocrDocumentUpload.count({
    where: status ? { status } : undefined
  });
};

const findUploadById = async (id) => {
  return prisma.ocrDocumentUpload.findUnique({
    where: { id },
    include: {
      eesDocument: {
        include: {
          evaluations: true
        }
      }
    }
  });
};

const deleteUploadById = async (id) => {
  return prisma.ocrDocumentUpload.delete({
    where: { id }
  });
};

module.exports = {
  createUpload,
  updateUpload,
  listUploads,
  countUploads,
  findUploadById,
  deleteUploadById
};
