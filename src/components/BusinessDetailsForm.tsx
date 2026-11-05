'use client';

import React, { useState } from 'react';
import { DEFAULT_ASPECTS, DEFAULT_HIGHLIGHT_TAGS, parseAspectItem } from '@/lib/aspects';

export interface BusinessFormState {
  google_review_url: string;
  business_name: string;
  category: string;
  street: string;
  nearby: string;
  city: string;
  phone: string;
  email: string;
  service_keywords: string;
  primary_language: string;
  secondary_language: string;
  aspects: string[];
  highlight_tags: string[];
  rating_tags: Record<string, string[]>;
  show_aspects: boolean;
  show_tags: boolean;
  custom_context: string;
}

export const DEFAULT_RATING_TAGS: Record<string, string[]> = {
  '5': ['Friendly staff', 'Quick service', 'Super clean'],
  '4': ['Good experience', 'Polite staff', 'Affordable'],
  '3': ['Average service', 'Decent ambience', 'Scope for improvement'],
  '2': ['Long wait time', 'Slow service', 'Needs improvement'],
  '1': ['Disappointing', 'Unresponsive staff', 'Bad experience'],
};

interface BusinessDetailsFormProps {
  initialValues?: Partial<BusinessFormState>;
  onSubmit: (data: BusinessFormState) => Promise<void>;
  loading: boolean;
  error?: string;
  submitButtonText?: string;
  isEdit?: boolean;
}

