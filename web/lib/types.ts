// ─── Notebook Types ───────────────────────────────────────────────────────────

export type CellType = 'code' | 'markdown';

export interface NotebookCell {
  /** Unique section identifier (e.g. "setup", "imports", "background") */
  id: string;
  /** Human-readable section title */
  title: string;
  /** Whether this is a code cell or a markdown cell */
  cell_type: CellType;
  /**
   * Array of source lines for this cell.
   * For markdown: each element is a line of markdown (including LaTeX math).
   * For code: each element is a line of Python code.
   * Lines should NOT end with \n — the notebook builder adds those.
   */
  source: string[];
}

export interface NotebookSpec {
  /** Paper title as extracted or inferred */
  title: string;
  /** One-paragraph abstract summarising the paper */
  abstract: string;
  /** Ordered array of 12 notebook sections */
  sections: NotebookCell[];
}

// ─── OpenAI Prompt Types ──────────────────────────────────────────────────────

export interface NotebookPrompt {
  system: string;
  user: string;
}

// ─── API Response Types ───────────────────────────────────────────────────────

export interface ExtractResponse {
  text: string;
  pageCount: number;
  title: string | null;
  truncated: boolean;
}

export interface GenerateStatusEvent {
  status: string;
}

export interface GenerateDoneEvent {
  done: true;
  notebook: string; // JSON-stringified .ipynb
}

export interface GenerateErrorEvent {
  error: string;
}

export type GenerateEvent = GenerateStatusEvent | GenerateDoneEvent | GenerateErrorEvent;

// ─── Jupyter Notebook Types ───────────────────────────────────────────────────

export interface JupyterCell {
  cell_type: 'code' | 'markdown';
  metadata: Record<string, unknown>;
  source: string[];
  outputs?: unknown[];
  execution_count?: number | null;
}

export interface JupyterNotebook {
  nbformat: 4;
  nbformat_minor: 5;
  metadata: {
    kernelspec: {
      display_name: 'Python 3';
      language: 'python';
      name: 'python3';
    };
    language_info: {
      name: 'python';
      version: string;
    };
    colab?: {
      name: string;
      provenance: unknown[];
    };
  };
  cells: JupyterCell[];
}
