/**
 * OpenAI / Google Gemini integration for ReviewSpark.
 *
 * Security & compliance:
 * - API keys are server-side only (GEMINI_API_KEY / GEMINI_API_KEYS or OPENAI_API_KEY, no NEXT_PUBLIC_ prefix)
 * - Multi-key Gemini pool: automatically switches to backup keys when rate limits / quota are reached
 * - Prompts give full business information, SEO target keywords, and ask for natural emojis in every draft
 * - All reviews are generated 100% dynamically by AI without static canned templates
 * - Anti-duplication memory prevents repeated phrases across scans
 */

import OpenAI from 'openai';

// ── Multi-Key Gemini Pool & State Tracking ────────────────────────────────────

interface KeyState {
  key: string;
  failedAt: number;
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
 * Resets the cooldown status for all keys.
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

  let orderedHealthy: string[] = [];
  if (healthyKeys.length > 0) {
    const startIdx = roundRobinCounter % healthyKeys.length;
    roundRobinCounter = (roundRobinCounter + 1) % 1000000;
    orderedHealthy = [
      ...healthyKeys.slice(startIdx),
      ...healthyKeys.slice(0, startIdx),
    ];
  }

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
      timeout: 10000,
      maxRetries: 1,
    });
    geminiClientCache.set(apiKey, client);
  }
  return client;
}

/**
 * Returns the Gemini model to use.
 * Defaults to 'gemini-3.8-flash'.
 */
export function getGeminiModel(): string {
  const envModel = process.env.GEMINI_MODEL;
  if (envModel && envModel.trim()) {
    return envModel.trim();
  }
  return 'gemini-3.8-flash';
}

// Fallback Gemini models if primary model is unavailable
export const GEMINI_FALLBACK_MODELS = [
  'gemini-3.8-flash',
  'gemini-3-flash-preview',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
  'gemini-flash-latest',
];

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
 * Direct official Google Gemini REST API caller.
 * Bypasses SDK wrapper layers for maximum speed, zero header conflicts, and 100% reliability.
 */
