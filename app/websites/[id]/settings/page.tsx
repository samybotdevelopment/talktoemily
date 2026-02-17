import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { SettingsClient } from './SettingsClient';

export default async function WebsiteSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = (await createClient()) as any;

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

  return (
    <SettingsClient
      websiteId={id}
      websiteName={website.display_name}
      websiteDomain={website.domain}
      primaryColor={website.primary_color}
      widgetStyle={website.widget_style || 'modern'}
      widgetSubtitle={website.widget_subtitle || 'We reply instantly'}
      widgetWelcomeTitle={website.widget_welcome_title || 'Hi there! 👋'}
      widgetWelcomeMessage={website.widget_welcome_message || 'How can we help you today?'}
      wgWebsiteId={website.wg_website_id || null}
      widgetActivated={website.widget_activated || false}
    />
  );
}
