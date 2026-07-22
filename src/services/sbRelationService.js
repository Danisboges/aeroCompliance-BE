const prisma = require('../db');

/**
 * Fetch direct relations for a given Service Bulletin ID
 */
const getSbRelations = async (sbId) => {
  const sb = await prisma.serviceBulletin.findUnique({
    where: { id: sbId },
    select: { id: true, sbNumber: true, revision: true, title: true, status: true }
  });

  if (!sb) {
    throw new Error('Service Bulletin not found');
  }

  // Relations where this SB is the source
  const outgoing = await prisma.sbRelation.findMany({
    where: { sourceSbId: sbId, isActive: true }
  });

  // Relations where this SB is the target (by sbNumber)
  const incoming = await prisma.sbRelation.findMany({
    where: { targetSbNumber: sb.sbNumber, isActive: true },
    include: {
      sourceSb: {
        select: { id: true, sbNumber: true, revision: true, title: true, status: true }
      }
    }
  });

  return {
    serviceBulletin: sb,
    outgoingRelations: outgoing,
    incomingRelations: incoming
  };
};

/**
 * Fetch full multi-tier lineage tree (Supersedes chain, Terminated chain, Concurrent SBs)
 */
const getSbLineageTree = async (sbId) => {
  const sb = await prisma.serviceBulletin.findUnique({
    where: { id: sbId },
    select: { id: true, sbNumber: true, revision: true, title: true, status: true, issueDate: true }
  });

  if (!sb) {
    throw new Error('Service Bulletin not found');
  }

  // 1. Recursive supersedes chain (Downwards: SBs superseded by this SB)
  const supersededChain = [];
  let currentSbNumber = sb.sbNumber;
  let depth = 1;

  while (depth <= 10) {
    const rel = await prisma.sbRelation.findFirst({
      where: {
        sourceSbId: currentSbNumber === sb.sbNumber ? sbId : undefined,
        relationType: 'SUPERSEDES',
        isActive: true
      },
      include: {
        sourceSb: { select: { id: true, sbNumber: true, status: true, issueDate: true } }
      }
    });

    if (!rel) break;

    // Try to find target SB in database if exists
    const targetSbInDb = await prisma.serviceBulletin.findUnique({
      where: { sbNumber: rel.targetSbNumber },
      select: { id: true, sbNumber: true, status: true, issueDate: true }
    });

    supersededChain.push({
      depth,
      targetSbNumber: rel.targetSbNumber,
      targetSb: targetSbInDb || null,
      conditionType: rel.conditionType,
      relationType: rel.relationType
    });

    if (targetSbInDb) {
      currentSbNumber = targetSbInDb.sbNumber;
      depth++;
    } else {
      break;
    }
  }

  // 2. Superseded by (Upwards: SBs that supersede this SB)
  const supersededByRel = await prisma.sbRelation.findFirst({
    where: {
      targetSbNumber: sb.sbNumber,
      relationType: 'SUPERSEDES',
      isActive: true
    },
    include: {
      sourceSb: { select: { id: true, sbNumber: true, status: true, issueDate: true } }
    }
  });

  // 3. Concurrent & Terminated SBs
  const concurrentRels = await prisma.sbRelation.findMany({
    where: { sourceSbId: sbId, relationType: 'CONCURRENT', isActive: true }
  });

  const terminatedRels = await prisma.sbRelation.findMany({
    where: { sourceSbId: sbId, relationType: 'TERMINATES', isActive: true }
  });

  // 4. Requirement Groups where this SB is a member or source
  const reqMembers = await prisma.sbRequirementMember.findMany({
    where: { targetSbNumber: sb.sbNumber, isActive: true },
    include: {
      requirementGroup: {
        include: {
          members: true
        }
      }
    }
  });

  return {
    serviceBulletin: sb,
    supersededBy: supersededByRel ? {
      sourceSb: supersededByRel.sourceSb,
      conditionType: supersededByRel.conditionType
    } : null,
    supersededChain,
    concurrentRelations: concurrentRels,
    terminatedRelations: terminatedRels,
    requirementGroups: reqMembers.map(m => m.requirementGroup)
  };
};

/**
 * Manually add an SB relation
 */
const createSbRelation = async ({ sourceSbId, targetSbNumber, relationType, conditionType, remarks }) => {
  const sourceSb = await prisma.serviceBulletin.findUnique({
    where: { id: sourceSbId }
  });

  if (!sourceSb) {
    throw new Error('Source Service Bulletin not found');
  }

  const relation = await prisma.sbRelation.create({
    data: {
      sourceSbId,
      targetSbNumber,
      relationType,
      conditionType: conditionType || 'NONE',
      remarks
    }
  });

  // If SUPERSEDES or TERMINATES, update target SB document status if target exists in DB
  const targetSb = await prisma.serviceBulletin.findUnique({
    where: { sbNumber: targetSbNumber }
  });

  if (targetSb) {
    if (relationType === 'SUPERSEDES') {
      await prisma.serviceBulletin.update({
        where: { id: targetSb.id },
        data: { status: 'SUPERSEDED' }
      });
    } else if (relationType === 'TERMINATES') {
      await prisma.serviceBulletin.update({
        where: { id: targetSb.id },
        data: { status: 'TERMINATED' }
      });
    }
  }

  return relation;
};

module.exports = {
  getSbRelations,
  getSbLineageTree,
  createSbRelation
};
