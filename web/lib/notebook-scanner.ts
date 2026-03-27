/**
 * Prompt injection defense — Layer 2 (output scanning).
 *
 * After OpenAI generates the NotebookSpec, scan all code cells for patterns
 * that indicate the AI was manipulated into generating malicious code.
 * If any pattern matches, the SSE stream returns an error instead of the notebook.
 *
 * Each pattern targets an actual line of executable code, not comments.
 * Comment lines (starting with #) are excluded to avoid false positives.
 */

import type { NotebookSpec } from './types';

interface DangerousPattern {
  pattern: RegExp;
  label: string;
}

const DANGEROUS_PATTERNS: DangerousPattern[] = [
  { pattern: /\bos\.system\s*\(/, label: 'os.system()' },
  { pattern: /\bsubprocess\b/, label: 'subprocess' },
  { pattern: /\beval\s*\(/, label: 'eval()' },
  { pattern: /\bexec\s*\(/, label: 'exec()' },
  { pattern: /\b__import__\s*\(/, label: '__import__()' },
  { pattern: /\bsocket\.\w/, label: 'socket access' },
  { pattern: /\bimport\s+paramiko\b/, label: 'import paramiko' },
  { pattern: /\bimport\s+ftplib\b/, label: 'import ftplib' },
  { pattern: /\bimport\s+telnetlib\b/, label: 'import telnetlib' },
];

/**
 * Scan all code cells in a NotebookSpec for dangerous patterns.
 * Returns null if the notebook is safe, or an error message string if not.
 * Markdown cells and Python comment lines are not scanned.
 */
export function scanNotebookForDangerousCode(spec: NotebookSpec): string | null {
  for (const section of spec.sections) {
    if (section.cell_type !== 'code') continue;

    // Only scan non-comment lines
    const executableLines = section.source.filter(
      (line) => !line.trimStart().startsWith('#')
    );
    const cellSource = executableLines.join('\n');

    for (const { pattern, label } of DANGEROUS_PATTERNS) {
      if (pattern.test(cellSource)) {
        return `Generated notebook contains potentially unsafe code in section "${section.id}": detected ${label}. The PDF may contain adversarial content.`;
      }
    }
  }
  return null;
}
