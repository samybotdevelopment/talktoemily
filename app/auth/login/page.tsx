'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [usePassword, setUsePassword] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/dashboard');
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setMagicLinkSent(true);
      setLoading(false);
    }
  };

  if (magicLinkSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page px-4">
        <div className="neo-card bg-white p-8 w-full max-w-md">
          <h2 className="text-3xl font-bold mb-4">Check your email</h2>
          <p className="text-gray-600 mb-4">
            We've sent a magic link to <strong>{email}</strong>
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Click the link in the email to sign in. You can close this page.
          </p>
          <button
            onClick={() => setMagicLinkSent(false)}
            className="neo-button-secondary w-full"
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-page px-4">
      <div className="neo-card bg-white p-8 w-full max-w-md">
        <h1 className="text-4xl font-bold mb-2">Welcome to Emily</h1>
        <p className="text-gray-600 mb-8">Sign in to your account</p>

        {error && (
          <div className="bg-red-50 border-4 border-red-500 rounded-lg p-4 mb-6">
            <p className="text-red-800 font-semibold">{error}</p>
          </div>
        )}

        <form onSubmit={usePassword ? handlePasswordLogin : handleMagicLink}>
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

          {usePassword && (
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
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="neo-button-primary w-full mb-4"
          >
            {loading ? 'Loading...' : usePassword ? 'Sign in' : 'Send magic link'}
          </button>

          <button
            type="button"
            onClick={() => setUsePassword(!usePassword)}
            className="text-sm text-gray-600 hover:text-black w-full text-center"
          >
            {usePassword ? 'Sign in with magic link instead' : 'Sign in with password instead'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link href="/auth/signup" className="font-bold text-fuchsia-primary hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
