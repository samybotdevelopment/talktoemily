# Stripe Setup Guide for Emily Credits

This guide explains how to configure Stripe for the credit purchase system.

## Prerequisites

- Stripe account (test mode for development, live mode for production)
- Stripe CLI installed (optional, for local webhook testing)

## Step 1: Enable Stripe Tax

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Settings** → **Tax**
3. Click **"Enable automatic tax calculation"**
4. Configure your business address
5. Select regions where you need to collect taxes (EU VAT, US Sales Tax, etc.)

**Important**: This is required for the credit purchase flow to work properly.

## Step 2: Configure Stripe Customer Portal

1. Go to **Settings** → **Billing** → **Customer Portal**
2. Enable the portal
3. Configure what customers can do:
   - ✅ View invoices
   - ✅ Download invoices
   - ✅ Update payment methods
   - ✅ View payment history
4. Customize the portal appearance (optional):
   - Add your logo
   - Set brand colors
   - Add business information

## Step 3: Set Up Webhooks

### For Production:

1. Go to **Developers** → **Webhooks**
2. Click **"Add endpoint"**
3. Enter your webhook URL: `https://yourdomain.com/api/stripe/webhook`
4. Select events to listen for:
   - `checkout.session.completed` ⭐ (REQUIRED for credits)
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `charge.succeeded`
5. Copy the **Webhook signing secret** (starts with `whsec_`)
6. Add it to your production environment variables as `STRIPE_WEBHOOK_SECRET`

### For Local Development:

Install Stripe CLI:
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows
scoop install stripe

# Or download from: https://github.com/stripe/stripe-cli/releases
```

Run the webhook forwarder:
```bash
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

This will give you a webhook secret starting with `whsec_`. Add it to your `.env.local`:
```
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

## Step 4: Environment Variables

Add these to your `.env.local` (development) and production environment:

```bash
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx          # Test key for dev
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx    # Test key for dev
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx

# Webhook Secret (from Step 3)
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# App URL (for redirect URLs)
NEXT_PUBLIC_APP_URL=http://localhost:3000       # Change in production
```

**For Production**: Replace test keys (`sk_test_`, `pk_test_`) with live keys (`sk_live_`, `pk_live_`)

## How Credit Purchases Work

1. **User clicks "Purchase"** on credits page
2. **API creates Checkout Session** (`/api/stripe/checkout/credits`)
   - Uses dynamic price creation (no need to create products in Stripe Dashboard)
   - Includes credit amount in metadata
   - Automatic tax calculation enabled
3. **User redirects to Stripe Checkout**
   - Enters payment details
   - Stripe handles SCA, Apple Pay, Google Pay
4. **Payment succeeds** → `checkout.session.completed` webhook fires
5. **Webhook handler** (`/api/stripe/webhook`) adds credits to user's balance
6. **User redirects back** to credits page with success message

## Credit Packs (No Manual Setup Required)

The system automatically creates these packs dynamically:

| Pack | Credits | Price (EUR) | Per Message |
|------|---------|-------------|-------------|
| Starter | 500 | €9 | €0.018 |
| Growth | 5,000 | €49 | €0.0098 |
| Business | 50,000 | €299 | €0.00598 |

## Billing Portal

Users can access their invoices via:
- **Account Settings** → "View Billing History & Invoices"
- This opens the Stripe Customer Portal where they can:
  - View all past invoices
  - Download invoice PDFs (for taxes)
  - Update payment methods
  - See payment history

Invoices are automatically emailed by Stripe after each purchase.

## Testing Credit Purchases

### Test Cards (Test Mode Only):

| Card Number | Description |
|-------------|-------------|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0025 0000 3155` | Requires authentication (3D Secure) |
| `4000 0000 0000 9995` | Declined payment |

Use any future expiration date and any CVC.

### Test Flow:

1. Go to `http://localhost:3000/settings/credits`
2. Click "Purchase" on any pack
3. Enter test card: `4242 4242 4242 4242`
4. Complete checkout
5. Check webhook logs in terminal (if using Stripe CLI)
6. Verify credits added to account

## Troubleshooting

### Credits not added after purchase
- Check webhook is receiving `checkout.session.completed` events
- Verify `STRIPE_WEBHOOK_SECRET` is correct
- Check server logs for webhook processing errors

### Tax not calculating
- Ensure Stripe Tax is enabled in dashboard
- Verify `automatic_tax: { enabled: true }` in checkout session

### Portal not loading
- Ensure Customer Portal is enabled in Stripe Dashboard
- Check that `stripe_customer_id` is saved in organizations table

### Webhook signature verification failed
- Ensure you're using the correct webhook secret
- For local testing, use the secret from `stripe listen` command
- For production, use the secret from Stripe Dashboard webhook endpoint

## Production Checklist

Before going live:

- [ ] Switch to **live mode** in Stripe Dashboard
- [ ] Update environment variables with **live keys**
- [ ] Set up **production webhook endpoint**
- [ ] Enable **Stripe Tax** in live mode
- [ ] Configure **Customer Portal** in live mode
- [ ] Test a real credit purchase in production (you can refund it)
- [ ] Verify invoices are emailed correctly
- [ ] Test billing portal access

## Support

If issues persist:
- Check Stripe Dashboard → **Developers** → **Logs** for API errors
- Check Stripe Dashboard → **Developers** → **Events** for webhook delivery
- Contact Stripe Support via dashboard

