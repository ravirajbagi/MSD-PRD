import { PageShell } from '@/components/page-shell';

export default function Home() {
  return (
    <PageShell>
      <div className="flex flex-col items-center justify-center flex-1 py-32 text-center">
        <p
          className="text-sm"
          style={{
            color: '#f97316',
            fontFamily: 'var(--font-jetbrains-mono), monospace',
            letterSpacing: '0.1em',
          }}
        >
          COMING SOON
        </p>
        <h1
          className="mt-4 text-4xl font-semibold tracking-tight"
          style={{ color: '#f5f5f5' }}
        >
          PaperToNotebook
        </h1>
        <p className="mt-3 text-base" style={{ color: '#888888' }}>
          Upload a research paper. Get a publication-quality Colab notebook.
        </p>
      </div>
    </PageShell>
  );
}
