import { describe, test, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/logger', () => ({
  logRequest: vi.fn(),
  logError: vi.fn(),
}));

import { POST } from '@/app/api/notebook/publish/route';

const FAKE_NOTEBOOK_JSON = JSON.stringify({ nbformat: 4, cells: [] });

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/notebook/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('POST /api/notebook/publish', () => {
  test('valid body returns 200 with colabUrl and filename', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'abc123def456abc1',
        html_url: 'https://gist.github.com/abc123def456abc1',
      }),
    }));

    const req = makeRequest({ notebookJson: FAKE_NOTEBOOK_JSON, title: 'Test Paper' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveProperty('colabUrl');
    expect(body).toHaveProperty('filename');
    expect(body.colabUrl).toMatch(/^https:\/\/colab\.research\.google\.com\//);
  });

  test('colabUrl contains the gist ID', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'abc123def456abc1',
        html_url: 'https://gist.github.com/abc123def456abc1',
      }),
    }));

    const req = makeRequest({ notebookJson: FAKE_NOTEBOOK_JSON, title: 'Test Paper' });
    const res = await POST(req);
    const body = await res.json();

    expect(body.colabUrl).toContain('abc123def456abc1');
  });

  test('missing notebookJson returns 400', async () => {
    const req = makeRequest({ title: 'Test Paper' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/notebookJson/i);
  });

  test('GitHub returns non-ok status → 502', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => 'Forbidden',
    }));

    const req = makeRequest({ notebookJson: FAKE_NOTEBOOK_JSON, title: 'Test Paper' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body.error).toBeDefined();
  });

  test('filename is slugified from title', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'abc123def456abc1',
        html_url: 'https://gist.github.com/abc123def456abc1',
      }),
    }));

    const req = makeRequest({
      notebookJson: FAKE_NOTEBOOK_JSON,
      title: 'Attention Is All You Need',
    });
    const res = await POST(req);
    const body = await res.json();

    expect(body.filename).toBe('attention-is-all-you-need.ipynb');
  });
});
