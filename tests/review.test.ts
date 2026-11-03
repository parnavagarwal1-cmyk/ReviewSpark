import {
  estimateCost,
  isOpenAIConfigured,
  getGeminiApiKeys,
  maskKey,
  isFailoverError,
  getOrderedGeminiKeys,
  getGeminiKeyStatus,
  resetGeminiKeyCooldowns,
} from '../src/lib/openai';
import { checkRateLimit, hashIp } from '../src/lib/rateLimit';

describe('OpenAI Utilities', () => {
  describe('estimateCost', () => {
    it('calculates cost for gpt-4o-mini correctly', () => {
      // 1M input tokens = $0.15, 1M output tokens = $0.60
      const cost = estimateCost('gpt-4o-mini', 1000, 500);
      // 1000 * (0.15/1M) + 500 * (0.60/1M)
      const expected = 1000 * 0.00000015 + 500 * 0.00000060;
      expect(cost).toBeCloseTo(expected, 10);
    });

    it('returns a positive cost', () => {
      const cost = estimateCost('gpt-4o-mini', 100, 200);
      expect(cost).toBeGreaterThan(0);
    });

    it('returns 0 for 0 tokens', () => {
      const cost = estimateCost('gpt-4o-mini', 0, 0);
      expect(cost).toBe(0);
    });

    it('uses fallback pricing for unknown models', () => {
      const cost = estimateCost('unknown-model', 1000, 1000);
      expect(cost).toBeGreaterThan(0);
    });
  });

  describe('isOpenAIConfigured / isAIConfigured', () => {
    it('returns true when API key is set', () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      delete process.env.GEMINI_API_KEY;
      expect(isOpenAIConfigured()).toBe(true);
    });

    it('returns true when GEMINI_API_KEY is set', () => {
      delete process.env.OPENAI_API_KEY;
      process.env.GEMINI_API_KEY = 'AIza-test-gemini';
      expect(isOpenAIConfigured()).toBe(true);
      delete process.env.GEMINI_API_KEY;
      process.env.OPENAI_API_KEY = 'sk-mock-openai-key';
    });

    it('returns false when neither API key is set', () => {
      delete process.env.OPENAI_API_KEY;
      delete process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEYS;
      delete process.env.GEMINI_API_KEY_1;
      delete process.env.GEMINI_API_KEY_2;
      expect(isOpenAIConfigured()).toBe(false);
      // Restore
      process.env.OPENAI_API_KEY = 'sk-mock-openai-key';
    });
  });

  describe('Multi-Key Gemini Pool', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
      resetGeminiKeyCooldowns();
      delete process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEYS;
      for (let i = 1; i <= 20; i++) {
        delete process.env[`GEMINI_API_KEY_${i}`];
      }
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('extracts multiple comma-separated keys from GEMINI_API_KEY', () => {
      process.env.GEMINI_API_KEY = 'AIzaSyKeyOne12345, AIzaSyKeyTwo67890';
      const keys = getGeminiApiKeys();
      expect(keys).toEqual(['AIzaSyKeyOne12345', 'AIzaSyKeyTwo67890']);
    });

    it('extracts keys from GEMINI_API_KEYS with various delimiters', () => {
      process.env.GEMINI_API_KEYS = 'AIzaSyKeyA12345\nAIzaSyKeyB67890; AIzaSyKeyC99999';
      const keys = getGeminiApiKeys();
      expect(keys).toEqual(['AIzaSyKeyA12345', 'AIzaSyKeyB67890', 'AIzaSyKeyC99999']);
    });

    it('extracts numbered keys GEMINI_API_KEY_1, GEMINI_API_KEY_2', () => {
      process.env.GEMINI_API_KEY_1 = 'AIzaSyKeyNum11111';
      process.env.GEMINI_API_KEY_2 = 'AIzaSyKeyNum22222';
      const keys = getGeminiApiKeys();
      expect(keys).toContain('AIzaSyKeyNum11111');
      expect(keys).toContain('AIzaSyKeyNum22222');
    });

    it('deduplicates identical keys and ignores placeholder values', () => {
      process.env.GEMINI_API_KEYS = 'AIzaSyKeyA12345, AIzaSyKeyA12345, your-gemini-key-here, short';
      const keys = getGeminiApiKeys();
      expect(keys).toEqual(['AIzaSyKeyA12345']);
    });

    it('masks keys securely for logging', () => {
      expect(maskKey('AIzaSyABCDEF123456789XYZ')).toBe('AIzaSy...9XYZ');
      expect(maskKey('short')).toBe('***');
    });

    it('identifies failover-worthy rate limit / quota errors', () => {
      expect(isFailoverError({ status: 429, message: 'Too Many Requests' })).toBe(true);
      expect(isFailoverError({ message: 'Quota exceeded for quota metric Queries' })).toBe(true);
      expect(isFailoverError({ message: 'Resource has been exhausted (e.g. check quota)' })).toBe(true);
      expect(isFailoverError({ status: 403, message: 'API key not valid' })).toBe(true);
      expect(isFailoverError({ message: 'Invalid model parameters' })).toBe(false);
    });

    it('tracks key status correctly', () => {
      process.env.GEMINI_API_KEYS = 'AIzaSyKeyA12345, AIzaSyKeyB67890';
      const status = getGeminiKeyStatus();
      expect(status.total).toBe(2);
      expect(status.healthy).toBe(2);
      expect(status.coolingDown).toBe(0);
    });
  });
});

describe('Rate Limiting', () => {
  describe('checkRateLimit', () => {
    it('allows requests within the limit', () => {
      const key = `test-${Date.now()}-1`;
      const result = checkRateLimit(key, 5, 60_000);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it('blocks requests over the limit', () => {
      const key = `test-${Date.now()}-2`;
      for (let i = 0; i < 3; i++) {
        checkRateLimit(key, 3, 60_000);
      }
      const blocked = checkRateLimit(key, 3, 60_000);
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);
    });

    it('allows a new window after window expires', async () => {
      const key = `test-${Date.now()}-3`;
      // Exhaust limit
      checkRateLimit(key, 1, 100);
      checkRateLimit(key, 1, 100);

      // Wait for window to expire
      await new Promise((r) => setTimeout(r, 150));

      const result = checkRateLimit(key, 1, 100);
      expect(result.allowed).toBe(true);
    });
  });

  describe('hashIp', () => {
    it('produces a 16-char hash', () => {
      const hash = hashIp('192.168.1.1');
      expect(hash).toHaveLength(16);
    });

    it('produces the same hash for the same IP', () => {
      const h1 = hashIp('192.168.1.1');
      const h2 = hashIp('192.168.1.1');
      expect(h1).toBe(h2);
    });

    it('produces different hashes for different IPs', () => {
      const h1 = hashIp('192.168.1.1');
      const h2 = hashIp('10.0.0.1');
      expect(h1).not.toBe(h2);
    });
  });
});
