'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function SignupPage() {
  const t = useTranslations('auth.signup');
  const tCommon = useTranslations('common');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
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
        throw new Error(data.error || t('error'));
      }

      // Check if email verification is required
      if (data.requiresEmailVerification) {
        setSuccess(true);
        setLoading(false);
        return;
      }

      // Legacy flow: if no verification required, sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(t('createdButSignInFailed'));
        setLoading(false);
        return;
      }

      // Subscribe to newsletter (don't block on failure)
      try {
        await fetch('/api/auth/subscribe-newsletter', {
          method: 'POST',
        });
      } catch (newsletterError) {
        console.error('Failed to subscribe to newsletter:', newsletterError);
        // Continue anyway - this is non-critical
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-page px-4">
      <div className="neo-card bg-white p-8 w-full max-w-md">
        <h1 className="text-4xl font-bold mb-2">{t('title')}</h1>
        <p className="text-gray-600 mb-8">{t('subtitle')}</p>

        {error && (
          <div className="bg-red-50 border-4 border-red-500 rounded-lg p-4 mb-6">
            <p className="text-red-800 font-semibold">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border-4 border-green-500 rounded-lg p-4 mb-6">
            <h3 className="text-green-800 font-bold mb-2">✓ {t('accountCreated')}</h3>
            <p className="text-green-700 mb-3">
              {t('confirmationEmailSent')} <strong>{email}</strong>.
            </p>
            <p className="text-green-700 text-sm">
              {t('checkInboxAndVerify')}
            </p>
          </div>
        )}

        {!success && (
          <form onSubmit={handleSignup}>
          <div className="mb-6">
            <label htmlFor="orgName" className="block text-sm font-bold mb-2">
              {t('orgName')}
            </label>
            <input
              id="orgName"
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="neo-input w-full"
              placeholder={t('orgNamePlaceholder')}
              required
            />
          </div>

          <div className="mb-6">
            <label htmlFor="email" className="block text-sm font-bold mb-2">
              {t('email')}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="neo-input w-full"
              placeholder={t('emailPlaceholder')}
              required
            />
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-bold mb-2">
              {t('password')}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="neo-input w-full"
              placeholder={t('passwordPlaceholder')}
              required
              minLength={6}
            />
            <p className="text-xs text-gray-500 mt-1">
              {t('passwordHint')}
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="neo-button-primary w-full mb-4"
          >
            {loading ? t('creating') : t('submit')}
          </button>
        </form>
        )}

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            {t('hasAccount')}{' '}
            <Link href="/auth/login" className="font-bold text-fuchsia-primary hover:underline">
              {t('login')}
            </Link>
          </p>
        </div>

        {!success && (
          <div className="mt-6 p-4 bg-page rounded-lg border-4 border-black">
            <h3 className="font-bold mb-2">{t('freeTrialTitle')}</h3>
            <ul className="text-sm space-y-1">
              <li>✓ {t('freeTrialFeature1')}</li>
              <li>✓ {t('freeTrialFeature2')}</li>
              <li>✓ {t('freeTrialFeature3')}</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
