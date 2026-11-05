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
    const cleaned = raw.replace(/^["'\s]+|["'\s]+$/g, '').trim();
    if (
      cleaned &&
      cleaned.length >= 10 &&
      !cleaned.includes('your-gemini-key-here') &&
      !cleaned.includes('...')
    ) {
      unique.add(cleaned);
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

let roundRobinCounter = 0;

/**
 * Returns Gemini keys prioritized:
 * 1. Healthy keys first (rotated in round-robin order so every request uses the next key)
 * 2. Keys in cooldown ordered by oldest failure (soonest to recover)
 */
export function getOrderedGeminiKeys(): string[] {
  const keys = getGeminiApiKeys();
  if (keys.length <= 1) return keys;

  const now = Date.now();
  const healthyKeys: string[] = [];
  const coolingKeys: string[] = [];

  for (const k of keys) {
    const st = keyStateMap.get(k);
    if (st && now - st.failedAt < RATE_LIMIT_COOLDOWN_MS) {
      coolingKeys.push(k);
    } else {
      healthyKeys.push(k);
    }
  }

  // Round-robin rotation across healthy keys: distributes load evenly across all keys
  let orderedHealthy: string[] = [];
  if (healthyKeys.length > 0) {
    const startIdx = roundRobinCounter % healthyKeys.length;
    roundRobinCounter = (roundRobinCounter + 1) % 1000000;
    orderedHealthy = [
      ...healthyKeys.slice(startIdx),
      ...healthyKeys.slice(0, startIdx),
    ];
  }

  // Sort cooling keys by oldest failure first (soonest to recover)
  coolingKeys.sort((a, b) => {
    const timeA = keyStateMap.get(a)?.failedAt ?? 0;
    const timeB = keyStateMap.get(b)?.failedAt ?? 0;
    return timeA - timeB;
  });

  return [...orderedHealthy, ...coolingKeys];
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
  const envModel = process.env.GEMINI_MODEL;
  if (
    envModel &&
    (envModel.startsWith('gemini-') ||
      envModel.includes('flash') ||
      envModel.includes('pro'))
  ) {
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

interface GeminiDirectResult {
  text: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Direct native Google Gemini REST API caller.
 * Bypasses SDK wrapper layers for maximum speed, zero header conflicts, and 100% reliability.
 */
async function callGeminiDirectRest(
  apiKey: string,
  modelName: string,
  systemInstruction: string,
  userPrompt: string,
  temperature = 1.0
): Promise<GeminiDirectResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: systemInstruction ? `${systemInstruction}\n\n${userPrompt}` : userPrompt },
        ],
      },
    ],
    generationConfig: {
      temperature,
      topP: 0.95,
      maxOutputTokens: 600,
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`Gemini REST ${res.status}: ${errorText.slice(0, 160)}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini returned empty response candidate');
  }

  const usage = data?.usageMetadata;
  const promptTokens = Number(usage?.promptTokenCount) || 450;
  const completionTokens = Number(usage?.candidatesTokenCount) || 150;
  const totalTokens = Number(usage?.totalTokenCount) || promptTokens + completionTokens;

  return {
    text,
    promptTokens,
    completionTokens,
    totalTokens,
  };
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

      try {
        // Try direct official Google Gemini REST API first (fastest, most reliable)
        const systemMsg = params.messages.find((m) => m.role === 'system')?.content || '';
        const userMsg = params.messages.find((m) => m.role === 'user')?.content || '';

        const directResult = await callGeminiDirectRest(
          key,
          geminiModel,
          systemMsg,
          userMsg,
          params.temperature
        );

        if (keyStateMap.has(key)) {
          keyStateMap.delete(key);
        }

        const simulatedResponse: OpenAI.Chat.Completions.ChatCompletion = {
          id: `gemini-${Date.now()}`,
          choices: [
            {
              finish_reason: 'stop',
              index: 0,
              logprobs: null,
              message: {
                role: 'assistant',
                content: directResult.text,
                refusal: null,
              },
            },
          ],
          created: Math.floor(Date.now() / 1000),
          model: geminiModel,
          object: 'chat.completion',
          usage: {
            prompt_tokens: directResult.promptTokens,
            completion_tokens: directResult.completionTokens,
            total_tokens: directResult.totalTokens,
          },
        };

        return {
          response: simulatedResponse,
          model: geminiModel,
          provider: 'gemini',
          usedKeyMasked: masked,
        };
      } catch (directErr: any) {
        // Direct REST failed, try OpenAI SDK compatibility as secondary Gemini mechanism
        try {
          const client = getGeminiClient(key);
          const response = await client.chat.completions.create({
            model: geminiModel,
            ...params,
          });

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
          lastGeminiError = err || directErr;
          const errMsg = err?.message || directErr?.message || String(err);
          const shouldFailover = isFailoverError(err) || isFailoverError(directErr);

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
            console.warn(
              `[Gemini Multi-Key] Error with Key #${i + 1} (${masked}): "${errMsg}". Trying backup key...`
            );
            continue;
          }
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
  drafts: [string, string, string];
  tokens_prompt: number;
  tokens_completion: number;
  model: string;
  estimated_cost_usd: number;
}

