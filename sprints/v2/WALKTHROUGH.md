# Sprint v2 — Walkthrough

## Summary

Sprint v2 addressed every HIGH and MEDIUM severity finding from the v1 security audit.
No new user-facing features were added — this sprint's sole focus was making the
existing application production-safe. All 10 tasks were completed on 2026-03-26; the
final regression run returned 0 semgrep findings, 0 npm audit vulnerabilities, and
7/7 E2E regression tests passing.

---

## Architecture Overview

```
Browser Request
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│  middleware.ts — IP-based sliding-window rate limiter        │
│  (runs before every matched API route)                       │
│                                                              │
│  /api/generate        → 5 req / 10 min per IP               │
│  /api/extract         → 20 req / 10 min per IP              │
│  /api/notebook/publish → 10 req / 10 min per IP             │
│                                                              │
│  429 Too Many Requests  ◄── if limit exceeded                │
└─────────────────────┬───────────────────────────────────────┘
                      │ (passes through)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  next.config.ts — HTTP Security Headers (all routes)        │
│  CSP · X-Frame-Options · HSTS · X-Content-Type-Options      │
│  Referrer-Policy · Permissions-Policy                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
          ┌───────────┼────────────────┐
          ▼           ▼                ▼
   /api/extract  /api/generate   /api/notebook/publish
        │              │                  │
    PDF size &     API key regex     notebookJson
    type check     paperText cap     present check
        │              │                  │
    parsePdf()   sanitizePaperText()  createGist()
                       │               data.id regex
                  OpenAI API           colabUrl built
                       │                  │
               scanNotebookFor        colabUrl returned
               DangerousCode()         to client
                       │
              SSE: { done, notebook }
                       │
              client validates
              colabUrl prefix
              before window.open()
                       │
              session.setNotebookJson()
              (QuotaExceededError → direct download)

  All routes → logRequest() / logError() → JSON stdout/stderr
```

---

## Files Created/Modified

### `next.config.ts`

**Purpose**: Injects HTTP security headers on every response — both pages and API routes.

**Key export**:
- `headers()` — async function returning an array of header objects matched against `/(.*)`

**How it works**:

Next.js's `headers()` config hook runs at build time and generates static header
injection rules. The `source: "/(.*)"` glob matches every URL in the application,
so security headers are applied uniformly — there is no route that can slip through
without them.

The `SECURITY_HEADERS` array declares six headers as name/value pairs:

```ts
const SECURITY_HEADERS = [
  { key: "X-Frame-Options",         value: "DENY" },
  { key: "X-Content-Type-Options",  value: "nosniff" },
  { key: "Referrer-Policy",         value: "no-referrer" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Permissions-Policy",      value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-inline'; ..." },
];
```

The CSP is the most important header. It locks down which external origins the
browser is allowed to contact (`connect-src 'self' https://api.openai.com https://api.github.com`)
and prevents the page from being embedded in a frame (`frame-ancestors 'none'`), which
mitigates clickjacking. The `unsafe-inline` on `script-src` and `style-src` is a
known limitation imposed by Next.js's runtime — a nonce-based CSP is the v3 upgrade path.

---

### `middleware.ts`

**Purpose**: IP-based sliding-window rate limiter that intercepts the three API routes
before any handler logic runs.

**Key exports**:
- `middleware(req)` — the Next.js middleware function
- `config.matcher` — declares which routes are intercepted

**How it works**:

The rate limits are configured as a static table:

```ts
const RATE_LIMITS = {
  '/api/generate':         { limit: 5,  windowMs: 10 * 60 * 1000 },
  '/api/extract':          { limit: 20, windowMs: 10 * 60 * 1000 },
  '/api/notebook/publish': { limit: 10, windowMs: 10 * 60 * 1000 },
};
```

State is kept in a module-level `Map<string, number[]>` (`requestLog`) where each
key is `"IP:pathname"` and the value is an array of request timestamps. On every
request, the middleware:

1. Extracts the IP from `X-Forwarded-For` (falls back to `127.0.0.1`)
2. Builds the key: `"10.11.12.13:/api/generate"`
3. Filters out timestamps older than the window (`now - windowMs`)
4. If `timestamps.length >= limit` → returns `429` with a `Retry-After` header
5. Otherwise appends the current timestamp and calls `NextResponse.next()`

