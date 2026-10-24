/**
 * QR Code generation utilities for ReviewSpark.
 *
 * Uses the 'qrcode' npm package (maintained, local generation).
 * QR codes point to permanent URLs on the operator's domain: /r/<token>
 * Updating the Google destination does NOT require reprinting the QR.
 *
 * Error correction level M (15%) provides a good balance between
 * data capacity and robustness for typical print sizes.
 */

import QRCode from 'qrcode';

export interface QROptions {
  /** Full URL the QR code should encode, e.g. https://reviewspark.example.com/r/abc123 */
  url: string;
  /** Pixel size for PNG output (width and height). Default: 512 */
  size?: number;
  /** Quiet zone in modules. Default: 2 (minimum compliant) */
  margin?: number;
  /** Dark module color in CSS format. Default: #1a1a2e */
  darkColor?: string;
  /** Light module color in CSS format. Default: #ffffff */
  lightColor?: string;
}

export interface QRResult {
  /** PNG image as Buffer */
  pngBuffer: Buffer;
  /** PNG as base64 data URI (for embedding in HTML/PDF) */
  dataUri: string;
}

/**
 * Generates a QR code PNG Buffer and base64 data URI.
 * The Buffer is suitable for streaming as a file download response.
 */
export async function generateQRCode(options: QROptions): Promise<QRResult> {
  const {
    url,
    size = 512,
    margin = 2,
    darkColor = '#1a1a2e',
    lightColor = '#ffffff',
  } = options;

  if (!url || !url.startsWith('http')) {
    throw new Error('QR code URL must be a valid absolute HTTP/HTTPS URL');
  }

  const qrOptions: QRCode.QRCodeToBufferOptions = {
    type: 'png',
    width: size,
    margin,
    errorCorrectionLevel: 'M',
    color: {
      dark: darkColor,
      light: lightColor,
    },
  };

  const pngBuffer = await QRCode.toBuffer(url, qrOptions);
  const dataUri = `data:image/png;base64,${pngBuffer.toString('base64')}`;

  return { pngBuffer, dataUri };
}

/**
 * Generates a QR code as a base64 data URI only.
 * Lighter-weight version for preview purposes.
 */
export async function generateQRDataUri(url: string, size = 256): Promise<string> {
  const { dataUri } = await generateQRCode({ url, size });
  return dataUri;
}

/**
 * Builds the canonical public review page URL for a business token.
 */
export function buildReviewPageUrl(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  return `${baseUrl}/r/${token}`;
}
