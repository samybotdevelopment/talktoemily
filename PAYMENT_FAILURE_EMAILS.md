# Payment Failure Email System

## Overview
When a subscription payment fails, Stripe automatically retries the payment over ~7 days. Our system sends contextual emails to customers for each retry attempt.

## Email Flow

### Attempt 1 (Day 0 - 7 days remaining)
**Subject:** "Oops! We couldn't process your payment"
**Tone:** Casual, understanding, not urgent
**Content:** 
- Inform about the failed payment
- Mention automatic retries
- Provide link to update payment method
- Friendly sign-off

### Attempt 2-3 (Days 3-5 - 4-2 days remaining)
**Subject:** "Quick reminder: Payment still pending"
**Tone:** Friendly but slightly more urgent
**Content:**
- Reminder that payment is still failing
- Show attempt number
- Emphasize time remaining
- Encourage action

### Attempt 4+ (Day 7+ - 0 days remaining)
**Subject:** "⚠️ Urgent: Please update your payment details"
**Tone:** Urgent but still friendly
**Content:**
- Strong urgency about multiple failed attempts
- Warn about imminent subscription cancellation
- Explain consequences (bot deactivation)
- Strong call-to-action

## Technical Implementation

### Webhook Event
- **Event Type:** `invoice.payment_failed`
- **Trigger:** Each time Stripe retries and payment fails
- **Data Used:**
  - `customer`: Stripe customer ID
  - `attempt_count`: Current retry attempt number

### Email Service
- **Provider:** Mailjet
- **Sender:** emily@talktoemily.com
- **Format:** Plain text (conversational tone)

### Days Remaining Calculation
```
Day 0: Attempt 1 (7 days remaining)
Day 3: Attempt 2 (4 days remaining)
Day 5: Attempt 3 (2 days remaining)
Day 7: Attempt 4 (0 days remaining)
```

Formula: `daysRemaining = max(0, 7 - floor((attemptCount - 1) * 2.5))`

## Environment Variables Required
```
MAILJET_API_KEY=your_api_key
MAILJET_API_SECRET=your_api_secret
NEXT_PUBLIC_APP_URL=https://talktoemily.com
```

## Testing

### Local Testing (with test script)
```bash
# Start dev server
npm run dev

# In another terminal, run test script
node test-payment-failure.js
```

This will simulate 4 payment failure attempts and send test emails.

### Production Testing (with Stripe CLI)
```bash
# Trigger a test payment failure event
stripe trigger invoice.payment_failed
```

## What Happens After

1. **Email sent** to customer with contextual message
2. Customer clicks link → redirected to Stripe Customer Portal
3. Customer updates payment method
4. Stripe automatically retries
5. If successful: No further action needed
6. If all retries fail: Subscription cancelled (handled by `customer.subscription.deleted` webhook)

## Monitoring
Check logs for:
- `💳 Payment failed for customer X, attempt Y`
- `✅ Payment failure email sent to user@example.com (attempt Y)`
- `❌ Failed to send payment failure email` (if email service fails)




