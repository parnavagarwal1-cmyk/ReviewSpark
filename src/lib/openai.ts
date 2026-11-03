/**
 * OpenAI / Google Gemini integration for ReviewSpark.
 *
 * Security & compliance:
 * - API keys are server-side only (GEMINI_API_KEY / GEMINI_API_KEYS or OPENAI_API_KEY, no NEXT_PUBLIC_ prefix)
 * - Multi-key Gemini pool: automatically switches to backup keys when rate limits / quota are reached
 * - No customer PII is stored; only token usage is recorded in ai_usage table
 * - Prompts explicitly instruct the model not to invent specific unmentioned facts
 * - Drafts are clearly labeled as AI suggestions in the UI
 * - Rate limiting is applied at the route level before calling this module
 */

import OpenAI from 'openai';

// ── Multi-Key Gemini Pool & State Tracking ────────────────────────────────────

interface KeyState {
  key: string;
  failedAt: number; // timestamp in ms
  failCount: number;
  lastError?: string;
}

const keyStateMap = new Map<string, KeyState>();
const geminiClientCache = new Map<string, OpenAI>();
export const RATE_LIMIT_COOLDOWN_MS = 60_000; // 60s cooldown before retrying an exhausted key

/**
 * Masks an API key for safe logging (e.g. "AIzaSy...4x8A")
 */
export function maskKey(key: string): string {
  if (!key || key.length < 8) return '***';
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}

/**
 * Extracts and deduplicates all configured Google Gemini API keys.
 * Supports:
 * - GEMINI_API_KEYS="key1,key2,key3" (comma, semicolon, newline, or pipe separated)
 * - GEMINI_API_KEY="key1,key2" or single "key1"
 * - Numbered environment variables: GEMINI_API_KEY_1, GEMINI_API_KEY_2, etc. (up to 20)
 */
export function getGeminiApiKeys(): string[] {
  const rawEntries: string[] = [];

  if (process.env.GEMINI_API_KEYS) {
    rawEntries.push(...process.env.GEMINI_API_KEYS.split(/[\n,;|]+/));
  }

  if (process.env.GEMINI_API_KEY) {
    rawEntries.push(...process.env.GEMINI_API_KEY.split(/[\n,;|]+/));
  }

  for (let i = 1; i <= 20; i++) {
    const val = process.env[`GEMINI_API_KEY_${i}`];
    if (val) {
      rawEntries.push(...val.split(/[\n,;|]+/));
    }
  }

  const unique = new Set<string>();
  for (const raw of rawEntries) {
    const trimmed = raw.trim();
    if (
      trimmed &&
      trimmed.length >= 10 &&
      !trimmed.includes('your-gemini-key-here') &&
      !trimmed.includes('...')
    ) {
      unique.add(trimmed);
    }
  }

  return Array.from(unique);
}

/**
 * Returns current status of all Gemini keys (total, healthy, cooling down)
 */
export function getGeminiKeyStatus(): {
  total: number;
  healthy: number;
  coolingDown: number;
} {
  const keys = getGeminiApiKeys();
  const now = Date.now();
  let coolingDown = 0;

  for (const k of keys) {
    const st = keyStateMap.get(k);
    if (st && now - st.failedAt < RATE_LIMIT_COOLDOWN_MS) {
      coolingDown++;
    }
  }

  return {
    total: keys.length,
    healthy: keys.length - coolingDown,
    coolingDown,
  };
}

/**
 * Resets the cooldown status for all keys (useful for manual sync or testing).
 */
export function resetGeminiKeyCooldowns(): void {
  keyStateMap.clear();
}

/**
 * Returns Gemini keys prioritized:
 * 1. Healthy keys first
 * 2. Keys in cooldown ordered by oldest failure (soonest to recover)
 */
