import { createServiceClient } from '@/lib/supabase/server';
import { createEmbedding, streamChatCompletion, buildPromptWithContext, rewriteQueryForSearch } from '@/lib/services/openai.service';
import { searchSimilar } from '@/lib/services/qdrant.service';
import { incrementMessageUsage, checkMessageQuota } from '@/lib/services/usage.service';
import { encode } from 'gpt-tokenizer';

/**
 * Process a chat message and generate AI response
 * Following the spec:
 * 1. Embed user message
 * 2. Search Qdrant (top 3-5)
 * 3. Extract context
 * 4. Build prompt
 * 5. Stream LLM response
 * 6. Store assistant message
 */
export async function* processChatMessage(
  conversationId: string,
  userMessage: string,
  websiteId: string,
  orgId: string
): AsyncGenerator<string, void, unknown> {
  const supabase = (await createServiceClient()) as any;

  // Check message quota
  const quotaCheck = await checkMessageQuota(orgId);
  if (!quotaCheck.allowed) {
    throw new Error(quotaCheck.reason || 'Message quota exceeded');
  }

  // NOTE: User message is already saved by the caller (widget/messages or conversations/messages API)
  // Do NOT save it again here to avoid duplicates

  try {
    // Track token usage
    let queryRewriteTokens = 0;

    // Check if chatbot is trained
    const { count: trainingCount } = await supabase
      .from('training_items')
      .select('*', { count: 'exact', head: true })
      .eq('website_id', websiteId);

    let context: Array<{ title: string; content: string }> = [];
    let conversationHistory: Array<{ sender: string; content: string }> = [];

    if (trainingCount && trainingCount > 0) {
      // Get recent conversation history
      const { data: recentMessages } = await supabase
        .from('messages')
        .select('sender, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (recentMessages) {
        conversationHistory = recentMessages.reverse();
      }

      // Multi-query vector search strategy
      const wordCount = userMessage.trim().split(/\s+/).length;
      const isShortMessage = wordCount < 5;

      let searchResults = [];

      if (isShortMessage && conversationHistory.length > 0) {
        // Find the last substantive user message (>= 5 words)
        const lastSubstantiveMessage = conversationHistory
          .slice()
          .reverse()
          .find((msg: any) => 
            msg.sender === 'user' && 
            msg.content.trim().split(/\s+/).length >= 5
          );

        if (lastSubstantiveMessage) {
          // Search with BOTH current and previous substantive message
          const [currentResults, previousResults] = await Promise.all([
            searchSimilar(websiteId, await createEmbedding(userMessage), 4),
            searchSimilar(websiteId, await createEmbedding(lastSubstantiveMessage.content), 4)
          ]);

          // Merge and deduplicate by title
          const mergedMap = new Map();
          [...previousResults, ...currentResults].forEach((result: any) => {
            const key = result.payload.title;
            if (!mergedMap.has(key) || result.score > mergedMap.get(key).score) {
              mergedMap.set(key, result);
            }
          });

          searchResults = Array.from(mergedMap.values())
            .sort((a: any, b: any) => b.score - a.score)
            .slice(0, 7);
        } else {
          // Use LLM to rewrite the query for better vector search
          const { rewritten, tokensUsed } = await rewriteQueryForSearch(userMessage);
          queryRewriteTokens += tokensUsed;
          
          // Search with BOTH original and rewritten queries
          const [originalResults, rewrittenResults] = await Promise.all([
            searchSimilar(websiteId, await createEmbedding(userMessage), 5),
            searchSimilar(websiteId, await createEmbedding(rewritten), 5)
          ]);
          
          // Merge and deduplicate, keeping highest scores
          const mergedMap = new Map();
          [...originalResults, ...rewrittenResults].forEach((result: any) => {
            const key = result.payload.title;
            if (!mergedMap.has(key) || result.score > mergedMap.get(key).score) {
              mergedMap.set(key, result);
            }
          });
          
          searchResults = Array.from(mergedMap.values())
            .sort((a: any, b: any) => b.score - a.score)
            .slice(0, 7);
        }
      } else {
        // Message is detailed enough, use LLM query rewriting
        const { rewritten, tokensUsed } = await rewriteQueryForSearch(userMessage);
        queryRewriteTokens += tokensUsed;
        
        searchResults = await searchSimilar(websiteId, await createEmbedding(rewritten), 7);
      }
      
      context = searchResults.map((result: any) => ({
        title: result.payload.title,
        content: result.payload.content,
      }));
    }

    // Get website info for personalization
    const { data: website } = await supabase
      .from('websites')
      .select('display_name')
      .eq('id', websiteId)
      .single();

    // Build prompt with context and conversation history
    const messages = buildPromptWithContext(
      userMessage,
      context,
      conversationHistory,
      website?.display_name
    );

    // Count tokens with detailed breakdown
    const systemPrompt = messages[0].content;
    const systemTokens = encode(systemPrompt).length;
    
    // Count conversation history tokens (all messages except system and current user message)
    const historyMessages = messages.slice(1, -1);
    const historyTokens = historyMessages.length > 0 
      ? encode(historyMessages.map(m => m.content).join('\n')).length 
      : 0;
    
    const currentMessageTokens = encode(userMessage).length;
    const inputTokens = systemTokens + historyTokens + currentMessageTokens;

    // Stream LLM response
    let assistantResponse = '';

    for await (const chunk of streamChatCompletion(messages)) {
      assistantResponse += chunk;
      yield chunk;
    }

    // Count output tokens
    const outputTokens = encode(assistantResponse).length;
    const totalTokens = inputTokens + outputTokens + queryRewriteTokens;

    console.log('=== TOKEN USAGE ===');
    console.log(`Query rewrite:      ${queryRewriteTokens} tokens`);
    console.log(`System + context:   ${systemTokens} tokens`);
    console.log(`Conversation hist:  ${historyTokens} tokens (${historyMessages.length} messages)`);
    console.log(`Current message:    ${currentMessageTokens} tokens`);
    console.log(`Total input:        ${inputTokens} tokens`);
    console.log(`Output:             ${outputTokens} tokens`);
    console.log(`GRAND TOTAL:        ${totalTokens} tokens`);
    console.log(`Context chunks:     ${context.length}`);
    console.log('===================');

    // Store assistant message
    await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender: 'assistant',
        content: assistantResponse,
      });

    // Increment usage
    await incrementMessageUsage(orgId);

  } catch (error) {
    console.error('Chat processing error:', error);
    throw error;
  }
}

