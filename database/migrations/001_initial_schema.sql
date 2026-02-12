-- Emily Chat Platform - Initial Schema Migration
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  max_websites INTEGER NOT NULL DEFAULT 1,
  is_wg_linked BOOLEAN DEFAULT FALSE NOT NULL,
  credits_balance INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Memberships table (user to org relationship)
CREATE TABLE IF NOT EXISTS public.memberships (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (user_id, org_id)
);

-- Websites table
CREATE TABLE IF NOT EXISTS public.websites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  display_name TEXT NOT NULL,
  primary_color TEXT NOT NULL DEFAULT '#E91E63',
  icon_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(org_id, domain)
);

-- Conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  website_id UUID NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL DEFAULT 'owner' CHECK (agent_type IN ('owner', 'visitor')),
  ai_mode TEXT NOT NULL DEFAULT 'auto' CHECK (ai_mode IN ('auto', 'paused')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('user', 'assistant', 'human')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Training items table
CREATE TABLE IF NOT EXISTS public.training_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  website_id UUID NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'wg')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Training runs table
CREATE TABLE IF NOT EXISTS public.training_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  website_id UUID NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'running', 'failed', 'completed')),
  started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ,
  error_message TEXT
);

-- Usage tracking table
CREATE TABLE IF NOT EXISTS public.usage_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  training_runs_used INTEGER DEFAULT 0 NOT NULL,
  ai_messages_used INTEGER DEFAULT 0 NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  UNIQUE(org_id, period_start)
);

-- Stripe customers table
CREATE TABLE IF NOT EXISTS public.stripe_customers (
  org_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL UNIQUE,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON public.memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_org_id ON public.memberships(org_id);
CREATE INDEX IF NOT EXISTS idx_websites_org_id ON public.websites(org_id);
CREATE INDEX IF NOT EXISTS idx_conversations_website_id ON public.conversations(website_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_training_items_website_id ON public.training_items(website_id);
CREATE INDEX IF NOT EXISTS idx_training_runs_website_id ON public.training_runs(website_id);
CREATE INDEX IF NOT EXISTS idx_training_runs_status ON public.training_runs(status);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_org_id ON public.usage_tracking(org_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_period ON public.usage_tracking(period_start, period_end);

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to initialize usage tracking for new orgs
CREATE OR REPLACE FUNCTION public.init_usage_tracking()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.usage_tracking (org_id, period_start, period_end)
  VALUES (
    NEW.id,
    DATE_TRUNC('month', NOW()),
    DATE_TRUNC('month', NOW() + INTERVAL '1 month')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to initialize usage tracking on org creation
DROP TRIGGER IF EXISTS on_org_created ON public.organizations;
CREATE TRIGGER on_org_created
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.init_usage_tracking();

-- Comments for documentation
COMMENT ON TABLE public.users IS 'User profiles linked to Supabase auth';
COMMENT ON TABLE public.organizations IS 'Organizations that own websites and chatbots';
COMMENT ON TABLE public.memberships IS 'User-to-organization relationships';
COMMENT ON TABLE public.websites IS 'Websites with chatbots (one chatbot per website)';
COMMENT ON TABLE public.conversations IS 'Chat conversations (owner or visitor)';
COMMENT ON TABLE public.messages IS 'Individual messages in conversations';
COMMENT ON TABLE public.training_items IS 'Training content chunks for AI';
COMMENT ON TABLE public.training_runs IS 'Training execution history';
COMMENT ON TABLE public.usage_tracking IS 'Monthly usage limits tracking';
COMMENT ON TABLE public.stripe_customers IS 'Stripe customer and subscription mapping';
