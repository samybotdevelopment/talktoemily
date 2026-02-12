import { createClient, createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { processChatMessage, getConversationHistory } from '@/lib/chat/pipeline';

export async function GET(
  request: Request,
  context: { params: Promise<{ convId: string }> }
) {
  try {
    const { convId } = await context.params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const messages = await getConversationHistory(convId);

    return NextResponse.json({ data: messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ convId: string }> }
) {
  const callId = Date.now() + '-' + Math.random().toString(36).substr(2, 5);
  console.log(`🟢 [Conversations API ${callId}] POST called`);
  
  const { convId } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { content, sender = 'user' } = await request.json();
    
    console.log(`🔵 [Conversations API ${callId}] Content: "${content}", Sender: ${sender}, ConvId: ${convId}`);

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Invalid message content' }, { status: 400 });
    }

    // Use service client for database operations
    const serviceSupabase = await createServiceClient();

    // Get conversation details
    const { data: conversation } = await serviceSupabase
      .from('conversations')
      .select('website_id, ai_mode')
      .eq('id', convId)
      .single();

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // If AI is paused or this is a manual assistant message, save it and return
    // (processChatMessage will handle saving user messages when AI is active)
    if (conversation.ai_mode === 'paused' || sender === 'assistant') {
      console.log(`💾 [Conversations API ${callId}] INSERTING message to DB (AI paused or manual)`);
      const { error: msgError } = await serviceSupabase
        .from('messages')
        .insert({
          conversation_id: convId,
          sender: sender,
          content: content,
        });

      if (msgError) {
        console.error(`❌ [Conversations API ${callId}] Error saving message:`, msgError);
        return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
      }
      
      console.log(`✅ [Conversations API ${callId}] Message saved to DB`);
      return NextResponse.json({ success: true });
    }

    // AI is active - processChatMessage will save the user message

    // Get website and org for AI response
    const { data: website } = await serviceSupabase
      .from('websites')
      .select('org_id')
      .eq('id', conversation.website_id)
      .single();

    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    // Stream the AI response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of processChatMessage(
            convId,
            content,
            conversation.website_id,
            website.org_id
          )) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        } catch (error: any) {
          console.error('Stream error:', error);
          const errorMessage = `\n\n[Error: ${error.message}]`;
          controller.enqueue(encoder.encode(errorMessage));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error: any) {
    console.error('Error processing message:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
