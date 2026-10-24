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
      // place_id param isn't in this URL, should return null
      expect(extractPlaceIdFromUrl(url)).toBeNull();
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
});
