import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { formatRelativeTime } from '@/lib/utils/helpers';
import { Header } from '@/components/Header';

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Use service client to bypass RLS for data fetching
  const serviceSupabase = await createServiceClient();

  // Get user's organizations
  const { data: memberships } = await serviceSupabase
    .from('memberships')
    .select('org_id, role, organizations(*)')
    .eq('user_id', user.id);

  const org = memberships?.[0]?.organizations as any;

  if (!org) {
    redirect('/auth/signup');
  }

  // Check if WG customer needs onboarding
  if (org.is_wg_linked && !org.onboarding_completed_at) {
    redirect('/onboarding');
  }

  // Get websites for this org
  const { data: websites } = await serviceSupabase
    .from('websites')
    .select('*')
    .eq('org_id', org.id)
    .order('created_at', { ascending: false });

  // Get usage stats
  const periodStart = new Date();
  periodStart.setDate(1);
  periodStart.setHours(0, 0, 0, 0);

  const { data: usage } = await serviceSupabase
    .from('usage_tracking')
    .select('*')
    .eq('org_id', org.id)
    .eq('period_start', periodStart.toISOString())
    .single();

  // Get all-time usage for free users
  const { data: allUsage } = await serviceSupabase
    .from('usage_tracking')
    .select('training_runs_used, ai_messages_used')
    .eq('org_id', org.id);

  const totalTrainingRuns = allUsage?.reduce((sum, u) => sum + u.training_runs_used, 0) || 0;
  const totalMessages = allUsage?.reduce((sum, u) => sum + u.ai_messages_used, 0) || 0;

  const canAddWebsite = (websites?.length || 0) < org.max_websites;

  return (
    <div className="min-h-screen bg-page">
      <Header userName={user.email} orgName={org.name} showAuth />

      <main className="neo-container py-4 sm:py-8">
        {/* WG Customer Banner */}
        {org.is_wg_linked && (
          <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-fuchsia-50 border-4 border-fuchsia-primary rounded-lg">
            <div className="flex items-start gap-4">
              <div className="text-3xl">🎉</div>
              <div>
                <h3 className="font-bold text-lg mb-1">Wonder George Customer</h3>
                <p className="text-sm text-gray-700">
                  You're a Wonder George customer! Your Emily subscription is free and includes
                  unlimited training and messages.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Usage Stats */}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="neo-card bg-white p-6">
            <h3 className="text-sm font-bold text-gray-600 mb-2">PLAN</h3>
            <p className="text-3xl font-bold capitalize">{org.plan}</p>
            {org.is_wg_linked && (
              <span className="inline-block mt-2 px-3 py-1 bg-fuchsia-primary text-white text-xs font-bold rounded">
                WG LINKED
              </span>
            )}
          </div>

          <div className="neo-card bg-white p-6">
            <h3 className="text-sm font-bold text-gray-600 mb-2">TRAINING RUNS</h3>
            <p className="text-3xl font-bold">
              {org.plan === 'free' ? totalTrainingRuns : usage?.training_runs_used || 0}
              <span className="text-lg text-gray-400">
                {' / '}
                {org.is_wg_linked || org.plan === 'pro' 
                  ? (org.plan === 'pro' ? '4/mo' : '∞')
                  : '1'}
              </span>
            </p>
          </div>

          <div className="neo-card bg-white p-6">
            <h3 className="text-sm font-bold text-gray-600 mb-2">AI MESSAGES</h3>
            <p className="text-3xl font-bold">
              {org.plan === 'free' ? totalMessages : usage?.ai_messages_used || 0}
              <span className="text-lg text-gray-400">
                {' / '}
                {org.is_wg_linked || org.plan === 'pro' ? '∞' : '50'}
              </span>
            </p>
          </div>
        </div>

        {/* Websites Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Your Chatbots</h2>
            {canAddWebsite ? (
              <Link href="/websites/new" className="neo-button-primary">
                + Create Chatbot
              </Link>
            ) : (
              <div className="text-sm text-gray-600">
                Chatbot limit reached ({websites?.length}/{org.max_websites})
              </div>
            )}
          </div>

          {websites && websites.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-6">
              {websites.map((website) => (
                <Link
                  key={website.id}
                  href={`/websites/${website.id}`}
                  className="neo-card bg-white p-6 hover:scale-[1.02] transition-transform"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {website.icon_url ? (
                        <img
                          src={website.icon_url}
                          alt={website.display_name}
                          className="w-12 h-12 rounded-lg border-2 border-black"
                        />
                      ) : (
                        <div
                          className="w-12 h-12 rounded-lg border-2 border-black flex items-center justify-center font-bold text-xl"
                          style={{ backgroundColor: website.primary_color }}
                        >
                          {website.display_name[0]}
                        </div>
                      )}
                      <div>
                        <h3 className="text-xl font-bold">{website.display_name}</h3>
                        <p className="text-sm text-gray-600">{website.domain}</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">
                    Created {formatRelativeTime(website.created_at)}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="neo-card bg-white p-8 sm:p-12 text-center">
              <h3 className="text-xl sm:text-2xl font-bold mb-2">No chatbots yet</h3>
              <p className="text-gray-600 mb-6">
                Create your first AI chatbot to embed on your website
              </p>
              <Link href="/websites/new" className="neo-button-primary">
                Create Your First Chatbot
              </Link>
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          <Link href="/settings/subscription" className="neo-card bg-white p-4 sm:p-6 text-center">
            <h3 className="font-bold text-sm sm:text-base">Subscription</h3>
            <p className="text-xs sm:text-sm text-gray-600">Manage your plan</p>
          </Link>

          <Link href="/settings/credits" className="neo-card bg-white p-4 sm:p-6 text-center">
            <h3 className="font-bold text-sm sm:text-base">Credits</h3>
            <p className="text-xs sm:text-sm text-gray-600">
              {org.credits_balance} credits available
            </p>
          </Link>

          <a
            href="https://docs.talktoemily.com"
            target="_blank"
            rel="noopener noreferrer"
            className="neo-card bg-white p-4 sm:p-6 text-center"
          >
            <h3 className="font-bold text-sm sm:text-base">Documentation</h3>
            <p className="text-xs sm:text-sm text-gray-600">Learn more</p>
          </a>
        </div>
      </main>
    </div>
  );
}
