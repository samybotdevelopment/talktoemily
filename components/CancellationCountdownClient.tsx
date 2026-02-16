'use client';

import { CancellationCountdown } from './CancellationCountdown';

interface CancellationCountdownClientProps {
  endDate: string;
}

export function CancellationCountdownClient({ endDate }: CancellationCountdownClientProps) {
  const handleReactivate = async () => {
    // Redirect to Stripe portal to reactivate
    const response = await fetch('/api/stripe/portal', {
      method: 'POST',
    });

    if (response.ok) {
      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } else {
      alert('Failed to access billing portal. Please try again.');
    }
  };

  return <CancellationCountdown endDate={endDate} onReactivate={handleReactivate} />;
}




