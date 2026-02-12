# Emily Chat Widget - Real-time Architecture

## Overview

The Emily chat widget uses **Supabase Real-time** (WebSockets) for instant push updates, eliminating the need for polling and enabling scalable, real-time communication.

## Architecture

### No More Polling! 🎉

**Old Approach (Polling):**
- ❌ Client checks for new messages every 2-3 seconds
- ❌ 100,000 visitors = 50,000 requests/second
- ❌ Massive infrastructure costs
- ❌ Delayed message delivery
- ❌ High server load

**New Approach (Real-time WebSockets):**
- ✅ 1 persistent WebSocket connection per visitor
- ✅ 100,000 visitors = 100,000 WebSocket connections (handled by Supabase)
- ✅ **0 polling requests**
- ✅ Instant message delivery
- ✅ Minimal bandwidth usage
- ✅ Scales to millions of users

## How It Works

### 1. Widget Initialization

When a visitor opens your website:

```javascript
// Widget loads in two steps:
// 1. emily-loader.js loads Supabase library from CDN
// 2. emily-chat.js initializes the widget

<script>
  window.EmilyChat = { websiteId: "your-website-id" };
</script>
<script src="https://talktoemily.com/widget/emily-loader.js"></script>
```

### 2. Visitor Identification

Each visitor gets a unique ID stored in `localStorage`:

```javascript
const visitorId = 'visitor_1234567890_abc123';
localStorage.setItem(`emily_visitor_${websiteId}`, visitorId);
```

This allows:
- Conversation continuity across page reloads
- Multiple conversations per visitor
- Conversation history

### 3. Real-time Subscription

When a conversation starts (existing or new), the widget subscribes to real-time updates:

```javascript
// Subscribe to new messages for this conversation
supabase
  .channel(`conversation:${conversationId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `conversation_id=eq.${conversationId}`
  }, (payload) => {
    // New message received - display instantly!
    displayMessage(payload.new);
  })
  .subscribe();
