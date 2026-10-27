'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import Link from 'next/link';
import type {
  Business,
  PaginatedResponse,
  CreateBusinessInput,
  GooglePlaceSearchResult,
  GooglePlaceDetailsResult,
} from '@/types';

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [initialModalTab, setInitialModalTab] = useState<'search' | 'url'>('search');

  const PAGE_SIZE = 20;

  const loadBusinesses = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        ...(search && { search }),
      });
      const res = await fetch(`/api/businesses?${params}`);
      if (!res.ok) throw new Error('Failed to load businesses');
      const data: PaginatedResponse<Business> = await res.json();
      setBusinesses(data.data);
      setCount(data.count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const timer = setTimeout(loadBusinesses, search ? 400 : 0);
    return () => clearTimeout(timer);
  }, [loadBusinesses, search]);

  // Open modal if URL query parameter requested it
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('search_maps') === 'true') {
        setInitialModalTab('search');
        setShowAddModal(true);
      } else if (params.get('add') === 'true') {
        setShowAddModal(true);
      }
    }
  }, []);

  async function toggleActive(business: Business) {
    try {
      const res = await fetch(`/api/businesses/${business.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !business.is_active }),
      });
      if (!res.ok) throw new Error('Update failed');
      setBusinesses((prev) =>
        prev.map((b) => (b.id === business.id ? { ...b, is_active: !b.is_active } : b))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update');
    }
  }

  async function deleteBusiness(business: Business) {
    if (!confirm(`Delete "${business.business_name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/businesses/${business.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setBusinesses((prev) => prev.filter((b) => b.id !== business.id));
      setCount((c) => c - 1);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  const totalPages = Math.ceil(count / PAGE_SIZE);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Businesses</h1>
          <p className="page-subtitle">{count.toLocaleString()} client businesses</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
          <button
            id="find-google-maps-btn"
            className="btn btn-secondary"
            onClick={() => {
              setInitialModalTab('search');
              setShowAddModal(true);
            }}
          >
            🔍 Find on Google Maps
          </button>
          <button
            id="add-business-btn"
            className="btn btn-primary"
            onClick={() => {
              setInitialModalTab('search');
              setShowAddModal(true);
            }}
          >
            + Add Business
          </button>
        </div>
      </div>

      {showAddModal && (
        <AddBusinessModal
          initialTab={initialModalTab}
          onClose={() => setShowAddModal(false)}
          onSuccess={(newBusiness) => {
            setBusinesses((prev) => [newBusiness, ...prev]);
            setCount((c) => c + 1);
          }}
        />
      )}

      {/* Search Bar */}
      <div style={{ marginBottom: 'var(--space-lg)', display: 'flex', gap: 'var(--space-sm)' }}>
        <div className="search-bar">
          <span aria-hidden="true">🔍</span>
          <input
            type="search"
            placeholder="Search businesses…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            aria-label="Search businesses"
            id="business-search-input"
          />
        </div>
      </div>

      {/* Error */}
      {error && <div className="alert alert-error">{error}</div>}

      {/* Table */}
      {loading ? (
        <div
          className="card"
          style={{ textAlign: 'center', padding: '3rem', color: 'var(--admin-text-muted)' }}
        >
          <div className="spinner spinner-dark" style={{ margin: '0 auto 1rem' }} />
          Loading businesses…
        </div>
      ) : businesses.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏢</div>
          <p style={{ color: 'var(--admin-text-muted)' }}>
            {search ? 'No businesses match your search.' : 'No businesses yet. Add your first client!'}
          </p>
          {!search && (
            <button
              className="btn btn-primary"
              style={{ marginTop: '1rem' }}
              onClick={() => {
                setInitialModalTab('search');
                setShowAddModal(true);
              }}
            >
              🔍 Find Business on Google Maps
            </button>
          )}
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Business</th>
                <th>Token</th>
                <th>Source</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {businesses.map((b) => (
                <tr key={b.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--admin-text)' }}>
                      {b.business_name}
                    </div>
                    {b.address && (
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--admin-text-muted)',
                          marginTop: '2px',
                        }}
                      >
                        {b.address.slice(0, 60)}
                        {b.address.length > 60 ? '…' : ''}
                      </div>
                    )}
                  </td>
                  <td>
                    <code
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--brand-primary-light)',
                        background: 'rgba(99,102,241,0.1)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                      }}
                    >
                      {b.public_token}
                    </code>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        b.data_source === 'google_places' ? 'badge-info' : 'badge-warning'
                      }`}
                    >
                      {b.data_source === 'google_places' ? '🔍 Google' : '✏️ Manual'}
                    </span>
                  </td>
                  <td>
                    <button
                      className={`badge ${b.is_active ? 'badge-success' : 'badge-danger'}`}
                      onClick={() => toggleActive(b)}
                      title={b.is_active ? 'Click to deactivate' : 'Click to activate'}
                      style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
                    >
                      {b.is_active ? '● Active' : '○ Inactive'}
                    </button>
                  </td>
                  <td style={{ color: 'var(--admin-text-muted)', fontSize: '0.8rem' }}>
                    {new Date(b.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      <Link
                        href={`/businesses/${b.id}`}
                        className="btn btn-secondary btn-sm"
                        id={`view-business-${b.id}`}
                      >
                        View
                      </Link>
                      <a
                        href={`/r/${b.public_token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-ghost btn-sm"
                        title="Open public review page"
                      >
                        ↗
                      </a>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => deleteBusiness(b)}
                        id={`delete-business-${b.id}`}
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination" role="navigation" aria-label="Pagination">
          <button
            className="pagination-btn"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            aria-label="Previous page"
          >
            ← Prev
          </button>
          <span
            style={{
              color: 'var(--admin-text-muted)',
              fontSize: '0.875rem',
              padding: '0 var(--space-sm)',
            }}
          >
            Page {page} of {totalPages}
          </span>
          <button
            className="pagination-btn"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            aria-label="Next page"
          >
            Next →
          </button>
        </div>
      )}
    </>
  );
}