// ── Anti-Duplication Cache (Stores recent review openings per business) ──────
const recentReviewsCache = new Map<string, string[]>();

export function recordRecentReview(businessKey: string, draft: string): void {
  if (!draft || draft.length < 20) return;
  const key = businessKey.toLowerCase().trim();
  const list = recentReviewsCache.get(key) || [];
  const snippet = draft.replace(/\s+/g, ' ').trim().slice(0, 90);
  if (!list.includes(snippet)) {
    list.unshift(snippet);
    if (list.length > 15) list.pop();
    recentReviewsCache.set(key, list);
  }
}

export function getRecentReviews(businessKey: string): string[] {
  return recentReviewsCache.get(businessKey.toLowerCase().trim()) || [];
}

const STAR_SENTIMENTS: Record<number, string> = {
  1: 'very dissatisfied (1 out of 5 stars - polite critical feedback)',
  2: 'somewhat dissatisfied (2 out of 5 stars - needs improvement)',
  3: 'neutral or mixed experience (3 out of 5 stars - average experience)',
  4: 'satisfied and happy (4 out of 5 stars - positive recommendation)',
  5: 'extremely happy and delighted (5 out of 5 stars - highly recommended)',
};

const STYLE_PERSPECTIVES = [
  'Angle 1 (Ambiance & Vibe): Focus on the ambient environment, aesthetic seating, peaceful setup, and welcoming aura upon entering.',
  'Angle 2 (Specific Craftsmanship & Quality): Focus on the high standard of service delivered, meticulous attention to detail, and impressive end results.',
  'Angle 3 (Staff Hospitality & Courtesy): Focus on how polite, respectful, and accommodating the staff members were without being pushy or rushed.',
  'Angle 4 (Speed & Seamless Workflow): Focus on punctual execution, prompt responses, fast turnaround, and zero unnecessary waiting time.',
  'Angle 5 (Value & Transparent Pricing): Focus on reasonable and honest rates, clear guidance, great value for every rupee spent, and zero hidden charges.',
  'Angle 6 (Local Neighborhood Gem): Focus on discovering a reliable, genuine establishment right in this neighborhood that stands out from the rest.',
  'Angle 7 (Group / Family Outing): Focus on visiting with friends or family members who all thoroughly appreciated the comfortable atmosphere and care.',
  'Angle 8 (Cleanliness & Hygiene Focus): Focus on spotless hygiene standards, organized workstation, and thoughtful customer comfort.',
  'Angle 9 (Problem Solved & Relief): Focus on having a specific requirement addressed smoothly, patiently, and beyond expectations.',
  'Angle 10 (Return Regular): Focus on consistent excellence across visits, proving that their high standards are dependable every single time.',
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
  selectedLanguage?: string | null;
  attempt?: number;
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

  const selectedLang = (options.selectedLanguage || options.primaryLanguage || 'English').trim();
  const isHinglish = selectedLang.toLowerCase().includes('hinglish');
  const isHindi = selectedLang.toLowerCase() === 'hindi' || selectedLang.toLowerCase().includes('हिंदी');

  const langDesc = isHinglish
    ? 'conversational Hinglish (Hindi + English blend in Roman script, e.g. "Service bohot acchi thi aur staff kaafi cooperative tha...")'
    : isHindi
    ? 'Hindi in Devanagari script'
    : 'natural fluent English';

  // Select THREE distinct perspectives so Draft 1, Draft 2, and Draft 3 have completely different flavors
  const shuffledPerspectives = [...STYLE_PERSPECTIVES].sort(() => Math.random() - 0.5);
  const perspective1 = shuffledPerspectives[0];
  const perspective2 = shuffledPerspectives[1];
  const perspective3 = shuffledPerspectives[2] || shuffledPerspectives[0];
  const emojiDirective = getEmojiDirective(rating);
  const variationSeed = Math.random().toString(36).substring(2, 8);

  const systemPrompt = `You are an authentic, thoughtful Google Review writer for Indian local businesses.
Write EXACTLY 3 distinct, human review options in ${selectedLang}:
- "Draft 1:" around 45–55 words (strictly 4 complete sentences) in ${selectedLang}. Focus: ${perspective1}
- "Draft 2:" around 45–55 words (strictly 4 complete sentences) in ${selectedLang}. Focus: ${perspective2}
- "Draft 3:" around 45–55 words (strictly 4 complete sentences) in ${selectedLang}. Focus: ${perspective3}

CRITICAL SINGLE-LANGUAGE RULE:
- ALL THREE Draft 1, Draft 2, and Draft 3 MUST be written 100% in ${selectedLang.toUpperCase()} (${langDesc}).
- Do NOT output different languages. All 3 options must be in ${selectedLang}.

CRITICAL MANDATORY LENGTH RULE (APPROX 50 WORDS / 4 SENTENCES):
- Each draft MUST be between 45 and 55 words long (4 full, descriptive sentences).
- DO NOT generate short 20–30 word reviews. Substantive, descriptive details are required for every draft.
- Structure of each draft:
  * Sentence 1: Direct, concrete observation upon arrival or service inquiry.
  * Sentence 2: Specific detail regarding the quality of execution, item, or ambiance.
  * Sentence 3: Observation on staff demeanor, hygiene, speed, or fair pricing.
  * Sentence 4: Natural recommendation mentioning the neighborhood or specific service.

CRITICAL BANNED CLICHÉS (NEVER USE ANY OF THESE):
- "This is such a lovely spot"
- "The atmosphere is really chill"
- "makes for a perfect place to hang out"
- "I had a great experience here"
- "I recently visited"
- "Top notch service"
- "Must visit place"
- "A gem of a place"
- "Great place"

CRITICAL SEO & GOOGLE MAPS RANKING RULE:
- Naturally weave 1 or 2 of the provided "Service SEO Keywords" or local area landmarks into the sentences (e.g. naming the exact service received or neighborhood).
- Keep it 100% conversational and authentic — never stuff keywords unnaturally.

Tone: ${sentiment} (${rating}/5 stars). ${emojiDirective}. No fabricated claims.`;

  const recent = getRecentReviews(businessName);
  const deduplicationPrompt =
    recent.length > 0
      ? `\nCRITICAL ANTI-DUPLICATION RULE (DO NOT REPEAT):
The following reviews were recently generated for this business:
${recent.slice(0, 5).map((r, i) => `Previous #${i + 1}: "${r}..."`).join('\n')}
DO NOT reuse the same opening line, same sentence structure, or same phrasing as above. Write 3 completely fresh, original reviews with totally unique openings and wording.\n`
      : '';

  const userPrompt = `Business: ${businessName}
${categoryContext}
${locationContext}
${keywordsContext}
${highlightsContext}
${aspectsContext}
${tagsContext}
${customerNoteContext}
${deduplicationPrompt}
Draft 1 Theme: ${perspective1}
Draft 2 Theme: ${perspective2}
Draft 3 Theme: ${perspective3}
Rating: ${rating}/5 stars (${sentiment})
Requested Language: ${selectedLang}
Rewrite Attempt: ${options.attempt ?? 1}
Unique Request Seed: ${variationSeed}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}
Provide 3 fresh and completely unique reviews.

