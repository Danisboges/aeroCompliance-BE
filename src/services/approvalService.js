const prisma = require('../db');
const fs = require('fs');
const path = require('path');
const emailService = require('./emailService');
const {
  getRequiredApprovalRole,
  normalizeOperatorCode,
} = require('../utils/approvalRules');

const removeFileIfExists = (filePath) => {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (error) {
    console.error('[ApprovalService] Failed to remove signature file', {
      filePath,
      message: error.message,
    });
  }
};

const detectSignatureImageType = (signatureFile) => {
  if (!signatureFile?.path) return null;
  const descriptor = fs.openSync(signatureFile.path, 'r');
  const header = Buffer.alloc(8);
  try {
    fs.readSync(descriptor, header, 0, header.length, 0);
  } finally {
    fs.closeSync(descriptor);
  }

  const isPng = header[0] === 0x89 && header[1] === 0x50 &&
    header[2] === 0x4e && header[3] === 0x47 && header[4] === 0x0d &&
    header[5] === 0x0a && header[6] === 0x1a && header[7] === 0x0a;
  const isJpeg = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;

  if (isPng && signatureFile.mimetype === 'image/png') return 'png';
  if (isJpeg && ['image/jpeg', 'image/jpg'].includes(signatureFile.mimetype)) return 'jpg';
  return null;
};

const validateApprovalCandidate = ({ assignee, sourceSb, submitterId }) => {
  if (!assignee) {
    throw new Error('Validation Error: assignedToId does not reference an existing user');
  }
  if (!assignee.active) {
    throw new Error('Validation Error: assigned approval user is inactive');
  }
  if (!assignee.operator || !sourceSb?.operator) {
    throw new Error('Validation Error: approval user and Service Bulletin must have an operator');
  }

  const sourceOperatorCode = normalizeOperatorCode(sourceSb.operator.code);
  const assigneeOperatorCode = normalizeOperatorCode(assignee.operator.code);
  if (!sourceOperatorCode || sourceOperatorCode !== assigneeOperatorCode) {
    throw new Error('Validation Error: assigned approval user belongs to a different operator');
  }

  const requiredRole = getRequiredApprovalRole({
    operatorCode: sourceOperatorCode,
    complianceCategory: sourceSb.complianceCategory,
  });
  if (assignee.role !== requiredRole) {
    throw new Error(
      `Validation Error: ${sourceOperatorCode === 'GA' ? 'Garuda' : 'Citilink'} ` +
      `category ${sourceSb.complianceCategory ?? '-'} requires role ${requiredRole}`
    );
  }
  if (requiredRole === 'ENGINEER' && assignee.id === submitterId) {
    throw new Error('Validation Error: Garuda category 4+ reviewer must be a different ENGINEER');
  }

  return { operatorCode: sourceOperatorCode, requiredRole };
};

const storeSubmissionSignature = ({ signatureFile, eesId, operatorCode, prefix }) => {
  if (operatorCode !== 'GA') {
    removeFileIfExists(signatureFile?.path);
    return { fileName: null, storedPath: null };
  }
  if (!signatureFile) {
    throw new Error('Validation Error: signature is required for Garuda submission');
  }
  const imageType = detectSignatureImageType(signatureFile);
  if (!imageType) {
    throw new Error('Validation Error: signature must be a valid PNG or JPG image');
  }

  const safeEesId = String(eesId).replace(/[^a-zA-Z0-9_-]/g, '-');
  const fileName = `${prefix}_${safeEesId}_${Date.now()}.${imageType}`;
  const storedPath = path.join(__dirname, '../../uploads/signatures', fileName);
  fs.renameSync(signatureFile.path, storedPath);
  return { fileName, storedPath };
};

const notifySafely = (callback, context) => {
  try {
    callback();
  } catch (error) {
    console.error(`[ApprovalService] ${context}`, error.message);
  }
};

const APPROVAL_STATUSES = Object.freeze([
  'PENDING',
  'PARTIALLY_APPROVED',
  'APPROVED',
  'REJECTED',
  'RETURNED',
]);

