// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('session — QuotaExceededError handling', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('setApiKey returns true on normal write', async () => {
    const { session } = await import('@/lib/session');
    const result = session.setApiKey('sk-test-12345678901234567890');
    expect(result).toBe(true);
    expect(sessionStorage.getItem('openai_api_key')).toBe('sk-test-12345678901234567890');
  });

  it('setNotebookJson returns false when sessionStorage is full', async () => {
    const { session } = await import('@/lib/session');
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      const err = new DOMException('QuotaExceededError', 'QuotaExceededError');
      throw err;
    });
    const result = session.setNotebookJson('{"nbformat":4}');
    expect(result).toBe(false);
    setItemSpy.mockRestore();
  });

  it('setApiKey returns false when sessionStorage throws', async () => {
    const { session } = await import('@/lib/session');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError');
    });
    const result = session.setApiKey('sk-test-12345678901234567890');
    expect(result).toBe(false);
  });
});
