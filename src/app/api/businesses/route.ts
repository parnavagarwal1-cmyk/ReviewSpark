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
    .select('*', { count: 'exact' })
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
        { error: 'Google Review URL is required' },
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
      body.business_name?.trim() ||
      googleData?.business_name ||
      'Unnamed Business';

    if (!googleData && !body.business_name?.trim()) {
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

    // Compile full address if city, nearby or street provided
    const addressParts = [
      body.street?.trim(),
      body.nearby?.trim() ? `Near ${body.nearby.trim()}` : null,
      body.city?.trim(),
      body.address?.trim() || googleData?.address,
    ].filter(Boolean);

    const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : null;

    // Default aspects & tags if none provided
    const aspects = Array.isArray(body.aspects) ? body.aspects.slice(0, 3) : [];
    const ratingTags = body.rating_tags || {};

    const fullPayload: Record<string, unknown> = {
      public_token: publicToken,
      google_review_url: reviewUrl,
      place_id: googleData?.place_id ?? null,
      business_name: businessName,
      address: fullAddress,
      city: body.city?.trim() || null,
      nearby: body.nearby?.trim() || null,
      street: body.street?.trim() || null,
      phone: body.phone?.trim() || null,
      email: body.email?.trim() || null,
      category: body.category?.trim() || googleData?.category || null,
      service_keywords: body.service_keywords?.trim() || null,
      primary_language: body.primary_language?.trim() || 'english',
      secondary_language: body.secondary_language?.trim() || 'hinglish',
      aspects,
      rating_tags: ratingTags,
      show_aspects: body.show_aspects !== false,
      show_tags: body.show_tags !== false,
      data_source: googleData ? 'google_places' : 'manual',
      custom_context: body.custom_context?.trim() || null,
      google_review_destination:
        googleData?.google_review_destination ?? reviewUrl,
      google_data_refreshed_at: googleData ? new Date().toISOString() : null,
    };

    // Attempt insert with all columns
    let insertRes = await supabase
      .from('businesses')
      .insert(fullPayload)
      .select()
      .single();

    // Fallback: If new columns don't exist in Supabase yet, encode extra details in custom_context
    if (insertRes.error && (insertRes.error.code === 'PGRST204' || insertRes.error.message?.includes('column'))) {
      console.warn('[businesses POST] Schema columns missing, falling back to base columns + structured custom_context');

      const structuredContext = JSON.stringify({
        _is_structured: true,
        city: body.city?.trim() || null,
        nearby: body.nearby?.trim() || null,
        street: body.street?.trim() || null,
        phone: body.phone?.trim() || null,
        email: body.email?.trim() || null,
        service_keywords: body.service_keywords?.trim() || null,
        primary_language: body.primary_language?.trim() || 'english',
        secondary_language: body.secondary_language?.trim() || 'hinglish',
        aspects,
        rating_tags: ratingTags,
        show_aspects: body.show_aspects !== false,
        show_tags: body.show_tags !== false,
        custom_context: body.custom_context?.trim() || null,
      });

      const basePayload: Record<string, unknown> = {
        public_token: publicToken,
        google_review_url: reviewUrl,
        place_id: googleData?.place_id ?? null,
        business_name: businessName,
        address: fullAddress,
        category: body.category?.trim() || googleData?.category || null,
        data_source: googleData ? 'google_places' : 'manual',
        custom_context: structuredContext,
        google_review_destination:
          googleData?.google_review_destination ?? reviewUrl,
        google_data_refreshed_at: googleData ? new Date().toISOString() : null,
      };

      insertRes = await supabase
        .from('businesses')
        .insert(basePayload)
        .select()
        .single();

      // If custom_context itself doesn't exist, retry without it
      if (insertRes.error && (insertRes.error.code === 'PGRST204' || insertRes.error.message?.includes('custom_context'))) {
        delete basePayload.custom_context;
        insertRes = await supabase
          .from('businesses')
          .insert(basePayload)
          .select()
          .single();
      }
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
