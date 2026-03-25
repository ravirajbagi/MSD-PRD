'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { session } from '@/lib/session';

export function ApiKeyForm() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [showKey, setShowKey] = useState(false);

  function validate(key: string): string {
    if (!key.trim()) return 'API key is required to continue.';
    if (key.trim().length < 10) return 'That doesn\'t look like a valid OpenAI API key.';
    return '';
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const err = validate(apiKey);
    if (err) {
      setError(err);
      return;
    }
    session.setApiKey(apiKey.trim());
    router.push('/upload');
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md flex flex-col gap-4">
      {/* Input row */}
      <div className="relative flex flex-col gap-2">
        <label
          htmlFor="api-key-input"
          className="text-xs uppercase tracking-widest"
          style={{ color: '#888888', fontFamily: 'var(--font-jetbrains-mono), monospace' }}
        >
          OpenAI API Key
        </label>

        <div className="relative">
          <input
            id="api-key-input"
            data-testid="api-key-input"
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              if (error) setError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSubmit(e as unknown as FormEvent);
              }
            }}
            placeholder="sk-..."
            autoComplete="off"
            spellCheck={false}
            className="w-full px-4 py-3 pr-12 text-sm rounded-md outline-none transition-all duration-200"
            style={{
              backgroundColor: '#111111',
              border: error
                ? '1px solid rgba(239,68,68,0.6)'
                : '1px solid rgba(255,255,255,0.10)',
              color: '#f5f5f5',
              fontFamily: 'var(--font-jetbrains-mono), monospace',
              letterSpacing: '0.05em',
            }}
          />
          {/* Toggle visibility */}
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs transition-colors duration-200"
            style={{ color: '#555555' }}
            aria-label={showKey ? 'Hide API key' : 'Show API key'}
          >
            {showKey ? 'HIDE' : 'SHOW'}
          </button>
        </div>

        {/* Inline error */}
        {error && (
          <p
            data-testid="api-key-error"
            className="text-xs"
            style={{ color: 'rgb(239,68,68)', fontFamily: 'var(--font-jetbrains-mono), monospace' }}
          >
            {error}
          </p>
        )}

        {/* Security note */}
        <p className="text-xs" style={{ color: '#444444', fontFamily: 'var(--font-jetbrains-mono), monospace' }}>
          Stored in sessionStorage only — never sent to our servers
        </p>
      </div>

      {/* Submit */}
      <button
        type="submit"
        data-testid="get-started-btn"
        className="w-full py-3 px-6 rounded-md text-sm font-semibold tracking-wide transition-all duration-200 active:scale-[0.98]"
        style={{
          backgroundColor: '#f97316',
          color: '#ffffff',
          fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif',
        }}
      >
        Get Started →
      </button>
    </form>
  );
}
