import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { formatRelativeTime } from '@/lib/utils/helpers';
import { Header } from '@/components/Header';
import { CreateBotButton } from '@/components/CreateBotButton';
import { CancellationCountdownClient } from '@/components/CancellationCountdownClient';
import { BotCard } from '@/components/BotCard';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';

export default async function DashboardPage() {
  const t = await getTranslations('dashboard');
  const tCommon = await getTranslations('common');
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

  // Check if customer needs onboarding
  if (!org.onboarding_completed_at) {
    redirect('/onboarding');
  }

  // Get websites for this org
  const { data: websites } = await serviceSupabase
    .from('websites')
    .select('id, org_id, domain, display_name, primary_color, icon_url, created_at, onboarding_completed_at, is_active')
    .eq('org_id', org.id)
    .order('created_at', { ascending: false });

  // Check for incomplete bot creation
  // A bot is incomplete if it has no onboarding_completed_at AND no training items
  let incompleteBot = null;
  if (websites && websites.length > 0) {
    for (const website of websites) {
      if (!website.onboarding_completed_at) {
        // Check if this website has any training items
        const { data: trainingItems } = await serviceSupabase
          .from('training_items')
          .select('id')
          .eq('website_id', website.id)
          .limit(1);
        
        if (!trainingItems || trainingItems.length === 0) {
          // This is truly an incomplete bot
          incompleteBot = website;
          break;
        } else {
          // Bot has training, mark it as completed
          await serviceSupabase
            .from('websites')
            .update({ onboarding_completed_at: website.created_at })
            .eq('id', website.id);
        }
      }
    }
  }

  const canAddWebsite = (websites?.length || 0) < org.max_websites;

  // Map WG plan to display plan
  let displayPlan = org.plan;
  if (org.is_wg_linked && org.wg_plan) {
    if (org.wg_plan === 'entrepreneur') {
      displayPlan = t('planStarter');
    } else if (org.wg_plan === 'agency') {
      displayPlan = t('planPro');
    }
  } else if (org.plan === 'free') {
    displayPlan = t('planFree');
  } else if (org.plan === 'starter') {
    displayPlan = t('planStarter');
  } else if (org.plan === 'pro') {
    displayPlan = t('planPro');
  }

  // Get subscription cancellation status
  const { data: stripeData } = await serviceSupabase
    .from('stripe_customers')
    .select('subscription_cancel_at_period_end, subscription_current_period_end')
    .eq('org_id', org.id)
    .single();

  const isCanceling = stripeData?.subscription_cancel_at_period_end && stripeData?.subscription_current_period_end;

  return (
    <div className="min-h-screen bg-page">
      <Header userName={user.email} orgName={org.name} showAuth />

      <main className="neo-container py-4 sm:py-8">
        {/* Cancellation Countdown Banner */}
        {isCanceling && (
          <CancellationCountdownClient 
            endDate={stripeData.subscription_current_period_end}
          />
        )}

        {/* WG Customer Banner */}
        {org.is_wg_linked && (
          <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-fuchsia-50 border-4 border-fuchsia-primary rounded-lg">
            <div className="flex items-start gap-4">
              <div className="text-3xl">🎉</div>
              <div>
                <h3 className="font-bold text-lg mb-1">{t('wgCustomerTitle')}</h3>
                <p className="text-sm text-gray-700">
                  {t('wgCustomerMessage')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Usage Stats */}
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="neo-card bg-white p-6">
            <h3 className="text-sm font-bold text-gray-600 mb-2">{t('planLabel')}</h3>
            <p className="text-3xl font-bold capitalize">{displayPlan}</p>
            {org.is_wg_linked && (
              <span className="inline-block mt-2 px-3 py-1 bg-fuchsia-primary text-white text-xs font-bold rounded">
                {t('wgLinked')}
              </span>
            )}
          </div>

          <div className="neo-card bg-white p-6">
            <h3 className="text-sm font-bold text-gray-600 mb-2">{t('creditsLabel')}</h3>
            <p className="text-3xl font-bold">
              {org.credits_balance}
            </p>
            {org.frozen_credits > 0 && (
              <p className="text-sm text-orange-600 font-semibold mt-1">
                +{org.frozen_credits} {t('frozen')}
              </p>
            )}
            <p className="text-sm text-gray-600 mt-2">
              {org.plan === 'starter' && t('starterCredits')}
              {org.plan === 'pro' && t('proCredits')}
              {org.is_wg_linked && t('unlimitedWG')}
              {org.plan === 'free' && !org.is_wg_linked && t('freeCredits')}
            </p>
            {org.frozen_credits > 0 && (
              <p className="text-xs text-orange-600 mt-2">
                💡 {t('upgradeToUnlock')}
              </p>
            )}
          </div>
        </div>

        {/* Websites Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">{t('yourChatbots')}</h2>
            <CreateBotButton
              canAddWebsite={canAddWebsite}
              currentWebsites={websites?.length || 0}
              maxWebsites={org.max_websites}
              incompleteBot={incompleteBot ? { id: incompleteBot.id, name: incompleteBot.display_name } : null}
            />
          </div>

          {websites && websites.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-6">
              {websites.map((website) => (
                <BotCard key={website.id} website={website} />
              ))}
            </div>
          ) : (
            <div className="neo-card bg-white p-8 sm:p-12 text-center">
              <h3 className="text-xl sm:text-2xl font-bold mb-2">{t('noChatbots')}</h3>
              <p className="text-gray-600 mb-6">
                {t('noChatbotsDescription')}
              </p>
              <Link href="/websites/new" className="neo-button-primary">
                {t('createFirstBot')}
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
