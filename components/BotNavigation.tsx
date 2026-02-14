'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

interface BotNavigationProps {
  websiteId: string;
  websiteName: string;
  websiteColor?: string;
}

export function BotNavigation({ websiteId, websiteName, websiteColor }: BotNavigationProps) {
  const t = useTranslations('botNav');
  const tCommon = useTranslations('common');
  const pathname = usePathname();
  const router = useRouter();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isActive = (path: string) => pathname?.startsWith(path);
  const isExactPath = (path: string) => pathname === path;

  const handleDelete = async () => {
    setIsDeleting(true);
    
    try {
      const response = await fetch(`/api/websites/${websiteId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete bot');
      }
      
      router.push('/dashboard');
    } catch (error) {
      console.error('Error deleting bot:', error);
      alert(t('deleteError'));
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <>
      <div className="bg-white border-b-2 border-gray-200">
        <div className="neo-container py-4">
          {/* Back to Dashboard + Bot Name */}
          <div className="flex items-center gap-4 mb-4">
            <Link 
              href="/dashboard" 
              className="text-gray-600 hover:text-black transition-colors text-sm font-medium"
            >
              {tCommon('backToDashboard')}
            </Link>
            <div className="text-gray-400">|</div>
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded border-2 border-black flex items-center justify-center font-bold text-sm"
                style={{ backgroundColor: websiteColor || '#E91E63' }}
              >
                {websiteName[0]}
              </div>
              <span className="font-bold text-lg">{websiteName}</span>
            </div>
          </div>

          {/* Bot-Specific Navigation */}
          <div className="flex items-center gap-6 overflow-x-auto">
            <Link 
              href={`/websites/${websiteId}`}
              className={`font-bold hover:text-fuchsia-primary transition-colors whitespace-nowrap pb-1 ${isExactPath(`/websites/${websiteId}`) ? 'text-fuchsia-primary border-b-2 border-fuchsia-primary' : ''}`}
            >
              {t('overview')}
            </Link>
            <Link 
              href={`/websites/${websiteId}/training`}
              className={`font-bold hover:text-fuchsia-primary transition-colors whitespace-nowrap pb-1 ${isActive(`/websites/${websiteId}/training`) ? 'text-fuchsia-primary border-b-2 border-fuchsia-primary' : ''}`}
            >
              {t('training')}
            </Link>
            <Link 
              href={`/websites/${websiteId}/conversations`}
              className={`font-bold hover:text-fuchsia-primary transition-colors whitespace-nowrap pb-1 ${isActive(`/websites/${websiteId}/conversations`) ? 'text-fuchsia-primary border-b-2 border-fuchsia-primary' : ''}`}
            >
              {t('conversations')}
            </Link>
            <Link 
              href={`/websites/${websiteId}/settings`}
              className={`font-bold hover:text-fuchsia-primary transition-colors whitespace-nowrap pb-1 ${isActive(`/websites/${websiteId}/settings`) ? 'text-fuchsia-primary border-b-2 border-fuchsia-primary' : ''}`}
            >
              {t('settings')}
            </Link>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="font-bold text-red-600 hover:text-red-700 transition-colors whitespace-nowrap pb-1"
            >
              {t('delete')}
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
          <div className="neo-card bg-white p-6 sm:p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4 text-red-600">{t('deleteModalTitle')}</h2>
            <p className="text-gray-700 mb-6">
              {t('deleteModalDescription', { name: websiteName })}
            </p>
            <ul className="list-disc list-inside mb-6 text-gray-700 space-y-2">
              <li>{t('deleteItem1')}</li>
              <li>{t('deleteItem2')}</li>
              <li>{t('deleteItem3')}</li>
              <li>{t('deleteItem4')}</li>
            </ul>
            <p className="text-red-600 font-bold mb-6">
              {t('deleteWarning')}
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="neo-button-secondary flex-1"
              >
                {tCommon('cancel')}
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg border-2 border-red-900 transition-colors disabled:bg-gray-400"
              >
                {isDeleting ? t('deleting') : t('deleteForever')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
