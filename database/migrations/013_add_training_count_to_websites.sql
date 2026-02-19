-- Migration: Add training_count to websites table
-- Description: Track the number of times a bot has been trained (first training is free)

-- Add training_count field (default 0)
ALTER TABLE public.websites
ADD COLUMN IF NOT EXISTS training_count INTEGER DEFAULT 0;

-- Update existing websites to have training_count based on existing training runs
UPDATE public.websites w
SET training_count = (
  SELECT COUNT(*)
  FROM public.training_runs tr
  WHERE tr.website_id = w.id
    AND tr.status = 'completed'
);








