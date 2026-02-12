import { createClient, createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: websiteId } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const updates: Record<string, string> = {};

  // Validate and add widget_style
  if (body.widget_style) {
    if (!['modern', 'neutral'].includes(body.widget_style)) {
      return NextResponse.json({ error: 'Invalid widget style' }, { status: 400 });
    }
    updates.widget_style = body.widget_style;
  }

  // Add message fields
  if (body.widget_subtitle !== undefined) {
    updates.widget_subtitle = body.widget_subtitle.trim().substring(0, 50);
  }
  if (body.widget_welcome_title !== undefined) {
    updates.widget_welcome_title = body.widget_welcome_title.trim().substring(0, 50);
  }
  if (body.widget_welcome_message !== undefined) {
    updates.widget_welcome_message = body.widget_welcome_message.trim().substring(0, 200);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid updates provided' }, { status: 400 });
  }

  // Use service client to update
  const serviceSupabase = await createServiceClient();

  const { data, error } = await serviceSupabase
    .from('websites')
    .update(updates)
    .eq('id', websiteId)
    .select()
    .single();

  if (error) {
    console.error('Error updating website settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }

  return NextResponse.json({ data });
}