export function getOrderedGeminiKeys(): string[] {
  const keys = getGeminiApiKeys();
  if (keys.length <= 1) return keys;

  const now = Date.now();
  return [...keys].sort((a, b) => {
    const stateA = keyStateMap.get(a);
    const stateB = keyStateMap.get(b);

    const isCoolingA = stateA && now - stateA.failedAt < RATE_LIMIT_COOLDOWN_MS;
    const isCoolingB = stateB && now - stateB.failedAt < RATE_LIMIT_COOLDOWN_MS;

    if (!isCoolingA && isCoolingB) return -1;
    if (isCoolingA && !isCoolingB) return 1;

    // Both cooling or both healthy: oldest failedAt first
    const timeA = stateA?.failedAt ?? 0;
    const timeB = stateB?.failedAt ?? 0;
    return timeA - timeB;
  });
}

function getGeminiClient(apiKey: string): OpenAI {
  let client = geminiClientCache.get(apiKey);
  if (!client) {
    client = new OpenAI({
      apiKey,
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      timeout: 7000, // 7-second timeout so customer never hangs
      maxRetries: 1, // Rapid failover to backup key instead of long backoff
    });
    geminiClientCache.set(apiKey, client);
  }
  return client;
}

/**
 * Returns the Gemini model to use.
 * Defaults to 'gemini-1.5-flash' — Google's fastest, highest-speed production model.
 */
export function getGeminiModel(): string {
  const envModel = process.env.GEMINI_MODEL || process.env.OPENAI_MODEL;
  if (envModel && !envModel.includes('3.5-flash-lite')) {
    return envModel;
  }
  return 'gemini-1.5-flash';
}

/**
 * Checks whether an error is a rate limit, quota exhaustion, or service overload
 * that warrants immediately switching to the next backup API key.
 */
export function isFailoverError(err: unknown): boolean {
  if (!err) return false;
  const status =
    (err as any)?.status ??
    (err as any)?.statusCode ??
    (err as any)?.response?.status;

  if (status === 429 || status === 401 || status === 403 || status === 503) {
    return true;
  }

  const msg = String(
    (err as any)?.message ||
      (err as any)?.error?.message ||
      (err as any)?.code ||
      ''
  ).toLowerCase();

  return (
    msg.includes('429') ||
    msg.includes('quota') ||
    msg.includes('rate limit') ||
    msg.includes('resource_exhausted') ||
    msg.includes('resource exhausted') ||
    msg.includes('too many requests') ||
    msg.includes('limit reached') ||
    msg.includes('exceeded your current quota') ||
    msg.includes('tokens per minute') ||
    msg.includes('requests per minute') ||
    msg.includes('requests per day') ||
    msg.includes('api_key_invalid') ||
    msg.includes('invalid api key') ||
    msg.includes('permission_denied') ||
    msg.includes('overloaded') ||
    msg.includes('capacity')
  );
}

interface ChatCompletionParams {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  max_tokens: number;
  temperature: number;
}

/**
 * Executes a chat completion with automatic multi-key failover:
 * If a Gemini key hits quota / rate limits, it automatically rotates to the next key.
 * If all Gemini keys fail and OpenAI is configured, falls back to OpenAI.
 */
