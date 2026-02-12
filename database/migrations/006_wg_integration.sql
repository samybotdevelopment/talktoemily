-- Wonder George Integration Migration
-- Add WG-specific fields for onboarding and widget activation

-- Add Wonder George integration fields to organizations
ALTER TABLE public.organizations
ADD COLUMN wg_user_id TEXT,
ADD COLUMN wg_plan TEXT CHECK (wg_plan IN ('free', 'essential', 'entrepreneur', 'agency'));

-- Add index for WG user lookups
CREATE INDEX IF NOT EXISTS idx_organizations_wg_user_id 
  ON public.organizations(wg_user_id);

-- Add onboarding completion tracking
ALTER TABLE public.organizations
ADD COLUMN onboarding_completed_at TIMESTAMPTZ;

-- Add widget activation tracking to websites
ALTER TABLE public.websites
ADD COLUMN widget_activated BOOLEAN DEFAULT FALSE,
ADD COLUMN wg_website_id TEXT,
ADD COLUMN widget_activated_at TIMESTAMPTZ;

-- Add index for WG website lookups
CREATE INDEX IF NOT EXISTS idx_websites_wg_website_id 
  ON public.websites(wg_website_id);

-- Comments for documentation
COMMENT ON COLUMN public.organizations.wg_user_id IS 'Wonder George user ID if linked to WG account';
COMMENT ON COLUMN public.organizations.wg_plan IS 'Wonder George subscription plan type';
COMMENT ON COLUMN public.organizations.onboarding_completed_at IS 'Timestamp when WG customer completed onboarding wizard';
COMMENT ON COLUMN public.websites.widget_activated IS 'Whether widget is activated on WG website';
COMMENT ON COLUMN public.websites.wg_website_id IS 'Wonder George website ID for API integration';
COMMENT ON COLUMN public.websites.widget_activated_at IS 'Timestamp when widget was last activated';
