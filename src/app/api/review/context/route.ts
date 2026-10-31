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

  // First try selecting all funnel fields
  let query = await supabase
    .from('businesses')
    .select(
      'id, business_name, google_review_destination, is_active, address, category, aspects, rating_tags, show_aspects, show_tags, custom_context'
    )
    .eq('public_token', token)
    .eq('is_active', true)
    .single();

  // If column error occurs (prior to 004 migration), fallback to basic select
  if (query.error && query.error.code === 'PGRST204') {
    query = await supabase
      .from('businesses')
      .select('id, business_name, google_review_destination, is_active, address, category, custom_context')
      .eq('public_token', token)
      .eq('is_active', true)
      .single();
  }

  const data = query.data;

  if (query.error || !data) {
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

  // Check if extra settings are encoded in custom_context JSON
  let aspects = (data as Record<string, unknown>).aspects as string[] | undefined;
  let ratingTags = (data as Record<string, unknown>).rating_tags as Record<string, string[]> | undefined;
  let showAspects = (data as Record<string, unknown>).show_aspects !== false;
  let showTags = (data as Record<string, unknown>).show_tags !== false;

  if (data.custom_context && (!aspects || !ratingTags)) {
    try {
      if (data.custom_context.startsWith('{')) {
        const parsed = JSON.parse(data.custom_context);
        if (parsed._is_structured) {
          aspects = aspects || parsed.aspects;
          ratingTags = ratingTags || parsed.rating_tags;
          if (parsed.show_aspects !== undefined) showAspects = parsed.show_aspects;
          if (parsed.show_tags !== undefined) showTags = parsed.show_tags;
        }
      }
    } catch {
      // ignore
    }
  }

  // Return only safe public fields
  return NextResponse.json(
    {
      business_name: data.business_name,
      address: data.address,
      category: data.category,
      google_review_destination: data.google_review_destination,
      public_token: token,
      aspects: aspects || [],
      rating_tags: ratingTags || {},
      show_aspects: showAspects,
      show_tags: showTags,
      _bid: data.id,
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}