async function executeChatCompletionWithFallback(
  params: ChatCompletionParams
): Promise<{
  response: OpenAI.Chat.Completions.ChatCompletion;
  model: string;
  provider: 'gemini' | 'openai';
  usedKeyMasked?: string;
}> {
  const geminiKeys = getOrderedGeminiKeys();
  const geminiModel = getGeminiModel();

  // 1. Attempt with Google Gemini keys in priority order
  if (geminiKeys.length > 0) {
    let lastGeminiError: any = null;

    for (let i = 0; i < geminiKeys.length; i++) {
      const key = geminiKeys[i];
      const masked = maskKey(key);
      const client = getGeminiClient(key);

      try {
        const response = await client.chat.completions.create({
          model: geminiModel,
          ...params,
        });

        // Key worked! Clear any previous failure state
        if (keyStateMap.has(key)) {
          keyStateMap.delete(key);
        }

        return {
          response,
          model: geminiModel,
          provider: 'gemini',
          usedKeyMasked: masked,
        };
      } catch (err: any) {
        lastGeminiError = err;
        const errMsg = err?.message || String(err);
        const shouldFailover = isFailoverError(err);

        // Mark key state with timestamp
        const state = keyStateMap.get(key) || {
          key,
          failedAt: 0,
          failCount: 0,
        };
        state.failedAt = Date.now();
        state.failCount += 1;
        state.lastError = errMsg;
        keyStateMap.set(key, state);

        const hasMoreKeys = i < geminiKeys.length - 1;
        if (hasMoreKeys && shouldFailover) {
          const nextMasked = maskKey(geminiKeys[i + 1]);
          console.warn(
            `[Gemini Multi-Key] Key #${i + 1} (${masked}) limit/error: "${errMsg}". ` +
              `Switching to backup Key #${i + 2} (${nextMasked})...`
          );
          continue; // Try next Gemini key
        } else if (!hasMoreKeys) {
          console.error(
            `[Gemini Multi-Key] All ${geminiKeys.length} Gemini API key(s) exhausted or failed. Last error: "${errMsg}".`
          );
        } else {
          // Non-failover error (e.g. invalid request format), try next anyway
          console.warn(
            `[Gemini Multi-Key] Error with Key #${i + 1} (${masked}): "${errMsg}". Trying backup key...`
          );
          continue;
        }
      }
    }

    // If all Gemini keys failed, check for OpenAI safety fallback
    const openAiKey = process.env.OPENAI_API_KEY;
    if (openAiKey) {
      console.warn(
        '[AI Multi-Provider] All Gemini keys exhausted. Falling back to OpenAI as secondary provider...'
      );
      const openAiModel = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
      const openAiClient = new OpenAI({ apiKey: openAiKey });
      const response = await openAiClient.chat.completions.create({
        model: openAiModel,
        ...params,
      });
      return { response, model: openAiModel, provider: 'openai' };
    }

    throw (
      lastGeminiError ||
      new Error(
        `All ${geminiKeys.length} configured Gemini API key(s) hit their rate limit or failed.`
      )
    );
  }

  // 2. No Gemini keys configured; check OpenAI
  const openAiKey = process.env.OPENAI_API_KEY;
  if (openAiKey) {
    const openAiModel = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
    const openAiClient = new OpenAI({ apiKey: openAiKey });
    const response = await openAiClient.chat.completions.create({
      model: openAiModel,
      ...params,
    });
    return { response, model: openAiModel, provider: 'openai' };
  }

  throw new Error(
    'Neither GEMINI_API_KEY nor OPENAI_API_KEY is configured. ' +
      'Please set GEMINI_API_KEY in your environment to enable AI review draft generation.'
  );
}

export const OPENAI_MODEL =
  getGeminiApiKeys().length > 0
    ? getGeminiModel()
    : (process.env.OPENAI_MODEL ?? 'gpt-4o-mini');

// Cost per 1M tokens (approximate, update as pricing changes)
const COST_PER_1M_INPUT_TOKENS: Record<string, number> = {
  'gemini-1.5-flash': 0.075,
  'gemini-1.5-flash-8b': 0.0375,
  'gemini-2.0-flash': 0.10,
  'gemini-2.5-flash': 0.075,
  'gemini-1.5-pro': 1.25,
  'gpt-4o-mini': 0.15,
  'gpt-4o': 2.50,
  'gpt-4-turbo': 10.00,
  'gpt-3.5-turbo': 0.50,
};
const COST_PER_1M_OUTPUT_TOKENS: Record<string, number> = {
  'gemini-1.5-flash': 0.30,
  'gemini-1.5-flash-8b': 0.15,
  'gemini-2.0-flash': 0.40,
  'gemini-2.5-flash': 0.30,
  'gemini-1.5-pro': 5.00,
  'gpt-4o-mini': 0.60,
  'gpt-4o': 10.00,
  'gpt-4-turbo': 30.00,
  'gpt-3.5-turbo': 1.50,
};

export function estimateCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const inputCost = (COST_PER_1M_INPUT_TOKENS[model] ?? 0.15) / 1_000_000;
  const outputCost = (COST_PER_1M_OUTPUT_TOKENS[model] ?? 0.60) / 1_000_000;
  return promptTokens * inputCost + completionTokens * outputCost;
}

export interface DraftResult {
  drafts: [string, string];
  tokens_prompt: number;
  tokens_completion: number;
  model: string;
  estimated_cost_usd: number;
}

