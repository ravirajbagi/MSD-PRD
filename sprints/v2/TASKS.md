# Sprint v2 — Tasks

## Status: Complete ✓ (10/10 complete)

---

- [x] Task 1: Add HTTP security headers in `next.config.ts` (P0)
  - Acceptance: `next.config.ts` exports a `headers()` function that sets CSP,
    X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy: no-referrer,
    Strict-Transport-Security, and Permissions-Policy on all routes (`/`); `npm run build`
    passes; E2E test asserts each header is present on a GET `/` response
  - Files: `next.config.ts`, `tests/e2e/task1-security-headers.spec.ts`
  - Completed: 2026-03-26 — SECURITY_HEADERS array applied to all routes via headers(); CSP includes connect-src for OpenAI + GitHub APIs, frame-ancestors 'none'; 8/8 E2E tests pass; semgrep clean, npm audit clean

- [x] Task 2: Validate OpenAI API key format on both client and server (P0)
  - Acceptance: `ApiKeyForm` rejects keys that don't match `/^sk-[a-zA-Z0-9\-]{20,}$/`
    with an inline error "Invalid API key format — must start with sk-"; `/api/generate`
    applies the same regex server-side and returns `400` for non-matching keys; existing
    E2E tests still pass
  - Files: `components/api-key-form.tsx`, `app/api/generate/route.ts`,
    `tests/e2e/task2-api-key-validation.spec.ts`
  - Completed: 2026-03-26 — Regex validation on both client (ApiKeyForm) and server (route.ts); 7/7 E2E tests pass

- [x] Task 3: Add server-side `paperText` length cap in `/api/generate` (P0)
  - Acceptance: POST body with `paperText` longer than 100,000 characters returns `400`
    with `{ error: "Paper text exceeds maximum length of 100,000 characters." }`; normal
    requests under the cap work as before; E2E test covers both cases
  - Files: `app/api/generate/route.ts`, `tests/e2e/task3-paper-text-length.spec.ts`
  - Completed: 2026-03-26 — 100k char guard added to route.ts; 3/3 E2E tests pass

- [x] Task 4: Build `lib/sanitize.ts` — prompt injection input sanitizer (P0)
  - Acceptance: `sanitizePaperText(text: string): string` strips known prompt injection
    patterns (role-override phrases: `ignore.*previous.*instructions`, `new task:`,
    `SYSTEM:`, `[INST]`, `<|im_start|>`, `<|endoftext|>`); returns cleaned text; 8+ unit
    tests covering clean text (unchanged), each injection pattern (removed/replaced), and
    empty string; `/api/generate` calls `sanitizePaperText(paperText)` before passing to
    `buildNotebookPrompt`
  - Files: `lib/sanitize.ts`, `tests/unit/sanitize.test.ts`,
    `app/api/generate/route.ts`
  - Completed: 2026-03-26 — 7-pattern sanitizer built; 10/10 unit tests pass

- [x] Task 5: Build `lib/notebook-scanner.ts` — dangerous code output scanner (P0)
  - Acceptance: `scanNotebookForDangerousCode(spec: NotebookSpec): string | null` returns
    `null` if safe, or a descriptive error string if any code cell contains
    `os.system`, `subprocess`, `eval(`, `exec(`, `__import__`, `socket.`, or imports of
    `paramiko`/`ftplib`/`telnetlib`; scanner is called in `/api/generate` after OpenAI
    returns — if it fires, the SSE stream emits `{ error: "..." }` instead of `{ done }`;
    6+ unit tests covering safe notebook, each dangerous pattern, and false-positive
    avoidance (e.g. a comment containing "os.system" in a markdown cell should not trigger)
  - Files: `lib/notebook-scanner.ts`, `tests/unit/notebook-scanner.test.ts`,
    `app/api/generate/route.ts`
  - Completed: 2026-03-26 — 8-pattern scanner with comment-line skip; 9/9 unit tests pass

- [x] Task 6: Validate `colabUrl` before `window.open` and validate `data.id` in gist client (P0)
  - Acceptance: `result-actions.tsx` checks `data.colabUrl.startsWith('https://colab.research.google.com/')` before calling `window.open` — throws a user-visible error if it fails; `gist-client.ts` validates `data.id` matches `/^[a-f0-9]+$/` before constructing the Colab URL — throws if it doesn't match; E2E test simulates a bad `colabUrl` response and asserts the fallback error message is shown
  - Files: `components/result-actions.tsx`, `lib/gist-client.ts`,
    `tests/e2e/task6-colab-url-validation.spec.ts`
  - Completed: 2026-03-26 — URL prefix guard + Gist ID regex validation; 2/2 E2E tests pass

