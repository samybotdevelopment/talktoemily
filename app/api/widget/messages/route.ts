import { createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { processChatMessage } from '@/lib/chat/pipeline';

export async function POST(request: Request) {
  const { websiteId, content, conversationId, visitorId } = await request.json();
  
  console.log(`🔵 WIDGET API CALLED: "${content}" | convId: ${conversationId || 'NEW'} | visitorId: ${visitorId}`);

  if (!websiteId || !content) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (!visitorId) {
    return NextResponse.json({ error: 'visitorId is required' }, { status: 400 });
  }

  try {
    const supabase = await createServiceClient();

    // Get website and org
    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('org_id')
      .eq('id', websiteId)
      .single();

    if (websiteError || !website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    let currentConversationId = conversationId;
    let aiMode = 'auto';

    // Create conversation if it doesn't exist
    if (!currentConversationId) {
      const { data: conversation, error: convError} = await supabase
        .from('conversations')
        .insert({
          website_id: websiteId,
          agent_type: 'visitor',
          ai_mode: 'auto',
          visitor_id: visitorId,
        })
        .select()
        .single();

      if (convError || !conversation) {
        console.error('Conversation creation error:', convError);
        return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
      }

      currentConversationId = conversation.id;
      aiMode = conversation.ai_mode;
    } else {
      // Get existing conversation to check AI mode
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('ai_mode')
        .eq('id', currentConversationId)
        .single();
      
      if (existingConv) {
        aiMode = existingConv.ai_mode;
      }
    }

    // Save the user message
    console.log(`💾 INSERTING MESSAGE: "${content}" into conversation ${currentConversationId}`);
    const { error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: currentConversationId,
        sender: 'user',
        content: content,
      });

    if (msgError) {
      console.error('Error saving message:', msgError);
      return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
    }
    
    console.log(`✅ MESSAGE INSERTED SUCCESSFULLY`);

    // If AI is paused, just return conversation ID without AI response
    if (aiMode === 'paused') {
      return NextResponse.json({ 
        conversationId: currentConversationId,
        aiPaused: true 
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    // Stream the AI response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send conversation ID as first chunk
          controller.enqueue(encoder.encode(`__CONVERSATION_ID__:${currentConversationId}\n`));
          
          for await (const chunk of processChatMessage(
            currentConversationId,
            content,
            websiteId,
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
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error: any) {
    console.error('Widget message error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
