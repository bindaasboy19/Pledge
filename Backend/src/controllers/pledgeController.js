import { validatePledgeInput } from '../validators/pledgeValidator.js';
import { getPledgeCount as fetchPledgeCount, recordPledge } from '../services/pledgeService.js';

/**
 * Controller to fetch verified total count of taken pledges.
 * GET /api/pledges/count
 */
export async function getPledgeCount(req, res, next) {
  try {
    const count = await fetchPledgeCount();
    return res.status(200).json({
      success: true,
      count,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller to record a participant pledge and manage certificate dispatch.
 * POST /api/pledges
 */
export async function submitPledge(req, res, next) {
  try {
    const validatedData = validatePledgeInput(req.body);
    const result = await recordPledge(validatedData);

    return res.status(201).json({
      success: true,
      message: result.message,
      pledgeRecorded: true,
      pledgeCompleted: result.pledgeCompleted,
      certificateGenerated: result.certificateGenerated,
      certificateSent: result.certificateSent,
      emailError: result.emailError,
      pledgeNumber: result.pledge.pledgeNumber,
      certificateNumber: result.pledge.certificateNumber,
      certificate: {
        requested: validatedData.receiveCertificate,
        generated: result.certificateGenerated,
        sent: result.certificateSent,
        certificateNumber: result.pledge.certificateNumber,
        certificateId: result.pledge.certificateNumber,
        reference: result.pledge.certificateNumber,
      },
    });
  } catch (error) {
    next(error);
  }
}

export default {
  getPledgeCount,
  submitPledge,
};
