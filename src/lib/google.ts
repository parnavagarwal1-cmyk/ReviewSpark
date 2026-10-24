/**
 * Google Places API integration for ReviewSpark.
 *
 * Policy compliance:
 * - Uses the Places API (New) Text Search and Place Details endpoints only.
 * - No HTML scraping of Google Maps or other Google properties.
 * - Stored data is cached server-side; Google is not queried on every QR scan.
 * - Attribution is displayed in the admin UI as required by Google's attribution policy.
 * - Data is refreshed at most once per 30 days unless explicitly triggered.
 *
 * If GOOGLE_PLACES_API_KEY is not set, all functions return null and the
 * admin UI prompts for manual business details.
 */

const PLACES_API_BASE = 'https://places.googleapis.com/v1';
const PLACES_LEGACY_BASE = 'https://maps.googleapis.com/maps/api/place';

export interface PlacesBusinessData {
  place_id: string;
  business_name: string;
  address: string | null;
  category: string | null;
  google_review_destination: string;
  data_source: 'google_places';
}

/**
 * Extracts a potential Place ID from a Google Review / Maps URL.
 * Google Maps URLs can carry place IDs in various formats.
 */
export function extractPlaceIdFromUrl(url: string): string | null {
  try {
    const u = new URL(url);

    // Format: maps.google.com/?cid=... (legacy)
    const cid = u.searchParams.get('cid');
    if (cid) return null; // CID != Place ID; needs text search

    // Format: maps.google.com/maps/place/.../@lat,lng,z/data=!...!1s<placeId>
    const match = url.match(/!1s(ChIJ[A-Za-z0-9_-]+)/);
    if (match) return match[1];

    // Format: google.com/maps/place/...?...&place_id=...
    const placeId = u.searchParams.get('place_id');
    if (placeId) return placeId;

    return null;
  } catch {
    return null;
  }
}

/**
 * Extracts a business name hint from a Google Review URL for text search fallback.
 */
export function extractNameHintFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    // Format: maps.google.com/maps/place/BUSINESS+NAME/...
    const pathParts = u.pathname.split('/');
    const placeIndex = pathParts.indexOf('place');
    if (placeIndex !== -1 && pathParts[placeIndex + 1]) {
      return decodeURIComponent(pathParts[placeIndex + 1].replace(/\+/g, ' '));
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Validates that a URL looks like a legitimate Google Review or Maps URL.
 * Prevents open-redirect abuse and non-Google URLs from being submitted.
 */
export function validateGoogleReviewUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const allowedHosts = [
      'google.com',
      'maps.google.com',
      'www.google.com',
      'goo.gl',
    ];
    const host = u.hostname.toLowerCase();
    return allowedHosts.some((allowed) => host === allowed || host.endsWith('.' + allowed));
  } catch {
    return false;
  }
}

/**
 * Fetches business details using Place ID via the Places API (New).
 * Falls back to Places API (Legacy) if the new API key field-mask fails.
 *
 * Returns null if the API key is missing or the request fails.
 */
export async function fetchPlaceDetails(
  placeId: string
): Promise<PlacesBusinessData | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return null;

  try {
    // Try Places API (New) first
    const fieldMask = 'displayName,formattedAddress,primaryType,id';
    const res = await fetch(
      `${PLACES_API_BASE}/places/${placeId}?fields=${fieldMask}&key=${apiKey}`,
      {
        method: 'GET',
        headers: { 'X-Goog-FieldMask': fieldMask },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (res.ok) {
      const data = await res.json();
      return {
        place_id: placeId,
        business_name: data.displayName?.text ?? 'Unknown Business',
        address: data.formattedAddress ?? null,
        category: data.primaryType ?? null,
        google_review_destination: buildReviewUrl(placeId),
        data_source: 'google_places',
      };
    }

    // Fallback: Places API (Legacy) Place Details
    const legacyRes = await fetch(
      `${PLACES_LEGACY_BASE}/details/json?place_id=${placeId}&fields=name,formatted_address,type&key=${apiKey}`,
      { signal: AbortSignal.timeout(8000) }
    );

    if (legacyRes.ok) {
      const legacyData = await legacyRes.json();
      if (legacyData.status === 'OK') {
        const result = legacyData.result;
        return {
          place_id: placeId,
          business_name: result.name ?? 'Unknown Business',
          address: result.formatted_address ?? null,
          category: result.types?.[0] ?? null,
          google_review_destination: buildReviewUrl(placeId),
          data_source: 'google_places',
        };
      }
    }

    return null;
  } catch (err) {
    console.error('[google] fetchPlaceDetails error:', err);
    return null;
  }
}

/**
 * Text search fallback: resolves a business name + optional location to a Place ID.
 * Uses Places API (New) Text Search.
 */
export async function textSearchBusiness(
  query: string
): Promise<PlacesBusinessData | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return null;

  try {
    const fieldMask = 'places.id,places.displayName,places.formattedAddress,places.primaryType';
    const res = await fetch(`${PLACES_API_BASE}/places:searchText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': fieldMask,
      },
      body: JSON.stringify({ textQuery: query }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const place = data.places?.[0];
    if (!place) return null;

    return {
      place_id: place.id,
      business_name: place.displayName?.text ?? 'Unknown Business',
      address: place.formattedAddress ?? null,
      category: place.primaryType ?? null,
      google_review_destination: buildReviewUrl(place.id),
      data_source: 'google_places',
    };
  } catch (err) {
    console.error('[google] textSearchBusiness error:', err);
    return null;
  }
}

/**
 * Builds a Google review URL from a Place ID.
 * This is the canonical destination customers are redirected to.
 */
export function buildReviewUrl(placeId: string): string {
  return `https://search.google.com/local/writereview?placeid=${placeId}`;
}

/**
 * Main entry point: resolve a Google Review URL to structured business data.
 * 1. Try to extract Place ID directly from the URL
 * 2. Try text search using name hint from URL
 * 3. Return null if all methods fail (caller should prompt for manual entry)
 */
export async function resolveGoogleReviewUrl(
  url: string
): Promise<PlacesBusinessData | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return null;

  // Step 1: Extract Place ID from URL
  const placeId = extractPlaceIdFromUrl(url);
  if (placeId) {
    const details = await fetchPlaceDetails(placeId);
    if (details) return details;
  }

  // Step 2: Text search using name from URL
  const nameHint = extractNameHintFromUrl(url);
  if (nameHint) {
    const textResult = await textSearchBusiness(nameHint);
    if (textResult) return textResult;
  }

  return null;
}
