import { NextRequest, NextResponse } from 'next/server';
import { getSessionToken, revokeSession, clearSessionCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const token = getSessionToken(request);
    if (token) {
      await revokeSession(token);
    }
    const response = NextResponse.json({ success: true });
    clearSessionCookie(response);
    return response;
  } catch (err) {
    console.error('[auth/logout] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
