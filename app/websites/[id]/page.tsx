import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { WebsiteOverviewClient } from './WebsiteOverviewClient';

export default async function WebsitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Get website
  const { data: website } = await supabase
    .from('websites')
    .select('*')
    .eq('id', id)
    .single();

  if (!website) {
    notFound();
  }

  // Get training items count
  const { count: trainingCount } = await supabase
    .from('training_items')
    .select('*', { count: 'exact', head: true })
    .eq('website_id', id);

  // Get latest training run
  const { data: latestRun } = await supabase
    .from('training_runs')
    .select('*')
    .eq('website_id', id)
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  // Get conversations count
  const { count: conversationsCount } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .eq('website_id', id);

  return (
    <WebsiteOverviewClient
      websiteId={id}
      websiteName={website.display_name}
      websiteDomain={website.domain}
      websiteColor={website.primary_color}
      trainingCount={trainingCount || 0}
      latestRunStatus={latestRun?.status}
      conversationsCount={conversationsCount || 0}
      widgetStyle={website.widget_style || 'modern'}
      widgetSubtitle={website.widget_subtitle || 'We reply instantly'}
      widgetWelcomeTitle={website.widget_welcome_title || 'Hi there! 👋'}
      widgetWelcomeMessage={website.widget_welcome_message || 'How can we help you today?'}
      wgWebsiteId={website.wg_website_id || null}
      widgetActivated={website.widget_activated || false}
    />
  );
}
