'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Call backend API to create user and organization
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          orgName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      // Account created! Now sign in to establish session
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError('Account created but failed to sign in. Please try logging in.');
        setLoading(false);
        return;
      }

      // Check if user needs onboarding (WG customer)
      if (data.needs_onboarding) {
        router.push('/onboarding');
      } else {
        router.push('/dashboard');
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-page px-4">
      <div className="neo-card bg-white p-8 w-full max-w-md">
        <h1 className="text-4xl font-bold mb-2">Join Emily</h1>
        <p className="text-gray-600 mb-8">Create your account and start building</p>

        {error && (
          <div className="bg-red-50 border-4 border-red-500 rounded-lg p-4 mb-6">
            <p className="text-red-800 font-semibold">{error}</p>
          </div>
        )}

        <form onSubmit={handleSignup}>
          <div className="mb-6">
            <label htmlFor="orgName" className="block text-sm font-bold mb-2">
              Organization Name
            </label>
            <input
              id="orgName"
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="neo-input w-full"
              placeholder="My Company"
              required
            />
          </div>

          <div className="mb-6">
            <label htmlFor="email" className="block text-sm font-bold mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="neo-input w-full"
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-bold mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="neo-input w-full"
              placeholder="••••••••"
              required
              minLength={6}
            />
            <p className="text-xs text-gray-500 mt-1">
              At least 6 characters
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="neo-button-primary w-full mb-4"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/auth/login" className="font-bold text-fuchsia-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>

        <div className="mt-6 p-4 bg-page rounded-lg border-4 border-black">
          <h3 className="font-bold mb-2">Free Trial Includes:</h3>
          <ul className="text-sm space-y-1">
            <li>✓ 1 training run (lifetime)</li>
            <li>✓ 50 AI messages (lifetime)</li>
            <li>✓ 1 website</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