The sliding-window approach (versus a fixed-window counter) prevents burst abuse
at window boundaries. The trade-off is that state resets on every Vercel cold start.
For single-instance development and low-traffic production this is acceptable; the
code comment documents the Upstash Redis upgrade path.

---

### `lib/sanitize.ts`

**Purpose**: Layer 1 of prompt injection defense — strips known adversarial patterns
from PDF-extracted text before it enters the OpenAI prompt.

**Key export**:
- `sanitizePaperText(text: string): string`

**How it works**:

Prompt injection attacks work by embedding instruction-like text in the PDF that
overrides the system prompt when the content is interpolated. The sanitizer
maintains a list of `RegExp` patterns targeting the most common attack vectors:

```ts
const INJECTION_PATTERNS = [
  /ignore\s+(?:all\s+)?previous\s+instructions?/gi,  // role-override phrase
  /new\s+task\s*:/gi,                                 // instruction injection marker
  /SYSTEM\s*:/g,                                      // explicit role marker
  /\[INST\]/g,   /\[\/INST\]/g,                      // LLaMA/Mistral tokens
  /<\|im_start\|>/g, /<\|im_end\|>/g,                // ChatML tokens
  /<\|endoftext\|>/g,                                 // GPT-2 token
];
```

Each pattern is replaced with an empty string (deleted from the text, not
substituted), so the legitimate surrounding content is preserved. The function
is pure — the original string is not mutated. It is called in `/api/generate`
immediately before the cleaned text is passed to `generateNotebook()`.

**Limitations**: Pattern matching is probabilistic. A sufficiently novel or
obfuscated injection phrase will not be caught here; that is why the output
scanner (Layer 2) exists as a safety net.

---

### `lib/notebook-scanner.ts`

**Purpose**: Layer 2 of prompt injection defense — scans the AI-generated
notebook for dangerous Python code patterns before the result is sent to the client.

**Key export**:
- `scanNotebookForDangerousCode(spec: NotebookSpec): string | null`

**How it works**:

After OpenAI returns a `NotebookSpec`, this scanner iterates over every section.
It skips `markdown` cells entirely and for `code` cells it filters out comment
lines (lines whose first non-whitespace character is `#`) before scanning. This
avoids false positives where a legitimate cell might reference a dangerous function
name in a comment (e.g. "# Note: never use os.system()").

```ts
const executableLines = section.source.filter(
  (line) => !line.trimStart().startsWith('#')
);
const cellSource = executableLines.join('\n');
```

Nine dangerous patterns are checked:

| Pattern | Why it's dangerous |
|---------|-------------------|
| `os.system()` | Executes arbitrary shell commands |
| `subprocess` | Spawns child processes |
| `eval()` / `exec()` | Executes arbitrary Python strings |
| `__import__()` | Dynamic module import bypass |
| `socket.` | Raw network access |
| `import paramiko` | SSH tunneling library |
| `import ftplib` | FTP file exfiltration |
| `import telnetlib` | Unencrypted remote execution |

If any pattern matches, the function returns a descriptive error string (naming
the section ID and the detected pattern). The caller in `/api/generate` emits
this as `{ error: "..." }` over the SSE stream instead of `{ done, notebook }`,
so the malicious notebook never reaches the browser.

---

### `app/api/generate/route.ts` (modified)

**Purpose**: Main notebook generation API route — now hardened with three new guards.

**Changes in v2**:
1. **API key format validation** — rejects keys not matching `/^sk-[a-zA-Z0-9\-]{20,}$/`
2. **paperText length cap** — rejects text longer than 100,000 characters with a clear error
3. **Sanitize + scan pipeline** — calls `sanitizePaperText()` on input, then
   `scanNotebookForDangerousCode()` on the generated spec

```ts
// Guard 1: key format
const API_KEY_REGEX = /^sk-[a-zA-Z0-9\-]{20,}$/;
if (!apiKey || !API_KEY_REGEX.test(apiKey.trim()))
  return NextResponse.json({ error: 'Invalid API key format.' }, { status: 400 });

// Guard 2: length cap
if (paperText.length > 100_000)
  return NextResponse.json({ error: 'Paper text exceeds maximum length of 100,000 characters.' }, { status: 400 });

// Guard 3: sanitize input, scan output
const spec = await generateNotebook(sanitizePaperText(paperText.trim()), ...);
const scanResult = scanNotebookForDangerousCode(spec);
if (scanResult) { emit({ error: scanResult }); controller.close(); return; }
```

