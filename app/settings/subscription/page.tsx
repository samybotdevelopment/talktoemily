import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { SubscribeButton } from '@/components/SubscribeButton';
import { getTranslations } from 'next-intl/server';

export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string; plan?: string }>;
}) {
  const t = await getTranslations('subscription');
  const tCommon = await getTranslations('common');
  const params = await searchParams;
  const supabase = (await createClient()) as any;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Get user's organization with service client
  const serviceSupabase = (await createServiceClient()) as any;
  const { data: memberships }: { data: any } = await serviceSupabase
    .from('memberships')
    .select('org_id, role, organizations(*)')
    .eq('user_id', user.id)
    .single();

  const org = memberships?.organizations || {};
  
  // Map Wonder George plans to Emily plans
  let currentPlan = org?.plan || 'free';
  if (org?.is_wg_linked && org?.wg_plan) {
    if (org.wg_plan === 'entrepreneur') {
      currentPlan = 'starter';
    } else if (org.wg_plan === 'agency') {
      currentPlan = 'pro';
    }
  }

  const isWGLinked = org?.is_wg_linked || false;

  // Get stripe customer
  const { data: stripeCustomer } = await supabase
    .from('stripe_customers')
    .select('*')
    .eq('org_id', org.id)
    .single();

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
        <div className="max-w-6xl mx-auto">
          {/* Success/Cancel Messages */}
          {params.success === 'true' && params.plan && (
            <div className="neo-card bg-green-50 border-4 border-green-500 p-6 mb-6">
              <h3 className="font-bold text-lg mb-2 text-green-800">{t('subscriptionActivated')}</h3>
              <p className="text-gray-700">
                {t('welcomeToPlan', { plan: t(`plans.${params.plan}.name`) })}
              </p>
            </div>
          )}
          
          {params.canceled === 'true' && (
            <div className="neo-card bg-yellow-50 border-4 border-yellow-400 p-6 mb-6">
              <h3 className="font-bold text-lg mb-2">{t('subscriptionCanceled')}</h3>
              <p className="text-gray-700">
                {t('subscriptionCanceledDescription')}
              </p>
            </div>
          )}

          {/* Current Plan Banner */}
          <div className="neo-card bg-white p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-600 mb-1">{t('currentPlan')}</h2>
                <div className="text-3xl font-bold capitalize">{t(`plans.${currentPlan}.name`)}</div>
              </div>
              {isWGLinked && (
                <span className="px-4 py-2 bg-fuchsia-primary text-white font-bold rounded-lg">
                  {t('wonderGeorgeLinked')}
                </span>
              )}
              {stripeCustomer && !isWGLinked && currentPlan !== 'free' && (
                <form action="/api/stripe/portal" method="POST">
                  <button type="submit" className="neo-button-secondary">
                    {t('manageBilling')}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Plans Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-8 pt-4">
            {/* Free Plan */}
            <div className={`neo-card bg-white p-6 flex flex-col relative ${currentPlan === 'free' ? 'border-4 border-fuchsia-primary' : ''}`}>
              {currentPlan === 'free' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-fuchsia-primary text-white px-4 py-1 rounded-full text-sm font-bold whitespace-nowrap">
                  {t('currentPlanBadge')}
                </div>
              )}
              <div className="text-center mb-4">
                <h3 className="text-2xl font-bold mb-2">{t('plans.free.name')}</h3>
                <div className="text-4xl font-bold text-gray-700 mb-2">€0</div>
                <div className="text-gray-600">{t('plans.free.subtitle')}</div>
              </div>
              <ul className="space-y-3 mb-6 text-sm flex-grow">
                <li className="flex items-center gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>{t('plans.free.feature1')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>{t('plans.free.feature2')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>{t('plans.free.feature3')}</span>
                </li>
              </ul>
              {currentPlan === 'free' && (
                <button
                  disabled={true}
                  className="neo-button-secondary w-full mt-auto opacity-50 cursor-not-allowed"
                >
                  {t('currentPlanButton')}
                </button>
              )}
            </div>

            {/* Starter Plan */}
            <div className={`neo-card bg-white p-6 flex flex-col relative ${currentPlan === 'starter' ? 'border-4 border-fuchsia-primary' : ''}`}>
              {currentPlan === 'starter' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-fuchsia-primary text-white px-4 py-1 rounded-full text-sm font-bold whitespace-nowrap">
                  {t('currentPlanBadge')}
                </div>
              )}
              <div className="text-center mb-4">
                <h3 className="text-2xl font-bold mb-2">{t('plans.starter.name')}</h3>
                <div className="text-4xl font-bold text-fuchsia-primary mb-2">€19</div>
                <div className="text-gray-600">{t('perMonth')}</div>
              </div>
              <ul className="space-y-3 mb-6 text-sm flex-grow">
                <li className="flex items-center gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>{t('plans.starter.feature1')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>{t('plans.starter.feature2')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>{t('plans.starter.feature3')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>{t('plans.starter.feature4')}</span>
                </li>
              </ul>
              <SubscribeButton
                plan="starter"
                currentPlan={currentPlan}
                isWGLinked={isWGLinked}
              />
            </div>

            {/* Pro Plan */}
            <div className={`neo-card bg-white p-6 flex flex-col ${currentPlan === 'pro' ? 'border-4 border-fuchsia-primary' : ''} relative`}>
              {currentPlan === 'pro' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-fuchsia-primary text-white px-4 py-1 rounded-full text-sm font-bold">
                  {t('currentPlanBadge')}
                </div>
              )}
              {currentPlan !== 'pro' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-1 rounded-full text-sm font-bold">
                  {t('recommended')}
                </div>
              )}
              <div className="text-center mb-4">
                <h3 className="text-2xl font-bold mb-2">{t('plans.pro.name')}</h3>
                <div className="text-4xl font-bold text-fuchsia-primary mb-2">€49</div>
                <div className="text-gray-600">{t('perMonth')}</div>
              </div>
              <ul className="space-y-3 mb-6 text-sm flex-grow">
                <li className="flex items-center gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>{t('plans.pro.feature1')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600 font-black">✓</span>
                  <span><b>{t('plans.pro.feature2')}</b></span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>{t('plans.pro.feature3')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>{t('plans.pro.feature4')}</span>
                </li>
               
              </ul>
              <SubscribeButton
                plan="pro"
                currentPlan={currentPlan}
                isWGLinked={isWGLinked}
              />
            </div>
          </div>

          {/* Wonder George Integration */}
          {!org?.is_wg_linked && (
            <div className="neo-card bg-white p-8">
              <h2 className="text-2xl font-bold mb-2">{t('wonderGeorge.title')}</h2>
              <p className="text-gray-600 mb-6">
                {t('wonderGeorge.description')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a 
                  href="https://wonder-george.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="neo-button-primary inline-block text-center"
                >
                  {t('wonderGeorge.discover')} →
                </a>
                <button className="neo-button-secondary" disabled>
                  {t('wonderGeorge.linkAccount')}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
