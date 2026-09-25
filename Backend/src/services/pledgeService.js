import { Counter } from '../models/Counter.js';
import { Pledge } from '../models/Pledge.js';
import { generateCertificateBuffer } from './certificateService.js';
import emailService from './emailService.js';

/**
 * Atomically retrieves the next consecutive pledge sequence number.
 * Starts from 26000001 (sequence base 26000000).
 * Prevents race conditions during simultaneous pledge submissions.
 * 
 * @returns {Promise<number>}
 */
export async function getNextPledgeSequence() {
  let counter = await Counter.findOneAndUpdate(
    { _id: 'pledge' },
    { $inc: { sequence: 1 } },
    { returnDocument: 'after', upsert: true }
  );

  // If initial counter document was just upserted starting below 26000001
  if (counter.sequence < 26000001) {
    counter = await Counter.findOneAndUpdate(
      { _id: 'pledge', sequence: { $lt: 26000001 } },
      { $set: { sequence: 26000001 } },
      { returnDocument: 'after' }
    );
  }

  return counter.sequence;
}

/**
 * Formats standard official certificate ID.
 * Format: NF/CSP/<8-digit sequence> (e.g., NF/CSP/26000001)
 * 
 * @param {number|string} sequenceNumber
 * @returns {string}
 */
export function formatCertificateId(sequenceNumber) {
  return `NF/CSP/${sequenceNumber}`;
}

/**
 * Get verified count of pledges where pledgeAccepted === true.
 * @returns {Promise<number>}
 */
export async function getPledgeCount() {
  return Pledge.countDocuments({ pledgeAccepted: true });
}

/**
 * Record a participant's pledge and handle backend certificate generation & email delivery.
 * 
 * Flow:
 * 1. Validate request and acceptance
 * 2. Get next atomic sequence number (26000001...)
 * 3. Generate official certificate ID (NF/CSP/26000001)
 * 4. If receiveCertificate = true:
 *    - Generate reference-matched PDF certificate with QR code
 *    - Send PDF attached via email to participant
 *    - Record timestamps (certificateGeneratedAt, certificateSentAt)
 * 5. If receiveCertificate = false:
 *    - Save pledge record without generating or sending certificate
 * 
 * @param {object} validatedData
 * @returns {Promise<{
 *   pledge: object,
 *   pledgeCompleted: boolean,
 *   certificateGenerated: boolean,
 *   certificateSent: boolean,
 *   message: string,
 *   emailError?: string
 * }>}
 */
export async function recordPledge(validatedData) {
  const {
    title,
    name,
    email,
    phone,
    occupation,
    organisation,
    language,
    pledgeAccepted,
    receiveCertificate,
  } = validatedData;

  // Look up existing participant by email for idempotency
  let pledge = await Pledge.findOne({ email });

  if (!pledge) {
    // New participant: atomically generate pledge sequence and certificate ID
    const pledgeNumber = await getNextPledgeSequence();
    const certificateId = formatCertificateId(pledgeNumber);

    pledge = new Pledge({
      title,
      officialName: name,
      email,
      phone,
      occupation: occupation || '',
      organisation: organisation || '',
      language,
      pledgeAccepted,
      receiveCertificate,
      pledgeNumber,
      certificateId,
      certificateRequestedAt: receiveCertificate ? new Date() : null,
    });
  } else {
    // Existing participant updating details or retrying
    pledge.title = title;
    pledge.officialName = name;
    pledge.phone = phone;
    if (occupation) pledge.occupation = occupation;
    if (organisation) pledge.organisation = organisation;
    pledge.language = language;
    pledge.pledgeAccepted = pledgeAccepted;

    // Ensure pledge has certificateId and pledgeNumber
    if (!pledge.pledgeNumber || !pledge.certificateId) {
      pledge.pledgeNumber = await getNextPledgeSequence();
      pledge.certificateId = formatCertificateId(pledge.pledgeNumber);
    }

    if (receiveCertificate && !pledge.certificateRequestedAt) {
      pledge.certificateRequestedAt = new Date();
    }
    pledge.receiveCertificate = receiveCertificate;
  }

  // -------------------------------------------------------------
  // Case A: Participant opted OUT of receiving certificate
  // -------------------------------------------------------------
  if (!receiveCertificate) {
    pledge.certificateStatus = 'not_requested';
    await pledge.save();
    return {
      pledge,
      pledgeCompleted: true,
      certificateGenerated: false,
      certificateSent: false,
      message: 'Pledge recorded successfully.',
    };
  }

  // -------------------------------------------------------------
  // Case B: Participant wants certificate & already received it
  // -------------------------------------------------------------
  if (pledge.certificateSentAt && pledge.certificateStatus === 'sent') {
    await pledge.save();
    return {
      pledge,
      pledgeCompleted: true,
      certificateGenerated: true,
      certificateSent: true,
      message: 'Pledge recorded. Your certificate was previously emailed to your registered email address.',
    };
  }

  // -------------------------------------------------------------
  // Case C: Participant wants certificate & needs it generated & sent
  // -------------------------------------------------------------
  const generationDate = pledge.createdAt || new Date();
  let certificateGenerated = false;
  let certificateSent = false;
  let emailError = null;
  pledge.certificateStatus = 'pending';

  let pdfBuffer = null;
  try {
    // Generate temporary in-memory PDF buffer; strictly not stored in MongoDB
    pdfBuffer = await generateCertificateBuffer({
      title: pledge.title,
      name: pledge.officialName,
      certificateId: pledge.certificateId,
      date: generationDate,
    });

    pledge.certificateGeneratedAt = new Date();
    pledge.certificateStatus = 'generated';
    certificateGenerated = true;

    await emailService.sendCertificateEmail({
      email: pledge.email,
      title: pledge.title,
      name: pledge.officialName,
      certificateId: pledge.certificateId,
      date: generationDate,
      pdfBuffer,
    });

    pledge.certificateSentAt = new Date();
    pledge.certificateStatus = 'sent';
    pledge.certificateError = null;
    certificateSent = true;
  } catch (err) {
    console.error(`[PledgeService] Certificate/Email workflow error for ${email}:`, err.message);
    pledge.certificateError = err.message;
    pledge.certificateStatus = 'email_failed';
    emailError = err.message;
  } finally {
    // Explicitly release temporary buffer reference for immediate garbage collection
    pdfBuffer = null;
  }

  await pledge.save();

  if (certificateSent) {
    return {
      pledge,
      pledgeCompleted: true,
      certificateGenerated: true,
      certificateSent: true,
      message: 'Pledge completed successfully. Your certificate has been emailed to your registered email address.',
    };
  } else {
    return {
      pledge,
      pledgeCompleted: true,
      certificateGenerated,
      certificateSent: false,
      emailError,
      message: 'Pledge recorded successfully, but the certificate email could not be delivered at this time.',
    };
  }
}

export default {
  getNextPledgeSequence,
  formatCertificateId,
  getPledgeCount,
  recordPledge,
};
