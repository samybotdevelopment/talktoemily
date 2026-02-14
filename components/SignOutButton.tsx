'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

export function SignOutButton() {
  const t = useTranslations('auth');
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  };

  return (
    <button onClick={handleSignOut} className="neo-button-secondary">
      {t('signOut')}
    </button>
  );
}
