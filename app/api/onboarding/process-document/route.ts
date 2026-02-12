import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { chunkDocument } from '@/lib/training/content-processor';

/**
 * POST /api/onboarding/process-document
 * Process uploaded text document into training chunks
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.name.endsWith('.txt')) {
      return NextResponse.json({ error: 'Only .txt files are supported' }, { status: 400 });
    }

    // Read file content
    const text = await file.text();

    if (!text.trim()) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 });
    }

    // Process document with GPT
    const chunks = await chunkDocument(text);

    return NextResponse.json({
      success: true,
      chunks,
      count: chunks.length,
    });
  } catch (error) {
    console.error('Error processing document:', error);
    return NextResponse.json({ error: 'Failed to process document' }, { status: 500 });
  }
}
