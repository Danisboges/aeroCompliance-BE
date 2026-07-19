const prisma = require('../db');

/**
 * List approvals (e.g. for Second Engineer)
 */
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

/**
 * Perform a review action on an EES document
 * Action can be: APPROVED, REJECTED, RETURNED
 */
const submitReview = async ({ eesId, action, comment, actorId, actorRole }) => {
  if (!['APPROVED', 'REJECTED', 'RETURNED'].includes(action)) {
    throw new Error('Invalid review action');
  }

  // 1. Find the active approval process
  const approval = await prisma.approval.findUnique({
    where: { eesId }
  });

  if (!approval) {
    throw new Error('No active approval found for this EES document');
  }
  if (approval.status !== 'PENDING') {
    throw new Error('Approval is no longer pending');
  }

  // 2. Perform transaction to update Approval, EesDocument, and create ReviewAction
  const result = await prisma.$transaction(async (tx) => {
    
    const updatedApproval = await tx.approval.update({
      where: { id: approval.id },
      data: {
        status: action,
        reviewedAt: new Date(),
        comment: comment
      }
    });

    await tx.eesDocument.update({
      where: { id: eesId },
      data: { reviewStatus: action }
    });

    const reviewAction = await tx.reviewAction.create({
      data: {
        eesId,
        action,
        actorId,
        actorRole,
        comment
      }
    });

    return { approval: updatedApproval, reviewAction };
  });

  return result;
};

module.exports = {
  listApprovals,
  submitReview
};