const STAR_SENTIMENTS: Record<number, string> = {
  1: 'very dissatisfied (1 out of 5 stars - polite critical feedback)',
  2: 'somewhat dissatisfied (2 out of 5 stars - needs improvement)',
  3: 'neutral or mixed experience (3 out of 5 stars - average experience)',
  4: 'satisfied and happy (4 out of 5 stars - positive recommendation)',
  5: 'extremely happy and delighted (5 out of 5 stars - highly recommended)',
};

const STYLE_PERSPECTIVES = [
  'Perspective: First-time visitor who was pleasantly surprised by the warm reception, speed, and ease of service.',
  'Perspective: Straight-to-the-point customer focusing strictly on efficiency, punctuality, and clean environment without fluff.',
  'Perspective: Local resident from the neighborhood who appreciates having such a reliable, genuine service nearby.',
  'Perspective: Relieved customer whose specific issue was diagnosed and handled gently, patiently, and without discomfort.',
  'Perspective: Value-conscious customer who appreciates transparent explanations, fair pricing, and zero pushiness.',
  'Perspective: Walk-in or appointment visitor who noticed great attention to hygiene, respectful staff, and smooth workflow.',
  'Perspective: Highly satisfied customer who felt comfortable from start to finish and would bring family members here.',
];

const LENGTH_PROFILES = [
  {
    d1: 'CRISP & PUNCHY (14–24 words, 1–2 short impactful sentences)',
    d2: 'BALANCED & CONVERSATIONAL (35–55 words, 2–3 sentences)',
  },
  {
    d1: 'DETAILED & DESCRIPTIVE (45–75 words, 3–4 sentences with specific observations)',
    d2: 'SHORT & DIRECT (15–25 words, 1–2 punchy sentences)',
  },
  {
    d1: 'MEDIUM & NATURAL (28–42 words, 2 sentences)',
    d2: 'RICHER NARRATIVE (50–75 words, 3–4 sentences)',
  },
  {
    d1: 'CONCISE RECOMMENDATION (18–28 words)',
    d2: 'MODERATE & DETAILED (35–52 words)',
  },
];

// Emojis should only appear in SOME drafts, never all drafts, and never spam
function getEmojiDirective(rating: number): string {
  if (rating <= 3) {
    return 'NO EMOJIS in either draft. Keep the text clean, respectful, and completely emoji-free.';
  }

  const dice = Math.random();
  if (dice < 0.38) {
    // Draft 1 has zero emojis, Draft 2 has 1-2 emojis
    return 'Draft 1 MUST have ZERO emojis (clean, professional text only). Draft 2 may include 1 or at most 2 natural emojis (e.g. 👍, 😊, ⭐, 💯) placed naturally. Never use more than 2 emojis.';
  } else if (dice < 0.76) {
    // Draft 1 has 1-2 emojis, Draft 2 has zero emojis
    return 'Draft 1 may include 1 or at most 2 natural emojis (e.g. 👍, 😊, ⭐, 💯) placed naturally. Draft 2 MUST have ZERO emojis (clean text only). Never use more than 2 emojis.';
  } else {
    // Neither draft has emojis
    return 'BOTH Draft 1 and Draft 2 MUST have ZERO emojis (completely clean, authentic plain text).';
  }
}

export interface GenerateDraftOptions {
  customContext?: string | null;
  customerNote?: string | null;
  serviceKeywords?: string | null;
  selectedAspects?: string[] | null;
  selectedTags?: string[] | null;
  city?: string | null;
  nearby?: string | null;
  street?: string | null;
  primaryLanguage?: string | null;
  secondaryLanguage?: string | null;
}

/**
 * Generates two review draft options:
 * - Draft 1: Primary language (default English)
 * - Draft 2: Secondary language (default Hinglish)
 * Features dynamic length contrast, varied style perspectives, and selective emojis.
 */
