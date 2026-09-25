import { Pledge } from '../models/Pledge.js';
import { formatCertificateDate } from '../services/certificateService.js';

/**
 * Public Certificate Verification Handler.
 * Confirms whether a certificate ID was legitimately issued by Naksh Foundation.
 * 
 * PRIVACY & SECURITY RULES:
 * - NEVER exposes participant email, phone, occupation, organisation, or Mongo _id.
 * - NEVER provides a certificate PDF download or binary buffer.
 * - Intentionally returns minimal verification status.
 * 
 * GET /api/certificates/verify/:certificateId
 */
export async function verifyCertificate(req, res, next) {
  try {
    // Safely extract certificateId from wildcard params or query param
    const rawParam = req.params.certificateId;
    let certId = Array.isArray(rawParam) ? rawParam.join('/') : (rawParam || req.query.id || '');

    if (typeof certId !== 'string') {
      return res.status(400).json({
        success: false,
        verified: false,
        message: 'Invalid certificate ID parameter.',
      });
    }

    certId = decodeURIComponent(certId).trim().toUpperCase();

    // Strict format validation: NF/CSP/<number> or safe alphanumeric identifier
    // Prevents injection, path traversal, oversized inputs, and malformed strings
    const isStandardFormat = /^NF\/CSP\/\d{6,10}$/.test(certId);
    const isSafeFormat = /^[A-Z0-9\/-]{5,40}$/.test(certId) && !certId.includes('..');

    if (!certId || (!isStandardFormat && !isSafeFormat)) {
      return res.status(404).json({
        success: false,
        verified: false,
        message: "The certificate ID could not be verified against Naksh Foundation's official records.",
      });
    }

    // Lookup strictly by certificateId with minimal field projection
    const pledge = await Pledge.findOne({
      certificateId: certId,
      receiveCertificate: true,
    }).select('certificateId certificateGeneratedAt createdAt');

    if (!pledge) {
      return res.status(404).json({
        success: false,
        verified: false,
        message: "The certificate ID could not be verified against Naksh Foundation's official records.",
      });
    }

    // Return strictly non-sensitive public verification proof
    return res.status(200).json({
      success: true,
      verified: true,
      certificateId: pledge.certificateId,
      issuer: 'Naksh Foundation',
      status: 'Verified',
      issueDate: formatCertificateDate(pledge.certificateGeneratedAt || pledge.createdAt),
    });
  } catch (error) {
    next(error);
  }
}

export default {
  verifyCertificate,
};
