const prisma = require('../db');

/**
 * Triggered whenever a ComplianceRecord status changes
 */
const onComplianceStatusChanged = async ({
  complianceRecordId,
  previousStatus,
  newStatus,
  changedById = null,
  changeSource = 'SYSTEM',
  changeReason = null
}) => {
  const compliance = await prisma.complianceRecord.findUnique({
    where: { id: complianceRecordId },
    include: {
      sb: true,
      engine: true
    }
  });

  if (!compliance) return;

  // 1. Record Audit Log
  await prisma.sbComplianceAudit.create({
    data: {
      complianceRecordId,
      previousStatus,
      newStatus,
      changeSource,
      changeReason,
      changedById
    }
  });

  // 2. If status changed to COMPLIED
  if (newStatus === 'COMPLIED') {
    await handleSbComplied(compliance);
  } else if (previousStatus === 'COMPLIED' && newStatus !== 'COMPLIED') {
    await handleSbComplianceRevoked(compliance);
  }
};

/**
 * Handle logic when an SB compliance is COMPLIED on an engine
 */
const handleSbComplied = async (compliance) => {
  if (!compliance.sb) return;

  const engineId = compliance.engineId;
  const sbNumber = compliance.sb.sbNumber;

  // Find requirement groups where this SB is a member
  const groupMemberships = await prisma.sbRequirementMember.findMany({
    where: { targetSbNumber: sbNumber, isActive: true },
    include: {
      requirementGroup: {
        include: {
          members: true
        }
      }
    }
  });

  for (const membership of groupMemberships) {
    const group = membership.requirementGroup;
    const memberSbNumbers = group.members.map(m => m.targetSbNumber);

    // Find all compliance records for these member SBs on this engine
    const memberSbRecords = await prisma.serviceBulletin.findMany({
      where: { sbNumber: { in: memberSbNumbers } },
      select: { id: true, sbNumber: true }
    });

    const memberSbIds = memberSbRecords.map(s => s.id);

    const memberCompliances = await prisma.complianceRecord.findMany({
      where: {
        engineId,
        sbId: { in: memberSbIds }
      }
    });

    const compliedMembers = memberCompliances.filter(c => c.status === 'COMPLIED');

    // Evaluasi ANY_OF (Alternative SBs)
    if (group.fulfillmentRule === 'ANY_OF' && compliedMembers.length >= group.minimumRequired) {
      // Mark group result as SATISFIED
      await prisma.sbGroupResult.upsert({
        where: {
          requirementGroupId_engineId: {
            requirementGroupId: group.id,
            engineId
          }
        },
        create: {
          requirementGroupId: group.id,
          engineId,
          fulfillmentStatus: 'SATISFIED',
          satisfiedByComplianceId: compliance.id,
          satisfiedAt: new Date()
        },
        update: {
          fulfillmentStatus: 'SATISFIED',
          satisfiedByComplianceId: compliance.id,
          satisfiedAt: new Date()
        }
      });

      // Mark other unfulfilled sibling SBs in this group as NOT_REQUIRED
      const remainingCompliances = memberCompliances.filter(
        c => c.id !== compliance.id && c.status !== 'COMPLIED' && c.status !== 'NOT_APPLICABLE'
      );

      for (const siblingComp of remainingCompliances) {
        const prevStatus = siblingComp.status;
        await prisma.complianceRecord.update({
          where: { id: siblingComp.id },
          data: {
            status: 'NOT_REQUIRED',
            resolutionReason: 'ALTERNATIVE_SB_COMPLIED',
            resolvedByComplianceId: compliance.id
          }
        });

        // Record Audit for sibling
        await prisma.sbComplianceAudit.create({
          data: {
            complianceRecordId: siblingComp.id,
            previousStatus: prevStatus,
            newStatus: 'NOT_REQUIRED',
            changeSource: 'SYSTEM',
            changeReason: 'ALTERNATIVE_SB_COMPLIED',
            triggeredByComplianceId: compliance.id
          }
        });
      }
    } else if (group.fulfillmentRule === 'ALL_OF') {
      const allCompleted = compliedMembers.length >= group.members.length;
      const status = allCompleted ? 'SATISFIED' : 'PARTIALLY_SATISFIED';

      await prisma.sbGroupResult.upsert({
        where: {
          requirementGroupId_engineId: {
            requirementGroupId: group.id,
            engineId
          }
        },
        create: {
          requirementGroupId: group.id,
          engineId,
          fulfillmentStatus: status,
          satisfiedByComplianceId: allCompleted ? compliance.id : null,
          satisfiedAt: allCompleted ? new Date() : null
        },
        update: {
          fulfillmentStatus: status,
          satisfiedByComplianceId: allCompleted ? compliance.id : null,
          satisfiedAt: allCompleted ? new Date() : null
        }
      });
    }
  }
};

/**
 * Handle logic when COMPLIED status is revoked / cancelled
 */
const handleSbComplianceRevoked = async (compliance) => {
  const engineId = compliance.engineId;

  // Find all sibling compliance records that were marked NOT_REQUIRED by this compliance
  const resolvedSiblings = await prisma.complianceRecord.findMany({
    where: {
      engineId,
      resolvedByComplianceId: compliance.id
    }
  });

  for (const sibling of resolvedSiblings) {
    const prevStatus = sibling.status;
    await prisma.complianceRecord.update({
      where: { id: sibling.id },
      data: {
        status: 'PENDING',
        resolutionReason: null,
        resolvedByComplianceId: null
      }
    });

    await prisma.sbComplianceAudit.create({
      data: {
        complianceRecordId: sibling.id,
        previousStatus: prevStatus,
        newStatus: 'PENDING',
        changeSource: 'SYSTEM',
        changeReason: 'SATISFYING_COMPLIANCE_REVOKED',
        triggeredByComplianceId: compliance.id
      }
    });
  }

  // Re-open affected group results
  await prisma.sbGroupResult.updateMany({
    where: {
      engineId,
      satisfiedByComplianceId: compliance.id
    },
    data: {
      fulfillmentStatus: 'OPEN',
      satisfiedByComplianceId: null,
      satisfiedAt: null
    }
  });
};

/**
 * Get Engine compliance summary including requirement group statuses
 */
const getEngineComplianceSummary = async (engineId) => {
  const engine = await prisma.engine.findUnique({
    where: { id: engineId },
    include: {
      aircraft: true
    }
  });

  if (!engine) {
    throw new Error('Engine not found');
  }

  const complianceRecords = await prisma.complianceRecord.findMany({
    where: { engineId },
    include: {
      sb: {
        select: { id: true, sbNumber: true, revision: true, title: true, status: true, complianceCategory: true }
      },
      resolvedByCompliance: {
        include: {
          sb: { select: { sbNumber: true } }
        }
      }
    }
  });

  const groupResults = await prisma.sbGroupResult.findMany({
    where: { engineId },
    include: {
      requirementGroup: {
        include: {
          members: true
        }
      },
      satisfiedByCompliance: {
        include: {
          sb: { select: { sbNumber: true } }
        }
      }
    }
  });

  return {
    engine,
    complianceRecords,
    groupResults
  };
};

module.exports = {
  onComplianceStatusChanged,
  getEngineComplianceSummary
};
