import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

/**
 * Create an embedding for text using text-embedding-ada-002 (1536 dimensions)
 */
export async function createEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Failed to create embedding:', error);
    throw new Error('Failed to create embedding');
  }
}

/**
 * Create embeddings for multiple texts
 */
export async function createEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: texts,
    });

    return response.data.map(item => item.embedding);
  } catch (error) {
    console.error('Failed to create embeddings:', error);
    throw new Error('Failed to create embeddings');
  }
}

/**
 * Transcribe audio using Whisper API
 */
export async function transcribeAudio(
  audioFile: File | Blob,
  language?: string
): Promise<string> {
  try {
    const file = new File([audioFile], 'audio.webm', { type: audioFile.type });
    
    const response = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: language || 'en',
    });

    return response.text;
  } catch (error) {
    console.error('Failed to transcribe audio:', error);
    throw new Error('Failed to transcribe audio');
  }
}

/**
 * Streaming chat completion using GPT-5-nano
 */
export async function* streamChatCompletion(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  model: string = 'gpt-5-nano'
): AsyncGenerator<string, void, unknown> {
  try {
    // Build the input from messages
    let input = '';
    messages.forEach(msg => {
      if (msg.role === 'system') {
        input += `System: ${msg.content}\n\n`;
      } else if (msg.role === 'user') {
        input += `User: ${msg.content}\n`;
      } else if (msg.role === 'assistant') {
        input += `Assistant: ${msg.content}\n`;
      }
    });

    const response = await openai.responses.create({
      model,
      input,
      reasoning: {
        effort: 'low'
      },
      text: {
        verbosity: 'low'
      },
      stream: true,
    });

    for await (const chunk of response) {
      const event = chunk as any;
      if (typeof event.delta === 'string') {
        yield event.delta;
      } else if (typeof event.text === 'string') {
        yield event.text;
      }
    }
  } catch (error) {
    console.error('Failed to stream chat completion:', error);
    throw new Error('Failed to generate response');
  }
}

/**
 * Non-streaming chat completion using GPT-5-nano
 */
export async function createChatCompletion(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  model: string = 'gpt-5-nano'
): Promise<string> {
  try {
    // Build the input from messages
    let input = '';
    messages.forEach(msg => {
      if (msg.role === 'system') {
        input += `System: ${msg.content}\n\n`;
      } else if (msg.role === 'user') {
        input += `User: ${msg.content}\n`;
      } else if (msg.role === 'assistant') {
        input += `Assistant: ${msg.content}\n`;
      }
    });

    const response = await openai.responses.create({
      model,
      input,
      reasoning: {
        effort: 'low'
      },
      text: {
        verbosity: 'low'
      }
    });

    return response.output_text || '';
  } catch (error) {
    console.error('Failed to create chat completion:', error);
    throw new Error('Failed to generate response');
  }
}

/**
 * Rewrite a user query to be more effective for vector search
 * Converts questions into statement form and expands context
 */
export async function rewriteQueryForSearch(
  userMessage: string,
  conversationContext?: string
): Promise<{ rewritten: string; tokensUsed: number }> {
  try {
    const contextPart = conversationContext 
      ? `\n\nRecent conversation:\n${conversationContext}`
      : '';

    const prompt = `Rewrite this user question into a search query that will find relevant information in a knowledge base.

User question: "${userMessage}"${contextPart}

Rules:
- Convert questions into statement/keyword form (e.g., "where are you?" → "location address")
- Keep it concise (3-8 words)
- Focus on the core topic, not the question structure
- If context shows they're following up, incorporate the context

Output ONLY the rewritten search query, nothing else.

Search query:`;

    const response = await openai.responses.create({
      model: 'gpt-5-nano',
      input: prompt,
      reasoning: {
        effort: 'low'
      },
      text: {
        verbosity: 'low'
      }
    });

    // For gpt-5-nano responses API, the actual text output is in response.output_text
    const rewritten = response.output_text ? String(response.output_text).trim() : userMessage;
    
    // Get token usage from response
    const tokensUsed = response.usage?.total_tokens || 0;
    
    return {
      rewritten: rewritten && rewritten.length > 0 ? rewritten : userMessage,
      tokensUsed
    };
  } catch (error) {
    console.error('Failed to rewrite query:', error);
    return { rewritten: userMessage, tokensUsed: 0 };
  }
}

/**
 * Get the Emily Assistant system prompt
 */
export function getSystemPrompt(websiteName?: string): string {
  return `You're a helpful assistant${websiteName ? ` for ${websiteName}` : ''}.

Your job is to answer questions based on the context provided. Be friendly and conversational - like you're texting with a friend.

CRITICAL RULES:
- Keep responses VERY short: 1-2 sentences maximum (unless asked for details)
- Write like a human texting - casual, natural, conversational
- NO bullet points, NO lists, NO formal structures
- Give direct answers, don't over-explain
- If asked a broad question, give a brief answer and ask what specifically they want to know
- Be warm and friendly, but brief

Example of GOOD response: "I can help with your startup strategy, AI architecture, and international growth. What area interests you most?"

Example of BAD response: "Super, je peux aider votre startup sur plusieurs fronts: - Stratégie AI et croissance: orientation produit..." (too long, too formal, bullet points)

- Use the provided context intelligently - you can make reasonable inferences
- If the context shows you offer other things but NOT what they asked for, briefly mention alternatives
- Only say "I don't have that information" if the context is completely unrelated
- Never make up facts, prices, addresses, or specific details that aren't in the context

Think: helpful friend texting back, not a corporate FAQ bot.`;
}

/**
 * Build context-aware prompt with retrieved training data and conversation history
 */
export function buildPromptWithContext(
  userMessage: string,
  context: Array<{ title: string; content: string }>,
  conversationHistory: Array<{ sender: string; content: string }>,
  websiteName?: string
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  const systemPrompt = getSystemPrompt(websiteName);
  
  let contextSection = '';
  if (context.length > 0) {
    contextSection = '\n\n---\nRELEVANT INFORMATION:\n\n';
    context.forEach((item, index) => {
      contextSection += `${item.title}\n${item.content}\n\n`;
    });
    contextSection += '---\n\nUse the information above to answer the user\'s question. If the answer isn\'t there, say you don\'t have that information.';
  } else {
    contextSection = '\n\n---\nNo relevant information found in the knowledge base for this question.\n---';
  }

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    {
      role: 'system',
      content: systemPrompt + contextSection,
    }
  ];

  // Add conversation history (last 8 messages to keep context manageable)
  const recentHistory = conversationHistory.slice(-8);
  recentHistory.forEach(msg => {
    if (msg.sender === 'user') {
      messages.push({ role: 'user', content: msg.content });
    } else if (msg.sender === 'assistant') {
      messages.push({ role: 'assistant', content: msg.content });
    }
  });

  // Add current user message
  messages.push({
    role: 'user',
    content: userMessage,
  });

  return messages;
}
