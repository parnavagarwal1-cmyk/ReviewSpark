import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { searchGooglePlaces } from '@/lib/google';

// POST /api/places/search — Search Google Places (New) by business name and location
export async function POST(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { businessName, location } = body;

    if (!businessName || typeof businessName !== 'string' || !businessName.trim()) {
      return NextResponse.json(
        { error: 'Business name is required.' },
        { status: 400 }
      );
    }

    const { results, error } = await searchGooglePlaces(
      businessName.trim(),
      typeof location === 'string' ? location.trim() : undefined
    );

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ results });
  } catch (err) {
    console.error('[places/search POST] error:', err);
    return NextResponse.json(
      { error: 'Failed to process search request.' },
      { status: 500 }
    );
  }
}
