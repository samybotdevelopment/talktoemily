'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface SubscribeButtonProps {
  plan: 'starter' | 'pro';
  currentPlan: string;
  isWGLinked: boolean;
  disabled?: boolean;
}

export function SubscribeButton({ plan, currentPlan, isWGLinked, disabled }: SubscribeButtonProps) {
  const t = useTranslations('subscription');
  const tCommon = useTranslations('common');
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/stripe/checkout/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create checkout');
      }

      const { url } = await response.json();
      
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
      alert(t('checkoutError'));
      setLoading(false);
    }
  };

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
      alert(t('portalError'));
      setLoading(false);
    }
  };

  // Don't show button for WG customers
  if (isWGLinked) {
    return (
      <div className="text-center text-sm text-gray-600 mt-4">
        {t('managedByWonderGeorge')}
      </div>
    );
  }

  // Check if this is current plan
  if (currentPlan === plan) {
    // If it's a paid plan, show "Manage" button that goes to Stripe portal
    if (plan === 'starter' || plan === 'pro') {
      return (
        <button
          onClick={handleManage}
          disabled={loading}
          className="neo-button-primary w-full mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? tCommon('loading') : t('manage')}
        </button>
      );
    }
    // For free plan, show disabled "Current Plan" button
    return (
      <button disabled className="neo-button-secondary w-full mt-4 opacity-50 cursor-not-allowed">
        {t('currentPlanButton')}
      </button>
    );
  }

  // Check if this is a downgrade (not allowed) - don't show button
  const planOrder = { free: 0, starter: 1, pro: 2 };
  const currentOrder = planOrder[currentPlan as keyof typeof planOrder] || 0;
  const targetOrder = planOrder[plan];
  
  if (currentOrder >= targetOrder) {
    return null; // Don't show any button for downgrades
  }

  return (
    <button
      onClick={handleSubscribe}
      disabled={loading || disabled}
      className="neo-button-primary w-full mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? tCommon('loading') : tCommon('upgrade')}
    </button>
  );
}