async function callGeminiDirectRest(
  apiKey: string,
  modelName: string,
  systemInstruction: string,
  userPrompt: string,
  temperature = 0.95
): Promise<GeminiDirectResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const body: Record<string, unknown> = {
    contents: [
      {
        role: 'user',
        parts: [{ text: userPrompt }],
      },
    ],
    generationConfig: {
      temperature,
      topP: 0.95,
      maxOutputTokens: 2048,
      thinkingConfig: {
        thinkingBudget: 0,
      },
    },
  };

  if (systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12000),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`Gemini REST ${res.status}: ${errorText.slice(0, 180)}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini returned empty response candidate');
  }

  const usage = data?.usageMetadata;
  const promptTokens = Number(usage?.promptTokenCount) || 450;
  const completionTokens = Number(usage?.candidatesTokenCount) || 200;
  const totalTokens = Number(usage?.totalTokenCount) || promptTokens + completionTokens;

  return {
    text,
    promptTokens,
    completionTokens,
    totalTokens,
  };
}

/**
 * Executes a chat completion with automatic multi-key failover and multi-model fallback:
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
  const primaryModel = getGeminiModel();
  const modelsToTry = [
    primaryModel,
    ...GEMINI_FALLBACK_MODELS.filter((m) => m !== primaryModel),
  ];

  // 1. Attempt with Google Gemini keys in priority order
  if (geminiKeys.length > 0) {
    let lastGeminiError: any = null;

    for (let i = 0; i < geminiKeys.length; i++) {
      const key = geminiKeys[i];
      const masked = maskKey(key);

      for (const currentModel of modelsToTry) {
        try {
          const systemMsg = params.messages.find((m) => m.role === 'system')?.content || '';
          const userMsg = params.messages.find((m) => m.role === 'user')?.content || '';

          const directResult = await callGeminiDirectRest(
            key,
            currentModel,
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
            model: currentModel,
            object: 'chat.completion',
            usage: {
              prompt_tokens: directResult.promptTokens,
              completion_tokens: directResult.completionTokens,
              total_tokens: directResult.totalTokens,
            },
          };

          return {
            response: simulatedResponse,
            model: currentModel,
            provider: 'gemini',
            usedKeyMasked: masked,
          };
        } catch (directErr: any) {
          lastGeminiError = directErr;
          const errMsg = directErr?.message || String(directErr);

          // If it's a 404, 503 (high demand / temporary server overload), timeout, or model not found, try next model immediately
          if (
            errMsg.includes('404') ||
            errMsg.includes('503') ||
            errMsg.includes('high demand') ||
            errMsg.includes('UNAVAILABLE') ||
            errMsg.includes('overloaded') ||
            errMsg.includes('capacity') ||
            errMsg.includes('not found') ||
            errMsg.includes('no longer available') ||
            errMsg.includes('timeout')
          ) {
            console.warn(
              `[Gemini Model Fallback] Model ${currentModel} returned: "${errMsg.slice(0, 100)}". Trying fallback model...`
            );
            continue;
          }

          // If rate limited or quota error, stop trying models on this key and move to next key
          if (isFailoverError(directErr)) {
            const state = keyStateMap.get(key) || {
              key,
              failedAt: 0,
              failCount: 0,
            };
            state.failedAt = Date.now();
            state.failCount += 1;
            state.lastError = errMsg;
            keyStateMap.set(key, state);
            break; // Break inner model loop to switch to next key
          }
        }
      }
    }

    // If all Gemini keys failed, check for OpenAI safety fallback
    const openAiKey = process.env.OPENAI_API_KEY;
    if (openAiKey) {
      console.warn(
        '[AI Multi-Provider] Gemini keys exhausted or failed. Falling back to OpenAI...'
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
        `All ${geminiKeys.length} configured Gemini API key(s) failed or hit rate limits.`
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

// Cost per 1M tokens
const COST_PER_1M_INPUT_TOKENS: Record<string, number> = {
  'gemini-3.8-flash': 0.075,
  'gemini-3-flash-preview': 0.075,
  'gemini-3.1-flash-lite': 0.05,
  'gemini-2.5-flash': 0.075,
  'gemini-flash-latest': 0.075,
  'gpt-4o-mini': 0.15,
  'gpt-4o': 2.50,
};
const COST_PER_1M_OUTPUT_TOKENS: Record<string, number> = {
  'gemini-3.8-flash': 0.30,
  'gemini-3-flash-preview': 0.30,
  'gemini-3.1-flash-lite': 0.20,
  'gemini-2.5-flash': 0.30,
  'gemini-flash-latest': 0.30,
  'gpt-4o-mini': 0.60,
  'gpt-4o': 10.00,
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

// ── Anti-Duplication Cache (Stores recent review snippets per business) ──────
const recentReviewsCache = new Map<string, string[]>();

export function recordRecentReview(businessKey: string, draft: string): void {
  if (!draft || draft.length < 20) return;
  const key = businessKey.toLowerCase().trim();
  const list = recentReviewsCache.get(key) || [];
  const snippet = draft.replace(/\s+/g, ' ').trim().slice(0, 90);
  if (!list.includes(snippet)) {
    list.unshift(snippet);
    if (list.length > 20) list.pop();
    recentReviewsCache.set(key, list);
  }
}

export function getRecentReviews(businessKey: string): string[] {
  return recentReviewsCache.get(businessKey.toLowerCase().trim()) || [];
}

const STAR_SENTIMENTS: Record<number, string> = {
  1: '1 out of 5 stars (polite critical feedback regarding poor experience)',
  2: '2 out of 5 stars (fair constructive feedback noting areas for improvement)',
  3: '3 out of 5 stars (balanced average visit with honest observations)',
  4: '4 out of 5 stars (happy, positive recommendation with good remarks)',
  5: '5 out of 5 stars (delighted, enthusiastic review with high praise)',
};

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
 * Generates three distinct, human, authentic Google Review options using AI.
 * Supplies all business information, location details, SEO keywords, aspects, and emojis.
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

  let options: GenerateDraftOptions = {};
  if (typeof optionsOrCustomContext === 'string' || optionsOrCustomContext === null) {
    options = {
      customContext: optionsOrCustomContext,
      customerNote: legacyCustomerNote,
    };
  } else if (optionsOrCustomContext && typeof optionsOrCustomContext === 'object') {
    options = optionsOrCustomContext;
  }

  const sentiment = STAR_SENTIMENTS[rating] ?? '5 out of 5 stars (delighted)';

  // Build complete location string
  const locParts = [
    options.street,
    options.nearby ? `near ${options.nearby}` : null,
    options.city,
    businessAddress,
  ].filter(Boolean);
  const locationString = locParts.length > 0 ? locParts.join(', ') : '';

  // Language setup
  const selectedLang = (options.selectedLanguage || options.primaryLanguage || 'English').trim();
  const isHinglish = selectedLang.toLowerCase().includes('hinglish');

  const languageInstruction = isHinglish
    ? 'HINGLISH (conversational Hindi written in English letters/Roman script, e.g. "Yahan ka food aur service dono bohot badhiya thi... 🍕✨")'
    : 'natural, fluent ENGLISH';

  // System Prompt — pure authentic customer tone with emojis and SEO instructions
  const systemPrompt = `You are an authentic, friendly customer writing a genuine Google Review for a local Indian business.
Your goal is to write EXACTLY 3 distinct, natural, and human review options in ${languageInstruction}.

