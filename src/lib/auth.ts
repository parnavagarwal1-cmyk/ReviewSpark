import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'rs_session';
const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

/**
 * Convert a byte array to hex string.
 */
function toHex(buf: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buf);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates a cryptographically secure random session token.
 * Uses Web Crypto API (works in both Node.js and Edge runtimes).
 */
export function generateSessionToken(): string {
  // globalThis.crypto is available in Node.js 19+ and all Edge runtimes
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return toHex(bytes);
}

/**
 * Hashes a session token for safe storage in the DB.
 * Uses SHA-256 via Web Crypto API (works in both Node.js and Edge runtimes).
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuf = await globalThis.crypto.subtle.digest('SHA-256', data);
  return toHex(hashBuf);
}

/**
 * Synchronous hash using Node.js crypto (for tests/scripts only, not Edge-safe).
 */
export function hashTokenSync(token: string): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const cryptoModule = require('crypto');
  return cryptoModule.createHash('sha256').update(token).digest('hex');
}

/**
 * Verifies an admin password against the stored bcrypt hash.
 * We use a dynamic import to avoid bundling bcryptjs on the edge.
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  const bcrypt = await import('bcryptjs');
  return bcrypt.compare(password, hash);
}

/**
 * Hashes a password with bcrypt (for setup / seed scripts only).
 */
export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import('bcryptjs');
  return bcrypt.hash(password, 12);
}

/**
 * Sets the session cookie in an API response.
 */
export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
}

/**
 * Clears the session cookie.
 */
export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
}

/**
 * Reads the session token from a request cookie.
 * Returns null if not present.
 */
export function getSessionToken(request: NextRequest): string | null {
  return request.cookies.get(SESSION_COOKIE)?.value ?? null;
}

/**
 * Reads the session token from the server-side cookies store.
 * Used in server components and layouts.
 */
export async function getSessionTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}

/**
 * Validates a session token against the database.
 * Returns true if the session is valid and not expired.
 */
export async function validateSession(token: string): Promise<boolean> {
  if (!token || token.length !== 64) return false;

  const { supabase } = await import('./supabase');
  const tokenHash = await hashToken(token);

  const { data, error } = await supabase
    .from('admin_sessions')
    .select('id, expires_at, is_revoked')
    .eq('token_hash', tokenHash)
    .single();

  if (error || !data) return false;
  if (data.is_revoked) return false;
  if (new Date(data.expires_at) < new Date()) return false;

  return true;
}

/**
 * Creates a new session in the database and returns the raw token.
 */
export async function createSession(): Promise<string> {
  const { supabase } = await import('./supabase');
  const token = generateSessionToken();
  const tokenHash = await hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000).toISOString();

  const { error } = await supabase
    .from('admin_sessions')
    .insert({ token_hash: tokenHash, expires_at: expiresAt });

  if (error) {
    throw new Error(`Failed to create session: ${error.message}`);
  }

  return token;
}

/**
 * Revokes a session by its raw token.
 */
export async function revokeSession(token: string): Promise<void> {
  const { supabase } = await import('./supabase');
  const tokenHash = await hashToken(token);

  await supabase
    .from('admin_sessions')
    .update({ is_revoked: true })
    .eq('token_hash', tokenHash);
}

/**
 * Middleware helper: ensures request is authenticated.
 * Returns null if authenticated, or a 401 response if not.
 */
export async function requireAuth(
  request: NextRequest
): Promise<NextResponse | null> {
  const token = getSessionToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const valid = await validateSession(token);
  if (!valid) {
    return NextResponse.json({ error: 'Session expired or invalid' }, { status: 401 });
  }
  return null;
}
