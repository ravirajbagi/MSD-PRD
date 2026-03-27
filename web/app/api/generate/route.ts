import { NextRequest, NextResponse } from 'next/server';
import { generateNotebook } from '@/lib/openai-client';
import { buildJupyterNotebook, notebookToJson } from '@/lib/notebook-builder';
import { sanitizePaperText } from '@/lib/sanitize';
import { scanNotebookForDangerousCode } from '@/lib/notebook-scanner';
import { logRequest, logError } from '@/lib/logger';

// Increase timeout for long notebook generation (up to 10 min)
export const maxDuration = 600;

// In-route rate limiter for /api/generate (excluded from middleware to preserve SSE streaming)
const generateRateLog = new Map<string, number[]>();
const GENERATE_LIMIT = 5;
const GENERATE_WINDOW_MS = 10 * 60 * 1000;

function checkRateLimit(ip: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const windowStart = now - GENERATE_WINDOW_MS;
  const timestamps = (generateRateLog.get(ip) ?? []).filter((t) => t > windowStart);
  if (timestamps.length >= GENERATE_LIMIT) {
    const retryAfter = Math.ceil((timestamps[0] + GENERATE_WINDOW_MS - now) / 1000);
    return { allowed: false, retryAfter };
  }
  timestamps.push(now);
  generateRateLog.set(ip, timestamps);
  return { allowed: true, retryAfter: 0 };
}

const STATUS_MESSAGES = [
  'Extracting paper structure and key contributions...',
  'Identifying core algorithms and mathematical foundations...',
  'Designing synthetic dataset schema...',
  'Generating theoretical background with LaTeX equations...',
  'Writing algorithm implementation...',
  'Building training loop and evaluation code...',
  'Composing visualization cells...',
  'Finalizing notebook structure...',
];

/**
 * SSE helper — formats a data line for Server-Sent Events.
 * Never logs the API key from the request body.
 */
function sseData(payload: Record<string, unknown>): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export async function POST(req: NextRequest) {
  const start = Date.now();
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '127.0.0.1';
  let body: { paperText?: string; apiKey?: string };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { paperText, apiKey } = body;

  if (!paperText || typeof paperText !== 'string' || paperText.trim().length < 10) {
    return NextResponse.json({ error: 'paperText is required and must be non-empty.' }, { status: 400 });
  }

  if (paperText.length > 100_000) {
    return NextResponse.json(
      { error: 'Paper text exceeds maximum length of 100,000 characters.' },
      { status: 400 }
    );
  }

  const API_KEY_REGEX = /^sk-[a-zA-Z0-9\-_]{20,}$/;
  if (!apiKey || typeof apiKey !== 'string' || !API_KEY_REGEX.test(apiKey.trim())) {
    return NextResponse.json({ error: 'Invalid API key format.' }, { status: 400 });
  }

  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${rateCheck.retryAfter} seconds.`, retryAfter: rateCheck.retryAfter },
      { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter) } }
    );
  }

  // Create SSE stream
  const encoder = new TextEncoder();
  let statusIndex = 0;

  const stream = new ReadableStream({
    async start(controller) {
      function emit(payload: Record<string, unknown>) {
        controller.enqueue(encoder.encode(sseData(payload)));
      }

      // Progress ticker — sends a new status every 8s so the user sees movement.
      // After all status messages are exhausted, sends SSE heartbeat pings to
      // keep the TCP connection alive while waiting for the OpenAI response.
      const ticker = setInterval(() => {
        if (statusIndex < STATUS_MESSAGES.length) {
          emit({ status: STATUS_MESSAGES[statusIndex++] });
        } else {
          // SSE comment — valid keep-alive ping, ignored by the client
          controller.enqueue(encoder.encode(': ping\n\n'));
        }
      }, 8000);

      // Emit first status immediately
      emit({ status: STATUS_MESSAGES[statusIndex++] });

      try {
        const spec = await generateNotebook(
          sanitizePaperText(paperText.trim()),
          apiKey.trim(),
          (msg) => {
            clearInterval(ticker); // Stop ticker when we get real status
            emit({ status: msg });
          }
        );

        const scanResult = scanNotebookForDangerousCode(spec);
        if (scanResult) {
          emit({ error: scanResult });
          controller.close();
          return;
        }

        const notebook = buildJupyterNotebook(spec);
        const notebookJson = notebookToJson(notebook);

        emit({ status: 'Notebook generation complete! Preparing download...' });
        emit({ done: true, notebook: notebookJson, title: spec.title });
        logRequest('/api/generate', ip, 200, Date.now() - start);
      } catch (err: unknown) {
        clearInterval(ticker);
        logError('/api/generate', ip, err);
        const message =
          err instanceof Error ? err.message : 'An unexpected error occurred.';

        // Sanitize error — never leak the API key in error messages
        const safeMessage = message.replace(/sk-[a-zA-Z0-9-_]+/g, '[REDACTED]');
        emit({ error: safeMessage });
      } finally {
        clearInterval(ticker);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed.' }, { status: 405 });
}
