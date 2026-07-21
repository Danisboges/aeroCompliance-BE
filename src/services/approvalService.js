const prisma = require('../db');
const fs = require('fs');
const path = require('path');

const listApprovals = async ({ status, assigneeId, operatorId, skip = 0, take = 20 }) => {
  const where = {};
  if (status) where.status = status;
  if (assigneeId) where.assignedToId = assigneeId;
  
  if (operatorId) {
    where.eesDocument = { sourceSb: { operatorId } };
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

const getApprovalByEesId = async (eesId, operatorId) => {
  const approval = await prisma.approval.findUnique({
    where: { eesId: parseInt(eesId, 10) },
    include: {
      eesDocument: {
        include: { sourceSb: true }
      }
    }
  });

  if (!approval) {
    throw new Error('Approval not found for this EES');
  }

  if (operatorId && approval.eesDocument.sourceSb.operatorId !== operatorId) {
    throw new Error('Unauthorized to view this approval');
  }

  // Also fetch review action history
  const history = await prisma.reviewAction.findMany({
    where: { eesId: parseInt(eesId, 10) },
    orderBy: { createdAt: 'asc' },
    include: {
      actor: { select: { id: true, username: true, role: true } }
    }
  });

  return { approval, history };
};

const submitForApproval = async ({ eesId, assignedToId, submitterId }) => {
  const existing = await prisma.approval.findUnique({ where: { eesId } });
  if (existing) {
    throw new Error('Approval process already initiated for this EES');
  }

  const approval = await prisma.approval.create({
    data: {
      eesId,
      approvalLevel: 1,
      status: 'PENDING',
      submittedById: submitterId,
      assignedToId: assignedToId
    }
  });

  const { notifyUser } = require('../socket');
  if (notifyUser) notifyUser(assignedToId, 'dashboard_updated', { trigger: 'new_approval' });

  return approval;
};

const submitReview = async ({ eesId, action, comment, nextAssignedToId, actorId, actorRole, signatureFile }) => {
  if (!['APPROVED', 'REJECTED', 'RETURNED'].includes(action)) {
    throw new Error('Invalid review action');
  }

  const approval = await prisma.approval.findUnique({
    where: { eesId },
    include: { eesDocument: { include: { sourceSb: { include: { operator: true } } } } }
  });

  if (!approval) throw new Error('No active approval found for this EES document');
  if (approval.status !== 'PENDING' && approval.status !== 'PARTIALLY_APPROVED') {
    throw new Error('Approval is no longer pending');
  }

  const operatorCode = approval.eesDocument.sourceSb.operator.code;
  const isGaruda = operatorCode === 'GA';

  let signaturePath = null;
  if (signatureFile && action === 'APPROVED' && isGaruda) {
    const uploadDir = path.join(__dirname, '../../uploads/signatures');
    const suffix = actorRole === 'ENGINEER' ? 'checked_by' : 'approved_by';
    const newFileName = `${suffix}_${eesId}.png`;
    const newPath = path.join(uploadDir, newFileName);
    fs.renameSync(signatureFile.path, newPath);
    signaturePath = newFileName;
  } else if (signatureFile) {
    fs.unlinkSync(signatureFile.path);
  }

  let finalStatus = action;
  let nextLevel = approval.approvalLevel;
  let newAssignedTo = approval.assignedToId;

  if (action === 'APPROVED') {
    if (isGaruda) {
      if (approval.approvalLevel === 1) {
        if (!nextAssignedToId) throw new Error('nextAssignedToId is required for Level 1 Garuda approval');
        finalStatus = 'PARTIALLY_APPROVED';
        nextLevel = 2;
        newAssignedTo = nextAssignedToId;
      } else {
        finalStatus = 'APPROVED';
      }
    } else {
      finalStatus = 'APPROVED';
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedApproval = await tx.approval.update({
      where: { id: approval.id },
      data: {
        status: finalStatus,
        approvalLevel: nextLevel,
        assignedToId: newAssignedTo,
        reviewedAt: finalStatus === 'APPROVED' ? new Date() : null,
        comment: comment
      }
    });

    const eesReviewStatus = finalStatus === 'PARTIALLY_APPROVED' ? 'PENDING' : finalStatus;
    await tx.eesDocument.update({
      where: { id: eesId },
      data: { reviewStatus: eesReviewStatus }
    });

    const reviewAction = await tx.reviewAction.create({
      data: {
        eesId,
        action,
        actorId,
        actorRole,
        comment,
        signaturePath
      }
    });

    return { approval: updatedApproval, reviewAction };
  });

  if (finalStatus === 'APPROVED' && isGaruda) {
    const pdfGenService = require('./pdfGenerationService');
    await pdfGenService.finalizeGarudaPdf(eesId);
  }

  const { notifyAll, notifyUser } = require('../socket');
  if (notifyAll) notifyAll('dashboard_updated', { trigger: 'approval_action' });
  if (finalStatus === 'PARTIALLY_APPROVED' && newAssignedTo && notifyUser) {
    notifyUser(newAssignedTo, 'dashboard_updated', { trigger: 'new_approval' });
  }

  return result;
};

module.exports = {
  listApprovals,
  getApprovalByEesId,
  submitForApproval,
  submitReview
};
