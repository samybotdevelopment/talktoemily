-- Onboarding State Persistence Migration
-- Store onboarding progress for incomplete onboardings

-- Add onboarding state field to organizations
ALTER TABLE public.organizations
ADD COLUMN onboarding_state JSONB;

-- Add index for querying onboarding state
CREATE INDEX IF NOT EXISTS idx_organizations_onboarding_state 
  ON public.organizations USING GIN (onboarding_state);

-- Comments for documentation
COMMENT ON COLUMN public.organizations.onboarding_state IS 'Stores current onboarding progress state as JSON - cleared on completion';


