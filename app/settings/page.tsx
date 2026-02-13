import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { DeleteAccountButton } from '@/components/DeleteAccountButton';
import { BillingPortalButton } from '@/components/BillingPortalButton';
import { ManageSubscriptionButton } from '@/components/ManageSubscriptionButton';

export default async function SettingsPage() {
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

  // Determine current plan
  let currentPlan = org?.plan || 'free';
  const isWGLinked = org?.is_wg_linked || false;

  // Map WG plans to Emily plans
  if (isWGLinked && org?.wg_plan) {
    if (org.wg_plan === 'entrepreneur') {
      currentPlan = 'starter';
    } else if (org.wg_plan === 'agency') {
      currentPlan = 'pro';
    }
  }

  const planNames: Record<string, string> = {
    free: 'Free',
    starter: 'Starter',
    pro: 'Pro',
  };

  const planDisplayName = planNames[currentPlan] || 'Free';

  return (
    <div className="min-h-screen bg-page">
      <Header userName={user.email} orgName={org?.name} showAuth />

      <div className="bg-white border-b-4 border-black">
        <div className="neo-container py-4 sm:py-6">
          <Link href="/dashboard" className="text-gray-600 hover:text-black mb-4 inline-block text-sm sm:text-base">
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold">Account Settings</h1>
        </div>
      </div>

      <main className="neo-container py-4 sm:py-8">
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
          {/* Subscription Section */}
          <div className="neo-card bg-white p-6 sm:p-8">
            <h2 className="text-2xl font-bold mb-2">Subscription</h2>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <p className="text-gray-600 mb-2">Current Plan</p>
                <p className="text-3xl font-bold text-fuchsia-primary">{planDisplayName}</p>
                {isWGLinked && (
                  <p className="text-sm text-gray-500 mt-1">Managed by Wonder George</p>
                )}
              </div>
              {!isWGLinked && currentPlan !== 'free' && (
                <ManageSubscriptionButton />
              )}
            </div>
            {!isWGLinked && (
              <Link 
                href="/settings/subscription"
                className="text-fuchsia-primary hover:underline text-sm"
              >
                View all plans and upgrade options →
              </Link>
            )}
          </div>

          {/* Billing & Invoices Section */}
          <div className="neo-card bg-white p-6 sm:p-8">
            <h2 className="text-2xl font-bold mb-2">Billing & Invoices</h2>
            <p className="text-gray-600 mb-6">
              View your payment history, download invoices, and manage your payment methods.
            </p>
            <BillingPortalButton />
          </div>

          {/* Delete Account Section */}
          <div className="neo-card bg-white p-6 sm:p-8 border-4 border-red-600">
            <h2 className="text-2xl font-bold mb-4 text-red-600">Danger Zone</h2>
            <p className="text-gray-600 mb-6">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <DeleteAccountButton />
          </div>
        </div>
      </main>
    </div>
  );
}

