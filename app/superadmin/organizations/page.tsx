'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Organization {
  id: string;
  name: string;
  plan: string;
  wg_plan: string | null;
  effectivePlan: string;
  credits_balance: number;
  frozen_credits: number;
  max_websites: number;
  websiteCount: number;
  created_at: string;
  users: Array<{ id: string; email: string }>;
  hasActiveSubscription: boolean;
  subscriptionCancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
}

export default function OrganizationsPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async (searchQuery = '') => {
    try {
      setLoading(true);
      const url = searchQuery 
        ? `/api/superadmin/organizations?search=${encodeURIComponent(searchQuery)}`
        : '/api/superadmin/organizations';
      
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403) {
          router.push('/dashboard');
          return;
        }
        throw new Error(data.error || 'Failed to fetch organizations');
      }

      setOrganizations(data.organizations);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrganizations(search);
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'pro':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'starter':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <main className="neo-container py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Organizations</h1>
          <p className="text-gray-600">Manage all organizations in the system</p>
        </div>
        <Link href="/superadmin" className="neo-button-secondary">
          ← Back
        </Link>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="neo-card bg-white p-4 mb-6">
        <div className="flex gap-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by organization name or user email..."
            className="neo-input flex-1"
          />
          <button type="submit" className="neo-button-primary">
            Search
          </button>
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                fetchOrganizations('');
              }}
              className="neo-button-secondary"
            >
              Clear
            </button>
          )}
        </div>
      </form>

      {error && (
        <div className="bg-red-50 border-4 border-red-500 rounded-lg p-4 mb-6">
          <p className="text-red-800 font-semibold">{error}</p>
        </div>
      )}

      {/* Organizations List */}
      {loading ? (
        <div className="neo-card bg-white p-12 text-center">
          <div className="animate-spin text-6xl mb-4">⚙️</div>
          <p className="text-gray-600 font-bold">Loading organizations...</p>
        </div>
      ) : organizations.length === 0 ? (
        <div className="neo-card bg-white p-12 text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-2xl font-bold mb-2">No organizations found</h3>
          <p className="text-gray-600">
            {search ? 'Try a different search term' : 'No organizations in the system yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {organizations.map((org: any) => (
            <Link
              key={org.id}
              href={`/superadmin/organizations/${org.id}`}
              className="neo-card bg-white p-6 hover:shadow-xl transition-shadow block"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2">{org.name}</h3>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className={`px-3 py-1 rounded-lg border-2 font-bold text-sm ${getPlanBadgeColor(org.effectivePlan)}`}>
                      {org.effectivePlan.toUpperCase()}
                      {org.wg_plan && ' (WG)'}
                    </span>
                    {org.hasActiveSubscription && (
                      <span className="px-3 py-1 rounded-lg border-2 font-bold text-sm bg-green-100 text-green-800 border-green-300">
                        ✓ Active Sub
                      </span>
                    )}
                    {org.subscriptionCancelAtPeriodEnd && (
                      <span className="px-3 py-1 rounded-lg border-2 font-bold text-sm bg-orange-100 text-orange-800 border-orange-300">
                        ⚠️ Canceling
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div><strong>Users:</strong> {org.users?.length || 0} ({org.users?.[0]?.email})</div>
                    <div><strong>Bots:</strong> {org.websiteCount} / {org.max_websites}</div>
                    <div><strong>Credits:</strong> {org.credits_balance} {org.frozen_credits > 0 && `(${org.frozen_credits} frozen)`}</div>
                    <div><strong>Created:</strong> {new Date(org.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="text-4xl">→</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}




