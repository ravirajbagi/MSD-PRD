# Sprint v1 — Walkthrough

## Summary

Built **PaperToNotebook**, a full-stack Next.js 15 web application that converts research
paper PDFs into publication-quality Google Colab notebooks. A user enters their OpenAI API
key, uploads a PDF, watches live status updates during AI generation (~60–120 seconds), then
downloads the resulting `.ipynb` file or opens it directly in Google Colab. All 10 sprint
tasks are complete, with 41 E2E tests and 8 unit tests passing.

---

## Architecture Overview

```
Browser (Next.js 15 App Router — client-side)
 │
 ├── / (Landing)        → sessionStorage: openai_api_key
 ├── /upload            → POST /api/extract → sessionStorage: paper_text, paper_title
 ├── /processing        → POST /api/generate (SSE stream) → sessionStorage: notebook_json
 └── /result            → POST /api/notebook/publish → GitHub Gist → Colab URL
          │
          ▼
Server (Next.js API Routes — serverless)
 │
 ├── POST /api/extract          ← pdf-parse (v1.1.1, internal path)
 ├── POST /api/generate         ← OpenAI SDK (gpt-4.5-preview / o1 / gpt-4o)
 │         │
 │         └── SSE stream: status events → done { notebook } → error
 └── POST /api/notebook/publish ← GitHub Gist API (anonymous or token)
          │
          ▼
       Colab URL: https://colab.research.google.com/gist/{id}/{slug}
```

**State machine** — all cross-page state lives in `sessionStorage`, never on the server:

```
/ ──[apiKey]──▶ /upload ──[paperText,paperTitle]──▶ /processing ──[notebookJson]──▶ /result
```

---

## Files Created/Modified

---

### `web/lib/fonts.ts`

**Purpose**: Loads Space Grotesk and JetBrains Mono from Google Fonts via `next/font`.

**Key exports**:
- `spaceGrotesk` — variable font injected as `--font-space-grotesk`
- `jetbrainsMono` — variable font injected as `--font-jetbrains-mono`

**How it works**:
`next/font/google` downloads and self-hosts the fonts at build time — no external font
requests at runtime, no FOUT. The font objects expose a `.variable` CSS class string that
`app/layout.tsx` adds to `<html>`, making them available as CSS variables globally.

---

### `web/app/globals.css`

**Purpose**: Global CSS with ARC-AGI design tokens, Tailwind base, and custom animations.

**Key design tokens**:
```css
--accent-electric: #f97316;   /* electric orange — primary brand color */
--background:      #0a0a0a;   /* near-black background */
--surface-1:       #111111;   /* cards, panels */
--foreground:      #f5f5f5;   /* near-white text */
--muted-text:      #888888;   /* secondary text */
```

**Animations**:
- `fadeSlideIn` — entries translate-Y 6px → 0 with opacity fade (used by status feed)
- `pulse-glow` — orange glow pulse (2s cycle, used on primary elements)
- `blink` — 1s step-end blink (used for cursor block in status feed)

**How it works**:
Tailwind v4 CSS-first config: `@import "tailwindcss"` pulls in utilities, and `@theme inline`
re-maps shadcn's semantic tokens (`--color-primary`, `--color-card`, etc.) to the ARC-AGI
palette. This lets shadcn/ui components automatically use the brand colors without any JS
config file.

---

### `web/app/layout.tsx`

**Purpose**: Next.js root layout — injects fonts, sets metadata, wraps every page.

**How it works**:
Applies both font variable class strings to `<html>`, enabling the CSS variables project-wide.
Sets `<title>` and `<meta description>` for SEO. The `<body>` uses Flexbox column so that
`PageShell` can push the footer to the bottom via `flex-1` on `<main>`.

---

### `web/components/page-shell.tsx`

**Purpose**: Shared layout wrapper present on every page — nav bar, content area, footer.

**Key features**:
- Sticky top nav (`data-testid="top-nav"`) with a 3×3 grid logo icon (center cell orange,
  like an ARC-AGI task cell), brand name, and "powered by GPT-4.5" label
- `<main data-testid="page-main">` with max-width constraint (4xl) and auto-centering
- Footer with version tag and security disclosure: "API key stored in sessionStorage only"

**How it works**:
A pure Server Component (no `'use client'`). Accepts an optional `fullWidth` prop to
disable the `max-w-4xl` constraint for hypothetical full-bleed layouts. The logo grid uses
`Array.from({ length: 9 }).map(...)` to render 9 small divs with varying opacities,
coloring position 4 (center) orange.

