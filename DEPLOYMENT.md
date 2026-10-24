# ReviewSpark Deployment & Production Operations Guide 🚀

This document provides instructions for deploying ReviewSpark to production and running it reliably at scale (1,000+ client businesses and 500,000+ monthly QR scans).

---

## 1. Hosting Architecture Options

### Option A: Vercel (Recommended for simplicity)
Next.js App Router deploys natively on Vercel with zero server maintenance.

1. **Connect Repository:** Import the repository into your Vercel team account.
2. **Configure Environment Variables:** Add all production variables listed in `.env.example`. Ensure `NEXT_PUBLIC_BASE_URL` points to your custom production domain (e.g., `https://reviews.youragency.com`).
3. **Build Command:** `next build`
4. **Edge / Node Runtime:** ReviewSpark's API routes run in Node.js runtime for cryptography, pdf, and canvas support.
5. **Custom Domain & SSL:** Attach your custom root domain or subdomain.

### Option B: Self-Hosted Docker / VPS
For complete data sovereignty or deployment behind dedicated corporate VPCs:

```dockerfile
# Multi-stage production Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["npm", "start"]
```

---

## 2. Database & Supabase Configuration

### Security (Row Level Security & Service Role)
- ReviewSpark connects using `SUPABASE_SERVICE_ROLE_KEY` directly from server-side route handlers.
- External direct queries from browsers are disabled.
- In Supabase > Settings > Database > Connection Pooling:
  - Enable **PgBouncer** connection pooling (Port 6543) if you expect bursty traffic to prevent database connection exhaustion.
  - Connection mode: `Transaction`.

### Database Maintenance
Run monthly vacuum & index maintenance in Supabase SQL Editor:
```sql
VACUUM ANALYZE businesses;
VACUUM ANALYZE scan_events;
VACUUM ANALYZE ai_usage;
```

---

## 3. Upgrading Rate Limiting for Multi-Instance Deployments

The default rate limiter (`src/lib/rateLimit.ts`) uses an in-memory sliding window counter. When running across multiple serverless instances or multi-container clusters, swap this with an Upstash Redis or AWS ElastiCache instance:

```bash
npm install @upstash/ratelimit @upstash/redis
```

Example Upstash integration:
```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
export const draftRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '60 s'),
});
```

---

## 4. Load Testing & Capacity Planning

To verify capacity for 500,000 monthly scans (~12 scans/minute average, with peak surges of 150–300 scans/minute on weekend evenings):

### Testing with `autocannon`
Install `autocannon` globally:
```bash
npm install -g autocannon
```

Benchmark the public review context resolution endpoint:
```bash
autocannon -c 100 -d 30 -m GET "https://yourdomain.com/api/review/context?token=TEST_TOKEN"
```

Benchmark targets:
- **p95 Latency:** < 120ms
- **p99 Latency:** < 250ms
- **Zero 5xx errors under 300 req/sec**

---

## 5. Security & Operational Checklist

- [ ] `ADMIN_PASSWORD_HASH` generated with 12 bcrypt salt rounds via `npm run setup:admin`.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is kept strictly server-side and never prefixed with `NEXT_PUBLIC_`.
- [ ] `OPENAI_API_KEY` set with spending limits enabled in the OpenAI platform dashboard.
- [ ] `AI_DAILY_COST_CAP_USD` configured to guard against denial-of-wallet spikes.
- [ ] Google Cloud Console Places API key restricted by HTTP referrer or IP address.
- [ ] HTTPS enforced with HSTS on your production domain.
- [ ] Privacy policy / Terms of service updated for client marketing assets.
