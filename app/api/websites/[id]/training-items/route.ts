import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const createItemSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: websiteId } = await context.params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: trainingItems, error } = await supabase
      .from('training_items')
      .select('*')
      .eq('website_id', websiteId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch training items:', error);
      return NextResponse.json({ error: 'Failed to fetch training items' }, { status: 500 });
    }

    return NextResponse.json({ data: trainingItems });
  } catch (error) {
    console.error('Error fetching training items:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: websiteId } = await context.params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createItemSchema.parse(body);

    const { data: trainingItem, error } = await supabase
      .from('training_items')
      .insert({
        website_id: websiteId,
        title: validatedData.title,
        content: validatedData.content,
        source: 'manual',
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create training item:', error);
      return NextResponse.json({ error: 'Failed to create training item' }, { status: 500 } as any);
    }

    return NextResponse.json({ data: trainingItem }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }

    console.error('Error creating training item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