The route also now calls `logRequest()` on success and `logError()` on failure,
and sanitizes error messages to remove any API key values before emitting them
over SSE (`message.replace(/sk-[a-zA-Z0-9-_]+/g, '[REDACTED]')`).

---

### `components/api-key-form.tsx` (modified)

**Purpose**: Landing page form where users enter their OpenAI API key — now
validates format client-side before any navigation occurs.

**Change in v2**: The `validate()` function now applies the same regex as the server:

```ts
function validate(key: string): string {
  if (!key.trim()) return 'API key is required to continue.';
  if (!/^sk-[a-zA-Z0-9\-]{20,}$/.test(key.trim()))
    return 'Invalid API key format — must start with sk-';
  return '';
}
```

Client-side validation provides immediate feedback without a round trip. The
server-side guard in `route.ts` is the authoritative check — the client validation
is a UX improvement, not a security boundary.

---

### `lib/gist-client.ts` (modified)

**Purpose**: Creates an anonymous GitHub Gist and returns a Colab URL — now
validates the Gist ID format before constructing the URL.

**Change in v2**:

```ts
if (!/^[a-f0-9]+$/.test(data.id)) {
  throw new Error(`Unexpected Gist ID format: ${data.id}`);
}
```

GitHub Gist IDs are hexadecimal strings. If the API returns something unexpected
(tampered response, API change, MITM), this guard prevents constructing a Colab
URL from arbitrary data and surfacing it to the user.

---

### `components/result-actions.tsx` (modified)

**Purpose**: Result page buttons (Download .ipynb, Open in Google Colab) — now
validates the Colab URL from the server before opening it in a new tab.

**Change in v2**:

```ts
if (!data.colabUrl.startsWith('https://colab.research.google.com/')) {
  throw new Error('Invalid Colab URL received from server.');
}
window.open(data.colabUrl, '_blank', 'noopener,noreferrer');
```

Without this check, a compromised API response could cause `window.open` to
navigate the user to an arbitrary URL. The `startsWith` check is intentionally
strict — only Google Colab URLs are allowed.

---

### `lib/session.ts` (modified)

**Purpose**: Client-side `sessionStorage` wrapper — now handles `QuotaExceededError`
gracefully instead of throwing.

**Key change**: A private `safeSet()` helper wraps every `setItem` call:

```ts
function safeSet(key: string, value: string): boolean {
  if (!isClient()) return false;
  try {
    sessionStorage.setItem(key, value);
    return true;
  } catch {
    return false;  // QuotaExceededError or any other storage error
  }
}
```

All setter methods (`setApiKey`, `setPaperText`, `setPaperTitle`, `setNotebookJson`)
now return `boolean`. Callers can detect storage failure and respond appropriately.
Browsers typically enforce a 5–10 MB `sessionStorage` limit; a large research paper
notebook can exceed this.

---

### `app/processing/page.tsx` (modified)

**Purpose**: Notebook generation progress screen — now handles the case where the
generated notebook is too large to store in `sessionStorage`.

**Change in v2**: After receiving the `done` SSE event, the page checks the return
value of `setNotebookJson`:

```ts
const saved = session.setNotebookJson(event.notebook);
if (!saved) {
  setErrorMessage('Notebook is too large to store in browser storage. Please download directly.');
  setPhase('error');
  // Trigger direct Blob download as fallback
  const blob = new Blob([event.notebook], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'notebook.ipynb'; a.click();
  URL.revokeObjectURL(url);
  return;
}
```

The user still receives their notebook via a browser download even when storage
is full — the generation work is not lost.

---

### `lib/logger.ts` (new)

**Purpose**: Structured JSON request/error logger shared across all three API routes.

**Key exports**:
- `logRequest(route, ip, status, durationMs)` — emits to `console.log`
- `logError(route, ip, error)` — emits to `console.error` with API key redaction

**How it works**:

Both functions emit a single JSON line per call, suitable for Vercel log drains,
Datadog, or any JSON-aware aggregator:

```json
// Success
{ "ts": "2026-03-26T10:00:00Z", "route": "/api/generate", "ip": "1.2.3.4", "status": 200, "duration_ms": 4201 }

// Error
{ "ts": "2026-03-26T10:00:01Z", "route": "/api/generate", "ip": "1.2.3.4", "error": "OpenAI auth failed for key [REDACTED]" }
```

