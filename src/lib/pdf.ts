/**
 * PDF generation for ReviewSpark QR assets.
 *
 * Generates a print-ready A4 PDF with:
 * - Business name header
 * - High-resolution QR code (centred)
 * - "Scan to review us on Google" call-to-action
 * - Proper margins and quiet zone
 *
 * Uses jsPDF for maximum compatibility (Node.js + browser, no native deps).
 */

import { jsPDF } from 'jspdf';
import { generateQRCode } from './qr';

export interface PDFOptions {
  businessName: string;
  publicToken: string;
  reviewPageUrl: string;
  /** Optional subtitle / address line */
  subtitle?: string;
}

/**
 * Generates a print-ready A4 PDF containing the QR code and business info.
 * Returns the PDF as a Buffer for streaming as a file download.
 */
export async function generateQRPdf(options: PDFOptions): Promise<Buffer> {
  const { businessName, reviewPageUrl, subtitle } = options;

  // Generate a high-resolution QR code for print quality
  const { dataUri } = await generateQRCode({
    url: reviewPageUrl,
    size: 1024,
    margin: 4,
    darkColor: '#1a1a2e',
    lightColor: '#ffffff',
  });

  // A4 dimensions in mm: 210 × 297
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageW = 210;
  const pageH = 297;
  const margin = 20;
  const contentW = pageW - margin * 2;

  // ── Background ────────────────────────────────────────────────────────────
  doc.setFillColor('#f8f9ff');
  doc.rect(0, 0, pageW, pageH, 'F');

  // ── Decorative top bar ────────────────────────────────────────────────────
  doc.setFillColor('#1a1a2e');
  doc.rect(0, 0, pageW, 18, 'F');

  // ── "SCAN TO REVIEW" text in top bar ─────────────────────────────────────
  doc.setTextColor('#ffffff');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('SCAN TO REVIEW US ON GOOGLE', pageW / 2, 11, { align: 'center' });

  // ── Business name ─────────────────────────────────────────────────────────
  doc.setTextColor('#1a1a2e');
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');

  // Truncate long names
  const nameLines = doc.splitTextToSize(businessName, contentW);
  const maxNameLines = 2;
  const displayLines = nameLines.slice(0, maxNameLines);
  let y = 42;
  doc.text(displayLines, pageW / 2, y, { align: 'center' });
  y += displayLines.length * 10;

  // ── Subtitle (address) ────────────────────────────────────────────────────
  if (subtitle) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor('#6b7280');
    const subtitleLines = doc.splitTextToSize(subtitle, contentW - 20);
    doc.text(subtitleLines.slice(0, 2), pageW / 2, y + 4, { align: 'center' });
    y += subtitleLines.slice(0, 2).length * 6 + 4;
  }

  // ── Stars row ─────────────────────────────────────────────────────────────
  y += 8;
  doc.setFontSize(28);
  doc.text('⭐⭐⭐⭐⭐', pageW / 2, y, { align: 'center' });
  y += 12;

  // ── QR Code ───────────────────────────────────────────────────────────────
  const qrSize = 120; // mm — large for print
  const qrX = (pageW - qrSize) / 2;

  // White background card for QR
  doc.setFillColor('#ffffff');
  doc.setDrawColor('#e5e7eb');
  doc.roundedRect(qrX - 8, y - 4, qrSize + 16, qrSize + 16, 4, 4, 'FD');

  doc.addImage(dataUri, 'PNG', qrX, y, qrSize, qrSize);
  y += qrSize + 20;

  // ── Call to action ────────────────────────────────────────────────────────
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#1a1a2e');
  doc.text('Share Your Experience!', pageW / 2, y, { align: 'center' });
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor('#6b7280');
  doc.text(
    'Scan the QR code with your phone camera to leave a Google review.',
    pageW / 2,
    y,
    { align: 'center', maxWidth: contentW }
  );
  y += 8;
  doc.text(
    'It only takes 30 seconds and means the world to us!',
    pageW / 2,
    y,
    { align: 'center' }
  );

  // ── Bottom decorative bar ─────────────────────────────────────────────────
  doc.setFillColor('#1a1a2e');
  doc.rect(0, pageH - 14, pageW, 14, 'F');

  doc.setTextColor('#9ca3af');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(
    'Powered by ReviewSpark  •  AI-assisted review suggestions',
    pageW / 2,
    pageH - 5,
    { align: 'center' }
  );

  // ── Output as Buffer ──────────────────────────────────────────────────────
  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}
