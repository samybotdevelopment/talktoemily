import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { SubscribeButton } from '@/components/SubscribeButton';

export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string; plan?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Get user's organization with service client
  const serviceSupabase = await createServiceClient();
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
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold">Subscription Plans</h1>
        </div>
      </div>

      <main className="neo-container py-4 sm:py-8">
        <div className="max-w-6xl mx-auto">
          {/* Success/Cancel Messages */}
          {params.success === 'true' && params.plan && (
            <div className="neo-card bg-green-50 border-4 border-green-500 p-6 mb-6">
              <h3 className="font-bold text-lg mb-2 text-green-800">Subscription Activated!</h3>
              <p className="text-gray-700">
                Welcome to the {params.plan === 'starter' ? 'Starter' : 'Pro'} plan! Your credits have been added.
              </p>
            </div>
          )}
          
          {params.canceled === 'true' && (
            <div className="neo-card bg-yellow-50 border-4 border-yellow-400 p-6 mb-6">
              <h3 className="font-bold text-lg mb-2">Subscription Canceled</h3>
              <p className="text-gray-700">
                Your subscription was canceled. No charges were made.
              </p>
            </div>
          )}

          {/* Current Plan Banner */}
          <div className="neo-card bg-white p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-600 mb-1">CURRENT PLAN</h2>
                <div className="text-3xl font-bold capitalize">{currentPlan}</div>
              </div>
              {isWGLinked && (
                <span className="px-4 py-2 bg-fuchsia-primary text-white font-bold rounded-lg">
                  Wonder George Linked
                </span>
              )}
              {stripeCustomer && !isWGLinked && currentPlan !== 'free' && (
                <form action="/api/stripe/portal" method="POST">
                  <button type="submit" className="neo-button-secondary">
                    Manage Billing
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
                  CURRENT PLAN
                </div>
              )}
              <div className="text-center mb-4">
                <h3 className="text-2xl font-bold mb-2">Free</h3>
                <div className="text-4xl font-bold text-gray-700 mb-2">€0</div>
                <div className="text-gray-600">To test it out</div>
              </div>
              <ul className="space-y-3 mb-6 text-sm flex-grow">
                <li className="flex items-center gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>50 credits (one-time only)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>1 bot</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>1 free training run</span>
                </li>
              </ul>
              {currentPlan === 'free' && (
                <button
                  disabled={true}
                  className="neo-button-secondary w-full mt-auto opacity-50 cursor-not-allowed"
                >
                  Current Plan
                </button>
              )}
            </div>

            {/* Starter Plan */}
            <div className={`neo-card bg-white p-6 flex flex-col relative ${currentPlan === 'starter' ? 'border-4 border-fuchsia-primary' : ''}`}>
              {currentPlan === 'starter' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-fuchsia-primary text-white px-4 py-1 rounded-full text-sm font-bold whitespace-nowrap">
                  CURRENT PLAN
                </div>
              )}
              <div className="text-center mb-4">
                <h3 className="text-2xl font-bold mb-2">Starter</h3>
                <div className="text-4xl font-bold text-fuchsia-primary mb-2">€19</div>
                <div className="text-gray-600">per month</div>
              </div>
              <ul className="space-y-3 mb-6 text-sm flex-grow">
                <li className="flex items-center gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>100 credits per month</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>1 bot</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>Unlimited retraining</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>Purchase additional credits</span>
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
                  CURRENT PLAN
                </div>
              )}
              {currentPlan !== 'pro' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-1 rounded-full text-sm font-bold">
                  RECOMMENDED
                </div>
              )}
              <div className="text-center mb-4">
                <h3 className="text-2xl font-bold mb-2">Pro</h3>
                <div className="text-4xl font-bold text-fuchsia-primary mb-2">€49</div>
                <div className="text-gray-600">per month</div>
              </div>
              <ul className="space-y-3 mb-6 text-sm flex-grow">
                <li className="flex items-center gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>250 credits per month</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600 font-black">✓</span>
                  <span><b>5 bots</b></span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>Unlimited retraining</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>Purchase additional credits</span>
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
              <h2 className="text-2xl font-bold mb-2">Free for Wonder George Customers</h2>
              <p className="text-gray-600 mb-6">
                Build your website with Wonder George and get Emily AI chatbot completely free! Wonder George is the best solution to run your entire digital marketing on autopilot. Wonder George builds your website in 35 seconds, optimizes it for Google ranking (SEO), publishes blog article on autopilot, prepares social media posts on autopilot, translates your entire website to any language in one single click. It also has an e-commerce feture to sell your products, an e-learning feature to sell your online courses and a chauffeur plugin to take ride bookings on your website. And on top of that, your Emily subscription is included in your Wonder George subscription.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a 
                  href="https://wonder-george.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="neo-button-primary inline-block text-center"
                >
                  Discover Wonder George →
                </a>
                <button className="neo-button-secondary" disabled>
                  Link Wonder George Account (Coming Soon)
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