API key values are redacted before any string reaches the logger via a module-level
regex `/sk-[a-zA-Z0-9\-]+/g → '[REDACTED]'`. This ensures that even if an error
message accidentally captures the key (e.g. from an OpenAI SDK exception), it is
never written to logs.

---

## Data Flow

### Normal request (no security events)

```
User enters API key (sk-...) on landing page
  → client validates format with regex
  → session.setApiKey() stores in sessionStorage
  → navigate to /upload

User uploads PDF
  → POST /api/extract
    → middleware checks rate limit (IP: 20 req/10 min)
    → route validates MIME type + size
    → parsePdf() extracts text
    → logRequest() emits JSON log
    → returns { text, pageCount, title }
  → session.setPaperText(), session.setPaperTitle()
  → navigate to /processing

Processing page opens SSE stream to POST /api/generate
  → middleware checks rate limit (IP: 5 req/10 min)
  → route validates API key format (regex)
  → route validates paperText length (≤ 100k chars)
  → sanitizePaperText() strips injection patterns from text
  → generateNotebook() calls OpenAI API → NotebookSpec
  → scanNotebookForDangerousCode() checks all code cells
  → if clean: emit { done, notebook, title } over SSE
  → logRequest() emits JSON log
  → client receives { done }
    → session.setNotebookJson(notebook) — returns true
    → navigate to /result

Result page reads notebook from sessionStorage
  → user clicks "Open in Google Colab"
    → POST /api/notebook/publish
      → middleware checks rate limit (IP: 10 req/10 min)
      → createGist() calls GitHub API
        → data.id validated: /^[a-f0-9]+$/
        → colabUrl constructed
      → logRequest() emits JSON log
      → returns { colabUrl, filename }
    → client validates: colabUrl.startsWith('https://colab.research.google.com/')
    → window.open(colabUrl, '_blank', 'noopener,noreferrer')
```

### Security event paths

```
Rate limit exceeded:
  middleware → 429 { error: "Rate limit exceeded. Try again in N seconds.", retryAfter: N }
              + Retry-After: N header

Invalid API key:
  /api/generate → 400 { error: "Invalid API key format." }

paperText too long:
  /api/generate → 400 { error: "Paper text exceeds maximum length of 100,000 characters." }

Dangerous code detected in generated notebook:
  /api/generate → SSE: { error: "Generated notebook contains unsafe code in section ... detected subprocess" }
  (notebook is never sent to client)

sessionStorage quota exceeded:
  processing/page.tsx → setPhase('error') + direct Blob download triggered automatically

Invalid colabUrl from server:
  result-actions.tsx → colabState = 'error' → "Could not create Colab link" message shown
```

---

## Test Coverage

**Unit tests** (26 tests total):

| File | Tests | What they cover |
|------|-------|----------------|
| `tests/unit/sanitize.test.ts` | 10 | Clean text unchanged, each of 7 injection patterns removed, empty string |
| `tests/unit/notebook-scanner.test.ts` | 9 | Safe notebook returns null, each of 8 dangerous patterns detected, markdown cell skipped, comment line skipped |
| `tests/unit/session-quota.test.ts` | 3 | Normal write succeeds, QuotaExceededError returns false on setNotebookJson, QuotaExceededError returns false on setApiKey |
| `tests/unit/logger.test.ts` | 4 | logRequest emits correct JSON shape, duration_ms is a number, logError redacts API key, ts is an ISO 8601 string |

**E2E tests** (30 tests total):

| File | Tests | What they cover |
|------|-------|----------------|
| `tests/e2e/task1-security-headers.spec.ts` | 8 | All 6 headers present, CSP value, HSTS value, X-Frame-Options DENY |
| `tests/e2e/task2-api-key-validation.spec.ts` | 7 | Client-side regex rejection, server-side 400 for invalid keys, valid key format accepted |
| `tests/e2e/task3-paper-text-length.spec.ts` | 3 | Under limit passes, over limit returns 400 with correct error message |
| `tests/e2e/task6-colab-url-validation.spec.ts` | 2 | Bad colabUrl shows error UI, valid colabUrl proceeds normally |
| `tests/e2e/task8-rate-limiting.spec.ts` | 3 | 5 requests succeed, 6th returns 429, Retry-After header present |
| `tests/e2e/task10-security-regression.spec.ts` | 7 | All 6 headers + correct values, CSP connect-src restrictions, frame-ancestors none, API key rejection, paperText cap, rate limiting, screenshot |

