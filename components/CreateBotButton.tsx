'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface CreateBotButtonProps {
  canAddWebsite: boolean;
  currentWebsites: number;
  maxWebsites: number;
  incompleteBot?: {
    id: string;
    name: string;
  } | null;
}

export function CreateBotButton({
  canAddWebsite,
  currentWebsites,
  maxWebsites,
  incompleteBot,
}: CreateBotButtonProps) {
  const router = useRouter();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    if (!canAddWebsite) {
      e.preventDefault();
      setShowUpgradeModal(true);
    }
  };

  return (
    <>
      {incompleteBot ? (
        <Link
          href={`/onboarding?websiteId=${incompleteBot.id}`}
          className="neo-button-secondary"
        >
          Complete {incompleteBot.name} creation →
        </Link>
      ) : (
        <Link
          href="/onboarding?new=true"
          onClick={handleClick}
          className="neo-button-primary"
        >
          + Create Chatbot
        </Link>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="neo-card bg-white p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Chatbot Limit Reached</h2>
            <p className="text-gray-700 mb-2">
              You've reached your plan limit of <strong>{maxWebsites} chatbot{maxWebsites !== 1 ? 's' : ''}</strong>.
            </p>
            <p className="text-gray-700 mb-6">
              Upgrade to the <strong>Pro plan</strong> to create up to 5 chatbots.
            </p>
            <div className="flex gap-4">
              <Link
                href="/settings/subscription"
                className="neo-button-primary flex-1 text-center"
              >
                Upgrade Plan
              </Link>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="neo-button-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

