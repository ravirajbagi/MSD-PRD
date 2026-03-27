/**
 * Structured JSON request/error logger for API routes.
 *
 * Emits single-line JSON to stdout/stderr — parseable by Vercel log drains,
 * Datadog, or any JSON-aware log aggregator.
 * API keys are redacted before any string reaches the logger.
 */

const API_KEY_PATTERN = /sk-[a-zA-Z0-9\-]+/g;

function redact(message: string): string {
  return message.replace(API_KEY_PATTERN, '[REDACTED]');
}

export function logRequest(
  route: string,
  ip: string,
  status: number,
  durationMs: number
): void {
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      route,
      ip,
      status,
      duration_ms: durationMs,
    })
  );
}

export function logError(route: string, ip: string, error: unknown): void {
  const message =
    error instanceof Error ? error.message : String(error);
  console.error(
    JSON.stringify({
      ts: new Date().toISOString(),
      route,
      ip,
      error: redact(message),
    })
  );
}