**Total: 56 tests (26 unit, 30 E2E)**

---

## Security Measures

All 9 findings from the v1 audit were closed:

| Finding | Severity | Solution |
|---------|----------|---------|
| No HTTP security headers | HIGH | `next.config.ts` `headers()` block — 6 headers on all routes |
| Prompt injection via raw PDF | HIGH | Two-layer: `sanitizePaperText()` strips injection tokens; `scanNotebookForDangerousCode()` blocks dangerous output |
| No rate limiting | HIGH | `middleware.ts` sliding-window per IP per route |
| No server-side `paperText` length cap | MEDIUM | 100,000 char guard with explicit error message |
| Weak API key validation (length only) | MEDIUM | Format regex `/^sk-[a-zA-Z0-9\-]{20,}$/` on client and server |
| `colabUrl` opened without validation | MEDIUM | `startsWith('https://colab.research.google.com/')` before `window.open` |
| `QuotaExceededError` not caught | MEDIUM | `safeSet()` wrapper; boolean return; direct download fallback |
| `data.id` not format-validated | LOW | `/^[a-f0-9]+$/` check before constructing Colab URL |
| No structured logging | LOW | `lib/logger.ts` with API key redaction on all three routes |

**Final scan results (2026-03-26)**:
- `npm audit`: 0 vulnerabilities
- `semgrep --config auto .`: 0 findings
- `npm run build`: success (TypeScript clean)

---

## Known Limitations

1. **Rate limiting is in-memory** — the `Map` in `middleware.ts` resets on every
   Vercel cold start. Under multi-instance deployments, each instance has its own
   counter, so the effective rate limit is `N × limit` where N is the number of
   instances. Upgrade path: `@upstash/ratelimit` + `@upstash/redis`.

2. **CSP `unsafe-inline`** — Next.js 15 injects inline `<script>` and `<style>`
   tags at runtime that cannot be removed without switching to a nonce-based CSP.
   `unsafe-inline` significantly weakens the XSS protection provided by CSP.
   Upgrade path: nonce injection via `middleware.ts` in v3.

3. **Prompt injection is probabilistic** — `sanitizePaperText()` covers known
   attack patterns by regex. A novel or obfuscated injection phrase that does not
   match any of the 8 patterns will pass through. The output scanner is a
   second-chance catch, but it only detects known dangerous code patterns — a
   sophisticated attack could still produce harmful-but-subtle notebook code.

4. **No authentication** — the API key is stored in `sessionStorage` and sent
   in POST body. There is no user identity, so rate limiting is per-IP only and
   can be bypassed with IP rotation. Authentication and per-user limits are
   deferred to v3.

5. **No CORS configuration** — `next.config.ts` does not set explicit CORS
   headers. Next.js defaults to same-origin for API routes, which is correct
   for a browser-only client. If a server-side or third-party client ever calls
   these APIs directly, CORS headers will need to be added.

6. **Gist IDs are hex only** — GitHub's current Gist API returns hex IDs, but
   this is undocumented. If GitHub ever changes the ID format, the `/^[a-f0-9]+$/`
   validation will incorrectly block valid Gists.

---

## What's Next (v3)

Based on the remaining limitations and the v2 PRD's out-of-scope list:

1. **User accounts + authentication** — NextAuth.js with credentials/OAuth.
   Enables per-user rate limits, saved notebook history, and removes the need
   to enter an API key on every session.

2. **Nonce-based CSP** — Remove `unsafe-inline` from `script-src` / `style-src`
   by generating a per-request nonce in `middleware.ts` and threading it through
   to Next.js's `<Script>` components.

3. **Upstash Redis rate limiting** — Replace the in-memory `Map` with
   `@upstash/ratelimit` for accurate, distributed rate limiting across all
   Vercel instances.

4. **Notebook preview** — Render the generated `.ipynb` in the browser before
   the user downloads or opens in Colab, so they can verify correctness without
   leaving the page.

5. **Persistent notebook storage** — Store generated notebooks in a database
   (Prisma + PostgreSQL) so users can retrieve past generations without re-running
   the OpenAI call.

6. **Batch PDF processing** — Allow users to upload multiple papers and generate
   notebooks for each, with a queue and status page.
