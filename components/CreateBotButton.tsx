'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');
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
          {t('completeBotCreation', { name: incompleteBot.name })} →
        </Link>
      ) : (
        <Link
          href="/onboarding?new=true"
          onClick={handleClick}
          className="neo-button-primary"
        >
          + {t('createNewBot')}
        </Link>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="neo-card bg-white p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">{t('limitReachedTitle')}</h2>
            <p className="text-gray-700 mb-2">
              {t('limitReachedMessage', { max: maxWebsites })}
            </p>
            <p className="text-gray-700 mb-6">
              {t('upgradeToProMessage')}
            </p>
            <div className="flex gap-4">
              <Link
                href="/settings/subscription"
                className="neo-button-primary flex-1 text-center"
              >
                {t('upgradePlan')}
              </Link>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="neo-button-secondary flex-1"
              >
                {tCommon('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

