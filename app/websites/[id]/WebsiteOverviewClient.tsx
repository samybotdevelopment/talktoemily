'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TestChatWidget } from '@/components/TestChatWidget';
import { useTranslations } from 'next-intl';

interface WebsiteOverviewClientProps {
  websiteId: string;
  websiteName: string;
  websiteDomain: string;
  websiteColor: string;
  trainingCount: number;
  latestRunStatus?: string;
  conversationsCount: number;
  widgetStyle: 'modern' | 'neutral';
  widgetSubtitle: string;
  widgetWelcomeTitle: string;
  widgetWelcomeMessage: string;
  wgWebsiteId: string | null;
  widgetActivated: boolean;
}

export function WebsiteOverviewClient({
  websiteId,
  websiteName,
  websiteDomain,
  websiteColor,
  trainingCount,
  latestRunStatus,
  conversationsCount,
  widgetStyle,
  widgetSubtitle,
  widgetWelcomeTitle,
  widgetWelcomeMessage,
  wgWebsiteId,
  widgetActivated,
}: WebsiteOverviewClientProps) {
  const t = useTranslations('botOverview');
  const router = useRouter();
  const [showTestWidget, setShowTestWidget] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [isWidgetActivated, setIsWidgetActivated] = useState(widgetActivated);

  const handleToggleWidget = async () => {
    setIsActivating(true);
    
    try {
      const response = await fetch(`/api/websites/${websiteId}/widget-activation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activate: !isWidgetActivated,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to toggle widget');
      }
      
      setIsWidgetActivated(!isWidgetActivated);
    } catch (error) {
      console.error('Error toggling widget:', error);
      alert(t('toggleWidgetError'));
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <>
      <main className="neo-container py-4 sm:py-8">
        {/* Wonder George Widget Activation - Show only for WG customers */}
        {wgWebsiteId ? (
          <div className="neo-card bg-white p-4 sm:p-8 mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <h3 className="text-xl sm:text-2xl font-bold">{t('wonderGeorgeWebsite')}</h3>
              <button
                onClick={() => setShowTestWidget(true)}
                className="neo-button-primary text-sm sm:text-base w-full sm:w-auto"
              >
                {t('testChatbot')}
              </button>
            </div>
            
            <p className="text-sm sm:text-base text-gray-600 mb-6">
              {t('wonderGeorgeAutoManaged')}
            </p>
            
            <div className="flex items-center justify-between p-4 sm:p-6 bg-gradient-to-r from-fuchsia-50 to-pink-50 rounded-lg border-4 border-fuchsia-primary">
              <div>
                <p className="font-bold text-lg mb-1">
                  {t('widgetStatus', { status: isWidgetActivated ? t('active') : t('inactive') })}
                </p>
                <p className="text-sm text-gray-600">
                  {isWidgetActivated 
                    ? t('widgetVisibleWG')
                    : t('widgetHiddenWG')}
                </p>
              </div>
              <button
                onClick={handleToggleWidget}
                disabled={isActivating}
                className={`neo-button-${isWidgetActivated ? 'secondary' : 'primary'} px-6`}
              >
                {isActivating 
                  ? t('processing') 
                  : isWidgetActivated 
                  ? t('deactivate') 
                  : t('activate')}
              </button>
            </div>
            
            {latestRunStatus === 'completed' ? (
              <div className="mt-4 p-3 sm:p-4 bg-green-50 border-4 border-green-500 rounded-lg">
                <p className="text-green-800 font-bold text-sm sm:text-base">{t('trainedAndReady')}</p>
              </div>
            ) : (
              <div className="mt-4 p-3 sm:p-4 bg-blue-50 border-4 border-blue-500 rounded-lg">
                <p className="text-blue-800 font-bold text-sm sm:text-base">{t('notTrainedYet')}</p>
                <p className="text-blue-700 text-xs sm:text-sm mt-2">
                  {t('trainToEnable')} <Link href={`/websites/${websiteId}/training`} className="underline font-bold">{t('addTrainingContent')}</Link>
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Embed Code - Show only for non-WG customers */
        <div className="neo-card bg-white p-4 sm:p-8 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h3 className="text-xl sm:text-2xl font-bold">{t('embedCode')}</h3>
            <button
              onClick={() => setShowTestWidget(true)}
              className="neo-button-primary text-sm sm:text-base w-full sm:w-auto"
            >
              {t('testChatbot')}
            </button>
          </div>
          
          <p className="text-sm sm:text-base text-gray-600 mb-4">
            {t('embedInstructions')}
          </p>
          <div className="bg-gray-900 text-green-400 p-3 sm:p-4 rounded-lg font-mono text-xs sm:text-sm overflow-x-auto">
            <pre>{`<script>
  window.EmilyChat = { websiteId: "${websiteId}" };
</script>
<script src="${process.env.NEXT_PUBLIC_APP_URL || 'https://talktoemily.com'}/widget/emily-loader.js"></script>`}</pre>
          </div>
          
          {latestRunStatus === 'completed' ? (
            <div className="mt-4 p-3 sm:p-4 bg-green-50 border-4 border-green-500 rounded-lg">
              <p className="text-green-800 font-bold text-sm sm:text-base">{t('trainedAndReady')}</p>
            </div>
          ) : (
            <div className="mt-4 p-3 sm:p-4 bg-blue-50 border-4 border-blue-500 rounded-lg">
              <p className="text-blue-800 font-bold text-sm sm:text-base">{t('notTrainedYet')}</p>
              <p className="text-blue-700 text-xs sm:text-sm mt-2">
                {t('widgetWillAppear')} <Link href={`/websites/${websiteId}/training`} className="underline font-bold">{t('addTrainingContent')}</Link>
              </p>
            </div>
          )}
        </div>
        )}

        {/* Overview Cards */}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="neo-card bg-white p-6">
            <h3 className="text-sm font-bold text-gray-600 mb-2">{t('trainingStatusTitle')}</h3>
            {latestRunStatus ? (
              <>
                <p className="text-2xl font-bold capitalize mb-2">{t(`status.${latestRunStatus}`)}</p>
                <p className="text-sm text-gray-600">
                  {t('trainingItems', { count: trainingCount || 0 })}
                </p>
              </>
            ) : (
              <p className="text-2xl font-bold">{t('notTrained')}</p>
            )}
          </div>

          <div className="neo-card bg-white p-6">
            <h3 className="text-sm font-bold text-gray-600 mb-2">{t('conversationsTitle')}</h3>
            <p className="text-2xl font-bold">{conversationsCount || 0}</p>
            <p className="text-sm text-gray-600">{t('totalConversations')}</p>
          </div>

          <div className="neo-card bg-white p-6">
            <h3 className="text-sm font-bold text-gray-600 mb-2">{t('widgetStatusTitle')}</h3>
            <p className="text-2xl font-bold">
              {latestRunStatus === 'completed' ? t('ready') : t('notReady')}
            </p>
            <p className="text-sm text-gray-600">
              {latestRunStatus === 'completed' 
                ? t('widgetIsLive') 
                : t('trainBotFirst')}
            </p>
          </div>
        </div>
      </main>

      {/* Test Widget */}
      {showTestWidget && (
        <TestChatWidget
          websiteId={websiteId}
          websiteName={websiteName}
          primaryColor={websiteColor}
          widgetStyle={widgetStyle}
          widgetSubtitle={widgetSubtitle}
          widgetWelcomeTitle={widgetWelcomeTitle}
          widgetWelcomeMessage={widgetWelcomeMessage}
          onClose={() => setShowTestWidget(false)}
        />
      )}
    </>
  );
}
