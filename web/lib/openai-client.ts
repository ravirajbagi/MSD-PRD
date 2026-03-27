import OpenAI from 'openai';
import type { NotebookSpec } from './types';
import { buildNotebookPrompt } from './prompt';

// Primary model — change this single constant to upgrade
export const OPENAI_MODEL = 'gpt-4o-mini';

// Fallback chain if primary model is unavailable
const MODEL_FALLBACKS = ['gpt-4o'] as const;

/**
 * Generate a NotebookSpec from paper text using OpenAI.
 *
 * Emits status messages via the `onStatus` callback so the caller can
 * stream updates to the client via SSE without buffering the whole response.
 *
 * The API key is accepted as a parameter and is NEVER logged or stored.
 */
export async function generateNotebook(
  paperText: string,
  apiKey: string,
  onStatus: (msg: string) => void
): Promise<NotebookSpec> {
  // Never log the API key
  const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: false });

  const prompt = buildNotebookPrompt(paperText);

  onStatus('Analyzing paper structure and identifying core contributions...');

  let lastError: Error | null = null;
  const modelsToTry = [OPENAI_MODEL, ...MODEL_FALLBACKS];

  for (const model of modelsToTry) {
    try {
      onStatus(`Sending to ${model} — generating notebook sections...`);

      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
        temperature: 0.3, // Low temperature for consistent structured output
        max_completion_tokens: 8000,
        response_format: { type: 'json_object' },
      });

      onStatus('Parsing generated notebook structure...');

      const raw = response.choices[0]?.message?.content;
      if (!raw) throw new Error('OpenAI returned an empty response.');

      const parsed = JSON.parse(raw) as NotebookSpec;

      // Validate structure
      if (!parsed.title || !parsed.sections || !Array.isArray(parsed.sections)) {
        throw new Error('Response did not match expected NotebookSpec structure.');
      }

      onStatus(`Generated ${parsed.sections.length} notebook sections. Building .ipynb file...`);
      return parsed;
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const isModelNotFound =
        lastError.message.includes('model') ||
        lastError.message.includes('does not exist') ||
        lastError.message.includes('not found');

      if (isModelNotFound && model !== modelsToTry[modelsToTry.length - 1]) {
        onStatus(`Model ${model} unavailable, trying fallback...`);
        continue;
      }
      throw lastError;
    }
  }

  throw lastError ?? new Error('All models failed.');
}
