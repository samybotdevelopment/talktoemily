import { createClient, createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: websiteId } = await context.params;
  const supabase = (await createClient()) as any;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const updates: Record<string, string> = {};

  // Add basic information fields
  if (body.display_name !== undefined) {
    updates.display_name = body.display_name.trim();
  }
  if (body.domain !== undefined) {
    updates.domain = body.domain.trim();
  }
  if (body.primary_color !== undefined) {
    // Validate hex color format
    if (/^#[0-9A-F]{6}$/i.test(body.primary_color)) {
      updates.primary_color = body.primary_color;
    }
  }

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

  // Add bot behavior fields
  if (body.strict_context_only !== undefined) {
    updates.strict_context_only = Boolean(body.strict_context_only);
  }
  if (body.speaking_style !== undefined) {
    updates.speaking_style = body.speaking_style ? body.speaking_style.trim().substring(0, 150) : null;
  }
  if (body.custom_rules !== undefined) {
    updates.custom_rules = body.custom_rules ? body.custom_rules.trim().substring(0, 500) : null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid updates provided' }, { status: 400 });
  }

  // Use service client to update
  const serviceSupabase = (await createServiceClient()) as any;

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
