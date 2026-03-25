'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageShell } from '@/components/page-shell';
import { PdfDropzone } from '@/components/pdf-dropzone';
import { session } from '@/lib/session';

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Redirect if no API key
  useEffect(() => {
    if (!session.getApiKey()) {
      router.replace('/');
    }
  }, [router]);

  function handleFile(f: File) {
    setFile(f);
    setFileError('');
    setUploadError('');
  }

  function handleFileError(msg: string) {
    setFile(null);
    setFileError(msg);
  }

  async function handleGenerate() {
    if (!file) return;
    setIsLoading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('pdf', file);

      const res = await fetch('/api/extract', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        setUploadError(data.error || 'Failed to extract PDF text. Please try another file.');
        setIsLoading(false);
        return;
      }

      session.setPaperText(data.text);
      session.setPaperTitle(data.title || file.name.replace('.pdf', ''));
      router.push('/processing');
    } catch {
      setUploadError('Network error. Please check your connection and try again.');
      setIsLoading(false);
    }
  }

  return (
    <PageShell>
      <div className="flex flex-col items-center justify-center flex-1 py-16 px-4">
        <div className="w-full max-w-lg flex flex-col gap-8">
          {/* Header */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span
                className="text-xs uppercase tracking-widest"
                style={{ color: '#f97316', fontFamily: 'var(--font-jetbrains-mono), monospace' }}
              >
                Step 2 of 4
              </span>
            </div>
            <h1
              className="text-3xl font-semibold tracking-tight"
              style={{ color: '#f5f5f5', fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif' }}
            >
              Upload Research Paper
            </h1>
            <p className="text-sm" style={{ color: '#888888' }}>
              Upload a PDF of the research paper you want to replicate. The algorithm and
              methodology sections are most important.
            </p>
          </div>

          {/* Drop zone */}
          <PdfDropzone
            onFile={handleFile}
            onError={handleFileError}
            selectedFile={file}
          />

          {/* File validation error */}
          {fileError && (
            <p
              data-testid="file-error"
              className="text-sm"
              style={{ color: 'rgb(239,68,68)', fontFamily: 'var(--font-jetbrains-mono), monospace' }}
            >
              ✗ {fileError}
            </p>
          )}

          {/* Upload/API error */}
          {uploadError && (
            <p
              className="text-sm"
              style={{ color: 'rgb(239,68,68)', fontFamily: 'var(--font-jetbrains-mono), monospace' }}
            >
              ✗ {uploadError}
            </p>
          )}

          {/* Generate button */}
          <button
            type="button"
            data-testid="generate-btn"
            disabled={!file || isLoading}
            onClick={handleGenerate}
            className="w-full py-3.5 px-6 rounded-md text-sm font-semibold tracking-wide transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: !file || isLoading ? '#333333' : '#f97316',
              color: '#ffffff',
              fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif',
            }}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span
                  className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: 'rgba(255,255,255,0.4)', borderTopColor: 'transparent' }}
                />
                Extracting paper...
              </span>
            ) : (
              'Generate Notebook →'
            )}
          </button>

          {/* Back link */}
          <p className="text-center text-xs" style={{ color: '#444444' }}>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="underline underline-offset-2 hover:text-white transition-colors"
            >
              ← Change API key
            </button>
          </p>
        </div>
      </div>
    </PageShell>
  );
}
