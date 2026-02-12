import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: websiteId } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Use service client to create conversation (bypass RLS)
  const serviceSupabase = await createServiceClient();
  
  // Create new conversation
  const { data: conversation, error } = await serviceSupabase
    .from('conversations')
    .insert({
      website_id: websiteId,
      agent_type: 'owner',
      ai_mode: 'auto',
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create conversation:', error);
    redirect(`/websites/${websiteId}`);
  }

  redirect(`/websites/${websiteId}/conversations/${conversation.id}`);
}
