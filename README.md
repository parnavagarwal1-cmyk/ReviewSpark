# ReviewSpark ⚡

> Turn happy customers into genuine 5-star Google reviews in 30 seconds with AI assistance.

ReviewSpark is a multi-client Google Review enablement platform for agencies and local marketing consultants. It allows a single administrator to manage 1,000+ businesses, generate persistent branded QR codes, download print-ready A4 PDF marketing collateral, and offer customers an AI-assisted natural Hinglish review drafting experience.

---

## 🎯 Key Capabilities

- **Single-Admin Architecture:** Protected admin console with password authentication, session management, and CSRF/secure cookie protections. No public user registration.
- **Client Management & Google Places Resolution:** Add client businesses by Google Maps/Review URL. Validates and resolves business details (Place ID, official business name, address, category) via official Google Places APIs with graceful fallback to manual entry.
- **Permanent Public Tokens (`/r/:token`):** QR codes encode permanent vanity URLs on your domain. Updating client destinations or details never requires reprinting physical collateral.
- **Natural Hinglish AI Review Drafts:** OpenAI-powered draft generator provides 2 natural, rating-consistent suggestions per generation based strictly on business context and the customer's selected star rating.
- **Anti-Gating & Policy Compliance:** Full adherence to Google Review and Places policies:
  - All 1-to-5 star ratings are permitted without gating or filtering.
  - Reviews are never auto-posted to Google — the user reviews, copies, and manually submits on Google.
  - No scraping of Google Maps HTML; only official APIs are queried with 1-hour cache enforcement.
- **High-Resolution QR & Print-Ready PDF Assets:** Local offline generation of PNG (1K/2K resolution) and ready-to-print A4 PDF standees with quiet zones, cut marks, and custom business typography.
- **Analytics & Funnel Tracking:** Track QR scans, draft generation counts, copy button clicks, and "Continue to Google" referrals with token usage and cost monitoring.
- **Designed for Scale:** Engineered for 1,000+ businesses and 500,000+ monthly QR scans with database indexes, sliding-window rate limiting, and privacy-preserving IP hashing.

---

## 🧱 Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript 5 (Strict Mode)
- **Database:** PostgreSQL via Supabase
- **Authentication:** Custom bcrypt password verification + cryptographically random 256-bit session tokens stored in secure, `httpOnly` cookies
- **AI Engine:** OpenAI API (`gpt-4o-mini` default, configurable)
- **QR & PDF Generation:** `qrcode` & `jspdf`
- **Testing:** Jest + `ts-jest`
- **Styling:** CSS variables, responsive mobile-first dark admin theme and warm customer review theme

---

## 🚀 Quick Start & Local Setup

### 1. Prerequisites
- Node.js 18.18+ or 20+
- A Supabase account (free tier works for dev)
- OpenAI API key
- Google Cloud API key with **Places API (New)** enabled (optional; manual fallback available)

### 2. Install Dependencies
```bash
npm install
```

### 3. Database Setup (Supabase)
1. In your Supabase dashboard, navigate to the **SQL Editor**.
2. Run the migration scripts in order:
   - [`migrations/001_initial.sql`](./migrations/001_initial.sql) (creates tables: `businesses`, `admin_sessions`, `scan_events`, `ai_usage`)
   - [`migrations/002_indexes.sql`](./migrations/002_indexes.sql) (creates performance and monthly reporting indexes)

### 4. Generate Admin Password Hash
Run the interactive CLI helper:
```bash
npm run setup:admin
```
Enter your desired strong admin password. Copy the resulting bcrypt hash output.

### 5. Configure Environment Variables
Copy the template and fill in your credentials:
```bash
cp .env.example .env.local
```

Key environment variables:
| Variable | Description |
|---|---|
| `NEXT_PUBLIC_BASE_URL` | Domain where ReviewSpark is hosted (e.g., `http://localhost:3000` or `https://reviews.yourdomain.com`) |
| `SUPABASE_URL` | Supabase Project URL (`https://xyz.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Secret Key (server-side only) |
| `ADMIN_PASSWORD_HASH` | Bcrypt hash generated in Step 4 |
| `OPENAI_API_KEY` | OpenAI API key (`sk-...`) |
| `OPENAI_MODEL` | (Optional) Defaults to `gpt-4o-mini` |
| `AI_DAILY_COST_CAP_USD` | (Optional) Daily cost cap in USD (default: `10.00`) |
| `GOOGLE_PLACES_API_KEY` | Google Places API key (optional for auto-resolution) |
| `IP_HASH_SECRET` | Secret salt for HMAC IP hashing |

### 6. Run the Application
```bash
# Development mode
npm run dev

# Production build & start
npm run build
npm start
```
Open [http://localhost:3000/login](http://localhost:3000/login) to log into the admin dashboard.

---

## 🧪 Running Tests & Quality Checks

ReviewSpark includes unit and integration tests covering authentication, rate limiting, QR code generation, URL validation, and AI prompt utilities:

```bash
# Run unit test suite
npm test

# Run test coverage
npm run test:coverage

# Run linter
npm run lint
```

---

## 🛡️ Security & Privacy Guardrails

1. **Zero Secret Leakage:** All secrets (`SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `ADMIN_PASSWORD_HASH`, `GOOGLE_PLACES_API_KEY`) are accessed strictly in server routes.
2. **Privacy-Preserving IP Hashing:** Scan and draft rate limiting uses HMAC-SHA256 hashed IPs with a secret salt. Raw customer IP addresses are never persisted to the database.
3. **No Review Hallucination:** System prompts strictly forbid inventing staff interactions, specific dishes ordered, or fabricated events.
4. **No Customer Login:** Customers scan and rate without account creation, forms, or tracking cookies.
5. **Open Redirect Prevention:** All external Google URLs are strictly validated to official Google domains before redirects or links are rendered.

---

## 📈 Scalability (1,000 Clients / 500,000 Monthly Scans)

- **Lightweight Context Resolution:** Public QR requests query a single indexed lookup on `public_token`.
- **Google API Cache:** Official Place details and review destinations are cached in PostgreSQL. Google's API is never queried during customer scan visits.
- **Sliding-Window Rate Limiting:**
  - AI generation: 10 requests / min per IP.
  - Scan logging: 60 requests / min per IP.
  - Global AI daily dollar cap prevents runaway billing.
- **Load Testing Recommendation:**
  - For high scale (500k+ monthly scans), deploy on Vercel Pro or a multi-container Docker cluster behind an AWS ALB or Cloudflare.
  - Use `k6` or `autocannon` to benchmark `/r/:token` with 500 req/sec target throughput.

---

## 📄 License
Private commercial software. All rights reserved.
