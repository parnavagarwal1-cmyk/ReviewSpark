import crypto from 'crypto';

/**
 * Rate limiting for ReviewSpark API routes.
 *
 * Uses an in-memory sliding window counter. For production with multiple
 * instances, replace with a Redis-backed counter (see DEPLOYMENT.md).
 *
 * Limits:
 * - AI draft generation: 10 requests per IP per minute
 * - Scan events: 60 requests per IP per minute (anti-abuse)
 */

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now - entry.windowStart > 120_000) {
      store.delete(key);
    }
  }
}, CLEANUP_INTERVAL_MS);
if (typeof cleanupTimer?.unref === 'function') {
  cleanupTimer.unref();
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // Unix timestamp ms
}

/**
 * Checks and increments the rate limit counter for a given key.
 *
 * @param key - Unique identifier (e.g., `draft:${ipHash}` or `scan:${token}`)
 * @param limit - Maximum requests allowed per window
 * @param windowMs - Window duration in milliseconds
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now - entry.windowStart >= windowMs) {
    // Start a new window
    store.set(key, { count: 1, windowStart: now });
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: now + windowMs,
    };
  }

  if (entry.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.windowStart + windowMs,
    };
  }

  entry.count += 1;
  return {
    allowed: true,
    remaining: limit - entry.count,
    resetAt: entry.windowStart + windowMs,
  };
}

/**
 * Hashes an IP address for privacy-preserving rate limiting.
 * The raw IP is never stored.
 */
export function hashIp(ip: string): string {
  return crypto
    .createHmac('sha256', process.env.IP_HASH_SECRET ?? 'reviewspark-default-secret')
    .update(ip)
    .digest('hex')
    .slice(0, 16); // 16 chars is sufficient for uniqueness
}

/**
 * Extracts the real IP address from a Next.js request,
 * accounting for common reverse proxy headers.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') ?? '0.0.0.0';
}