export default function BusinessDetailsForm({
  initialValues,
  onSubmit,
  loading,
  error,
  submitButtonText = 'Save Business',
  isEdit = false,
}: BusinessDetailsFormProps) {
  // Extract highlight_tags from initialValues or rating_tags.highlight_tags
  const initialHighlightTags =
    initialValues?.highlight_tags && initialValues.highlight_tags.length > 0
      ? initialValues.highlight_tags
      : Array.isArray((initialValues?.rating_tags as Record<string, unknown> | undefined)?.highlight_tags)
      ? ((initialValues?.rating_tags as Record<string, unknown>).highlight_tags as string[])
      : DEFAULT_HIGHLIGHT_TAGS;

  const initialAspects =
    initialValues?.aspects && initialValues.aspects.length > 0
      ? initialValues.aspects
      : DEFAULT_ASPECTS;

  const [form, setForm] = useState<BusinessFormState>({
    google_review_url: initialValues?.google_review_url || '',
    business_name: initialValues?.business_name || '',
    category: initialValues?.category || '',
    street: initialValues?.street || '',
    nearby: initialValues?.nearby || '',
    city: initialValues?.city || '',
    phone: initialValues?.phone || '',
    email: initialValues?.email || '',
    service_keywords: initialValues?.service_keywords || '',
    primary_language: initialValues?.primary_language || 'English',
    secondary_language: initialValues?.secondary_language || 'Hinglish',
    aspects: initialAspects,
    highlight_tags: initialHighlightTags,
    rating_tags: initialValues?.rating_tags || DEFAULT_RATING_TAGS,
    show_aspects: initialValues?.show_aspects !== false,
    show_tags: initialValues?.show_tags !== false,
    custom_context: initialValues?.custom_context || '',
  });

  // Aspects input state
  const [aspectInput, setAspectInput] = useState('');
  const [aspectIcon, setAspectIcon] = useState('✨');

  // Highlight tags input state
  const [tagInput, setTagInput] = useState('');

  // Optional Per-Star rating tags accordion
  const [showStarTags, setShowStarTags] = useState(false);
  const [activeStarTab, setActiveStarTab] = useState<string>('5');
  const [starTagInput, setStarTagInput] = useState('');

  // ── Aspect Handlers (Add / Subtract) ──
  function handleAddAspect() {
    const val = aspectInput.trim();
    if (!val) return;

    // Check if aspect already includes an icon, otherwise prepend selected or auto icon
    const parsed = parseAspectItem(val);
    const itemWithIcon = val.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic}|[^\w\s])/u)
      ? val
      : `${aspectIcon !== '✨' ? aspectIcon : parsed.icon} ${val}`;

    if (form.aspects.some((a) => a.toLowerCase().replace(/[^a-z0-9]/g, '') === val.toLowerCase().replace(/[^a-z0-9]/g, ''))) {
      alert('This aspect is already added.');
      return;
    }

    setForm((prev) => ({ ...prev, aspects: [...prev.aspects, itemWithIcon] }));
    setAspectInput('');
    setAspectIcon('✨');
  }

  function handleRemoveAspect(indexToRemove: number) {
    setForm((prev) => ({
      ...prev,
      aspects: prev.aspects.filter((_, i) => i !== indexToRemove),
    }));
  }

  function handleRestoreDefaultAspects() {
    setForm((prev) => ({ ...prev, aspects: DEFAULT_ASPECTS }));
  }

  // ── Highlight Tags Handlers (Add / Subtract) ──
  function handleAddHighlightTag() {
    const val = tagInput.trim();
    if (!val) return;

    if (form.highlight_tags.some((t) => t.toLowerCase() === val.toLowerCase())) {
      alert('This tag is already added.');
      return;
    }

    setForm((prev) => ({ ...prev, highlight_tags: [...prev.highlight_tags, val] }));
    setTagInput('');
  }

  function handleRemoveHighlightTag(indexToRemove: number) {
    setForm((prev) => ({
      ...prev,
      highlight_tags: prev.highlight_tags.filter((_, i) => i !== indexToRemove),
    }));
  }

  function handleRestoreDefaultTags() {
    setForm((prev) => ({ ...prev, highlight_tags: DEFAULT_HIGHLIGHT_TAGS }));
  }

  // ── Per-Star Rating Tag Handlers ──
  function handleAddStarTag() {
    const val = starTagInput.trim();
    if (!val) return;
    const currentTags = form.rating_tags[activeStarTab] || [];
    if (currentTags.includes(val)) return;

    setForm((prev) => ({
      ...prev,
      rating_tags: {
        ...prev.rating_tags,
        [activeStarTab]: [...currentTags, val],
      },
    }));
    setStarTagInput('');
  }

  function handleRemoveStarTag(star: string, tagToRemove: string) {
    setForm((prev) => ({
      ...prev,
      rating_tags: {
        ...prev.rating_tags,
        [star]: (prev.rating_tags[star] || []).filter((t) => t !== tagToRemove),
      },
    }));
  }

  const currentStarTags = form.rating_tags[activeStarTab] || [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Merge highlight_tags into rating_tags for backward compatibility with database
    const mergedRatingTags = {
      ...form.rating_tags,
      highlight_tags: form.highlight_tags,
    };
    await onSubmit({
      ...form,
      rating_tags: mergedRatingTags,
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      {/* ── Section 1: Basic Info ── */}
      <div style={{ borderBottom: '1px solid var(--admin-border)', paddingBottom: 'var(--space-md)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--brand-primary-light)', marginBottom: 'var(--space-sm)' }}>
          🏢 Business Information
        </h3>

        <div className="form-group">
          <label className="form-label" htmlFor="google_review_url">
            Google Review URL *
          </label>
          <input
            id="google_review_url"
            type="url"
            className="form-input"
            placeholder="https://maps.google.com/maps/place/... or search.google.com/local/writereview?placeid=..."
            value={form.google_review_url}
            onChange={(e) => setForm({ ...form, google_review_url: e.target.value })}
            required
            disabled={isEdit}
          />
          <span className="form-hint">
            The Google review link where customers will be redirected to leave their review.
          </span>
        </div>

        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-sm)' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="business_name">
              Business Name *
            </label>
            <input
              id="business_name"
              type="text"
              className="form-input"
              placeholder="e.g. Cafe Dehradun"
              value={form.business_name}
              onChange={(e) => setForm({ ...form, business_name: e.target.value })}
              required
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="category">
              Business Category
            </label>
            <input
              id="category"
              type="text"
              className="form-input"
              placeholder="e.g. Restaurant, Dental Clinic, Salon"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* ── Section 2: Address & Location Details (For Local SEO) ── */}
      <div style={{ borderBottom: '1px solid var(--admin-border)', paddingBottom: 'var(--space-md)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--brand-primary-light)', marginBottom: 'var(--space-sm)' }}>
          📍 Location Details (Local SEO)
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-sm)' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="city">
              City
            </label>
            <input
              id="city"
              type="text"
              className="form-input"
              placeholder="e.g. Dehradun"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="nearby">
              Nearby Landmark / Area
            </label>
            <input
              id="nearby"
              type="text"
              className="form-input"
              placeholder="e.g. Near Clock Tower"
              value={form.nearby}
              onChange={(e) => setForm({ ...form, nearby: e.target.value })}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="street">
              Street / Road
            </label>
            <input
              id="street"
              type="text"
              className="form-input"
              placeholder="e.g. Rajpur Road"
              value={form.street}
              onChange={(e) => setForm({ ...form, street: e.target.value })}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="phone">
              Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              className="form-input"
              placeholder="+91 98765 43210"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="contact@business.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* ── Section 3: SEO Keywords & Languages ── */}
      <div style={{ borderBottom: '1px solid var(--admin-border)', paddingBottom: 'var(--space-md)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--brand-primary-light)', marginBottom: 'var(--space-sm)' }}>
          🔍 SEO Keywords &amp; Languages
        </h3>

        <div className="form-group">
          <label className="form-label" htmlFor="service_keywords">
            Target Keywords (comma-separated)
          </label>
          <input
            id="service_keywords"
            type="text"
            className="form-input"
            placeholder="best cafe, artisanal coffee, pizza, friendly staff"
            value={form.service_keywords}
            onChange={(e) => setForm({ ...form, service_keywords: e.target.value })}
          />
          <span className="form-hint">
            AI naturally weaves these terms into drafts to rank your Google Business profile higher.
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-sm)' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="primary_language">
              Primary Language
            </label>
            <input
              id="primary_language"
              type="text"
              className="form-input"
              value={form.primary_language}
              onChange={(e) => setForm({ ...form, primary_language: e.target.value })}
              placeholder="English"
            />
            <span className="form-hint">Default: English</span>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="secondary_language">
              Secondary Language
            </label>
            <input
              id="secondary_language"
              type="text"
              className="form-input"
              value={form.secondary_language}
              onChange={(e) => setForm({ ...form, secondary_language: e.target.value })}
              placeholder="Hinglish"
            />
            <span className="form-hint">Default: Hinglish (Hindi + English blend)</span>
          </div>
        </div>
      </div>

      {/* ── Section 4: ⭐ Aspects ("TELL US MORE" Multi-Aspect Ratings) ── */}
      <div style={{ borderBottom: '1px solid var(--admin-border)', paddingBottom: 'var(--space-md)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xs)', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--brand-primary-light)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              ⭐ &quot;TELL US MORE&quot; Aspects ({form.aspects.length})
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)', margin: '0.2rem 0 0' }}>
              Multi-aspect 5-star categories shown to customers (e.g. Food, Service, Ambience). Add or subtract any below.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleRestoreDefaultAspects}
            style={{ fontSize: '0.78rem', padding: '0.25rem 0.6rem' }}
            title="Restore the standard 5 aspects"
          >
            ↺ Restore Defaults
          </button>
        </div>

        {/* Existing Aspect Badges with Subtract (✕) button */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', margin: '0.75rem 0' }}>
          {form.aspects.map((aspect, idx) => {
            const parsed = parseAspectItem(aspect, idx);
            return (
              <span
                key={idx}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 12px',
                  borderRadius: '9999px',
                  background: 'rgba(108, 92, 231, 0.16)',
                  border: '1px solid rgba(108, 92, 231, 0.35)',
                  color: '#ffffff',
                  fontSize: '0.88rem',
                  fontWeight: 500,
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{parsed.icon} {parsed.label}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveAspect(idx)}
                  style={{
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#fca5a5',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    lineHeight: 1,
                    padding: 0,
                  }}
                  title={`Remove ${parsed.label}`}
                  aria-label={`Remove ${parsed.label}`}
                >
                  ✕
                </button>
              </span>
            );
          })}
          {form.aspects.length === 0 && (
            <span style={{ fontSize: '0.82rem', color: '#f87171' }}>
              No aspects added. Add custom aspects below or click Restore Defaults.
            </span>
          )}
        </div>

        {/* Add Aspect Input Row */}
        <div style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            className="form-input"
            value={aspectIcon}
            onChange={(e) => setAspectIcon(e.target.value)}
            style={{ width: '60px', padding: '0.45rem', fontSize: '1rem', textAlign: 'center' }}
            title="Choose aspect icon"
          >
            <option value="🍲">🍲 Food</option>
            <option value="🤝">🤝 Service</option>
            <option value="✨">✨ Ambience</option>
            <option value="✦">✦ Value</option>
            <option value="🧹">🧹 Cleanliness</option>
            <option value="👥">👥 Staff</option>
            <option value="⚡">⚡ Speed</option>
            <option value="🚗">🚗 Parking</option>
            <option value="🍹">🍹 Drinks</option>
            <option value="🎵">🎵 Music</option>
            <option value="🏋️">🏋️ Fitness</option>
            <option value="🌟">🌟 General</option>
          </select>

          <input
            type="text"
            className="form-input"
            placeholder="e.g. Hair Styling, Equipment, Doctor Consultation..."
            value={aspectInput}
            onChange={(e) => setAspectInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddAspect();
              }
            }}
            style={{ fontSize: '0.875rem', flex: '1', minWidth: '180px' }}
          />

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleAddAspect}
            disabled={!aspectInput.trim()}
          >
            + Add Aspect
          </button>
        </div>
      </div>

      {/* ── Section 5: 🏷️ "WHAT STOOD OUT?" Tags (Highlight Pills) ── */}
      <div style={{ borderBottom: '1px solid var(--admin-border)', paddingBottom: 'var(--space-md)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xs)', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--brand-primary-light)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              🏷️ &quot;WHAT STOOD OUT?&quot; Highlight Tags ({form.highlight_tags.length})
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)', margin: '0.2rem 0 0' }}>
              Clickable pill badges shown to customers to highlight their favorite features. Add or subtract any below.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleRestoreDefaultTags}
            style={{ fontSize: '0.78rem', padding: '0.25rem 0.6rem' }}
            title="Restore the standard 6 highlight tags"
          >
            ↺ Restore Defaults
          </button>
        </div>

        {/* Existing Highlight Tag Badges with Subtract (✕) button */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', margin: '0.75rem 0' }}>
          {form.highlight_tags.map((tag, idx) => (
            <span
              key={idx}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '5px 12px',
                borderRadius: '9999px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.16)',
                color: '#e2e8f0',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => handleRemoveHighlightTag(idx)}
                style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#fca5a5',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  lineHeight: 1,
                  padding: 0,
                }}
                title={`Remove ${tag}`}
                aria-label={`Remove ${tag}`}
              >
                ✕
              </button>
            </span>
          ))}
          {form.highlight_tags.length === 0 && (
            <span style={{ fontSize: '0.82rem', color: '#f87171' }}>
              No highlight tags added. Add custom tags below or click Restore Defaults.
            </span>
          )}
        </div>

        {/* Add Highlight Tag Input Row */}
        <div style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center' }}>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Outstanding Taste, Friendly Staff, Scenic View..."
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddHighlightTag();
              }
            }}
            style={{ fontSize: '0.875rem', flex: '1' }}
          />

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleAddHighlightTag}
            disabled={!tagInput.trim()}
          >
            + Add Tag
          </button>
        </div>
      </div>

      {/* ── Section 6: Show in Review Funnel Toggles ── */}
      <div style={{ borderBottom: '1px solid var(--admin-border)', paddingBottom: 'var(--space-md)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--brand-primary-light)', marginBottom: 'var(--space-sm)' }}>
          🎛️ Show in Customer Review Funnel
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer', fontSize: '0.9rem' }}>
            <input
              type="checkbox"
              checked={form.show_aspects}
              onChange={(e) => setForm({ ...form, show_aspects: e.target.checked })}
              style={{ width: '18px', height: '18px', accentColor: 'var(--brand-primary)' }}
            />
            <span>Show &quot;TELL US MORE&quot; multi-aspect 5-star ratings on the customer review page</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer', fontSize: '0.9rem' }}>
            <input
              type="checkbox"
              checked={form.show_tags}
              onChange={(e) => setForm({ ...form, show_tags: e.target.checked })}
              style={{ width: '18px', height: '18px', accentColor: 'var(--brand-primary)' }}
            />
            <span>Show &quot;WHAT STOOD OUT?&quot; highlight tags on the customer review page</span>
          </label>
        </div>
      </div>

      {/* ── Optional Advanced: Per-Star Rating Tags Accordion ── */}
      <div style={{ borderBottom: '1px solid var(--admin-border)', paddingBottom: 'var(--space-sm)' }}>
        <button
          type="button"
          onClick={() => setShowStarTags(!showStarTags)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--admin-text-muted)',
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: 0,
          }}
        >
          <span>{showStarTags ? '▼' : '▶'}</span>
          <span>Advanced: Star-Specific Rating Tags (1★ to 5★)</span>
        </button>

        {showStarTags && (
          <div style={{ marginTop: 'var(--space-sm)', padding: 'var(--space-sm)', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px' }}>
            <div style={{ display: 'flex', gap: 'var(--space-xs)', marginBottom: 'var(--space-sm)' }}>
              {['5', '4', '3', '2', '1'].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`btn btn-sm ${activeStarTab === star ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setActiveStarTab(star)}
                  style={{ padding: '0.3rem 0.65rem', fontSize: '0.8rem' }}
                >
                  {star}★
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)', marginBottom: 'var(--space-sm)' }}>
              {currentStarTags.map((tag, idx) => (
                <span
                  key={idx}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-full)',
                    background: 'rgba(245, 158, 11, 0.15)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    color: 'var(--admin-text)',
                    fontSize: '0.8rem',
                  }}
                >
                  <span>{tag}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveStarTag(activeStarTab, tag)}
                    style={{ cursor: 'pointer', color: '#f87171', fontWeight: 700, fontSize: '0.8rem' }}
                    title="Remove tag"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
              <input
                type="text"
                className="form-input"
                placeholder={`e.g. ${activeStarTab === '5' ? 'friendly staff' : 'long wait time'}`}
                value={starTagInput}
                onChange={(e) => setStarTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddStarTag();
                  }
                }}
                style={{ fontSize: '0.85rem' }}
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleAddStarTag}
                disabled={!starTagInput.trim()}
              >
                + Add {activeStarTab}★ Tag
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Section 7: Custom Context & Highlights ── */}
      <div>
        <label className="form-label" htmlFor="custom_context">
          ✨ Extra Business Notes &amp; Specialties (Optional)
        </label>
        <textarea
          id="custom_context"
          className="form-input"
          rows={2}
          placeholder="e.g. Valet parking available, open on Sundays, 20+ years of trust"
          value={form.custom_context}
          onChange={(e) => setForm({ ...form, custom_context: e.target.value })}
        />
        <span className="form-hint">
          Additional business notes that the AI will use to write authentic reviews.
        </span>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <button
        type="submit"
        className="btn btn-primary"
        disabled={loading || !form.google_review_url || !form.business_name.trim()}
        id="business-form-submit-btn"
        style={{ width: '100%', marginTop: 'var(--space-sm)', padding: '0.75rem' }}
      >
        {loading ? (
          <>
            <span className="spinner" />
            Saving Business Details…
          </>
        ) : (
          submitButtonText
        )}
      </button>
    </form>
  );
}
