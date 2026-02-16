'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

interface OrgDetails {
  organization: any;
  users: any[];
  websites: any[];
  stripeCustomer: any;
  stats: {
    conversationCount: number;
    messageCount: number;
    websiteCount: number;
    userCount: number;
  };
  recentTrainings: any[];
}

export default function OrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.id as string;

  const [data, setData] = useState<OrgDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Grant modals
  const [showGrantPlanModal, setShowGrantPlanModal] = useState(false);
  const [showGrantCreditsModal, setShowGrantCreditsModal] = useState(false);
  const [grantingPlan, setGrantingPlan] = useState(false);
  const [grantingCredits, setGrantingCredits] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'pro'>('starter');
  const [creditsAmount, setCreditsAmount] = useState(100);

  useEffect(() => {
    fetchOrganization();
  }, [orgId]);

  const fetchOrganization = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/superadmin/organizations/${orgId}`);
      const result = await response.json();

      if (!response.ok) {
        if (response.status === 403) {
          router.push('/dashboard');
          return;
        }
        throw new Error(result.error || 'Failed to fetch organization');
      }

      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGrantPlan = async () => {
    try {
      setGrantingPlan(true);
      setError(null);

      const response = await fetch(`/api/superadmin/organizations/${orgId}/grant-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to grant plan');
      }

      setSuccess(`Successfully granted ${selectedPlan} plan!`);
      setShowGrantPlanModal(false);
      fetchOrganization();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGrantingPlan(false);
    }
  };

  const handleGrantCredits = async () => {
    try {
      setGrantingCredits(true);
      setError(null);

      const response = await fetch(`/api/superadmin/organizations/${orgId}/grant-credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credits: creditsAmount }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to grant credits');
      }

      setSuccess(`Successfully granted ${creditsAmount} credits!`);
      setShowGrantCreditsModal(false);
      fetchOrganization();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGrantingCredits(false);
    }
  };

  if (loading) {
    return (
      <main className="neo-container py-8">
        <div className="neo-card bg-white p-12 text-center">
          <div className="animate-spin text-6xl mb-4">⚙️</div>
          <p className="text-gray-600 font-bold">Loading organization...</p>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="neo-container py-8">
        <div className="neo-card bg-white p-12 text-center">
          <div className="text-6xl mb-4">❌</div>
          <h3 className="text-2xl font-bold mb-2">Organization Not Found</h3>
          <Link href="/superadmin/organizations" className="neo-button-primary mt-4 inline-block">
            ← Back to Organizations
          </Link>
        </div>
      </main>
    );
  }

  const org = data.organization;
  const effectivePlan = org.wg_plan || org.plan;

  return (
    <main className="neo-container py-8">
      {error && (
        <div className="bg-red-50 border-4 border-red-500 rounded-lg p-4 mb-6">
          <p className="text-red-800 font-semibold">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-4 border-green-500 rounded-lg p-4 mb-6">
          <p className="text-green-800 font-semibold">{success}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">{org.name}</h1>
          <p className="text-gray-600">Organization ID: {org.id}</p>
        </div>
        <Link href="/superadmin/organizations" className="neo-button-secondary">
          ← Back
        </Link>
      </div>

      {/* Overview Cards */}
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <div className="neo-card bg-white p-4">
          <div className="text-sm text-gray-600 font-bold mb-1">Users</div>
          <div className="text-3xl font-bold">{data.stats.userCount}</div>
        </div>
        <div className="neo-card bg-white p-4">
          <div className="text-sm text-gray-600 font-bold mb-1">Bots</div>
          <div className="text-3xl font-bold">{data.stats.websiteCount}</div>
        </div>
        <div className="neo-card bg-white p-4">
          <div className="text-sm text-gray-600 font-bold mb-1">Conversations</div>
          <div className="text-3xl font-bold">{data.stats.conversationCount}</div>
        </div>
        <div className="neo-card bg-white p-4">
          <div className="text-sm text-gray-600 font-bold mb-1">Messages</div>
          <div className="text-3xl font-bold">{data.stats.messageCount}</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Organization Details */}
        <div className="neo-card bg-white p-6">
          <h2 className="text-2xl font-bold mb-4">Organization Details</h2>
          <div className="space-y-3">
            <div>
              <span className="text-gray-600 font-bold">Plan:</span>{' '}
              <span className="font-bold text-lg">{effectivePlan.toUpperCase()}</span>
              {org.wg_plan && ' (Wonder George)'}
            </div>
            <div>
              <span className="text-gray-600 font-bold">Credits Balance:</span>{' '}
              <span className="font-bold">{org.credits_balance}</span>
              {org.frozen_credits > 0 && (
                <span className="text-red-600"> ({org.frozen_credits} frozen)</span>
              )}
            </div>
            <div>
              <span className="text-gray-600 font-bold">Max Bots:</span>{' '}
              <span className="font-bold">{org.max_websites}</span>
            </div>
            <div>
              <span className="text-gray-600 font-bold">Created:</span>{' '}
              {new Date(org.created_at).toLocaleString()}
            </div>
          </div>

          {/* Grant Actions */}
          {org.plan === 'free' && (
            <div className="mt-6 pt-6 border-t-2 border-gray-200">
              <h3 className="font-bold mb-3">Admin Actions</h3>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowGrantPlanModal(true)}
                  className="neo-button-primary flex-1"
                >
                  Grant Plan
                </button>
                <button
                  onClick={() => setShowGrantCreditsModal(true)}
                  className="neo-button-secondary flex-1"
                >
                  Grant Credits
                </button>
              </div>
            </div>
          )}
          {org.plan !== 'free' && (
            <div className="mt-6 pt-6 border-t-2 border-gray-200">
              <button
                onClick={() => setShowGrantCreditsModal(true)}
                className="neo-button-primary w-full"
              >
                Grant Credits
              </button>
            </div>
          )}
        </div>

        {/* Stripe Info */}
        <div className="neo-card bg-white p-6">
          <h2 className="text-2xl font-bold mb-4">Stripe Information</h2>
          {data.stripeCustomer ? (
            <div className="space-y-3">
              <div>
                <span className="text-gray-600 font-bold">Customer ID:</span>{' '}
                <code className="text-sm">{data.stripeCustomer.stripe_customer_id}</code>
                {data.stripeCustomer.stripe_customer_id && (
                  <a
                    href={`https://dashboard.stripe.com/customers/${data.stripeCustomer.stripe_customer_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-blue-600 hover:underline text-sm"
                  >
                    View in Stripe →
                  </a>
                )}
              </div>
              {data.stripeCustomer.stripe_subscription_id && (
                <>
                  <div>
                    <span className="text-gray-600 font-bold">Subscription ID:</span>{' '}
                    <code className="text-sm">{data.stripeCustomer.stripe_subscription_id}</code>
                  </div>
                  {data.stripeCustomer.subscription_current_period_end && (
                    <div>
                      <span className="text-gray-600 font-bold">Period End:</span>{' '}
                      {new Date(data.stripeCustomer.subscription_current_period_end).toLocaleString()}
                    </div>
                  )}
                  {data.stripeCustomer.subscription_cancel_at_period_end && (
                    <div className="text-orange-600 font-bold">
                      ⚠️ Subscription set to cancel at period end
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <p className="text-gray-600">No Stripe customer data</p>
          )}
        </div>

        {/* Users */}
        <div className="neo-card bg-white p-6">
          <h2 className="text-2xl font-bold mb-4">Users ({data.users.length})</h2>
          <div className="space-y-2">
            {data.users.map((user) => (
              <div key={user.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="font-bold">{user.email}</div>
                <div className="text-sm text-gray-600">
                  Joined: {new Date(user.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Websites */}
        <div className="neo-card bg-white p-6">
          <h2 className="text-2xl font-bold mb-4">Bots ({data.websites.length})</h2>
          <div className="space-y-2">
            {data.websites.length === 0 ? (
              <p className="text-gray-600">No bots created yet</p>
            ) : (
              data.websites.map((website) => (
                <div key={website.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold">{website.display_name}</span>
                    {!website.is_active && (
                      <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded font-bold">
                        INACTIVE
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">{website.domain}</div>
                  <div className="text-sm text-gray-600">
                    Trainings: {website.training_count}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Grant Plan Modal */}
      {showGrantPlanModal && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => !grantingPlan && setShowGrantPlanModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="neo-card bg-white p-8 max-w-md w-full">
              <h3 className="text-2xl font-bold mb-4">Grant Plan</h3>
              <p className="text-gray-600 mb-6">
                Grant a paid plan to <strong>{org.name}</strong>
              </p>

              <div className="space-y-4 mb-6">
                <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="plan"
                    value="starter"
                    checked={selectedPlan === 'starter'}
                    onChange={(e) => setSelectedPlan(e.target.value as 'starter' | 'pro')}
                    className="w-5 h-5"
                  />
                  <div>
                    <div className="font-bold">Starter Plan</div>
                    <div className="text-sm text-gray-600">1 bot, 100 credits/month</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="plan"
                    value="pro"
                    checked={selectedPlan === 'pro'}
                    onChange={(e) => setSelectedPlan(e.target.value as 'starter' | 'pro')}
                    className="w-5 h-5"
                  />
                  <div>
                    <div className="font-bold">Pro Plan</div>
                    <div className="text-sm text-gray-600">5 bots, 250 credits/month</div>
                  </div>
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowGrantPlanModal(false)}
                  disabled={grantingPlan}
                  className="neo-button-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGrantPlan}
                  disabled={grantingPlan}
                  className="neo-button-primary flex-1"
                >
                  {grantingPlan ? 'Granting...' : 'Grant Plan'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Grant Credits Modal */}
      {showGrantCreditsModal && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => !grantingCredits && setShowGrantCreditsModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="neo-card bg-white p-8 max-w-md w-full">
              <h3 className="text-2xl font-bold mb-4">Grant Credits</h3>
              <p className="text-gray-600 mb-6">
                Add credits to <strong>{org.name}</strong>
              </p>

              <div className="mb-6">
                <label className="block text-sm font-bold mb-2">Credits Amount</label>
                <input
                  type="number"
                  value={creditsAmount}
                  onChange={(e) => setCreditsAmount(parseInt(e.target.value) || 0)}
                  min="1"
                  step="1"
                  className="neo-input w-full"
                />
                <p className="text-sm text-gray-600 mt-2">
                  Current balance: {org.credits_balance} credits
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowGrantCreditsModal(false)}
                  disabled={grantingCredits}
                  className="neo-button-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGrantCredits}
                  disabled={grantingCredits || creditsAmount <= 0}
                  className="neo-button-primary flex-1"
                >
                  {grantingCredits ? 'Granting...' : `Grant ${creditsAmount} Credits`}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}


