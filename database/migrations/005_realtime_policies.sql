-- Emily Chat Platform - Real-time Policies for Widget
-- This allows the widget (using anon role) to receive real-time updates

-- Grant anon role basic permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.messages TO anon;
GRANT SELECT ON public.conversations TO anon;
GRANT SELECT ON public.websites TO anon;

-- Allow anon users to SELECT messages for real-time events
-- This policy allows the widget to receive real-time updates
CREATE POLICY "Anon can view all messages for realtime"
  ON public.messages FOR SELECT
  TO anon
  USING (true);

-- Allow anon users to SELECT conversations for real-time events
CREATE POLICY "Anon can view all conversations for realtime"
  ON public.conversations FOR SELECT
  TO anon
  USING (true);

-- Allow anon users to view website settings (for widget initialization)
CREATE POLICY "Anon can view websites for widget"
  ON public.websites FOR SELECT
  TO anon
  USING (true);

-- Note: INSERT operations from the widget are still handled via API routes
-- using the service role, so we don't need INSERT policies for anon