const normalizeApprovalStatus = (value) => {
  if (!value) return null;
  const status = String(value).trim().toUpperCase();
  if (!APPROVAL_STATUSES.includes(status)) {
    throw new Error(`Validation Error: unsupported approval status '${value}'`);
  }
  return status;
};

const listApprovals = async ({ status, assigneeId, operatorId, minCat, maxCat, skip = 0, take = 20 }) => {
  const where = {};
  if (status) where.status = normalizeApprovalStatus(status);
  if (assigneeId) where.assignedToId = assigneeId;
  
  if (operatorId || minCat !== undefined || maxCat !== undefined) {
    const sbWhere = {};
    if (operatorId) sbWhere.operatorId = operatorId;
    if (minCat !== undefined || maxCat !== undefined) {
      sbWhere.complianceCategory = {};
      if (minCat !== undefined) sbWhere.complianceCategory.gte = minCat;
      if (maxCat !== undefined) sbWhere.complianceCategory.lt = maxCat;
    }
    where.eesDocument = { sourceSb: sbWhere };
  }

  const data = await prisma.approval.findMany({
    where,
    skip: parseInt(skip, 10),
    take: parseInt(take, 10),
    orderBy: { submittedAt: 'desc' },
    include: {
      eesDocument: {
        include: { sourceSb: true }
      }
    }
  });

  const total = await prisma.approval.count({ where });
  return { data, total };
};

const getPendingSecondEngineer = async (operatorId, skip = 0, take = 20) => {
  let minCat = undefined;
  if (operatorId) {
    const op = await prisma.operator.findUnique({ where: { id: operatorId } });
    if (op && op.code === 'GA') {
      minCat = 4;
    }
  }
  return await listApprovals({ status: 'PENDING', operatorId, minCat, skip, take });
};

const getPendingManager = async (operatorId, skip = 0, take = 20) => {
  let maxCat = undefined;
  if (operatorId) {
    const op = await prisma.operator.findUnique({ where: { id: operatorId } });
    if (op && op.code === 'GA') {
      maxCat = 4;
    }
  }
  return await listApprovals({ status: 'PENDING', operatorId, maxCat, skip, take });
};

const getApprovalByEesId = async (eesId, user) => {
  const approval = await prisma.approval.findUnique({
    where: { eesId },
    include: {
      eesDocument: {
        include: { sourceSb: true }
      }
    }
  });

  if (!approval) {
    throw new Error('Approval not found for this EES');
  }

  if (user && user.role !== 'ADMIN') {
    const isAssignee = approval.assignedToId === user.id;
    const isMaker = approval.submittedById === user.id;
    if (!isAssignee && !isMaker) {
      throw new Error('Forbidden: You are not authorized to view this approval');
    }
  }

  const history = await prisma.reviewAction.findMany({
    where: { eesId },
    orderBy: { createdAt: 'asc' },
    include: {
      actor: { select: { id: true, username: true, role: true } }
    }
  });

  return { approval, history };
};

const getInbox = async (user, { skip = 0, take = 20, search, status, sort }) => {
  const where = {
    assignedToId: user.id,
    eesDocument: {
      sourceSb: {
        operatorId: user.operatorId
      }
    }
  };

  if (status) {
    where.status = normalizeApprovalStatus(status);
  } else {
    where.status = { in: ['PENDING', 'PARTIALLY_APPROVED'] };
  }

  if (search) {
    where.AND = [{
      OR: [
        { eesDocument: { eesNumber: { contains: search, mode: 'insensitive' } } },
        { eesDocument: { sourceSb: { sbNumber: { contains: search, mode: 'insensitive' } } } },
        { eesDocument: { sourceSb: { title: { contains: search, mode: 'insensitive' } } } },
      ],
    }];
  }

  let orderBy = { submittedAt: 'desc' };
  if (sort === 'oldest') orderBy = { submittedAt: 'asc' };

  const data = await prisma.approval.findMany({
    where,
    skip: parseInt(skip, 10),
    take: parseInt(take, 10),
    orderBy,
    include: {
      eesDocument: {
        select: { 
          id: true, eesNumber: true, taskType: true, effectedType: true, effectedModel: true, aircraftType: true,
          sourceSb: {
            select: {
              id: true, sbNumber: true, title: true, complianceCategory: true,
              operator: { select: { id: true, code: true, name: true } }
            }
          }
        }
      }
    }
  });

  const total = await prisma.approval.count({ where });
  const pendingCount = await prisma.approval.count({ where: { assignedToId: user.id, status: 'PENDING' } });

  const formattedData = data.map(app => {
    const ees = app.eesDocument || {};
    const sb = ees.sourceSb || {};
    delete ees.sourceSb;
    return {
      approvalId: app.id,
      eesId: app.eesId,
      status: app.status,
      approvalLevel: app.approvalLevel,
      submittedAt: app.submittedAt,
      ees,
      serviceBulletin: sb
    };
  });

  return { data: formattedData, total, pendingCount };
};

