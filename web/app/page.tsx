import { PageShell } from '@/components/page-shell';
import { ApiKeyForm } from '@/components/api-key-form';

export default function Home() {
  return (
    <PageShell>
      <div className="flex flex-col items-center justify-center flex-1 py-24 px-4">
        {/* Hero */}
        <div className="flex flex-col items-center text-center gap-6 mb-14">
          {/* Tag */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs uppercase tracking-widest"
            style={{
              border: '1px solid rgba(249,115,22,0.3)',
              color: '#f97316',
              fontFamily: 'var(--font-jetbrains-mono), monospace',
              backgroundColor: 'rgba(249,115,22,0.06)',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: '#f97316' }}
            />
            Powered by GPT-4.5
          </div>

          {/* Product name */}
          <h1
            data-testid="product-name"
            className="text-5xl font-semibold tracking-tight leading-tight"
            style={{
              color: '#f5f5f5',
              fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif',
            }}
          >
            Paper<span style={{ color: '#f97316' }}>To</span>Notebook
          </h1>

          {/* Description */}
          <p
            data-testid="product-description"
            className="text-lg max-w-lg leading-relaxed"
            style={{ color: '#888888' }}
          >
            Upload a research paper PDF. Receive a publication-quality Google Colab
            notebook implementing the algorithms and methodology — ready to run.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2 mt-2">
            {[
              '12-section notebook structure',
              'LaTeX equations',
              'Realistic synthetic data',
              'Runnable Python code',
            ].map((f) => (
              <span
                key={f}
                className="text-xs px-3 py-1 rounded-full"
                style={{
                  backgroundColor: '#111111',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#888888',
                  fontFamily: 'var(--font-jetbrains-mono), monospace',
                }}
              >
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* API Key form card */}
        <div
          className="w-full max-w-md rounded-lg p-8"
          style={{
            backgroundColor: '#111111',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <p
            className="text-sm mb-6"
            style={{ color: '#888888' }}
          >
            Enter your OpenAI API key to get started. Your key powers the generation
            and is never stored on our servers.
          </p>
          <ApiKeyForm />
        </div>

        {/* Workflow steps */}
        <div className="flex items-center gap-3 mt-10 text-xs" style={{ color: '#444444', fontFamily: 'var(--font-jetbrains-mono), monospace' }}>
          {['Enter API Key', 'Upload PDF', 'Wait ~60s', 'Download .ipynb'].map((step, i, arr) => (
            <span key={step} className="flex items-center gap-3">
              <span style={{ color: i === 0 ? '#f97316' : '#555555' }}>{step}</span>
              {i < arr.length - 1 && <span style={{ color: '#333333' }}>→</span>}
            </span>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
