-- Add last_trained_at timestamp to websites table

ALTER TABLE public.websites
ADD COLUMN IF NOT EXISTS last_trained_at TIMESTAMPTZ;

COMMENT ON COLUMN public.websites.last_trained_at IS 'Timestamp of the last training completion';
