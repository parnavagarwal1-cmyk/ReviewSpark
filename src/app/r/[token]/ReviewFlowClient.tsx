'use client';

import { useState, useEffect, useRef } from 'react';

interface BusinessContext {
  business_name: string;
  address: string | null;
  category: string | null;
  google_review_destination: string;
  public_token: string;
  aspects?: string[];
  rating_tags?: Record<string, string[]>;
  show_aspects?: boolean;
  show_tags?: boolean;
  _bid: string;
}

const STAR_LABELS: Record<number, string> = {
  1: 'Terrible',
  2: 'Poor',
  3: 'Average',
  4: 'Good',
  5: 'Excellent',
};

const STAR_EMOJIS: Record<number, string> = {
  1: '😞 Terrible',
  2: '😕 Poor',
  3: '😐 Average',
  4: '😊 Good',
  5: '🤩 Excellent',
};

const LOADING_PHRASES = [
  'Reading your experience…',
  'Choosing the right words…',
  'Polishing your review…',
];

const DEFAULT_ASPECT_ITEMS = [
  { key: 'food', label: 'Food', icon: '🍲' },
  { key: 'service', label: 'Service', icon: '🤝' },
  { key: 'ambience', label: 'Ambience', icon: '✨' },
  { key: 'value', label: 'Value for money', icon: '✦' },
  { key: 'cleanliness', label: 'Cleanliness', icon: '🧹' },
];

const DEFAULT_HIGHLIGHT_TAGS = [
  'Outstanding Taste',
  'Fresh & Flavorful',
  'Memorable Experience',
  'Friendly Staff',
  'Great Value',
  'Hygienic & Clean',
];

type Step = 'loading' | 'error' | 'select-rating' | 'generating' | 'select-draft' | 'continue';

