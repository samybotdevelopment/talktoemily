'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface CreditPack {
  credits: number;
  amount: number;
  name: string;
  perMessage: string;
  savings?: string;
  popular?: boolean;
}

const creditPacks: CreditPack[] = [
  {
    credits: 500,
    amount: 9,
    name: 'Starter Pack',
    perMessage: '€0.018',
  },
  {
    credits: 5000,
    amount: 49,
    name: 'Growth Pack',
    perMessage: '€0.0098',
    savings: 'Save 46%',
    popular: true,
  },
  {
    credits: 50000,
    amount: 299,
    name: 'Business Pack',
    perMessage: '€0.00598',
    savings: 'Save 67%',
  },
];

interface CreditPacksClientProps {
  hasActiveSubscription: boolean;
}

export function CreditPacksClient({ hasActiveSubscription }: CreditPacksClientProps) {
  const router = useRouter();
  const [loadingPack, setLoadingPack] = useState<number | null>(null);

  const handlePurchase = async (credits: number, amount: number) => {
    try {
      setLoadingPack(credits);
      
      const response = await fetch('/api/stripe/checkout/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credits, amount }),
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
      console.error('Error creating checkout:', error);
      alert('Failed to start checkout. Please try again.');
      setLoadingPack(null);
    }
  };

  return (
    <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
      {creditPacks.map((pack) => (
        <div
          key={pack.credits}
          className={`neo-card bg-white p-6 hover:scale-[1.02] transition-transform relative flex flex-col ${
            pack.popular ? 'border-4 border-fuchsia-primary' : ''
          }`}
        >
          {pack.popular && (
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-fuchsia-primary text-white px-4 py-1 rounded-full text-sm font-bold">
              POPULAR
            </div>
          )}
          <div className="text-center mb-4">
            <h3 className="text-2xl font-bold mb-2">{pack.name}</h3>
            <div className="text-4xl font-bold text-fuchsia-primary mb-2">€{pack.amount}</div>
            <div className="text-gray-600">{pack.credits.toLocaleString()} credits</div>
            {pack.savings && (
              <div className="text-green-600 font-bold text-sm">{pack.savings}</div>
            )}
          </div>
          <ul className="space-y-2 mb-6 text-sm flex-grow">
            <li className="flex items-center gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>{pack.credits.toLocaleString()} AI message exchanges</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>Never expires</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>{pack.perMessage} per message</span>
            </li>
          </ul>
          <button
            onClick={() => handlePurchase(pack.credits, pack.amount)}
            disabled={!hasActiveSubscription || loadingPack === pack.credits}
            className="neo-button-primary w-full disabled:bg-gray-300 disabled:cursor-not-allowed mt-auto"
          >
            {loadingPack === pack.credits ? 'Loading...' : 'Purchase'}
          </button>
        </div>
      ))}
    </div>
  );
}