/**
 * Get conversation history
 */
export async function getConversationHistory(conversationId: string) {
  const supabase = (await createServiceClient()) as any;

  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error('Failed to fetch conversation history');
  }

  console.log(`📚 getConversationHistory for ${conversationId}: ${messages?.length || 0} messages`);
  messages?.forEach((msg: any) => {
    console.log(`   - ${msg.id.substring(0, 8)} | ${msg.sender} | ${msg.content.substring(0, 30)}`);
  });

  return messages || [];
}

/**
 * Create a new conversation
 */
export async function createConversation(
  websiteId: string,
  agentType: 'owner' | 'visitor' = 'owner'
) {
  const supabase = (await createServiceClient()) as any;

  const { data: conversation, error } = await supabase
    .from('conversations')
    .insert({
      website_id: websiteId,
      agent_type: agentType,
      ai_mode: 'auto',
    })
    .select()
    .single();

  if (error) {
    throw new Error('Failed to create conversation');
  }

  return conversation;
}

/**
 * Toggle AI mode for a conversation
 */
export async function toggleAiMode(
  conversationId: string,
  mode: 'auto' | 'paused'
) {
  const supabase = (await createServiceClient()) as any;

  const { error } = await supabase
    .from('conversations')
    .update({ ai_mode: mode })
    .eq('id', conversationId);

  if (error) {
    throw new Error('Failed to update AI mode');
  }
}
