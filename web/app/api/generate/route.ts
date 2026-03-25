import { NextRequest, NextResponse } from 'next/server';
import { generateNotebook } from '@/lib/openai-client';
import { buildJupyterNotebook, notebookToJson } from '@/lib/notebook-builder';

// Increase timeout for long notebook generation (up to 10 min)
export const maxDuration = 600;

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

  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 10) {
    return NextResponse.json({ error: 'apiKey is required.' }, { status: 400 });
  }

  // Create SSE stream
  const encoder = new TextEncoder();
  let statusIndex = 0;

  const stream = new ReadableStream({
    async start(controller) {
      function emit(payload: Record<string, unknown>) {
        controller.enqueue(encoder.encode(sseData(payload)));
      }

      // Progress ticker — sends a new status every 8s so the user sees movement
      const ticker = setInterval(() => {
        if (statusIndex < STATUS_MESSAGES.length) {
          emit({ status: STATUS_MESSAGES[statusIndex++] });
        }
      }, 8000);

      // Emit first status immediately
      emit({ status: STATUS_MESSAGES[statusIndex++] });

      try {
        const spec = await generateNotebook(
          paperText.trim(),
          apiKey.trim(),
          (msg) => {
            clearInterval(ticker); // Stop ticker when we get real status
            emit({ status: msg });
          }
        );

        const notebook = buildJupyterNotebook(spec);
        const notebookJson = notebookToJson(notebook);

        emit({ status: 'Notebook generation complete! Preparing download...' });
        emit({ done: true, notebook: notebookJson, title: spec.title });
      } catch (err: unknown) {
        clearInterval(ticker);
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
