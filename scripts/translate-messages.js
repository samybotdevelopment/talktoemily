#!/usr/bin/env node

/**
 * Auto-translate English messages to all supported languages using OpenAI GPT-4
 * 
 * Usage: node scripts/translate-messages.js
 * 
 * Requires: OPENAI_API_KEY environment variable
 */

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Target languages (excluding English which is the source)
// For testing, only translate to French first
const TARGET_LANGUAGES = [
  { code: 'fr', name: 'French' },
  // Uncomment below to translate all languages:
  // { code: 'de', name: 'German' },
  // { code: 'es', name: 'Spanish' },
  // { code: 'it', name: 'Italian' },
  // { code: 'pt', name: 'Portuguese' },
  // { code: 'nl', name: 'Dutch' },
  // { code: 'da', name: 'Danish' },
  // { code: 'no', name: 'Norwegian' },
  // { code: 'sv', name: 'Swedish' },
  // { code: 'pl', name: 'Polish' },
  // { code: 'el', name: 'Greek' },
  // { code: 'tr', name: 'Turkish' },
];

const MESSAGES_DIR = path.join(__dirname, '..', 'messages');
const EN_FILE = path.join(MESSAGES_DIR, 'en.json');

async function translateToLanguage(englishMessages, targetLang) {
  console.log(`\n🌍 Translating to ${targetLang.name} (${targetLang.code})...`);

  const prompt = `You are a professional translator specializing in software localization. 
Translate the following JSON file from English to ${targetLang.name}.

IMPORTANT RULES:
1. Preserve ALL variable placeholders EXACTLY as they appear (e.g., {count}, {name}, {date}, {link}, {max}, {min}, {days}, {attempt}, {plan}, {credits})
2. Maintain the JSON structure perfectly - only translate the VALUES, never the KEYS
3. Keep HTML tags and special characters intact (e.g., ←, →, 👉, 💙, 🎉, ⚠️)
4. Preserve line breaks (\\n) in multi-line strings
5. Maintain the tone: friendly, conversational, and professional (like "Emily" - a helpful AI assistant)
6. For technical terms like "chatbot", "widget", "embed", consider whether they should be translated or kept in English based on common usage in ${targetLang.name}
7. Ensure pluralization rules are appropriate for ${targetLang.name}
8. Keep URLs, email addresses, and code snippets unchanged

Source JSON (English):
${JSON.stringify(englishMessages, null, 2)}

Respond ONLY with the translated JSON. No explanations, no markdown code blocks, just the raw JSON.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-5.2',
      messages: [
        {
          role: 'system',
          content: 'You are a professional translator for software applications. You output only valid JSON without any markdown formatting or explanations.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const translatedText = completion.choices[0].message.content.trim();
    
    // Remove markdown code blocks if present
    let cleanedText = translatedText;
    if (translatedText.startsWith('```')) {
      cleanedText = translatedText.replace(/```json\\n?/g, '').replace(/```/g, '').trim();
    }

    // Parse to validate JSON
    const translatedMessages = JSON.parse(cleanedText);
    
    console.log(`✅ Translation to ${targetLang.name} completed successfully`);
    return translatedMessages;
  } catch (error) {
    console.error(`❌ Error translating to ${targetLang.name}:`, error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting automated translation process...');
  console.log('📖 Using GPT-4 Turbo for high-quality translations');

  // Check for API key
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Error: OPENAI_API_KEY not found in environment variables');
    console.error('Please add OPENAI_API_KEY to your .env.local file');
    process.exit(1);
  }

  // Read English source file
  console.log(`\n📄 Reading source file: ${EN_FILE}`);
  let englishMessages;
  try {
    const englishContent = fs.readFileSync(EN_FILE, 'utf-8');
    englishMessages = JSON.parse(englishContent);
    console.log(`✅ Loaded ${Object.keys(englishMessages).length} top-level keys from English messages`);
  } catch (error) {
    console.error('❌ Error reading English messages file:', error.message);
    process.exit(1);
  }

  // Translate to each target language
  let successCount = 0;
  let failCount = 0;

  for (const targetLang of TARGET_LANGUAGES) {
    try {
      const translatedMessages = await translateToLanguage(englishMessages, targetLang);
      
      // Write to file
      const outputFile = path.join(MESSAGES_DIR, `${targetLang.code}.json`);
      fs.writeFileSync(outputFile, JSON.stringify(translatedMessages, null, 2), 'utf-8');
      console.log(`💾 Saved translation to: ${outputFile}`);
      
      successCount++;
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`❌ Failed to translate to ${targetLang.name}`);
      failCount++;
      // Continue with other languages even if one fails
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TRANSLATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Successful: ${successCount}/${TARGET_LANGUAGES.length}`);
  console.log(`❌ Failed: ${failCount}/${TARGET_LANGUAGES.length}`);
  console.log('='.repeat(60));

  if (successCount === TARGET_LANGUAGES.length) {
    console.log('\n🎉 All translations completed successfully!');
    console.log('You can now use the application in multiple languages.');
  } else if (successCount > 0) {
    console.log('\n⚠️  Some translations failed. Please check the errors above and retry.');
  } else {
    console.log('\n❌ All translations failed. Please check your OpenAI API key and try again.');
    process.exit(1);
  }
}

// Run the script
main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

