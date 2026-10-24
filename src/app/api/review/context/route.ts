import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { recordEvent } from '@/lib/analytics';
import { getClientIp } from '@/lib/rateLimit';

// GET /api/review/context?token=... — resolves a public token to business context
// Called by the public review page on load
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token || typeof token !== 'string' || token.length > 50) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }

  // Only return what the customer needs — no internal IDs or admin data
  const { data, error } = await supabase
    .from('businesses')
    .select('id, business_name, google_review_destination, is_active, address, category')
    .eq('public_token', token)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: 'Review page not found or has been disabled.' },
      { status: 404 }
    );
  }

  if (!data.google_review_destination) {
    return NextResponse.json(
      { error: 'Review destination not configured for this business.' },
      { status: 503 }
    );
  }

  // Record QR scan event (fire-and-forget)
  const ip = getClientIp(request);
  recordEvent({
    businessId: data.id,
    eventType: 'scan',
    ip,
    userAgent: request.headers.get('user-agent') ?? undefined,
  });

  // Return only safe public fields
  return NextResponse.json(
    {
      business_name: data.business_name,
      address: data.address,
      category: data.category,
      google_review_destination: data.google_review_destination,
      public_token: token,
      // Internal ID is only needed to record further events
      _bid: data.id,
    },
    {
      headers: {
        'Cache-Control': 'no-store', // Never cache — we want accurate scan counts
      },
    }
  );
}
