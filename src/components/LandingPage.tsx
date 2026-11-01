'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Interactive Live Dashboard Demo State
  const [activeTab, setActiveTab] = useState<'all' | 'positive' | 'needs-reply'>('all');
  const [repliedPriya, setRepliedPriya] = useState(false);
  const [replyText, setReplyText] = useState(
    'Thank you Priya! We are thrilled you had such a wonderful visit. Looking forward to welcoming you back soon!'
  );

  const faqs = [
    {
      q: 'What is ReviewSpark and how does it help my business?',
      a: 'ReviewSpark is an all-in-one customer review and reputation management platform. It gives your business a single counter QR code, automatically generates AI-drafted reviews in English & Hinglish for happy customers, and protects your public rating by routing low ratings into your private inbox.',
    },
    {
      q: 'Do customers need to download an application to review?',
      a: 'No app is required! When customers scan the QR code using their default phone camera, it instantly opens in their browser (Chrome, Safari, etc.) without any login or download friction.',
    },
    {
      q: 'How do the AI-assisted review suggestions work?',
      a: 'When a customer gives a 4 or 5-star rating, ReviewSpark dynamically drafts two personalized review options: Draft 1 in natural English and Draft 2 in conversational Hinglish. Customers can edit any word and post directly to Google Maps in 1 click.',
    },
    {
      q: 'How does the negative review protection work?',
      a: 'If a customer has a less-than-ideal experience (1 to 3 stars), the system diverts their feedback to your private internal inbox. This allows your team to address and resolve the customer complaint directly before it ever appears publicly on Google Maps.',
    },
    {
      q: 'Is ReviewSpark compliant with Google policies?',
      a: 'Yes, 100%. ReviewSpark strictly adheres to Google guidelines. It never buys, fakes, or auto-posts reviews. Real customers write, edit, and post authentic reviews from their own Google accounts.',
    },
    {
      q: 'Can I manage multiple locations or branches?',
      a: 'Yes! ReviewSpark provides multi-location support. You can track reviews, manage separate QR codes, compare ratings, and monitor reputation performance across all your branches from one unified dashboard.',
    },
  ];

  const features = [
    {
      tag: '01 · COLLECT',
      title: 'Get More Reviews',
      desc: 'One printable QR code for your counter, table, or billing desk. Customers scan and leave reviews in 10 seconds without downloading any app.',
      icon: '📱',
    },
    {
      tag: '02 · GENERATE',
      title: 'Smart AI Review Drafts',
      desc: 'Dual-language review generator providing customers authentic drafts in both English and conversational Hinglish so they never stare at a blank box.',
      icon: '✍️',
    },
    {
      tag: '03 · PROTECT',
      title: 'Negative Review Filter',
      desc: 'Keep 1-3 star ratings in your private inbox. Resolve customer dissatisfaction privately before it impacts your public Google rating.',
      icon: '🛡️',
    },
    {
      tag: '04 · RESPOND',
      title: 'AI Reply Assistant',
      desc: 'Generate thoughtful, human-sounding replies to all customer reviews in seconds. Boost engagement and search ranking with zero effort.',
      icon: '💬',
    },
    {
      tag: '05 · INSIGHTS',
      title: 'Sentiment & Trends',
      desc: 'Discover customer patterns, frequently mentioned topics, wait-time mentions, and staff highlights to make smarter business decisions.',
      icon: '📊',
    },
    {
      tag: '06 · MULTI-LOCATION',
      title: 'Multi-Branch Management',
      desc: 'Unified control across multiple outlets or franchise locations with centralized analytics, branch-specific QR codes, and performance comparisons.',
      icon: '🏢',
    },
  ];

  const comparison = [
    {
      feature: 'Review Collection',
      traditional: 'Manual verbal requests, forgotten by customers',
      reviewspark: 'Frictionless QR scan directly at checkout or tables',
    },
    {
      feature: 'Customer Review Writing',
      traditional: 'Customers struggle with what to write and leave',
      reviewspark: 'AI drafts in English & Hinglish they can edit and post',
    },
    {
      feature: 'Negative Feedback',
      traditional: 'Disgruntled customers post directly to Google',
      reviewspark: '1–3★ feedback is intercepted in your private inbox',
    },
    {
      feature: 'Review Responses',
      traditional: 'Time-consuming manual typing or ignored',
      reviewspark: 'One-click contextual AI replies that sound human',
    },
    {
      feature: 'Customer Sentiment',
      traditional: 'Guesswork with no clear trend analysis',
      reviewspark: 'Automated topic, emotion, and wait-time insights',
    },
  ];

  const industries = [
    { name: 'Restaurants & Cafés', icon: '🍽️', placement: 'QR on tables & bill folders' },
    { name: 'Salons & Spas', icon: '💇', placement: 'QR at mirrors & reception' },
    { name: 'Dental & Medical Clinics', icon: '🩺', placement: 'QR at checkout & consultation' },
    { name: 'Gyms & Fitness Centers', icon: '🏋️', placement: 'QR at check-in desk' },
    { name: 'Coaching & Institutes', icon: '📚', placement: 'QR at reception & classrooms' },
    { name: 'Hotels & Resorts', icon: '🏨', placement: 'QR at front desk & rooms' },
    { name: 'Car & Bike Service', icon: '🚗', placement: 'QR on customer invoice & billing' },
    { name: 'Retail & Boutiques', icon: '🛍️', placement: 'QR at billing checkout' },
  ];

  return (
    <div className="landing-root-in">
      {/* ── Top Navbar ─────────────────────────────────────────────────── */}
      <header className="landing-header-in">
        <div className="landing-container-in header-inner-in">
          <Link href="/" className="landing-logo-in">
            <span className="logo-spark-icon-in">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#10b981">
                <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
              </svg>
            </span>
            <span className="logo-text-in">
              Review<span className="logo-accent-in">Spark</span>
            </span>
          </Link>

          <nav className="desktop-nav-in">
            <a href="#overview" className="nav-link-in">Overview</a>
            <a href="#features" className="nav-link-in">Features</a>
            <a href="#comparison" className="nav-link-in">Why Us</a>
            <a href="#how-it-works" className="nav-link-in">How It Works</a>
            <a href="#faq" className="nav-link-in">FAQ</a>
          </nav>

          <div className="header-actions-in">
            <Link href="/login" className="btn-nav-login-in">
              Sign In
            </Link>
            <Link href="/login" className="btn-nav-primary-in">
              Open Dashboard
            </Link>
            <button
              type="button"
              className="mobile-hamburger-in"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              ☰
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="mobile-drawer-in">
            <a href="#overview" onClick={() => setMobileMenuOpen(false)}>Overview</a>
            <a href="#features" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#comparison" onClick={() => setMobileMenuOpen(false)}>Why Us</a>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>How It Works</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
              <Link href="/login" className="btn-nav-login-in" style={{ flex: 1, textAlign: 'center' }}>
                Sign In
              </Link>
              <Link href="/login" className="btn-nav-primary-in" style={{ flex: 1, textAlign: 'center' }}>
                Open Dashboard
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero Section ────────────────────────────────────────────────── */}
      <section id="overview" className="hero-section-in">
        <div className="hero-ambient-glow"></div>
        <div className="landing-container-in hero-inner-in">
          
          <div className="hero-badge-in">
            <span className="hero-badge-dot"></span>
            <span>AI Reputation &amp; Customer Review Management Platform</span>
          </div>

          <h1 className="hero-headline-in">
            More Than Reviews.<br />
            <span className="gradient-text-emerald">A Brighter Tomorrow.</span>
          </h1>

          <p className="hero-description-in">
            ReviewSpark helps businesses manage customer reviews, automate feedback collection with smart QR stands, respond with contextual AI, track reputation sentiment, and grow from one unified platform.
          </p>

          <div className="hero-actions-in">
            <Link href="/login" className="btn-hero-primary-in">
              Start Managing Reviews
            </Link>
            <a href="#how-it-works" className="btn-hero-secondary-in">
              See How It Works ↓
            </a>
          </div>

          {/* Blank Placeholder Image Slot for Hero Graphic / Mockup */}
          <div className="placeholder-hero-image-container">
            <div className="placeholder-box hero-placeholder">
              <div className="placeholder-icon">🖼️</div>
              <div className="placeholder-title">Hero Graphic / Stand Image Placeholder</div>
              <div className="placeholder-sub">Drop your custom QR stand or hero illustration here</div>
            </div>
          </div>

          {/* ── Interactive Live Dashboard Mockup ───────────────────────── */}
          <div className="dashboard-mockup-wrapper">
            <div className="dashboard-mockup-card">
              
              {/* Top Dashboard Header */}
              <div className="mock-topbar">
                <div className="mock-window-dots">
                  <span className="dot red"></span>
                  <span className="dot yellow"></span>
                  <span className="dot green"></span>
                </div>
                <div className="mock-title-bar">ReviewSpark Unified Reputation Dashboard</div>
                <div className="mock-status-pill">● Live Insights</div>
              </div>

              {/* 4 Stats Metrics */}
              <div className="mock-stats-grid">
                <div className="mock-stat-card">
                  <span className="mock-stat-label">Average Rating</span>
                  <div className="mock-stat-val text-amber">4.8 ★</div>
                  <span className="mock-stat-trend text-emerald">↑ +0.4 this month</span>
                </div>
                <div className="mock-stat-card">
                  <span className="mock-stat-label">Total Reviews</span>
                  <div className="mock-stat-val text-white">1,280+</div>
                  <span className="mock-stat-trend text-emerald">↑ +18% QR scans</span>
                </div>
                <div className="mock-stat-card">
                  <span className="mock-stat-label">Positive Sentiment</span>
                  <div className="mock-stat-val text-emerald">94%</div>
                  <span className="mock-stat-trend text-white-muted">Based on 1.2k ratings</span>
                </div>
                <div className="mock-stat-card">
                  <span className="mock-stat-label">Response Rate</span>
                  <div className="mock-stat-val text-teal">99%</div>
                  <span className="mock-stat-trend text-emerald">⚡ Instant AI replies</span>
                </div>
              </div>

              {/* Interactive Reviews Feed Simulation */}
              <div className="mock-feed-section">
                <div className="mock-feed-header">
                  <div className="mock-feed-tabs">
                    <button
                      type="button"
                      className={`mock-feed-tab ${activeTab === 'all' ? 'active' : ''}`}
                      onClick={() => setActiveTab('all')}
                    >
                      All Reviews (1,280)
                    </button>
                    <button
                      type="button"
                      className={`mock-feed-tab ${activeTab === 'positive' ? 'active' : ''}`}
                      onClick={() => setActiveTab('positive')}
                    >
                      5★ Google Reviews
                    </button>
                    <button
                      type="button"
                      className={`mock-feed-tab ${activeTab === 'needs-reply' ? 'active' : ''}`}
                      onClick={() => setActiveTab('needs-reply')}
                    >
                      Needs Reply (1)
                    </button>
                  </div>
                </div>

                <div className="mock-review-items">
                  {/* Review 1 */}
                  <div className="mock-review-item">
                    <div className="mock-reviewer-header">
                      <div className="mock-avatar">PS</div>
                      <div className="mock-reviewer-info">
                        <div className="mock-reviewer-name">Priya Sharma</div>
                        <div className="mock-review-meta">5.0 ★ · Google Maps Review · 2 hours ago</div>
                      </div>
                      <span className="mock-badge-success">✓ Published to Google</span>
                    </div>
                    <p className="mock-review-text">
                      &quot;Great service and amazing experience. The staff was super polite and welcoming. Highly recommend!&quot;
                    </p>

                    {/* AI Reply Box */}
                    <div className="mock-ai-reply-box">
                      <div className="mock-ai-label">
                        <span>🤖 Smart AI Generated Reply</span>
                        <span className="mock-ai-tag">Personalized &amp; Human</span>
                      </div>
                      {repliedPriya ? (
                        <p className="mock-reply-sent">✓ Sent: &quot;{replyText}&quot;</p>
                      ) : (
                        <>
                          <textarea
                            className="mock-reply-textarea"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            rows={2}
                          />
                          <button
                            type="button"
                            className="btn-mock-reply"
                            onClick={() => setRepliedPriya(true)}
                          >
                            Send Reply via AI
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Review 2 - Low Rating Protected */}
                  <div className="mock-review-item private-shield">
                    <div className="mock-reviewer-header">
                      <div className="mock-avatar orange">RM</div>
                      <div className="mock-reviewer-info">
                        <div className="mock-reviewer-name">Rahul Mehta</div>
                        <div className="mock-review-meta">2.0 ★ · Private Feedback Filter · Yesterday</div>
                      </div>
                      <span className="mock-badge-shield">🛡️ Protected from Public Google</span>
                    </div>
                    <p className="mock-review-text">
                      &quot;The food was good, but our waiting time on Sunday afternoon was a bit too long.&quot;
                    </p>
                    <div className="mock-internal-note">
                      <span>💡 Internal Recommendation:</span> Peak wait time alert logged. Manager contacted customer privately to resolve. Public rating remains protected at 4.8★.
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ── Key Features Grid (01–06) ────────────────────────────────────── */}
      <section id="features" className="section-in">
        <div className="landing-container-in">
          <div className="section-header-in">
            <span className="kicker-in">Platform Capabilities</span>
            <h2 className="title-in">Built for reputation, designed for growth</h2>
            <p className="desc-in">
              ReviewSpark replaces manual follow-ups and generic tools with an intelligent, friction-free ecosystem.
            </p>
          </div>

          <div className="features-grid-in">
            {features.map((feat, idx) => (
              <div key={idx} className="feature-card-in">
                <div className="feature-card-top">
                  <span className="feature-icon-in">{feat.icon}</span>
                  <span className="feature-tag-in">{feat.tag}</span>
                </div>
                <h3 className="feature-title-in">{feat.title}</h3>
                <p className="feature-desc-in">{feat.desc}</p>
                {/* Blank Placeholder Image Slot for Feature Graphic */}
                <div className="placeholder-box feature-placeholder">
                  <div className="placeholder-sub">Feature Graphic Placeholder</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparison Section: Traditional Tools vs ReviewSpark ──────────── */}
      <section id="comparison" className="section-in alt-bg">
        <div className="landing-container-in">
          <div className="section-header-in">
            <span className="kicker-in">Why ReviewSpark</span>
            <h2 className="title-in">Traditional tools vs. Modern AI reputation</h2>
            <p className="desc-in">
              See why forward-thinking businesses choose ReviewSpark over outdated manual follow-ups and fragmented software.
            </p>
          </div>

          <div className="comparison-table-wrapper">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th className="th-feature">Capability</th>
                  <th className="th-old">Traditional Methods</th>
                  <th className="th-new">ReviewSpark</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row, idx) => (
                  <tr key={idx}>
                    <td className="td-feature">{row.feature}</td>
                    <td className="td-old">
                      <span className="cross-icon">✕</span> {row.traditional}
                    </td>
                    <td className="td-new">
                      <span className="check-icon">✓</span> {row.reviewspark}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Step-by-Step Flow ────────────────────────────────────────────── */}
      <section id="how-it-works" className="section-in">
        <div className="landing-container-in">
          <div className="section-header-in">
            <span className="kicker-in">How It Works</span>
            <h2 className="title-in">From QR scan to 5-star Google review in seconds</h2>
            <p className="desc-in">
              Frictionless for your customers. Zero maintenance for your staff.
            </p>
          </div>

          <div className="steps-container-in">
            <div className="step-item-in">
              <div className="step-num-in">01</div>
              <h4 className="step-title-in">Scan Counter QR</h4>
              <p className="step-desc-in">
                Customer scans your printable stand using their default phone camera. No app download required.
              </p>
              <div className="placeholder-box step-placeholder">
                <div className="placeholder-sub">QR Scan Graphic Placeholder</div>
              </div>
            </div>

            <div className="step-item-in">
              <div className="step-num-in">02</div>
              <h4 className="step-title-in">Rate 1 to 5 Stars</h4>
              <p className="step-desc-in">
                Fast tap-friendly rating interface matching Google Maps expectations with custom aspects and tags.
              </p>
              <div className="placeholder-box step-placeholder">
                <div className="placeholder-sub">Star Rating Graphic Placeholder</div>
              </div>
            </div>

            <div className="step-item-in highlight-emerald">
              <div className="step-num-in">03</div>
              <h4 className="step-title-in">High Ratings get AI Drafts</h4>
              <p className="step-desc-in">
                4-5★ ratings receive instant AI suggestions in English &amp; Hinglish. 1-click copy &amp; continue to Google.
              </p>
              <div className="placeholder-box step-placeholder">
                <div className="placeholder-sub">AI Drafts Graphic Placeholder</div>
              </div>
            </div>

            <div className="step-item-in highlight-shield">
              <div className="step-num-in">04</div>
              <h4 className="step-title-in">Low Ratings Stay Private</h4>
              <p className="step-desc-in">
                1-3★ ratings are filtered to your private dashboard inbox so you can resolve complaints without public damage.
              </p>
              <div className="placeholder-box step-placeholder">
                <div className="placeholder-sub">Private Shield Graphic Placeholder</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Industries Grid ─────────────────────────────────────────────── */}
      <section className="section-in alt-bg">
        <div className="landing-container-in">
          <div className="section-header-in">
            <span className="kicker-in">Every Local Business</span>
            <h2 className="title-in">Tailored for counters, tables, and clinics</h2>
            <p className="desc-in">
              Trusted by restaurants, healthcare clinics, wellness salons, and services across India.
            </p>
          </div>

          <div className="industries-grid-in">
            {industries.map((ind, idx) => (
              <div key={idx} className="industry-box-in">
                <span className="industry-icon-in">{ind.icon}</span>
                <div className="industry-title-in">{ind.name}</div>
                <div className="industry-placement-in">{ind.placement}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ Section ─────────────────────────────────────────────────── */}
      <section id="faq" className="section-in">
        <div className="landing-container-in">
          <div className="section-header-in">
            <span className="kicker-in">Common Questions</span>
            <h2 className="title-in">Frequently Asked Questions</h2>
            <p className="desc-in">
              Everything you need to know about ReviewSpark, Google compliance, and reputation management.
            </p>
          </div>

          <div className="faq-container-in">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div key={index} className={`faq-card-in ${isOpen ? 'open' : ''}`}>
                  <button
                    type="button"
                    className="faq-trigger-in"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                  >
                    <span className="faq-idx-in">0{index + 1}</span>
                    <span className="faq-q-text-in">{faq.q}</span>
                    <span className="faq-toggle-icon">{isOpen ? '−' : '+'}</span>
                  </button>
                  {isOpen && <div className="faq-body-in">{faq.a}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Bottom Call To Action Banner ─────────────────────────────────── */}
      <section className="bottom-banner-in">
        <div className="landing-container-in bottom-banner-content-in">
          <h2 className="bottom-banner-title-in">
            Put one QR on the counter.<br />
            <span className="gradient-text-emerald">Google reviews follow.</span>
          </h2>
          <p className="bottom-banner-desc-in">
            Start automating customer reviews, protecting your rating, and growing your local search presence today.
          </p>
          <div className="bottom-banner-actions">
            <Link href="/login" className="btn-hero-primary-in">
              Get Started with ReviewSpark
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="footer-in">
        <div className="landing-container-in footer-inner-in">
          <div className="footer-brand-in">
            <Link href="/" className="landing-logo-in">
              <span className="logo-spark-icon-in">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#10b981">
                  <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
                </svg>
              </span>
              <span className="logo-text-in">Review<span className="logo-accent-in">Spark</span></span>
            </Link>
            <p className="footer-tagline-in">
              AI-Powered Reputation and Customer Review Management Platform.
            </p>
          </div>

          <div className="footer-nav-in">
            <a href="#overview">Overview</a>
            <a href="#features">Features</a>
            <a href="#comparison">Why Us</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#faq">FAQ</a>
            <Link href="/login">Dashboard</Link>
          </div>

          <div className="footer-copyright-in">
            <p>© {new Date().getFullYear()} ReviewSpark. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
