# Emily Chat Platform - Setup Guide

Complete guide to set up and run the Emily Chat Platform.

## Prerequisites

- Node.js 18+ installed
- npm or yarn
- Supabase account (free tier works)
- Qdrant server (you have one at http://172.232.46.233:6333)
- OpenAI API account
- Stripe account (for payments)

## Step 1: Clone and Install Dependencies

```bash
cd talktoemily
npm install
```

## Step 2: Set Up Supabase

### 2.1 Create a Supabase Project

1. Go to https://supabase.com
2. Create a new project
3. Wait for it to initialize (takes ~2 minutes)
4. Go to Project Settings > API
5. Copy the following:
   - Project URL
   - `anon` public key
   - `service_role` key (keep this secret!)

### 2.2 Run Database Migrations

1. Open Supabase SQL Editor
2. Run the migrations in order:
   - First: `database/migrations/001_initial_schema.sql`
   - Second: `database/migrations/002_rls_policies.sql`
3. Verify tables were created in the Table Editor

## Step 3: Configure Environment Variables

Create `.env.local` file in the root directory:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Qdrant (your existing server)
QDRANT_URL=http://172.232.46.233:6333

# OpenAI
OPENAI_API_KEY=sk-your-openai-key

# Stripe
STRIPE_SECRET_KEY=sk_test_your_stripe_secret
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Getting API Keys

**OpenAI:**
1. Go to https://platform.openai.com/api-keys
2. Create a new secret key
3. Copy and save it (you can't see it again!)

**Stripe:**
1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy your test keys (use test mode for development)
3. Webhook secret comes from webhook setup (see Step 4)

## Step 4: Configure Stripe

### 4.1 Create Products

1. Go to Stripe Dashboard > Products
2. Create a product:
   - Name: "Emily Pro"
   - Pricing: $29/month (recurring)
   - Copy the Price ID (starts with `price_`)

### 4.2 Enable Stripe Tax

1. Go to Stripe Dashboard > Settings > Tax
2. Enable automatic tax calculation
3. Configure tax settings for your region

### 4.3 Set Up Webhooks (for production)

1. Go to Stripe Dashboard > Developers > Webhooks
2. Add endpoint: `https://yourdomain.com/api/stripe/webhook`
3. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `charge.succeeded`
4. Copy the webhook signing secret

For local testing, use Stripe CLI:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## Step 5: Test Qdrant Connection

```bash
curl http://172.232.46.233:6333/collections
```

Should return JSON with collections list.

## Step 6: Run the Development Server

```bash
npm run dev
```

Open http://localhost:3000

## Step 7: Test the Application

### 7.1 Create an Account

1. Go to http://localhost:3000
2. Click "Get Started Free"
3. Fill in the signup form
4. Check that user and organization were created in Supabase

### 7.2 Create a Website

1. Click "Add Website" on dashboard
2. Fill in details (domain, name, color)
3. Website should appear on dashboard

### 7.3 Add Training Content

1. Click on your website
2. Go to Training tab
3. Add a training item:
   - Title: "About Us"
   - Content: "We are Emily, an AI chat platform..."
4. Test voice recording (requires microphone permission)
5. Click "Train Chatbot"
6. Wait for training to complete (~30 seconds)
7. Check Qdrant: `curl http://172.232.46.233:6333/collections`
   - Should see a collection named `website_{your-website-id}`

### 7.4 Test Chat

1. Go to Conversations tab
2. Click "New Chat"
3. Send a message related to your training content
4. AI should respond using the trained knowledge

### 7.5 Test the Widget

1. Go to your website detail page
2. Copy the embed code
3. Create a test HTML file:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Widget Test</title>
</head>
<body>
  <h1>Test Page</h1>
  
  <!-- Paste embed code here -->
  <script>
    window.EmilyChat = { websiteId: "your-website-id" };
  </script>
  <script src="http://localhost:3000/widget/emily-chat.js"></script>
</body>
</html>
```

4. Open in browser
5. Click the chat bubble
6. Test conversation

## Step 8: Deployment to Vercel

### 8.1 Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/talktoemily.git
git push -u origin main
```

### 8.2 Deploy to Vercel

1. Go to https://vercel.com
2. Import your GitHub repository
3. Configure project:
   - Framework Preset: Next.js
   - Root Directory: ./
   - Build Command: `npm run build`
   - Output Directory: `.next`

### 8.3 Add Environment Variables

In Vercel dashboard, add all environment variables from `.env.local`

**Important:** Update these for production:
- `NEXT_PUBLIC_APP_URL` → Your Vercel domain
- Use Stripe live keys (not test keys)
- Update Stripe webhook endpoint to production URL

### 8.4 Update Stripe Webhook

1. Go to Stripe Dashboard > Webhooks
2. Add production endpoint: `https://yourdomain.vercel.app/api/stripe/webhook`
3. Copy webhook secret
4. Update `STRIPE_WEBHOOK_SECRET` in Vercel

### 8.5 Test Production

1. Visit your Vercel domain
2. Create account and website
3. Train chatbot
4. Test conversations
5. Test widget on external site

## Troubleshooting

### Supabase Connection Issues

- Check API keys are correct
- Verify RLS policies are set up
- Check Supabase dashboard for errors

### Qdrant Issues

- Verify Qdrant is accessible: `curl http://172.232.46.233:6333`
- Check firewall rules allow connections
- Ensure collections are being created

### OpenAI Issues

- Check API key is valid
- Verify you have credits in OpenAI account
- Check rate limits

### Stripe Issues

- Use test mode keys for development
- Verify webhook endpoint is accessible
- Check webhook events are selected
- Use Stripe CLI for local testing

### Training Fails

- Check training items exist
- Verify OpenAI embeddings are working
- Check Qdrant connection
- Look at training_runs table for error messages

### Widget Not Loading

- Check CORS headers on widget API routes
- Verify website ID is correct
- Check browser console for errors
- Ensure website is trained

## Next Steps

1. **Customize branding:**
   - Update colors in `app/globals.css`
   - Add your logo
   - Customize widget appearance

2. **Add monitoring:**
   - Set up error tracking (Sentry)
   - Add analytics (PostHog, etc.)
   - Monitor API usage

3. **Set up backups:**
   - Enable Supabase automated backups
   - Back up Qdrant collections
   - Export configuration

4. **Implement Wonder George integration:**
   - Replace placeholder functions in `lib/integrations/wg-api.ts`
   - Add real API endpoints
   - Test subscription linking

## Support

For issues:
1. Check browser console for errors
2. Check Supabase logs
3. Check Vercel function logs
4. Review this setup guide
5. Check README.md for additional info

## Security Checklist

Before going live:
- [ ] All environment variables use production values
- [ ] Supabase RLS policies are enabled
- [ ] Stripe is in live mode
- [ ] API keys are kept secret
- [ ] CORS is properly configured
- [ ] Rate limiting is implemented
- [ ] Database backups are enabled
- [ ] SSL/HTTPS is enabled
- [ ] Error logging is set up
- [ ] Usage limits are tested

## Cost Estimates

### Monthly costs (approximate):

- **Supabase:** Free tier (up to 500MB database)
- **Qdrant:** Your server (already running)
- **OpenAI:**
  - Embeddings: ~$0.0001 per 1K tokens
  - GPT-4o-mini: ~$0.15 per 1M input tokens
  - Whisper: ~$0.006 per minute
- **Stripe:** 2.9% + $0.30 per transaction
- **Vercel:** Free tier (hobby plan)

Example for 1000 messages/month:
- Embeddings: ~$0.50
- Chat completions: ~$5
- Total: ~$5-10/month

---

**Congratulations!** You now have a fully functional AI chat platform. 🎉
