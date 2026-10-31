import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateReviewDrafts, isOpenAIConfigured, GenerateDraftOptions } from '@/lib/openai';
import { recordEvent, recordAiUsage } from '@/lib/analytics';
import { checkRateLimit, getClientIp, hashIp } from '@/lib/rateLimit';

// POST /api/review/draft — generate AI review drafts (public, rate-limited)
export async function POST(request: NextRequest) {
  // ── Rate limiting: 10 draft requests per IP per minute ────────────────────
  const ip = getClientIp(request);
  const ipHash = hashIp(ip);
  const rateCheck = checkRateLimit(`draft:${ipHash}`, 10, 60_000);

  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment before trying again.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rateCheck.resetAt - Date.now()) / 1000)),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  // ── Parse and validate request ────────────────────────────────────────────
  let body: {
    token?: string;
    rating?: number;
    customer_note?: string;
    selected_aspects?: string[];
    selected_tags?: string[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { token, rating, customer_note, selected_aspects, selected_tags } = body;

  if (!token || typeof token !== 'string' || token.length > 50) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }

  if (!rating || typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json(
      { error: 'Rating must be an integer between 1 and 5' },
      { status: 400 }
    );
  }

  // ── Resolve token to business ─────────────────────────────────────────────
  let businessQuery = await supabase
    .from('businesses')
    .select(
      'id, business_name, address, category, is_active, city, nearby, street, service_keywords, primary_language, secondary_language, custom_context'
    )
    .eq('public_token', token)
    .eq('is_active', true)
    .single();

  if (businessQuery.error) {
    businessQuery = await supabase
      .from('businesses')
      .select('id, business_name, address, category, is_active, custom_context')
      .eq('public_token', token)
      .eq('is_active', true)
      .single();
  }

  const business = businessQuery.data;

  if (businessQuery.error || !business) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  }

  // ── Check AI availability ────────────────────────────────────────────────
  if (!isOpenAIConfigured()) {
    return NextResponse.json(
      {
        error:
          'AI draft generation is not configured. ' +
          'Please set up either your Google Gemini API key or OpenAI API key in settings.',
        ai_unavailable: true,
      },
      { status: 503 }
    );
  }

  // ── Global AI cost cap (configurable daily limit) ─────────────────────────
  const dailyCostCapUsd = parseFloat(process.env.AI_DAILY_COST_CAP_USD ?? '10');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: todayUsage } = await supabase
    .from('ai_usage')
    .select('estimated_cost_usd')
    .gte('created_at', today.toISOString());

  const todayCost = (todayUsage ?? []).reduce(
    (sum, r) => sum + Number(r.estimated_cost_usd),
    0
  );

  if (todayCost >= dailyCostCapUsd) {
    return NextResponse.json(
      {
        error:
          'AI draft generation has reached its daily usage limit. Please try again tomorrow.',
        ai_unavailable: true,
      },
      { status: 503 }
    );
  }

  // ── Extract extra parameters ──────────────────────────────────────────────
  const bizRecord = business as Record<string, unknown>;

  let serviceKeywords = bizRecord.service_keywords as string | undefined;
  let city = bizRecord.city as string | undefined;
  let nearby = bizRecord.nearby as string | undefined;
  let street = bizRecord.street as string | undefined;
  let primaryLang = bizRecord.primary_language as string | undefined;
  let secondaryLang = bizRecord.secondary_language as string | undefined;
  let customContext = bizRecord.custom_context as string | undefined;

  // If structured JSON was stored in custom_context
  if (customContext && customContext.startsWith('{')) {
    try {
      const parsed = JSON.parse(customContext);
      if (parsed._is_structured) {
        serviceKeywords = serviceKeywords || parsed.service_keywords;
        city = city || parsed.city;
        nearby = nearby || parsed.nearby;
        street = street || parsed.street;
        primaryLang = primaryLang || parsed.primary_language;
        secondaryLang = secondaryLang || parsed.secondary_language;
        customContext = parsed.custom_context;
      }
    } catch {
      // ignore
    }
  }

  const draftOptions: GenerateDraftOptions = {
    customContext,
    customerNote: customer_note,
    serviceKeywords,
    selectedAspects: selected_aspects || [],
    selectedTags: selected_tags || [],
    city,
    nearby,
    street,
    primaryLanguage: primaryLang || 'English',
    secondaryLanguage: secondaryLang || 'Hinglish',
  };

  // ── Generate drafts ───────────────────────────────────────────────────────
  try {
    const result = await generateReviewDrafts(
      business.business_name,
      business.category,
      business.address,
      rating,
      draftOptions
    );

    // Record analytics (fire-and-forget)
    recordEvent({
      businessId: business.id,
      eventType: 'draft_generated',
      rating,
      ip,
    });
    recordAiUsage({
      businessId: business.id,
      model: result.model,
      tokensPrompt: result.tokens_prompt,
      tokensCompletion: result.tokens_completion,
      estimatedCostUsd: result.estimated_cost_usd,
    });

    return NextResponse.json({
      drafts: result.drafts,
      business_name: business.business_name,
      rating,
      disclaimer:
        'These are AI-generated suggestions. Review and personalize before continuing to Google.',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI generation failed';
    console.error('[review/draft] error:', err);
    return NextResponse.json(
      { error: `Draft generation failed: ${message}`, ai_unavailable: true },
      { status: 502 }
    );
  }
}