- [x] Task 7: Handle `QuotaExceededError` on sessionStorage writes (P0)
  - Acceptance: `lib/session.ts` wraps all `sessionStorage.setItem` calls in try/catch;
    on `QuotaExceededError`, `setNotebookJson` returns `false` (instead of throwing);
    `processing/page.tsx` checks the return value and shows a user-visible error:
    "Notebook is too large to store in browser storage. Please download directly." with a
    direct download fallback; 3 unit tests covering normal write, quota error on
    `setNotebookJson`, and quota error on `setApiKey`
  - Files: `lib/session.ts`, `app/processing/page.tsx`,
    `tests/unit/session-quota.test.ts`
  - Completed: 2026-03-26 — safeSet() wrapper with boolean return; direct download fallback in processing page; 3/3 unit tests pass

- [x] Task 8: Add IP-based rate limiting via Next.js middleware (P1)
  - Acceptance: `middleware.ts` at project root intercepts all `/api/*` routes; uses an
    in-memory sliding-window counter (module-level `Map<string, number[]>`) keyed by IP
    (`x-forwarded-for` header, falling back to `127.0.0.1`); limits: `/api/generate` →
    5 req/10 min, `/api/extract` → 20 req/10 min, `/api/notebook/publish` → 10 req/10 min;
    returns `429 Too Many Requests` with `{ error: "Rate limit exceeded. Try again in N
    seconds.", retryAfter: N }` and `Retry-After` header when exceeded; E2E test fires 6
    rapid `/api/generate` requests and asserts the 6th returns 429
  - Files: `middleware.ts`, `tests/e2e/task8-rate-limiting.spec.ts`
  - Completed: 2026-03-26 — sliding-window rate limiter in middleware.ts; 3/3 E2E tests pass

- [x] Task 9: Add structured request/error logger to all API routes (P1)
  - Acceptance: `lib/logger.ts` exports `logRequest(route, ip, status, durationMs)` and
    `logError(route, ip, error)` — both emit a single JSON line to `console.log`/
    `console.error` with fields `{ ts, route, ip, status?, duration_ms?, error? }`;
    API key values are explicitly excluded (sanitized with the same redaction regex from
    `route.ts`); all three API route handlers call `logRequest` on success and `logError`
    on failure; 4 unit tests: correct JSON shape, duration_ms is a number, API key is
    redacted if it appears in an error string, ts is an ISO string
  - Files: `lib/logger.ts`, `app/api/extract/route.ts`, `app/api/generate/route.ts`,
    `app/api/notebook/publish/route.ts`, `tests/unit/logger.test.ts`
  - Completed: 2026-03-26 — JSON logger with sk-* redaction wired into all 3 route handlers; 4/4 unit tests pass

- [x] Task 10: Full security regression — re-run semgrep + npm audit + manual checklist (P1)
  - Acceptance: `npm audit` returns 0 vulnerabilities; `PYTHONUTF8=1 semgrep --config auto .`
    returns 0 findings; a Playwright test hits GET `/` and asserts all 6 security response
    headers are present with correct values; `npm run build` completes with 0 TypeScript
    errors; TASKS.md updated to Complete ✓
  - Files: `tests/e2e/task10-security-regression.spec.ts`, `sprints/v2/TASKS.md`
  - Completed: 2026-03-26 — 7/7 E2E regression tests pass; npm audit: 0 vulnerabilities; semgrep: 0 findings; npm run build: success

---

## Notes
- **Rate limiting is in-memory**: the `Map` in `middleware.ts` is reset on every cold
  start (Vercel serverless). This is acceptable for v2. For multi-instance production,
  replace with Upstash Redis + `@upstash/ratelimit` (1-hour migration when ready).
- **CSP `unsafe-inline`**: Next.js 15 requires `unsafe-inline` for its inline style/script
  injection. This is a known limitation. A nonce-based CSP is a v3 improvement.
- **Prompt injection is probabilistic**: the two-layer defense (sanitize input + scan
  output) significantly reduces risk but cannot guarantee 100% prevention against a
  sufficiently sophisticated adversarial PDF. Document this in the README.
- **Do not change any v1 feature behaviour** — this sprint touches only security
  boundaries, not UX flows.