---

### `web/lib/session.ts`

**Purpose**: Typed `sessionStorage` wrapper with SSR guard.

**Key exports**:
- `session.setApiKey(key)` / `getApiKey()` → key `openai_api_key`
- `session.setPaperText(text)` / `getPaperText()` → key `paper_text`
- `session.setPaperTitle(title)` / `getPaperTitle()` → key `paper_title`
- `session.setNotebookJson(json)` / `getNotebookJson()` → key `notebook_json`
- `session.clear()` — wipes all four keys

**How it works**:
Every method checks `typeof window !== 'undefined'` before touching `sessionStorage`.
This guard is required because Next.js server-renders pages; any call during SSR would throw
`ReferenceError: sessionStorage is not defined`. The guard causes all getters to return `null`
on the server, which triggers the navigation guards (redirect) once the page hydrates.

---

### `web/components/api-key-form.tsx`

**Purpose**: Client component — API key input with show/hide toggle, validation, and submit.

**Key behavior**:
- `type="password"` by default; SHOW/HIDE button toggles to `type="text"`
- Validates: non-empty, ≥10 chars (catches obviously bad strings)
- Inline error shown in red below the input (`data-testid="api-key-error"`)
- On valid submit: calls `session.setApiKey()` then `router.push('/upload')`
- Enter key also submits the form

**How it works**:
```tsx
function validate(key: string): string {
  if (!key.trim()) return 'API key is required to continue.';
  if (key.trim().length < 10) return 'That doesn\'t look like a valid OpenAI API key.';
  return '';
}
```
The key is never transmitted to any server at this stage — it's written only to
`sessionStorage` and lives there until `POST /api/generate` sends it directly to OpenAI.

---

### `web/app/page.tsx` (Landing page `/`)

**Purpose**: Landing page with product hero, feature pills, and the API key form card.

**Sections**:
1. Animated "Powered by GPT-4.5" pill tag
2. H1 `PaperToNotebook` with orange "To"
3. One-line product description
4. Feature pills: "12-section notebook structure", "LaTeX equations", "Realistic synthetic
   data", "Runnable Python code"
5. `<ApiKeyForm />` inside a surface-1 card
6. Workflow indicator: Enter API Key → Upload PDF → Wait ~60s → Download .ipynb

---

### `web/components/pdf-dropzone.tsx`

**Purpose**: Client component — drag-and-drop PDF upload zone with file validation.

**Key behavior**:
- Drag-over: dashed border turns orange, background tints orange
- File selected: icon turns orange, shows filename + formatted size
- Click anywhere on zone or "Browse Files" button opens the hidden `<input type="file">`
- Validates: must be `application/pdf` or `.pdf` extension; max 50 MB

**How it works**:
```tsx
function validateAndSet(file: File) {
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    onError('Only PDF files are accepted...');
    return;
  }
  if (file.size > 50 * 1024 * 1024) {
    onError('File is too large (max 50 MB)...');
    return;
  }
  onFile(file);
}
```
The hidden `<input>` has `display: none` (not just `opacity-0`) to prevent it from
accidentally capturing pointer events. The `inputRef.current?.click()` call opens the native
file picker from both the zone click and the separate "Browse Files" button.

---

### `web/app/upload/page.tsx` (Upload page `/upload`)

**Purpose**: Step 2 page — hosts the dropzone, validates the file, calls `/api/extract`,
redirects to `/processing`.

**Navigation guard**:
```tsx
useEffect(() => {
  if (!session.getApiKey()) router.replace('/');
}, [router]);
```
If a user navigates directly to `/upload` without an API key, they are sent back to `/`.

**How it works**:
On "Generate Notebook →" click, the page creates a `FormData` with the PDF under the key
`"pdf"` and POSTs it to `/api/extract`. On success, it writes `paper_text` and `paper_title`
to sessionStorage and calls `router.push('/processing')`. On failure, a red error message
appears inline. The button shows a spinner and "Extracting paper..." while loading.

---

### `web/lib/pdf-parser.ts`

**Purpose**: PDF text extraction using `pdf-parse` v1.1.1.