```

### 4. Message Flow

#### Visitor Sends Message:
1. Visitor types message and clicks send
2. Widget sends message via REST API to `/api/widget/messages`
3. Message saved to database
4. If AI is active:
   - AI response streams back in real-time
   - Widget displays streaming response character-by-character
5. If AI is paused:
   - Message saved, no AI response
   - Widget waits for manual response via WebSocket

#### You (Backoffice Owner) Respond Manually:
1. You type response in backoffice
2. Message saved to database
3. **Supabase Real-time broadcasts the INSERT event**
4. **Visitor's widget receives message instantly via WebSocket**
5. Message appears in visitor's chat window immediately

## Benefits

### For You (Website Owner):
- **Real-time oversight**: See visitor messages instantly in backoffice
- **Manual intervention**: Pause AI and respond personally when needed
- **Seamless handoff**: Switch between AI and manual responses mid-conversation
- **No lag**: Your responses appear instantly on visitor's screen

### For Your Visitors:
- **Instant responses**: No waiting for polling intervals
- **Smooth experience**: Streaming AI responses
- **Persistent conversations**: Continue chat across page reloads
- **Mobile-friendly**: Works perfectly on all devices

### For Infrastructure:
- **Scalable**: Supabase handles WebSocket infrastructure
- **Cost-effective**: Pay per connection, not per request
- **Low latency**: Direct WebSocket communication
- **Reliable**: Automatic reconnection on network issues

## Technical Implementation

### Widget Components

1. **emily-loader.js** (Entry point)
   - Loads Supabase client library from CDN
   - Loads main widget script after dependencies ready

2. **emily-chat.js** (Main widget)
   - Creates UI (bubble, chat window, conversation list)
   - Manages Supabase real-time subscriptions
   - Handles message sending/receiving
   - Manages visitor ID and conversation state

### API Endpoints

1. **GET /api/widget/init**
   - Returns widget settings (name, color, style, messages)
   - Public endpoint (no auth required)

2. **POST /api/widget/messages**
   - Saves visitor message
   - Checks AI mode (auto/paused)
   - Returns streaming AI response OR JSON success
   - Public endpoint (uses visitor ID)

3. **GET /api/widget/conversations**
   - Returns list of visitor's conversations
   - Public endpoint (filtered by visitor ID)

4. **GET /api/widget/conversation/messages**
   - Returns messages for a specific conversation
   - Public endpoint (visitor can only access their own)

### Database Tables

- **conversations**: Each chat session
  - `id`, `website_id`, `visitor_id`, `ai_mode`, `created_at`, `updated_at`
  
- **messages**: Individual messages
  - `id`, `conversation_id`, `content`, `sender` ('user'/'assistant'), `created_at`
  
- **websites**: Your chatbot configuration
  - `id`, `name`, `domain`, `primary_color`, `widget_style`, custom messages

### Real-time Triggers

When a new message is inserted into the `messages` table:
1. Postgres INSERT happens
2. Supabase Real-time detects the change
3. All subscribed clients receive the event
4. Widget filters and displays relevant messages

## Scaling Considerations

### Current Setup (Excellent for 0-100K users):
- Supabase Real-time (included in their infrastructure)
- Single Postgres database
- Qdrant vector DB for embeddings

### If You Reach Millions of Users:
- Supabase scales WebSocket connections automatically
- Consider read replicas for database
- Consider CDN for widget JavaScript files
- Supabase handles all WebSocket complexity

### Cost Comparison (100,000 concurrent visitors):

**Polling Approach:**
- 50,000 requests/second = 4.3 billion requests/day
- Estimated cost: **$2,000+/month** (just for database queries)

**Real-time Approach:**
- 100,000 WebSocket connections
- Estimated cost: **Included in Supabase plan** or ~$100/month
- **95% cost reduction!**

## Security

### Public Widget Endpoints
- Widget endpoints are public (no auth token required)
- Visitor ID provides conversation isolation
- RLS (Row Level Security) policies prevent cross-visitor access
- No sensitive data exposed in widget

### Private Backoffice
- All backoffice routes require authentication
- Service role bypasses RLS for admin operations
- Stripe webhooks verify signatures
- API keys stored in environment variables

## Monitoring

### What to Watch:
- Active WebSocket connections (Supabase dashboard)
- Message insertion rate (conversations/second)
- API response times
- Qdrant search latency
- OpenAI API usage

### Alerts to Set:
- WebSocket connection failures
- Database connection pool exhaustion
- High API error rates
- Stripe webhook failures

## Future Enhancements

### Possible Additions:
1. **Read receipts**: Show when visitor sees your message
2. **Typing indicators**: "Emily is typing..."
3. **File uploads**: Let visitors share images/documents
4. **Rich messages**: Buttons, quick replies, cards
5. **Multi-language**: Auto-detect and translate
6. **Voice messages**: Record and transcribe audio
7. **Video calls**: Escalate to live video chat
8. **Sentiment analysis**: Detect frustrated visitors
9. **Smart routing**: Route to specific team members
10. **Chatbot analytics**: Track response quality

## Troubleshooting

### Widget Not Connecting?
1. Check browser console for errors
2. Verify Supabase URL/key in widget config
3. Check CORS settings on API endpoints
4. Ensure WebSocket ports not blocked by firewall

### Messages Not Appearing?
1. Check database - is message saved?
2. Check Supabase real-time logs
3. Verify conversation ID matches
4. Check browser network tab for WebSocket connection

### High Latency?
1. Check Qdrant response time
2. Check OpenAI API latency
3. Verify database query performance
4. Check server location vs user location

## Summary

The Emily widget uses modern real-time technology to provide:
- ⚡ **Instant updates** (no polling!)
- 📈 **Infinite scale** (Supabase handles it)
- 💰 **Low cost** (95% cheaper than polling)
- 🎯 **Better UX** (seamless real-time chat)

Your visitors get a smooth, instant chat experience, and you get a scalable, cost-effective solution that works at any scale.

**Key Takeaway**: With WebSockets, 100,000 concurrent visitors costs less than 1,000 with polling!
