/**
 * Content Processor for Wonder George Integration
 * Processes WG website content and documents into training chunks
 */

import { TrainingChunk, WGWebsiteContent } from '@/types/models';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Process WG website content into training chunks
 * Extracts meaningful content from pages and sections
 */
export function processWGContent(websiteContent: WGWebsiteContent): TrainingChunk[] {
  const chunks: TrainingChunk[] = [];

  if (!websiteContent.pages) {
    return chunks;
  }

  // Process each page
  for (const [pageName, pageData] of Object.entries(websiteContent.pages)) {
    if (!pageData || typeof pageData !== 'object') continue;

    // If page has sections array
    if (Array.isArray(pageData.sections)) {
      for (const section of pageData.sections) {
        if (!section.type || !section.content) continue;

        const chunk = extractSectionContent(pageName, section);
        if (chunk) {
          chunks.push(chunk);
        }
      }
    }
    // If page data is directly the content
    else if (pageData.content) {
      const textContent = extractTextFromObject(pageData.content);
      if (textContent) {
        chunks.push({
          title: `${formatPageName(pageName)} Page`,
          content: textContent,
        });
      }
    }
  }

  // Add strategy/tone information if available
  if (websiteContent.strategy) {
    const strategyContent = buildStrategyContent(websiteContent.strategy);
    if (strategyContent) {
      chunks.push({
        title: 'Brand Strategy & Communication Tone',
        content: strategyContent,
      });
    }
  }

  return chunks;
}

/**
 * Extract content from a WG section
 */
function extractSectionContent(pageName: string, section: any): TrainingChunk | null {
  const sectionType = section.type;
  const content = section.content;

  if (!content) return null;

  let textContent = '';
  let title = `${formatPageName(pageName)}: ${sectionType}`;

  // Handle different section types
  switch (sectionType) {
    case 'Hero':
      textContent = [
        content.title,
        content.subtitle,
        content.ctaText,
      ].filter(Boolean).join('\n');
      title = `${formatPageName(pageName)}: Hero Section`;
      break;

    case 'Features':
    case 'Services':
      const items = content.items || [];
      textContent = [
        content.title,
        content.description,
        ...items.map((item: any) => 
          `${item.title || ''}: ${item.description || ''}`
        ),
      ].filter(Boolean).join('\n');
      break;

    case 'About':
    case 'Text':
      textContent = extractTextFromObject(content);
      break;

    case 'Contact':
      textContent = [
        content.title,
        content.description,
        content.email ? `Email: ${content.email}` : '',
        content.phone ? `Phone: ${content.phone}` : '',
        content.address ? `Address: ${content.address}` : '',
      ].filter(Boolean).join('\n');
      break;

    default:
      // Generic extraction for unknown types
      textContent = extractTextFromObject(content);
  }

  if (!textContent.trim()) return null;

  return {
    title,
    content: textContent.trim(),
  };
}

/**
 * Extract text from nested object recursively
 */
function extractTextFromObject(obj: any): string {
  if (typeof obj === 'string') return obj;
  if (typeof obj === 'number') return obj.toString();
  if (!obj) return '';

  const texts: string[] = [];

  if (Array.isArray(obj)) {
    for (const item of obj) {
      const text = extractTextFromObject(item);
      if (text) texts.push(text);
    }
  } else if (typeof obj === 'object') {
    // Skip certain keys that aren't content
    const skipKeys = ['id', 'href', 'url', 'image', 'icon', 'slug'];
    
    for (const [key, value] of Object.entries(obj)) {
      if (skipKeys.includes(key)) continue;
      const text = extractTextFromObject(value);
      if (text) texts.push(text);
    }
  }

  return texts.join('\n');
}

/**
 * Build strategy content description
 */
function buildStrategyContent(strategy: any): string {
  const parts: string[] = [];

  if (strategy.tone) {
    parts.push(`Communication Tone: ${strategy.tone.replace(/_/g, ' ')}`);
  }

  if (Array.isArray(strategy.key_messages)) {
    parts.push(`Key Messages: ${strategy.key_messages.join(', ')}`);
  }

  if (strategy.target_audience) {
    parts.push(`Target Audience: ${strategy.target_audience}`);
  }

  if (strategy.brand_voice) {
    parts.push(`Brand Voice: ${strategy.brand_voice}`);
  }

  return parts.join('\n\n');
}

