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
      'id, public_token, business_name, address, category, data_source, is_active, created_at, updated_at, google_data_refreshed_at, google_review_url, google_maps_url, place_id, google_review_destination, custom_context',
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
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
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

    const cleanPlaceId = body.place_id?.trim() || null;

    // Check for duplicate place_id if provided directly
    if (cleanPlaceId) {
      const { data: existing } = await supabase
        .from('businesses')
        .select('id, business_name, public_token')
        .eq('place_id', cleanPlaceId)
        .maybeSingle();

      if (existing) {
        return NextResponse.json(
          {
            error: `This business is already registered as "${existing.business_name}".`,
            existing_id: existing.id,
            existing_token: existing.public_token,
          },
          { status: 409 }
        );
      }
    }

    // Attempt to resolve via Google Places API if place_id wasn't passed
    const googleData = cleanPlaceId ? null : await resolveGoogleReviewUrl(reviewUrl);

    // If resolved place_id from URL, check for duplicate as well
    if (googleData?.place_id) {
      const { data: existing } = await supabase
        .from('businesses')
        .select('id, business_name, public_token')
        .eq('place_id', googleData.place_id)
        .maybeSingle();

      if (existing) {
        return NextResponse.json(
          {
            error: `This business is already registered as "${existing.business_name}".`,
            existing_id: existing.id,
            existing_token: existing.public_token,
          },
          { status: 409 }
        );
      }
    }

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

    const placeIdToSave = cleanPlaceId || googleData?.place_id || null;
    const googleMapsUrlToSave = body.google_maps_url?.trim() || null;

    const { data, error } = await supabase
      .from('businesses')
      .insert({
        public_token: publicToken,
        google_review_url: reviewUrl,
        google_maps_url: googleMapsUrlToSave,
        place_id: placeIdToSave,
        business_name: businessName,
        address: body.address?.trim() || googleData?.address || null,
        category: body.category?.trim() || googleData?.category || null,
        data_source: placeIdToSave || googleData ? 'google_places' : 'manual',
        custom_context: body.custom_context?.trim() || null,
        google_review_destination:
          googleData?.google_review_destination ?? reviewUrl,
        google_data_refreshed_at:
          placeIdToSave || googleData ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) {
      console.error('[businesses POST] insert error:', error);
      return NextResponse.json({ error: 'Failed to create business' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('[businesses POST] error:', err);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
