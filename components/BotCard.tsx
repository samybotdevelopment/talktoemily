'use client';

import Link from 'next/link';
import { useState } from 'react';
import { formatRelativeTime } from '@/lib/utils/helpers';
import { useTranslations } from 'next-intl';

interface BotCardProps {
  website: {
    id: string;
    display_name: string;
    domain: string;
    icon_url?: string;
    primary_color: string;
    created_at: string;
    is_active: boolean;
  };
}

export function BotCard({ website }: BotCardProps) {
  const t = useTranslations('dashboard');
  const tTime = useTranslations('time');
  const tCommon = useTranslations('common');
  const [showModal, setShowModal] = useState(false);

  if (!website.is_active) {
    return (
      <>
        <div
          onClick={() => setShowModal(true)}
          className="neo-card bg-gray-100 p-6 opacity-60 cursor-pointer hover:opacity-75 transition-opacity relative"
        >
          <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded text-xs font-bold">
            {t('inactive')}
          </div>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {website.icon_url ? (
                <img
                  src={website.icon_url}
                  alt={website.display_name}
                  className="w-12 h-12 rounded-lg border-2 border-black grayscale"
                />
              ) : (
                <div
                  className="w-12 h-12 rounded-lg border-2 border-black flex items-center justify-center font-bold text-xl grayscale"
                  style={{ backgroundColor: website.primary_color }}
                >
                  {website.display_name[0]}
                </div>
              )}
              <div>
                <h3 className="text-xl font-bold text-gray-600">{website.display_name}</h3>
                <p className="text-sm text-gray-500">{website.domain}</p>
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-500">
            {t('created')} {formatRelativeTime(website.created_at, tTime)}
          </p>
          <p className="text-sm text-red-600 font-semibold mt-2">
            {t('clickToReactivate')}
          </p>
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="neo-card bg-white p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold mb-4">{t('botDeactivatedTitle')}</h2>
              <p className="text-gray-700 mb-6">
                {t('botDeactivatedMessage', { name: website.display_name })}
              </p>
              <p className="text-gray-700 mb-6">
                {t('upgradeToReactivate')}
              </p>
              <div className="flex gap-3">
                <Link
                  href="/settings/subscription"
                  className="neo-button-primary flex-1 text-center"
                >
                  {t('upgradePlan')}
                </Link>
                <button
                  onClick={() => setShowModal(false)}
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

  return (
    <Link
      href={`/websites/${website.id}`}
      className="neo-card bg-white p-6 hover:scale-[1.02] transition-transform"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {website.icon_url ? (
            <img
              src={website.icon_url}
              alt={website.display_name}
              className="w-12 h-12 rounded-lg border-2 border-black"
            />
          ) : (
            <div
              className="w-12 h-12 rounded-lg border-2 border-black flex items-center justify-center font-bold text-xl"
              style={{ backgroundColor: website.primary_color }}
            >
              {website.display_name[0]}
            </div>
          )}
          <div>
            <h3 className="text-xl font-bold">{website.display_name}</h3>
            <p className="text-sm text-gray-600">{website.domain}</p>
          </div>
        </div>
      </div>
      <p className="text-sm text-gray-500">
        {t('created')} {formatRelativeTime(website.created_at, tTime)}
      </p>
    </Link>
  );
}


