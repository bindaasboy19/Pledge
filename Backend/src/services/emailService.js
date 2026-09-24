import nodemailer from 'nodemailer';
import { ENV } from '../config/env.js';

let transporter = null;

/**
 * Initialize or retrieve cached nodemailer transport.
 */
function getTransporter() {
  if (transporter) return transporter;

  // In test environment, use fast mock transport as per Rule 72
  if (ENV.NODE_ENV === 'test') {
    transporter = {
      sendMail: async (options) => {
        return {
          messageId: `<mock-${Date.now()}@naksh.org>`,
          response: 'Mock email dispatched for automated testing',
        };
      },
    };
    return transporter;
  }

  // In development without SMTP configured, use jsonTransport
  if (!ENV.SMTP_HOST || !ENV.SMTP_USER) {
    transporter = nodemailer.createTransport({
      name: 'naksh.org',
      jsonTransport: true,
    });
    return transporter;
  }

  // Real production/configured SMTP transport
  transporter = nodemailer.createTransport({
    name: 'naksh.org',
    host: ENV.SMTP_HOST,
    port: ENV.SMTP_PORT,
    secure: ENV.SMTP_PORT === 465,
    auth: {
      user: ENV.SMTP_USER,
      pass: ENV.SMTP_PASSWORD,
    },
    tls: {
      rejectUnauthorized: ENV.NODE_ENV === 'production',
    },
  });

  return transporter;
}

/**
 * Send Cyber Safety Pledge Certificate to the participant's email.
 * 
 * @param {object} params
 * @param {string} params.email - Recipient email address
 * @param {string} params.title - Title (Mr., Ms., etc.)
 * @param {string} params.name - Recipient name
 * @param {string} params.certificateReference - Unique certificate ID
 * @param {Buffer} params.pdfBuffer - Generated PDF certificate buffer
 * @returns {Promise<{ success: boolean, messageId: string }>}
 */
export async function sendCertificateEmail({
  email,
  title = 'Mr.',
  name = 'Participant',
  certificateId,
  certificateReference,
  date = new Date(),
  pdfBuffer,
}) {
  const mailTransporter = getTransporter();
  const recipientName = `${title ? title + ' ' : ''}${name}`.trim();

  const cleanCertId = certificateId || certificateReference || 'NF/CSP/26000001';
  const d = date instanceof Date ? date : new Date(date);
  const dateString = new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(d);
  const mailOptions = {
    from: ENV.MAIL_FROM,
    to: email,
    subject: 'Your Cyber Security Pledge Certificate — Naksh Foundation',
    text: `Dear ${recipientName},\n\nThank you for taking the Cyber Security Pledge as part of the National Cyber Security Awareness Month initiative.\n\nYour Certificate of Commitment is attached to this email.\n\nCertificate ID: ${cleanCertId}\nDate: ${dateString}\n\nThank you for taking a step toward safer and more responsible digital participation.\n\nRegards,\nNaksh Foundation`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your Cyber Security Pledge Certificate</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; color: #1E293B;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 30px auto; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <!-- Header Banner -->
            <tr>
              <td style="padding: 28px 32px; background: linear-gradient(135deg, #0B1F4D 0%, #1E3A8A 100%); text-align: center;">
                <div style="font-size: 11px; font-weight: 700; color: #93C5FD; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 6px;">
                  National Cyber Security Awareness Month
                </div>
                <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px;">
                  Naksh Foundation
                </h1>
                <div style="font-size: 12px; color: #E0E7FF; margin-top: 4px;">
                  Cyber Security Pledge — Certificate of Commitment
                </div>
              </td>
            </tr>

            <!-- Content Area -->
            <tr>
              <td style="padding: 32px 32px 24px 32px;">
                <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 700; color: #0B1F4D;">
                  Dear ${recipientName},
                </h2>
                <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #334155;">
                  Thank you for taking the Cyber Security Pledge as part of the National Cyber Security Awareness Month initiative.
                </p>
                <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #334155;">
                  Your Certificate of Commitment is attached to this email.
                </p>

                <!-- Certificate Attached Box -->
                <div style="margin: 20px 0; padding: 18px 20px; background-color: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px;">
                  <div style="font-weight: 700; font-size: 14px; color: #1D4ED8; margin-bottom: 6px;">
                    ✓ Certificate of Commitment Details
                  </div>
                  <div style="font-size: 13px; color: #1E3A8A; line-height: 1.6;">
                    <strong>Certificate ID:</strong> <span style="font-family: monospace; font-weight: 600;">${cleanCertId}</span><br>
                    <strong>Date:</strong> <span>${dateString}</span>
                  </div>
                </div>

                <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #334155;">
                  Thank you for taking a step toward safer and more responsible digital participation.
                </p>

                <p style="margin: 24px 0 0 0; font-size: 14px; line-height: 1.5; color: #0B1F4D; font-weight: 600;">
                  Regards,<br>
                  <span style="color: #475569; font-weight: 500;">Naksh Foundation</span>
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding: 20px 32px; background-color: #F1F5F9; border-top: 1px solid #E2E8F0; text-align: center; font-size: 11px; color: #64748B;">
                © 2026 Naksh Foundation • <a href="https://www.naksh.org" style="color: #2563EB; text-decoration: none;">www.naksh.org</a><br>
                This is an automated communication confirming your Cyber Security Pledge.
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
    attachments: [
      {
        filename: `Cyber-Security-Pledge-Certificate-${cleanCertId.replace(/\//g, '-')}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  };

  try {
    const info = await mailTransporter.sendMail(mailOptions);
    console.log(`[EmailService] Certificate email dispatched to ${email} (MessageId: ${info.messageId || 'simulated'})`);
    return {
      success: true,
      messageId: info.messageId || 'simulated',
    };
  } catch (error) {
    console.error(`[EmailService] Failed to send certificate email to ${email}:`, error.message);
    throw error;
  }
}

export default {
  sendCertificateEmail,
};
