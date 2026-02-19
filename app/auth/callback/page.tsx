'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = createClient();
      
      // Check if we have hash params (implicit flow - email verification)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');

      if (accessToken && refreshToken) {
        // Set the session from hash params
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          console.error('Session error:', sessionError);
          setError('Failed to establish session');
          return;
        }

        // Email verification successful
        if (type === 'signup' || type === 'email') {
          router.push('/auth/verified');
          return;
        }

        // Magic link or other auth
        router.push('/dashboard');
        return;
      }

      // Check for query params (PKCE flow - magic link, OAuth)
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get('code');
      const errorParam = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      if (errorParam) {
        setError(errorDescription || errorParam);
        return;
      }

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        
        if (exchangeError) {
          console.error('Code exchange error:', exchangeError);
          setError('Failed to verify authentication');
          return;
        }

        router.push('/dashboard');
        return;
      }

      // No valid params found
      setError('Invalid authentication link');
    };

    handleCallback();
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page px-4">
        <div className="neo-card bg-white p-6 sm:p-8 w-full max-w-md text-center">
          <h1 className="text-2xl sm:text-3xl font-bold mb-4">Authentication Error</h1>
          <p className="text-sm sm:text-base text-gray-600 mb-6">{error}</p>
          <a href="/auth/login" className="neo-button-primary block">
            Back to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-page px-4">
      <div className="neo-card bg-white p-6 sm:p-8 w-full max-w-md text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fuchsia-primary mx-auto mb-4"></div>
        <p className="text-gray-600">Verifying your email...</p>
      </div>
    </div>
  );
}




