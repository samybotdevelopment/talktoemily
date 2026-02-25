-- Add bot behavior customization settings to websites table

ALTER TABLE public.websites
ADD COLUMN IF NOT EXISTS strict_context_only BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN IF NOT EXISTS speaking_style TEXT,
ADD COLUMN IF NOT EXISTS custom_rules TEXT;

-- Add comments
COMMENT ON COLUMN public.websites.strict_context_only IS 'If true, bot responds ONLY from provided context/documents';
COMMENT ON COLUMN public.websites.speaking_style IS 'Custom speaking style instructions (max 150 chars)';
COMMENT ON COLUMN public.websites.custom_rules IS 'Custom rules/guidelines for the bot (max 500 chars)';
