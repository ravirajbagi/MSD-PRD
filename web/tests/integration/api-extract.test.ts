import { describe, test, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock pdf-parser before importing the route
vi.mock('@/lib/pdf-parser', () => ({
  parsePdf: vi.fn(),
}));
vi.mock('@/lib/logger', () => ({
  logRequest: vi.fn(),
  logError: vi.fn(),
}));

import { POST } from '@/app/api/extract/route';
import { parsePdf } from '@/lib/pdf-parser';

const mockParsePdf = parsePdf as ReturnType<typeof vi.fn>;

function makeRequest(file?: File): NextRequest {
  const formData = new FormData();
  if (file) formData.append('pdf', file);
  return new NextRequest('http://localhost/api/extract', {
    method: 'POST',
    body: formData,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/extract', () => {
  test('returns 200 with text and pageCount for a valid PDF', async () => {
    mockParsePdf.mockResolvedValue({
      text: 'Attention Is All You Need. '.repeat(10), // > 50 chars
      pageCount: 3,
      title: 'Attention Is All You Need',
      truncated: false,
    });

    const file = new File([Buffer.from('%PDF-1.4 fake content')], 'paper.pdf', {
      type: 'application/pdf',
    });
    const req = makeRequest(file);
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveProperty('text');
    expect(body).toHaveProperty('pageCount', 3);
  });

  test('returns 400 when no file is uploaded', async () => {
    const formData = new FormData();
    const req = new NextRequest('http://localhost/api/extract', {
      method: 'POST',
      body: formData,
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/No PDF file/i);
  });

  test('returns 400 for non-PDF file type', async () => {
    const file = new File(['hello world'], 'document.txt', { type: 'text/plain' });
    const req = makeRequest(file);
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/PDF/i);
  });

  test('returns 400 for file over 50 MB', async () => {
    // Subclass File so instanceof check passes but size returns 51 MB
    class BigFile extends File {
      override get size() { return 51 * 1024 * 1024; }
    }
    const bigFile = new BigFile([new Uint8Array(1)], 'huge.pdf', {
      type: 'application/pdf',
    });

    const req = new NextRequest('http://localhost/api/extract', {
      method: 'POST',
      body: new FormData(),
    });
    // Mock req.formData() directly so the large size is preserved
    vi.spyOn(req, 'formData').mockResolvedValue({
      get: (key: string) => (key === 'pdf' ? bigFile : null),
    } as unknown as FormData);

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/too large|50 MB/i);
  });

  test('returns 422 when extracted text is too short', async () => {
    mockParsePdf.mockResolvedValue({
      text: 'short',
      pageCount: 1,
      title: null,
      truncated: false,
    });

    const file = new File([Buffer.from('%PDF-1.4')], 'paper.pdf', {
      type: 'application/pdf',
    });
    const req = makeRequest(file);
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.error).toMatch(/Could not extract/i);
  });

  test('returns 422 when parsePdf throws', async () => {
    mockParsePdf.mockRejectedValue(new Error('corrupt PDF'));

    const file = new File([Buffer.from('%PDF-1.4')], 'paper.pdf', {
      type: 'application/pdf',
    });
    const req = makeRequest(file);
    const res = await POST(req);

    expect(res.status).toBe(422);
  });

  test('accepts .pdf filename even without application/pdf MIME type', async () => {
    mockParsePdf.mockResolvedValue({
      text: 'Valid paper text that is long enough for extraction here. '.repeat(3),
      pageCount: 1,
      title: 'Test',
      truncated: false,
    });

    const file = new File([Buffer.from('%PDF-1.4')], 'paper.pdf', {
      type: 'application/octet-stream',
    });
    const req = makeRequest(file);
    const res = await POST(req);

    expect(res.status).toBe(200);
  });
});
