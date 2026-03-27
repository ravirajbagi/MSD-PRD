import { describe, test, expect } from 'vitest';
import {
  buildJupyterNotebook,
  notebookToJson,
  slugify,
} from '@/lib/notebook-builder';
import type { NotebookSpec } from '@/lib/types';

function makeSpec(overrides?: Partial<NotebookSpec>): NotebookSpec {
  return {
    title: 'Attention Is All You Need',
    abstract: 'A seminal paper on the Transformer architecture.',
    sections: [
      { id: 'intro', title: 'Introduction', cell_type: 'markdown', source: ['# Introduction', 'Overview text.'] },
      { id: 'code', title: 'Implementation', cell_type: 'code', source: ['import torch', 'print("hello")'] },
    ],
    ...overrides,
  };
}

describe('buildJupyterNotebook()', () => {
  test('returns nbformat: 4', () => {
    const nb = buildJupyterNotebook(makeSpec());
    expect(nb.nbformat).toBe(4);
  });

  test('returns nbformat_minor: 5', () => {
    const nb = buildJupyterNotebook(makeSpec());
    expect(nb.nbformat_minor).toBe(5);
  });

  test('cell count matches spec.sections length', () => {
    const spec = makeSpec();
    const nb = buildJupyterNotebook(spec);
    expect(nb.cells.length).toBe(spec.sections.length);
  });

  test('each cell has cell_type and source', () => {
    const nb = buildJupyterNotebook(makeSpec());
    for (const cell of nb.cells) {
      expect(cell).toHaveProperty('cell_type');
      expect(cell).toHaveProperty('source');
      expect(Array.isArray(cell.source)).toBe(true);
    }
  });

  test('markdown cells have correct cell_type', () => {
    const nb = buildJupyterNotebook(makeSpec());
    expect(nb.cells[0].cell_type).toBe('markdown');
  });

  test('code cells have correct cell_type', () => {
    const nb = buildJupyterNotebook(makeSpec());
    expect(nb.cells[1].cell_type).toBe('code');
  });

  test('code cells have outputs and execution_count', () => {
    const nb = buildJupyterNotebook(makeSpec());
    const codeCell = nb.cells[1];
    expect(codeCell).toHaveProperty('outputs');
    expect(codeCell).toHaveProperty('execution_count');
    expect(codeCell.execution_count).toBeNull();
  });

  test('source lines have \\n appended except last', () => {
    const nb = buildJupyterNotebook(makeSpec());
    const cell = nb.cells[0]; // ['# Introduction', 'Overview text.']
    expect(cell.source[0]).toBe('# Introduction\n');
    expect(cell.source[1]).toBe('Overview text.');
  });

  test('colab metadata uses slugified title', () => {
    const nb = buildJupyterNotebook(makeSpec());
    expect(nb.metadata.colab?.name).toBe('attention-is-all-you-need.ipynb');
  });

  test('handles spec with 12 sections', () => {
    const sections = Array.from({ length: 12 }, (_, i) => ({
      id: `section-${i}`,
      title: `Section ${i}`,
      cell_type: (i % 2 === 0 ? 'markdown' : 'code') as 'markdown' | 'code',
      source: [`Line ${i}`],
    }));
    const nb = buildJupyterNotebook(makeSpec({ sections }));
    expect(nb.cells.length).toBe(12);
  });
});

describe('notebookToJson()', () => {
  test('returns a valid JSON string', () => {
    const nb = buildJupyterNotebook(makeSpec());
    const json = notebookToJson(nb);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  test('parsed JSON has nbformat: 4', () => {
    const nb = buildJupyterNotebook(makeSpec());
    const parsed = JSON.parse(notebookToJson(nb));
    expect(parsed.nbformat).toBe(4);
  });

  test('parsed JSON has correct cell count', () => {
    const spec = makeSpec();
    const nb = buildJupyterNotebook(spec);
    const parsed = JSON.parse(notebookToJson(nb));
    expect(parsed.cells.length).toBe(spec.sections.length);
  });
});

describe('slugify()', () => {
  test('lowercases and replaces spaces with hyphens', () => {
    expect(slugify('Attention Is All You Need')).toBe('attention-is-all-you-need');
  });

  test('removes special characters', () => {
    expect(slugify('Hello, World! (2024)')).toBe('hello-world-2024');
  });

  test('collapses multiple spaces/hyphens', () => {
    expect(slugify('A   B---C')).toBe('a-b-c');
  });

  test('returns empty string for empty input', () => {
    expect(slugify('')).toBe('');
  });

  test('truncates to 60 characters', () => {
    const long = 'a '.repeat(40); // 80 chars
    expect(slugify(long).length).toBeLessThanOrEqual(60);
  });

  test('handles string with only special chars', () => {
    expect(slugify('!@#$%^&*()')).toBe('');
  });
});
