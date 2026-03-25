'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageShell } from '@/components/page-shell';
import { ResultActions } from '@/components/result-actions';
import { session } from '@/lib/session';
import type { JupyterNotebook } from '@/lib/types';

interface NotebookStats {
  totalCells: number;
  codeCells: number;
  markdownCells: number;
  title: string;
}

function parseNotebookStats(json: string): NotebookStats | null {
  try {
    const nb = JSON.parse(json) as JupyterNotebook;
    const cells = nb.cells ?? [];
    return {
      totalCells: cells.length,
      codeCells: cells.filter((c) => c.cell_type === 'code').length,
      markdownCells: cells.filter((c) => c.cell_type === 'markdown').length,
      title: (nb.metadata?.colab?.name ?? 'notebook').replace('.ipynb', ''),
    };
  } catch {
    return null;
  }
}

export default function ResultPage() {
  const router = useRouter();
  const [notebookJson, setNotebookJson] = useState<string | null>(null);
  const [paperTitle, setPaperTitle] = useState('Your Notebook');
  const [stats, setStats] = useState<NotebookStats | null>(null);

  useEffect(() => {
    const json = session.getNotebookJson();
    const title = session.getPaperTitle();

    if (!json) {
      router.replace('/upload');
      return;
    }

    setNotebookJson(json);
    if (title) setPaperTitle(title);
    setStats(parseNotebookStats(json));
  }, [router]);

  if (!notebookJson) return null;

  return (
    <PageShell>
      <div className="flex flex-col items-center justify-center flex-1 py-16 px-4">
        <div className="w-full max-w-lg flex flex-col gap-8">
          {/* Header */}
          <div className="flex flex-col gap-2">
            <span
              className="text-xs uppercase tracking-widest"
              style={{ color: '#f97316', fontFamily: 'var(--font-jetbrains-mono), monospace' }}
            >
              Step 4 of 4 — Complete
            </span>
            <h1
              data-testid="result-title"
              className="text-3xl font-semibold tracking-tight"
              style={{ color: '#f5f5f5', fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif' }}
            >
              {paperTitle}
            </h1>
            <p className="text-sm" style={{ color: '#888888' }}>
              Your publication-quality Colab notebook is ready.
            </p>
          </div>

          {/* Stats card */}
          {stats && (
            <div
              data-testid="notebook-stats"
              className="rounded-lg p-5 grid grid-cols-3 gap-4"
              style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {[
                { label: 'Total Cells', value: stats.totalCells },
                { label: 'Code Cells', value: stats.codeCells },
                { label: 'Markdown Cells', value: stats.markdownCells },
              ].map(({ label, value }) => (
                <div key={label} className="flex flex-col items-center gap-1 text-center">
                  <span
                    className="text-2xl font-semibold"
                    style={{ color: '#f97316', fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif' }}
                  >
                    {value}
                  </span>
                  <span
                    className="text-xs"
                    style={{ color: '#888888', fontFamily: 'var(--font-jetbrains-mono), monospace' }}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* What's inside */}
          <div
            className="rounded-lg p-5"
            style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <p
              className="text-xs uppercase tracking-widest mb-3"
              style={{ color: '#555555', fontFamily: 'var(--font-jetbrains-mono), monospace' }}
            >
              Notebook Contents
            </p>
            <div className="grid grid-cols-2 gap-y-2 gap-x-4">
              {[
                'Title & Abstract',
                'Setup & Installs',
                'Imports & Seeds',
                'Theory & LaTeX Equations',
                'Algorithm Pseudocode',
                'Realistic Synthetic Data',
                'Full Implementation',
                'Training Loop',
                'Evaluation & Metrics',
                'Publication-Quality Plots',
                'Results Discussion',
                'Extensions & Next Steps',
              ].map((section) => (
                <div key={section} className="flex items-center gap-2">
                  <span style={{ color: '#f97316', fontSize: '10px' }}>✓</span>
                  <span
                    className="text-xs"
                    style={{ color: '#888888', fontFamily: 'var(--font-jetbrains-mono), monospace' }}
                  >
                    {section}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <ResultActions notebookJson={notebookJson} title={paperTitle} />

          {/* Generate another */}
          <p className="text-center text-xs" style={{ color: '#444444' }}>
            <a
              href="/upload"
              data-testid="generate-another-link"
              className="underline underline-offset-2 transition-colors"
              style={{ color: '#555555' }}
            >
              ← Generate another notebook
            </a>
          </p>
        </div>
      </div>
    </PageShell>
  );
}
