import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolved asset paths
const TEMPLATE_PATHS = [
  path.join(__dirname, '../assets/certificate-template/certificate.png'),
  path.join(__dirname, '../../certificate.png'),
  path.resolve(process.cwd(), 'src/assets/certificate-template/certificate.png'),
  path.resolve(process.cwd(), 'certificate.png'),
];

const LORA_BOLD_PATHS = [
  path.join(__dirname, '../assets/fonts/Lora-Bold.ttf'),
  path.resolve(process.cwd(), 'src/assets/fonts/Lora-Bold.ttf'),
];

const LORA_REGULAR_PATHS = [
  path.join(__dirname, '../assets/fonts/Lora-Regular.ttf'),
  path.resolve(process.cwd(), 'src/assets/fonts/Lora-Regular.ttf'),
];

function findFirstExistingPath(paths) {
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/**
 * Formats full recipient name in uppercase with appropriate salutation.
 * Example: "MR. SANJEEV CHAURASIA" or "ADV. RASHI BHATIA"
 */
export function formatRecipientDisplayName(title = 'Mr.', name = 'Participant') {
  const cleanTitle = (title || '').trim();
  const cleanName = (name || '').trim();

  if (!cleanTitle || cleanTitle.toLowerCase() === 'other') {
    return cleanName.toUpperCase();
  }

  // Ensure title ends with dot if not already
  const normalizedTitle = cleanTitle.endsWith('.') ? cleanTitle : `${cleanTitle}.`;
  return `${normalizedTitle.toUpperCase()} ${cleanName.toUpperCase()}`;
}

/**
 * Formats generation date cleanly in standard Indian English format.
 * Example: "24 September 2026"
 */
export function formatCertificateDate(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(d);
}

/**
 * Generate a reference-matched PDF certificate by overlaying dynamic fields
 * onto the fixed Naksh Foundation certificate artwork.
 * 
 * @param {object} params
 * @param {string} [params.title='Mr.'] - Participant title
 * @param {string} [params.name='Participant'] - Participant official name
 * @param {string} [params.certificateId='NF/CSP/26000001'] - Unique certificate ID
 * @param {Date} [params.date=new Date()] - Backend generation date
 * @param {string} [params.verificationUrl] - Custom QR verification link
 * @returns {Promise<Buffer>} Resolves with PDF document buffer
 */
export async function generateCertificateBuffer({
  title = 'Mr.',
  name = 'Participant',
  certificateId = 'NF/CSP/26000001',
  certificateReference,
  date = new Date(),
  verificationUrl,
}) {
  const finalCertId = certificateId || certificateReference || 'NF/CSP/26000001';
  const templatePath = findFirstExistingPath(TEMPLATE_PATHS);
  const loraBoldPath = findFirstExistingPath(LORA_BOLD_PATHS);
  const loraRegularPath = findFirstExistingPath(LORA_REGULAR_PATHS);

  // Generate QR code pointing to public verification endpoint
  const publicBase = process.env.PUBLIC_BASE_URL || process.env.FRONTEND_URL || 'https://ncsam-pledge.vercel.app';
  const qrPayload = verificationUrl || `${publicBase.replace(/\/+$/, '')}/certificate/${encodeURIComponent(finalCertId)}`;

  const qrBuffer = await QRCode.toBuffer(qrPayload, {
    type: 'png',
    width: 200,
    margin: 1,
    color: {
      dark: '#0B1F4D',
      light: '#FFFFFF',
    },
    errorCorrectionLevel: 'M',
  });

  return new Promise((resolve, reject) => {
    try {
      // Standard A4 Landscape dimensions in PDF points
      const PAGE_WIDTH = 841.89;
      const PAGE_HEIGHT = 595.28;

      const doc = new PDFDocument({
        size: [PAGE_WIDTH, PAGE_HEIGHT],
        margin: 0,
        info: {
          Title: 'Cyber Security Pledge Certificate of Commitment',
          Author: 'Naksh Foundation',
          Subject: `Certificate for ${name} (${finalCertId})`,
          Keywords: 'NCSAM, Cyber Security Pledge, Certificate, Naksh Foundation',
        },
      });

      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      // Register Lora fonts if available; fallback to Helvetica if missing
      const boldFont = loraBoldPath ? 'Lora-Bold' : 'Helvetica-Bold';
      const regularFont = loraRegularPath ? 'Lora-Regular' : 'Helvetica';

      if (loraBoldPath) doc.registerFont('Lora-Bold', loraBoldPath);
      if (loraRegularPath) doc.registerFont('Lora-Regular', loraRegularPath);

      // -----------------------------------------------------------
      // 1. Draw Fixed Certificate Background Template
      // -----------------------------------------------------------
      if (templatePath) {
        doc.image(templatePath, 0, 0, {
          width: PAGE_WIDTH,
          height: PAGE_HEIGHT,
        });
      } else {
        // Fallback white background if template is missing
        doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill('#FFFFFF');
      }

      // -----------------------------------------------------------
      // 2. Dynamic Title + Name Placement
      // -----------------------------------------------------------
      // Positioned directly above the horizontal line (line is at Y ≈ 331.8 pt)
      const recipientName = formatRecipientDisplayName(title, name);
      let nameFontSize = 24;
      doc.font(boldFont).fontSize(nameFontSize);

      // Calculate width and dynamically fit long names into available area
      const maxAllowedWidth = 440;
      while (doc.widthOfString(recipientName) > maxAllowedWidth && nameFontSize > 15) {
        nameFontSize -= 1;
        doc.fontSize(nameFontSize);
      }

      // Center horizontally across page width, baseline ~8-12pt above magenta line
      const nameY = 302 + (24 - nameFontSize) * 0.4;
      doc
        .font(boldFont)
        .fontSize(nameFontSize)
        .fillColor('#0B1F4D')
        .text(recipientName, 0, nameY, {
          width: PAGE_WIDTH,
          align: 'center',
          characterSpacing: 0.5,
        });

      // -----------------------------------------------------------
      // 3. Dynamic Certificate ID & Date (Lower-Left Section)
      // -----------------------------------------------------------
      // Located on opposite side of signature, above www.naksh.org
      const leftColX = 58;
      const idY = 512;
      const dateY = 527;
      const formattedDate = formatCertificateDate(date);

      doc
        .font(regularFont)
        .fontSize(10)
        .fillColor('#0B1F4D')
        .text(finalCertId, leftColX, idY, { lineBreak: false });

      doc
        .font(regularFont)
        .fontSize(10)
        .fillColor('#0B1F4D')
        .text(formattedDate, leftColX, dateY, { lineBreak: false });

      // -----------------------------------------------------------
      // 4. Dynamic QR Code (Center-Bottom Section)
      // -----------------------------------------------------------
      // Placed directly in the open space between ID/Date block and Signature block
      const qrSize = 64;
      const qrX = 388; // Centered between left block and signature block
      const qrY = 485;

      doc.image(qrBuffer, qrX, qrY, {
        width: qrSize,
        height: qrSize,
      });

      // Finalize PDF stream
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export default {
  formatRecipientDisplayName,
  formatCertificateDate,
  generateCertificateBuffer,
};
