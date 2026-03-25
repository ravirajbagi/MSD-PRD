import type { NotebookSpec, NotebookCell, JupyterNotebook, JupyterCell } from './types';

/**
 * Convert a NotebookSpec (from OpenAI) into a valid Jupyter .ipynb JSON object.
 *
 * The output is a standard nbformat 4.5 notebook compatible with Google Colab.
 */
export function buildJupyterNotebook(spec: NotebookSpec): JupyterNotebook {
  const cells: JupyterCell[] = spec.sections.map((section) =>
    specCellToJupyterCell(section)
  );

  return {
    nbformat: 4,
    nbformat_minor: 5,
    metadata: {
      kernelspec: {
        display_name: 'Python 3',
        language: 'python',
        name: 'python3',
      },
      language_info: {
        name: 'python',
        version: '3.10.0',
      },
      colab: {
        name: slugify(spec.title) + '.ipynb',
        provenance: [],
      },
    },
    cells,
  };
}

function specCellToJupyterCell(cell: NotebookCell): JupyterCell {
  // Jupyter source lines must end with \n except the last line
  const source = cell.source.map((line, i) =>
    i < cell.source.length - 1 ? line + '\n' : line
  );

  if (cell.cell_type === 'code') {
    return {
      cell_type: 'code',
      metadata: { id: cell.id },
      source,
      outputs: [],
      execution_count: null,
    };
  }

  return {
    cell_type: 'markdown',
    metadata: { id: cell.id },
    source,
  };
}

/**
 * Serialize a JupyterNotebook to a JSON string ready for .ipynb download.
 */
export function notebookToJson(notebook: JupyterNotebook): string {
  return JSON.stringify(notebook, null, 1);
}

/**
 * Convert a notebook title to a valid filename slug.
 */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
}
