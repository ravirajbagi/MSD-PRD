'use client';

interface StatusFeedProps {
  messages: string[];
  isComplete: boolean;
}

/**
 * StatusFeed — vertically stacked status messages that fade in one by one.
 * Shows a blinking cursor on the latest message while processing.
 */
export function StatusFeed({ messages, isComplete }: StatusFeedProps) {
  return (
    <div data-testid="status-feed" className="flex flex-col gap-3 w-full max-w-lg">
      {messages.map((msg, i) => {
        const isLatest = i === messages.length - 1;
        const isDone = isComplete || !isLatest;

        return (
          <div
            key={i}
            className="flex items-start gap-3 animate-fade-slide-in"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            {/* Status icon */}
            <div className="mt-0.5 flex-shrink-0">
              {isDone ? (
                <span style={{ color: '#f97316', fontSize: '12px' }}>✓</span>
              ) : (
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{
                    backgroundColor: '#f97316',
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }}
                />
              )}
            </div>

            {/* Message text */}
            <p
              className="text-sm leading-relaxed"
              style={{
                color: isDone ? '#888888' : '#f5f5f5',
                fontFamily: 'var(--font-jetbrains-mono), monospace',
                transition: 'color 0.3s ease',
              }}
            >
              {msg}
              {!isDone && (
                <span
                  className="inline-block w-1.5 h-3.5 ml-0.5 align-middle"
                  style={{
                    backgroundColor: '#f97316',
                    animation: 'blink 1s step-end infinite',
                  }}
                />
              )}
            </p>
          </div>
        );
      })}
    </div>
  );
}