**Critical implementation note** — bypassing pdf-parse's debug-mode bug:
```ts
// Use internal path to bypass pdf-parse's debug-mode test file loading
// (index.js reads a test PDF when module.parent is null, which breaks in Next.js)
const pdfParse = require('pdf-parse/lib/pdf-parse.js');
```
The standard `require('pdf-parse')` hits `index.js` which checks `module.parent === null`
to detect "debug mode". In Next.js App Router (ESM), `module.parent` is always null, so
pdf-parse tries to `readFileSync('./test/data/05-versions-space.pdf')` on every import —
causing a 500 error. Importing `lib/pdf-parse.js` directly bypasses this check entirely.

**Key logic**:
- Truncates extracted text to 80,000 characters (approximately 60–80 pages)
- `extractTitle()`: scans the first 1,000 characters, returns the first non-URL line that is
  between 10–200 characters long — a heuristic that works well for most research papers

---

### `web/app/api/extract/route.ts` (API route `POST /api/extract`)

**Purpose**: Serverless route that accepts a multipart PDF upload and returns extracted text.

**Response shape**:
```json
{ "text": "...", "pageCount": 12, "title": "Attention Is All You Need", "truncated": false }
```

**Error cases**:
- `400` — missing `pdf` field, wrong MIME type, file > 50 MB, unreadable file
- `422` — extracted text < 50 chars (scanned/image-only PDF) or corrupt PDF
- `405` — GET requests

**How it works**:
Validates the file at the route level (type + size) before passing to `parsePdf()`. This
provides defence-in-depth since the dropzone also validates client-side. The 422 "scanned PDF"
check is important because pdf-parse returns an empty string for image-based PDFs — without
this guard, OpenAI would receive an empty prompt.

---

### `web/lib/types.ts`

**Purpose**: Shared TypeScript types used across the entire application.

**Key types**:
- `NotebookCell` — `{ id, title, cell_type, source: string[] }`
- `NotebookSpec` — `{ title, abstract, sections: NotebookCell[] }` (the shape OpenAI must return)
- `JupyterNotebook` — full nbformat 4.5 structure with `kernelspec`, `language_info`, `colab` metadata
- `GenerateEvent` — discriminated union: `GenerateStatusEvent | GenerateDoneEvent | GenerateErrorEvent`

---

### `web/lib/prompt.ts`

**Purpose**: Builds the OpenAI system + user prompt for notebook generation.

**Key exported function**: `buildNotebookPrompt(paperText: string): NotebookPrompt`

**How it works**:
The system prompt positions the model as a "world-class ML researcher at OpenAI/DeepMind"
and lists the exact 12 section IDs OpenAI must produce:
```
title_abstract, setup, imports, background_theory, algorithm_pseudocode,
synthetic_data, implementation, training_loop, evaluation, visualization,
results_discussion, extensions
```
Critical quality enforcement:
```
Never use toy or placeholder data (no np.random.rand(10), no dummy arrays).
Use realistic synthetic data that mimics actual distributions from the paper.
All Python code must be production-quality, well-commented, and immediately runnable.
```
The prompt instructs OpenAI to return a **single JSON object** matching `NotebookSpec`
exactly. `response_format: { type: 'json_object' }` is used to enforce JSON-only output
and prevent markdown fencing around the JSON.

---

### `web/lib/openai-client.ts`

**Purpose**: OpenAI API client — single function that drives notebook generation.

**Key constant**:
```ts
const OPENAI_MODEL = 'gpt-4.5-preview';
const FALLBACK_MODELS = ['o1', 'gpt-4o'];
```

**Key function**: `generateNotebook(paperText, apiKey, onStatus): Promise<NotebookSpec>`

**How it works**:
Creates a per-request `OpenAI` client using the caller-supplied `apiKey` — the key is never
stored at module scope or logged. If `gpt-4.5-preview` returns a 404 (model unavailable), it
retries with `o1`, then `gpt-4o`. Uses `temperature: 0.3` and `max_completion_tokens: 16000`
for consistent, high-quality output. The API key is scrubbed from any error messages via
regex `sk-[a-zA-Z0-9-_]+` → `[REDACTED]` before re-throwing.

---

### `web/lib/notebook-builder.ts`

