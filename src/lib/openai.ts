/**
 * OpenAI / Google Gemini integration for ReviewSpark.
 *
 * Security & compliance:
 * - API key is server-side only (GEMINI_API_KEY or OPENAI_API_KEY, no NEXT_PUBLIC_ prefix)
 * - No customer PII is stored; only token usage is recorded in ai_usage table
 * - Prompts explicitly instruct the model not to invent specific unmentioned facts
 * - Drafts are clearly labeled as AI suggestions in the UI
 * - Rate limiting is applied at the route level before calling this module
 */

import OpenAI from 'openai';

let _client: OpenAI | null = null;
let _currentProvider: 'gemini' | 'openai' | null = null;

function getClient(): { client: OpenAI; model: string } {
  // Support Google Gemini via its official OpenAI-compatible endpoint
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    if (!_client || _currentProvider !== 'gemini') {
      _client = new OpenAI({
        apiKey: geminiKey,
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      });
      _currentProvider = 'gemini';
    }
    const model = process.env.GEMINI_MODEL ?? process.env.OPENAI_MODEL ?? 'gemini-3.5-flash-lite';
    return { client: _client, model };
  }

  // Fallback to OpenAI
  const openAiKey = process.env.OPENAI_API_KEY;
  if (!openAiKey) {
    throw new Error(
      'Neither GEMINI_API_KEY nor OPENAI_API_KEY is set. AI draft generation is unavailable. ' +
      'Set either GEMINI_API_KEY or OPENAI_API_KEY to enable this feature.'
    );
  }

  if (!_client || _currentProvider !== 'openai') {
    _client = new OpenAI({ apiKey: openAiKey });
    _currentProvider = 'openai';
  }
  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
  return { client: _client, model };
}

export const OPENAI_MODEL = process.env.GEMINI_API_KEY
  ? (process.env.GEMINI_MODEL ?? 'gemini-3.5-flash-lite')
  : (process.env.OPENAI_MODEL ?? 'gpt-4o-mini');

// Cost per 1M tokens (approximate, update as pricing changes)
const COST_PER_1M_INPUT_TOKENS: Record<string, number> = {
  'gemini-3.5-flash-lite': 0.075,
  'gemini-2.5-flash': 0.075,
  'gemini-1.5-flash': 0.075,
  'gemini-1.5-pro': 1.25,
  'gpt-4o-mini': 0.15,
  'gpt-4o': 2.50,
  'gpt-4-turbo': 10.00,
  'gpt-3.5-turbo': 0.50,
};
const COST_PER_1M_OUTPUT_TOKENS: Record<string, number> = {
  'gemini-3.5-flash-lite': 0.30,
  'gemini-2.5-flash': 0.30,
  'gemini-1.5-flash': 0.30,
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

  const { client, model } = getClient();
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

  const systemPrompt = `You are a helpful assistant that writes authentic, human-sounding Google Review drafts for customers.
Every review you write must feel like a genuine, unique review posted by a real person on Google Maps.

CRITICAL VARIETY & ANTI-REPETITION RULES:
1. NEVER use generic AI opening clichés such as:
   - "I recently visited..."
   - "I had an amazing/wonderful experience at..."
   - "I cannot recommend this place enough..."
   - "If you are looking for..."
   - "Top-notch service from start to finish..."
   - "Look no further..."
2. Start directly with an action, observation, situation, or distinct sentiment (e.g., "Got my checkup done today...", "Visited on a friend's recommendation...", "Super clean setup and zero waiting time...", "Dr. Sharma explained everything patiently without rushing...", "Really smooth appointment from start to end...").
3. Each generation must sound completely fresh and different in phrasing, rhythm, and sentence structure.
4. Tone must strictly match the customer rating: ${sentiment}.

LANGUAGE & FORMAT INSTRUCTIONS:
- Write EXACTLY 2 distinct draft options:
  - "Draft 1:" must be written in natural ${lang1}.
  - "Draft 2:" must be written in authentic conversational ${lang2} (Roman script, as spoken in India, e.g., "Treatment bilkul painless tha aur doctor sahab ka nature bohot accha hai...").

LENGTH VARIATION (MUST DIFFER NOTICEABLY):
- Draft 1 target length: ${lengthProfile.d1}.
- Draft 2 target length: ${lengthProfile.d2}.
- One draft MUST be distinctly shorter or longer than the other. NEVER make both drafts similar in length or identical in structure!

EMOJI GUIDELINE:
- ${emojiDirective}
- Never spam emojis. Keep them subtle and human.

GROUNDING & INTEGRATION:
- Naturally incorporate any provided aspects, customer tags, service keywords, or customer personal notes.
- DO NOT invent unmentioned specific facts (e.g., fake staff names, fake prices, or fake menu items).
- Avoid marketing slogans or promotional corporate jargon.`;

  const userPrompt = `Business: ${businessName}
${categoryContext}
${locationContext}
${keywordsContext}
${highlightsContext}
${aspectsContext}
${tagsContext}
${customerNoteContext}
Customer rating: ${rating}/5 stars (${sentiment})
Writing angle: ${stylePerspective}
Variety seed: ${variationSeed}

Generate Draft 1 in ${lang1} (${lengthProfile.d1}) and Draft 2 in ${lang2} (${lengthProfile.d2}).`;

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 500,
    temperature: 0.95,
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
  return Boolean(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY);
}

export const isAIConfigured = isOpenAIConfigured;
