import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logRequest, logError } from '@/lib/logger';

describe('logger', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('logRequest emits valid JSON with required fields', () => {
    const lines: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((msg) => lines.push(msg));

    logRequest('/api/generate', '1.2.3.4', 200, 1234);

    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0]);
    expect(parsed.route).toBe('/api/generate');
    expect(parsed.ip).toBe('1.2.3.4');
    expect(parsed.status).toBe(200);
    expect(parsed.duration_ms).toBe(1234);
    expect(typeof parsed.ts).toBe('string');
  });

  it('logRequest ts is a valid ISO 8601 string', () => {
    const lines: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((msg) => lines.push(msg));
    logRequest('/api/extract', '5.6.7.8', 400, 50);
    const parsed = JSON.parse(lines[0]);
    expect(() => new Date(parsed.ts)).not.toThrow();
    expect(new Date(parsed.ts).toISOString()).toBe(parsed.ts);
  });

  it('logError emits JSON with error field to console.error', () => {
    const lines: string[] = [];
    vi.spyOn(console, 'error').mockImplementation((msg) => lines.push(msg));

    logError('/api/generate', '9.9.9.9', new Error('Something broke'));

    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0]);
    expect(parsed.route).toBe('/api/generate');
    expect(parsed.ip).toBe('9.9.9.9');
    expect(parsed.error).toBe('Something broke');
  });

  it('logError redacts OpenAI API key from error message', () => {
    const lines: string[] = [];
    vi.spyOn(console, 'error').mockImplementation((msg) => lines.push(msg));

    logError('/api/generate', '1.1.1.1', new Error('Auth failed for sk-proj-abc123def456ghi789jkl012'));

    const parsed = JSON.parse(lines[0]);
    expect(parsed.error).not.toMatch(/sk-[a-zA-Z0-9\-]+/);
    expect(parsed.error).toContain('[REDACTED]');
  });
});
