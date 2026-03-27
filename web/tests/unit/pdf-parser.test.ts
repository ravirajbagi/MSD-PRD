import { describe, test, expect, vi, beforeEach } from 'vitest';

// Mock the CJS pdf-parse module before importing the module under test
vi.mock('pdf-parse/lib/pdf-parse.js', () => ({
  default: vi.fn(),
}));

// Import after mock is set up
import { parsePdf } from '@/lib/pdf-parser';
import pdfParseMock from 'pdf-parse/lib/pdf-parse.js';

const mockPdfParse = pdfParseMock as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('parsePdf()', () => {
  test('returns text, pageCount, title, and truncated=false for short text', async () => {
    mockPdfParse.mockResolvedValue({
      text: 'Attention Is All You Need\nA great paper about transformers.',
      numpages: 3,
    });

    const result = await parsePdf(Buffer.from('fake-pdf'));

    expect(result.text).toContain('Attention Is All You Need');
    expect(result.pageCount).toBe(3);
    expect(result.truncated).toBe(false);
    expect(typeof result.text).toBe('string');
  });

  test('extracts title from first meaningful line', async () => {
    mockPdfParse.mockResolvedValue({
      text: 'Attention Is All You Need\nVaswani et al.\nAbstract...',
      numpages: 1,
    });

    const result = await parsePdf(Buffer.from('fake-pdf'));

    expect(result.title).toBe('Attention Is All You Need');
  });

  test('truncates text over 80,000 chars and sets truncated=true', async () => {
    const longText = 'a'.repeat(90_000);
    mockPdfParse.mockResolvedValue({ text: longText, numpages: 10 });

    const result = await parsePdf(Buffer.from('fake-pdf'));

    expect(result.truncated).toBe(true);
    expect(result.text.length).toBe(80_000);
  });

  test('does not truncate text under 80,000 chars', async () => {
    const shortText = 'This is a short paper. '.repeat(100);
    mockPdfParse.mockResolvedValue({ text: shortText, numpages: 1 });

    const result = await parsePdf(Buffer.from('fake-pdf'));

    expect(result.truncated).toBe(false);
    expect(result.text.length).toBe(shortText.length);
  });

  test('returns null title when first line is too short (<10 chars)', async () => {
    mockPdfParse.mockResolvedValue({
      text: 'Hi\nShort\nThis is a valid line that is long enough',
      numpages: 1,
    });

    const result = await parsePdf(Buffer.from('fake-pdf'));

    // "Hi" and "Short" are too short; first qualifying line becomes title
    expect(result.title).toBe('This is a valid line that is long enough');
  });

  test('returns null title when text is empty', async () => {
    mockPdfParse.mockResolvedValue({ text: '', numpages: 0 });

    const result = await parsePdf(Buffer.from('fake-pdf'));

    expect(result.title).toBeNull();
    expect(result.text).toBe('');
    expect(result.pageCount).toBe(0);
    expect(result.truncated).toBe(false);
  });

  test('returns pageCount 0 when numpages is missing', async () => {
    mockPdfParse.mockResolvedValue({ text: 'Some text here that is long enough', numpages: undefined });

    const result = await parsePdf(Buffer.from('fake-pdf'));

    expect(result.pageCount).toBe(0);
  });

  test('propagates error when pdf-parse throws', async () => {
    mockPdfParse.mockRejectedValue(new Error('PDF is corrupted'));

    await expect(parsePdf(Buffer.from('bad-data'))).rejects.toThrow('PDF is corrupted');
  });
});
