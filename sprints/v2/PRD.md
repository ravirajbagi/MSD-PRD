# Sprint v2 — PRD: Security Hardening

## Overview
Address every HIGH and MEDIUM severity finding from the v1 security audit. No new
features — this sprint exists entirely to make the existing v1 application production-safe
before any public launch or user growth. All 9 findings are fixed; the app must pass a
re-run of the manual audit checklist at the end of the sprint.

## Goals
- All HTTP security headers in place (CSP, X-Frame-Options, HSTS, X-Content-Type-Options,
  Referrer-Policy, Permissions-Policy)
- IP-based rate limiting active on all three API routes
- Prompt injection mitigated: PDF text sanitized before entering the prompt, generated
  Python cells scanned for dangerous imports before the notebook is returned to the client
- All input validation gaps closed (paperText max length, API key format, colabUrl
  validation, sessionStorage quota error handling, GitHub gist ID validation)
- Structured server-side request logging on all API routes
- Re-run of semgrep auto + npm audit returns 0 findings

## Security Findings Addressed

| # | Finding | Severity | Fix |
|---|---------|----------|-----|
| 1 | No HTTP security headers | HIGH | `next.config.ts` headers() block |
| 2 | Prompt injection via raw PDF content | HIGH | Input sanitization + output scanner |
| 3 | No rate limiting | HIGH | IP-based limits via Next.js middleware |
| 4 | No server-side `paperText` length cap | MEDIUM | Max 100k char guard in route |
| 5 | Weak API key validation (length only) | MEDIUM | Format regex `sk-[a-zA-Z0-9]{20,}` |
| 6 | `colabUrl` opened without validation | MEDIUM | `startsWith` check client-side |
| 7 | `QuotaExceededError` not caught | MEDIUM | try/catch around sessionStorage writes |
| 8 | `data.id` not format-validated | LOW | Regex `/^[a-f0-9]+$/` check |
| 9 | No structured logging | LOW | Per-route request/error logger |

## User Stories
- As a developer deploying this app, I want HTTP security headers set so that browser
  security scanners (securityheaders.com) return grade A
- As a researcher, I want the app to reject malicious PDFs that attempt prompt injection,
  so that the generated notebook is always safe to run
- As a user, I want the app to stay responsive under load, so that GitHub rate limit hits
  or concurrent generation requests don't break the experience for everyone
- As an operator, I want structured logs on every API call so that I can debug issues and
  detect abuse patterns without digging through raw stdout

## Technical Architecture

No new dependencies for most tasks. Rate limiting uses Next.js middleware with an
in-memory sliding window (suitable for single-instance and development; documented
upgrade path to Upstash Redis for multi-instance production).

```
Request → Next.js Middleware (rate limiter, IP extraction)
               │
               ▼
          API Routes
          ├── /api/extract   → input validation → pdf-parse → response logger
          ├── /api/generate  → input validation → sanitizePaperText()
          │                      → OpenAI → scanNotebookForDangerousCode()
          │                      → SSE response → logger
          └── /api/notebook/publish → input validation → gist (id validated)
                                          → validateColabUrl() → logger
```

### Rate Limit Targets

| Route | Limit | Window |
|-------|-------|--------|
| `POST /api/generate` | 5 req | per IP per 10 min |
| `POST /api/extract` | 20 req | per IP per 10 min |
| `POST /api/notebook/publish` | 10 req | per IP per 10 min |

### Prompt Injection Defense (two layers)

**Layer 1 — Input sanitization** (`lib/sanitize.ts`):
Strip or neutralise common injection patterns from `paperText` before it enters the prompt:
- Sequences that attempt to override system role: `ignore.*instructions`,
  `new task:`, `SYSTEM:`, `[INST]`, `<|im_start|>`, `###`
- Excessive repetition of instruction-style keywords

**Layer 2 — Output scanning** (`lib/notebook-scanner.ts`):
After OpenAI returns the notebook JSON, scan all `code` cell sources for dangerous imports
before emitting the `done` SSE event. Block the notebook and return an error if any cell
contains:
- `os.system`, `subprocess`, `eval(`, `exec(`, `__import__`
- `socket.`, `urllib.request.urlopen` with a non-localhost URL
- Any `import` of: `paramiko`, `ftplib`, `telnetlib`

### Security Headers (CSP)

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline';   ← Next.js requires unsafe-inline for now
  style-src 'self' 'unsafe-inline';
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data:;
  connect-src 'self' https://api.openai.com https://api.github.com;
  frame-ancestors 'none'

X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Strict-Transport-Security: max-age=63072000; includeSubDomains
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
```

### Structured Logger

A `lib/logger.ts` module wraps `console.log` / `console.error` with a consistent JSON
structure for Vercel function logs:

```json
{ "ts": "2026-03-26T10:00:00Z", "route": "/api/generate",
  "ip": "1.2.3.4", "status": 200, "duration_ms": 4201 }
```

API key values are never included. The logger is called at the start and end of every
API route handler.

## Out of Scope (v3+)
- User authentication / accounts
- Persistent notebook storage (database)
- Upstash Redis for distributed rate limiting (document as upgrade path, not implement)
- Notebook preview in browser
- Batch PDF processing
- Billing / Stripe

## Dependencies
- v1 sprint complete ✓
- No new npm packages required (rate limiting uses in-memory Map; logger uses console)
- Security header values validated against [securityheaders.com](https://securityheaders.com)
  after deployment
