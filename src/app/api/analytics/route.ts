import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { recordEvent } from '@/lib/analytics';
import { getClientIp } from '@/lib/rateLimit';

// POST /api/analytics/event — records a public-facing event (copy, continue)
export async function POST(request: NextRequest) {
  let body: { token?: string; event_type?: string; rating?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { token, event_type, rating } = body;

  const allowedPublicEvents = ['copy_click', 'continue_to_google'];
  if (!event_type || !allowedPublicEvents.includes(event_type)) {
    return NextResponse.json({ error: 'Invalid event_type' }, { status: 400 });
  }

  if (!token || typeof token !== 'string' || token.length > 50) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }

  const { data: business, error } = await supabase
    .from('businesses')
    .select('id, is_active')
    .eq('public_token', token)
    .eq('is_active', true)
    .single();

  if (error || !business) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const ip = getClientIp(request);
  await recordEvent({
    businessId: business.id,
    eventType: event_type as 'copy_click' | 'continue_to_google',
    rating: rating ?? undefined,
    ip,
    userAgent: request.headers.get('user-agent') ?? undefined,
  });

  return NextResponse.json({ success: true });
}

// GET /api/analytics — admin dashboard stats
export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { getDashboardStats } = await import('@/lib/analytics');
  const stats = await getDashboardStats();

  return NextResponse.json(stats);
}
