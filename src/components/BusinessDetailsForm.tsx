'use client';

import React, { useState } from 'react';
import type { CreateBusinessInput } from '@/types';

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
    aspects: initialValues?.aspects || ['Food quality', 'Staff behavior', 'Cleanliness'],
    rating_tags: initialValues?.rating_tags || DEFAULT_RATING_TAGS,
    show_aspects: initialValues?.show_aspects !== false,
    show_tags: initialValues?.show_tags !== false,
    custom_context: initialValues?.custom_context || '',
  });

  // Aspects input state
  const [aspectInput, setAspectInput] = useState('');
  // Tags tab state (1 to 5)
  const [activeStarTab, setActiveStarTab] = useState<string>('5');
  const [tagInput, setTagInput] = useState('');

  // Handle adding an aspect (max 3)
  function handleAddAspect() {
    const val = aspectInput.trim();
    if (!val) return;
    if (form.aspects.length >= 3) {
      alert('You can add up to 3 aspects maximum.');
      return;
    }
    if (form.aspects.includes(val)) return;
    setForm((prev) => ({ ...prev, aspects: [...prev.aspects, val] }));
    setAspectInput('');
  }

  function handleRemoveAspect(indexToRemove: number) {
    setForm((prev) => ({
      ...prev,
      aspects: prev.aspects.filter((_, i) => i !== indexToRemove),
    }));
  }

  // Handle adding tags for active rating tab (max 3)
  function handleAddTag() {
    const val = tagInput.trim();
    if (!val) return;
    const currentTags = form.rating_tags[activeStarTab] || [];
    if (currentTags.length >= 3) {
      alert(`You can add up to 3 tags maximum for ${activeStarTab}★.`);
      return;
    }
    if (currentTags.includes(val)) return;
    setForm((prev) => ({
      ...prev,
      rating_tags: {
        ...prev.rating_tags,
        [activeStarTab]: [...currentTags, val],
      },
    }));
    setTagInput('');
  }

  function handleRemoveTag(star: string, tagToRemove: string) {
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
    await onSubmit(form);
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
            autoFocus={!isEdit}
          />
          <span className="form-hint">Paste your client&apos;s Google Maps or Google Review link.</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-sm)' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="business_name">
              Business Name *
            </label>
            <input
              id="business_name"
              type="text"
              className="form-input"
              placeholder="e.g. Sharma Dental Clinic"
              value={form.business_name}
              onChange={(e) => setForm({ ...form, business_name: e.target.value })}
              required
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="category">
              Category
            </label>
            <input
              id="category"
              type="text"
              className="form-input"
              placeholder="e.g. Dental Clinic, Restaurant, Salon"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* ── Section 2: Location & Contact Details ── */}
      <div style={{ borderBottom: '1px solid var(--admin-border)', paddingBottom: 'var(--space-md)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--brand-primary-light)', marginBottom: 'var(--space-sm)' }}>
          📍 Location &amp; Contact Details
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="street">
              Street / Address
            </label>
            <input
              id="street"
              type="text"
              className="form-input"
              placeholder="e.g. Shop 4, Main Market, RDC"
              value={form.street}
              onChange={(e) => setForm({ ...form, street: e.target.value })}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="nearby">
              Nearby / Landmark
            </label>
            <input
              id="nearby"
              type="text"
              className="form-input"
              placeholder="e.g. Near Metro Pillar 42"
              value={form.nearby}
              onChange={(e) => setForm({ ...form, nearby: e.target.value })}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="city">
              City
            </label>
            <input
              id="city"
              type="text"
              className="form-input"
              placeholder="e.g. Ghaziabad"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-sm)' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="phone">
              Phone No. (Optional)
            </label>
            <input
              id="phone"
              type="tel"
              className="form-input"
              placeholder="e.g. +91 98765 43210"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="email">
              Email ID (Optional)
            </label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="e.g. contact@sharmadental.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* ── Section 3: SEO Keywords & Output Language ── */}
      <div style={{ borderBottom: '1px solid var(--admin-border)', paddingBottom: 'var(--space-md)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--brand-primary-light)', marginBottom: 'var(--space-sm)' }}>
          🎯 SEO Keywords &amp; AI Languages
        </h3>

        <div className="form-group">
          <label className="form-label" htmlFor="service_keywords">
            Service SEO Keywords
          </label>
          <input
            id="service_keywords"
            type="text"
            className="form-input"
            placeholder="e.g. Dental Implants, Root Canal, Teeth Whitening, Invisible Braces"
            value={form.service_keywords}
            onChange={(e) => setForm({ ...form, service_keywords: e.target.value })}
          />
          <span className="form-hint">
            Keywords that AI will seamlessly weave into review drafts to boost your Google Maps SEO.
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-sm)' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="primary_language">
              Primary Language (Draft 1)
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
              Secondary Language (Draft 2)
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

      {/* ── Section 4: Aspects (Max 3) ── */}
      <div style={{ borderBottom: '1px solid var(--admin-border)', paddingBottom: 'var(--space-md)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xs)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--brand-primary-light)' }}>
            ⭐ Aspects (e.g. Food quality, Staff behavior)
          </h3>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: form.aspects.length === 3 ? 'var(--brand-warning)' : 'var(--admin-text-muted)' }}>
            {form.aspects.length}/3
          </span>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)', marginBottom: 'var(--space-sm)' }}>
          Customers can pick which aspects they loved to guide the AI generation.
        </p>

        {/* Existing Aspects Chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)', marginBottom: 'var(--space-sm)' }}>
          {form.aspects.map((aspect, idx) => (
            <span
              key={idx}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(99, 102, 241, 0.15)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                color: 'var(--admin-text)',
                fontSize: '0.85rem',
              }}
            >
              <span>{aspect}</span>
              <button
                type="button"
                onClick={() => handleRemoveAspect(idx)}
                style={{ cursor: 'pointer', color: '#f87171', fontWeight: 700, fontSize: '0.9rem' }}
                title="Remove aspect"
              >
                ✕
              </button>
            </span>
          ))}
          {form.aspects.length === 0 && (
            <span style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>No aspects added yet. Add up to 3 below.</span>
          )}
        </div>

        {form.aspects.length < 3 && (
          <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Food quality, Ambience, Cleanliness"
              value={aspectInput}
              onChange={(e) => setAspectInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddAspect();
                }
              }}
              style={{ fontSize: '0.875rem' }}
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
        )}
      </div>

      {/* ── Section 5: Rating Tags (1★ to 5★, Max 3 per rating) ── */}
      <div style={{ borderBottom: '1px solid var(--admin-border)', paddingBottom: 'var(--space-md)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xs)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--brand-primary-light)' }}>
            🏷️ Default Tags (by Star Rating)
          </h3>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: currentStarTags.length === 3 ? 'var(--brand-warning)' : 'var(--admin-text-muted)' }}>
            {currentStarTags.length}/3
          </span>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)', marginBottom: 'var(--space-sm)' }}>
          Quick-select chips shown to customers based on the star rating they choose.
        </p>

        {/* Star Tabs */}
        <div style={{ display: 'flex', gap: 'var(--space-xs)', marginBottom: 'var(--space-sm)' }}>
          {['5', '4', '3', '2', '1'].map((star) => (
            <button
              key={star}
              type="button"
              className={`btn btn-sm ${activeStarTab === star ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveStarTab(star)}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
            >
              {star}★
            </button>
          ))}
        </div>

        {/* Tags for active star */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)', marginBottom: 'var(--space-sm)' }}>
          {currentStarTags.map((tag, idx) => (
            <span
              key={idx}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                color: 'var(--admin-text)',
                fontSize: '0.85rem',
              }}
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => handleRemoveTag(activeStarTab, tag)}
                style={{ cursor: 'pointer', color: '#f87171', fontWeight: 700, fontSize: '0.9rem' }}
                title="Remove tag"
              >
                ✕
              </button>
            </span>
          ))}
          {currentStarTags.length === 0 && (
            <span style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>
              No tags for {activeStarTab}★ yet. Add up to 3 tags below.
            </span>
          )}
        </div>

        {currentStarTags.length < 3 && (
          <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
            <input
              type="text"
              className="form-input"
              placeholder={`e.g. ${activeStarTab === '5' ? 'friendly staff' : 'long wait time'}`}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              style={{ fontSize: '0.875rem' }}
            />
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleAddTag}
              disabled={!tagInput.trim()}
            >
              + Add {activeStarTab}★ Tag
            </button>
          </div>
        )}
      </div>

      {/* ── Section 6: Show in Review Funnel Toggles ── */}
      <div style={{ borderBottom: '1px solid var(--admin-border)', paddingBottom: 'var(--space-md)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--brand-primary-light)', marginBottom: 'var(--space-sm)' }}>
          🎛️ Show in Review Funnel
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer', fontSize: '0.9rem' }}>
            <input
              type="checkbox"
              checked={form.show_aspects}
              onChange={(e) => setForm({ ...form, show_aspects: e.target.checked })}
              style={{ width: '18px', height: '18px', accentColor: 'var(--brand-primary)' }}
            />
            <span>Show aspects (allow customer to tap aspects like Food quality, Staff)</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer', fontSize: '0.9rem' }}>
            <input
              type="checkbox"
              checked={form.show_tags}
              onChange={(e) => setForm({ ...form, show_tags: e.target.checked })}
              style={{ width: '18px', height: '18px', accentColor: 'var(--brand-primary)' }}
            />
            <span>Show tags (allow customer to tap quick tags like &quot;friendly staff&quot;)</span>
          </label>
        </div>
      </div>

      {/* ── Section 7: Custom Context & Highlights ── */}
      <div>
        <label className="form-label" htmlFor="custom_context">
          ✨ Extra Highlights &amp; Specialties (Optional)
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
