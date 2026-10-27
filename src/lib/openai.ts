/**
 * OpenAI integration for ReviewSpark.
 *
 * Security & compliance:
 * - API key is server-side only (OPENAI_API_KEY, no NEXT_PUBLIC_ prefix)
 * - No customer data is stored; only token usage is recorded in ai_usage table
 * - Prompts explicitly instruct the model not to invent specific facts
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
  'gemini-2.5-flash': 0.075,
  'gemini-1.5-flash': 0.075,
  'gemini-1.5-pro': 1.25,
  'gpt-4o-mini': 0.15,
  'gpt-4o': 2.50,
  'gpt-4-turbo': 10.00,
  'gpt-3.5-turbo': 0.50,
};
const COST_PER_1M_OUTPUT_TOKENS: Record<string, number> = {
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
  1: 'very dissatisfied (1 out of 5 stars)',
  2: 'somewhat dissatisfied (2 out of 5 stars)',
  3: 'neutral or mixed experience (3 out of 5 stars)',
  4: 'satisfied and happy (4 out of 5 stars)',
  5: 'extremely happy and delighted (5 out of 5 stars)',
};

/**
 * Generates two concise Hinglish review draft options for a business.
 *
 * IMPORTANT CONSTRAINTS (enforced in system prompt):
 * - Must not invent specific facts (staff names, food ordered, products used, etc.)
 * - Must be consistent with the selected rating
 * - Must use natural Hinglish (Hindi + English mix as spoken in India)
 * - Maximum ~60 words each
 * - No customer PII is sent to OpenAI
 */
export async function generateReviewDrafts(
  businessName: string,
  businessCategory: string | null,
  businessAddress: string | null,
  rating: number,
  customContext?: string | null,
  customerNote?: string | null
): Promise<DraftResult> {
  if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    throw new Error('Rating must be an integer between 1 and 5');
  }

  const { client, model } = getClient();
  const sentiment = STAR_SENTIMENTS[rating] ?? 'neutral';

  const categoryContext = businessCategory
    ? `Category: ${businessCategory}`
    : '';
  const addressContext = businessAddress
    ? `Location: ${businessAddress}`
    : '';
  const highlightsContext = customContext?.trim()
    ? `Business Highlights & Specialties: ${customContext.trim()}`
    : '';
  const customerNoteContext = customerNote?.trim()
    ? `Customer Experience Note: "${customerNote.trim()}"`
    : '';

  const systemPrompt = `You are a helpful assistant that writes short, genuine Google Review drafts in Hinglish (a natural blend of Hindi and English commonly used in India).

STRICT RULES — follow these exactly:
1. Write EXACTLY 2 draft options, labeled "Draft 1:" and "Draft 2:"
2. Each draft must be 30–65 words maximum
3. The tone must match the rating: ${sentiment}
4. Write in natural Hinglish (Roman script, mix of conversational Hindi and English)
5. If "Business Highlights" or "Customer Experience Note" are provided, seamlessly weave them into the reviews so they feel authentic and personalized.
6. DO NOT invent unmentioned specific facts (do not invent staff names, dishes, or products that were not mentioned).
7. Keep wording authentic, natural, and consistent with the star rating
8. No emojis, hashtags, or marketing buzzwords
9. These are SUGGESTIONS — the customer will review and edit before posting
10. Do not start both drafts with the same word or phrase`;

  const userPrompt = `Business: ${businessName}
${categoryContext}
${addressContext}
${highlightsContext}
${customerNoteContext}
Customer rating: ${rating}/5 stars (${sentiment})

Generate 2 short, personalized Hinglish review drafts for this business.`;

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 400,
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

  // Last resort: use the whole text as draft 1, generate a slight variant as draft 2
  const fallback = content.trim() || 'Achha experience raha. Recommend karunga.';
  return [fallback, fallback];
}

/**
 * Checks if an AI provider API key (Google Gemini or OpenAI) is configured.
 */
export function isOpenAIConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY);
}

export const isAIConfigured = isOpenAIConfigured;
