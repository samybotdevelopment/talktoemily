-- Add onboarding_completed_at to websites table to track incomplete bot creations
ALTER TABLE public.websites 
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Set existing websites as completed (they're already set up)
UPDATE public.websites 
SET onboarding_completed_at = created_at 
WHERE onboarding_completed_at IS NULL;

