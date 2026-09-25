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
 * Formats standard official certificate number derived from the pledge sequence.
 * Format: NF/CSP/<8-digit sequence> (e.g., NF/CSP/26000001)
 * 
 * @param {number|string} sequenceNumber
 * @returns {string}
 */
export function formatCertificateNumber(sequenceNumber) {
  return `NF/CSP/${sequenceNumber}`;
}

export const formatCertificateId = formatCertificateNumber;

/**
 * Get verified count of all recorded pledges.
 * @returns {Promise<number>}
 */
export async function getPledgeCount() {
  return Pledge.countDocuments();
}

/**
 * Record a participant's pledge and handle backend certificate generation & email delivery.
 * 
 * Minimal Workflow:
 * 1. Validate request
 * 2. Get next atomic sequence number (26000001...)
 * 3. Derive certificate number (NF/CSP/<sequence>)
 * 4. If receiveCertificate = false:
 *    - Save minimal pledge record (certificateStatus: 'not_requested')
 *    - No PDF generated, no email sent
 * 5. If receiveCertificate = true:
 *    - Generate date on backend
 *    - Load template and dynamically insert Title + Name, Certificate Number, Date
 *    - Generate in-memory PDF buffer (strictly never stored in MongoDB)
 *    - Send PDF as attachment via Nodemailer
 *    - Release PDF buffer immediately
 *    - Save minimal pledge record (certificateStatus: 'sent' or 'failed')
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
    receiveCertificate,
  } = validatedData;

  // Atomically generate unique pledge number
  const pledgeNumber = await getNextPledgeSequence();
  const certificateNumber = formatCertificateNumber(pledgeNumber);

  const pledge = new Pledge({
    title,
    officialName: name,
    email,
    phone,
    occupation: occupation || '',
    organisation: organisation || '',
    receiveCertificate: Boolean(receiveCertificate),
    pledgeNumber,
    certificateStatus: receiveCertificate ? 'pending' : 'not_requested',
  });

  // -------------------------------------------------------------
  // Case A: Participant opted OUT of receiving certificate
  // -------------------------------------------------------------
  if (!receiveCertificate) {
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
  // Case B: Participant requested certificate
  // -------------------------------------------------------------
  const generationDate = new Date();
  let certificateGenerated = false;
  let certificateSent = false;
  let emailError = null;

  let pdfBuffer = null;
  try {
    // Generate temporary in-memory PDF buffer; strictly not stored in MongoDB
    pdfBuffer = await generateCertificateBuffer({
      title: pledge.title,
      name: pledge.officialName,
      certificateNumber,
      date: generationDate,
    });
    certificateGenerated = true;

    // Send PDF attached via email
    await emailService.sendCertificateEmail({
      email: pledge.email,
      title: pledge.title,
      name: pledge.officialName,
      certificateId: certificateNumber,
      certificateReference: certificateNumber,
      date: generationDate,
      pdfBuffer,
    });

    pledge.certificateStatus = 'sent';
    certificateSent = true;
  } catch (err) {
    console.error(`[PledgeService] Certificate/Email workflow error for ${email}:`, err.message);
    pledge.certificateStatus = 'failed';
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
  formatCertificateNumber,
  formatCertificateId,
  getPledgeCount,
  recordPledge,
};