**Purpose**: Converts a `NotebookSpec` (OpenAI's output) into a valid `.ipynb` JSON file.

**Key exports**:
- `buildJupyterNotebook(spec: NotebookSpec): JupyterNotebook`
- `slugify(title: string): string` — used for filenames and Gist names

**How it works**:
Iterates over `spec.sections` and creates Jupyter cells with proper nbformat 4.5 structure.
A critical detail: Jupyter's format requires source lines to end with `\n` except the very
last line of each cell. The builder adds `\n` to all lines except the last:
```ts
source: cell.source.map((line, i) =>
  i < cell.source.length - 1 ? line + '\n' : line
)
```
Sets `colab.name` in notebook metadata so `/result` can display the paper title. Code cells
get `execution_count: null` and empty `outputs: []` — correct for an unrun notebook.

---

### `web/app/api/generate/route.ts` (API route `POST /api/generate`)

**Purpose**: SSE-streaming API route — the core of the application.

**Configuration**:
```ts
export const maxDuration = 600; // 10-minute Vercel timeout
```

**Request body**: `{ paperText: string, apiKey: string }`

**SSE event format**:
```
data: {"status": "Extracting paper structure..."}\n\n
data: {"status": "Designing notebook architecture..."}\n\n
...
data: {"done": true, "notebook": "{...ipynb JSON...}", "title": "Paper Title"}\n\n
```

**How it works**:
Returns a `ReadableStream` with `Content-Type: text/event-stream` and
`X-Accel-Buffering: no` (prevents nginx from buffering SSE). Inside the stream:

1. A **progress ticker** runs concurrently with the OpenAI call. It cycles through 14
   pre-defined status messages (e.g. "Calling OpenAI gpt-4.5-preview...", "Structuring
   training loop..."), emitting one every 8 seconds. This prevents the user from seeing
   a static screen during the ~60s AI generation wait.

2. `generateNotebook()` is called with the paper text and API key.

3. On success: the ticker is stopped, `buildJupyterNotebook()` converts the spec to `.ipynb`,
   and a `done` event is emitted with the JSON-stringified notebook.

4. On error: a sanitised error message (API key redacted) is emitted and the stream closes.

---

### `web/components/status-feed.tsx`

**Purpose**: Animated vertical feed of status messages, used on the processing page.

**How it works**:
Each message renders with `animate-fade-slide-in` (0.3s ease-out, 50ms stagger per message).
The latest message (while not complete) shows an orange pulsing dot icon and an orange cursor
block `▋` with a `blink` animation. Completed messages show an orange `✓` and dim to
`#888888`. This creates a typewriter-style "live log" effect without any actual typewriter
character-by-character delay.

---

### `web/app/processing/page.tsx` (Processing page `/processing`)

**Purpose**: Step 3 page — connects to the SSE stream and shows live status messages.

**Navigation guards**:
- If no `paper_text` in sessionStorage → redirects to `/`
- If no `api_key` in sessionStorage → redirects to `/`

**How it works**:
Uses `fetch()` (not `EventSource`) because the generate endpoint requires a POST with a body.
`EventSource` only supports GET. Manual SSE reading:
```ts
const reader = res.body!.getReader();
const decoder = new TextDecoder();
let buffer = '';
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split('\n');
  buffer = lines.pop()!; // keep incomplete last chunk
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const event = JSON.parse(line.slice(6));
      // handle status / done / error
    }
  }
}
```
A `hasStarted` ref prevents double-invocation in React Strict Mode (which intentionally
calls effects twice in development). On `done`: saves notebook JSON to sessionStorage,
waits 800ms (so the user sees the final status), then redirects to `/result`.

---

### `web/lib/gist-client.ts`

**Purpose**: Creates an anonymous GitHub Gist containing the `.ipynb` file.

**How it works**:
POSTs to `https://api.github.com/gists` with the notebook content. No OAuth required for
anonymous gists — the GitHub API accepts them without authentication. If `GITHUB_TOKEN` is
set in the environment, it's included as a Bearer token to increase rate limits (useful for
production). Returns a Colab URL:
```
https://colab.research.google.com/gist/{gist_id}/{filename-without-extension}
```
Google Colab reads public gists directly from GitHub's API — no further intermediary needed.

---

### `web/app/api/notebook/publish/route.ts` (API route `POST /api/notebook/publish`)

**Purpose**: Server-side wrapper for `createGist()`. Accepts the raw notebook JSON and
paper title, slugifies the title for the `.ipynb` filename, and returns the Colab URL.

**Error**: Returns 502 if GitHub Gist creation fails (rate limit, network error). The
frontend shows a manual upload fallback in this case.

---

### `web/components/result-actions.tsx`

**Purpose**: Client component — "Download .ipynb" and "Open in Google Colab" action buttons.

**Download flow**:
```ts
const blob = new Blob([notebookJson], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url; a.download = `${slugify(title)}.ipynb`;
a.click();
URL.revokeObjectURL(url);
```
Pure client-side — no network request. The file is constructed entirely from sessionStorage.

**Colab flow**:
POSTs to `/api/notebook/publish` → receives `colabUrl` → calls `window.open(colabUrl, '_blank')`.

**Fallback**:
If Gist creation fails, shows an error box with a link to `colab.new` and instructs the user
to manually upload the downloaded `.ipynb`.

---

### `web/app/result/page.tsx` (Result page `/result`)

**Purpose**: Step 4 (final) page — displays notebook stats and provides download/Colab buttons.

**Navigation guard**: If no `notebook_json` in sessionStorage → redirects to `/upload`.

**`parseNotebookStats()`**:
```ts
const cells = JSON.parse(json).cells ?? [];
return {
  totalCells: cells.length,
  codeCells: cells.filter(c => c.cell_type === 'code').length,
  markdownCells: cells.filter(c => c.cell_type === 'markdown').length,
};
```

**Layout**:
1. Step indicator ("Step 4 of 4 — Complete")
2. Paper title as H1
3. Stats card: Total / Code / Markdown cell counts
4. "Notebook Contents" checklist: all 12 sections listed with orange ✓ marks
5. `<ResultActions />` with Download + Colab buttons
6. "← Generate another notebook" link to `/upload`

---

### `web/components/error-boundary.tsx`

**Purpose**: React class component that catches render-time errors and shows a graceful
fallback instead of a white screen.

**How it works**:
Uses `getDerivedStateFromError` (static, runs during render) to set `hasError: true` and
capture the error message. `componentDidCatch` logs to console (production would send to
Sentry/Datadog). The fallback UI matches the ARC-AGI dark theme with a red warning icon,
error message in JetBrains Mono, and an orange "Start Over" button that links to `/`.

Must be a class component because React Error Boundaries cannot be implemented with hooks.

---

## Data Flow

```
1. User visits / → enters OpenAI API key
   → session.setApiKey('sk-...') → sessionStorage

2. User visits /upload → selects PDF
   → POST /api/extract (FormData { pdf: File })
   → parsePdf(buffer) via pdf-parse v1.1.1 internal path
   → { text: "...", pageCount: 12, title: "Attention Is All You Need" }
   → session.setPaperText(text), session.setPaperTitle(title)

3. /processing mounts → reads sessionStorage for apiKey + paperText
   → fetch POST /api/generate { paperText, apiKey }
   → Server: ReadableStream opens
     ├── Progress ticker: emits status events every 8s
     └── generateNotebook(paperText, apiKey):
           buildNotebookPrompt(paperText) → { system, user }
           OpenAI API: gpt-4.5-preview (→ o1 → gpt-4o fallback)
             response_format: json_object, temp: 0.3, max_tokens: 16000
           parse JSON → NotebookSpec
           buildJupyterNotebook(spec) → JupyterNotebook
   → Server emits: data: { done: true, notebook: "{...}", title: "..." }
   → Client: session.setNotebookJson(notebook) → redirect /result (800ms delay)

4. /result reads sessionStorage.notebook_json
   → parseNotebookStats → display cell counts
   → "Download .ipynb": Blob → object URL → <a>.click()
   → "Open in Colab":
       POST /api/notebook/publish { notebookJson, title }
       → createGist(filename, content) → GitHub API → gist.id
       → colabUrl = https://colab.research.google.com/gist/{id}/{slug}
       → window.open(colabUrl, '_blank')
```

---

## Test Coverage

**Unit (Vitest)**:
- `tests/unit/prompt.test.ts` — 8 tests
  - `buildNotebookPrompt()` returns a system + user object
  - System prompt contains all 12 section IDs
  - System prompt includes no-toy-data enforcement text
  - System prompt includes LaTeX math instructions
  - `NotebookSpec` type shape is valid
  - Prompt handles empty paper text
  - Prompt handles very long paper text (truncation behaviour)
  - User prompt includes paper text verbatim

**E2E (Playwright / Chromium)**:
- `task1-setup.spec.ts` — 3 tests: dev server starts, Tailwind works, shadcn Button renders
- `task2-theme.spec.ts` — 5 tests: background color, font variables, nav bar, footer, animations
- `task3-landing.spec.ts` — 6 tests: product name, description, API key form, validation, navigation, feature pills
- `task4-upload.spec.ts` — 4 tests: dropzone visible, file selection, browse button, generate button gating
- `task5-extract-api.spec.ts` — 5 tests: valid PDF extraction, MIME type rejection, size limit, empty text rejection, GET → 405
- `task7-generate-api.spec.ts` — 5 tests: SSE stream opens, status events emitted, done event shape, error event on bad key, Content-Type header
- `task8-processing.spec.ts` — 3 tests: status feed renders, spinner visible, error state with retry link
- `task9-result.spec.ts` — 5 tests: stats card visible, download button, Colab button, section checklist, generate-another link
- `task10-e2e-wiring.spec.ts` — 5 tests: /upload guard, /processing guard, /result guard, happy-path navigation, error boundary

**Total: 8 unit + 41 E2E = 49 tests**

---

## Security Measures

1. **API key never logged or stored server-side** — `openai-client.ts` creates a throwaway
   `OpenAI(apiKey)` instance per request. The key is redacted from error messages via regex
   before any logging or re-throwing.

2. **API key in sessionStorage only** — cleared when the browser tab closes. Never sent to
   the server except inside the POST body of `/api/generate`, and only for the duration of
   that request.

3. **Input validation at every boundary**:
   - Client: PDF type + size in `PdfDropzone`
   - Server: MIME type + size + text length in `/api/extract`
   - API key: basic format check in `ApiKeyForm` (min length guard)

4. **`npm audit` — 0 vulnerabilities** at time of implementation.

5. **No CORS misconfiguration** — all API routes are same-origin; no `Access-Control-Allow-Origin: *` headers.

6. **No secrets in client bundle** — `GITHUB_TOKEN` is a server-side env var only, accessed
   in `/api/notebook/publish`. The client never sees it.

---

## Known Limitations

1. **No auth or usage tracking** — any user with an OpenAI key can use the app. Rate limiting
   and abuse prevention are deferred to v2.

2. **sessionStorage is per-tab** — if the user opens the result in a new tab, they lose the
   notebook data. A better v2 design would store the notebook URL on the server.

3. **Anonymous GitHub Gists are public and permanent** — the "Open in Colab" button
   creates a publicly visible gist that cannot be deleted without a GitHub account. Users
   should be warned if the paper is sensitive. v2 could use a `GITHUB_TOKEN` service account.

4. **No notebook preview** — the result page shows section names and cell counts but not
   the actual notebook content. Adding a read-only `.ipynb` renderer would improve UX.

5. **gpt-4.5-preview availability** — this model may be gated. The fallback chain (`o1` →
   `gpt-4o`) works, but `o1` doesn't support `response_format: json_object` in all
   configurations — this could cause a parse failure for some accounts.

6. **Single OpenAI call, no streaming to the client** — the full notebook is generated in
   one blocking call. The progress ticker is synthetic (not driven by actual generation
   progress). True streaming would require OpenAI streaming + incremental notebook building.

7. **Scanned PDFs unsupported** — pdf-parse cannot OCR image-based PDFs. The 422 error
   gives a clear message, but there's no OCR fallback.

8. **No persistent storage** — there is no database. Once the browser tab is closed, all
   data is gone. The downloaded `.ipynb` is the only artifact.

---

## What's Next (v2 Priorities)

Based on the above limitations and the PRD trajectory:

1. **Auth + usage dashboard** — NextAuth.js with GitHub/Google OAuth; per-user rate limiting
   (token budget); usage history (previous generations with re-download links)

2. **Persistent notebook storage** — save generated notebooks to a database (Supabase or
   PlanetScale) keyed by user ID; re-downloadable from a dashboard

3. **Notebook preview** — render the `.ipynb` in the browser using `@jupyterlab/notebook`
   or a lighter-weight renderer before download

4. **Real generation progress** — use OpenAI streaming API to show actual token generation
   progress rather than a synthetic ticker

5. **"Open in Colab" with user's GitHub** — use OAuth to create gists under the user's
   own account (deletable, private option)

6. **Better model handling** — detect and surface when `gpt-4.5-preview` is unavailable;
   let users choose the model; show estimated cost before generation

7. **Observability** — Sentry for error reporting; Vercel Analytics for page views; custom
   events for conversion funnel (upload → processing → result → download)
