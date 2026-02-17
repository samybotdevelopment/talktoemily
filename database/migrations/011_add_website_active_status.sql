-- Add is_active field to websites table for bot activation/deactivation
ALTER TABLE public.websites 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_websites_is_active 
ON public.websites(is_active);

-- Add comment
COMMENT ON COLUMN public.websites.is_active IS 'Whether the bot is active. Inactive bots do not respond to widget requests.';





