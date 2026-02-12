'use client';

import { useState, useEffect, useRef } from 'react';
import { formatRelativeTime } from '@/lib/utils/helpers';
import { createClient } from '@/lib/supabase/client';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface TestChatWidgetProps {
  websiteId: string;
  websiteName: string;
  primaryColor: string;
  widgetStyle?: 'modern' | 'neutral';
  widgetSubtitle?: string;
  widgetWelcomeTitle?: string;
  widgetWelcomeMessage?: string;
  onClose: () => void;
}

export function TestChatWidget({ 
  websiteId, 
  websiteName, 
  primaryColor, 
  widgetStyle = 'modern',
  widgetSubtitle = 'We reply instantly',
  widgetWelcomeTitle = 'Hi there! 👋',
  widgetWelcomeMessage = 'How can we help you today?',
  onClose 
}: TestChatWidgetProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Style configurations
  const isModern = widgetStyle === 'modern';
  const borderStyle = isModern ? 'border-4 border-black' : 'border border-gray-200';
  const shadowStyle = isModern ? 'shadow-2xl' : 'shadow-xl';
  const roundedStyle = isModern ? 'sm:rounded-2xl' : 'sm:rounded-3xl';
  const roundedTop = isModern ? 'sm:rounded-t-xl' : 'sm:rounded-t-3xl';
  const roundedBottom = isModern ? 'sm:rounded-b-xl' : 'sm:rounded-b-3xl';

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Subscribe to realtime for this conversation
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`test-conversation-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          
          setMessages(prev => {
            // Remove temp message with same content if exists
            const filtered = prev.filter(m => 
              !(m.id.startsWith('temp-') && m.content === newMessage.content && m.sender === newMessage.sender)
            );
            
            // Check if real message already exists
            if (filtered.some(m => m.id === newMessage.id)) {
              return filtered;
            }
            
            return [...filtered, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const createConversation = async () => {
    if (conversationId) return conversationId; // Already have one
    
    try {
      const response = await fetch(`/api/websites/${websiteId}/conversations/create`);
      if (response.redirected) {
        // Extract conversation ID from redirect URL
        const url = new URL(response.url);
        const pathParts = url.pathname.split('/');
        const convId = pathParts[pathParts.length - 1];
        setConversationId(convId);
        return convId;
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
    return null;
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const callId = Date.now() + '-' + Math.random().toString(36).substr(2, 5);
    console.log(`🟢 [TestWidget ${callId}] handleSend CALLED`);

    const userMessage = input.trim();
    setInput('');
    setSending(true);

    console.log(`🔵 [TestWidget ${callId}] Sending message: "${userMessage}"`);

    // Create conversation on first message if it doesn't exist
    let convId = conversationId;
    if (!convId) {
      console.log(`🟡 [TestWidget ${callId}] Creating new conversation`);
      convId = await createConversation();
      if (!convId) {
        console.log(`🔴 [TestWidget ${callId}] Failed to create conversation`);
        setSending(false);
        return;
      }
      console.log(`✅ [TestWidget ${callId}] Conversation created: ${convId}`);
    }

    // Add user message immediately
    const tempUserMessage: Message = {
      id: 'temp-user-' + Date.now(),
      sender: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMessage]);

    try {
      console.log(`📡 [TestWidget ${callId}] Calling API /api/conversations/${convId}/messages`);
      const response = await fetch(`/api/conversations/${convId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: userMessage }),
      });

      console.log(`📥 [TestWidget ${callId}] API Response status: ${response.status}`);

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Check if AI is paused (returns JSON) or active (returns stream)
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        // AI is paused - no assistant response expected
        console.log(`⏸️ [TestWidget ${callId}] AI is paused, no response streamed`);
        return;
      }

      // Stream the AI response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';
      
      const tempAssistantId = 'temp-assistant-' + Date.now();
      setMessages(prev => [...prev, {
        id: tempAssistantId,
        sender: 'assistant',
        content: '',
        created_at: new Date().toISOString(),
      } as Message]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          assistantMessage += chunk;

          setMessages(prev => 
            prev.map(m => 
              m.id === tempAssistantId 
                ? { ...m, content: assistantMessage }
                : m
            )
          );
        }
      }
    } catch (err: any) {
      console.error('Send error:', err);
      setMessages(prev => prev.filter(m => !m.id.startsWith('temp-')));
    } finally {
      setSending(false);
    }
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className={`flex items-center gap-3 px-5 py-4 rounded-full ${shadowStyle} ${isModern ? 'border-4 border-black' : 'border border-gray-300'} hover:scale-105 transition-transform`}
          style={{ backgroundColor: primaryColor }}
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="text-white font-bold">{websiteName}</span>
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Backdrop with blur */}
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Widget */}
      <div className={`fixed bottom-0 right-0 sm:bottom-6 sm:right-6 w-full sm:w-[380px] h-[100dvh] sm:h-[600px] flex flex-col ${roundedStyle} ${shadowStyle} border-t-4 sm:${borderStyle} ${isModern ? 'border-black' : 'border-gray-200'} z-50 overflow-hidden`} style={{ backgroundColor: primaryColor }}>
        {/* Header */}
        <div 
          className={`flex items-center justify-between px-5 py-4 ${isModern ? 'border-b-4 border-black' : 'border-b border-gray-200'}`}
          style={{ backgroundColor: primaryColor }}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 bg-white rounded-full flex items-center justify-center font-bold text-lg ${isModern ? 'border-2 border-black' : 'shadow-sm'}`}>
              {websiteName[0]}
            </div>
            <div>
              <div className="text-white font-bold text-lg">{websiteName}</div>
              <div className="text-white text-xs opacity-90">{widgetSubtitle}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsMinimized(true)}
              className="hidden sm:block text-white hover:bg-black/10 rounded-full p-1 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isModern ? 3 : 2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="text-white hover:bg-black/10 rounded-full p-1 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isModern ? 3 : 2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <div 
                className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl font-bold ${isModern ? 'border-4 border-black' : 'shadow-md'}`}
                style={{ backgroundColor: primaryColor, color: 'white' }}
              >
                {websiteName[0]}
              </div>
              <p className="text-gray-600 font-medium mb-2">{widgetWelcomeTitle}</p>
              <p className="text-sm text-gray-500">{widgetWelcomeMessage}</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-2 ${
                    msg.sender === 'user'
                      ? `text-white ${isModern ? 'rounded-2xl border-2 border-black' : 'rounded-2xl'}`
                      : `bg-white text-gray-800 ${isModern ? 'rounded-2xl border-2 border-gray-200' : 'rounded-2xl shadow-sm border border-gray-100'}`
                  }`}
                  style={msg.sender === 'user' ? { backgroundColor: primaryColor } : {}}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))
          )}
          {sending && messages[messages.length - 1]?.sender !== 'assistant' && (
            <div className="flex justify-start">
              <div className={`bg-white px-4 py-2 rounded-2xl ${isModern ? 'border-2 border-gray-200' : 'shadow-sm border border-gray-100'}`}>
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className={`p-4 ${isModern ? 'border-t-4 border-black' : 'border-t border-gray-200'} bg-white ${roundedBottom}`}>
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={sending}
              className={`flex-1 px-4 py-3 ${isModern ? 'border-2 border-gray-300' : 'border border-gray-200'} rounded-full focus:outline-none ${isModern ? 'focus:border-black' : 'focus:border-gray-400 focus:ring-1 focus:ring-gray-400'} text-sm`}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className={`w-12 h-12 flex-shrink-0 rounded-full flex items-center justify-center ${isModern ? 'border-2 border-black' : 'shadow-md'} transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100`}
              style={{ backgroundColor: primaryColor }}
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
