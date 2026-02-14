import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { CreditPacksClient } from '@/components/CreditPacksClient';
import { getTranslations } from 'next-intl/server';

export default async function CreditsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string; credits?: string }>;
}) {
  const t = await getTranslations('credits');
  const tCommon = await getTranslations('common');
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Get user's organization
  const serviceSupabase = await createServiceClient();
  const { data: memberships } = await serviceSupabase
    .from('memberships')
    .select('org_id, role, organizations(*)')
    .eq('user_id', user.id)
    .single();

  const org = memberships?.organizations as any;
  const hasActiveSubscription = 
    org?.plan === 'starter' || 
    org?.plan === 'pro' || 
    (org?.is_wg_linked && org?.wg_plan !== 'free');

  return (
    <div className="min-h-screen bg-page">
      <Header userName={user.email} orgName={org?.name} showAuth />

      <div className="bg-white border-b-4 border-black">
        <div className="neo-container py-4 sm:py-6">
          <Link href="/dashboard" className="text-gray-600 hover:text-black mb-4 inline-block text-sm sm:text-base">
            {tCommon('backToDashboard')}
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold">{t('title')}</h1>
        </div>
      </div>

      <main className="neo-container py-4 sm:py-8">
        <div className="max-w-5xl mx-auto">
          {/* Success/Cancel Messages */}
          {params.success === 'true' && params.credits && (
            <div className="neo-card bg-green-50 border-4 border-green-500 p-6 mb-6">
              <h3 className="font-bold text-lg mb-2 text-green-800">{t('purchaseSuccess')}</h3>
              <p className="text-gray-700">
                {t('purchaseSuccessDescription', { count: parseInt(params.credits).toLocaleString() })}
              </p>
            </div>
          )}
          
          {params.canceled === 'true' && (
            <div className="neo-card bg-yellow-50 border-4 border-yellow-400 p-6 mb-6">
              <h3 className="font-bold text-lg mb-2">{t('purchaseCanceled')}</h3>
              <p className="text-gray-700">
                {t('purchaseCanceledDescription')}
              </p>
            </div>
          )}

          {/* Current Balance */}
          <div className="neo-card bg-white p-6 sm:p-8 mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-bold mb-2">{t('currentBalance')}</h2>
            <div className="text-4xl sm:text-5xl font-bold text-fuchsia-primary mb-2">
              {org?.credits_balance || 0} <span className="text-2xl text-gray-400">{t('creditsLabel')}</span>
            </div>
            <p className="text-gray-600">
              {t('creditEquation')}
            </p>
          </div>

          {/* Purchase Credit Packs */}
          <div className="mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">{t('purchasePacks')}</h2>
            <p className="text-gray-600 mb-6">
              {t('purchaseDescription')}
            </p>

            {!hasActiveSubscription && (
              <div className="neo-card bg-yellow-50 border-4 border-yellow-400 p-6 mb-6">
                <h3 className="font-bold text-lg mb-2">{t('requiresSubscription')}</h3>
                <p className="text-gray-700 mb-4">
                  {t('requiresSubscriptionMessage')}
                </p>
                <Link href="/settings/subscription" className="neo-button-primary inline-block">
                  {t('viewPlans')} →
                </Link>
              </div>
            )}

            <CreditPacksClient hasActiveSubscription={hasActiveSubscription} />
          </div>

          {/* Info Section */}
          <div className="neo-card bg-gray-50 p-6">
            <h3 className="font-bold text-lg mb-3">{t('howCreditsWork')}</h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-fuchsia-primary font-bold">•</span>
                <span>{t('creditInfo1')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-fuchsia-primary font-bold">•</span>
                <span>{t('creditInfo2')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-fuchsia-primary font-bold">•</span>
                <span>{t('creditInfo3')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-fuchsia-primary font-bold">•</span>
                <span>{t('creditInfo4')}</span>
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}

