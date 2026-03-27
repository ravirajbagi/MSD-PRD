import { NextRequest, NextResponse } from 'next/server';

/**
 * IP-based sliding-window rate limiter.
 *
 * Uses an in-memory Map — state resets on cold starts (acceptable for v2).
 * Upgrade path: replace with @upstash/ratelimit + @upstash/redis for
 * persistent, distributed rate limiting in production.
 */

interface RateLimit {
  limit: number;
  windowMs: number;
}

const RATE_LIMITS: Record<string, RateLimit> = {
  '/api/generate':        { limit: 5,  windowMs: 10 * 60 * 1000 },
  '/api/extract':         { limit: 20, windowMs: 10 * 60 * 1000 },
  '/api/notebook/publish': { limit: 10, windowMs: 10 * 60 * 1000 },
};

// module-level store: "IP:pathname" → array of request timestamps
const requestLog = new Map<string, number[]>();

function getIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return '127.0.0.1';
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const rateLimit = RATE_LIMITS[pathname];

  // Not a rate-limited route — pass through
  if (!rateLimit) return NextResponse.next();

  const ip = getIp(req);
  const key = `${ip}:${pathname}`;
  const now = Date.now();
  const windowStart = now - rateLimit.windowMs;

  // Keep only timestamps within the current window
  const timestamps = (requestLog.get(key) ?? []).filter((t) => t > windowStart);

  if (timestamps.length >= rateLimit.limit) {
    const oldestInWindow = timestamps[0];
    const retryAfter = Math.ceil((oldestInWindow + rateLimit.windowMs - now) / 1000);
    return new NextResponse(
      JSON.stringify({
        error: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
        retryAfter,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfter),
        },
      }
    );
  }

  // Record this request and continue
  timestamps.push(now);
  requestLog.set(key, timestamps);
  return NextResponse.next();
}

export const config = {
  // /api/generate is excluded — middleware breaks SSE streaming responses.
  // Its rate limiting is handled inside the route handler instead.
  matcher: ['/api/extract', '/api/notebook/publish'],
};