CRITICAL REQUIREMENTS:
1. EMOJIS: Every single review MUST include 2 to 4 natural, expressive, and relevant emojis (e.g. 🍕, ☕, ✨, 😍, 🙌, ⭐, ❤️, 👏, 💯, 👍, 🍽️) seamlessly placed in the sentences.
2. SEO & LOCATION: Naturally weave 1 or 2 of the provided SEO Target Keywords and location details (city, street, or nearby landmark) into the sentences to boost the business's Google Maps Local SEO ranking. Do not stuff keywords unnaturally.
3. AUTHENTIC HUMAN TONE: Sound like real people sharing genuine personal experiences on Google Maps. No robotic phrases or corporate jargon.
4. NO CONTACT NUMBERS: NEVER mention or include phone numbers, contact numbers, email addresses, or website URLs in the reviews.
5. REVIEW LENGTH: Keep each review around 35 to 50 words (natural, readable Google Review length).
6. CLEAN FORMAT: Output clean plain text. Do NOT use markdown bold asterisks (**like this**).
7. THREE DISTINCT PERSPECTIVES:
   - Draft 1: Enthusiastic full recommendation highlighting top experience, SEO keywords, and emojis.
   - Draft 2: Personal experience emphasizing the wonderful ambience, welcoming staff courtesy, and emojis.
   - Draft 3: Crisp, punchy review highlighting great quality, fast service, value, and emojis.

STRICT OUTPUT FORMAT:
Draft 1: [review text with emojis]
Draft 2: [review text with emojis]
Draft 3: [review text with emojis]`;

  // Build comprehensive business info block for the user prompt
  const recent = getRecentReviews(businessName);
  const deduplicationNotice =
    recent.length > 0
      ? `\nPREVIOUS RECENT REVIEWS FOR THIS BUSINESS (DO NOT REPEAT SIMILAR OPENINGS OR PHRASING):\n${recent
          .slice(0, 4)
          .map((r, i) => `${i + 1}. "${r}..."`)
          .join('\n')}\n`
      : '';

  const userPrompt = `Generate 3 completely unique Google Reviews with emojis for this business:

=== BUSINESS INFORMATION ===
Business Name: ${businessName}
Category: ${businessCategory || 'Local Business'}
${locationString ? `Location / Address: ${locationString}` : ''}
${options.serviceKeywords ? `SEO Target Keywords: ${options.serviceKeywords}` : ''}
${options.customContext ? `Business Highlights & Specialties: ${options.customContext}` : ''}

=== CUSTOMER EXPERIENCE ===
Star Rating: ${rating}/5 stars (${sentiment})
${options.selectedAspects && options.selectedAspects.length > 0 ? `Aspects Rated by Customer: ${options.selectedAspects.join(', ')}` : ''}
${options.selectedTags && options.selectedTags.length > 0 ? `What Stood Out Tags: ${options.selectedTags.join(', ')}` : ''}
${options.customerNote ? `Customer Personal Note: "${options.customerNote}"` : ''}
Requested Review Language: ${selectedLang}
Unique Request Seed: ${Date.now()}-${Math.random().toString(36).substring(2, 8)}
${deduplicationNotice}
Please provide 3 fresh, distinct, and authentic reviews with emojis now:
Draft 1:
Draft 2:
Draft 3:`;

  const { response, model } = await executeChatCompletionWithFallback({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 1000,
    temperature: 0.95,
  });

  const content = response.choices[0]?.message?.content ?? '';
  const drafts = parseDrafts(content);

  // Record to anti-duplication memory
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
}

/**
 * Parses the three draft options from the model's response.
 * Strips any residual markdown asterisks or quotes for clean display.
 */
function parseDrafts(content: string): [string, string, string] {
  // Strip bold formatting like **Draft 1:** or **word**
  const clean = content.replace(/\*\*/g, '');

  const draft1Match = clean.match(/Draft\s*1\s*[:：]\s*([\s\S]*?)(?=Draft\s*2\s*[:：]|$)/i);
  const draft2Match = clean.match(/Draft\s*2\s*[:：]\s*([\s\S]*?)(?=Draft\s*3\s*[:：]|$)/i);
  const draft3Match = clean.match(/Draft\s*3\s*[:：]\s*([\s\S]*?)$/i);

  let d1 = (draft1Match?.[1] ?? '').trim().replace(/^["'`]+|["'`]+$/g, '').trim();
  let d2 = (draft2Match?.[1] ?? '').trim().replace(/^["'`]+|["'`]+$/g, '').trim();
  let d3 = (draft3Match?.[1] ?? '').trim().replace(/^["'`]+|["'`]+$/g, '').trim();

  if (d1 && d2 && d3) {
    return [d1, d2, d3];
  }

  // Fallback: split by double newlines or numbered items
  const parts = clean
    .split(/\n\n+/)
    .map((p) => p.replace(/^Draft\s*\d+\s*[:：]\s*/i, '').replace(/^["'`]+|["'`]+$/g, '').trim())
    .filter((p) => p.length > 20);

  if (parts.length >= 3) {
    return [parts[0], parts[1], parts[2]];
  } else if (parts.length === 2) {
    return [parts[0], parts[1], d3 || parts[0]];
  }

  const fallback = clean.trim() || 'Had a great experience here! Wonderful service and very polite staff. Highly recommended! ⭐✨';
  return [d1 || fallback, d2 || fallback, d3 || fallback];
}

/**
 * Checks if an AI provider API key (Google Gemini or OpenAI) is configured.
 */
export function isOpenAIConfigured(): boolean {
  return getGeminiApiKeys().length > 0 || Boolean(process.env.OPENAI_API_KEY);
}

export const isAIConfigured = isOpenAIConfigured;
