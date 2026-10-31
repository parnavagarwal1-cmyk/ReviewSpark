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

  const systemPrompt = `You are a helpful assistant that writes authentic, human-sounding Google Review drafts for customers.

STRICT INSTRUCTIONS:
1. Write EXACTLY 2 distinct draft options:
   - "Draft 1:" must be written in pure, natural ${lang1}.
   - "Draft 2:" must be written in authentic conversational ${lang2} (Roman script, as spoken in India).
2. Word count: Each draft must be 30–65 words.
3. Tone must strictly match the customer rating: ${sentiment}.
4. Naturally incorporate any highlighted aspects, customer tags, service keywords, or customer personal notes provided.
5. DO NOT invent specific unmentioned facts (do not invent staff names, prices, or fake items).
6. No emojis, no hashtags, no promotional marketing slogans.
7. Keep the tone natural, genuine, and relatable.`;

  const userPrompt = `Business: ${businessName}
${categoryContext}
${locationContext}
${keywordsContext}
${highlightsContext}
${aspectsContext}
${tagsContext}
${customerNoteContext}
Customer rating: ${rating}/5 stars (${sentiment})

Generate Draft 1 in ${lang1} and Draft 2 in ${lang2}.`;

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 450,
    temperature: 0.8,
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

  const d1 = draft1Match?.[1]?.trim() ?? '';
  const d2 = draft2Match?.[1]?.trim() ?? '';

  if (d1 && d2) {
    return [d1, d2];
  }

  // Fallback: split by double newline
  const parts = content
    .split(/\n\n+/)
    .map((p) => p.trim())
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
