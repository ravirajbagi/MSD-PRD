'use client';

import { useState } from 'react';
import { slugify } from '@/lib/notebook-builder';

interface ResultActionsProps {
  notebookJson: string;
  title: string;
}

export function ResultActions({ notebookJson, title }: ResultActionsProps) {
  const [colabState, setColabState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [colabError, setColabError] = useState('');

  function handleDownload() {
    const filename = `${slugify(title)}.ipynb`;
    const blob = new Blob([notebookJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleOpenColab() {
    setColabState('loading');
    setColabError('');

    try {
      const res = await fetch('/api/notebook/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notebookJson, title }),
      });

      const data = await res.json();

      if (!res.ok || !data.colabUrl) {
        throw new Error(data.error || 'Could not create Gist.');
      }

      if (!data.colabUrl.startsWith('https://colab.research.google.com/')) {
        throw new Error('Invalid Colab URL received from server.');
      }

      setColabState('done');
      window.open(data.colabUrl, '_blank', 'noopener,noreferrer');
    } catch (err: unknown) {
      setColabState('error');
      setColabError(
        err instanceof Error ? err.message : 'Failed to open in Colab.'
      );
    }
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Primary: Download */}
      <button
        type="button"
        data-testid="download-btn"
        onClick={handleDownload}
        className="w-full py-3.5 px-6 rounded-md text-sm font-semibold tracking-wide flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]"
        style={{ backgroundColor: '#f97316', color: '#ffffff', fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Download .ipynb
      </button>

      {/* Secondary: Open in Colab */}
      <button
        type="button"
        data-testid="open-colab-btn"
        onClick={handleOpenColab}
        disabled={colabState === 'loading'}
        className="w-full py-3 px-6 rounded-md text-sm font-semibold tracking-wide flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] disabled:opacity-60"
        style={{
          backgroundColor: 'transparent',
          border: '1px solid rgba(255,255,255,0.14)',
          color: '#f5f5f5',
          fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif',
        }}
      >
        {colabState === 'loading' ? (
          <>
            <span
              className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#ffffff' }}
            />
            Creating Colab link...
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            Open in Google Colab
          </>
        )}
      </button>

      {/* Colab error fallback */}
      {colabState === 'error' && (
        <div
          className="rounded-md p-3 text-xs"
          style={{
            backgroundColor: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            color: '#888888',
            fontFamily: 'var(--font-jetbrains-mono), monospace',
          }}
        >
          <p className="mb-1" style={{ color: 'rgb(239,68,68)' }}>Could not create Colab link</p>
          <p>{colabError}</p>
          <p className="mt-2">
            Download the .ipynb file above, then go to{' '}
            <a
              href="https://colab.research.google.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#f97316' }}
            >
              colab.new
            </a>{' '}
            and upload it manually.
          </p>
        </div>
      )}
    </div>
  );
}
