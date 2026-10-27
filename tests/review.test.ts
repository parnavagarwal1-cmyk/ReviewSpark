import { estimateCost, isOpenAIConfigured } from '../src/lib/openai';
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
      expect(isOpenAIConfigured()).toBe(false);
      // Restore
      process.env.OPENAI_API_KEY = 'sk-mock-openai-key';
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
