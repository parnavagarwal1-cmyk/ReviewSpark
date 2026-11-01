'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'positive' | 'needs-reply'>('all');
  const [repliedPriya, setRepliedPriya] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [replyText, setReplyText] = useState(
    'Thank you Priya! We are thrilled you had such a wonderful visit. Looking forward to welcoming you back soon!'
  );

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const faqs = [
    {
      q: 'What is ReviewSpark and how does it help my business?',
      a: 'ReviewSpark is an all-in-one customer review and reputation management platform. It gives your business a single counter QR code, automatically generates AI-drafted reviews in English & Hinglish for happy customers, and protects your public rating by routing low ratings into your private inbox.',
    },
    {
      q: 'Do customers need to download an application to review?',
      a: 'No app is required! When customers scan the QR code using their default phone camera, it instantly opens in their browser — Chrome, Safari, etc. — without any login or download friction.',
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

  const stats = [
    { value: '50,000+', label: 'Reviews Generated', icon: '⭐' },
    { value: '2,400+', label: 'Businesses Trust Us', icon: '🏢' },
    { value: '4.9 / 5', label: 'Average Rating Lift', icon: '📈' },
    { value: '99%', label: 'Google Compliance', icon: '✓' },
  ];

  const features = [
    {
      tag: '01 · COLLECT',
      title: 'Smart QR Counter Stand',
      desc: 'One printable acrylic QR stand for your counter, table, or billing desk. Customers scan and leave reviews in 10 seconds — zero app download.',
      icon: '📱',
      visual: (
        <div className="feat-photo-wrap">
          <img src="/images/phone-scan.jpg" alt="QR Scan" className="feat-photo-img" />
          <span className="feat-photo-badge">⚡ 10-Second Review</span>
        </div>
      ),
    },
    {
      tag: '02 · GENERATE',
      title: 'Dual-Language AI Drafts',
      desc: 'Happy customers never stare at a blank box. AI generates authentic review drafts in English & Hinglish they can edit and post in one tap.',
      icon: '✍️',
      visual: (
        <div className="feat-draft-wrap">
          <div className="feat-draft-card en">
            <span className="feat-draft-lang">Draft 1 · English</span>
            <p>&quot;Superb service and welcoming team. Will definitely visit again!&quot;</p>
          </div>
          <div className="feat-draft-card hi">
            <span className="feat-draft-lang">Draft 2 · Hinglish</span>
            <p>&quot;Bohot badhiya experience tha, staff bhi kaafi helpful tha!&quot;</p>
          </div>
          <div className="feat-draft-action">
            <span className="feat-draft-copy-btn">Copy &amp; Post to Google →</span>
          </div>
        </div>
      ),
    },
    {
      tag: '03 · PROTECT',
      title: 'Negative Review Shield',
      desc: 'Low ratings (1–3★) never reach Google Maps. They are silently intercepted and routed to your private dashboard so you can resolve them first.',
      icon: '🛡️',
      visual: (
        <div className="feat-shield-wrap">
          <div className="feat-shield-flow">
            <div className="feat-flow-item bad">
              <span className="feat-flow-star">★★☆☆☆</span>
              <span className="feat-flow-label">2-Star Review</span>
            </div>
            <div className="feat-flow-arrow">→</div>
            <div className="feat-flow-item shield">
              <span className="feat-flow-icon">🛡️</span>
              <span className="feat-flow-label">Private Inbox</span>
            </div>
            <div className="feat-flow-arrow">→</div>
            <div className="feat-flow-item resolved">
              <span className="feat-flow-icon">✓</span>
              <span className="feat-flow-label">Resolved</span>
            </div>
          </div>
          <div className="feat-shield-note">Google rating stays protected at 4.8★</div>
        </div>
      ),
    },
    {
      tag: '04 · RESPOND',
      title: 'AI Reply Assistant',
      desc: 'Generate warm, human-sounding replies to every review in one click. Boost Google SEO and show customers you care — at scale.',
      icon: '💬',
      visual: (
        <div className="feat-reply-wrap">
          <div className="feat-reply-header">🤖 AI-Crafted Reply Ready</div>
          <p className="feat-reply-text">&quot;Thank you Priya for your kind words! We are delighted you had a great experience. Looking forward to seeing you again!&quot;</p>
          <div className="feat-reply-btn">⚡ Post to Google · 1 Click</div>
        </div>
      ),
    },
    {
      tag: '05 · INSIGHTS',
      title: 'Sentiment & Trend Analytics',
      desc: 'Discover what customers love, detect wait-time spikes, identify staff highlights, and track reputation trends across weeks and months.',
      icon: '📊',
      visual: (
        <div className="feat-analytics-wrap">
          <div className="feat-bar-row"><span>Positive</span><div className="feat-bar"><div className="feat-bar-fill green" style={{ width: '94%' }}></div></div><span className="feat-bar-pct text-emerald">94%</span></div>
          <div className="feat-bar-row"><span>Neutral</span><div className="feat-bar"><div className="feat-bar-fill yellow" style={{ width: '4%' }}></div></div><span className="feat-bar-pct">4%</span></div>
          <div className="feat-bar-row"><span>Negative</span><div className="feat-bar"><div className="feat-bar-fill red" style={{ width: '2%' }}></div></div><span className="feat-bar-pct">2%</span></div>
          <div className="feat-chip-row">
            <span className="feat-chip">#polite_staff</span>
            <span className="feat-chip">#fast_service</span>
            <span className="feat-chip">#great_food</span>
          </div>
        </div>
      ),
    },
    {
      tag: '06 · SCALE',
      title: 'Multi-Branch Dashboard',
      desc: 'One dashboard to rule all your outlets. Track ratings per branch, compare performance, assign QR codes, and grow every location simultaneously.',
      icon: '🏢',
      visual: (
        <div className="feat-branches-wrap">
          {[
            { name: 'Connaught Place', score: '4.9 ★', reviews: '420 reviews', up: true },
            { name: 'Indiranagar, Bengaluru', score: '4.8 ★', reviews: '380 reviews', up: true },
            { name: 'Bandra West, Mumbai', score: '4.8 ★', reviews: '480 reviews', up: false },
          ].map((b, i) => (
            <div key={i} className="feat-branch-row">
              <div className="feat-branch-info">
                <span className="feat-branch-name">{b.name}</span>
                <span className="feat-branch-reviews">{b.reviews}</span>
              </div>
              <div className="feat-branch-score-box">
                <span className="feat-branch-score">{b.score}</span>
                <span className={`feat-branch-trend ${b.up ? 'up' : 'flat'}`}>{b.up ? '↑' : '→'}</span>
              </div>
            </div>
          ))}
        </div>
      ),
    },
  ];

  const comparison = [
    { feature: 'Review Collection', traditional: 'Manual verbal asks — usually forgotten', reviewspark: 'Instant QR scan at checkout, zero friction' },
    { feature: 'Review Writing', traditional: 'Customers face a blank box and give up', reviewspark: 'AI drafts in English & Hinglish, edit & post' },
    { feature: 'Negative Feedback', traditional: '1-star reviews posted directly to Google', reviewspark: '1–3★ privately intercepted into your inbox' },
    { feature: 'Review Responses', traditional: 'Manual typing, hours of effort, often ignored', reviewspark: 'One-click AI replies in seconds, always on' },
    { feature: 'Reputation Insights', traditional: 'Guesswork, no analytics whatsoever', reviewspark: 'Auto sentiment analysis, trends, and alerts' },
  ];

  const industries = [
    { name: 'Restaurants & Cafés', icon: '🍽️', placement: 'QR on tables & bill folders', image: '/images/restaurant-table.jpg' },
    { name: 'Salons & Spas', icon: '💇', placement: 'QR at mirrors & reception', image: '/images/salon-reception.jpg' },
    { name: 'Dental & Medical', icon: '🩺', placement: 'QR at checkout & consultation', image: '/images/clinic-desk.jpg' },
    { name: 'Gyms & Fitness', icon: '🏋️', placement: 'QR at check-in desk', image: '/images/gym-desk.jpg' },
    { name: 'Coaching Centers', icon: '📚', placement: 'QR at reception & classrooms', image: '/images/phone-scan.jpg' },
    { name: 'Hotels & Resorts', icon: '🏨', placement: 'QR at front desk & rooms', image: '/images/salon-reception.jpg' },
    { name: 'Auto Service', icon: '🚗', placement: 'QR on customer invoice', image: '/images/phone-scan.jpg' },
    { name: 'Retail & Boutiques', icon: '🛍️', placement: 'QR at billing counter', image: '/images/retail-store.jpg' },
  ];

  return (
    <div className="lp">

      {/* ── Navbar ────────────────────────────────────────────────────────── */}
      <header className={`lp-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="lp-container lp-nav-inner">
          <Link href="/" className="lp-logo">
            <span className="lp-logo-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#10b981">
                <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
              </svg>
            </span>
            Review<span className="lp-logo-spark">Spark</span>
          </Link>

          <nav className="lp-nav-links">
            <a href="#features">Features</a>
            <a href="#comparison">Why Us</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#industries">Industries</a>
            <a href="#faq">FAQ</a>
          </nav>

          <div className="lp-nav-actions">
            <Link href="/login" className="lp-btn-ghost">Sign In</Link>
            <Link href="/login" className="lp-btn-primary">Get Started Free →</Link>
            <button
              type="button"
              className="lp-hamburger"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <span></span><span></span><span></span>
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="lp-mobile-drawer">
            {['#features','#comparison','#how-it-works','#industries','#faq'].map((href, i) => (
              <a key={i} href={href} onClick={() => setMobileMenuOpen(false)}>
                {['Features','Why Us','How It Works','Industries','FAQ'][i]}
              </a>
            ))}
            <div className="lp-mobile-btns">
              <Link href="/login" className="lp-btn-ghost" style={{flex:1,textAlign:'center'}}>Sign In</Link>
              <Link href="/login" className="lp-btn-primary" style={{flex:1,textAlign:'center'}}>Get Started →</Link>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section id="overview" className="lp-hero">
        <div className="lp-hero-glow-top"></div>
        <div className="lp-hero-grid-bg"></div>

        <div className="lp-container lp-hero-inner">
          {/* Left Copy */}
          <div className="lp-hero-copy">
            <div className="lp-pill">
              <span className="lp-pill-dot"></span>
              AI-Powered Reputation Management · India
            </div>

            <h1 className="lp-hero-h1">
              Turn Every Customer Into a<br />
              <span className="lp-grad">5-Star Google Review.</span>
            </h1>

            <p className="lp-hero-sub">
              Smart QR counter stands · Dual-language AI review drafts · Negative review protection · Reply automation — all in one platform built for Indian local businesses.
            </p>

            <div className="lp-hero-cta-row">
              <Link href="/login" className="lp-btn-primary lp-btn-lg">
                Start for Free →
              </Link>
              <a href="#how-it-works" className="lp-btn-outline">
                See How It Works
              </a>
            </div>

            <div className="lp-hero-social-proof">
              <div className="lp-proof-avatars">
                {['PS','RK','AM','SK','NJ'].map((init, i) => (
                  <span key={i} className="lp-proof-av" style={{ zIndex: 5 - i }}>{init}</span>
                ))}
              </div>
              <div className="lp-proof-text">
                <strong>2,400+ businesses</strong> already trust ReviewSpark
                <div className="lp-proof-stars">★★★★★ <span>4.9 avg rating</span></div>
              </div>
            </div>
          </div>

          {/* Right — QR Stand + Dashboard Preview */}
          <div className="lp-hero-visual">
            {/* Floating stat cards */}
            <div className="lp-float-card lp-float-top-left">
              <span className="lp-float-icon">⭐</span>
              <div>
                <div className="lp-float-val">4.8 → 4.9</div>
                <div className="lp-float-lbl">Rating improved</div>
              </div>
            </div>
            <div className="lp-float-card lp-float-top-right">
              <span className="lp-float-icon lp-icon-shield">🛡️</span>
              <div>
                <div className="lp-float-val">0 leaks</div>
                <div className="lp-float-lbl">Bad reviews protected</div>
              </div>
            </div>

            <div className="lp-stand-card">
              <div className="lp-stand-glow"></div>
              <img
                src="/images/qr-stand-420.webp"
                alt="ReviewSpark Acrylic QR Counter Stand"
                className="lp-stand-img"
              />
              <div className="lp-stand-label-row">
                <span className="lp-stand-lbl">✨ Premium Acrylic Stand</span>
                <span className="lp-stand-lbl lp-stand-lbl-amber">⭐ 4.9 Verified</span>
              </div>
            </div>

            <div className="lp-float-card lp-float-bottom-center">
              <span className="lp-float-icon lp-icon-green">✓</span>
              <div>
                <div className="lp-float-val">38 reviews</div>
                <div className="lp-float-lbl">Collected this week</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Strip ──────────────────────────────────────────────────── */}
      <div className="lp-stats-strip">
        <div className="lp-container lp-stats-inner">
          {stats.map((s, i) => (
            <div key={i} className="lp-stat-item">
              <div className="lp-stat-val">{s.value}</div>
              <div className="lp-stat-lbl">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Live Dashboard Mockup ─────────────────────────────────────────── */}
      <section className="lp-section">
        <div className="lp-container">
          <div className="lp-section-head">
            <span className="lp-kicker">Live Dashboard</span>
            <h2 className="lp-h2">Real-time reputation command center</h2>
            <p className="lp-section-sub">Every review, reply, and rating in one place. Watch your reputation grow in real time.</p>
          </div>

          <div className="lp-dashboard-card">
            <div className="lp-dash-topbar">
              <div className="lp-dash-dots">
                <span className="lp-dot red"></span>
                <span className="lp-dot yellow"></span>
                <span className="lp-dot green"></span>
              </div>
              <div className="lp-dash-title">ReviewSpark · Unified Reputation Dashboard</div>
              <div className="lp-dash-live">● Live</div>
            </div>

            <div className="lp-dash-metrics">
              {[
                { label: 'Avg Rating', val: '4.8 ★', trend: '↑ +0.4 this month', valClass: 'amber' },
                { label: 'Total Reviews', val: '1,280+', trend: '↑ +18% via QR', valClass: '' },
                { label: 'Positive Sentiment', val: '94%', trend: 'Based on 1.2k ratings', valClass: 'green' },
                { label: 'AI Response Rate', val: '99%', trend: '⚡ Auto-replied', valClass: 'teal' },
              ].map((m, i) => (
                <div key={i} className="lp-metric-card">
                  <span className="lp-metric-lbl">{m.label}</span>
                  <div className={`lp-metric-val lp-val-${m.valClass}`}>{m.val}</div>
                  <span className="lp-metric-trend">{m.trend}</span>
                </div>
              ))}
            </div>

            <div className="lp-dash-feed">
              <div className="lp-dash-tabs">
                {(['all','positive','needs-reply'] as const).map((tab, i) => (
                  <button key={i} type="button" className={`lp-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                    {['All Reviews (1,280)', '5★ Google', 'Needs Reply (1)'][i]}
                  </button>
                ))}
              </div>

              <div className="lp-review-list">
                {/* Review 1 — positive */}
                <div className="lp-review-card">
                  <div className="lp-review-top">
                    <div className="lp-av lp-av-green">PS</div>
                    <div className="lp-rv-info">
                      <div className="lp-rv-name">Priya Sharma</div>
                      <div className="lp-rv-meta">5.0 ★ · Google Maps · 2 hours ago</div>
                    </div>
                    <span className="lp-badge lp-badge-green">✓ Published to Google</span>
                  </div>
                  <p className="lp-rv-text">&quot;Great service and amazing experience. Staff was super polite and welcoming. Highly recommend!&quot;</p>
                  <div className="lp-ai-reply-box">
                    <div className="lp-air-header">
                      <span>🤖 AI-Crafted Reply</span>
                      <span className="lp-air-tag">Personalized</span>
                    </div>
                    {repliedPriya ? (
                      <p className="lp-rv-sent">✓ Sent: &quot;{replyText}&quot;</p>
                    ) : (
                      <>
                        <textarea className="lp-reply-ta" value={replyText} onChange={e => setReplyText(e.target.value)} rows={2} />
                        <button type="button" className="lp-reply-btn" onClick={() => setRepliedPriya(true)}>Send Reply via AI →</button>
                      </>
                    )}
                  </div>
                </div>

                {/* Review 2 — protected */}
                <div className="lp-review-card lp-review-protected">
                  <div className="lp-review-top">
                    <div className="lp-av lp-av-amber">RM</div>
                    <div className="lp-rv-info">
                      <div className="lp-rv-name">Rahul Mehta</div>
                      <div className="lp-rv-meta">2.0 ★ · Private Feedback · Yesterday</div>
                    </div>
                    <span className="lp-badge lp-badge-amber">🛡️ Protected</span>
                  </div>
                  <p className="lp-rv-text">&quot;Food was good but wait time was too long on Sunday afternoon.&quot;</p>
                  <div className="lp-internal-note">
                    <span>💡 Internal Alert:</span> Wait time spike detected. Manager notified. Public rating untouched at 4.8★.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section id="features" className="lp-section lp-alt">
        <div className="lp-container">
          <div className="lp-section-head">
            <span className="lp-kicker">Platform Features</span>
            <h2 className="lp-h2">Everything you need to dominate local search</h2>
            <p className="lp-section-sub">Six powerful tools. One subscription. Zero headaches.</p>
          </div>

          <div className="lp-feat-grid">
            {features.map((f, i) => (
              <div key={i} className="lp-feat-card">
                <div className="lp-feat-header">
                  <div className="lp-feat-icon-wrap">
                    <span className="lp-feat-icon">{f.icon}</span>
                  </div>
                  <span className="lp-feat-tag">{f.tag}</span>
                </div>
                <h3 className="lp-feat-title">{f.title}</h3>
                <p className="lp-feat-desc">{f.desc}</p>
                <div className="lp-feat-visual">
                  {f.visual}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparison ───────────────────────────────────────────────────── */}
      <section id="comparison" className="lp-section">
        <div className="lp-container">
          <div className="lp-section-head">
            <span className="lp-kicker">Why ReviewSpark</span>
            <h2 className="lp-h2">Traditional methods vs. ReviewSpark AI</h2>
            <p className="lp-section-sub">Stop losing reviews. Start winning reputation.</p>
          </div>

          <div className="lp-comp-wrap">
            <table className="lp-comp-table">
              <thead>
                <tr>
                  <th className="lp-th-cap">Capability</th>
                  <th className="lp-th-old">❌ Old Way</th>
                  <th className="lp-th-new">✓ ReviewSpark</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((r, i) => (
                  <tr key={i}>
                    <td className="lp-td-cap">{r.feature}</td>
                    <td className="lp-td-old">{r.traditional}</td>
                    <td className="lp-td-new">{r.reviewspark}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────────── */}
      <section id="how-it-works" className="lp-section lp-alt">
        <div className="lp-container">
          <div className="lp-section-head">
            <span className="lp-kicker">How It Works</span>
            <h2 className="lp-h2">From counter to Google in 4 steps</h2>
            <p className="lp-section-sub">So simple, even your busiest staff member can set it up in minutes.</p>
          </div>

          <div className="lp-steps">
            {[
              {
                n: '01', title: 'Customer Scans QR',
                desc: 'Scan the acrylic counter stand with any phone camera — no app, no login.',
                visual: (
                  <div className="lp-step-img-box">
                    <img src="/images/phone-scan.jpg" alt="Scan QR" className="lp-step-img" />
                  </div>
                ),
                accent: '',
              },
              {
                n: '02', title: 'Tap 1 to 5 Stars',
                desc: 'Tap-friendly Google-style rating with optional aspects and tags.',
                visual: (
                  <div className="lp-step-stars-box">
                    <div className="lp-step-stars">⭐⭐⭐⭐⭐</div>
                    <div className="lp-step-stars-sub">5.0 · 1 tap experience</div>
                  </div>
                ),
                accent: '',
              },
              {
                n: '03', title: 'AI Writes the Review',
                desc: '4–5★? Instant drafts in English & Hinglish appear for them to edit and post.',
                visual: (
                  <div className="lp-step-draft-box">
                    <div className="lp-step-draft-tabs">
                      <span className="lp-step-draft-tab active">English</span>
                      <span className="lp-step-draft-tab">Hinglish</span>
                    </div>
                    <p className="lp-step-draft-text">&quot;Great experience, staff was super friendly!&quot;</p>
                    <div className="lp-step-draft-cta">Copy & Post →</div>
                  </div>
                ),
                accent: 'lp-step-emerald',
              },
              {
                n: '04', title: 'Low Ratings Stay Private',
                desc: '1–3★ ratings go to your inbox — resolve them before Google ever sees them.',
                visual: (
                  <div className="lp-step-shield-box">
                    <div className="lp-step-shield-icon">🛡️</div>
                    <div className="lp-step-shield-title">Private Feedback Filter</div>
                    <div className="lp-step-shield-sub">Diverted to Owner Inbox</div>
                  </div>
                ),
                accent: 'lp-step-amber',
              },
            ].map((s, i) => (
              <div key={i} className={`lp-step-card ${s.accent}`}>
                <div className="lp-step-num">{s.n}</div>
                <h4 className="lp-step-title">{s.title}</h4>
                <p className="lp-step-desc">{s.desc}</p>
                {s.visual}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Industries ───────────────────────────────────────────────────── */}
      <section id="industries" className="lp-section">
        <div className="lp-container">
          <div className="lp-section-head">
            <span className="lp-kicker">Every Local Business</span>
            <h2 className="lp-h2">Built for Indian local businesses</h2>
            <p className="lp-section-sub">From restaurant tables to clinic counters — ReviewSpark works wherever customers pay.</p>
          </div>

          <div className="lp-ind-grid">
            {industries.map((ind, i) => (
              <div
                key={i}
                className="lp-ind-card"
                style={{
                  backgroundImage: `linear-gradient(160deg, rgba(9, 28, 26, 0.72) 0%, rgba(7, 22, 21, 0.92) 100%), url(${ind.image})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                <span className="lp-ind-icon">{ind.icon}</span>
                <div className="lp-ind-name">{ind.name}</div>
                <div className="lp-ind-placement">{ind.placement}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section id="faq" className="lp-section lp-alt">
        <div className="lp-container">
          <div className="lp-section-head">
            <span className="lp-kicker">FAQ</span>
            <h2 className="lp-h2">Frequently asked questions</h2>
            <p className="lp-section-sub">Everything you need to know about ReviewSpark and Google compliance.</p>
          </div>

          <div className="lp-faq-wrap">
            {faqs.map((faq, i) => {
              const open = openFaq === i;
              return (
                <div key={i} className={`lp-faq-item ${open ? 'open' : ''}`}>
                  <button type="button" className="lp-faq-q" onClick={() => setOpenFaq(open ? null : i)}>
                    <span className="lp-faq-num">0{i + 1}</span>
                    <span className="lp-faq-qtext">{faq.q}</span>
                    <span className="lp-faq-icon">{open ? '−' : '+'}</span>
                  </button>
                  {open && <div className="lp-faq-a">{faq.a}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ───────────────────────────────────────────────────── */}
      <section className="lp-cta-section">
        <div className="lp-cta-glow"></div>
        <div className="lp-container lp-cta-inner">
          <div className="lp-cta-badge">🚀 Start free today — no credit card needed</div>
          <h2 className="lp-cta-h2">
            One QR on your counter.<br />
            <span className="lp-grad">Google reviews on autopilot.</span>
          </h2>
          <p className="lp-cta-sub">
            Join 2,400+ Indian businesses already growing their reputation with ReviewSpark.
          </p>
          <div className="lp-cta-btns">
            <Link href="/login" className="lp-btn-primary lp-btn-lg lp-btn-xl">
              Get Started Free →
            </Link>
            <a href="#how-it-works" className="lp-btn-outline lp-btn-lg">
              Watch How It Works
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
          <div className="lp-footer-brand">
            <Link href="/" className="lp-logo" style={{ fontSize: '1.2rem' }}>
              <span className="lp-logo-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#10b981">
                  <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
                </svg>
              </span>
              Review<span className="lp-logo-spark">Spark</span>
            </Link>
            <p className="lp-footer-tagline">AI-Powered Review & Reputation Platform for Indian Businesses.</p>
          </div>

          <nav className="lp-footer-nav">
            {[
              ['#overview','Overview'],
              ['#features','Features'],
              ['#comparison','Why Us'],
              ['#how-it-works','How It Works'],
              ['#faq','FAQ'],
            ].map(([href, label]) => (
              <a key={href} href={href}>{label}</a>
            ))}
            <Link href="/login">Dashboard</Link>
          </nav>

          <div className="lp-footer-copy">
            <p>© {new Date().getFullYear()} ReviewSpark · All rights reserved · Built for India 🇮🇳</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
