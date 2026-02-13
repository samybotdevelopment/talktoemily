import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { CreditPacksClient } from '@/components/CreditPacksClient';

export default async function CreditsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string; credits?: string }>;
}) {
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
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold">AI Credits</h1>
        </div>
      </div>

      <main className="neo-container py-4 sm:py-8">
        <div className="max-w-5xl mx-auto">
          {/* Success/Cancel Messages */}
          {params.success === 'true' && params.credits && (
            <div className="neo-card bg-green-50 border-4 border-green-500 p-6 mb-6">
              <h3 className="font-bold text-lg mb-2 text-green-800">Purchase Successful!</h3>
              <p className="text-gray-700">
                {parseInt(params.credits).toLocaleString()} credits have been added to your account.
              </p>
            </div>
          )}
          
          {params.canceled === 'true' && (
            <div className="neo-card bg-yellow-50 border-4 border-yellow-400 p-6 mb-6">
              <h3 className="font-bold text-lg mb-2">Purchase Canceled</h3>
              <p className="text-gray-700">
                Your purchase was canceled. No charges were made.
              </p>
            </div>
          )}

          {/* Current Balance */}
          <div className="neo-card bg-white p-6 sm:p-8 mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-bold mb-2">Current Balance</h2>
            <div className="text-4xl sm:text-5xl font-bold text-fuchsia-primary mb-2">
              {org?.credits_balance || 0} <span className="text-2xl text-gray-400">credits</span>
            </div>
            <p className="text-gray-600">
              1 credit = 1 AI message exchange • Credits roll over month after month
            </p>
          </div>

          {/* Purchase Credit Packs */}
          <div className="mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">Purchase Credit Packs</h2>
            <p className="text-gray-600 mb-6">
              Power your AI chatbot with additional credits. All prices in EUR. Credits never expire and roll over each month.
            </p>

            {!hasActiveSubscription && (
              <div className="neo-card bg-yellow-50 border-4 border-yellow-400 p-6 mb-6">
                <h3 className="font-bold text-lg mb-2">Active Subscription Required</h3>
                <p className="text-gray-700 mb-4">
                  You need an active Pro subscription or Wonder George plan to purchase credit packs.
                </p>
                <Link href="/settings/subscription" className="neo-button-primary inline-block">
                  View Subscription Plans →
                </Link>
              </div>
            )}

            <CreditPacksClient hasActiveSubscription={hasActiveSubscription} />
          </div>

          {/* Info Section */}
          <div className="neo-card bg-gray-50 p-6">
            <h3 className="font-bold text-lg mb-3">How Credits Work</h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-fuchsia-primary font-bold">•</span>
                <span>Each visitor message and AI response counts as 1 credit</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-fuchsia-primary font-bold">•</span>
                <span>Credits roll over month after month and never expire</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-fuchsia-primary font-bold">•</span>
                <span>Pro subscribers get 100 free credits every month</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-fuchsia-primary font-bold">•</span>
                <span>Purchase larger packs for better value per message</span>
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}

