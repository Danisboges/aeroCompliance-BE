const serviceBulletinRepository = require('../repositories/serviceBulletinRepository');

const handleControllerError = (res, error) => {
  if (error.message.startsWith('Validation Error')) {
    return res.status(400).json({ error: error.message });
  }
  if (error.message.startsWith('Not Found')) {
    return res.status(404).json({ error: error.message });
  }
  console.error('[ApplicabilityController]', error);
  return res.status(500).json({ error: 'Internal Server Error', details: error.message });
};

/**
 * GET /api/service-bulletins/:id/applicability
 * Check which fleet engines are affected by this SB.
 */
const checkApplicability = async (req, res) => {
  try {
    const sb = await serviceBulletinRepository.findServiceBulletinById(req.params.id);
    if (!sb) {
      return res.status(404).json({ error: 'Not Found: ServiceBulletin not found' });
    }

    const results = await serviceBulletinRepository.checkApplicabilityForSb(sb);

    const applicable = results.filter(r => r.isApplicable);
    const notApplicable = results.filter(r => !r.isApplicable);

    return res.status(200).json({
      data: {
        sb: {
          id: sb.id,
          sbNumber: sb.sbNumber,
          title: sb.title,
          effectivityType: sb.effectivityType,
          effectivityRange: sb.effectivityRange,
          compliancePeriod: sb.compliancePeriod,
        },
        summary: {
          totalEngines: results.length,
          applicable: applicable.length,
          notApplicable: notApplicable.length,
        },
        engines: results.map(r => ({
          esn: r.engine.esn,
          msn: r.engine.msn,
          model: r.engine.model,
          position: r.engine.position,
          aircraft: r.aircraft ? {
            registration: r.aircraft.registration,
            msn: r.aircraft.msn,
            aircraftType: r.aircraft.aircraftType,
          } : null,
          isApplicable: r.isApplicable,
          reason: r.reason,
        }))
      }
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

module.exports = { checkApplicability };
