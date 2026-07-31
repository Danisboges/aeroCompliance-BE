const prisma = require('../db');
const fs = require('fs');
const path = require('path');
const emailService = require('./emailService');

const listApprovals = async ({ status, assigneeId, operatorId, minCat, maxCat, skip = 0, take = 20 }) => {
  const where = {};
  if (status) where.status = status;
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
    where.status = status;
  } else {
    where.status = { in: ['PENDING', 'PARTIALLY_APPROVED'] };
  }

  if (search) {
    where.eesDocument.eesNumber = { contains: search };
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

const resubmitForApproval = async ({ eesId, assignedToId, submitterId }) => {
  const approval = await prisma.approval.findUnique({
    where: { eesId },
    include: { eesDocument: { include: { sourceSb: true } } }
  });

  if (!approval) throw new Error('Approval not found');
  
  if (approval.submittedById !== submitterId) {
    throw new Error('Forbidden: Only the original maker can resubmit');
  }

  if (approval.status !== 'REJECTED' && approval.status !== 'RETURNED') {
    throw new Error('Conflict: Approval cannot be resubmitted from its current status');
  }

  const assignedUser = await prisma.user.findUnique({ where: { id: assignedToId } });
  if (!assignedUser || assignedUser.operatorId !== approval.eesDocument.sourceSb.operatorId) {
    throw new Error('Invalid assigned reviewer');
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedApproval = await tx.approval.update({
      where: { id: approval.id },
      data: {
        status: 'PENDING',
        assignedToId,
        submittedAt: new Date(),
        reviewedAt: null
      }
    });

    await tx.eesDocument.update({
      where: { id: eesId },
      data: { reviewStatus: 'PENDING' }
    });

    const reviewAction = await tx.reviewAction.create({
      data: {
        eesId,
        action: 'PENDING',
        actorId: submitterId,
        actorRole: 'ENGINEER', // Assuming Maker is ENGINEER
        comment: 'Resubmitted after revision',
        signaturePath: null
      }
    });

    return { approval: updatedApproval, reviewAction };
  });

  const { notifyUser } = require('../socket');
  if (notifyUser) {
    notifyUser(assignedToId, 'dashboard_updated', { trigger: 'approval_resubmitted', eesId });
    // Push new notification event
    notifyUser(assignedToId, 'new_notification', { title: 'EES Resubmitted', message: 'An EES document has been resubmitted for your review.' });
  }

  // Create database notification
  await prisma.notification.create({
    data: {
      userId: assignedToId,
      title: 'EES Resubmitted',
      message: `EES ${approval.eesDocument.eesNumber} has been resubmitted for your review.`,
      link: `/approvals/${eesId}`
    }
  });

  // Send Email Notification
  try {
    if (assignedUser.email) {
      const pdfGenService = require('./pdfGenerationService');
      const opCode = approval.eesDocument.sourceSb?.operatorId; // Needs operator code really
      // We will skip generating PDF attachment for resubmit for brevity, or we can just send the link.
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const approvalUrl = `${frontendUrl}/approvals/${eesId}`;
      
      await emailService.sendApprovalRequestEmail(
        assignedUser.email, 
        approval.eesDocument.eesNumber, 
        assignedUser.role, 
        approvalUrl,
        null
      );
    }
  } catch (err) {
    console.error("Error sending resubmit email:", err);
  }

  return result;
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
  if (notifyUser) {
    notifyUser(assignedToId, 'dashboard_updated', { trigger: 'new_approval' });
    notifyUser(assignedToId, 'new_notification', { title: 'New Approval Request', message: 'You have a new EES document to review.' });
  }

  const eesDoc = await prisma.eesDocument.findUnique({
    where: { id: eesId },
    include: { sourceSb: { include: { operator: true } } }
  });

  if (eesDoc) {
    await prisma.notification.create({
      data: {
        userId: assignedToId,
        title: 'New Approval Request',
        message: `You have been assigned to review EES ${eesDoc.eesNumber}.`,
        link: `/approvals/${eesId}`
      }
    });
  }

  // Send Email Notification
  try {
    const eesDoc = await prisma.eesDocument.findUnique({
      where: { id: eesId },
      include: { sourceSb: { include: { operator: true } } }
    });
    const assignedUser = await prisma.user.findUnique({ where: { id: assignedToId } });
    
    if (eesDoc && assignedUser && assignedUser.email) {
      const pdfGenService = require('./pdfGenerationService');
      const opCode = eesDoc.sourceSb?.operator?.code === 'QG' ? 'CITILINK' : 'GARUDA';
      const draftSb = { ...eesDoc.sourceSb, generatedEes: eesDoc };
      const pdfBuffer = await pdfGenService.generateEesPdf({ sb: draftSb, templateType: opCode });

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const approvalUrl = `${frontendUrl}/approvals/${eesId}`;
      
      await emailService.sendApprovalRequestEmail(
        assignedUser.email, 
        eesDoc.eesNumber, 
        assignedUser.role, 
        approvalUrl,
        pdfBuffer
      );
    }
  } catch (err) {
    console.error("Error sending submit email:", err);
  }

  return approval;
};

