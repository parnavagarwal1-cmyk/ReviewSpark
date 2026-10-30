import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { fetchPlaceDetailsWithReviewUrl } from '@/lib/google';
import { supabase } from '@/lib/supabase';

// POST /api/places/details — Fetch Place Details including writeAReviewUri & check duplicate status
export async function POST(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { placeId } = body;

    if (!placeId || typeof placeId !== 'string' || !placeId.trim()) {
      return NextResponse.json(
        { error: 'Place ID is required.' },
        { status: 400 }
      );
    }

    const cleanPlaceId = placeId.trim();

    // 1. Fetch details from Google Places API
    const { data: details, error } = await fetchPlaceDetailsWithReviewUrl(cleanPlaceId);

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    if (!details) {
      return NextResponse.json(
        { error: 'Place details could not be found.' },
        { status: 404 }
      );
    }

    // 2. Check if this Place ID is already registered in ReviewSpark database
    const { data: existing } = await supabase
      .from('businesses')
      .select('id, business_name, public_token')
      .eq('place_id', cleanPlaceId)
      .maybeSingle();

    return NextResponse.json({
      data: {
        ...details,
        already_registered: Boolean(existing),
        existing_business_id: existing?.id,
        existing_business_name: existing?.business_name,
        existing_public_token: existing?.public_token,
      },
    });
  } catch (err) {
    console.error('[places/details POST] error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch place details.' },
      { status: 500 }
    );
  }
}
