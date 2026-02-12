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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const processedMessageIds = useRef<Set<string>>(new Set());
  const supabase = createClient();

  const selectedConversation = conversations.find(c => c.id === selectedConvId);
  const isAiActive = aiMode === 'auto';

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
      // Clear processed messages when switching conversations
      processedMessageIds.current.clear();
      
      fetchConversation(selectedConvId);
      fetchMessages(selectedConvId);
      
      // Subscribe to new messages in real-time
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
            console.log('🔔 REALTIME: Message received:', newMessage.id.substring(0, 8), '| Sender:', newMessage.sender);
            
            // Use ref to prevent duplicate processing across render cycles
            if (processedMessageIds.current.has(newMessage.id)) {
              console.log('   ⏭️  SKIP: Already in processedMessageIds');
              return;
            }
            
            processedMessageIds.current.add(newMessage.id);
            console.log('   ✅ ADDED to processedMessageIds');
            
            setMessages(prev => {
              console.log('   📝 setState called. Current state has', prev.length, 'messages');
              // Double-check in state as well
              if (prev.some(m => m.id === newMessage.id)) {
                console.log('   ⏭️  SKIP: Already in state array');
                return prev;
              }
              console.log('   ✅ ADDING to state array');
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
        const fetchedMessages = data.data || [];
        console.log('📥 FETCH: Received', fetchedMessages.length, 'messages from API');
        fetchedMessages.forEach((msg: Message) => {
          console.log(`  - ${msg.id.substring(0, 8)} | ${msg.sender} | ${msg.content.substring(0, 30)}`);
        });
        
        setMessages(fetchedMessages);
        
        // Mark all fetched messages as processed to prevent realtime from re-adding them
        fetchedMessages.forEach((msg: Message) => {
          processedMessageIds.current.add(msg.id);
        });
        
        console.log('✅ FETCH: State updated and', fetchedMessages.length, 'IDs marked as processed');
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleAiMode = async () => {
    if (!selectedConvId) return;

    const newMode = aiMode === 'auto' ? 'paused' : 'auto';
    try {
      const response = await fetch(`/api/conversations/${selectedConvId}/ai-mode`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiMode: newMode }),
      });

      if (response.ok) {
        setAiMode(newMode);
        // Update conversation in list
        setConversations(prev =>
          prev.map(c => (c.id === selectedConvId ? { ...c, ai_mode: newMode } : c))
        );
      }
    } catch (err) {
      console.error('Failed to toggle AI mode:', err);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if AI is active - user must pause it first
    if (isAiActive) {
      setShowAiModal(true);
      return;
    }
    
    if (!input.trim() || sending || !selectedConvId) return;

    const userMessage = input.trim();
    setInput('');
    setSending(true);
    setError(null);

    try {
      const response = await fetch(`/api/conversations/${selectedConvId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: userMessage,
          sender: 'assistant' // Owner manual response
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send message');
      }

      // Message will appear via realtime subscription - no optimistic update needed
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  if (conversations.length === 0) {
    return (
      <main className="neo-container py-4 sm:py-8">
        <div className="neo-card bg-white p-8 sm:p-12 text-center">
          <h3 className="text-xl sm:text-2xl font-bold mb-2">No conversations yet</h3>
          <p className="text-sm sm:text-base text-gray-600">
            Visitors will start conversations through the chat widget on your website.
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 border-r-4 border-black bg-white flex flex-col">
        <div className="p-4 border-b-4 border-black">
          <h2 className="text-xl font-bold">Conversations</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map(conv => (
            <div
              key={conv.id}
              onClick={() => setSelectedConvId(conv.id)}
              className={`p-4 border-b-2 border-gray-200 cursor-pointer transition-colors ${
                selectedConvId === conv.id
                  ? 'bg-fuchsia-primary text-white'
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold">
                  {conv.agent_type === 'owner' ? '👤 Owner' : '💬 Visitor'}
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
                {conv.lastMessage || 'No messages yet'}
              </p>
              <p className={`text-xs ${selectedConvId === conv.id ? 'text-white opacity-80' : 'text-gray-500'}`}>
                {formatRelativeTime(conv.updated_at || conv.created_at)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      {selectedConversation ? (
        <div className="flex-1 flex flex-col bg-page">
          {/* Chat Header */}
          <div className="py-4 px-6 border-b-4 border-black bg-white">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-xl font-bold">
                  {selectedConversation.agent_type === 'owner' ? 'Owner Assistant' : 'Visitor Chat'}
                </h1>
                <p className="text-sm text-gray-600">
                  {formatRelativeTime(selectedConversation.created_at)}
                </p>
              </div>
              <button
                onClick={toggleAiMode}
                className={`neo-button-${aiMode === 'auto' ? 'primary' : 'secondary'} !p-3 flex items-center justify-center`}
                title={aiMode === 'auto' ? 'Pause AI' : 'Resume AI'}
              >
                {aiMode === 'auto' ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Messages */}
          <main className="flex-1 neo-container py-8 overflow-y-auto">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-600">Loading messages...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <h3 className="text-xl sm:text-2xl font-bold mb-2">Start the conversation</h3>
                <p className="text-sm sm:text-base text-gray-600">Send a message to begin</p>
              </div>
            ) : (
              <div className="space-y-6">
                {(() => {
                  console.log('🎨 RENDER: Displaying', messages.length, 'messages');
                  // Check for duplicates
                  const ids = messages.map(m => m.id);
                  const uniqueIds = new Set(ids);
                  if (ids.length !== uniqueIds.size) {
                    console.error('⚠️ DUPLICATE IDs IN STATE!');
                    console.log('Total messages:', ids.length);
                    console.log('Unique IDs:', uniqueIds.size);
                    ids.forEach((id, idx) => {
                      if (ids.indexOf(id) !== idx) {
                        console.error(`  DUPLICATE: ${id.substring(0, 8)} at index ${idx} (first at ${ids.indexOf(id)})`);
                      }
                    });
                  }
                  return null;
                })()}
                {messages.map(message => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'assistant' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] p-4 rounded-lg shadow-md ${
                        message.sender === 'assistant'
                          ? 'bg-gray-100 text-gray-800 rounded-br-none border-2 border-gray-200'
                          : 'bg-fuchsia-primary text-white rounded-bl-none'
                      }`}
                    >
                      <p className="text-sm sm:text-base whitespace-pre-wrap">{message.content}</p>
                      <p className={`text-xs mt-1 text-right ${message.sender === 'assistant' ? 'text-gray-500' : 'text-white opacity-80'}`}>
                        {formatRelativeTime(message.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </main>

          {/* Input Area */}
          <div className="py-4 px-6 border-t-4 border-black bg-white flex-shrink-0">
            {isAiActive && (
              <div className="mb-2 p-2 bg-blue-50 border-2 border-blue-500 rounded text-sm text-blue-800">
                💡 Pause the AI to send manual messages
              </div>
            )}
            {aiMode === 'paused' && (
              <div className="mb-2 p-2 bg-yellow-50 border-2 border-yellow-500 rounded text-sm text-yellow-800">
                AI is paused. Your messages will go directly to the visitor.
              </div>
            )}
            <form onSubmit={handleSend} className="flex gap-4">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                className={`neo-input flex-1 ${isAiActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                placeholder={isAiActive ? "Pause AI to send messages" : "Type your message..."}
                disabled={sending || isAiActive}
              />
              <button 
                type="submit" 
                className={`neo-button-primary flex-shrink-0 ${isAiActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={sending || isAiActive}
              >
                {sending ? 'Sending...' : 'Send'}
              </button>
            </form>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-page">
          <p className="text-gray-600">Select a conversation to view</p>
        </div>
      )}
      
      {/* AI Active Modal */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowAiModal(false)}>
          <div className="bg-white border-4 border-black rounded-lg p-6 max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-3">AI is Active</h3>
            <p className="text-gray-700 mb-4">
              You need to pause the AI before you can send manual messages. Click the pause button (⏸) in the header to take over the conversation.
            </p>
            <button
              onClick={() => setShowAiModal(false)}
              className="neo-button-primary w-full"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
