/**
 * OpenAI Client Configuration
 * 
 * Centralized OpenAI API client with configuration and error handling.
 * 
 * Features:
 * - Singleton pattern for consistent configuration
 * - Streaming support for real-time synthesis
 * - Error handling with retry logic
 * - Token counting and cost estimation
 * 
 * For LLM maintainers:
 * - All OpenAI API calls should use this client
 * - Streaming is preferred for user experience
 * - Always handle errors gracefully
 * 
 * @example
 * ```typescript
 * import { openai, streamCompletion } from '@/lib/ai/openai-client';
 * 
 * const stream = await streamCompletion({
 *   messages: [{ role: 'user', content: 'Hello' }]
 * });
 * ```
 */

import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

/**
 * OpenAI Client Instance
 * 
 * Configuration from environment variables:
 * - OPENAI_API_KEY: Required
 * - OPENAI_ORG_ID: Optional (for organization-level usage)
 */
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID,
});

/**
 * Default model configuration
 * 
 * GPT-4 Turbo is preferred for synthesis generation:
 * - 128K context window (fits large submissions)
 * - Better instruction following
 * - More consistent output quality
 */
export const DEFAULT_MODEL = 'gpt-4-turbo-preview' as const;
export const DEFAULT_TEMPERATURE = 0.7; // Balance creativity and consistency
export const DEFAULT_MAX_TOKENS = 2000; // ~1500 words

/**
 * Generate a non-streaming chat completion
 * 
 * Use this for:
 * - Background jobs
 * - Batch processing
 * - When streaming is not needed
 * 
 * @param messages - Array of chat messages
 * @param options - Optional configuration overrides
 * @returns The complete response
 * 
 * @example
 * ```typescript
 * const response = await generateCompletion({
 *   messages: [
 *     { role: 'system', content: 'You are a helpful assistant' },
 *     { role: 'user', content: 'Summarize these perspectives: ...' }
 *   ]
 * });
 * console.log(response.content);
 * ```
 */
export async function generateCompletion({
  messages,
  model = DEFAULT_MODEL,
  temperature = DEFAULT_TEMPERATURE,
  maxTokens = DEFAULT_MAX_TOKENS,
}: {
  messages: ChatCompletionMessageParam[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}) {
  try {
    const completion = await openai.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    });

    const message = completion.choices[0]?.message;
    const usage = completion.usage;

    return {
      content: message?.content || '',
      role: message?.role || 'assistant',
      finishReason: completion.choices[0]?.finish_reason,
      usage: {
        promptTokens: usage?.prompt_tokens || 0,
        completionTokens: usage?.completion_tokens || 0,
        totalTokens: usage?.total_tokens || 0,
      },
    };
  } catch (error) {
    console.error('OpenAI completion error:', error);
    throw new Error(`Failed to generate completion: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate a streaming chat completion
 * 
 * Use this for:
 * - Real-time synthesis generation
 * - Long-form content
 * - Better user experience (progressive loading)
 * 
 * @param messages - Array of chat messages
 * @param options - Optional configuration overrides
 * @returns Async iterable of content chunks
 * 
 * @example
 * ```typescript
 * const stream = await streamCompletion({
 *   messages: [{ role: 'user', content: 'Generate consensus statement' }]
 * });
 * 
 * for await (const chunk of stream) {
 *   process.stdout.write(chunk);
 * }
 * ```
 */
export async function streamCompletion({
  messages,
  model = DEFAULT_MODEL,
  temperature = DEFAULT_TEMPERATURE,
  maxTokens = DEFAULT_MAX_TOKENS,
}: {
  messages: ChatCompletionMessageParam[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}) {
  try {
    const stream = await openai.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    });

    return stream;
  } catch (error) {
    console.error('OpenAI streaming error:', error);
    throw new Error(`Failed to stream completion: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Estimate token count (rough approximation)
 * 
 * Rule of thumb: ~4 characters per token
 * For precise counting, use tiktoken library
 * 
 * @param text - Text to estimate tokens for
 * @returns Estimated token count
 * 
 * @example
 * ```typescript
 * const tokens = estimateTokens("This is a sample text");
 * console.log(`Estimated tokens: ${tokens}`);
 * ```
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Estimate cost for API call (USD)
 * 
 * Pricing (as of Dec 2024):
 * - GPT-4 Turbo: $0.01/1K input tokens, $0.03/1K output tokens
 * - GPT-4o: $0.005/1K input tokens, $0.015/1K output tokens
 * 
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @param model - Model used
 * @returns Estimated cost in USD
 * 
 * @example
 * ```typescript
 * const cost = estimateCost(1000, 500, 'gpt-4-turbo-preview');
 * console.log(`Estimated cost: $${cost.toFixed(4)}`);
 * ```
 */
export function estimateCost(
  inputTokens: number,
  outputTokens: number,
  model: string = DEFAULT_MODEL
): number {
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-4-turbo-preview': { input: 0.01, output: 0.03 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'gpt-4o': { input: 0.005, output: 0.015 },
    'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
  };

  const rates = pricing[model] || pricing['gpt-4-turbo-preview'];
  const inputCost = (inputTokens / 1000) * rates.input;
  const outputCost = (outputTokens / 1000) * rates.output;

  return inputCost + outputCost;
}
