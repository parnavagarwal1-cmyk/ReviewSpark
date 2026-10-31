'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import type { Business } from '@/types';
import BusinessDetailsForm, { BusinessFormState, DEFAULT_RATING_TAGS } from '@/components/BusinessDetailsForm';

interface BusinessDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function BusinessDetailPage({ params }: BusinessDetailPageProps) {
  const { id } = use(params);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [qrDataUri, setQrDataUri] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    async function loadQrPreview(token: string) {
      try {
        const QRCode = await import('qrcode');
        const reviewUrl = `${baseUrl}/r/${token}`;
        const dataUri = await QRCode.toDataURL(reviewUrl, {
          width: 200,
          margin: 2,
          errorCorrectionLevel: 'M',
          color: { dark: '#1a1a2e', light: '#ffffff' },
        });
        setQrDataUri(dataUri);
      } catch {
        // QR preview is non-critical
      }
    }

    async function load() {
      try {
        const res = await fetch(`/api/businesses/${id}`);
        if (!res.ok) throw new Error('Business not found');
        const data: Business = await res.json();
        setBusiness(data);
        await loadQrPreview(data.public_token);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, baseUrl]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/businesses/${id}/refresh`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? 'Refresh failed');
        return;
      }
      setBusiness(data);
    } catch {
      alert('Refresh failed');
    } finally {
      setRefreshing(false);
    }
  }

  async function handleSave(formData: BusinessFormState) {
    if (!business) return;
    setSaving(true);
    setSaveError('');
    try {
      const res = await fetch(`/api/businesses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: formData.business_name.trim(),
          category: formData.category.trim() || null,
          google_review_url: formData.google_review_url.trim(),
          street: formData.street.trim() || null,
          nearby: formData.nearby.trim() || null,
          city: formData.city.trim() || null,
          phone: formData.phone.trim() || null,
          email: formData.email.trim() || null,
          service_keywords: formData.service_keywords.trim() || null,
          primary_language: formData.primary_language.trim() || 'English',
          secondary_language: formData.secondary_language.trim() || 'Hinglish',
          aspects: formData.aspects,
          rating_tags: formData.rating_tags,
          show_aspects: formData.show_aspects,
          show_tags: formData.show_tags,
          custom_context: formData.custom_context.trim() || null,
        }),
      });

      const updated = await res.json();
      if (!res.ok) {
        throw new Error(updated.error || 'Save failed');
      }

      setBusiness(updated);
      setEditMode(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <div className="spinner spinner-dark" style={{ margin: '0 auto 1rem' }} />
        Loading business details…
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="alert alert-error">
        {error || 'Business not found'}
        <Link href="/businesses" style={{ marginLeft: '1rem', textDecoration: 'underline' }}>
          Back to list
        </Link>
      </div>
    );
  }

  const reviewPageUrl = `${baseUrl}/r/${business.public_token}`;

  return (
    <>
      <div style={{ marginBottom: 'var(--space-md)' }}>
        <Link
          href="/businesses"
          style={{ color: 'var(--admin-text-muted)', fontSize: '0.875rem' }}
        >
          ← Back to Businesses
        </Link>
      </div>

      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <h1 className="page-title">{business.business_name}</h1>
            <span
              className={`badge ${business.is_active ? 'badge-success' : 'badge-danger'}`}
            >
              {business.is_active ? 'Active' : 'Inactive'}
            </span>
            <span
              className={`badge ${business.data_source === 'google_places' ? 'badge-info' : 'badge-warning'}`}
            >
              {business.data_source === 'google_places' ? '🔍 Google Places' : '✏️ Manual'}
            </span>
          </div>
          <p className="page-subtitle" style={{ marginTop: '0.25rem' }}>
            Added {new Date(business.created_at).toLocaleDateString()}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          {business.data_source === 'google_places' && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleRefresh}
              disabled={refreshing}
              id="refresh-google-data-btn"
              title="Refresh name, address, category from Google Places"
            >
              {refreshing ? (
                <>
                  <span className="spinner" /> Refreshing…
                </>
              ) : (
                '🔄 Refresh Google Data'
              )}
            </button>
          )}
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setEditMode(!editMode)}
            id="edit-business-btn"
          >
            {editMode ? 'Cancel Edit' : '✏️ Edit All Details'}
          </button>
        </div>
      </div>

      {editMode ? (
        <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 'var(--space-md)' }}>
            Edit Business Details, SEO &amp; Review Funnel
          </h2>
          <BusinessDetailsForm
            initialValues={{
              google_review_url: business.google_review_url,
              business_name: business.business_name,
              category: business.category || '',
              street: business.street || '',
              nearby: business.nearby || '',
              city: business.city || '',
              phone: business.phone || '',
              email: business.email || '',
              service_keywords: business.service_keywords || '',
              primary_language: business.primary_language || 'English',
              secondary_language: business.secondary_language || 'Hinglish',
              aspects: business.aspects || ['Food quality', 'Staff behavior', 'Cleanliness'],
              rating_tags: business.rating_tags || DEFAULT_RATING_TAGS,
              show_aspects: business.show_aspects !== false,
              show_tags: business.show_tags !== false,
              custom_context: business.custom_context || '',
            }}
            onSubmit={handleSave}
            loading={saving}
            error={saveError}
            submitButtonText="Save All Changes"
            isEdit={true}
          />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-lg)' }}>
          {/* Business Info */}
          <div className="card">
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-md)' }}>
              Business &amp; Contact Details
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <InfoRow label="Name" value={business.business_name} />
              <InfoRow label="Category" value={business.category || '—'} />
              <InfoRow label="City" value={business.city || '—'} />
              <InfoRow label="Nearby / Landmark" value={business.nearby || '—'} />
              <InfoRow label="Street" value={business.street || '—'} />
              <InfoRow label="Full Address" value={business.address || '—'} />
              <InfoRow label="Phone No." value={business.phone || '—'} />
              <InfoRow label="Email ID" value={business.email || '—'} />
              <InfoRow label="Token" value={business.public_token} mono />
              <InfoRow label="Data Source" value={business.data_source} />
            </div>
          </div>

          {/* SEO & Languages */}
          <div className="card">
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-md)' }}>
              SEO Keywords &amp; Funnel Settings
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <InfoRow
                label="Service SEO Keywords"
                value={business.service_keywords || 'None set (click Edit to add)'}
              />
              <InfoRow
                label="Output Languages"
                value={`Draft 1: ${business.primary_language || 'English'} | Draft 2: ${business.secondary_language || 'Hinglish'}`}
              />
              <InfoRow
                label="Show Aspects in Funnel"
                value={business.show_aspects !== false ? '✅ Enabled' : '❌ Disabled'}
              />
              <InfoRow
                label="Show Tags in Funnel"
                value={business.show_tags !== false ? '✅ Enabled' : '❌ Disabled'}
              />

              {/* Aspects Chips Preview */}
              <div style={{ borderTop: '1px solid var(--admin-border)', paddingTop: '0.5rem' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)', marginBottom: '4px' }}>
                  Aspects ({business.aspects?.length || 0}/3):
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {(business.aspects || []).map((a, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: '0.75rem',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        background: 'rgba(99, 102, 241, 0.15)',
                        color: 'var(--admin-text)',
                      }}
                    >
                      {a}
                    </span>
                  ))}
                  {(!business.aspects || business.aspects.length === 0) && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>None set</span>
                  )}
                </div>
              </div>

              {/* 5-Star Tags Preview */}
              <div style={{ borderTop: '1px solid var(--admin-border)', paddingTop: '0.5rem' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)', marginBottom: '4px' }}>
                  5★ Tags ({business.rating_tags?.['5']?.length || 0}/3):
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {(business.rating_tags?.['5'] || []).map((t, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: '0.75rem',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        background: 'rgba(245, 158, 11, 0.15)',
                        color: 'var(--admin-text)',
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {business.custom_context && (
                <InfoRow label="Extra Notes" value={business.custom_context} />
              )}
            </div>
          </div>

          {/* QR Code & Review Destination */}
          <div className="card">
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-md)' }}>
              QR Code &amp; Review Links
            </h2>

            <div className="qr-preview-container">
              {qrDataUri ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDataUri}
                  alt={`QR code for ${business.business_name}`}
                  className="qr-preview-image"
                  width={160}
                  height={160}
                />
              ) : (
                <div className="qr-preview-image skeleton" style={{ width: 160, height: 160 }} />
              )}

              <div style={{ textAlign: 'center', width: '100%' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', marginBottom: '0.5rem', wordBreak: 'break-all' }}>
                  {reviewPageUrl}
                </p>

                <div className="qr-download-buttons">
                  <a
                    href={`/api/businesses/${id}/qr?size=1024`}
                    download
                    className="btn btn-secondary btn-sm"
                  >
                    ⬇ PNG
                  </a>
                  <a
                    href={`/api/qr/pdf?businessId=${id}`}
                    download
                    className="btn btn-primary btn-sm"
                  >
                    ⬇ A4 PDF Standee
                  </a>
                </div>
              </div>

              <a
                href={`/r/${business.public_token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost btn-sm"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                ↗ Test Public Customer Review Page
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '0.4rem 0',
        borderBottom: '1px solid var(--admin-border)',
        fontSize: '0.875rem',
        gap: '1rem',
      }}
    >
      <span style={{ color: 'var(--admin-text-muted)', flexShrink: 0 }}>{label}</span>
      <span
        style={{
          color: 'var(--admin-text)',
          fontFamily: mono ? 'monospace' : 'inherit',
          fontSize: mono ? '0.8rem' : 'inherit',
          textAlign: 'right',
          wordBreak: 'break-all',
        }}
      >
        {value}
      </span>
    </div>
  );
}