const getMySubmissions = async (user, { skip = 0, take = 20 }) => {
  const where = {
    submittedById: user.id
  };

  const data = await prisma.approval.findMany({
    where,
    skip: parseInt(skip, 10),
    take: parseInt(take, 10),
    orderBy: { submittedAt: 'desc' },
    include: {
      eesDocument: {
        select: { 
          id: true, eesNumber: true, taskType: true,
          sourceSb: {
            select: { id: true, sbNumber: true, title: true, complianceCategory: true }
          }
        }
      }
    }
  });

  const total = await prisma.approval.count({ where });

  const formattedData = data.map(app => {
    const ees = app.eesDocument || {};
    const sb = ees.sourceSb || {};
    delete ees.sourceSb;
    return {
      approvalId: app.id,
      eesId: app.eesId,
      status: app.status,
      assignedToId: app.assignedToId,
      submittedAt: app.submittedAt,
      ees,
      serviceBulletin: sb
    };
  });

  return { data: formattedData, total };
};

const getHistory = async (user, { skip = 0, take = 20 }) => {
  const where = {
    actorId: user.id
  };

  const data = await prisma.reviewAction.findMany({
    where,
    skip: parseInt(skip, 10),
    take: parseInt(take, 10),
    orderBy: { createdAt: 'desc' },
    include: {
      ees: {
        select: {
          id: true, eesNumber: true,
          sourceSb: { select: { sbNumber: true } }
        }
      }
    }
  });

  const total = await prisma.reviewAction.count({ where });

  return { data, total };
};

