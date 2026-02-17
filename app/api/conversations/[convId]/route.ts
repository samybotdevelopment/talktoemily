import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  context: { params: Promise<{ convId: string }> }
) {
  try {
    const { convId } = await context.params;
    const supabase = (await createClient()) as any;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: conversation, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', convId)
      .single();

    if (error || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error('Error in GET /api/conversations/[convId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
