-- Emily Chat Platform - Row Level Security Policies
-- Run this after 001_initial_schema.sql

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_customers ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's organizations
CREATE OR REPLACE FUNCTION public.get_user_orgs(user_uuid UUID)
RETURNS SETOF UUID AS $$
  SELECT org_id FROM public.memberships WHERE user_id = user_uuid;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Users policies
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Organizations policies
CREATE POLICY "Users can view their organizations"
  ON public.organizations FOR SELECT
  USING (id IN (SELECT public.get_user_orgs(auth.uid())));

CREATE POLICY "Owners can update their organizations"
  ON public.organizations FOR UPDATE
  USING (
    id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Users can insert organizations"
  ON public.organizations FOR INSERT
  WITH CHECK (true);

-- Memberships policies
CREATE POLICY "Users can view memberships of their orgs"
  ON public.memberships FOR SELECT
  USING (org_id IN (SELECT public.get_user_orgs(auth.uid())));

CREATE POLICY "Users can insert memberships for their orgs"
  ON public.memberships FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Owners can delete memberships"
  ON public.memberships FOR DELETE
  USING (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Websites policies
CREATE POLICY "Users can view websites from their orgs"
  ON public.websites FOR SELECT
  USING (org_id IN (SELECT public.get_user_orgs(auth.uid())));

CREATE POLICY "Users can insert websites to their orgs"
  ON public.websites FOR INSERT
  WITH CHECK (org_id IN (SELECT public.get_user_orgs(auth.uid())));

CREATE POLICY "Users can update websites in their orgs"
  ON public.websites FOR UPDATE
  USING (org_id IN (SELECT public.get_user_orgs(auth.uid())));

CREATE POLICY "Users can delete websites from their orgs"
  ON public.websites FOR DELETE
  USING (org_id IN (SELECT public.get_user_orgs(auth.uid())));

-- Conversations policies
CREATE POLICY "Users can view conversations for their websites"
  ON public.conversations FOR SELECT
  USING (
    website_id IN (
      SELECT id FROM public.websites 
      WHERE org_id IN (SELECT public.get_user_orgs(auth.uid()))
    )
  );

CREATE POLICY "Users can insert conversations for their websites"
  ON public.conversations FOR INSERT
  WITH CHECK (
    website_id IN (
      SELECT id FROM public.websites 
      WHERE org_id IN (SELECT public.get_user_orgs(auth.uid()))
    )
  );

CREATE POLICY "Users can update conversations for their websites"
  ON public.conversations FOR UPDATE
  USING (
    website_id IN (
      SELECT id FROM public.websites 
      WHERE org_id IN (SELECT public.get_user_orgs(auth.uid()))
    )
  );

-- Messages policies
CREATE POLICY "Users can view messages in their conversations"
  ON public.messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT c.id FROM public.conversations c
      JOIN public.websites w ON c.website_id = w.id
      WHERE w.org_id IN (SELECT public.get_user_orgs(auth.uid()))
    )
  );

CREATE POLICY "Users can insert messages in their conversations"
  ON public.messages FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT c.id FROM public.conversations c
      JOIN public.websites w ON c.website_id = w.id
      WHERE w.org_id IN (SELECT public.get_user_orgs(auth.uid()))
    )
  );

-- Training items policies
CREATE POLICY "Users can view training items for their websites"
  ON public.training_items FOR SELECT
  USING (
    website_id IN (
      SELECT id FROM public.websites 
      WHERE org_id IN (SELECT public.get_user_orgs(auth.uid()))
    )
  );

CREATE POLICY "Users can insert training items for their websites"
  ON public.training_items FOR INSERT
  WITH CHECK (
    website_id IN (
      SELECT id FROM public.websites 
      WHERE org_id IN (SELECT public.get_user_orgs(auth.uid()))
    )
  );

CREATE POLICY "Users can update training items for their websites"
  ON public.training_items FOR UPDATE
  USING (
    website_id IN (
      SELECT id FROM public.websites 
      WHERE org_id IN (SELECT public.get_user_orgs(auth.uid()))
    )
  );

CREATE POLICY "Users can delete training items for their websites"
  ON public.training_items FOR DELETE
  USING (
    website_id IN (
      SELECT id FROM public.websites 
      WHERE org_id IN (SELECT public.get_user_orgs(auth.uid()))
    )
  );

-- Training runs policies
CREATE POLICY "Users can view training runs for their websites"
  ON public.training_runs FOR SELECT
  USING (
    website_id IN (
      SELECT id FROM public.websites 
      WHERE org_id IN (SELECT public.get_user_orgs(auth.uid()))
    )
  );

CREATE POLICY "Service role can manage training runs"
  ON public.training_runs FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Usage tracking policies
CREATE POLICY "Users can view usage for their orgs"
  ON public.usage_tracking FOR SELECT
  USING (org_id IN (SELECT public.get_user_orgs(auth.uid())));

CREATE POLICY "Service role can manage usage tracking"
  ON public.usage_tracking FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Stripe customers policies
CREATE POLICY "Users can view stripe data for their orgs"
  ON public.stripe_customers FOR SELECT
  USING (org_id IN (SELECT public.get_user_orgs(auth.uid())));

CREATE POLICY "Service role can manage stripe customers"
  ON public.stripe_customers FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant service role full access
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
