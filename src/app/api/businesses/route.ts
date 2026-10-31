import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { resolveGoogleReviewUrl, validateGoogleReviewUrl } from '@/lib/google';
import { CreateBusinessInput } from '@/types';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12);

// GET /api/businesses — list businesses with pagination
export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20')));
  const search = searchParams.get('search') ?? '';
  const activeOnly = searchParams.get('active') === 'true';

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('businesses')
    .select(
      'id, public_token, business_name, address, category, data_source, is_active, created_at, updated_at, google_data_refreshed_at, google_review_url, place_id, google_review_destination',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(from, to);

  if (search) {
    query = query.ilike('business_name', `%${search}%`);
  }
  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, count, error } = await query;

  if (error) {
    console.error('[businesses GET] error:', error);
    return NextResponse.json({ error: error.message || 'Database error' }, { status: 500 });
  }

  return NextResponse.json({
    data: data ?? [],
    count: count ?? 0,
    page,
    pageSize,
  });
}

// POST /api/businesses — create a new business
export async function POST(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const body = (await request.json()) as CreateBusinessInput;

    // Validate required field
    if (!body.google_review_url || typeof body.google_review_url !== 'string') {
      return NextResponse.json(
        { error: 'google_review_url is required' },
        { status: 400 }
      );
    }

    // Trim and validate URL
    const reviewUrl = body.google_review_url.trim();
    if (!validateGoogleReviewUrl(reviewUrl)) {
      return NextResponse.json(
        {
          error:
            'Invalid Google Review URL. Please provide a valid Google Maps or Google Review link.',
        },
        { status: 422 }
      );
    }

    // Attempt to resolve via Google Places API
    const googleData = await resolveGoogleReviewUrl(reviewUrl);

    // Generate unique public token
    let publicToken: string;
    let tokenExists = true;
    let attempts = 0;
    do {
      publicToken = nanoid();
      const { count } = await supabase
        .from('businesses')
        .select('id', { count: 'exact', head: true })
        .eq('public_token', publicToken);
      tokenExists = (count ?? 0) > 0;
      attempts++;
    } while (tokenExists && attempts < 5);

    if (tokenExists) {
      return NextResponse.json(
        { error: 'Could not generate unique token. Please try again.' },
        { status: 500 }
      );
    }

    // Build the business record
    const businessName =
      googleData?.business_name ||
      body.business_name ||
      'Unnamed Business';

    if (!googleData && !body.business_name) {
      return NextResponse.json(
        {
          error:
            'Could not resolve business from Google API, and no business_name was provided. ' +
            'Please provide a business_name for manual entry.',
          needs_manual_entry: true,
        },
        { status: 422 }
      );
    }

    const insertPayload: Record<string, unknown> = {
      public_token: publicToken,
      google_review_url: reviewUrl,
      place_id: googleData?.place_id ?? null,
      business_name: businessName,
      address: googleData?.address ?? body.address ?? null,
      category: googleData?.category ?? body.category ?? null,
      data_source: googleData ? 'google_places' : 'manual',
      google_review_destination:
        googleData?.google_review_destination ?? reviewUrl,
      google_data_refreshed_at: googleData ? new Date().toISOString() : null,
    };

    if (body.custom_context?.trim()) {
      insertPayload.custom_context = body.custom_context.trim();
    }

    let insertRes = await supabase
      .from('businesses')
      .insert(insertPayload)
      .select()
      .single();

    // Fallback: If custom_context column doesn't exist in Supabase yet, retry without it
    if (
      insertRes.error &&
      insertPayload.custom_context &&
      (insertRes.error.message?.includes('custom_context') || insertRes.error.code === 'PGRST204')
    ) {
      console.warn('[businesses POST] custom_context column missing in Supabase, retrying insert without it');
      delete insertPayload.custom_context;
      insertRes = await supabase
        .from('businesses')
        .insert(insertPayload)
        .select()
        .single();
    }

    if (insertRes.error) {
      console.error('[businesses POST] insert error:', insertRes.error);
      return NextResponse.json(
        {
          error: insertRes.error.message || 'Failed to create business in database.',
          details: insertRes.error.details || insertRes.error.hint || null,
          code: insertRes.error.code || null,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(insertRes.data, { status: 201 });
  } catch (err) {
    console.error('[businesses POST] error:', err);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
