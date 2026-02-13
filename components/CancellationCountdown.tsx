'use client';

import { useState, useEffect } from 'react';

interface CancellationCountdownProps {
  endDate: string; // ISO timestamp
  onReactivate: () => void;
}

export function CancellationCountdown({ endDate, onReactivate }: CancellationCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const end = new Date(endDate).getTime();
      const now = new Date().getTime();
      const difference = end - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        setTimeLeft(null);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [endDate]);

  const handleReactivate = async () => {
    setLoading(true);
    try {
      onReactivate();
    } catch (error) {
      console.error('Error reactivating:', error);
      setLoading(false);
    }
  };

  if (!timeLeft) return null;

  return (
    <div className="neo-card bg-orange-50 border-4 border-orange-500 p-6 mb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="font-bold text-xl mb-2 text-orange-800">
            ⚠️ Subscription Canceling
          </h3>
          <p className="text-gray-700 mb-3">
            Your subscription will end in:
          </p>
          <div className="flex gap-4 text-center">
            <div className="bg-white border-2 border-black p-3 rounded min-w-[70px]">
              <div className="text-2xl font-bold text-fuchsia-primary">{timeLeft.days}</div>
              <div className="text-xs text-gray-600">days</div>
            </div>
            <div className="bg-white border-2 border-black p-3 rounded min-w-[70px]">
              <div className="text-2xl font-bold text-fuchsia-primary">{timeLeft.hours}</div>
              <div className="text-xs text-gray-600">hours</div>
            </div>
            <div className="bg-white border-2 border-black p-3 rounded min-w-[70px]">
              <div className="text-2xl font-bold text-fuchsia-primary">{timeLeft.minutes}</div>
              <div className="text-xs text-gray-600">minutes</div>
            </div>
            <div className="bg-white border-2 border-black p-3 rounded min-w-[70px]">
              <div className="text-2xl font-bold text-fuchsia-primary">{timeLeft.seconds}</div>
              <div className="text-xs text-gray-600">seconds</div>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={handleReactivate}
            disabled={loading}
            className="neo-button-primary whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : 'Keep My Subscription'}
          </button>
          <p className="text-xs text-gray-600 text-center">
            Click to reactivate before it ends
          </p>
        </div>
      </div>
      <div className="mt-4 p-3 bg-white border-2 border-orange-300 rounded">
        <p className="text-sm text-gray-700">
          <strong>What happens after cancellation:</strong> Your plan will downgrade to Free (1 bot only). 
          If you have multiple bots, the oldest will stay active and others will be deactivated.
        </p>
      </div>
    </div>
  );
}

