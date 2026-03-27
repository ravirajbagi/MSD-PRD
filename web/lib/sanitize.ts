/**
 * Prompt injection defense — Layer 1 (input sanitization).
 *
 * Strips known adversarial patterns from PDF-extracted text before it is
 * interpolated into the OpenAI prompt. This reduces the risk of a malicious
 * PDF overriding the system prompt or injecting new instructions.
 *
 * Note: sanitization is probabilistic — a sufficiently novel attack may bypass
 * these patterns. It is combined with output scanning (notebook-scanner.ts) as
 * a second layer of defense.
 */

const INJECTION_PATTERNS: RegExp[] = [
  // Role-override phrases (case-insensitive)
  /ignore\s+(?:all\s+)?previous\s+instructions?/gi,
  // "new task:" with colon — instruction injection marker
  /new\s+task\s*:/gi,
  // Explicit SYSTEM: role marker
  /SYSTEM\s*:/g,
  // LLaMA / Mistral instruction tokens
  /\[INST\]/g,
  /\[\/INST\]/g,
  // ChatML tokens used by OpenAI fine-tunes
  /<\|im_start\|>/g,
  /<\|im_end\|>/g,
  // GPT-2 / legacy end-of-text token
  /<\|endoftext\|>/g,
];

/**
 * Remove known prompt injection patterns from extracted paper text.
 * Returns the cleaned string (original is not mutated).
 */
export function sanitizePaperText(text: string): string {
  let cleaned = text;
  for (const pattern of INJECTION_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }
  return cleaned;
}
