import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { DeleteAccountButton } from '@/components/DeleteAccountButton';

export default async function SubscriptionPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Get user's organization
  const { data: memberships } = await supabase
    .from('memberships')
    .select('org_id, role, organizations(*)')
    .eq('user_id', user.id)
    .single();

  const org = memberships?.organizations as any;

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
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold">Subscription</h1>
        </div>
      </div>

      <main className="neo-container py-4 sm:py-8">
        <div className="max-w-4xl mx-auto">
          {/* Current Plan */}
          <div className="neo-card bg-white p-8 mb-6">
            <h2 className="text-2xl font-bold mb-4">Current Plan</h2>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="text-4xl font-bold capitalize">{org.plan}</div>
              {org.is_wg_linked && (
                <span className="px-4 py-2 bg-fuchsia-primary text-white font-bold rounded-lg">
                  Wonder George Linked
                </span>
              )}
            </div>

            {org.plan === 'free' && !org.is_wg_linked && (
              <div className="mb-6">
                <p className="text-gray-600 mb-4">
                  Upgrade to Pro for more training runs and unlimited AI messages
                </p>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span>4 training runs per month</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span>Unlimited AI messages (with credits)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span>Up to 5 websites</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span>Priority support</span>
                  </li>
                </ul>
                
                <form action="/api/stripe/create-checkout" method="POST">
                  <button type="submit" className="neo-button-primary">
                    Upgrade to Pro - $29/month
                  </button>
                </form>
              </div>
            )}

            {org.plan === 'pro' && stripeCustomer && (
              <div>
                <p className="text-gray-600 mb-4">
                  You're on the Pro plan with full access to all features.
                </p>
                <form action="/api/stripe/portal" method="POST">
                  <button type="submit" className="neo-button-secondary">
                    Manage Subscription
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Credits Balance */}
          <div className="neo-card bg-white p-8 mb-6">
            <h2 className="text-2xl font-bold mb-4">AI Credits</h2>
            <div className="text-4xl font-bold mb-4">
              {org.credits_balance} <span className="text-lg text-gray-400">credits</span>
            </div>
            <p className="text-gray-600 mb-6">
              Credits are used for AI messages. Each message costs approximately 1 credit.
            </p>
            
            {org.plan === 'pro' && (
              <div className="grid md:grid-cols-3 gap-4">
                <button className="neo-card p-6 text-center hover:scale-[1.02] transition-transform">
                  <div className="text-2xl font-bold mb-2">100 Credits</div>
                  <div className="text-lg font-bold text-fuchsia-primary">$10</div>
                </button>
                <button className="neo-card p-6 text-center hover:scale-[1.02] transition-transform">
                  <div className="text-2xl font-bold mb-2">500 Credits</div>
                  <div className="text-lg font-bold text-fuchsia-primary">$45</div>
                  <div className="text-xs text-green-600 font-bold">Save 10%</div>
                </button>
                <button className="neo-card p-6 text-center hover:scale-[1.02] transition-transform">
                  <div className="text-2xl font-bold mb-2">1000 Credits</div>
                  <div className="text-lg font-bold text-fuchsia-primary">$80</div>
                  <div className="text-xs text-green-600 font-bold">Save 20%</div>
                </button>
              </div>
            )}
          </div>

          {/* Wonder George Integration */}
          <div className="neo-card bg-white p-8 mb-6">
            <h2 className="text-2xl font-bold mb-4">Wonder George Integration</h2>
            <p className="text-gray-600 mb-4">
              Have an active Wonder George subscription? Link it to get unlimited access!
            </p>
            <button className="neo-button-secondary" disabled>
              Check Wonder George Status (Coming Soon)
            </button>
          </div>

          {/* Delete Account Section */}
          <div className="neo-card bg-white p-8 border-4 border-red-600">
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
