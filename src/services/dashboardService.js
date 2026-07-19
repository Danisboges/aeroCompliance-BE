const prisma = require('../db');

/**
 * Parses YYYY-MM and a timezone offset to return UTC boundaries.
 * Note: For simplicity in this implementation without external libraries, 
 * we just construct the UTC dates directly from the month string.
 */
function getMonthBoundaries(monthStr) {
  const [year, month] = monthStr.split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1)); // start of next month
  return { start, end };
}

/**
 * Retrieves the dashboard summary.
 */
const getDashboardSummary = async ({ month, recentLimit = 5, operatorId, userId }) => {
  // 1. Calculate Date Boundaries
  const { start: monthStart, end: nextMonthStart } = getMonthBoundaries(month);
  const limit = Math.min(20, Math.max(1, parseInt(recentLimit, 10)));

  // Operator Scoping (Always scoped)
  const opFilter = operatorId ? { operatorId } : {};

  // --- SERVICE BULLETINS ---
  const newCount = await prisma.serviceBulletin.count({
    where: { status: 'ACTIVE', ...opFilter }
  });

  const readCount = await prisma.serviceBulletinRead.count({
    where: { userId }
  });
  const unreadCount = Math.max(0, newCount - readCount);

  const recentSBs = await prisma.serviceBulletin.findMany({
    where: { ...opFilter },
    orderBy: { receivedAt: 'desc' },
    take: limit,
    include: {
      operator: true
    }
  });

  // --- SECOND ENGINEER APPROVALS ---
  // To filter Approvals by operatorId, we need to query EesDocument first
  const eesDocs = await prisma.eesDocument.findMany({
    where: { sourceSb: { operatorId: operatorId || undefined } },
    select: { id: true }
  });
  const eesIds = eesDocs.map(e => e.id);
  const eesFilter = operatorId ? { eesId: { in: eesIds } } : {};

  const pendingApprovalsCount = await prisma.approval.count({
    where: { status: 'PENDING', approvalLevel: 2, ...eesFilter }
  });

  const recentActivityCount = await prisma.approval.count({
    where: { 
      status: { in: ['APPROVED', 'REJECTED', 'RETURNED'] },
      reviewedAt: { gte: monthStart, lt: nextMonthStart },
      approvalLevel: 2,
      ...eesFilter
    }
  });

  const recentApprovals = await prisma.approval.findMany({
    where: { ...eesFilter },
    orderBy: { submittedAt: 'desc' },
    take: limit,
    include: {
      eesDocument: {
        include: { sourceSb: true }
      }
    }
  });

  // --- MONTHLY REVIEWS ---
  const monthlyReviewsRaw = await prisma.reviewAction.findMany({
    where: {
      action: { in: ['APPROVED', 'REJECTED', 'RETURNED'] },
      createdAt: { gte: monthStart, lt: nextMonthStart }
    },
    include: {
      eesDocument: {
        include: { sourceSb: true }
      }
    }
  });

  const monthlyReviews = operatorId 
    ? monthlyReviewsRaw.filter(r => r.eesDocument?.sourceSb?.operatorId === operatorId)
    : monthlyReviewsRaw;

  let approved = 0, rejected = 0, returned = 0;
  const categoryCount = {};

  monthlyReviews.forEach(r => {
    if (r.action === 'APPROVED') approved++;
    if (r.action === 'REJECTED') rejected++;
    if (r.action === 'RETURNED') returned++;

    const cat = r.eesDocument?.sourceSb?.complianceCategory || 0;
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
  });

  const totalReviewed = approved + rejected + returned;
  const byCategory = Object.keys(categoryCount).map(cat => ({
    category: parseInt(cat, 10),
    label: `Category ${cat}`,
    count: categoryCount[cat],
    percentage: totalReviewed > 0 ? parseFloat(((categoryCount[cat] / totalReviewed) * 100).toFixed(2)) : 0
  }));

  // Structure output
  return {
    serviceBulletins: {
      newCount,
      unreadCount,
      recent: recentSBs.map(sb => ({
        id: sb.id,
        bulletinNumber: sb.sbNumber,
        revision: sb.revision,
        title: sb.title,
        manufacturer: sb.issuer,
        operator: sb.operator ? { id: sb.operator.id, code: sb.operator.code, name: sb.operator.name } : null,
        fleet: sb.aircraftType,
        category: sb.complianceCategory,
        impactType: sb.impactType,
        status: sb.status,
        receivedAt: sb.receivedAt,
        createdAt: sb.createdAt
      }))
    },
    secondEngineerApprovals: {
      pendingCount: pendingApprovalsCount,
      recentActivityCount,
      recent: recentApprovals.map(app => ({
        id: app.id,
        status: app.status,
        submittedAt: app.submittedAt,
        eesNumber: app.eesDocument?.eesNumber,
        bulletinNumber: app.eesDocument?.sourceSb?.sbNumber
      }))
    },
    monthlyReviews: {
      month,
      timezone: 'Asia/Jakarta', 
      totalReviewed,
      approved,
      rejected,
      returned,
      byCategory
    }
  };
};

module.exports = {
  getDashboardSummary
};