export async function generateReviewDrafts(
  businessName: string,
  businessCategory: string | null,
  businessAddress: string | null,
  rating: number,
  optionsOrCustomContext?: GenerateDraftOptions | string | null,
  legacyCustomerNote?: string | null
): Promise<DraftResult> {
  if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    throw new Error('Rating must be an integer between 1 and 5');
  }

  // Support both legacy signature and options object
  let options: GenerateDraftOptions = {};
  if (typeof optionsOrCustomContext === 'string' || optionsOrCustomContext === null) {
    options = {
      customContext: optionsOrCustomContext,
      customerNote: legacyCustomerNote,
    };
  } else if (optionsOrCustomContext && typeof optionsOrCustomContext === 'object') {
    options = optionsOrCustomContext;
  }

  const sentiment = STAR_SENTIMENTS[rating] ?? 'neutral';

  const categoryContext = businessCategory ? `Category: ${businessCategory}` : '';

  // Location details
  const locParts = [
    options.street,
    options.nearby ? `near ${options.nearby}` : null,
    options.city,
    businessAddress,
  ].filter(Boolean);
  const locationContext = locParts.length > 0 ? `Location: ${locParts.join(', ')}` : '';

  const keywordsContext = options.serviceKeywords?.trim()
    ? `Service SEO Keywords (naturally mention if relevant): ${options.serviceKeywords.trim()}`
    : '';

  const highlightsContext = options.customContext?.trim()
    ? `Business Highlights: ${options.customContext.trim()}`
    : '';

  const aspectsContext =
    options.selectedAspects && options.selectedAspects.length > 0
      ? `Aspects highlighted by customer: ${options.selectedAspects.join(', ')}`
      : '';

  const tagsContext =
    options.selectedTags && options.selectedTags.length > 0
      ? `Customer experience tags: ${options.selectedTags.join(', ')}`
      : '';

  const customerNoteContext = options.customerNote?.trim()
    ? `Customer Personal Note: "${options.customerNote.trim()}"`
    : '';

  const lang1 = options.primaryLanguage?.trim() || 'English';
  const lang2 = options.secondaryLanguage?.trim() || 'Hinglish (conversational Hindi + English blend in Roman script)';

  const stylePerspective =
    STYLE_PERSPECTIVES[Math.floor(Math.random() * STYLE_PERSPECTIVES.length)];
  const lengthProfile =
    LENGTH_PROFILES[Math.floor(Math.random() * LENGTH_PROFILES.length)];
  const emojiDirective = getEmojiDirective(rating);
  const variationSeed = Math.random().toString(36).substring(2, 8);

  const systemPrompt = `You are an authentic Google Review writer for Indian local businesses.
Write EXACTLY 2 distinct, human review drafts:
- "Draft 1:" in natural ${lang1} (${lengthProfile.d1}).
- "Draft 2:" in conversational ${lang2} (${lengthProfile.d2}) in Roman script (e.g. "Staff kaafi polite tha aur service bohot acchi lagi...").

Tone: ${sentiment} (${rating}/5 stars).
Rules: Start directly with observations. Never use clichés ("I recently visited", "Top notch service"). ${emojiDirective}. No fake facts.`;

  const userPrompt = `Business: ${businessName}
${categoryContext}
${locationContext}
${keywordsContext}
${highlightsContext}
${aspectsContext}
${tagsContext}
${customerNoteContext}
Rating: ${rating}/5 stars (${sentiment})
Variety seed: ${variationSeed}

Output:
Draft 1:
Draft 2:`;

  try {
    const { response, model } = await executeChatCompletionWithFallback({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 220,
      temperature: 0.75,
    });

    const content = response.choices[0]?.message?.content ?? '';
    const drafts = parseDrafts(content);

    const tokensPrompt = response.usage?.prompt_tokens ?? 0;
    const tokensCompletion = response.usage?.completion_tokens ?? 0;
    const estimatedCost = estimateCost(model, tokensPrompt, tokensCompletion);

    return {
      drafts,
      tokens_prompt: tokensPrompt,
      tokens_completion: tokensCompletion,
      model,
      estimated_cost_usd: estimatedCost,
    };
  } catch (err) {
    // If all AI calls failed, timed out, or hit limits, provide instant high-quality fallback reviews
    console.warn('[AI Drafts] Network/AI unavailable, using instant contextual fallback:', err);
    const drafts = generateInstantFallbackDrafts(businessName, rating, lang1, lang2, options);
    return {
      drafts,
      tokens_prompt: 0,
      tokens_completion: 0,
      model: 'instant-template-fallback',
      estimated_cost_usd: 0,
    };
  }
}