Output format:
Draft 1:
Draft 2:
Draft 3:`;

  try {
    const { response, model } = await executeChatCompletionWithFallback({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 650,
      temperature: 1.0,
    });

    const content = response.choices[0]?.message?.content ?? '';
    const drafts = parseDrafts(content);

    // Save to anti-duplication memory so subsequent customers get different phrasing
    recordRecentReview(businessName, drafts[0]);
    recordRecentReview(businessName, drafts[1]);
    recordRecentReview(businessName, drafts[2]);

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
    const drafts = generateInstantFallbackDrafts(businessName, rating, selectedLang, selectedLang, options);
    recordRecentReview(businessName, drafts[0]);
    recordRecentReview(businessName, drafts[1]);
    recordRecentReview(businessName, drafts[2]);
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
 * Picks three distinct elements from an array with uniform pseudo-random hash distribution.
 */
function pickThreeDistinct<T>(arr: T[], seed?: number): [T, T, T] {
  if (arr.length <= 1) return [arr[0], arr[0], arr[0]];
  if (arr.length === 2) return [arr[0], arr[1], arr[0]];
  if (arr.length === 3) return [arr[0], arr[1], arr[2]];

  let hash = 0;
  if (typeof seed === 'number' && Number.isFinite(seed) && seed > 0) {
    const s = Math.abs(seed);
    const x = Math.sin(s * 9973 + 12345) * 10000;
    hash = Math.floor((x - Math.floor(x)) * 1000000);
  } else {
    hash = Math.floor(Math.random() * 1000000);
  }

  const i1 = Math.abs(hash) % arr.length;
  const off1 = 1 + (Math.abs(Math.floor(hash / arr.length)) % (arr.length - 1));
  const i2 = (i1 + off1) % arr.length;
  const off2 = 1 + (Math.abs(Math.floor(hash / (arr.length * 3 + 7))) % (arr.length - 2));
  let i3 = (i2 + off2) % arr.length;
  if (i3 === i1 || i3 === i2) {
    i3 = (i3 + 1) % arr.length;
    if (i3 === i1 || i3 === i2) i3 = (i3 + 1) % arr.length;
  }

  return [arr[i1], arr[i2], arr[i3]];
}

/**
 * Generates instant customized fallback drafts if AI API times out or is offline.
 * Zero latency, 100% reliable with diverse rotating templates.
 */
export function generateInstantFallbackDrafts(
  businessName: string,
  rating: number,
  lang1 = 'English',
  lang2 = 'Hinglish',
  options?: GenerateDraftOptions
): [string, string, string] {
  const attemptSeed =
    typeof options?.attempt === 'number'
      ? options.attempt
      : Math.floor(Math.random() * 100000) + Date.now();
  const kwList = options?.serviceKeywords
    ? options.serviceKeywords.split(/[,|;]+/).map((k) => k.trim()).filter(Boolean)
    : [];
  const primaryKw = kwList.length > 0 ? kwList[Math.abs(attemptSeed) % kwList.length] : '';
  const highlights = primaryKw || options?.selectedTags?.join(', ') || options?.selectedAspects?.join(', ') || '';
  const isHinglish =
    (options?.selectedLanguage || lang1 || '').toLowerCase().includes('hinglish');

  if (rating >= 4) {
    const enOptions = [
      `Really smooth and pleasant experience at ${businessName}. ${highlights ? `Special mention to ${highlights} which was outstanding. ` : ''}The team was courteous, attentive, and everything was handled efficiently without any unnecessary waiting time. Clean environment and excellent overall service. Highly recommended to anyone looking for genuine quality!`,
      `Had a fantastic visit here today. The staff at ${businessName} was extremely helpful, professional, and patient throughout. ${highlights ? `Loved their focus on ${highlights}. ` : ''}Everything was transparent and fairly handled. Will definitely be visiting again with friends and family. 5 stars well deserved!`,
      `Outstanding service from start to finish at ${businessName}. Punctual, respectful, and very well-organized workflow. ${highlights ? `Appreciated the high standard of ${highlights}. ` : ''}They truly value their customers and take pride in their work. Would happily recommend them to anyone in the area!`,
      `Impressed with the professionalism and care shown at ${businessName}. From the moment I arrived, everything was seamless and well taken care of. ${highlights ? `Their attention to ${highlights} really made a difference. ` : ''}Honest guidance, great hygiene, and top-tier support. A solid 10/10 in every aspect.`,
      `One of the most reliable and customer-friendly places I have visited. ${businessName} has maintained exceptional standards throughout. ${highlights ? `Their expertise with ${highlights} stood out clearly. ` : ''}Quick turnaround, fair treatment, and very welcoming atmosphere. Will surely recommend them to everyone around.`,
      `Truly exceptional experience at ${businessName}. The entire staff goes above and beyond to make sure you are comfortable and satisfied. ${highlights ? `The quality of ${highlights} was especially impressive. ` : ''}Clear communication and zero hassle from start to finish. Definitely coming back!`,
      `Super happy with the service received today at ${businessName}. Everything was on schedule, clean, and managed with utmost courtesy. ${highlights ? `Big thumbs up for their focus on ${highlights}. ` : ''}It is rare to see such consistency and dedication. Keep up the wonderful work!`,
      `A thoroughly positive experience at ${businessName}. Every detail was handled with precision and a friendly smile. ${highlights ? `Very grateful for how well they managed ${highlights}. ` : ''}Fast, honest, and truly professional in their field. Five stars without any second thought!`,
      `Came here on a neighbor's strong suggestion and it exceeded all expectations. The team at ${businessName} is honest, fast, and remarkably skilled. ${highlights ? `Very pleased with their work on ${highlights}. ` : ''}Comfortable setup and fair pricing. Five stars!`,
      `Zero hassle, quick response, and very polite customer handling. ${businessName} sets a genuine benchmark for local service. ${highlights ? `They handled ${highlights} with great skill. ` : ''}Will definitely recommend them to all my friends and family!`,
      `Great attention to detail and a very welcoming environment. Everything was clearly explained without unnecessary charges or delays at ${businessName}. ${highlights ? `Special appreciation for ${highlights}. ` : ''}A truly wonderful experience!`,
      `From initial greeting to final completion, everything was seamless. Professional attitude, punctual execution, and great hygiene standards at ${businessName}. ${highlights ? `Loved the outcome of ${highlights}. ` : ''}Keep up the brilliant standard!`,
      `Top tier customer care! ${businessName} resolved my requirement much faster than anticipated. Courteous staff, honest advice, and very reasonable pricing. ${highlights ? `Their ${highlights} is truly praiseworthy. ` : ''}Completely satisfied!`,
      `Remarkable experience today. Very rare to find such patient, respectful, and well-organized teams. ${businessName} is easily my top recommendation in the area! ${highlights ? `High marks for ${highlights}. ` : ''}`,
      `Extremely pleased with how everything was handled. Prompt, transparent, and completely stress-free experience from start to finish at ${businessName}. ${highlights ? `Special mention to ${highlights}. ` : ''}Big thumbs up!`,
      `Worth every single rupee. Friendly staff, immaculate cleanliness, and fast turnaround at ${businessName}. ${highlights ? `Super impressed with ${highlights}. ` : ''}Will gladly visit again!`,
    ];

    const hiOptions = [
      `Bohot hi badhiya experience raha ${businessName} me. ${highlights ? `${highlights} waqai me kaafi zabardast tha. ` : ''}Staff ka nature bohot polite aur helpful tha, inhone bina kisi jaldbaazi ke sab kuch patiently handle kiya. Cleanliness aur service dono top-notch hain. Definitely sabko recommend karunga!`,
      `${businessName} par service kaafi fast aur smooth thi. Staff ne sab kuch acche se explain kiya aur poora process bilkul hassle-free raha. ${highlights ? `Khaaskar ${highlights} ne dil jeet liya. ` : ''}Itna accha treatment dekh kar bohot khushi hui. Aage bhi yahin aana pasand karunga!`,
      `Kaafi acchi jagah hai aur yahan ki service waqai 10/10 hai. Sab kuch time pe hua aur staff ne respectful tareeqe se attend kiya. ${highlights ? `Inki ${highlights} service kaafi genuine lagi. ` : ''}Aise honest aur helpful log milna mushkil hai. Very happy with the overall service!`,
      `${businessName} me visit karke kaafi satisfaction mila. Staff bohot cooperative hai aur har query ko acche se address karte hain. ${highlights ? `Khas taur par ${highlights} ki quality lajawab thi. ` : ''}Pura mahaul clean aur professional hai. Meri taraf se 5 stars!`,
      `Sach me bohot shaandar experience raha ${businessName} ke saath. Service bina kisi delay ke fast tareeqe se deliver hui. ${highlights ? `${highlights} ki wajah se visit aur bhi memorable ban gayi. ` : ''}Jo log genuine aur trusted place dhoondh rahe hain unke liye best recommendation hai.`,
      `Har tarah se perfect visit tha ${businessName} me. Staff ka behavior polite aur welcoming tha, kisi bhi cheez ka pressure nahi diya. ${highlights ? `Inhone ${highlights} par khas dhyan diya jo bohot pasand aaya. ` : ''}Definitely apne doston aur family ko recommend karunga!`,
      `Bohot clean, hygienic aur well-managed place hai ${businessName}. Inka workflow bohot organized hai aur customer ko bilkul wait nahi karwate. ${highlights ? `${highlights} waqai worth it tha. ` : ''}Aisi high quality service provide karne ke liye thank you team!`,
      `First time visit tha ${businessName} me aur expectations se bhi kaafi behtar laga. Transparency aur customer comfort inki priority lagti hai. ${highlights ? `${highlights} ka kaam bilkul perfect tha. ` : ''}Aage ke liye mera permanent go-to spot ban gaya hai!`,
      `Dost ke kehne par yahan aaya tha aur waqai maza aa gaya. ${businessName} ka staff bohot polite aur genuine hai. ${highlights ? `${highlights} ka kaam bilkul time par hua. ` : ''}Kisi tarah ki koi pareshani nahi hui. Highly recommended!`,
      `Ekdum hassle-free aur transparent service mili yahan. Koi extra ya hidden charges nahi, sab kuch clear bataya. ${businessName} definitely 5 star deserve karta hai! ${highlights ? `Khaaskar ${highlights} bohot accha tha. ` : ''}`,
      `Punctuality aur customer handling inki sabse badi khoobi hai. Reception se lekar kaam complete hone tak sab kuch smoothly hua. ${highlights ? `Inhone ${highlights} par pura focus diya. ` : ''}Bohot khushi hui yahan aakar!`,
      `Aisi genuine aur honest service aaj kal milna mushkil hai. ${businessName} ki team ne bohot patience ke saath attend kiya. ${highlights ? `Inka ${highlights} support lajawab tha. ` : ''}Definitely sabko aana chahiye!`,
      `Super fast work aur bilkul relaxed mahaul. Staff bohot cooperative hai aur bilkul wait nahi karwaya. ${businessName} se behtar service aas-paas kahi nahi milegi! ${highlights ? `Big thumbs up for ${highlights}. ` : ''}`,
      `Pura process bohot systematic tha. Professionalism aur cleanliness dono top-notch hain. ${highlights ? `${highlights} waqai worth it tha. ` : ''}Aage se family ke liye bhi permanent yahin aayenge!`,
      `Dil khush ho gaya inki service dekh kar. Jo promise kiya tha bilkul wahi deliver kiya time par. ${highlights ? `Inka ${highlights} treatment bohot gentle tha. ` : ''}Great job ${businessName} team!`,
      `Paisa vasool experience raha ${businessName} par. Har choti detail ka dhyan rakha aur respect ke saath baat ki. ${highlights ? `Khaskar ${highlights} ne dil jeet liya. ` : ''}Bilkul 5 star service hai!`,
    ];

    return isHinglish
      ? pickThreeDistinct(hiOptions, attemptSeed)
      : pickThreeDistinct(enOptions, attemptSeed);
  } else if (rating === 3) {
    const en3Options = [
      `Decent experience overall at ${businessName}. While the main service was satisfactory, the waiting time was longer than expected and staff coordination could have been smoother. Hope to see better turnaround time in the future.`,
      `Mixed experience today. The team was polite but the turnaround was slower than expected. Decent place but has room for operational improvements during rush hours.`,
      `Average visit at ${businessName}. Service quality was acceptable, but communication could have been clearer regarding wait times. Adequate for basic requirements.`,
      `Okay experience. Staff was courteous, but the workflow felt slightly disorganized today. With better queue management this place can improve significantly.`,
    ];
    const hi3Options = [
      `Experience theek-thaak raha ${businessName} par. Kaam to ho gaya lekin wait time kaafi zyada tha aur thoda crowd management improve karne ki zaroorat hai. Overall average visit tha.`,
      `Thoda mixed experience raha. Staff helpful tha lekin response time slow tha. Aage thode improvements aur timely coordination ki umeed hai.`,
      `Average visit raha ${businessName} me. Service mein koi khas complaint nahi hai lekin process ko thoda aur fast aur organized banaya ja sakta hai.`,
      `Kaam ho gaya par thodi confusion thi staff ke beech. Polite hain log, lekin rush ke time customer handling better honi chahiye.`,
    ];

    return isHinglish
      ? pickThreeDistinct(hi3Options, attemptSeed)
      : pickThreeDistinct(en3Options, attemptSeed);
  } else {
    const enBadOptions = [
      `Disappointed with the experience at ${businessName}. The wait time was excessively long and the communication was lacking. Management needs to pay more attention to customer satisfaction and service speed.`,
      `Unhappy with the visit today. Expected much better customer service and responsiveness. Needs serious attention to turnaround time and staff coordination.`,
      `Poor experience at ${businessName}. Did not receive proper guidance and had to wait far too long without updates. Needs substantial improvement in service delivery.`,
      `Not satisfied with the service provided today. Staff seemed indifferent to delays and the workflow was messy. Would hesitate to recommend until management improves.`,
    ];
    const hiBadOptions = [
      `${businessName} par experience bilkul accha nahi raha. Staff ne theek se respond nahi kiya aur kaafi der intezar karna pada. Service quality aur coordination me kaafi improvement chahiye.`,
      `Kaafi disappointed hoon yahan ki service se. Wait time bahut zyada tha aur proper guidance nahi mili. Management ko customer feedback par serious dhyan dena chahiye.`,
      `Visit bilkul satisfactory nahi rahi. Response time bohot slow tha aur staff attentive nahi lag raha tha. Basic customer service standards improve karne ki sakht zaroorat hai.`,
      `Expectations se kaafi neeche rahi service. Time management bilkul kharab tha aur queries par proper dhyan nahi diya gaya. Kaafi disappointed feel hua.`,
    ];

    return isHinglish
      ? pickThreeDistinct(hiBadOptions, attemptSeed)
      : pickThreeDistinct(enBadOptions, attemptSeed);
  }
}