// ── Add Business Modal ────────────────────────────────────────────────────

interface AddBusinessModalProps {
  initialTab?: 'search' | 'url';
  onClose: () => void;
  onSuccess: (business: Business) => void;
}

function AddBusinessModal({ initialTab = 'search', onClose, onSuccess }: AddBusinessModalProps) {
  const [activeTab, setActiveTab] = useState<'search' | 'url'>(initialTab);

  // Search Tab State
  const [searchName, setSearchName] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchResults, setSearchResults] = useState<GooglePlaceSearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Selected Business & Details State
  const [selectedPlace, setSelectedPlace] = useState<GooglePlaceSearchResult | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const [placeDetails, setPlaceDetails] = useState<GooglePlaceDetailsResult | null>(null);
  const [reviewUrl, setReviewUrl] = useState('');
  const [customContext, setCustomContext] = useState('');
  const [savingGoogle, setSavingGoogle] = useState(false);
  const [saveGoogleError, setSaveGoogleError] = useState('');

  // Created Success & QR Preview State
  const [createdBusiness, setCreatedBusiness] = useState<Business | null>(null);
  const [qrDataUri, setQrDataUri] = useState('');

  // Manual URL Tab State
  const [googleUrl, setGoogleUrl] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState('');
  const [manualCustomContext, setManualCustomContext] = useState('');
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState('');
  const [needsManual, setNeedsManual] = useState(false);

  // Step 1: Search on Google Maps
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
      setSearchError('Network error while searching Google Places. Please try again.');
    } finally {
      setSearching(false);
    }
  }

  // Step 2: Fetch Place Details & Automatic Review URL
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
        // Fallback default review link format for admin verification
        setReviewUrl(`https://search.google.com/local/writereview?placeid=${place.id}`);
      }
    } catch {
      setDetailsError('Network error while fetching place details.');
    } finally {
      setDetailsLoading(false);
    }
  }

  // Generate QR Preview on Success
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

  // Step 3: Save Business & Generate QR
  async function handleSaveGoogleBusiness() {
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
      onSuccess(data);
    } catch {
      setSaveGoogleError('Network error while saving business.');
    } finally {
      setSavingGoogle(false);
    }
  }

  // Direct URL submission fallback
  async function handleManualSubmit(e: FormEvent) {
    e.preventDefault();
    setManualError('');
    setManualLoading(true);

    try {
      const body: CreateBusinessInput = {
        google_review_url: googleUrl.trim(),
        business_name: businessName.trim() || undefined,
        address: address.trim() || undefined,
        category: category.trim() || undefined,
        custom_context: manualCustomContext.trim() || undefined,
      };

      const res = await fetch('/api/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.needs_manual_entry) {
          setNeedsManual(true);
          setManualError(data.error);
        } else {
          setManualError(data.error ?? 'Failed to create business');
        }
        return;
      }

      setCreatedBusiness(data);
      await generateQrPreview(data.public_token);
      onSuccess(data);
    } catch {
      setManualError('Network error. Please try again.');
    } finally {
      setManualLoading(false);
    }
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(6px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: 'var(--shadow-xl)',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-business-modal-title"
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'var(--space-md)',
            borderBottom: '1px solid var(--admin-border)',
            paddingBottom: 'var(--space-sm)',
          }}
        >
          <div>
            <h2 id="add-business-modal-title" style={{ fontSize: '1.25rem', fontWeight: 700 }}>
              {createdBusiness ? '🎉 Business Created!' : 'Add New Business'}
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)', marginTop: '2px' }}>
              {createdBusiness
                ? 'Your ReviewSpark QR and review link are ready.'
                : 'Search on Google Maps or enter business details directly.'}
            </p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        {/* Success Screen */}
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
                {createdBusiness.business_name}
              </div>
              {createdBusiness.address && (
                <div style={{ fontSize: '0.85rem', color: 'var(--admin-text-muted)', marginTop: '2px' }}>
                  📍 {createdBusiness.address}
                </div>
              )}
            </div>

            {/* QR Preview & Link */}
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
                  width={200}
                  height={200}
                  style={{ borderRadius: '8px', background: '#fff', padding: '8px' }}
                />
              ) : (
                <div className="skeleton" style={{ width: 200, height: 200, borderRadius: '8px' }} />
              )}

              <div style={{ textAlign: 'center', width: '100%', marginTop: 'var(--space-xs)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>
                  Customer Review Page:
                </div>
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
                  ↗ Open Public Page
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
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
              <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>
                Done
              </button>
              <Link
                href={`/businesses/${createdBusiness.id}`}
                className="btn btn-primary"
                style={{ flex: 1, textAlign: 'center' }}
              >
                Go to Business Dashboard →
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div
              style={{
                display: 'flex',
                gap: 'var(--space-xs)',
                marginBottom: 'var(--space-lg)',
                borderBottom: '1px solid var(--admin-border)',
                paddingBottom: 'var(--space-xs)',
              }}
            >
              <button
                type="button"
                className={`btn btn-sm ${activeTab === 'search' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setActiveTab('search')}
                id="tab-google-maps-search"
              >
                🔍 Find on Google Maps
              </button>
              <button
                type="button"
                className={`btn btn-sm ${activeTab === 'url' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setActiveTab('url')}
                id="tab-direct-url"
              >
                🔗 Enter Review URL
              </button>
            </div>

            {/* TAB 1: FIND ON GOOGLE MAPS */}
            {activeTab === 'search' && (
              <div>
                {/* Search Form */}
                <form onSubmit={handleSearch} style={{ marginBottom: 'var(--space-md)' }}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
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
                        autoFocus
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" htmlFor="maps-search-location">
                        City, Area or Location (Optional)
                      </label>
                      <input
                        id="maps-search-location"
                        type="text"
                        className="form-input"
                        placeholder="e.g. Ghaziabad, Uttar Pradesh"
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
                    style={{ width: '100%', marginTop: 'var(--space-xs)' }}
                  >
                    {searching ? (
                      <>
                        <span className="spinner" />
                        Searching on Google Maps…
                      </>
                    ) : (
                      '🔍 Search on Google Maps'
                    )}
                  </button>
                </form>

                {searchError && <div className="alert alert-error">{searchError}</div>}

                {/* Search Results */}
                {hasSearched && !searching && searchResults.length === 0 && !searchError && (
                  <div
                    className="card"
                    style={{
                      textAlign: 'center',
                      padding: 'var(--space-lg)',
                      color: 'var(--admin-text-muted)',
                      marginBottom: 'var(--space-md)',
                    }}
                  >
                    No matching businesses found on Google Maps. Try adding city or area details, or switch to the &quot;Enter Review URL&quot; tab.
                  </div>
                )}

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
                      <span>Matching Google Maps Locations ({searchResults.length}):</span>
                      <span style={{ fontSize: '0.75rem' }}>Select the correct branch</span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--space-xs)',
                        maxHeight: '260px',
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
                                }}
                              >
                                <code
                                  style={{
                                    fontSize: '0.7rem',
                                    color: 'var(--admin-text-faint)',
                                  }}
                                >
                                  ID: {place.id}
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
                                    View on Maps ↗
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
                              {isSelected ? '✓ Selected' : 'Select'}
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
                      border: '1px solid rgba(99, 102, 241, 0.25)',
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
                          Selected Business Preview
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

                    {/* Duplicate Warning */}
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

                    {/* Review URL Input & Verification */}
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
                          Google Review Link *
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
                            Manual link required
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
                          ⚠️ Google Places API did not provide a direct write-a-review link for this listing. Please verify the URL above or paste your verified review link.
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
                        placeholder="e.g. Doctor names, dental implants specialty, pain-free treatments, evening clinic timings"
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
                        onClick={handleSaveGoogleBusiness}
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
              </div>
            )}

            {/* TAB 2: DIRECT URL ENTRY (MANUAL) */}
            {activeTab === 'url' && (
              <form onSubmit={handleManualSubmit}>
                <div className="form-group">
                  <label className="form-label" htmlFor="google-url-input">
                    Google Review URL *
                  </label>
                  <input
                    id="google-url-input"
                    type="url"
                    className="form-input"
                    placeholder="https://maps.google.com/maps/place/..."
                    value={googleUrl}
                    onChange={(e) => setGoogleUrl(e.target.value)}
                    required
                    autoFocus
                  />
                  <span className="form-hint">
                    Paste the client&apos;s Google Maps or Google Review URL.
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="business-name-input">
                    Business Name {needsManual ? '*' : '(Optional — auto-detected if empty)'}
                  </label>
                  <input
                    id="business-name-input"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Sharma Dental Clinic"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    required={needsManual}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="manual-custom-context-input">
                    ✨ Business Details &amp; Highlights (Optional)
                  </label>
                  <textarea
                    id="manual-custom-context-input"
                    className="form-input"
                    rows={2}
                    placeholder="e.g. Famous for Root Canal, warm staff, clean clinic"
                    value={manualCustomContext}
                    onChange={(e) => setManualCustomContext(e.target.value)}
                  />
                </div>

                {needsManual && (
                  <>
                    <div className="form-group">
                      <label className="form-label" htmlFor="address-input">
                        Address (Optional)
                      </label>
                      <input
                        id="address-input"
                        type="text"
                        className="form-input"
                        placeholder="123 Main Road, City"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="category-input">
                        Category (Optional)
                      </label>
                      <input
                        id="category-input"
                        type="text"
                        className="form-input"
                        placeholder="e.g. Clinic, Restaurant, Salon"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                      />
                    </div>
                  </>
                )}

                {manualError && <div className="alert alert-error">{manualError}</div>}

                <div
                  style={{
                    display: 'flex',
                    gap: 'var(--space-sm)',
                    marginTop: 'var(--space-lg)',
                  }}
                >
                  <button type="button" className="btn btn-ghost" onClick={onClose}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={manualLoading || !googleUrl || (needsManual && !businessName.trim())}
                    id="add-business-submit-btn"
                    style={{ flex: 1 }}
                  >
                    {manualLoading ? (
                      <>
                        <span className="spinner" />
                        Adding Business…
                      </>
                    ) : (
                      'Add Business'
                    )}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
