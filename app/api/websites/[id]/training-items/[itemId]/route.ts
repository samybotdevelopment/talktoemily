import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const updateItemSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id: websiteId, itemId } = await context.params;
    const supabase = (await createClient()) as any;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateItemSchema.parse(body);

    const { data: trainingItem, error } = await supabase
      .from('training_items')
      .update({
        title: validatedData.title,
        content: validatedData.content,
      })
      .eq('id', itemId)
      .eq('website_id', websiteId)
      .select()
      .single();

    if (error) {
      console.error('Failed to update training item:', error);
      return NextResponse.json({ error: 'Failed to update training item' }, { status: 500 });
    }

    return NextResponse.json({ data: trainingItem });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }

    console.error('Error updating training item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id: websiteId, itemId } = await context.params;
    const supabase = (await createClient()) as any;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('training_items')
      .delete()
      .eq('id', itemId)
      .eq('website_id', websiteId);

    if (error) {
      console.error('Failed to delete training item:', error);
      return NextResponse.json({ error: 'Failed to delete training item' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting training item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
