'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

export function ManageSubscriptionButton() {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');
  const [loading, setLoading] = useState(false);

  const handleManage = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to create portal session');
      }

      const { url } = await response.json();
      
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error accessing portal:', error);
      alert(t('manageSubscriptionError'));
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleManage}
      disabled={loading}
      className="neo-button-primary disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
    >
      {loading ? tCommon('loading') : t('manageSubscription')}
    </button>
  );
}