const resubmitForApproval = async ({
  eesId,
  assignedToId,
  submitterId,
  submitterRole,
  signatureFile,
}) => {
  let storedSignaturePath = null;
  try {
    if (!assignedToId) throw new Error('Validation Error: assignedToId is required');
    const approval = await prisma.approval.findUnique({
      where: { eesId },
      include: {
        eesDocument: {
          include: { sourceSb: { include: { operator: true } } }
        }
      }
    });
    if (!approval) throw new Error('Approval not found');
    if (approval.submittedById !== submitterId) {
      throw new Error('Forbidden: Only the original maker can resubmit');
    }
    if (!['REJECTED', 'RETURNED'].includes(approval.status)) {
      throw new Error('Conflict: Approval cannot be resubmitted from its current status');
    }

    const assignedUser = await prisma.user.findUnique({
      where: { id: assignedToId },
      include: { operator: true },
    });
    const assignment = validateApprovalCandidate({
      assignee: assignedUser,
      sourceSb: approval.eesDocument.sourceSb,
      submitterId,
    });
    if (assignment.requiredRole === 'ENGINEER' && assignedToId === submitterId) {
      throw new Error('Validation Error: Garuda category 4+ reviewer must be a different ENGINEER');
    }
    const storedSignature = storeSubmissionSignature({
      signatureFile,
      eesId,
      operatorCode: assignment.operatorCode,
      prefix: 'resubmitted_by',
    });
    storedSignaturePath = storedSignature.storedPath;

    const result = await prisma.$transaction(async (tx) => {
      const changed = await tx.approval.updateMany({
        where: {
          id: approval.id,
          submittedById: submitterId,
          status: { in: ['REJECTED', 'RETURNED'] },
        },
        data: {
          status: 'PENDING',
          assignedToId,
          submittedAt: new Date(),
          reviewedAt: null,
          comment: null,
        },
      });
      if (changed.count !== 1) {
        throw new Error('Conflict: Approval was already resubmitted or changed');
      }

      await tx.eesDocument.update({
        where: { id: eesId },
        data: { reviewStatus: 'PENDING' },
      });
      const reviewAction = await tx.reviewAction.create({
        data: {
          eesId,
          action: 'PENDING',
          actorId: submitterId,
          actorRole: submitterRole,
          comment: 'Resubmitted after revision',
          signaturePath: storedSignature.fileName,
        },
      });
      await tx.notification.create({
        data: {
          userId: assignedToId,
          title: 'EES Resubmitted',
          message: `EES ${approval.eesDocument.eesNumber} has been resubmitted for your review.`,
          link: `/approvals/${eesId}`,
        },
      });
      const updatedApproval = await tx.approval.findUnique({ where: { id: approval.id } });
      return { approval: updatedApproval, reviewAction };
    });

    notifySafely(() => {
      const { notifyUser } = require('../socket');
      if (notifyUser) {
        notifyUser(assignedToId, 'dashboard_updated', { trigger: 'approval_resubmitted', eesId });
        notifyUser(assignedToId, 'new_notification', {
          title: 'EES Resubmitted',
          message: 'An EES document has been resubmitted for your review.',
        });
      }
    }, 'Failed to send resubmit socket notification');

    if (assignedUser.email) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const approvalUrl = `${frontendUrl}/approvals/${eesId}`;
      emailService.sendApprovalRequestEmail(
        assignedUser.email, 
        approval.eesDocument.eesNumber, 
        assignedUser.role, 
        approvalUrl,
        null
      ).catch((error) => console.error('Error sending resubmit email:', error));
    }

    return result;
  } catch (error) {
    removeFileIfExists(storedSignaturePath);
    if (signatureFile?.path !== storedSignaturePath) removeFileIfExists(signatureFile?.path);
    throw error;
  }
};

const submitForApproval = async ({
  eesId,
  assignedToId,
  submitterId,
  submitterRole,
  signatureFile,
}) => {
  let storedSignaturePath = null;
  try {
    if (!assignedToId) throw new Error('Validation Error: assignedToId is required');
    const existing = await prisma.approval.findUnique({ where: { eesId } });
    if (existing) throw new Error('Approval process already initiated for this EES');

    const [eesDoc, assignedUser] = await Promise.all([
      prisma.eesDocument.findUnique({
        where: { id: eesId },
        include: { sourceSb: { include: { operator: true } } },
      }),
      prisma.user.findUnique({
        where: { id: assignedToId },
        include: { operator: true },
      }),
    ]);
    if (!eesDoc) throw new Error('EES document not found');

    const assignment = validateApprovalCandidate({
      assignee: assignedUser,
      sourceSb: eesDoc.sourceSb,
      submitterId,
    });
    if (assignment.requiredRole === 'ENGINEER' && assignedToId === submitterId) {
      throw new Error('Validation Error: Garuda category 4+ reviewer must be a different ENGINEER');
    }
    const storedSignature = storeSubmissionSignature({
      signatureFile,
      eesId,
      operatorCode: assignment.operatorCode,
      prefix: 'submitted_by',
    });
    storedSignaturePath = storedSignature.storedPath;

    const approval = await prisma.$transaction(async (tx) => {
      const created = await tx.approval.create({
        data: {
          eesId,
          approvalLevel: 1,
          status: 'PENDING',
          submittedById: submitterId,
          assignedToId,
        },
      });
      await tx.reviewAction.create({
        data: {
          eesId,
          action: 'PENDING',
          actorId: submitterId,
          actorRole: submitterRole,
          comment: 'Submitted for approval',
          signaturePath: storedSignature.fileName,
        },
      });
      await tx.notification.create({
        data: {
          userId: assignedToId,
          title: 'New Approval Request',
          message: `You have been assigned to review EES ${eesDoc.eesNumber}.`,
          link: `/approvals/${eesId}`,
        },
      });
      return created;
    });

    notifySafely(() => {
      const { notifyUser } = require('../socket');
      if (notifyUser) {
        notifyUser(assignedToId, 'dashboard_updated', { trigger: 'new_approval' });
        notifyUser(assignedToId, 'new_notification', {
          title: 'New Approval Request',
          message: 'You have a new EES document to review.',
        });
      }
    }, 'Failed to send approval socket notification');

    if (assignedUser.email) {
      const pdfGenService = require('./pdfGenerationService');
      const opCode = (eesDoc.sourceSb?.operator?.code === 'QG' ? 'CITILINK' : 'GARUDA');
      const draftSb = { ...eesDoc.sourceSb, generatedEes: eesDoc };
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const approvalUrl = `${frontendUrl}/approvals/${eesId}`;
      Promise.resolve()
        .then(() => pdfGenService.generateEesPdf({ sb: draftSb, templateType: opCode }))
        .then((pdfBuffer) => emailService.sendApprovalRequestEmail(
          assignedUser.email, eesDoc.eesNumber, assignedUser.role, approvalUrl, pdfBuffer
        ))
        .catch((error) => console.error('Error sending submit email:', error));
    }

    return approval;
  } catch (error) {
    removeFileIfExists(storedSignaturePath);
    if (signatureFile?.path !== storedSignaturePath) removeFileIfExists(signatureFile?.path);
    throw error;
  }
};

