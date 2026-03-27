import { describe, it, expect } from 'vitest';
import { scanNotebookForDangerousCode } from '@/lib/notebook-scanner';
import type { NotebookSpec } from '@/lib/types';

function makeSpec(sections: { cell_type: 'code' | 'markdown'; source: string[] }[]): NotebookSpec {
  return {
    title: 'Test Notebook',
    abstract: 'Test',
    sections: sections.map((s, i) => ({ id: `section_${i}`, title: `Section ${i}`, ...s })),
  };
}

describe('scanNotebookForDangerousCode', () => {
  it('returns null for a clean notebook', () => {
    const spec = makeSpec([
      { cell_type: 'code', source: ['import numpy as np', 'x = np.array([1,2,3])'] },
      { cell_type: 'markdown', source: ['## Introduction'] },
    ]);
    expect(scanNotebookForDangerousCode(spec)).toBeNull();
  });

  it('flags os.system() in a code cell', () => {
    const spec = makeSpec([
      { cell_type: 'code', source: ['os.system("rm -rf /")'] },
    ]);
    expect(scanNotebookForDangerousCode(spec)).toMatch(/os\.system/);
  });

  it('flags subprocess usage in a code cell', () => {
    const spec = makeSpec([
      { cell_type: 'code', source: ['import subprocess', 'subprocess.run(["ls"])'] },
    ]);
    expect(scanNotebookForDangerousCode(spec)).toMatch(/subprocess/);
  });

  it('flags eval() in a code cell', () => {
    const spec = makeSpec([
      { cell_type: 'code', source: ['result = eval(user_input)'] },
    ]);
    expect(scanNotebookForDangerousCode(spec)).toMatch(/eval/);
  });

  it('flags exec() in a code cell', () => {
    const spec = makeSpec([
      { cell_type: 'code', source: ['exec(compiled_code)'] },
    ]);
    expect(scanNotebookForDangerousCode(spec)).toMatch(/exec/);
  });

  it('flags __import__ in a code cell', () => {
    const spec = makeSpec([
      { cell_type: 'code', source: ['mod = __import__("os")'] },
    ]);
    expect(scanNotebookForDangerousCode(spec)).toMatch(/__import__/);
  });

  it('flags import of paramiko', () => {
    const spec = makeSpec([
      { cell_type: 'code', source: ['import paramiko'] },
    ]);
    expect(scanNotebookForDangerousCode(spec)).not.toBeNull();
  });

  it('does NOT flag os.system mentioned in a markdown cell comment', () => {
    const spec = makeSpec([
      { cell_type: 'markdown', source: ['Note: avoid os.system() in production code.'] },
      { cell_type: 'code', source: ['import numpy as np'] },
    ]);
    expect(scanNotebookForDangerousCode(spec)).toBeNull();
  });

  it('does NOT flag a Python comment about os.system in code cell', () => {
    const spec = makeSpec([
      { cell_type: 'code', source: ['# Do not use os.system here', 'import numpy as np'] },
    ]);
    expect(scanNotebookForDangerousCode(spec)).toBeNull();
  });
});
