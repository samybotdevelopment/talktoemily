import { createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { processChatMessage } from '@/lib/chat/pipeline';

export async function POST(request: Request) {
  const { websiteId, content, conversationId, visitorId } = await request.json();
  
  console.log(`WIDGET API CALLED: "${content}" | convId: ${conversationId || 'NEW'} | visitorId: ${visitorId}`);

  if (!websiteId || !content) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (!visitorId) {
    return NextResponse.json({ error: 'visitorId is required' }, { status: 400 });
  }

  try {
    const supabase = (await createServiceClient()) as any;

    // Get website and org
    const { data: website, error: websiteError } = (await supabase
      .from('websites')
      .select('org_id')
      .eq('id', websiteId)
      .single()) as any;

    if (websiteError || !website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    let currentConversationId = conversationId;
    let aiMode = 'auto';

    // Create conversation if it doesn't exist
    if (!currentConversationId) {
      const { data: conversation, error: convError } = (await supabase
      .from('conversations')
        .insert({
          website_id: websiteId,
          agent_type: 'visitor',
          ai_mode: 'auto',
          visitor_id: visitorId,
        })
        .select()
      .single()) as any;

      if (convError || !conversation) {
        console.error('Conversation creation error:', convError);
        return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
      }

      currentConversationId = conversation.id;
      aiMode = conversation.ai_mode;
    } else {
      // Get existing conversation to check AI mode
      const { data: existingConv } = (await supabase
      .from('conversations')
        .select('ai_mode')
        .eq('id', currentConversationId)
      .single()) as any;
      
      if (existingConv) {
        aiMode = existingConv.ai_mode;
      }
    }

    // Save the user message
    console.log(`INSERTING MESSAGE: "${content}" into conversation ${currentConversationId}`);
    console.log(`Using service client with role key:`, process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET');
    
    const { data: insertedMessage, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: currentConversationId,
        sender: 'user',
        content: content,
      } as any)
      .select()
      .single();

    if (msgError) {
      console.error('ERROR saving message:', msgError);
      console.error('ERROR details:', JSON.stringify(msgError, null, 2));
      return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
    }
    
    if (!insertedMessage) {
      console.error('No message returned after insert, but no error!');
      return NextResponse.json({ error: 'Message insert returned no data' }, { status: 500 });
    }
    
    console.log(`MESSAGE INSERTED SUCCESSFULLY - ID: ${insertedMessage.id}`);

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

    // Get AI response (NO STREAMING)
    try {
      const response = await processChatMessage(
        currentConversationId,
        content,
        websiteId,
        website.org_id
      );

      return NextResponse.json({ 
        conversationId: currentConversationId,
        response 
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    } catch (error: any) {
      console.error('Chat processing error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to process message' },
        { status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }
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
