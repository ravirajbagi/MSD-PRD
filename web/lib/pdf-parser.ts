// Use internal path to bypass pdf-parse's debug-mode test file loading
// (index.js reads a test PDF when module.parent is null, which breaks in Next.js)
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

const MAX_CHARS = 80_000;

export interface PdfParseResult {
  text: string;
  pageCount: number;
  title: string | null;
  truncated: boolean;
}

/**
 * Extract text from a PDF buffer using pdf-parse v1.
 * Truncates to MAX_CHARS if the paper is very long.
 * Attempts a heuristic title extraction from the first ~1000 chars.
 */
export async function parsePdf(buffer: Buffer): Promise<PdfParseResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await pdfParse(buffer);

  const rawText: string = data.text || '';
  const truncated = rawText.length > MAX_CHARS;
  const text = truncated ? rawText.slice(0, MAX_CHARS) : rawText;
  const title = extractTitle(rawText);

  return {
    text,
    pageCount: data.numpages ?? 0,
    title,
    truncated,
  };
}

function extractTitle(text: string): string | null {
  const lines = text
    .slice(0, 1000)
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 10 && l.length < 200 && !l.startsWith('http'));
  return lines[0] ?? null;
}