const submitReview = async ({ eesId, action, comment, nextAssignedToId, user, signatureFile }) => {
  if (!['APPROVED', 'REJECTED', 'RETURNED'].includes(action)) {
    throw new Error('Invalid review action');
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
  const isGaruda = operatorCode === 'GA';

  let signaturePath = null;
  if (signatureFile && action === 'APPROVED' && isGaruda) {
    const uploadDir = path.join(__dirname, '../../uploads/signatures');
    const suffix = user.role === 'ENGINEER' ? 'checked_by' : 'approved_by';
    const newFileName = `${suffix}_${eesId}.png`;
    const newPath = path.join(uploadDir, newFileName);
    fs.renameSync(signatureFile.path, newPath);
    signaturePath = newFileName;
  } else if (signatureFile) {
    fs.unlinkSync(signatureFile.path);
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

    return { approval: updatedApproval, reviewAction };
  });

  if (finalStatus === 'APPROVED' && isGaruda) {
    const pdfGenService = require('./pdfGenerationService');
    await pdfGenService.finalizeGarudaPdf(eesId);
  }

  const { notifyAll, notifyUser } = require('../socket');
  if (notifyAll) notifyAll('dashboard_updated', { trigger: 'approval_action' });

  if (finalStatus === 'APPROVED') {
    if (notifyUser) notifyUser(approval.submittedById, 'new_notification', { title: 'EES Approved', message: 'Your EES has been approved.' });
    await prisma.notification.create({
      data: {
        userId: approval.submittedById,
        title: 'EES Approved',
        message: `Your EES ${approval.eesDocument.eesNumber} has been approved.`,
        link: `/ees/${eesId}`
      }
    });
  }

  if (finalStatus === 'REJECTED' || finalStatus === 'RETURNED') {
    if (notifyUser) notifyUser(approval.submittedById, 'new_notification', { title: `EES ${finalStatus === 'REJECTED' ? 'Rejected' : 'Returned'}`, message: 'Your EES requires revision.' });
    await prisma.notification.create({
      data: {
        userId: approval.submittedById,
        title: `EES ${finalStatus === 'REJECTED' ? 'Rejected' : 'Returned'}`,
        message: `Your EES ${approval.eesDocument.eesNumber} has been ${finalStatus.toLowerCase()} by reviewer.`,
        link: `/ees/${eesId}`
      }
    });
    
    try {
      const submitter = await prisma.user.findUnique({ where: { id: approval.submittedById } });
      if (submitter && submitter.email) {
        const pdfGenService = require('./pdfGenerationService');
        const eesDoc = approval.eesDocument;
        const opCode = eesDoc.sourceSb?.operator?.code === 'QG' ? 'CITILINK' : 'GARUDA';
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
  submitReview
};
