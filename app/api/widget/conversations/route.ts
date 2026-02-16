import { createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const websiteId = searchParams.get('websiteId');
  const visitorId = searchParams.get('visitorId');

  if (!websiteId || !visitorId) {
    return NextResponse.json({ error: 'websiteId and visitorId are required' }, { status: 400 });
  }

  try {
    const supabase = await createServiceClient();

    // Get conversations for this visitor
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('id, created_at, updated_at')
      .eq('website_id', websiteId)
      .eq('visitor_id', visitorId)
      .order('updated_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching conversations:', error);
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
    }

    // Get first message for each conversation
    const conversationsWithMessages = await Promise.all(
      (conversations || []).map(async (conv) => {
        const { data: firstMessage } = (await supabase
      .from('messages')
          .select('content, sender')
          .eq('conversation_id', conv.id)
          .eq('sender', 'user')
          .order('created_at', { ascending: true })
          .limit(1)
      .single()) as any;

        return {
          ...conv,
          firstMessage: firstMessage?.content || 'New conversation',
        };
      })
    );

    return NextResponse.json({ conversations: conversationsWithMessages }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  } catch (error) {
    console.error('Widget conversations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
