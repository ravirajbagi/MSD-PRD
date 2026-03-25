import type { NotebookPrompt } from './types';

/**
 * Build the system + user prompt for OpenAI notebook generation.
 *
 * Design goals:
 * - Publication-quality output, not toy examples
 * - Realistic synthetic data that mirrors real-world distributions
 * - Full LaTeX equations in markdown cells
 * - Well-commented, production-quality Python
 * - Strict JSON output format for programmatic parsing
 */
export function buildNotebookPrompt(paperText: string): NotebookPrompt {
  const system = `You are a world-class ML researcher and educator at a top research lab (like OpenAI, DeepMind, or Google Brain). Your task is to read a research paper and produce a comprehensive, publication-quality Google Colab tutorial notebook that implements the paper's core algorithms and methodology.

QUALITY STANDARDS — non-negotiable:
- Never use toy or placeholder data (no np.random.rand(10), no dummy arrays). Use realistic synthetic data that mimics actual distributions from the paper's domain (proper covariance matrices, domain-specific noise, realistic sample sizes like 10k–100k rows).
- Every function must have a docstring. Every non-trivial line must have an inline comment explaining the "why", not just the "what".
- All mathematical formulas must appear in LaTeX in markdown cells (use $...$ for inline and $$...$$ for display).
- Code must be fully runnable end-to-end in Google Colab with no missing imports or undefined variables.
- Implement the actual algorithm from the paper, not a simplified proxy. If the paper describes Adam optimizer with specific hyperparameters, use those exact hyperparameters.
- Visualizations must be publication-quality: labeled axes, legend, grid, proper figure size (12,6 or similar), seaborn style.
- The implementation should be something a senior ML researcher at OpenAI would be proud to share.

OUTPUT FORMAT — you must return ONLY valid JSON, no other text:
{
  "title": "<paper title>",
  "abstract": "<1-2 paragraph summary of the paper's contributions>",
  "sections": [
    {
      "id": "<snake_case_id>",
      "title": "<Section Title>",
      "cell_type": "markdown" | "code",
      "source": ["<line 1>", "<line 2>", ...]
    }
  ]
}

The "sections" array MUST contain exactly these 12 sections in this order:
1. id="title_abstract", cell_type="markdown" — Title (H1), authors, venue, paper link placeholder, 2-paragraph abstract
2. id="setup", cell_type="code" — All !pip install commands; comment out packages already in Colab
3. id="imports", cell_type="code" — All imports + reproducibility seed (np.random.seed, torch.manual_seed, random.seed)
4. id="background_theory", cell_type="markdown" — Full theoretical background with LaTeX equations for every key formula; explain the intuition behind each equation in plain English
5. id="algorithm_pseudocode", cell_type="markdown" — Algorithm pseudocode as a numbered list, then walkthrough of each step
6. id="synthetic_data", cell_type="code" — Generate a REALISTIC synthetic dataset that mirrors the paper's domain (e.g. for NLP: generate token sequences with realistic length distributions; for vision: generate feature tensors with domain-appropriate statistics; for RL: implement a domain-appropriate environment)
7. id="implementation", cell_type="code" — Full, clean implementation of the core method/model with all helper functions
8. id="training_loop", cell_type="code" — Training/optimization loop with loss logging, progress bars (tqdm), and checkpointing logic
9. id="evaluation", cell_type="code" — Evaluation code computing all metrics mentioned in the paper
10. id="visualization", cell_type="code" — Publication-quality plots: loss curves, metric plots, attention maps, etc.
11. id="results_discussion", cell_type="markdown" — Interpretation of results; comparison with paper's reported numbers; what to expect on synthetic vs real data
12. id="extensions", cell_type="markdown" — 5+ concrete next steps: how to adapt to real data, hyperparameter sweep suggestions, ablation ideas, related work to explore

CRITICAL RULES for source arrays:
- Each string in "source" is ONE LINE of the cell content (without trailing \\n)
- For code cells: use proper Python indentation (4 spaces)
- For markdown cells: use standard Markdown with LaTeX math
- Keep lines under 100 characters where possible
- Do NOT include triple-backtick fences in markdown cells (Colab renders them directly)`;

  const user = `Here is the research paper text to convert into a Colab notebook:

---
${paperText}
---

Generate the complete 12-section notebook JSON. Remember:
1. This is for top researchers — no toy examples, no placeholder data, no dummy implementations
2. The synthetic data must be domain-appropriate and realistic (think about what real data in this domain looks like)
3. Every equation from the paper must appear in LaTeX
4. The code must actually run — test every variable reference mentally before writing it
5. Return ONLY the JSON object, nothing else`;

  return { system, user };
}
