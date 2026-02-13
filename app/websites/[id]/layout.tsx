import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import { BotNavigation } from '@/components/BotNavigation';

export default async function WebsiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
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
    .select('*, organizations(*)')
    .eq('id', id)
    .single();

  if (!website) {
    notFound();
  }

  // Verify user has access
  const { data: membership } = await supabase
    .from('memberships')
    .select('*')
    .eq('user_id', user.id)
    .eq('org_id', website.org_id)
    .single();

  if (!membership) {
    notFound();
  }

  const org = website.organizations as any;

  return (
    <div className="min-h-screen bg-page">
      <Header 
        userName={user.email} 
        orgName={org?.name} 
        showAuth 
      />
      <BotNavigation 
        websiteId={id}
        websiteName={website.display_name}
        websiteColor={website.primary_color}
      />
      {children}
    </div>
  );
}
