import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function PUT(
  request: Request,
  context: { params: Promise<{ convId: string }> }
) {
  try {
    const { convId } = await context.params;
    const { aiMode } = await request.json();

    if (!['auto', 'paused'].includes(aiMode)) {
      return NextResponse.json({ error: 'Invalid AI mode' }, { status: 400 });
    }

    const supabase = (await createClient()) as any;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await (supabase
      .from('conversations') as any)
      .update({ ai_mode: aiMode })
      .eq('id', convId)
      .select()
      .single();

    if (error) {
      console.error('Error updating AI mode:', error);
      return NextResponse.json({ error: 'Failed to update AI mode' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in PUT /api/conversations/[convId]/ai-mode:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