const submitReview = async ({ eesId, action, comment, nextAssignedToId, user, signatureFile }) => {
  if (!['APPROVED', 'REJECTED', 'RETURNED'].includes(action)) {
    throw new Error('Invalid review action');
  }
  if (['REJECTED', 'RETURNED'].includes(action) && !String(comment || '').trim()) {
    throw new Error('Validation Error: comment is required when returning or rejecting an EES');
  }

  const approval = await prisma.approval.findUnique({
    where: { eesId },
    include: { eesDocument: { include: { sourceSb: { include: { operator: true } } } } }
  });

  if (!approval) throw new Error('No active approval found for this EES document');
  
  if (approval.assignedToId !== user.id && user.role !== 'ADMIN') {
    throw new Error('Forbidden: You are not the assigned reviewer');
  }

  if (approval.status !== 'PENDING' && approval.status !== 'PARTIALLY_APPROVED') {
    throw new Error('Approval is no longer pending');
  }

  const operatorCode = approval.eesDocument.sourceSb.operator.code;
  const isGaruda = (operatorCode === 'GA');

  if (user.role !== 'ADMIN') {
    const requiredRole = getRequiredApprovalRole({
      operatorCode,
      complianceCategory: approval.eesDocument.sourceSb.complianceCategory,
    });
    if (user.role !== requiredRole) {
      throw new Error(`Forbidden: This approval requires role ${requiredRole}`);
    }
  }

  let signaturePath = null;
  let storedSignaturePath = null;
  if (signatureFile && action === 'APPROVED' && isGaruda) {
    const uploadDir = path.join(__dirname, '../../uploads/signatures');
    const suffix = user.role === 'ENGINEER' ? 'checked_by' : 'approved_by';
    const imageType = detectSignatureImageType(signatureFile);
    if (!imageType) {
      removeFileIfExists(signatureFile.path);
      throw new Error('Validation Error: signature must be a valid PNG or JPG image');
    }
    const newFileName = `${suffix}_${eesId}_${Date.now()}.${imageType}`;
    const newPath = path.join(uploadDir, newFileName);
    fs.renameSync(signatureFile.path, newPath);
    signaturePath = newFileName;
    storedSignaturePath = newPath;
  } else if (signatureFile) {
    removeFileIfExists(signatureFile.path);
  }

  let finalStatus = action;
  if (action === 'APPROVED') {
    finalStatus = 'APPROVED';
  }
  
  const nextLevel = approval.approvalLevel;
  let newAssignedTo = approval.assignedToId;

  if (finalStatus === 'REJECTED' || finalStatus === 'RETURNED') {
    newAssignedTo = approval.submittedById;
  }

  let result;
  try {
    result = await prisma.$transaction(async (tx) => {
    const changed = await tx.approval.updateMany({
      where: {
        id: approval.id,
        status: { in: ['PENDING', 'PARTIALLY_APPROVED'] },
      },
      data: {
        status: finalStatus,
        approvalLevel: nextLevel,
        assignedToId: newAssignedTo,
        reviewedAt: finalStatus === 'APPROVED' ? new Date() : null,
        comment: comment
      }
    });
    if (changed.count !== 1) {
      throw new Error('Conflict: Approval was already reviewed or changed');
    }

    await tx.eesDocument.update({
      where: { id: eesId },
      data: { reviewStatus: finalStatus }
    });

    const reviewAction = await tx.reviewAction.create({
      data: {
        eesId,
        action,
        actorId: user.id,
        actorRole: user.role,
        comment,
        signaturePath
      }
    });

    await tx.notification.create({
      data: {
        userId: approval.submittedById,
        title: finalStatus === 'APPROVED'
          ? 'EES Approved'
          : `EES ${finalStatus === 'REJECTED' ? 'Rejected' : 'Returned'}`,
        message: finalStatus === 'APPROVED'
          ? `Your EES ${approval.eesDocument.eesNumber} has been approved.`
          : `Your EES ${approval.eesDocument.eesNumber} has been ${finalStatus.toLowerCase()} by reviewer.`,
        link: `/ees/${eesId}`,
      },
    });

    const updatedApproval = await tx.approval.findUnique({ where: { id: approval.id } });

    return { approval: updatedApproval, reviewAction };
  });
  } catch (error) {
    removeFileIfExists(storedSignaturePath);
    throw error;
  }

  if (finalStatus === 'APPROVED' && isGaruda) {
    try {
      const pdfGenService = require('./pdfGenerationService');
      await pdfGenService.finalizeGarudaPdf(eesId);
    } catch (error) {
      console.error('[ApprovalService] Approval committed but PDF finalization failed', {
        eesId,
        message: error.message,
      });
    }
  }

  const { notifyAll, notifyUser } = require('../socket');
  notifySafely(() => {
    if (notifyAll) notifyAll('dashboard_updated', { trigger: 'approval_action' });
  }, 'Failed to send review dashboard notification');

  if (finalStatus === 'APPROVED') {
    notifySafely(() => {
      if (notifyUser) notifyUser(approval.submittedById, 'new_notification', { title: 'EES Approved', message: 'Your EES has been approved.' });
    }, 'Failed to send approval result notification');
  }

  if (finalStatus === 'REJECTED' || finalStatus === 'RETURNED') {
    notifySafely(() => {
      if (notifyUser) notifyUser(approval.submittedById, 'new_notification', { title: `EES ${finalStatus === 'REJECTED' ? 'Rejected' : 'Returned'}`, message: 'Your EES requires revision.' });
    }, 'Failed to send rejection result notification');

    try {
      const submitter = await prisma.user.findUnique({ where: { id: approval.submittedById } });
      if (submitter && submitter.email) {
        const pdfGenService = require('./pdfGenerationService');
        const eesDoc = approval.eesDocument;
        const opCode = (eesDoc.sourceSb?.operator?.code === 'QG' ? 'CITILINK' : 'GARUDA');
        const draftSb = { ...eesDoc.sourceSb, generatedEes: eesDoc };
        const pdfBuffer = await pdfGenService.generateEesPdf({ sb: draftSb, templateType: opCode });

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const eesUrl = `${frontendUrl}/ees/${eesId}`;
        await emailService.sendApprovalRejectedEmail(
          submitter.email,
          eesDoc.eesNumber,
          comment || 'No reason provided.',
          user.role,
          eesUrl,
          pdfBuffer
        );
      }
    } catch (err) {
      console.error("Error sending rejection email:", err);
    }
  }

  return result;
};

module.exports = {
  listApprovals,
  getPendingSecondEngineer,
  getPendingManager,
  getApprovalByEesId,
  getInbox,
  getMySubmissions,
  getHistory,
  submitForApproval,
  resubmitForApproval,
  submitReview,
  detectSignatureImageType,
  validateApprovalCandidate,
};