/**
 * Parses the three draft options from the model's response.
 * Falls back gracefully if the model doesn't follow the exact format.
 */
function parseDrafts(content: string): [string, string, string] {
  // Try structured regex parsing first
  const draft1Match = content.match(/Draft\s*1\s*[:：]\s*([\s\S]*?)(?=Draft\s*2\s*[:：]|$)/i);
  const draft2Match = content.match(/Draft\s*2\s*[:：]\s*([\s\S]*?)(?=Draft\s*3\s*[:：]|$)/i);
  const draft3Match = content.match(/Draft\s*3\s*[:：]\s*([\s\S]*?)$/i);

  let d1 = draft1Match?.[1]?.trim() ?? '';
  let d2 = draft2Match?.[1]?.trim() ?? '';
  let d3 = draft3Match?.[1]?.trim() ?? '';

  // Clean any leading/trailing quotes or markdown backticks
  d1 = d1.replace(/^["'`]+|["'`]+$/g, '').trim();
  d2 = d2.replace(/^["'`]+|["'`]+$/g, '').trim();
  d3 = d3.replace(/^["'`]+|["'`]+$/g, '').trim();

  if (d1 && d2 && d3) {
    return [d1, d2, d3];
  }

  // Fallback: split by double newline
  const parts = content
    .split(/\n\n+/)
    .map((p) => p.replace(/^Draft\s*\d+\s*[:：]\s*/i, '').replace(/^["'`]+|["'`]+$/g, '').trim())
    .filter(Boolean);

  if (parts.length >= 3) {
    return [parts[0], parts[1], parts[2]];
  } else if (parts.length === 2) {
    return [parts[0], parts[1], d3 || parts[0]];
  }

  // Last resort
  const fallback = content.trim() || 'Great service and overall wonderful experience. Highly recommend!';
  return [d1 || fallback, d2 || fallback, d3 || fallback];
}

/**
 * Checks if an AI provider API key (Google Gemini or OpenAI) is configured.
 */
export function isOpenAIConfigured(): boolean {
  return getGeminiApiKeys().length > 0 || Boolean(process.env.OPENAI_API_KEY);
}

export const isAIConfigured = isOpenAIConfigured;
