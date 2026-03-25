import { NextRequest, NextResponse } from 'next/server';
import { createGist } from '@/lib/gist-client';
import { slugify } from '@/lib/notebook-builder';

export async function POST(req: NextRequest) {
  let body: { notebookJson?: string; title?: string };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { notebookJson, title } = body;

  if (!notebookJson || typeof notebookJson !== 'string') {
    return NextResponse.json({ error: 'notebookJson is required.' }, { status: 400 });
  }

  const filename = `${slugify(title || 'notebook')}.ipynb`;

  try {
    const colabUrl = await createGist(filename, notebookJson);
    return NextResponse.json({ colabUrl, filename });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gist creation failed.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
