'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/superadmin/stats');
      
      if (response.status === 403) {
        router.push('/dashboard');
        return;
      }
      
      if (response.status === 401) {
        router.push('/login');
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="neo-container py-8">
        <div className="neo-card bg-white p-12 text-center">
          <div className="animate-spin text-6xl mb-4">⚙️</div>
          <p className="text-gray-600 font-bold">Loading dashboard...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="neo-container py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Superadmin Dashboard</h1>
        <p className="text-gray-600">System overview and management</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Organizations */}
        <div className="neo-card bg-white p-6">
          <div className="text-sm text-gray-600 font-bold mb-2">Total Organizations</div>
          <div className="text-4xl font-bold text-blue-600">
            {stats?.totalOrganizations || 0}
          </div>
        </div>

        {/* Total Users */}
        <div className="neo-card bg-white p-6">
          <div className="text-sm text-gray-600 font-bold mb-2">Total Users</div>
          <div className="text-4xl font-bold text-green-600">
            {stats?.totalUsers || 0}
          </div>
        </div>

        {/* Paying Customers */}
        <div className="neo-card bg-white p-6">
          <div className="text-sm text-gray-600 font-bold mb-2">Paying Customers</div>
          <div className="text-4xl font-bold text-purple-600">
            {stats?.payingCustomers || 0}
          </div>
        </div>

        {/* Active MRR */}
        <div className="neo-card bg-white p-6">
          <div className="text-sm text-gray-600 font-bold mb-2">Active MRR</div>
          <div className="text-4xl font-bold text-indigo-600">
            €{stats?.activeMRR?.toFixed(2) || '0.00'}
          </div>
        </div>

        {/* Total Conversations */}
        <div className="neo-card bg-white p-6">
          <div className="text-sm text-gray-600 font-bold mb-2">Total Conversations</div>
          <div className="text-4xl font-bold text-orange-600">
            {stats?.totalConversations || 0}
          </div>
        </div>

        {/* Total Messages */}
        <div className="neo-card bg-white p-6">
          <div className="text-sm text-gray-600 font-bold mb-2">Total Messages</div>
          <div className="text-4xl font-bold text-pink-600">
            {stats?.totalMessages || 0}
          </div>
        </div>

        {/* Current Month Revenue */}
        <div className="neo-card bg-white p-6">
          <div className="text-sm text-gray-600 font-bold mb-2">Current Month Revenue</div>
          <div className="text-4xl font-bold text-emerald-600">
            €{stats?.currentMonthRevenue?.toFixed(2) || '0.00'}
          </div>
        </div>

        {/* Placeholder for future metric */}
        <div className="neo-card bg-gray-100 p-6 opacity-50">
          <div className="text-sm text-gray-600 font-bold mb-2">Coming Soon</div>
          <div className="text-4xl font-bold text-gray-400">
            ---
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <Link href="/superadmin/organizations" className="neo-card bg-white p-8 hover:shadow-xl transition-shadow block">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold mb-2">Manage Organizations</h3>
              <p className="text-gray-600">View, search, and manage all organizations</p>
            </div>
            <div className="text-5xl">🏢</div>
          </div>
        </Link>

        <div className="neo-card bg-gray-100 p-8 opacity-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold mb-2">System Logs</h3>
              <p className="text-gray-600">Coming soon...</p>
            </div>
            <div className="text-5xl">📋</div>
          </div>
        </div>
      </div>

      {/* Back to Dashboard */}
      <div className="mt-8">
        <Link href="/dashboard" className="neo-button-secondary">
          ← Back to Dashboard
        </Link>
      </div>
    </main>
  );
}

