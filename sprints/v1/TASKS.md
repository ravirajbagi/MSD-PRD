# Sprint v1 — Tasks

## Status: Complete ✓

---

- [x] Task 1: Initialize Next.js 14 project with Tailwind CSS + shadcn/ui (P0)
  - Acceptance: `npm run dev` starts on localhost:3000 without errors; Tailwind works; shadcn/ui Button component renders
  - Files: `package.json`, `tailwind.config.ts`, `app/layout.tsx`, `app/globals.css`, `components.json`
  - Completed: 2026-03-25 — Next.js 15 (latest) scaffolded in `web/` subdirectory; shadcn/ui v4 initialized; Playwright installed; 3/3 E2E tests pass; 0 npm audit vulnerabilities

- [x] Task 2: Implement global ARC-AGI dark theme — colors, fonts, layout shell (P0)
  - Acceptance: App uses near-black background (`#0a0a0a`), Space Grotesk headings, JetBrains Mono for code/mono text, electric accent color; a shared `<PageShell>` component wraps all pages with centered layout and subtle top navigation bar
  - Files: `app/globals.css`, `app/layout.tsx`, `components/page-shell.tsx`, `lib/fonts.ts`
  - Completed: 2026-03-25 — ARC-AGI dark theme applied (#0a0a0a bg, #f97316 electric orange accent, Space Grotesk + JetBrains Mono fonts); PageShell with grid logo, sticky nav, security footer; 5/5 E2E tests pass

- [x] Task 3: Build the Landing / API Key page (`/`) (P0)
  - Acceptance: Page shows product name, one-line description, a password-input field for the OpenAI API key, and a "Get Started" button; key is stored in `sessionStorage` (never sent to server before the user explicitly triggers generation); pressing Enter or clicking the button navigates to `/upload`; empty key shows inline validation error
  - Files: `app/page.tsx`, `components/api-key-form.tsx`, `lib/session.ts`
  - Completed: 2026-03-25 — Full hero landing page with feature pills; API key form with show/hide toggle, inline validation, sessionStorage storage; 6/6 E2E tests pass

- [x] Task 4: Build the PDF Upload page (`/upload`) with drag-and-drop (P0)
  - Acceptance: Page shows a large drag-and-drop zone + "Browse Files" button; only `.pdf` files accepted (validated client-side); selected file name + size shown; "Generate Notebook" button disabled until a file is selected; clicking the button POSTs the PDF (as FormData) to `/api/extract` then redirects to `/processing`; PDF stored temporarily in `sessionStorage` as base64 for the next step
  - Files: `app/upload/page.tsx`, `components/pdf-dropzone.tsx`
  - Completed: 2026-03-25 — Drag-and-drop zone with file icon state, Browse Files button, PDF-only validation, filename+size display, Generate button enabled on valid file; 4/4 E2E tests pass

- [x] Task 5: Create `/api/extract` route — server-side PDF text extraction (P0)
  - Acceptance: Accepts `multipart/form-data` with a PDF file; uses `pdf-parse` to extract full text; returns `{ text: string, pageCount: number, title: string | null }` as JSON; handles errors (corrupt PDF, empty text) with descriptive error messages; text is truncated to 80,000 chars if too long with a warning
  - Files: `app/api/extract/route.ts`, `lib/pdf-parser.ts`
  - Completed: 2026-03-25 — pdf-parse v1.1.1 via internal path (bypasses debug-mode test loading); 405/400/422 error handling; 5/5 E2E tests pass

- [x] Task 6: Build the structured OpenAI prompt template for notebook generation (P0)
  - Acceptance: A `buildNotebookPrompt(paperText: string)` function returns a complete system + user prompt that instructs GPT to produce a JSON response matching the `NotebookSpec` TypeScript type (title, abstract, 12 ordered sections each with `cell_type`, `source` array); prompt includes explicit instructions for: realistic synthetic data, LaTeX math in markdown cells, well-commented production-quality Python, no toy examples; `NotebookSpec` type is exported
  - Files: `lib/prompt.ts`, `lib/types.ts`
  - Completed: 2026-03-25 — 12-section prompt with no-toy-data enforcement, LaTeX math instructions, strict JSON output schema; NotebookSpec + JupyterNotebook types; 8/8 unit tests pass

- [x] Task 7: Create `/api/generate` route — SSE-streamed notebook generation via OpenAI (P0)
  - Acceptance: Accepts `POST` with `{ paperText: string, apiKey: string }`; returns a `text/event-stream` SSE response; emits sequential status events like `data: {"status": "Extracting paper structure..."}` at meaningful intervals; calls OpenAI `gpt-4.5` (or `o1` / best available reasoning model) with the prompt from Task 6; on completion emits `data: {"done": true, "notebook": <ipynb JSON string>}`; on error emits `data: {"error": "..."}` and closes stream; API key is used only for this request and never logged or stored
  - Files: `app/api/generate/route.ts`, `lib/openai-client.ts`, `lib/notebook-builder.ts`
  - Completed: 2026-03-25 — SSE stream with progress ticker, model fallback chain (gpt-4.5→o1→gpt-4o), API key never logged, error sanitisation; 5/5 E2E tests pass

- [x] Task 8: Build the Processing / Waiting page (`/processing`) with live status feed (P0)
  - Acceptance: Page connects to `/api/generate` via `EventSource`; displays a vertical feed of status messages that appear one by one with a typewriter animation (each new message fades/types in below the previous); shows an animated spinner or pulsing indicator; once `done` event received, stores the notebook JSON in `sessionStorage` and redirects to `/result`; on error shows an error state with a "Try Again" link back to `/upload`; status messages cover the full generation pipeline so the user is never looking at a static screen for more than 5 seconds
  - Files: `app/processing/page.tsx`, `components/status-feed.tsx`, `hooks/use-sse.ts`
  - Completed: 2026-03-25 — SSE fetch loop, fade-in status feed with blink cursor, animated spinner, error state with retry; 3/3 E2E tests pass

- [x] Task 9: Build the Result page (`/result`) — download + Open in Colab (P0)
  - Acceptance: Page reads notebook JSON from `sessionStorage`; "Download .ipynb" button triggers a client-side file download of the `.ipynb` JSON file named after the paper title (slugified); "Open in Google Colab" button POSTs the notebook to `/api/notebook/publish` which creates an anonymous GitHub Gist and returns a Colab URL (`https://colab.research.google.com/gist/...`), then opens it in a new tab; if Gist creation fails, shows a friendly fallback message instructing the user to upload the downloaded file to colab.new; page also shows paper title, a summary of what was generated (section count, cell count), and a "Generate Another" link
  - Files: `app/result/page.tsx`, `components/result-actions.tsx`, `app/api/notebook/publish/route.ts`, `lib/gist-client.ts`
  - Completed: 2026-03-25 — Stats card (total/code/markdown cells), 12-section checklist, Download + Open in Colab buttons, anonymous Gist fallback to manual upload; 5/5 E2E tests pass

- [x] Task 10: End-to-end wiring — global state, error boundaries, and navigation guards (P1)
  - Acceptance: Navigating directly to `/upload` without an API key redirects to `/`; navigating directly to `/processing` or `/result` without prior data redirects appropriately; a React Context (or Zustand store) holds `{ apiKey, paperText, notebookJson }` across page navigations with `sessionStorage` backing; all pages have `<ErrorBoundary>` components with graceful fallback UI; `npm run build` completes without TypeScript errors
  - Files: `lib/app-context.tsx`, `components/error-boundary.tsx`, updates to all page files
  - Completed: 2026-03-25 — Navigation guards on all protected routes; ErrorBoundary component; npm run build passes with 0 TS errors; 5/5 E2E tests pass

---

## Notes
- **API Key security**: The OpenAI API key must ONLY be read from `sessionStorage` on the client and passed directly in the `POST /api/generate` request body. It must never be logged, cached, or stored server-side beyond the duration of the API call.
- **Model**: Use `gpt-4.5` as the primary model. If unavailable, fall back to `o1` or `gpt-4o`. The model name should be a constant in `lib/openai-client.ts` so it's easy to update.
- **Notebook quality bar**: The generated notebook should be indistinguishable from something a senior ML researcher wrote by hand. Enforce this in the prompt with explicit negative examples ("do not use placeholder data like `np.random.rand(10)`").
- **Open in Colab fallback**: GitHub Gist creation requires no OAuth for anonymous gists (just a POST to the GitHub API). Use this as the primary mechanism. The `GITHUB_TOKEN` env var is optional — anonymous gists work without it.
