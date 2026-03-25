# Sprint v1 — PRD: Research Paper to Colab Notebook Generator

## Overview
Build a web application where researchers upload a PDF (research paper), enter their OpenAI API key, and receive a publication-quality Google Colab notebook that replicates the paper's algorithms and methodology as a tutorial — complete with synthetic but realistic data, detailed markdown explanations, and runnable code. The UI follows the aesthetic of arcprize.org: dark, minimal, and scientifically precise.

## Goals
- User can enter their OpenAI API key on app load and proceed to upload
- User can drag-and-drop or browse-upload a PDF research paper
- App extracts full paper text and sends it to OpenAI's best reasoning model (gpt-4.5) with a structured prompt
- App streams live status messages to the user while the notebook is being generated (no blank waiting screens)
- User receives a downloadable `.ipynb` file and an "Open in Colab" button that opens the notebook directly in Google Colab

## User Stories
- As a researcher at OpenAI/DeepMind, I want to upload a PDF and get a runnable Colab notebook, so that I can replicate and extend paper results without starting from scratch
- As a researcher, I want the notebook to use realistic synthetic data (not toy examples), so that the implementation is directly applicable to my research workflow
- As a user, I want to see live status updates while waiting, so that I stay engaged and trust the system is working
- As a user, I want to download the `.ipynb` file or open it directly in Colab, so that I can immediately start experimenting
- As a user, I want to enter my own API key, so that I pay for my own usage and nothing is stored server-side

## Technical Architecture

**Frontend**: Next.js 14 (App Router) + Tailwind CSS + shadcn/ui
**Backend**: Next.js API routes (serverless)
**AI Model**: OpenAI `gpt-4.5` (or latest available reasoning model via OpenAI API)
**PDF Parsing**: `pdf-parse` (server-side Node.js)
**Notebook Format**: Jupyter `.ipynb` JSON spec (built programmatically)
**Streaming**: Server-Sent Events (SSE) for live status updates

### Component Diagram

```
Browser
│
├── [/] Landing Page
│     └── API Key input → stored in sessionStorage only
│
├── [/upload] Upload Page
│     └── Drag-and-drop PDF → POST /api/extract
│
├── [/processing] Processing Page
│     ├── GET /api/generate (SSE stream)
│     │     ├── Status: "Extracting paper structure..."
│     │     ├── Status: "Identifying core algorithms..."
│     │     ├── Status: "Generating implementation cells..."
│     │     ├── Status: "Creating synthetic datasets..."
│     │     └── Status: "Finalizing notebook..."
│     └── Animated progress UI
│
└── [/result] Result Page
      ├── Download .ipynb button
      └── Open in Google Colab button (via colab.new + encoded URL)
```

### Data Flow

```
PDF Upload → /api/extract (pdf-parse) → raw text
     ↓
raw text + API key → /api/generate (SSE)
     ↓
OpenAI gpt-4.5 prompt → structured JSON response
     ↓
JSON → .ipynb builder → base64 encoded notebook
     ↓
Frontend → Download OR Open in Colab link
```

### Notebook Structure (Generated)
Each notebook will contain the following sections as Jupyter cells:

1. **Title + Abstract** (Markdown) — paper title, authors, one-paragraph summary
2. **Setup + Installs** (Code) — `!pip install` all required packages
3. **Imports** (Code) — all imports, reproducibility seed
4. **Background & Theory** (Markdown) — LaTeX equations for key formulas, intuition
5. **Algorithm Deep-Dive** (Markdown + Code) — pseudocode, then Python implementation
6. **Synthetic Dataset Generation** (Code) — realistic data mimicking real-world distributions
7. **Model / Method Implementation** (Code) — full, well-commented implementation
8. **Training / Execution Loop** (Code) — with loss curves, logging
9. **Evaluation & Metrics** (Code) — metrics relevant to the paper
10. **Visualization** (Code) — matplotlib/seaborn plots of results
11. **Results Discussion** (Markdown) — interpretation, expected vs actual output
12. **Extensions & Next Steps** (Markdown) — how to adapt to real data, variations to try

### OpenAI Prompt Strategy
- Use a two-pass approach: first extract structured paper metadata (title, algorithms, datasets, metrics), then generate each notebook section individually to stay within context limits and maximize quality
- System prompt emphasizes: "expert ML researcher", "production-quality code", "realistic synthetic data", "explain every line"

### "Open in Colab" Implementation
Store the generated `.ipynb` as a base64-encoded data URI and use Colab's `colab.research.google.com/github` import pattern via a server-side temporary file endpoint (`/api/notebook/[id]`) with a 1-hour TTL. Colab link format: `https://colab.research.google.com/drive/...` — fallback: GitHub Gist creation using a server-side anonymous Gist API call.

### UI/UX Design Language (ARC-AGI inspired)
- **Background**: Near-black (`#0a0a0a`)
- **Primary accent**: Bright electric blue or orange (per arcprize.org)
- **Font**: `Space Grotesk` (headings) + `JetBrains Mono` (code/technical text)
- **Layout**: Full-width, centered content, generous whitespace
- **Borders**: Subtle `1px` borders with low-opacity white
- **Animations**: Minimal — typewriter effect for status updates, subtle pulse on active elements
- **Tone**: Scientific, precise, research-grade — not "consumer app"

## Out of Scope (v2+)
- User authentication / accounts
- Usage tracking / rate limiting
- Saving notebooks to cloud storage
- Multi-paper batch processing
- Custom notebook templates
- Sharing notebooks with other users
- Stripe / billing integration

## Dependencies
- None (greenfield project)
- Requires: OpenAI API key (user-provided, never stored server-side)
- Requires: Node.js 18+, npm
