import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { resolveGoogleReviewUrl } from '@/lib/google';

type Params = { params: Promise<{ id: string }> };

// POST /api/businesses/[id]/refresh — re-fetch data from Google Places API
export async function POST(request: NextRequest, { params }: Params) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { id } = await params;

  // Fetch current business record
  const { data: business, error: fetchError } = await supabase
    .from('businesses')
    .select('id, google_review_url, google_data_refreshed_at')
    .eq('id', id)
    .single();

  if (fetchError || !business) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  }

  // Respect caching: don't refresh if data is less than 24 hours old
  // (admins can force-refresh at any time; customers cannot trigger this endpoint)
  if (business.google_data_refreshed_at) {
    const refreshedAt = new Date(business.google_data_refreshed_at);
    const hoursSinceRefresh = (Date.now() - refreshedAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceRefresh < 1) {
      return NextResponse.json(
        {
          message: 'Data was recently refreshed. Please wait before refreshing again.',
          refreshed_at: business.google_data_refreshed_at,
        },
        { status: 429 }
      );
    }
  }

  const googleData = await resolveGoogleReviewUrl(business.google_review_url);

  if (!googleData) {
    return NextResponse.json(
      {
        error:
          'Could not resolve business data from Google API. ' +
          'Check that GOOGLE_PLACES_API_KEY is set and the URL is valid.',
        google_api_available: Boolean(process.env.GOOGLE_PLACES_API_KEY),
      },
      { status: 422 }
    );
  }

  const { data: updated, error: updateError } = await supabase
    .from('businesses')
    .update({
      place_id: googleData.place_id,
      business_name: googleData.business_name,
      address: googleData.address,
      category: googleData.category,
      data_source: 'google_places',
      google_review_destination: googleData.google_review_destination,
      google_data_refreshed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update business data' }, { status: 500 });
  }

  return NextResponse.json(updated);
}
