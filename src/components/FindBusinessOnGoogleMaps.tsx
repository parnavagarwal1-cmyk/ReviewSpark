'use client';

import { useState, FormEvent, useCallback } from 'react';
import Link from 'next/link';
import type {
  Business,
  CreateBusinessInput,
  GooglePlaceSearchResult,
  GooglePlaceDetailsResult,
} from '@/types';

interface FindBusinessOnGoogleMapsProps {
  onSuccess?: (business: Business) => void;
  standalone?: boolean;
}

export default function FindBusinessOnGoogleMaps({
  onSuccess,
  standalone = false,
}: FindBusinessOnGoogleMapsProps) {
  // Search State
  const [searchName, setSearchName] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchResults, setSearchResults] = useState<GooglePlaceSearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Selected Place State
  const [selectedPlace, setSelectedPlace] = useState<GooglePlaceSearchResult | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const [placeDetails, setPlaceDetails] = useState<GooglePlaceDetailsResult | null>(null);
  const [reviewUrl, setReviewUrl] = useState('');
  const [customContext, setCustomContext] = useState('');
  const [savingGoogle, setSavingGoogle] = useState(false);
  const [saveGoogleError, setSaveGoogleError] = useState('');

  // Success State & QR
  const [createdBusiness, setCreatedBusiness] = useState<Business | null>(null);
  const [qrDataUri, setQrDataUri] = useState('');

  // Step 1: Search Google Places API (New)
  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (!searchName.trim()) return;

    setSearching(true);
    setSearchError('');
    setSearchResults([]);
    setSelectedPlace(null);
    setPlaceDetails(null);
    setReviewUrl('');
    setHasSearched(true);

    try {
      const res = await fetch('/api/places/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: searchName.trim(),
          location: searchLocation.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSearchError(data.error || 'Failed to search Google Places.');
        return;
      }

      setSearchResults(data.results || []);
    } catch {
      setSearchError('Network error while searching Google Places. Please check your connection.');
    } finally {
      setSearching(false);
    }
  }

  // Step 2: Fetch Place Details & Direct Write a Review URL
  async function handleSelectPlace(place: GooglePlaceSearchResult) {
    setSelectedPlace(place);
    setDetailsLoading(true);
    setDetailsError('');
    setSaveGoogleError('');
    setPlaceDetails(null);
    setReviewUrl('');

    try {
      const res = await fetch('/api/places/details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId: place.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        setDetailsError(data.error || 'Failed to fetch business details.');
        return;
      }

      const details: GooglePlaceDetailsResult = data.data;
      setPlaceDetails(details);

      if (details.writeAReviewUri) {
        setReviewUrl(details.writeAReviewUri);
      } else {
        // Fallback review URL template for verification
        setReviewUrl(`https://search.google.com/local/writereview?placeid=${place.id}`);
      }
    } catch {
      setDetailsError('Network error while fetching place details.');
    } finally {
      setDetailsLoading(false);
    }
  }

  // Generate QR Code preview
  const generateQrPreview = useCallback(async (token: string) => {
    try {
      const QRCode = await import('qrcode');
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const publicUrl = `${origin}/r/${token}`;
      const dataUri = await QRCode.toDataURL(publicUrl, {
        width: 220,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: { dark: '#0a0a1a', light: '#ffffff' },
      });
      setQrDataUri(dataUri);
    } catch {
      // Non-critical
    }
  }, []);

  // Step 3: Save to Supabase & Generate QR Code
  async function handleSaveBusiness() {
    if (!selectedPlace) return;
    if (!reviewUrl.trim()) {
      setSaveGoogleError('A valid Google Review URL is required.');
      return;
    }

    setSavingGoogle(true);
    setSaveGoogleError('');

    try {
      const payload: CreateBusinessInput = {
        business_name: selectedPlace.displayName,
        address: selectedPlace.formattedAddress || undefined,
        category: selectedPlace.primaryType || undefined,
        google_maps_url: selectedPlace.googleMapsUri || undefined,
        google_review_url: reviewUrl.trim(),
        place_id: selectedPlace.id,
        custom_context: customContext.trim() || undefined,
      };

      const res = await fetch('/api/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setSaveGoogleError(data.error || 'Failed to create business.');
        return;
      }

      setCreatedBusiness(data);
      await generateQrPreview(data.public_token);
      if (onSuccess) {
        onSuccess(data);
      }
    } catch {
      setSaveGoogleError('Network error while saving business.');
    } finally {
      setSavingGoogle(false);
    }
  }

  function handleReset() {
    setSearchName('');
    setSearchLocation('');
    setSearchResults([]);
    setHasSearched(false);
    setSelectedPlace(null);
    setPlaceDetails(null);
    setReviewUrl('');
    setCustomContext('');
    setCreatedBusiness(null);
    setQrDataUri('');
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className={`find-business-section ${standalone ? 'card' : ''}`}>
      <div style={{ marginBottom: 'var(--space-md)' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--admin-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>🔍</span> Find Business on Google Maps
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--admin-text-muted)', marginTop: '2px' }}>
          Search any business listing on Google Maps, auto-fetch its Google Review URL, and instantly generate its ReviewSpark QR code.
        </p>
      </div>

      {/* Success View */}
      {createdBusiness ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              padding: 'var(--space-md)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#34d399' }}>
              ✓ {createdBusiness.business_name} registered successfully!
            </div>
            {createdBusiness.address && (
              <div style={{ fontSize: '0.85rem', color: 'var(--admin-text-muted)', marginTop: '2px' }}>
                📍 {createdBusiness.address}
              </div>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--space-sm)',
              padding: 'var(--space-md)',
              background: 'var(--admin-surface-raised)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--admin-border)',
            }}
          >
            {qrDataUri ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUri}
                alt={`QR for ${createdBusiness.business_name}`}
                width={180}
                height={180}
                style={{ borderRadius: '8px', background: '#fff', padding: '8px' }}
              />
            ) : (
              <div className="skeleton" style={{ width: 180, height: 180, borderRadius: '8px' }} />
            )}

            <div style={{ textAlign: 'center', width: '100%' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>
                Unique ReviewSpark Destination:
              </span>
              <code
                style={{
                  display: 'block',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  background: 'rgba(0,0,0,0.3)',
                  color: 'var(--brand-primary-light)',
                  fontSize: '0.85rem',
                  margin: '6px 0',
                  wordBreak: 'break-all',
                }}
              >
                {`${origin}/r/${createdBusiness.public_token}`}
              </code>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', justifyContent: 'center' }}>
              <a
                href={`/r/${createdBusiness.public_token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm"
              >
                ↗ Open Public Review Page
              </a>
              <a
                href={`/api/businesses/${createdBusiness.id}/qr?size=1024`}
                download
                className="btn btn-secondary btn-sm"
              >
                ⬇ Download PNG
              </a>
              <a
                href={`/api/qr/pdf?businessId=${createdBusiness.id}`}
                download
                className="btn btn-secondary btn-sm"
              >
                ⬇ Print A4 PDF
              </a>
              <Link
                href={`/businesses/${createdBusiness.id}`}
                className="btn btn-primary btn-sm"
              >
                Manage Business →
              </Link>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleReset}
            style={{ alignSelf: 'flex-start' }}
          >
            + Search &amp; Add Another Business
          </button>
        </div>
      ) : (
        <>
          {/* Search Form */}
          <form onSubmit={handleSearch} style={{ marginBottom: 'var(--space-md)' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: 'var(--space-sm)',
                marginBottom: 'var(--space-sm)',
              }}
            >
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="maps-search-name">
                  Business Name *
                </label>
                <input
                  id="maps-search-name"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Sharma Dental Clinic"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="maps-search-location">
                  City / Location (Optional)
                </label>
                <input
                  id="maps-search-location"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Ghaziabad, Uttar Pradesh, India"
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={searching || !searchName.trim()}
              id="search-google-maps-btn"
              style={{ marginTop: 'var(--space-xs)' }}
            >
              {searching ? (
                <>
                  <span className="spinner" />
                  Searching Google Maps…
                </>
              ) : (
                'Search Google Maps'
              )}
            </button>
          </form>

          {searchError && <div className="alert alert-error">{searchError}</div>}

          {/* No Results Message */}
          {hasSearched && !searching && searchResults.length === 0 && !searchError && (
            <div
              style={{
                padding: 'var(--space-md)',
                background: 'var(--admin-surface-raised)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--admin-text-muted)',
                fontSize: '0.875rem',
                textAlign: 'center',
                marginBottom: 'var(--space-md)',
              }}
            >
              No matching business listings found on Google Maps. Try refining the business name or city/location.
            </div>
          )}

          {/* Matching Business Results List (Up to 10) */}
          {searchResults.length > 0 && (
            <div style={{ marginBottom: 'var(--space-md)' }}>
              <div
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--admin-text-muted)',
                  marginBottom: 'var(--space-xs)',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>Matching Google Maps Listings ({searchResults.length}):</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--brand-primary-light)' }}>
                  Confirm the correct branch below
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-xs)',
                  maxHeight: '320px',
                  overflowY: 'auto',
                  paddingRight: '4px',
                }}
              >
                {searchResults.map((place) => {
                  const isSelected = selectedPlace?.id === place.id;
                  return (
                    <div
                      key={place.id}
                      style={{
                        padding: 'var(--space-sm) var(--space-md)',
                        borderRadius: 'var(--radius-md)',
                        border: isSelected
                          ? '1px solid var(--brand-primary-light)'
                          : '1px solid var(--admin-border)',
                        background: isSelected
                          ? 'rgba(99, 102, 241, 0.15)'
                          : 'var(--admin-surface-raised)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 'var(--space-sm)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            color: 'var(--admin-text)',
                            fontSize: '0.925rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-xs)',
                            flexWrap: 'wrap',
                          }}
                        >
                          <span>{place.displayName}</span>
                          {place.primaryType && (
                            <span
                              className="badge badge-info"
                              style={{ fontSize: '0.65rem', textTransform: 'capitalize' }}
                            >
                              {place.primaryType.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>
                        {place.formattedAddress && (
                          <div
                            style={{
                              fontSize: '0.75rem',
                              color: 'var(--admin-text-muted)',
                              marginTop: '2px',
                            }}
                          >
                            📍 {place.formattedAddress}
                          </div>
                        )}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-sm)',
                            marginTop: '4px',
                            flexWrap: 'wrap',
                          }}
                        >
                          <code
                            style={{
                              fontSize: '0.7rem',
                              color: 'var(--admin-text-faint)',
                            }}
                          >
                            Place ID: {place.id}
                          </code>
                          {place.googleMapsUri && (
                            <a
                              href={place.googleMapsUri}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                fontSize: '0.75rem',
                                color: 'var(--brand-primary-light)',
                                textDecoration: 'underline',
                              }}
                            >
                              Google Maps Link ↗
                            </a>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => handleSelectPlace(place)}
                        id={`select-place-${place.id}`}
                      >
                        {isSelected ? '✓ Selected' : 'Select Business'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Selected Business Preview & Review Link Section */}
          {selectedPlace && (
            <div
              style={{
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-md)',
                marginTop: 'var(--space-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-sm)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: 'var(--brand-primary-light)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Selected Business Details
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--admin-text)' }}>
                    {selectedPlace.displayName}
                  </div>
                  {selectedPlace.formattedAddress && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>
                      📍 {selectedPlace.formattedAddress}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleSelectPlace(selectedPlace)}
                  disabled={detailsLoading}
                  title="Re-fetch details and review link"
                  id="refetch-review-link-btn"
                >
                  {detailsLoading ? 'Fetching…' : '🔄 Fetch Review Link'}
                </button>
              </div>

              {detailsLoading && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-xs)',
                    fontSize: '0.8rem',
                    color: 'var(--brand-primary-light)',
                  }}
                >
                  <span className="spinner" />
                  Fetching Place Details &amp; Google Review link…
                </div>
              )}

              {detailsError && <div className="alert alert-error">{detailsError}</div>}

              {/* Duplicate Detection Warning */}
              {placeDetails?.already_registered && (
                <div className="alert alert-warning" style={{ fontSize: '0.85rem' }}>
                  ⚠️ This business is already registered in ReviewSpark as &quot;
                  {placeDetails.existing_business_name || selectedPlace.displayName}&quot;.
                  {placeDetails.existing_business_id && (
                    <Link
                      href={`/businesses/${placeDetails.existing_business_id}`}
                      style={{
                        marginLeft: '8px',
                        textDecoration: 'underline',
                        fontWeight: 600,
                      }}
                    >
                      View Business →
                    </Link>
                  )}
                </div>
              )}

              {/* Direct Review URL & Verification Link */}
              <div className="form-group" style={{ margin: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '4px',
                  }}
                >
                  <label className="form-label" htmlFor="verified-review-url" style={{ margin: 0 }}>
                    Google Write a Review Link *
                  </label>
                  {placeDetails?.writeAReviewUri ? (
                    <span
                      className="badge badge-success"
                      style={{ fontSize: '0.7rem' }}
                    >
                      ✓ Retrieved via Google API
                    </span>
                  ) : (
                    <span
                      className="badge badge-warning"
                      style={{ fontSize: '0.7rem' }}
                    >
                      Manual link verification required
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                  <input
                    id="verified-review-url"
                    type="url"
                    className="form-input"
                    placeholder="https://search.google.com/local/writereview?placeid=..."
                    value={reviewUrl}
                    onChange={(e) => setReviewUrl(e.target.value)}
                    required
                    style={{ fontSize: '0.85rem', flex: 1 }}
                  />
                  {reviewUrl && (
                    <a
                      href={reviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm"
                      id="verify-review-link-btn"
                      title="Verify that this link opens the review composer on Google Maps"
                    >
                      Verify Link ↗
                    </a>
                  )}
                </div>

                {!placeDetails?.writeAReviewUri && !detailsLoading && (
                  <span className="form-hint" style={{ color: 'var(--brand-warning)' }}>
                    ⚠️ Google Places API did not return an explicit writeAReviewUri for this listing. Please click &quot;Verify Link ↗&quot; or paste your verified review link.
                  </span>
                )}
              </div>

              {/* Business Highlights & Context */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="maps-custom-context">
                  ✨ Business Details &amp; Highlights (Optional)
                </label>
                <textarea
                  id="maps-custom-context"
                  className="form-input"
                  rows={2}
                  placeholder="e.g. Doctor names, dental implants, root canal specialty, painless treatment, evening clinic timings"
                  value={customContext}
                  onChange={(e) => setCustomContext(e.target.value)}
                  style={{ fontSize: '0.85rem' }}
                />
                <span className="form-hint">
                  AI will personalize customer drafts using these highlights.
                </span>
              </div>

              {saveGoogleError && <div className="alert alert-error">{saveGoogleError}</div>}

              {/* Actions */}
              <div
                style={{
                  display: 'flex',
                  gap: 'var(--space-sm)',
                  marginTop: 'var(--space-xs)',
                }}
              >
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setSelectedPlace(null)}
                >
                  ← Back to Results
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={
                    savingGoogle ||
                    !reviewUrl.trim() ||
                    Boolean(placeDetails?.already_registered)
                  }
                  onClick={handleSaveBusiness}
                  id="save-business-generate-qr-btn"
                  style={{ flex: 1 }}
                >
                  {savingGoogle ? (
                    <>
                      <span className="spinner" />
                      Saving &amp; Generating QR…
                    </>
                  ) : (
                    'Save Business & Generate QR'
                  )}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
