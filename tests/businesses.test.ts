import {
  validateGoogleReviewUrl,
  extractPlaceIdFromUrl,
  extractNameHintFromUrl,
  buildReviewUrl,
} from '../src/lib/google';

describe('Google Places Utilities', () => {
  describe('validateGoogleReviewUrl', () => {
    it('accepts valid Google Maps URLs', () => {
      expect(validateGoogleReviewUrl('https://maps.google.com/maps/place/test')).toBe(true);
      expect(validateGoogleReviewUrl('https://www.google.com/maps/place/test')).toBe(true);
      expect(validateGoogleReviewUrl('https://google.com/maps')).toBe(true);
    });

    it('rejects non-Google URLs', () => {
      expect(validateGoogleReviewUrl('https://yelp.com/review')).toBe(false);
      expect(validateGoogleReviewUrl('https://evil.com/maps.google.com')).toBe(false);
      expect(validateGoogleReviewUrl('https://fakegoogle.com/maps')).toBe(false);
    });

    it('rejects invalid URLs', () => {
      expect(validateGoogleReviewUrl('not-a-url')).toBe(false);
      expect(validateGoogleReviewUrl('')).toBe(false);
    });
  });

  describe('extractPlaceIdFromUrl', () => {
    it('extracts Place ID from data parameter format', () => {
      const url = 'https://maps.google.com/maps/place/Business/@12.9,77.5,17z/data=!3m1!4b1!4m5!3m4!1sChIJ12345678abcdefgh!8m2!3d12.9!4d77.5';
      const placeId = extractPlaceIdFromUrl(url);
      expect(placeId).toBe('ChIJ12345678abcdefgh');
    });

    it('extracts Place ID from place_id query param', () => {
      const url = 'https://www.google.com/maps/place/?q=place_id:ChIJtest';
      expect(extractPlaceIdFromUrl(url)).toBe('ChIJtest');
    });

    it('returns null for URLs without Place ID', () => {
      expect(extractPlaceIdFromUrl('https://maps.google.com')).toBeNull();
    });
  });

  describe('extractNameHintFromUrl', () => {
    it('extracts business name from URL path', () => {
      const url = 'https://www.google.com/maps/place/Sharma%27s+Dhaba/@12.9,77.5,17z';
      const name = extractNameHintFromUrl(url);
      expect(name).toBe("Sharma's Dhaba");
    });

    it('returns null for URLs without place name', () => {
      const url = 'https://maps.google.com/?cid=12345';
      expect(extractNameHintFromUrl(url)).toBeNull();
    });
  });

  describe('buildReviewUrl', () => {
    it('builds a valid Google review URL from Place ID', () => {
      const url = buildReviewUrl('ChIJtest123');
      expect(url).toBe('https://search.google.com/local/writereview?placeid=ChIJtest123');
    });
  });

  describe('searchGooglePlaces', () => {
    const originalEnv = process.env.GOOGLE_PLACES_API_KEY;
    const originalFetch = global.fetch;

    afterEach(() => {
      process.env.GOOGLE_PLACES_API_KEY = originalEnv;
      global.fetch = originalFetch;
    });

    it('returns friendly error when GOOGLE_PLACES_API_KEY is not configured', async () => {
      delete process.env.GOOGLE_PLACES_API_KEY;
      const { searchGooglePlaces } = await import('../src/lib/google');
      const res = await searchGooglePlaces('Sharma Dental Clinic', 'Ghaziabad');
      expect(res.results).toEqual([]);
      expect(res.error).toContain('Google Places API key is not configured');
    });

    it('searches Google Places and maps results up to 10 items', async () => {
      process.env.GOOGLE_PLACES_API_KEY = 'real-test-api-key-123';

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          places: [
            {
              id: 'ChIJ_dental_1',
              displayName: { text: 'Sharma Dental Clinic' },
              formattedAddress: 'RDC, Raj Nagar, Ghaziabad, Uttar Pradesh',
              googleMapsUri: 'https://maps.google.com/?cid=111',
              primaryType: 'dental_clinic',
            },
            {
              id: 'ChIJ_dental_2',
              displayName: { text: 'Sharma Dental Care' },
              formattedAddress: 'Sector 14, Ghaziabad, Uttar Pradesh',
              googleMapsUri: 'https://maps.google.com/?cid=222',
              primaryType: 'dentist',
            },
          ],
        }),
      });

      const { searchGooglePlaces } = await import('../src/lib/google');
      const res = await searchGooglePlaces('Sharma Dental Clinic', 'Ghaziabad, Uttar Pradesh');

      expect(res.error).toBeUndefined();
      expect(res.results).toHaveLength(2);
      expect(res.results[0]).toEqual({
        id: 'ChIJ_dental_1',
        displayName: 'Sharma Dental Clinic',
        formattedAddress: 'RDC, Raj Nagar, Ghaziabad, Uttar Pradesh',
        googleMapsUri: 'https://maps.google.com/?cid=111',
        primaryType: 'dental_clinic',
      });

      // Verify the search query passed to Google
      expect(global.fetch).toHaveBeenCalledWith(
        'https://places.googleapis.com/v1/places:searchText',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            textQuery: 'Sharma Dental Clinic in Ghaziabad, Uttar Pradesh',
            pageSize: 10,
          }),
        })
      );
    });
  });

  describe('fetchPlaceDetailsWithReviewUrl', () => {
    const originalEnv = process.env.GOOGLE_PLACES_API_KEY;
    const originalFetch = global.fetch;

    afterEach(() => {
      process.env.GOOGLE_PLACES_API_KEY = originalEnv;
      global.fetch = originalFetch;
    });

    it('fetches Place Details including writeAReviewUri', async () => {
      process.env.GOOGLE_PLACES_API_KEY = 'real-test-api-key-123';

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'ChIJ_dental_1',
          displayName: { text: 'Sharma Dental Clinic' },
          formattedAddress: 'RDC, Raj Nagar, Ghaziabad, Uttar Pradesh',
          googleMapsUri: 'https://maps.google.com/?cid=111',
          primaryType: 'dental_clinic',
          googleMapsLinks: {
            writeAReviewUri:
              'https://search.google.com/local/writereview?placeid=ChIJ_dental_1',
          },
        }),
      });

      const { fetchPlaceDetailsWithReviewUrl } = await import('../src/lib/google');
      const res = await fetchPlaceDetailsWithReviewUrl('ChIJ_dental_1');

      expect(res.error).toBeUndefined();
      expect(res.data).toEqual({
        id: 'ChIJ_dental_1',
        displayName: 'Sharma Dental Clinic',
        formattedAddress: 'RDC, Raj Nagar, Ghaziabad, Uttar Pradesh',
        googleMapsUri: 'https://maps.google.com/?cid=111',
        writeAReviewUri:
          'https://search.google.com/local/writereview?placeid=ChIJ_dental_1',
        primaryType: 'dental_clinic',
      });
    });

    it('handles missing writeAReviewUri gracefully', async () => {
      process.env.GOOGLE_PLACES_API_KEY = 'real-test-api-key-123';

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'ChIJ_dental_2',
          displayName: { text: 'Sharma Dental Care' },
          formattedAddress: 'Sector 14, Ghaziabad',
          googleMapsUri: 'https://maps.google.com/?cid=222',
          primaryType: 'dentist',
        }),
      });

      const { fetchPlaceDetailsWithReviewUrl } = await import('../src/lib/google');
      const res = await fetchPlaceDetailsWithReviewUrl('ChIJ_dental_2');

      expect(res.error).toBeUndefined();
      expect(res.data?.writeAReviewUri).toBeNull();
    });
  });
});