/**
 * Generates instant customized fallback drafts if AI API times out or is offline.
 * Zero latency, 100% reliable.
 */
export function generateInstantFallbackDrafts(
  businessName: string,
  rating: number,
  lang1 = 'English',
  lang2 = 'Hinglish',
  options?: GenerateDraftOptions
): [string, string] {
  const highlights = options?.selectedTags?.join(', ') || options?.selectedAspects?.join(', ') || '';

  if (rating >= 4) {
    const enOptions = [
      `Really smooth and pleasant experience at ${businessName}. ${highlights ? `Loved the ${highlights}. ` : ''}The staff was courteous, polite, and everything was taken care of quickly. Highly recommended!`,
      `Had a great visit here today. Very professional team and clean, well-maintained setup. ${highlights ? `Special mention to ${highlights}. ` : ''}Will definitely be coming back.`,
      `Great service from start to finish at ${businessName}. Transparent, fast, and very helpful staff. Definitely worth visiting!`,
    ];
    const hiOptions = [
      `Bohot hi badhiya experience raha ${businessName} me. ${highlights ? `${highlights} kaafi accha tha. ` : ''}Staff ka nature bohot helpful aur polite tha. Definitely recommend karunga!`,
      `${businessName} par service kaafi fast aur smooth thi. Staff ne sab acche se explain kiya aur bilkul hassle-free visit raha. 5 stars!`,
      `Kaafi acchi jagah hai aur service bhi 10/10 hai. Sab kuch time pe aur bina kisi problem ke ho gaya. Very happy with the service!`,
    ];

    const d1 = enOptions[Math.floor(Math.random() * enOptions.length)];
    const d2 = hiOptions[Math.floor(Math.random() * hiOptions.length)];
    return [d1, d2];
  } else if (rating === 3) {
    return [
      `Average experience at ${businessName}. Service was okay but there is room for improvement in speed and waiting time.`,
      `Experience theek-thaak tha ${businessName} par. Service normal thi par thoda better kiya ja sakta hai.`,
    ];
  } else {
    return [
      `Expected a much better experience at ${businessName}. The wait time was long and staff coordination could be improved.`,
      `${businessName} me experience itna accha nahi raha. Service kaafi slow thi aur improvement ki zaroorat hai.`,
    ];
  }
}

/**
 * Parses the two draft options from the model's response.
 * Falls back gracefully if the model doesn't follow the exact format.
 */
function parseDrafts(content: string): [string, string] {
  // Try structured parsing first
  const draft1Match = content.match(/Draft\s*1\s*[:：]\s*([\s\S]*?)(?=Draft\s*2\s*[:：]|$)/i);
  const draft2Match = content.match(/Draft\s*2\s*[:：]\s*([\s\S]*?)$/i);

  let d1 = draft1Match?.[1]?.trim() ?? '';
  let d2 = draft2Match?.[1]?.trim() ?? '';

  // Clean any leading/trailing quotes or markdown backticks
  d1 = d1.replace(/^["'`]+|["'`]+$/g, '').trim();
  d2 = d2.replace(/^["'`]+|["'`]+$/g, '').trim();

  if (d1 && d2) {
    return [d1, d2];
  }

  // Fallback: split by double newline
  const parts = content
    .split(/\n\n+/)
    .map((p) => p.replace(/^Draft\s*\d+\s*[:：]\s*/i, '').replace(/^["'`]+|["'`]+$/g, '').trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return [parts[0], parts[1]];
  }

  // Last resort
  const fallback = content.trim() || 'Great service and overall wonderful experience. Highly recommend!';
  return [fallback, fallback];
}

/**
 * Checks if an AI provider API key (Google Gemini or OpenAI) is configured.
 */
export function isOpenAIConfigured(): boolean {
  return getGeminiApiKeys().length > 0 || Boolean(process.env.OPENAI_API_KEY);
}

export const isAIConfigured = isOpenAIConfigured;
