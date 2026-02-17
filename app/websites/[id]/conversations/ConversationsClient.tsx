'use client';

import { useState, useEffect, useRef } from 'react';
import { formatRelativeTime } from '@/lib/utils/helpers';
import { createClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  ai_mode: string;
  agent_type: string;
  lastMessage?: string;
}

interface ConversationsClientProps {
  websiteId: string;
  initialConversations: Conversation[];
}

export function ConversationsClient({ websiteId, initialConversations }: ConversationsClientProps) {
  const t = useTranslations('conversations');
  const tTime = useTranslations('time');
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(
    initialConversations.length > 0 ? initialConversations[0].id : null
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiMode, setAiMode] = useState<string>('auto');
  const [showAiModal, setShowAiModal] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const processedMessageIds = useRef<Set<string>>(new Set());
  const supabase = createClient();

  const selectedConversation = conversations.find(c => c.id === selectedConvId);
  const isAiActive = aiMode === 'auto';

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Subscribe to new conversations for this website
  useEffect(() => {
    const conversationsChannel = supabase
      .channel(`website-conversations-${websiteId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations',
          filter: `website_id=eq.${websiteId}`,
        },
        (payload) => {
          const newConversation = payload.new as Conversation;
          setConversations(prev => [newConversation, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `website_id=eq.${websiteId}`,
        },
        (payload) => {
          const updatedConversation = payload.new as Conversation;
          setConversations(prev =>
            prev.map(c => (c.id === updatedConversation.id ? updatedConversation : c))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(conversationsChannel);
    };
  }, [websiteId]);

  useEffect(() => {
    if (selectedConvId) {
      processedMessageIds.current.clear();
      
      fetchConversation(selectedConvId);
      fetchMessages(selectedConvId);
      
      const channelName = `conversation-${selectedConvId}-${Date.now()}`;
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${selectedConvId}`,
          },
          (payload) => {
            const newMessage = payload.new as Message;
            
            if (processedMessageIds.current.has(newMessage.id)) {
              return;
            }
            
            processedMessageIds.current.add(newMessage.id);
            
            setMessages(prev => {
              if (prev.some(m => m.id === newMessage.id)) {
                return prev;
              }
              return [...prev, newMessage];
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedConvId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversation = async (convId: string) => {
    try {
      const response = await fetch(`/api/conversations/${convId}`);
      if (response.ok) {
        const data = await response.json();
        setAiMode(data.conversation.ai_mode);
      }
    } catch (err) {
      console.error('Failed to fetch conversation:', err);
    }
  };

  const fetchMessages = async (convId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/conversations/${convId}/messages`);
      const data = await response.json();
      
      if (response.ok) {
        setMessages(data.messages || []);
        data.messages?.forEach((msg: Message) => {
          processedMessageIds.current.add(msg.id);
        });
        setTimeout(scrollToBottom, 100);
      } else {
        setError(data.error || t('failedToLoad'));
      }
    } catch (err) {
      setError(t('failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending || isAiActive) return;

    setSending(true);
    setError(null);

    const userMessage = input.trim();
    setInput('');
    
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      sender: 'assistant', // Manual response from backoffice
      content: userMessage,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempMessage]);
    processedMessageIds.current.add(tempMessage.id);

    try {
      const response = await fetch(`/api/conversations/${selectedConvId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: userMessage,
          sender: 'assistant', // Manual message from backoffice
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t('failedToSend'));
      }

      // Message was saved, realtime will add it to the UI
      // Just remove the temp message
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
      processedMessageIds.current.delete(tempMessage.id);
    } catch (err: any) {
      setError(err.message);
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
      processedMessageIds.current.delete(tempMessage.id);
      setInput(userMessage);
    } finally {
      setSending(false);
    }
  };

  const toggleAiMode = async () => {
    if (!selectedConvId) return;

    if (aiMode === 'auto') {
      setShowAiModal(true);
    }

    const newMode = aiMode === 'auto' ? 'paused' : 'auto';
    setAiMode(newMode);

    try {
      await fetch(`/api/conversations/${selectedConvId}/ai-mode`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ai_mode: newMode }),
      });
    } catch (err) {
      console.error('Failed to update AI mode:', err);
    }
  };

  if (conversations.length === 0) {
    return (
      <main className="neo-container py-4 sm:py-8">
        <div className="neo-card bg-white p-8 sm:p-12 text-center">
          <h3 className="text-xl sm:text-2xl font-bold mb-2">{t('noConversations')}</h3>
          <p className="text-sm sm:text-base text-gray-600">
            {t('noConversationsDescription')}
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="fixed inset-0 top-16 flex overflow-hidden overscroll-none">
      {/* Mobile Overlay */}
      {showSidebar && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-80 border-r-4 border-black bg-white flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${showSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-4 border-b-4 border-black flex justify-between items-center flex-shrink-0">
          <h2 className="text-xl font-bold">{t('conversations')}</h2>
          <button
            onClick={() => setShowSidebar(false)}
            className="lg:hidden p-2 hover:bg-gray-100 rounded"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map(conv => (
            <div
              key={conv.id}
              onClick={() => {
                setSelectedConvId(conv.id);
                setShowSidebar(false);
              }}
              className={`p-4 border-b-2 border-gray-200 cursor-pointer transition-colors ${
                selectedConvId === conv.id
                  ? 'bg-fuchsia-primary text-white'
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold">
                  {conv.agent_type === 'owner' ? `👤 ${t('owner')}` : `💬 ${t('visitor')}`}
                </span>
                <span className={`text-xs px-2 py-1 rounded font-bold ${
                  selectedConvId === conv.id
                    ? 'bg-white text-fuchsia-primary'
                    : conv.ai_mode === 'auto'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {conv.ai_mode}
                </span>
              </div>
              <p className={`text-sm mb-1 truncate ${selectedConvId === conv.id ? 'text-white' : 'text-gray-800'}`}>
                {conv.lastMessage || t('noMessages')}
              </p>
              <p className={`text-xs ${selectedConvId === conv.id ? 'text-white opacity-80' : 'text-gray-500'}`}>
                {formatRelativeTime(conv.updated_at || conv.created_at, tTime)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      {selectedConversation ? (
        <div className="flex-1 flex flex-col bg-page min-w-0">
          {/* Chat Header */}
          <div className="py-3 px-4 border-b-4 border-black bg-white flex-shrink-0">
            <div className="flex justify-between items-center gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <button
                  onClick={() => setShowSidebar(true)}
                  className="lg:hidden p-2 -ml-2 hover:bg-gray-100 rounded flex-shrink-0"
                  title="Open conversations list"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <a
                  href={`/websites/${websiteId}`}
                  className="p-2 -ml-2 hover:bg-gray-100 rounded flex-shrink-0"
                  title="Back to bot"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </a>
                <div className="min-w-0">
                  <h1 className="text-base lg:text-xl font-bold truncate">
                    {selectedConversation.agent_type === 'owner' ? t('ownerAssistant') : t('visitorChat')}
                  </h1>
                  <p className="text-xs lg:text-sm text-gray-600">
                    {formatRelativeTime(selectedConversation.created_at, tTime)}
                  </p>
                </div>
              </div>
              <button
                onClick={toggleAiMode}
                className={`neo-button-${aiMode === 'auto' ? 'primary' : 'secondary'} !p-2 lg:!p-3 flex items-center justify-center flex-shrink-0`}
                title={aiMode === 'auto' ? t('pauseAI') : t('resumeAI')}
              >
                {aiMode === 'auto' ? (
                  <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                  </svg>
                ) : (
                  <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Messages - Scrollable area */}
          <div className="flex-1 overflow-y-auto px-4 py-4 lg:px-8 lg:py-6 min-h-0">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-600">{t('loadingMessages')}</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <h3 className="text-xl sm:text-2xl font-bold mb-2">{t('startConversation')}</h3>
                <p className="text-sm sm:text-base text-gray-600">{t('startConversationDescription')}</p>
              </div>
            ) : (
              <div className="space-y-6 max-w-3xl mx-auto">
                {messages.map(message => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] sm:max-w-[70%] rounded-lg p-3 sm:p-4 ${
                      message.sender === 'user'
                        ? 'bg-fuchsia-primary text-white'
                        : 'bg-white border-2 border-gray-200'
                    }`}>
                      <p className="text-sm sm:text-base whitespace-pre-wrap break-words">{message.content}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Area - Sticky at bottom */}
          <div className="py-3 px-4 lg:py-4 lg:px-6 border-t-4 border-black bg-white flex-shrink-0">
            {isAiActive && (
              <div className="mb-2 p-2 bg-blue-50 border-2 border-blue-500 rounded text-xs sm:text-sm text-blue-800">
                {t('pauseAiToSend')}
              </div>
            )}
            {aiMode === 'paused' && (
              <div className="mb-2 p-2 bg-yellow-50 border-2 border-yellow-500 rounded text-xs sm:text-sm text-yellow-800">
                {t('aiPaused')}
              </div>
            )}
            <form onSubmit={handleSend} className="flex gap-2 sm:gap-4">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                className={`neo-input flex-1 text-sm sm:text-base ${isAiActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                placeholder={isAiActive ? t('pauseAiPlaceholder') : t('typePlaceholder')}
                disabled={sending || isAiActive}
              />
              <button 
                type="submit" 
                className={`neo-button-primary flex-shrink-0 !p-3 sm:!p-4 ${isAiActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={sending || isAiActive}
                title={sending ? t('sending') : t('send')}
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
            {error && <p className="text-red-500 text-xs sm:text-sm mt-2">{error}</p>}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-page">
          <p className="text-gray-600">{t('selectConversation')}</p>
        </div>
      )}
      
      {/* AI Active Modal */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowAiModal(false)}>
          <div className="bg-white border-4 border-black rounded-lg p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-3">{t('aiActiveTitle')}</h3>
            <p className="text-gray-700 mb-4">
              {t('aiActiveDescription')}
            </p>
            <button
              onClick={() => setShowAiModal(false)}
              className="neo-button-primary w-full"
            >
              {t('gotIt')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
