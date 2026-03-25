'use client';

import { useState, useRef, DragEvent, ChangeEvent } from 'react';

interface PdfDropzoneProps {
  onFile: (file: File) => void;
  onError: (msg: string) => void;
  selectedFile: File | null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PdfDropzone({ onFile, onError, selectedFile }: PdfDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function validateAndSet(file: File) {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      onError('Only PDF files are accepted. Please upload a .pdf research paper.');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      onError('File is too large (max 50 MB). Please upload a smaller PDF.');
      return;
    }
    onFile(file);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) validateAndSet(file);
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) validateAndSet(file);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Drop zone */}
      <div
        data-testid="pdf-dropzone"
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className="relative flex flex-col items-center justify-center gap-4 rounded-lg cursor-pointer transition-all duration-200 py-16 px-8"
        style={{
          border: isDragging
            ? '1.5px dashed #f97316'
            : selectedFile
            ? '1.5px solid rgba(249,115,22,0.4)'
            : '1.5px dashed rgba(255,255,255,0.14)',
          backgroundColor: isDragging
            ? 'rgba(249,115,22,0.05)'
            : selectedFile
            ? 'rgba(249,115,22,0.03)'
            : '#111111',
        }}
      >
        {/* PDF icon */}
        <div
          className="flex items-center justify-center w-14 h-14 rounded-xl"
          style={{ backgroundColor: selectedFile ? 'rgba(249,115,22,0.12)' : 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={selectedFile ? '#f97316' : '#555555'} strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="9" y1="15" x2="15" y2="15"/>
            <line x1="9" y1="11" x2="11" y2="11"/>
          </svg>
        </div>

        {selectedFile ? (
          <div className="flex flex-col items-center gap-1 text-center">
            <p
              data-testid="file-name"
              className="text-sm font-medium"
              style={{ color: '#f5f5f5' }}
            >
              {selectedFile.name}
            </p>
            <p className="text-xs" style={{ color: '#888888', fontFamily: 'var(--font-jetbrains-mono), monospace' }}>
              {formatBytes(selectedFile.size)} · PDF
            </p>
            <p className="text-xs mt-1" style={{ color: '#f97316' }}>
              Click to change file
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 text-center">
            <p className="text-sm font-medium" style={{ color: '#f5f5f5' }}>
              Drop your PDF here
            </p>
            <p className="text-xs" style={{ color: '#888888' }}>
              or click to browse — research papers only
            </p>
            <p className="text-xs mt-1" style={{ color: '#444444', fontFamily: 'var(--font-jetbrains-mono), monospace' }}>
              max 50 MB · .pdf only
            </p>
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={inputRef}
          data-testid="file-input"
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleChange}
          className="absolute inset-0 opacity-0 cursor-pointer"
          style={{ display: 'none' }}
        />
      </div>

      {/* Browse button (alternative to drop) */}
      <button
        type="button"
        data-testid="browse-btn"
        onClick={() => inputRef.current?.click()}
        className="w-full py-2.5 px-4 rounded-md text-sm transition-colors duration-200"
        style={{
          backgroundColor: 'transparent',
          border: '1px solid rgba(255,255,255,0.10)',
          color: '#888888',
          fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif',
        }}
      >
        Browse Files
      </button>
    </div>
  );
}
