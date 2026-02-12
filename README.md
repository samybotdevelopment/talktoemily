# Emily Chat Platform

A standalone SaaS chat platform for website owners to create AI-powered chatbots trained on their content.

## Features

- **AI-Powered Chat**: RAG-based chat system using OpenAI GPT-5-nano and Qdrant vector database
- **Real-time Updates**: WebSocket-based push notifications (no polling!) via Supabase Real-time
- **Training System**: Manual text and voice-to-text training using Whisper API
- **Owner Assistant**: Internal chat assistant for website owners
- **Visitor Widget**: Embeddable Intercom-style chat widget for website visitors with instant messaging
- **Subscription Management**: Stripe-powered subscriptions with usage-based billing
- **Neo-Brutalist UI**: Modern, bold design for admin interfaces
- **Scalable Architecture**: Handles millions of concurrent users efficiently

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Auth**: Supabase Auth
- **Database**: Supabase Postgres
- **Real-time**: Supabase Real-time (WebSockets)
- **Vector DB**: Qdrant (self-hosted)
- **AI**: OpenAI (GPT-5-nano, Whisper, Embeddings)
- **Payments**: Stripe (Subscriptions + One-time payments)

## Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account with project
- Qdrant server (self-hosted or cloud)
- OpenAI API key
- Stripe account

## Setup Instructions

### 1. Clone and Install

```bash
cd talktoemily
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Qdrant
QDRANT_URL=http://172.232.46.233:6333

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Database Setup

Run migrations in Supabase SQL Editor in order:

```bash
# Navigate to database/migrations/
# Run each .sql file in numerical order
```

Files to run:
1. `001_initial_schema.sql` - Creates all tables and relationships
2. `002_rls_policies.sql` - Sets up Row Level Security

### 4. Qdrant Setup

Ensure your Qdrant server is running and accessible at the URL specified in `.env.local`.

Test connection:
```bash
curl http://172.232.46.233:6333/collections
```

### 5. Stripe Setup

1. Create products in Stripe Dashboard:
   - Pro Plan (monthly subscription)
   - AI Credits (one-time purchase)

2. Configure webhook endpoint:
   - URL: `https://yourdomain.com/api/stripe/webhook`
   - Events to listen for:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `charge.succeeded`

3. Copy webhook secret to `.env.local`

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
talktoemily/
├── app/                      # Next.js App Router pages
│   ├── auth/                # Authentication pages
│   ├── dashboard/           # Main dashboard
│   ├── websites/            # Website management
│   ├── settings/            # User/org settings
│   └── api/                 # API routes
├── components/              # React components
│   └── ui/                  # Reusable UI components
├── lib/                     # Core libraries
│   ├── supabase/           # Supabase clients
│   ├── services/           # External service integrations
│   ├── training/           # Training pipeline
│   ├── chat/               # Chat AI pipeline
│   ├── utils/              # Helper functions
│   └── integrations/       # Third-party integrations
├── types/                   # TypeScript type definitions
├── database/               # Database migrations
│   └── migrations/
├── public/                 # Static assets
│   └── widget/            # Chat widget files
└── docs/                  # Documentation
```

## Key Concepts

### Training System

- **Training Items**: Semantic chunks of content (title + content)
- **Training Runs**: Complete rebuild of Qdrant collection
- **Limits**: Free users get 1 training run (lifetime), Pro users get 4/month

### Chat System

- **Owner Assistant**: Internal chat for website owners about the platform
- **Visitor Widget**: Customer-facing chat embedded on websites
- **RAG Pipeline**: Embed query → Search Qdrant → Build context → LLM response

### Usage Limits

**Free Tier:**
- 1 training run (lifetime)
- 50 AI messages (lifetime)
- 1 website

**Pro Tier ($X/month):**
- 4 training runs per month
- Unlimited messages (with credits)
- 5 websites

## Deployment

### Vercel Deployment

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Post-Deployment

1. Update Stripe webhook URL to production domain
2. Update `NEXT_PUBLIC_APP_URL` environment variable
3. Test Supabase auth callbacks
4. Verify Qdrant connectivity

## Development Notes

### Core Principles (DO NOT VIOLATE)

- One chatbot = one website
- One website = one Qdrant collection
- Training always rebuilds entire collection (no partial updates)
- No frontend access to Qdrant (all vector operations server-side)
- All AI calls go through backend

### Training Flow

1. User edits training items (free)
2. User clicks "Train chatbot"
3. Backend validates quota
4. Backend embeds all items
5. Backend deletes old collection
6. Backend creates new collection
7. Backend inserts all vectors
8. Backend marks complete

### Chat Flow

1. User sends message
2. Embed user message
3. Search Qdrant (top 3-5)
4. Extract context
5. Build prompt with system message
6. Stream LLM response
7. Store message in DB
8. Increment usage

### Real-time Updates (Widget)

The visitor widget uses **Supabase Real-time (WebSockets)** for instant push notifications:

- **No polling**: Zero background requests after connection established
- **Instant delivery**: Messages appear immediately when you respond from backoffice
- **Scalable**: Handles millions of concurrent visitors efficiently
- **Cost-effective**: 95% cheaper than polling-based approaches

**Example**: With 100,000 concurrent visitors:
- **Old polling approach**: 50,000 requests/second = $2,000+/month
- **Real-time approach**: 100,000 WebSocket connections = ~$100/month

See `WIDGET_REALTIME_ARCHITECTURE.md` for detailed technical documentation.

## Testing

```bash
# Run type checking
npm run type-check

# Run linter
npm run lint

# Run tests (when implemented)
npm test

# Test widget
# Open test-widget.html in browser
```

## Support

For issues or questions, contact support@talktoemily.com

## License

Proprietary - All rights reserved
