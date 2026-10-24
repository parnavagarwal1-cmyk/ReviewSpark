import { generateQRCode, buildReviewPageUrl } from '../src/lib/qr';

describe('QR Code Generation', () => {
  describe('generateQRCode', () => {
    it('generates a PNG buffer for a valid URL', async () => {
      const result = await generateQRCode({
        url: 'https://example.com/r/abc123',
        size: 128,
      });

      expect(result.pngBuffer).toBeInstanceOf(Buffer);
      expect(result.pngBuffer.length).toBeGreaterThan(100);
      expect(result.dataUri).toMatch(/^data:image\/png;base64,/);
    });

    it('generates different sizes correctly', async () => {
      const small = await generateQRCode({ url: 'https://example.com/r/test', size: 128 });
      const large = await generateQRCode({ url: 'https://example.com/r/test', size: 512 });

      // Larger size = larger PNG
      expect(large.pngBuffer.length).toBeGreaterThan(small.pngBuffer.length);
    });

    it('throws for non-HTTP URLs', async () => {
      await expect(
        generateQRCode({ url: 'javascript:alert(1)', size: 128 })
      ).rejects.toThrow('valid absolute HTTP/HTTPS URL');
    });

    it('throws for empty URL', async () => {
      await expect(
        generateQRCode({ url: '', size: 128 })
      ).rejects.toThrow('valid absolute HTTP/HTTPS URL');
    });
  });

  describe('buildReviewPageUrl', () => {
    it('builds the correct public review URL', () => {
      process.env.NEXT_PUBLIC_BASE_URL = 'https://reviewspark.io';
      const url = buildReviewPageUrl('abc123');
      expect(url).toBe('https://reviewspark.io/r/abc123');
    });

    it('falls back to localhost when base URL is not set', () => {
      delete process.env.NEXT_PUBLIC_BASE_URL;
      const url = buildReviewPageUrl('test456');
      expect(url).toBe('http://localhost:3000/r/test456');
    });
  });
});
