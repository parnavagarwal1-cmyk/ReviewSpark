import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, createSession, setSessionCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body as { password?: string };

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    // Admin password hash must be set via environment variable.
    // Run: node -e "const b = require('bcryptjs'); b.hash('yourpassword', 12).then(console.log)"
    // to generate the hash, then set ADMIN_PASSWORD_HASH in your .env.local
    let adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
    if (!adminPasswordHash) {
      // Hot reload fallback: refresh environment variables from .env.local
      try {
        const { loadEnvConfig } = await import('@next/env');
        loadEnvConfig(process.cwd());
        adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
      } catch {}
    }

    if (!adminPasswordHash) {
      console.error('[auth] ADMIN_PASSWORD_HASH is not set');
      return NextResponse.json(
        { error: 'Admin account not configured. See setup instructions.' },
        { status: 503 }
      );
    }

    const isValid = await verifyPassword(password, adminPasswordHash);
    if (!isValid) {
      // Add small delay to limit brute force (200ms)
      await new Promise((r) => setTimeout(r, 200));
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    const token = await createSession();
    const response = NextResponse.json({ success: true });
    setSessionCookie(response, token);

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[auth/login] error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
