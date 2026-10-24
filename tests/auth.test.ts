import { hashToken, generateSessionToken, hashPassword, verifyPassword } from '../src/lib/auth';

describe('Auth Utilities', () => {
  describe('generateSessionToken', () => {
    it('generates a 64-character hex string', () => {
      const token = generateSessionToken();
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[0-9a-f]+$/);
    });

    it('generates unique tokens each call', () => {
      const t1 = generateSessionToken();
      const t2 = generateSessionToken();
      expect(t1).not.toBe(t2);
    });
  });

  describe('hashToken', () => {
    it('produces a deterministic SHA-256 hash', async () => {
      const token = 'test-token-12345678901234567890123456789012345678';
      const hash1 = await hashToken(token);
      const hash2 = await hashToken(token);
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex
    });

    it('different tokens produce different hashes', async () => {
      const h1 = await hashToken('token-a');
      const h2 = await hashToken('token-b');
      expect(h1).not.toBe(h2);
    });
  });

  describe('hashPassword & verifyPassword', () => {
    it('hashes and verifies a password correctly', async () => {
      const password = 'SecureAdminPassword!123';
      const hash = await hashPassword(password);

      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2b$')).toBe(true);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('rejects wrong passwords', async () => {
      const hash = await hashPassword('correct-password');
      const isValid = await verifyPassword('wrong-password', hash);
      expect(isValid).toBe(false);
    });
  });
});
