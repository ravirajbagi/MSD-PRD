import Link from 'next/link';
import { ReactNode } from 'react';

interface PageShellProps {
  children: ReactNode;
  /** Remove max-width constraint for full-bleed layouts */
  fullWidth?: boolean;
}

/**
 * PageShell — shared layout wrapper for all pages.
 * Provides the top navigation bar and centered content area.
 * Design: ARC-AGI dark, minimal, research-grade.
 */
export function PageShell({ children, fullWidth = false }: PageShellProps) {
  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: '#0a0a0a' }}>
      {/* ─── Top Navigation Bar ─────────────────────────────────── */}
      <nav
        data-testid="top-nav"
        className="w-full border-b flex items-center justify-between px-6 py-4 sticky top-0 z-50"
        style={{
          backgroundColor: '#0a0a0a',
          borderColor: 'rgba(255,255,255,0.08)',
        }}
      >
        <Link href="/" className="flex items-center gap-3 group">
          {/* Logo mark — minimal grid icon reminiscent of ARC grid tasks */}
          <div className="grid grid-cols-3 gap-[3px] w-5 h-5">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="rounded-[1px] transition-colors duration-300"
                style={{
                  backgroundColor:
                    i === 4
                      ? '#f97316'
                      : i % 2 === 0
                      ? 'rgba(255,255,255,0.35)'
                      : 'rgba(255,255,255,0.1)',
                }}
              />
            ))}
          </div>

          <span
            className="text-base font-semibold tracking-tight"
            style={{
              fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif',
              color: '#f5f5f5',
            }}
          >
            PaperToNotebook
          </span>
        </Link>

        <div className="flex items-center gap-6 text-sm" style={{ color: '#888888' }}>
          <a
            href="https://openai.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors duration-200"
            style={{ fontFamily: 'var(--font-jetbrains-mono), monospace', fontSize: '12px' }}
          >
            powered by GPT-4.5
          </a>
        </div>
      </nav>

      {/* ─── Page Content ────────────────────────────────────────── */}
      <main
        data-testid="page-main"
        className={`flex-1 flex flex-col ${
          fullWidth ? 'w-full' : 'w-full max-w-4xl mx-auto px-6'
        }`}
      >
        {children}
      </main>

      {/* ─── Footer ──────────────────────────────────────────────── */}
      <footer
        className="w-full border-t px-6 py-4 flex items-center justify-between"
        style={{
          borderColor: 'rgba(255,255,255,0.06)',
          backgroundColor: '#0a0a0a',
        }}
      >
        <span
          className="text-xs"
          style={{
            color: '#444444',
            fontFamily: 'var(--font-jetbrains-mono), monospace',
          }}
        >
          v1.0.0 — sprint build
        </span>
        <span
          className="text-xs"
          style={{
            color: '#444444',
            fontFamily: 'var(--font-jetbrains-mono), monospace',
          }}
        >
          API key stored in sessionStorage only — never sent to our servers
        </span>
      </footer>
    </div>
  );
}
