(function() {
  'use strict';

  // Prevent double-initialization
  if (window.__EMILY_CHAT_INITIALIZED__) {
    console.warn('Emily Chat: Already initialized, skipping');
    return;
  }
  window.__EMILY_CHAT_INITIALIZED__ = true;

  // Get configuration
  const config = window.EmilyChat || {};
  const websiteId = config.websiteId;

  if (!websiteId) {
    console.error('Emily Chat: websiteId is required');
    return;
  }

  // Determine API base URL dynamically based on script source
  let API_BASE = 'https://talktoemily.com'; // default
  
  if (window.location.hostname === 'localhost' || window.location.protocol === 'file:') {
    API_BASE = 'http://localhost:3000';
  } else {
    // Try to extract from the script tag that loaded this file
    const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
      const src = scripts[i].src;
      if (src && src.includes('/widget/emily-chat.js')) {
        const url = new URL(src);
        API_BASE = `${url.protocol}//${url.host}`;
        break;
      }
    }
  }

  const SUPABASE_URL = config.supabaseUrl || 'https://gfppotrwghrawzpezsoc.supabase.co';
  const SUPABASE_ANON_KEY = config.supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmcHBvdHJ3Z2hyYXd6cGV6c29jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NDI3NDgsImV4cCI6MjA4NTAxODc0OH0.HFKh_-IpV9w5ErDP7m_WscR0hVTvs8Kby_pT6YiUhvQ';

  let conversationId = null;
  let visitorId = null;
  let supabaseClient = null;
  let realtimeChannel = null;
  let displayedMessageIds = new Set(); // Track displayed messages to prevent duplicates
  let widgetSettings = {
    websiteName: 'Emily',
    primaryColor: '#E91E63',
    widgetStyle: 'modern',
    widgetSubtitle: 'We reply instantly',
    widgetWelcomeTitle: 'Hi there! 👋',
    widgetWelcomeMessage: 'How can we help you today?'
  };

  // Utility function to scroll messages to bottom
  function scrollMessagesToBottom() {
    const messagesContainer = document.getElementById('emily-messages');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  // Adjust container height based on visual viewport (for mobile keyboard)
  function adjustContainerHeight() {
    const container = document.querySelector('.emily-chat-container');
    if (!container) return;

    // Only apply on mobile
    if (window.innerWidth <= 480) {
      if (window.visualViewport) {
        // Use visual viewport height when keyboard is open
        const height = window.visualViewport.height;
        container.style.height = `${height}px`;
        container.style.maxHeight = `${height}px`;
      }
    }
  }

  // Handle viewport changes (keyboard open/close on mobile)
  function setupKeyboardHandling() {
    const input = document.getElementById('emily-input');
    if (!input) return;

    // Modern approach: visualViewport API
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', () => {
        adjustContainerHeight();
        setTimeout(scrollMessagesToBottom, 100);
      });

      // Also listen to scroll events (iOS sometimes scrolls instead of resizing)
      window.visualViewport.addEventListener('scroll', () => {
        adjustContainerHeight();
      });
    }

    // Fallback: input focus events
    input.addEventListener('focus', () => {
      setTimeout(() => {
        adjustContainerHeight();
        scrollMessagesToBottom();
      }, 300);
    });

    // Blur event to restore height when keyboard closes
    input.addEventListener('blur', () => {
      setTimeout(() => {
        if (window.innerWidth <= 480) {
          const container = document.querySelector('.emily-chat-container');
          if (container && window.visualViewport) {
            container.style.height = `${window.visualViewport.height}px`;
            container.style.maxHeight = `${window.visualViewport.height}px`;
          }
        }
      }, 100);
    });

    // Additional fallback for older devices
    window.addEventListener('resize', () => {
      if (document.activeElement === input) {
        adjustContainerHeight();
        setTimeout(scrollMessagesToBottom, 100);
      }
    });

    // Initial adjustment
    adjustContainerHeight();
  }

  // Get or create visitor ID
  function getVisitorId() {
    const storageKey = `emily_visitor_${websiteId}`;
    let id = localStorage.getItem(storageKey);
    if (!id) {
      id = 'visitor_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem(storageKey, id);
    }
    return id;
  }

  visitorId = getVisitorId();

  // Fetch widget settings
  async function fetchWidgetSettings() {
    try {
      console.log('Emily Chat: Fetching settings for', websiteId);
      const response = await fetch(`${API_BASE}/api/widget/init?websiteId=${websiteId}`);
      if (response.ok) {
        const data = await response.json();
        widgetSettings = { ...widgetSettings, ...data };
        console.log('Emily Chat: Settings loaded', widgetSettings);
        return true;
      } else if (response.status === 403) {
        const data = await response.json();
        if (data.isInactive) {
          console.warn('Emily Chat: Bot is inactive');
          showInactiveMessage(data.message);
          return false;
        }
      } else {
        console.error('Emily Chat: Failed to fetch settings', response.status);
        return false;
      }
    } catch (error) {
      console.error('Emily Chat: Failed to fetch settings', error);
      return false;
    }
  }

  // Show inactive bot message
  function showInactiveMessage(message) {
    const widget = document.createElement('div');
    widget.id = 'emily-chat-widget';
    widget.innerHTML = `
      <style>
        #emily-chat-widget {
          position: fixed;
          bottom: 100px;
          right: 20px;
          z-index: 9999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .emily-inactive-bubble {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: #9CA3AF;
          border: 4px solid #000;
          box-shadow: 4px 4px 0 #000;
          cursor: not-allowed;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.5;
        }

        .emily-inactive-bubble svg {
          width: 30px;
          height: 30px;
          fill: #fff;
        }
      </style>
      <div class="emily-inactive-bubble" title="${message}">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
      </div>
    `;
    document.body.appendChild(widget);
  }

  // Create widget HTML
  function createWidget() {
    const isModern = widgetSettings.widgetStyle === 'modern';
    
    const widget = document.createElement('div');
    widget.id = 'emily-chat-widget';
    widget.innerHTML = `
      <style>
        #emily-chat-widget {
          position: fixed;
          bottom: 100px;
          right: 20px;
          z-index: 9999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .emily-bubble {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: ${widgetSettings.primaryColor};
          border: ${isModern ? '4px solid #000' : '2px solid rgba(0,0,0,0.1)'};
          box-shadow: ${isModern ? '4px 4px 0 #000' : '0 4px 12px rgba(0,0,0,0.15)'};
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s;
        }

        .emily-bubble:hover {
          transform: scale(1.05);
        }

        .emily-bubble svg {
          width: 28px;
          height: 28px;
          color: white;
        }

        .emily-chat-container {
          display: none;
          position: fixed;
          bottom: 100px;
          right: 20px;
          width: 380px;
          height: 600px;
          max-height: 100vh;
          background: white;
          border-radius: ${isModern ? '16px' : '24px'};
          border: ${isModern ? '4px solid #000' : '1px solid #e5e7eb'};
          box-shadow: ${isModern ? '8px 8px 0 #000' : '0 10px 40px rgba(0,0,0,0.1)'};
          flex-direction: column;
          overflow: hidden;
          box-sizing: border-box;
        }

        .emily-chat-container.open {
          display: flex;
        }

        .emily-header {
          background: ${widgetSettings.primaryColor};
          color: white;
          padding: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: ${isModern ? '4px solid #000' : '1px solid rgba(255,255,255,0.2)'};
        }

        .emily-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .emily-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: white;
          color: ${widgetSettings.primaryColor};
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 18px;
          border: ${isModern ? '2px solid #000' : 'none'};
          box-shadow: ${isModern ? 'none' : '0 2px 8px rgba(0,0,0,0.1)'};
        }

        .emily-header-text h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
        }

        .emily-header-text p {
          margin: 0;
          font-size: 12px;
          opacity: 0.9;
        }

        .emily-close {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .emily-close svg {
          width: 20px;
          height: 20px;
        }

        .emily-back {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          padding: 4px;
          margin-right: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .emily-back svg {
          width: 24px;
          height: 24px;
        }

        .emily-view {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .emily-conversations-list {
          flex: 1;
          overflow-y: auto;
          background: #f9fafb;
        }

        .emily-loading {
          text-align: center;
          padding: 40px 20px;
          color: #6b7280;
        }

        .emily-conversation-item {
          padding: 16px 20px;
          border-bottom: 1px solid #e5e7eb;
          cursor: pointer;
          transition: background 0.2s;
        }

        .emily-conversation-item:hover {
          background: #f3f4f6;
        }

        .emily-conversation-time {
          font-size: 12px;
          color: #6b7280;
          margin-bottom: 4px;
        }

        .emily-conversation-preview {
          font-size: 14px;
          color: #1f2937;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .emily-no-conversations {
          text-align: center;
          padding: 40px 20px;
          color: #6b7280;
        }

        .emily-new-conversation-btn {
          padding: 16px 20px;
          background: ${widgetSettings.primaryColor};
          color: white;
          text-align: center;
          cursor: pointer;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-top: ${isModern ? '4px solid #000' : '1px solid rgba(0,0,0,0.1)'};
        }

        .emily-new-conversation-btn:hover {
          opacity: 0.9;
        }

        .emily-messages {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          background: #f9fafb;
        }

        .emily-welcome {
          text-align: center;
          padding: 40px 20px;
        }

        .emily-welcome-avatar {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: ${widgetSettings.primaryColor};
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 28px;
          margin: 0 auto 16px;
          border: ${isModern ? '4px solid #000' : 'none'};
          box-shadow: ${isModern ? 'none' : '0 4px 12px rgba(0,0,0,0.15)'};
        }

        .emily-welcome h4 {
          margin: 0 0 8px;
          font-size: 18px;
          color: #1f2937;
        }

        .emily-welcome p {
          margin: 0;
          font-size: 14px;
          color: #6b7280;
        }

        .emily-message {
          margin-bottom: 16px;
          display: flex;
        }

        .emily-message.user {
          justify-content: flex-end;
        }

        .emily-message-content {
          max-width: 80%;
          padding: 12px 16px;
          border-radius: 16px;
          font-size: 14px;
          line-height: 1.5;
          word-wrap: break-word;
        }

        .emily-message.user .emily-message-content {
          background: ${widgetSettings.primaryColor};
          color: white;
          border: ${isModern ? '2px solid #000' : 'none'};
        }

        .emily-message.assistant .emily-message-content {
          background: white;
          color: #1f2937;
          border: ${isModern ? '2px solid #e5e7eb' : '1px solid #e5e7eb'};
          box-shadow: ${isModern ? 'none' : '0 1px 2px rgba(0,0,0,0.05)'};
        }

        .emily-typing {
          display: flex;
          gap: 4px;
          padding: 12px 16px;
          background: white;
          border-radius: 16px;
          width: fit-content;
          border: ${isModern ? '2px solid #e5e7eb' : '1px solid #e5e7eb'};
        }

        .emily-typing span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #9ca3af;
          animation: emily-bounce 1.4s infinite ease-in-out;
        }

        .emily-typing span:nth-child(1) { animation-delay: -0.32s; }
        .emily-typing span:nth-child(2) { animation-delay: -0.16s; }

        @keyframes emily-bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }

        .emily-input-container {
          padding: 16px;
          background: white;
          border-top: ${isModern ? '4px solid #000' : '1px solid #e5e7eb'};
        }

        .emily-input-form {
          display: flex;
          gap: 8px;
        }

        .emily-input {
          flex: 1;
          padding: 12px 16px;
          border: ${isModern ? '2px solid #d1d5db' : '1px solid #e5e7eb'};
          border-radius: 24px;
          font-size: 14px;
          outline: none;
          font-family: inherit;
        }

        .emily-input:focus {
          border-color: ${isModern ? '#000' : '#9ca3af'};
          ${isModern ? '' : 'box-shadow: 0 0 0 1px #9ca3af;'}
        }

        .emily-send {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: ${widgetSettings.primaryColor};
          border: ${isModern ? '2px solid #000' : 'none'};
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: ${isModern ? 'none' : '0 2px 8px rgba(0,0,0,0.15)'};
        }

        .emily-send:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .emily-send svg {
          width: 20px;
          height: 20px;
        }

        @media (max-width: 480px) {
          .emily-chat-container {
            bottom: 0;
            right: 0;
            left: 0;
            width: 100%;
            height: 100dvh;
            max-height: 100dvh;
            border-radius: 0;
          }
        }
      </style>

      <div class="emily-bubble" onclick="window.EmilyChat.toggle()">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
        </svg>
      </div>

      <div class="emily-chat-container">
        <!-- Conversation List View -->
        <div class="emily-view emily-conversations-view">
          <div class="emily-header">
            <div class="emily-header-left">
              <div class="emily-avatar">${widgetSettings.websiteName[0]}</div>
              <div class="emily-header-text">
                <h3>${widgetSettings.websiteName}</h3>
                <p>${widgetSettings.widgetSubtitle}</p>
              </div>
            </div>
            <button class="emily-close" onclick="window.EmilyChat.toggle()">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          
          <div class="emily-conversations-list" id="emily-conversations-list">
            <div class="emily-loading">Loading conversations...</div>
          </div>
          
          <div class="emily-new-conversation-btn" onclick="window.EmilyChat.startNewConversation()">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:20px;height:20px;">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            <span>New Conversation</span>
          </div>
        </div>

        <!-- Chat View -->
        <div class="emily-view emily-chat-view" style="display: none;">
          <div class="emily-header">
            <button class="emily-back" onclick="window.EmilyChat.backToList()">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <div class="emily-header-left">
              <div class="emily-avatar">${widgetSettings.websiteName[0]}</div>
              <div class="emily-header-text">
                <h3>${widgetSettings.websiteName}</h3>
                <p>${widgetSettings.widgetSubtitle}</p>
              </div>
            </div>
            <button class="emily-close" onclick="window.EmilyChat.toggle()">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          
          <div class="emily-messages" id="emily-messages">
            <div class="emily-welcome">
              <div class="emily-welcome-avatar">${widgetSettings.websiteName[0]}</div>
              <h4>${widgetSettings.widgetWelcomeTitle}</h4>
              <p>${widgetSettings.widgetWelcomeMessage}</p>
            </div>
          </div>

          <div class="emily-input-container">
            <form class="emily-input-form" onsubmit="window.EmilyChat.sendMessage(event)">
              <input 
                type="text" 
                class="emily-input" 
                id="emily-input"
                placeholder="Type your message..."
                autocomplete="off"
              />
              <button type="submit" class="emily-send" id="emily-send">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                </svg>
              </button>
            </form>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(widget);
  }

  // Toggle widget
  function toggle() {
    const container = document.querySelector('.emily-chat-container');
    const wasOpen = container.classList.contains('open');
    container.classList.toggle('open');
    
    // Load conversations when opening
    if (!wasOpen) {
      showConversationsList();
      loadConversations();
    }
  }

  // Show conversations list view
  function showConversationsList() {
    document.querySelector('.emily-conversations-view').style.display = 'flex';
    document.querySelector('.emily-chat-view').style.display = 'none';
    conversationId = null; // Reset conversation
  }

  // Show chat view
  function showChatView() {
    document.querySelector('.emily-conversations-view').style.display = 'none';
    document.querySelector('.emily-chat-view').style.display = 'flex';
  }

  // Back to conversation list
  function backToList() {
    showConversationsList();
    loadConversations();
  }

  // Start new conversation
  function startNewConversation() {
    conversationId = null;
    const messagesContainer = document.getElementById('emily-messages');
    messagesContainer.innerHTML = `
      <div class="emily-welcome">
        <div class="emily-welcome-avatar">${widgetSettings.websiteName[0]}</div>
        <h4>${widgetSettings.widgetWelcomeTitle}</h4>
        <p>${widgetSettings.widgetWelcomeMessage}</p>
      </div>
    `;
    showChatView();
    setupKeyboardHandling();
    document.getElementById('emily-input').focus();
  }

  // Load conversations from API
  async function loadConversations() {
    const listContainer = document.getElementById('emily-conversations-list');
    listContainer.innerHTML = '<div class="emily-loading">Loading conversations...</div>';

    try {
      const response = await fetch(`${API_BASE}/api/widget/conversations?websiteId=${websiteId}&visitorId=${visitorId}`);
      
      if (!response.ok) {
        throw new Error('Failed to load conversations');
      }

      const data = await response.json();
      const conversations = data.conversations || [];

      if (conversations.length === 0) {
        listContainer.innerHTML = `
          <div class="emily-no-conversations">
            <p>No conversations yet.</p>
            <p style="font-size:12px;margin-top:8px;">Click below to start chatting!</p>
          </div>
        `;
        return;
      }

      listContainer.innerHTML = '';
      conversations.forEach(conv => {
        const item = document.createElement('div');
        item.className = 'emily-conversation-item';
        item.onclick = () => openConversation(conv.id);
        
        const date = new Date(conv.updated_at || conv.created_at);
        const timeAgo = formatTimeAgo(date);
        
        // Truncate message if too long
        const preview = conv.firstMessage || 'New conversation';
        const truncated = preview.length > 60 ? preview.substring(0, 60) + '...' : preview;
        
        item.innerHTML = `
          <div class="emily-conversation-time">${timeAgo}</div>
          <div class="emily-conversation-preview">${truncated}</div>
        `;
        listContainer.appendChild(item);
      });
    } catch (error) {
      console.error('Emily Chat: Failed to load conversations', error);
      listContainer.innerHTML = '<div class="emily-loading">Failed to load conversations</div>';
    }
  }

  // Open existing conversation
  async function openConversation(convId) {
    conversationId = convId;
    const messagesContainer = document.getElementById('emily-messages');
    messagesContainer.innerHTML = '<div class="emily-loading">Loading messages...</div>';
    showChatView();

    // Unsubscribe from previous conversation
    unsubscribeFromMessages();

    try {
      const response = await fetch(`${API_BASE}/api/widget/conversation/messages?conversationId=${convId}`);
      
      if (!response.ok) {
        throw new Error('Failed to load messages');
      }

      const data = await response.json();
      const messages = data.messages || [];

      messagesContainer.innerHTML = '';
      
      // Clear the displayedMessageIds Set for this conversation
      displayedMessageIds.clear();
      
      if (messages.length === 0) {
        messagesContainer.innerHTML = `
          <div class="emily-welcome">
            <div class="emily-welcome-avatar">${widgetSettings.websiteName[0]}</div>
            <h4>${widgetSettings.widgetWelcomeTitle}</h4>
            <p>${widgetSettings.widgetWelcomeMessage}</p>
          </div>
        `;
      } else {
        messages.forEach(msg => {
          const messageDiv = document.createElement('div');
          messageDiv.className = `emily-message ${msg.sender}`;
          messageDiv.dataset.messageId = msg.id;
          messageDiv.innerHTML = `<div class="emily-message-content">${msg.content}</div>`;
          messagesContainer.appendChild(messageDiv);
          
          // Add to displayedMessageIds Set
          displayedMessageIds.add(msg.id);
        });
      }
      
      scrollMessagesToBottom();
      setupKeyboardHandling();
      document.getElementById('emily-input').focus();

      // Subscribe to real-time updates for this conversation
      subscribeToMessages(convId);
    } catch (error) {
      console.error('Emily Chat: Failed to load messages', error);
      messagesContainer.innerHTML = '<div class="emily-loading">Failed to load messages</div>';
    }
  }

  // Initialize Supabase client
  function initSupabase() {
    console.log('Emily Chat: initSupabase called');
    console.log('Emily Chat: window.supabase available?', !!window.supabase);
    
    if (!window.supabase) {
      console.error('Emily Chat: Supabase client library not loaded');
      console.error('Emily Chat: Make sure you are using emily-loader.js which loads the Supabase library');
      return null;
    }
    if (!supabaseClient) {
      console.log('Emily Chat: Creating Supabase client with URL:', SUPABASE_URL);
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log('Emily Chat: Supabase client initialized', supabaseClient);
    }
    return supabaseClient;
  }

  // Subscribe to real-time message updates
  function subscribeToMessages(convId) {
    console.log('Emily Chat: subscribeToMessages called with convId:', convId);
    const client = initSupabase();
    if (!client) {
      console.error('Emily Chat: Cannot subscribe - Supabase client not initialized');
      return;
    }

    // Unsubscribe from previous channel if exists
    unsubscribeFromMessages();

    console.log('Emily Chat: Subscribing to messages for conversation', convId);

    realtimeChannel = client
      .channel(`conversation:${convId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${convId}`
      }, (payload) => {
        console.log('Emily Chat: New message received via realtime', payload.new.id);
        handleRealtimeMessage(payload.new);
      })
      .subscribe((status) => {
        console.log('Emily Chat: Real-time subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Emily Chat: ✅ Successfully subscribed to conversation:', convId);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Emily Chat: ❌ Channel error - real-time subscription failed');
        } else if (status === 'TIMED_OUT') {
          console.error('Emily Chat: ❌ Subscription timed out');
        }
      });
    
    console.log('Emily Chat: Subscription setup complete, channel:', realtimeChannel);
  }

  // Unsubscribe from real-time updates
  function unsubscribeFromMessages() {
    if (realtimeChannel) {
      console.log('Emily Chat: Unsubscribing from real-time updates');
      supabaseClient.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
  }

  // Handle real-time message
  function handleRealtimeMessage(message) {
    // Check if we've already processed this message ID
    if (displayedMessageIds.has(message.id)) {
      console.log('Emily Chat: Message already displayed, skipping:', message.id);
      return;
    }
    
    const messagesContainer = document.getElementById('emily-messages');
    
    // Look for temp messages of the SAME sender type only
    // We want to find the MOST RECENT temp message for this sender
    const tempMessages = messagesContainer.querySelectorAll(`.emily-message.${message.sender}`);
    let mostRecentTempMessage = null;
    let mostRecentTempTimestamp = 0;
    
    tempMessages.forEach(el => {
      const existingId = el.dataset.messageId;
      // Only consider temp messages of the same sender
      if (existingId && existingId.startsWith(`temp-${message.sender}-`)) {
        // Extract timestamp from temp-{sender}-{timestamp}
        const parts = existingId.split('-');
        const timestamp = parseInt(parts[parts.length - 1]);
        if (timestamp > mostRecentTempTimestamp) {
          mostRecentTempTimestamp = timestamp;
          mostRecentTempMessage = el;
        }
      }
    });
    
    // Remove most recent temp message if exists
    if (mostRecentTempMessage) {
      console.log('Emily Chat: Removing temp message:', mostRecentTempMessage.dataset.messageId);
      // Remove from Set before removing from DOM
      const tempId = mostRecentTempMessage.dataset.messageId;
      if (tempId) {
        displayedMessageIds.delete(tempId);
      }
      mostRecentTempMessage.remove();
    }
    
    // Add the real message ID to our tracking Set
    displayedMessageIds.add(message.id);
    
    // Add the real message to the DOM
    const messageDiv = document.createElement('div');
    messageDiv.className = `emily-message ${message.sender}`;
    messageDiv.dataset.messageId = message.id;
    messageDiv.innerHTML = `<div class="emily-message-content">${message.content}</div>`;
    messagesContainer.appendChild(messageDiv);
    
    console.log('Emily Chat: Added message via realtime:', message.id);
    scrollMessagesToBottom();
  }

  // Format time ago
  function formatTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
  }

  // Create conversation
  async function createConversation() {
    if (conversationId) return conversationId;

    try {
      const response = await fetch(`${API_BASE}/api/websites/${websiteId}/conversations/create`, {
        credentials: 'include'
      });
      
      if (response.redirected) {
        const url = new URL(response.url);
        const pathParts = url.pathname.split('/');
        conversationId = pathParts[pathParts.length - 1];
        return conversationId;
      }
    } catch (error) {
      console.error('Emily Chat: Failed to create conversation', error);
    }
    return null;
  }

  // Add message to UI
  function addMessage(content, sender, messageId) {
    const messagesContainer = document.getElementById('emily-messages');
    const welcome = messagesContainer.querySelector('.emily-welcome');
    if (welcome) welcome.remove();

    const messageDiv = document.createElement('div');
    messageDiv.className = `emily-message ${sender}`;
    if (messageId) {
      messageDiv.dataset.messageId = messageId;
      // Add to displayedMessageIds Set
      displayedMessageIds.add(messageId);
    }
    messageDiv.innerHTML = `
      <div class="emily-message-content">${content}</div>
    `;
    messagesContainer.appendChild(messageDiv);
    scrollMessagesToBottom();
  }

  // Show typing indicator
  function showTyping() {
    const messagesContainer = document.getElementById('emily-messages');
    const typing = document.createElement('div');
    typing.className = 'emily-message assistant';
    typing.id = 'emily-typing';
    typing.innerHTML = `
      <div class="emily-typing">
        <span></span>
        <span></span>
        <span></span>
      </div>
    `;
    messagesContainer.appendChild(typing);
    scrollMessagesToBottom();
  }

  // Remove typing indicator
  function hideTyping() {
    const typing = document.getElementById('emily-typing');
    if (typing) typing.remove();
  }

  // Send message
  async function sendMessage(event) {
    event.preventDefault();
    
    const callId = Date.now() + '-' + Math.random().toString(36).substr(2, 5);
    console.log(`🟢 Emily Chat: sendMessage CALLED [${callId}]`);
    
    const input = document.getElementById('emily-input');
    const sendButton = document.getElementById('emily-send');
    const message = input.value.trim();
    
    if (!message) {
      console.log(`🟡 Emily Chat: Empty message, returning [${callId}]`);
      return;
    }

    console.log(`🔵 Emily Chat: Sending message "${message}" [${callId}]`);

    // Disable input
    input.disabled = true;
    sendButton.disabled = true;

    // Add user message with temp ID for deduplication
    const tempUserId = 'temp-user-' + Date.now();
    addMessage(message, 'user', tempUserId);
    input.value = '';

    // Show typing
    showTyping();

    try {
      console.log('Emily Chat: Calling API', `${API_BASE}/api/widget/messages`);
      const response = await fetch(`${API_BASE}/api/widget/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          websiteId: websiteId,
          content: message,
          conversationId: conversationId,
          visitorId: visitorId
        })
      });

      console.log('Emily Chat: Response status', response.status);

      if (!response.ok) {
        hideTyping();
        const errorData = await response.json().catch(() => ({}));
        console.error('Emily Chat: API error', errorData);
        throw new Error(errorData.error || 'Failed to send message');
      }

      // All responses are now JSON (no streaming)
      hideTyping();
      const data = await response.json();
      
      let isNewConversation = false;
      if (data.conversationId) {
        isNewConversation = !conversationId;
        conversationId = data.conversationId;
        console.log('Emily Chat: Conversation ID set to', conversationId);
        
        // Subscribe to real-time updates for new conversation
        if (isNewConversation) {
          subscribeToMessages(conversationId);
          
          // CRITICAL: Fetch messages from DB after subscribing
          // This ensures we get any messages that were saved before subscription was active
          // (like the first AI response which is saved before we subscribe)
          console.log('Emily Chat: Fetching messages after new subscription to sync DB state');
          await loadMessagesFromConversation(conversationId);
        }
      }
      
      // DO NOT display AI response as temp for new conversations
      // It will be loaded from DB in loadMessagesFromConversation above
      // Only show temp for existing conversations where subscription is already active
      if (data.response && !isNewConversation) {
        addMessage(data.response, 'assistant', 'temp-assistant-' + Date.now());
      }
      
      console.log('Emily Chat: Message sent successfully');

    } catch (error) {
      console.error('Emily Chat: Send error', error);
      hideTyping();
      addMessage('Sorry, I encountered an error. Please try again.', 'assistant');
    }

    // Re-enable input
    input.disabled = false;
    sendButton.disabled = false;
    input.focus();
  }

  // Expose API
  window.EmilyChat = {
    ...config,
    toggle,
    sendMessage,
    backToList,
    startNewConversation
  };

  // Initialize
  console.log('Emily Chat: Initializing widget for', websiteId);
  fetchWidgetSettings().then((success) => {
    if (success) {
      console.log('Emily Chat: Creating widget with style', widgetSettings.widgetStyle);
      createWidget();
    }
  });

})();
