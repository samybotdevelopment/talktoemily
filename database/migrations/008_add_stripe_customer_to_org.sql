-- Add stripe_customer_id to organizations table
-- This makes it easier to query without joins

ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer_id 
ON public.organizations(stripe_customer_id);

-- Optional: Migrate data from stripe_customers table if it exists
-- UPDATE public.organizations o
-- SET stripe_customer_id = sc.stripe_customer_id
-- FROM public.stripe_customers sc
-- WHERE o.id = sc.org_id;

