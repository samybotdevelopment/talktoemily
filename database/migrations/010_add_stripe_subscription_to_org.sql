-- Add Stripe subscription tracking fields to existing stripe_customers table
ALTER TABLE public.stripe_customers 
ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end BOOLEAN DEFAULT FALSE;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_stripe_customers_subscription_period_end 
ON public.stripe_customers(subscription_current_period_end)
WHERE subscription_current_period_end IS NOT NULL;

-- Add index on stripe_customer_id for reverse lookups from Stripe webhooks
CREATE INDEX IF NOT EXISTS idx_stripe_customers_stripe_customer_id 
ON public.stripe_customers(stripe_customer_id);

