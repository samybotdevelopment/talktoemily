-- Add frozen_credits field to organizations table
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS frozen_credits INTEGER DEFAULT 0;

-- Add comment
COMMENT ON COLUMN public.organizations.frozen_credits IS 'Credits that are temporarily frozen when subscription expires. Restored when user resubscribes.';

-- Update existing records to have 0 frozen credits
UPDATE public.organizations 
SET frozen_credits = 0 
WHERE frozen_credits IS NULL;



