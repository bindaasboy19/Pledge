import apiClient from '../api/client';

/**
 * Verifies certificate validity against official Naksh Foundation records.
 * 
 * PRIVACY NOTICE:
 * Does NOT fetch or return personal identifying information (no email, phone, name, or Mongo _id).
 * 
 * @param {string} certificateId 
 * @returns {Promise<{ success: boolean, verified: boolean, certificateId?: string, issuer?: string, status?: string, issueDate?: string, message?: string }>}
 */
export async function verifyCertificate(certificateId) {
  if (!certificateId || typeof certificateId !== 'string') {
    return {
      success: false,
      verified: false,
      message: 'Please provide a valid certificate ID.',
    };
  }

  try {
    const cleanId = certificateId.trim();
    // Use encodeURIComponent to safely transport slashes across the URL
    const encodedId = encodeURIComponent(cleanId);
    const data = await apiClient(`/api/certificates/verify/${encodedId}`);

    return {
      success: true,
      verified: Boolean(data?.verified),
      certificateId: data?.certificateId || cleanId,
      issuer: data?.issuer || 'Naksh Foundation',
      status: data?.status || 'Verified',
      issueDate: data?.issueDate || null,
    };
  } catch (error) {
    return {
      success: false,
      verified: false,
      message: error.backendMessage || error.message || "The certificate ID could not be verified against Naksh Foundation's official records.",
    };
  }
}

export default {
  verifyCertificate,
};
