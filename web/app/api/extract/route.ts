import { NextRequest, NextResponse } from 'next/server';
import { parsePdf } from '@/lib/pdf-parser';
import { logRequest, logError } from '@/lib/logger';

export async function POST(req: NextRequest) {
  const start = Date.now();
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '127.0.0.1';
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid multipart form data.' }, { status: 400 });
  }

  const file = formData.get('pdf');

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'No PDF file uploaded. Include a "pdf" field.' }, { status: 400 });
  }

  // Validate MIME type
  const isPdf =
    file.type === 'application/pdf' ||
    file.name.toLowerCase().endsWith('.pdf');

  if (!isPdf) {
    return NextResponse.json(
      { error: 'Only PDF files are accepted. Please upload a .pdf research paper.' },
      { status: 400 }
    );
  }

  // Size guard: 50 MB
  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json(
      { error: 'File is too large. Maximum size is 50 MB.' },
      { status: 400 }
    );
  }

  let buffer: Buffer;
  try {
    const arrayBuffer = await file.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  } catch {
    return NextResponse.json({ error: 'Could not read uploaded file.' }, { status: 400 });
  }

  try {
    const result = await parsePdf(buffer);

    if (!result.text || result.text.trim().length < 50) {
      return NextResponse.json(
        {
          error:
            'Could not extract readable text from this PDF. ' +
            'The paper may be scanned or image-based. Please try a text-selectable PDF.',
        },
        { status: 422 }
      );
    }

    logRequest('/api/extract', ip, 200, Date.now() - start);
    return NextResponse.json({
      text: result.text,
      pageCount: result.pageCount,
      title: result.title,
      truncated: result.truncated,
    });
  } catch (err: unknown) {
    logError('/api/extract', ip, err);
    return NextResponse.json(
      { error: 'Failed to parse PDF. The file may be corrupt or password-protected.' },
      { status: 422 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed.' }, { status: 405 });
}
