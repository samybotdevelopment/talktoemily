import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id: websiteId, itemId } = await context.params;
    const supabase = await createClient();

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
