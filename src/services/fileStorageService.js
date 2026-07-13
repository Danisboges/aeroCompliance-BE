const fs = require('fs/promises');
const path = require('path');

const STORAGE_ROOT = path.resolve(__dirname, '../../uploads/sb-documents');
const PUBLIC_BASE_URL = '/storage/sb-documents';

const ensureStorageRoot = async () => {
  await fs.mkdir(STORAGE_ROOT, { recursive: true });
};

const buildStoredFileName = (id, checksum, originalFileName) => {
  const extension = path.extname(originalFileName || '').toLowerCase() || '.pdf';
  return `sb-${id}-${checksum.slice(0, 12)}${extension}`;
};

const storePdf = async ({ id, checksum, originalFileName, buffer }) => {
  await ensureStorageRoot();
  const storedFileName = buildStoredFileName(id, checksum, originalFileName);
  const storagePath = path.join(STORAGE_ROOT, storedFileName);
  const fileUrl = `${PUBLIC_BASE_URL}/${encodeURIComponent(storedFileName)}`;

  await fs.writeFile(storagePath, buffer);

  return {
    storedFileName,
    storagePath,
    fileUrl
  };
};

const deleteFileIfExists = async (storagePath) => {
  if (!storagePath) {
    return;
  }

  try {
    await fs.unlink(storagePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
};

module.exports = {
  STORAGE_ROOT,
  storePdf,
  deleteFileIfExists
};

const EES_STORAGE_ROOT = path.resolve(__dirname, '../../uploads/ees-documents');

const ensureEesStorageRoot = async () => {
  await fs.mkdir(EES_STORAGE_ROOT, { recursive: true });
};

const storeGeneratedEesPdf = async ({ eesNumber, buffer }) => {
  await ensureEesStorageRoot();
  const storedFileName = `ees-${eesNumber}-${Date.now()}.pdf`;
  const storagePath = path.join(EES_STORAGE_ROOT, storedFileName);
  const fileUrl = `/storage/ees-documents/${encodeURIComponent(storedFileName)}`;

  await fs.writeFile(storagePath, buffer);

  return {
    storedFileName,
    storagePath,
    fileUrl
  };
};

module.exports = {
  STORAGE_ROOT,
  EES_STORAGE_ROOT,
  storePdf,
  deleteFileIfExists,
  storeGeneratedEesPdf
};