export default function ReviewFlowClient({ token }: { token: string }) {
  const [context, setContext] = useState<BusinessContext | null>(null);
  const [loadError, setLoadError] = useState('');
  const [step, setStep] = useState<Step>('loading');

  const [selectedRating, setSelectedRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [customerNote, setCustomerNote] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<'English' | 'Hinglish'>('English');

  // Multi-aspect ratings and highlight tags
  const [aspectRatings, setAspectRatings] = useState<Record<string, number>>({});
  const [selectedAspects, setSelectedAspects] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // 3 Drafts support
  const [drafts, setDrafts] = useState<string[] | null>(null);
  const [selectedDraftIndex, setSelectedDraftIndex] = useState<number>(0);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedDraft, setEditedDraft] = useState('');
  const [generateError, setGenerateError] = useState('');
  const [aiUnavailable, setAiUnavailable] = useState(false);

  const [copied, setCopied] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [rewriteCount, setRewriteCount] = useState(0);
  const [loadingPhraseIndex, setLoadingPhraseIndex] = useState(0);

  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Cycling loading phrases animation
  useEffect(() => {
    if (step === 'generating' || isRegenerating) {
      setLoadingPhraseIndex(0);
      const timer = setInterval(() => {
        setLoadingPhraseIndex((prev) => (prev + 1) % LOADING_PHRASES.length);
      }, 1300);
      return () => clearInterval(timer);
    }
  }, [step, isRegenerating]);

  // Load business context
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/review/context?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (!res.ok) {
          setLoadError(data.error ?? 'This review page is unavailable.');
          setStep('error');
          return;
        }
        setContext(data);
        setStep('select-rating');
      } catch {
        setLoadError('Network error. Please check your connection.');
        setStep('error');
      }
    }
    load();
  }, [token]);

  function toggleAspect(aspect: string) {
    setSelectedAspects((prev) =>
      prev.includes(aspect) ? prev.filter((a) => a !== aspect) : [...prev, aspect]
    );
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function handleAspectStarClick(key: string, star: number) {
    setAspectRatings((prev) => ({
      ...prev,
      [key]: prev[key] === star ? 0 : star,
    }));
  }

  async function handleGenerate(ratingToUse = selectedRating, langToUse = selectedLanguage) {
    if (!ratingToUse) return;
    setDrafts(null);
    setEditedDraft('');
    setGenerateError('');
    setStep('generating');

    const ratedAspectsList = Object.entries(aspectRatings)
      .filter(([_, score]) => score >= 3)
      .map(([k, score]) => {
        const item = DEFAULT_ASPECT_ITEMS.find((a) => a.key === k);
        return item ? `${item.label} (${score}/5)` : k;
      });

    const combinedAspects = Array.from(new Set([...selectedAspects, ...ratedAspectsList]));

    try {
      const res = await fetch('/api/review/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          rating: ratingToUse,
          customer_note: customerNote.trim() || undefined,
          selected_aspects: combinedAspects,
          selected_tags: selectedTags,
          selected_language: langToUse,
          attempt: Date.now() + Math.floor(Math.random() * 1000),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.ai_unavailable) {
          setAiUnavailable(true);
          setGenerateError(data.error ?? 'AI unavailable');
          setStep('select-draft');
          return;
        }
        setGenerateError(data.error ?? 'Failed to generate suggestions');
        setStep('select-rating');
        return;
      }

      setDrafts(data.drafts);
      setSelectedDraftIndex(0);
      setEditedDraft(data.drafts[0]);
      setEditingIndex(null);
      setStep('select-draft');
    } catch {
      setGenerateError('Network error. Please try again.');
      setStep('select-rating');
    }
  }

  function handleRatingClick(star: number) {
    setSelectedRating(star);
  }

  function handleSelectDraft(index: number) {
    if (!drafts || index < 0 || index >= drafts.length) return;
    setSelectedDraftIndex(index);
    setEditedDraft(drafts[index]);
    setEditingIndex(null);
    if (carouselRef.current) {
      const targetChild = carouselRef.current.children[index] as HTMLElement | undefined;
      if (targetChild) {
        carouselRef.current.scrollTo({
          left: targetChild.offsetLeft - carouselRef.current.offsetLeft,
          behavior: 'smooth',
        });
      }
    }
  }

  async function handleLanguageChange(newLang: 'English' | 'Hinglish') {
    if (newLang === selectedLanguage || isRegenerating) return;
    setSelectedLanguage(newLang);
    setIsRegenerating(true);

    const ratedAspectsList = Object.entries(aspectRatings)
      .filter(([_, score]) => score >= 3)
      .map(([k, score]) => {
        const item = DEFAULT_ASPECT_ITEMS.find((a) => a.key === k);
        return item ? `${item.label} (${score}/5)` : k;
      });
    const combinedAspects = Array.from(new Set([...selectedAspects, ...ratedAspectsList]));

    try {
      const res = await fetch('/api/review/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          rating: selectedRating,
          customer_note: customerNote.trim() || undefined,
          selected_aspects: combinedAspects,
          selected_tags: selectedTags,
          selected_language: newLang,
          attempt: Date.now() + Math.floor(Math.random() * 1000),
        }),
      });

      const data = await res.json();
      if (res.ok && data.drafts) {
        setDrafts(data.drafts);
        setSelectedDraftIndex(0);
        setEditedDraft(data.drafts[0]);
        setEditingIndex(null);
      }
    } catch {
      // keep existing
    } finally {
      setIsRegenerating(false);
    }
  }

  async function handleRegenerate() {
    if (!selectedRating || isRegenerating) return;
    setIsRegenerating(true);
    setGenerateError('');
    const nextAttempt = rewriteCount + 1;
    setRewriteCount(nextAttempt);

    const ratedAspectsList = Object.entries(aspectRatings)
      .filter(([_, score]) => score >= 3)
      .map(([k, score]) => {
        const item = DEFAULT_ASPECT_ITEMS.find((a) => a.key === k);
        return item ? `${item.label} (${score}/5)` : k;
      });
    const combinedAspects = Array.from(new Set([...selectedAspects, ...ratedAspectsList]));

    try {
      const res = await fetch('/api/review/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          rating: selectedRating,
          customer_note: customerNote.trim() || undefined,
          selected_aspects: combinedAspects,
          selected_tags: selectedTags,
          selected_language: selectedLanguage,
          attempt: Date.now() + Math.floor(Math.random() * 10000),
        }),
      });

      const data = await res.json();
      if (res.ok && data.drafts && Array.isArray(data.drafts) && data.drafts.length >= 2) {
        setDrafts(data.drafts);
        const nextIndex = Math.min(selectedDraftIndex, data.drafts.length - 1);
        setEditedDraft(data.drafts[nextIndex]);
        setEditingIndex(null);
      } else {
        setGenerateError(data?.error || 'Unable to rewrite at this moment.');
      }
    } catch {
      setGenerateError('Connection issue. Please try again.');
    } finally {
      setIsRegenerating(false);
    }
  }

  async function handleCopyAndContinue() {
    const textToCopy = editedDraft.trim() || drafts?.[selectedDraftIndex] || '';
    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Clipboard write error:', err);
    }

    // Record events (fire and forget)
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, event_type: 'copy_click', rating: selectedRating }),
    }).catch(() => {});

    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, event_type: 'continue_to_google', rating: selectedRating }),
    }).catch(() => {});

    // Open Google Review destination in new tab
    if (context?.google_review_destination) {
      window.open(context.google_review_destination, '_blank', 'noopener,noreferrer');
    }

    setStep('continue');
  }

  const activeStarTags =
    selectedRating > 0 && context?.rating_tags
      ? context.rating_tags[String(selectedRating)] || []
      : [];

  const businessInitial = context?.business_name ? context.business_name.trim().charAt(0).toUpperCase() : 'B';

  if (step === 'loading') {
    return (
      <div className="public-page" role="status" aria-live="polite">
        <div className="review-container" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <div className="spinner" style={{ margin: '0 auto 1.5rem', width: 36, height: 36, borderWidth: 3, borderTopColor: '#6366f1' }} />
          <p style={{ color: '#8e93a7', fontSize: '0.95rem' }}>Loading review page…</p>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="public-page" role="alert">
        <div className="review-container">
          <div className="review-google-hero-card" style={{ padding: '2.5rem 1.5rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>😕</div>
            <h2 style={{ color: '#ffffff', fontWeight: 700, marginBottom: '0.5rem', fontSize: '1.25rem' }}>
              Page Unavailable
            </h2>
            <p style={{ color: '#8e93a7', fontSize: '0.875rem' }}>
              {loadError}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'continue') {
    return (
      <div className="public-page">
        <div className="review-container">
          {/* Top Identity */}
          <div className="review-top-identity">
            <div className="review-avatar">{businessInitial}</div>
            <div className="review-identity-info">
              <h1 className="review-identity-name">{context?.business_name}</h1>
              <span className="review-category-pill">{context?.category || 'Service Based Business'}</span>
            </div>
          </div>

          <div className="rb-google-card">
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
            <h2 style={{ fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem', fontSize: '1.25rem' }}>
              Review Copied to Clipboard!
            </h2>
            <p style={{ color: '#8e93a7', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Google Maps was opened in a new tab. Simply paste your review there and tap Post!
            </p>
            <button
              className="rb-btn-copy-continue"
              onClick={() => {
                if (context?.google_review_destination) {
                  window.open(context.google_review_destination, '_blank', 'noopener,noreferrer');
                }
              }}
              id="retry-google-btn"
            >
              <span>↗ Open Google Maps Again</span>
            </button>
            <button
              className="btn-public-copy"
              style={{ marginTop: '0.85rem', width: '100%' }}
              onClick={async () => {
                const text = editedDraft || drafts?.[selectedDraftIndex] || '';
                if (text) {
                  await navigator.clipboard.writeText(text);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }
              }}
              id="copy-review-again-btn"
            >
              {copied ? '✓ Copied to Clipboard!' : '📋 Copy Review Text Again'}
            </button>
            <p style={{ color: '#686d85', fontSize: '0.75rem', marginTop: '1.25rem' }}>
              Your review is not posted automatically. Please paste and submit on Google Maps.
            </p>
          </div>

          {/* Footer */}
          <div className="review-powered-by">
            <span>Powered by</span>
            <span className="spark-logo-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#10b981">
                <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
              </svg>
              ReviewSpark
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="public-page">
      <div className="review-container">
        {/* Top Business Identity Section (Shown on rating screen) */}
        {step !== 'select-draft' && (
          <div className="review-top-identity">
            <div className="review-avatar">
              {businessInitial}
            </div>
            <div className="review-identity-info">
              <h1 className="review-identity-name">{context?.business_name || 'Business'}</h1>
              <span className="review-category-pill">
                {context?.category || 'Service Based Business'}
              </span>
            </div>
          </div>
        )}

        {/* Step: Select Rating & Configure Aspects / Tags */}
        {(step === 'select-rating' || step === 'generating') && (
          <>
            {/* Center Google Hero Card */}
            <div className="rb-google-card">
              <div className="rb-google-label">YOUR REVIEW WILL BE POSTED ON</div>
              <div className="rb-google-logo" aria-label="Google">
                <span style={{ color: '#4285F4' }}>G</span>
                <span style={{ color: '#EA4335' }}>o</span>
                <span style={{ color: '#FBBC05' }}>o</span>
                <span style={{ color: '#4285F4' }}>g</span>
                <span style={{ color: '#34A853' }}>l</span>
                <span style={{ color: '#EA4335' }}>e</span>
              </div>
              <div className="rb-google-sub">Takes only 10 seconds</div>
            </div>

            {/* Stars Container */}
            <div className="review-experience-section">
              <p className="review-experience-title">How was your experience?</p>

              <div className="stars-row" role="radiogroup" aria-label="Rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    role="radio"
                    aria-checked={selectedRating === star}
                    aria-label={`${star} star${star > 1 ? 's' : ''}`}
                    onClick={() => handleRatingClick(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="star-btn"
                    id={`star-${star}`}
                  >
                    <svg
                      className="star-svg"
                      width="42"
                      height="42"
                      viewBox="0 0 24 24"
                      fill={(hoverRating || selectedRating) >= star ? '#6c5ce7' : 'none'}
                      stroke={(hoverRating || selectedRating) >= star ? '#6c5ce7' : '#2f2b57'}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        filter: (hoverRating || selectedRating) >= star ? 'drop-shadow(0 0 10px rgba(108,92,231,0.65))' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </button>
                ))}
              </div>

              {/* Feedback badge & subtext */}
              {selectedRating > 0 && (
                <>
                  <div className="rb-rating-pill-badge">
                    {STAR_EMOJIS[hoverRating || selectedRating]}
                  </div>
                  <p className="rb-rating-subtext">
                    We&apos;re glad you had a great experience. Your review helps others discover this business.
                  </p>
                </>
              )}
            </div>

            {/* Customization Options when star clicked */}
            {selectedRating > 0 && step === 'select-rating' && (
              <div className="rb-details-container">
                {/* 1. TELL US MORE (Multi-aspect Mini Stars) */}
                <div className="rb-aspects-card">
                  <div className="rb-card-section-label">TELL US MORE</div>
                  <div className="rb-aspects-list">
                    {DEFAULT_ASPECT_ITEMS.map((item) => {
                      const curRating = aspectRatings[item.key] || 0;
                      return (
                        <div key={item.key} className="rb-aspect-row">
                          <span className="rb-aspect-title">
                            <span className="rb-aspect-icon">{item.icon}</span>
                            <span>{item.label}</span>
                          </span>
                          <div className="rb-mini-stars">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <button
                                key={s}
                                type="button"
                                className="rb-mini-star-btn"
                                onClick={() => handleAspectStarClick(item.key, s)}
                                aria-label={`${item.label} ${s} stars`}
                              >
                                <svg
                                  width="20"
                                  height="20"
                                  viewBox="0 0 24 24"
                                  fill={curRating >= s ? '#6c5ce7' : 'none'}
                                  stroke={curRating >= s ? '#6c5ce7' : '#34325a'}
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                </svg>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. WHAT STOOD OUT? (Pills) */}
                <div className="rb-standout-section">
                  <div className="rb-card-section-label">WHAT STOOD OUT?</div>
                  <div className="rb-pills-wrap">
                    {(context?.aspects && context.aspects.length > 0
                      ? context.aspects
                      : DEFAULT_HIGHLIGHT_TAGS
                    ).map((tag, idx) => {
                      const isSelected = selectedTags.includes(tag) || selectedAspects.includes(tag);
                      return (
                        <button
                          key={idx}
                          type="button"
                          className={`rb-choice-pill ${isSelected ? 'active' : ''}`}
                          onClick={() => toggleTag(tag)}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. ADD A NOTE (optional) */}
                <div className="rb-note-section">
                  <div className="rb-card-section-label">ADD A NOTE (optional)</div>
                  <textarea
                    className="rb-note-textarea"
                    placeholder="Tell us more about your experience…"
                    rows={3}
                    value={customerNote}
                    onChange={(e) => setCustomerNote(e.target.value)}
                  />
                </div>

                {/* 4. Language Selector */}
                <div className="rb-lang-select-box">
                  <span className="rb-card-section-label">🌐 REVIEW LANGUAGE</span>
                  <div className="rb-lang-pills">
                    <button
                      type="button"
                      className={`rb-lang-pill ${selectedLanguage === 'English' ? 'active' : ''}`}
                      onClick={() => setSelectedLanguage('English')}
                    >
                      🇬🇧 English
                    </button>
                    <button
                      type="button"
                      className={`rb-lang-pill ${selectedLanguage === 'Hinglish' ? 'active' : ''}`}
                      onClick={() => setSelectedLanguage('Hinglish')}
                    >
                      🇮🇳 Hinglish
                    </button>
                  </div>
                </div>
              </div>
            )}

            {generateError && step === 'select-rating' && (
              <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', fontSize: '0.85rem', color: '#fca5a5', textAlign: 'center' }}>
                {generateError}
              </div>
            )}

            {/* Bottom Button */}
            <div style={{ marginTop: '0.75rem' }}>
              {selectedRating === 0 ? (
                <button
                  type="button"
                  className="rb-btn-rate-disabled"
                  disabled
                >
                  <span style={{ color: '#f59e0b' }}>★</span> Rate to continue
                </button>
              ) : step === 'generating' ? (
                <button type="button" className="rb-btn-loading" disabled>
                  <span className="rb-loading-dots">
                    <span className="rb-dot" />
                    <span className="rb-dot" />
                    <span className="rb-dot" />
                  </span>
                  <span>{LOADING_PHRASES[loadingPhraseIndex]}</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="rb-btn-generate"
                  onClick={() => handleGenerate()}
                >
                  Generate your review
                </button>
              )}
            </div>
          </>
        )}

        {/* ── Step: Select & Edit Draft (Exact ReviewBro UI from screenshot & video) ── */}
        {step === 'select-draft' && (
          <div className="rb-review-wrapper">

            {/* Top Card: YOUR REVIEW WILL BE POSTED ON + Google Logo + Takes only 10 seconds */}
            <div className="rb-google-card">
              <div className="rb-google-label">YOUR REVIEW WILL BE POSTED ON</div>
              <div className="rb-google-logo" aria-label="Google">
                <span style={{ color: '#4285F4' }}>G</span>
                <span style={{ color: '#EA4335' }}>o</span>
                <span style={{ color: '#FBBC05' }}>o</span>
                <span style={{ color: '#4285F4' }}>g</span>
                <span style={{ color: '#34A853' }}>l</span>
                <span style={{ color: '#EA4335' }}>e</span>
              </div>
              <div className="rb-google-sub">Takes only 10 seconds</div>
            </div>

            {/* Rating Row: ★★★★★ 🤩 Excellent [ ✎ Change ] */}
            <div className="rb-rating-row">
              <div className="rb-rating-stars-group">
                <span className="rb-stars">
                  {'★'.repeat(selectedRating)}{'☆'.repeat(5 - selectedRating)}
                </span>
                <span className="rb-rating-label">
                  {STAR_EMOJIS[selectedRating] || '🤩 Excellent'}
                </span>
              </div>

              <button
                type="button"
                className="rb-change-btn"
                onClick={() => setStep('select-rating')}
                id="change-rating-btn"
              >
                ✎ Change
              </button>
            </div>

            {/* Section Header: YOUR REVIEW + Language Toggle + Rewrite button */}
            <div className="rb-section-header">
              <span className="rb-section-title">YOUR REVIEW</span>
              <div className="rb-section-actions">
                <button
                  type="button"
                  className="rb-lang-toggle-btn"
                  onClick={() => handleLanguageChange(selectedLanguage === 'English' ? 'Hinglish' : 'English')}
                  disabled={isRegenerating}
                  title="Switch between English and Hinglish"
                >
                  {selectedLanguage === 'English' ? '🇬🇧 English' : '🇮🇳 Hinglish'}
                </button>
                <button
                  type="button"
                  className="rb-rewrite-btn"
                  onClick={handleRegenerate}
                  disabled={isRegenerating}
                  id="rewrite-btn"
                >
                  🔄 Rewrite
                </button>
              </div>
            </div>

            {generateError && (
              <div style={{ padding: '0.55rem 0.85rem', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', fontSize: '0.8rem', color: '#fca5a5', textAlign: 'center' }}>
                {generateError}
              </div>
            )}

            {/* Review Cards Carousel (3 Reviews) */}
            {aiUnavailable || !drafts ? (
              <div className="rb-review-card active">
                <div className="rb-card-top">
                  <div className="rb-card-badge">
                    <span className="rb-card-dot" />
                    <span>MANUAL REVIEW</span>
                  </div>
                </div>
                <div className="rb-card-divider" />
                <textarea
                  className="rb-card-textarea"
                  value={editedDraft}
                  onChange={(e) => setEditedDraft(e.target.value)}
                  placeholder="Write your review here…"
                  rows={4}
                  id="manual-review-textarea"
                />
              </div>
            ) : (
              <>
                <div
                  ref={carouselRef}
                  className="rb-carousel-track"
                  onScroll={(e) => {
                    const el = e.currentTarget;
                    if (el.scrollWidth > el.clientWidth) {
                      const firstCard = el.children[0] as HTMLElement | undefined;
                      const cardW = firstCard?.offsetWidth || el.clientWidth * 0.85;
                      const gap = 14;
                      const idx = Math.min(
                        drafts.length - 1,
                        Math.max(0, Math.round(el.scrollLeft / (cardW + gap)))
                      );
                      if (idx !== selectedDraftIndex && drafts?.[idx]) {
                        setSelectedDraftIndex(idx);
                        setEditedDraft(drafts[idx]);
                        setEditingIndex(null);
                      }
                    }
                  }}
                >
                  {drafts.map((draft, idx) => {
                    const isActive = selectedDraftIndex === idx;
                    const isEditing = editingIndex === idx;

                    return (
                      <div
                        key={idx}
                        className={`rb-review-card ${isActive ? 'active' : ''}`}
                        onClick={() => handleSelectDraft(idx)}
                        id={`draft-option-${idx}`}
                      >
                        <div className="rb-card-top">
                          <div className="rb-card-badge">
                            <span className="rb-card-dot" />
                            <span>REVIEW {idx + 1}</span>
                          </div>

                          <button
                            type="button"
                            className="rb-edit-pill"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isActive) {
                                handleSelectDraft(idx);
                              }
                              setEditingIndex(isEditing ? null : idx);
                            }}
                          >
                            ✎ {isEditing ? 'Save' : 'Edit'}
                          </button>
                        </div>

                        <div className="rb-card-divider" />

                        {isEditing ? (
                          <textarea
                            className="rb-card-textarea"
                            value={editedDraft}
                            onChange={(e) => setEditedDraft(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            rows={4}
                            aria-label={`Edit review option ${idx + 1}`}
                            id={`draft-edit-${idx}`}
                          />
                        ) : isRegenerating ? (
                          <div className="rb-card-shimmer" aria-hidden="true">
                            <div className="rb-shimmer-line rb-shimmer-line-1" />
                            <div className="rb-shimmer-line rb-shimmer-line-2" />
                            <div className="rb-shimmer-line rb-shimmer-line-3" />
                          </div>
                        ) : (
                          <p className="rb-card-text">
                            {isActive ? editedDraft : draft}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Pagination Dots underneath carousel (3 dots) */}
                <div className="rb-pagination">
                  {drafts.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`rb-page-dot ${selectedDraftIndex === idx ? 'active' : ''}`}
                      onClick={() => handleSelectDraft(idx)}
                      aria-label={`Select Review ${idx + 1}`}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Main Action Button: Big Green Pill "Copy & continue" or Loading animation during Rewrite */}
            {isRegenerating ? (
              <button type="button" className="rb-btn-loading" disabled>
                <span className="rb-loading-dots">
                  <span className="rb-dot" />
                  <span className="rb-dot" />
                  <span className="rb-dot" />
                </span>
                <span>{LOADING_PHRASES[loadingPhraseIndex]}</span>
              </button>
            ) : (
              <button
                type="button"
                className="rb-btn-copy-continue"
                onClick={handleCopyAndContinue}
                id="copy-and-continue-btn"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                <span>{copied ? '✓ Copied! Opening Google…' : 'Copy & continue'}</span>
              </button>
            )}

            <p style={{ textAlign: 'center', fontSize: '0.72rem', color: '#686d85', margin: '0.25rem 0 0' }}>
              Tap above to copy text &amp; continue directly to Google Maps!
            </p>
          </div>
        )}

        {/* Footer / Powered By */}
        <div className="review-powered-by">
          <span>Powered by</span>
          <span className="spark-logo-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#10b981">
              <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
            </svg>
            ReviewSpark
          </span>
        </div>
      </div>
    </div>
  );
}
