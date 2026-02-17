import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ConversationsClient } from './ConversationsClient';

export default async function ConversationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = (await createClient()) as any;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Get conversations
  const { data: conversations } = await supabase
    .from('conversations')
    .select('*')
    .eq('website_id', id)
    .order('updated_at', { ascending: false });

  // Get last message for each conversation
  const conversationsWithMessages = await Promise.all(
    (conversations || []).map(async (conv: any) => {
      const { data: lastMessage } = await supabase
        .from('messages')
        .select('content, sender')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      return {
        ...conv,
        lastMessage: lastMessage?.content || 'No messages yet',
      };
    })
  );

  return <ConversationsClient websiteId={id} initialConversations={conversationsWithMessages} />;
}
