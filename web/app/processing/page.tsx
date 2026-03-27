'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageShell } from '@/components/page-shell';
import { StatusFeed } from '@/components/status-feed';
import { session } from '@/lib/session';

type Phase = 'processing' | 'error';

export default function ProcessingPage() {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const [phase, setPhase] = useState<Phase>('processing');
  const [statusMessages, setStatusMessages] = useState<string[]>([
    'Initializing notebook generation...',
  ]);
  const [errorMessage, setErrorMessage] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const apiKey = session.getApiKey();
    const paperText = session.getPaperText();

    if (!apiKey || !paperText) {
      routerRef.current.replace('/');
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;

    async function startGeneration() {
      try {
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paperText, apiKey }),
          signal: controller.signal,
        });

        if (!response.body) {
          throw new Error('No response stream received from server.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process all complete SSE lines in the buffer
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const json = line.slice(6).trim();
            if (!json) continue;

            try {
              const event = JSON.parse(json);

              if (event.status) {
                setStatusMessages((prev) => [...prev, event.status]);
              }

              if (event.done && event.notebook) {
                const saved = session.setNotebookJson(event.notebook);
                if (!saved) {
                  setErrorMessage(
                    'Notebook is too large to store in browser storage. Please download directly.'
                  );
                  setPhase('error');
                  // Offer direct download as fallback
                  const blob = new Blob([event.notebook], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'notebook.ipynb';
                  a.click();
                  URL.revokeObjectURL(url);
                  return;
                }
                if (event.title) session.setPaperTitle(event.title);
                setStatusMessages((prev) => [
                  ...prev,
                  'Notebook ready! Redirecting...',
                ]);
                setTimeout(() => routerRef.current.push('/result'), 800);
                return;
              }

              if (event.error) {
                setErrorMessage(event.error);
                setPhase('error');
                return;
              }
            } catch {
              // Skip malformed SSE lines
            }
          }
        }
      } catch (err: unknown) {
        if ((err as Error).name === 'AbortError') return;
        setErrorMessage(
          err instanceof Error ? err.message : 'Connection error. Please try again.'
        );
        setPhase('error');
      }
    }

    startGeneration();

    return () => {
      controller.abort();
    };
  }, [retryCount]); // router excluded — using routerRef to avoid aborting in-flight requests

  return (
    <PageShell>
      <div className="flex flex-col items-center justify-center flex-1 py-16 px-4">
        {phase === 'processing' && (
          <div className="flex flex-col items-center gap-10 w-full max-w-lg">
            {/* Step indicator */}
            <div className="flex flex-col items-center gap-2 text-center">
              <span
                className="text-xs uppercase tracking-widest"
                style={{ color: '#f97316', fontFamily: 'var(--font-jetbrains-mono), monospace' }}
              >
                Step 3 of 4
              </span>
              <h1
                className="text-3xl font-semibold tracking-tight"
                style={{ color: '#f5f5f5', fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif' }}
              >
                Generating Notebook
              </h1>
              <p className="text-sm" style={{ color: '#888888' }}>
                GPT-4o is analyzing your paper and writing each section. This takes ~60–90 seconds.
              </p>
            </div>

            {/* Spinner */}
            <div
              data-testid="processing-spinner"
              className="relative flex items-center justify-center w-16 h-16"
            >
              {/* Outer ring */}
              <div
                className="absolute inset-0 rounded-full border-2 animate-spin"
                style={{ borderColor: 'transparent', borderTopColor: '#f97316' }}
              />
              {/* Inner dot */}
              <div
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: '#f97316' }}
              />
            </div>

            {/* Status feed */}
            <StatusFeed messages={statusMessages} isComplete={false} />

            {/* Estimated time note */}
            <p
              className="text-xs text-center"
              style={{ color: '#444444', fontFamily: 'var(--font-jetbrains-mono), monospace' }}
            >
              Generating a 12-section, publication-quality notebook...
            </p>
          </div>
        )}

        {phase === 'error' && (
          <div
            data-testid="error-state"
            className="flex flex-col items-center gap-6 w-full max-w-md text-center"
          >
            <div
              className="flex items-center justify-center w-14 h-14 rounded-xl"
              style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgb(239,68,68)" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>

            <div>
              <h2
                className="text-xl font-semibold mb-2"
                style={{ color: '#f5f5f5' }}
              >
                Generation Failed
              </h2>
              <p
                className="text-sm"
                style={{ color: '#888888', fontFamily: 'var(--font-jetbrains-mono), monospace' }}
              >
                {errorMessage || 'An unexpected error occurred. Please try again.'}
              </p>
            </div>

            <div className="flex flex-col gap-3 w-full">
              <a
                href="/upload"
                data-testid="try-again-link"
                className="w-full py-3 px-6 rounded-md text-sm font-semibold text-center transition-all duration-200"
                style={{ backgroundColor: '#f97316', color: '#ffffff' }}
              >
                Try Again
              </a>
              <button
                type="button"
                onClick={() => {
                  setPhase('processing');
                  setStatusMessages(['Retrying notebook generation...']);
                  setErrorMessage('');
                  setRetryCount((c) => c + 1);
                }}
                className="w-full py-2.5 px-4 rounded-md text-sm transition-colors"
                style={{ border: '1px solid rgba(255,255,255,0.10)', color: '#888888' }}
              >
                Retry with same paper
              </button>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