/**
 * Format page name for display
 */
function formatPageName(pageName: string): string {
  return pageName
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Process uploaded document using GPT to chunk it intelligently
 * Always returns chunks with title and content format
 */
export async function chunkDocument(text: string): Promise<TrainingChunk[]> {
  if (!text.trim()) {
    throw new Error('Document is empty');
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5-nano',
      messages: [
        {
          role: 'system',
          content: `You are a content analyzer for a vector database system. Your job is to break documents into MULTIPLE semantic chunks for embedding and retrieval.

CRITICAL REQUIREMENTS:
1. Create MULTIPLE chunks (minimum 3-5, more if the document is long)
2. Each chunk should focus on ONE distinct topic or concept
3. Break up long sections into smaller, focused chunks
4. Each chunk should be self-contained and make sense on its own
5. Think: "If someone searches for this topic, would this chunk answer their question?"

Return a JSON object with a "chunks" array:
{
  "chunks": [
    {
      "title": "Specific topic 1",
      "content": "Detailed content about topic 1"
    },
    {
      "title": "Specific topic 2", 
      "content": "Detailed content about topic 2"
    },
    {
      "title": "Specific topic 3",
      "content": "Detailed content about topic 3"
    }
  ]
}

DO NOT return a single chunk with all the content. Break it into multiple focused chunks suitable for vector search.`,
        },
        {
          role: 'user',
          content: text,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const result = response.choices[0].message.content;
    if (!result) {
      throw new Error('No response from GPT');
    }

    console.log('GPT raw response:', result);
    const parsed = JSON.parse(result);
    console.log('Parsed JSON:', parsed);
    
    // Handle both array and object with chunks array
    let chunks: any[] = [];
    if (Array.isArray(parsed)) {
      chunks = parsed;
    } else if (parsed.chunks && Array.isArray(parsed.chunks)) {
      chunks = parsed.chunks;
    } else if (parsed.topics && Array.isArray(parsed.topics)) {
      chunks = parsed.topics;
    } else if (parsed.items && Array.isArray(parsed.items)) {
      chunks = parsed.items;
    }

    console.log('Extracted chunks array:', chunks);

    // Map to standardized format with title and content
    const mappedChunks = chunks.map(chunk => ({
      title: chunk.title || chunk.topic || chunk.name || 'Document Content',
      content: chunk.content || chunk.description || chunk.text || chunk.body || '',
    })).filter(chunk => chunk.content.trim().length > 0 && chunk.title.trim().length > 0);

    console.log('Final mapped chunks:', mappedChunks);
    return mappedChunks;
  } catch (error) {
    console.error('Error chunking document:', error);
    
    // Fallback: if GPT fails, create one chunk with the whole document
    return [{
      title: 'Uploaded Document',
      content: text.trim(),
    }];
  }
}

/**
 * Generate contextual questions based on website content
 * Used for the Q&A loop in onboarding
 */
export async function generateContextualQuestions(
  businessContext: string,
  websiteName: string
): Promise<string[]> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5-nano',
      messages: [
        {
          role: 'system',
          content: `You are helping set up a chatbot for a business. Based on the website content provided, generate 3-5 specific questions that would help the chatbot give better answers to visitors.

Focus on:
- Specific products/services
- Common customer questions
- Unique value propositions
- Business processes or policies

Return a JSON array of question strings.`,
        },
        {
          role: 'user',
          content: `Business: ${websiteName}\n\nContext from website:\n${businessContext}`,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const result = response.choices[0].message.content;
    if (!result) {
      return getDefaultQuestions();
    }

    const parsed = JSON.parse(result);
    const questions = parsed.questions || parsed.items || [];
    
    if (Array.isArray(questions) && questions.length > 0) {
      return questions.slice(0, 5);
    }

    return getDefaultQuestions();
  } catch (error) {
    console.error('Error generating questions:', error);
    return getDefaultQuestions();
  }
}

/**
 * Default questions if GPT generation fails
 */
function getDefaultQuestions(): string[] {
  return [
    "What specific products or services do you offer?",
    "What questions do customers typically ask you?",
    "What makes your business unique compared to competitors?",
    "Is there anything else you'd like the chatbot to know about your business?",
  ];
}
