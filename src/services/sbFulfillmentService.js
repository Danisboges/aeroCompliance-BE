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

/**
 * Evaluasi Applicability SB terhadap seluruh Engine di database (effectedEsnGMF)
 * Berdasarkan 4 Rule: ESN, Model, Part Number, Relation.
 */
const evaluateSbApplicability = async (sbId) => {
  const sb = await prisma.serviceBulletin.findUnique({
    where: { id: sbId },
    include: {
      ocrResult: true,
      relations: true
    }
  });

  if (!sb) return;

  const payload = sb.ocrResult?.rawPayload || sb.rawPayload || {};
  
  const allEngines = await prisma.engine.findMany({
    where: { active: true },
    include: {
      activeComponents: true,
      complianceRecords: true
    }
  });

  // Regex sederhana untuk mendeteksi list ESN (biasanya 5-6 digit angka)
  const isEsnList = (str) => str && /\b\d{5,6}\b/.test(str);

  for (const engine of allEngines) {
    let isApplicable = false;

    // Rule 1 & 2: Explicit ESN Match ATAU Engine Model Match
    const effRange = sb.effectivityRange || payload.effected_model || '';
    if (effRange) {
      if (isEsnList(effRange)) {
        if (effRange.includes(engine.esn)) {
          isApplicable = true;
        }
      } else {
        // Model match
        if (effRange.toLowerCase().includes(engine.model.toLowerCase()) || engine.model.toLowerCase().includes(effRange.toLowerCase())) {
          isApplicable = true;
        }
      }
    } else {
      // Jika kosong, asumsikan applicable lalu filter lewat part number
      isApplicable = true;
    }

    // Rule 3: Installed Part Number Match
    const targetPartNumber = payload.part_number || payload.partnumber;
    if (isApplicable && targetPartNumber) {
      const hasPart = engine.activeComponents.some(item => 
        item.partNumber && item.partNumber.toLowerCase() === targetPartNumber.toLowerCase()
      );
      if (!hasPart) {
        isApplicable = false;
      }
    }

    // Rule 4: SB Relation (Pre/Post) & Superseded (Disederhanakan untuk mapping status dasar)
    // Jika Engine sudah memiliki COMPLIED untuk SB yang men-supersede SB ini,
    // maka SB ini menjadi NOT_APPLICABLE / NOT_REQUIRED.
    const targetStatus = isApplicable ? 'OPEN' : 'NOT_APPLICABLE';

    const existingRecord = engine.complianceRecords.find(c => c.sbId === sb.id);
    if (existingRecord) {
      // Jangan timpa jika status sudah COMPLIED, IN_PROGRESS, NOT_REQUIRED, dll.
      if (['OPEN', 'NOT_APPLICABLE', 'PENDING'].includes(existingRecord.status)) {
        if (existingRecord.status !== targetStatus) {
          await prisma.complianceRecord.update({
            where: { id: existingRecord.id },
            data: { status: targetStatus }
          });
        }
      }
    } else {
      await prisma.complianceRecord.create({
        data: {
          engineId: engine.id,
          sbId: sb.id,
          status: targetStatus
        }
      });
    }
  }
};

module.exports.evaluateSbApplicability = evaluateSbApplicability;
