'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TestChatWidget } from '@/components/TestChatWidget';

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
      alert('Failed to toggle widget. Please try again.');
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
              <h3 className="text-xl sm:text-2xl font-bold">Wonder George Website</h3>
              <button
                onClick={() => setShowTestWidget(true)}
                className="neo-button-primary text-sm sm:text-base w-full sm:w-auto"
              >
                Test My Chatbot
              </button>
            </div>
            
            <p className="text-sm sm:text-base text-gray-600 mb-6">
              Your chatbot widget is automatically managed on your Wonder George website
            </p>
            
            <div className="flex items-center justify-between p-4 sm:p-6 bg-gradient-to-r from-fuchsia-50 to-pink-50 rounded-lg border-4 border-fuchsia-primary">
              <div>
                <p className="font-bold text-lg mb-1">
                  Widget is {isWidgetActivated ? 'Active' : 'Inactive'}
                </p>
                <p className="text-sm text-gray-600">
                  {isWidgetActivated 
                    ? 'Your chatbot is visible on your Wonder George website'
                    : 'Your chatbot is hidden from your Wonder George website'}
                </p>
              </div>
              <button
                onClick={handleToggleWidget}
                disabled={isActivating}
                className={`neo-button-${isWidgetActivated ? 'secondary' : 'primary'} px-6`}
              >
                {isActivating 
                  ? 'Processing...' 
                  : isWidgetActivated 
                  ? 'Deactivate' 
                  : 'Activate'}
              </button>
            </div>
            
            {latestRunStatus === 'completed' ? (
              <div className="mt-4 p-3 sm:p-4 bg-green-50 border-4 border-green-500 rounded-lg">
                <p className="text-green-800 font-bold text-sm sm:text-base">Your chatbot is trained and ready!</p>
              </div>
            ) : (
              <div className="mt-4 p-3 sm:p-4 bg-blue-50 border-4 border-blue-500 rounded-lg">
                <p className="text-blue-800 font-bold text-sm sm:text-base">Not trained yet</p>
                <p className="text-blue-700 text-xs sm:text-sm mt-2">
                  Train your chatbot to enable AI responses. <Link href={`/websites/${websiteId}/training`} className="underline font-bold">Add training content</Link>
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Embed Code - Show only for non-WG customers */
          <div className="neo-card bg-white p-4 sm:p-8 mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <h3 className="text-xl sm:text-2xl font-bold">Embed Code</h3>
              <button
                onClick={() => setShowTestWidget(true)}
                className="neo-button-primary text-sm sm:text-base w-full sm:w-auto"
              >
                Test My Chatbot
              </button>
            </div>
            
            <p className="text-sm sm:text-base text-gray-600 mb-4">
              Add this code to your website's HTML, just before the closing &lt;/body&gt; tag:
            </p>
            <div className="bg-gray-900 text-green-400 p-3 sm:p-4 rounded-lg font-mono text-xs sm:text-sm overflow-x-auto">
              <pre>{`<script>
  window.EmilyChat = { websiteId: "${websiteId}" };
</script>
<script src="${process.env.NEXT_PUBLIC_APP_URL || 'https://talktoemily.com'}/widget/emily-loader.js"></script>`}</pre>
            </div>
            
            {latestRunStatus === 'completed' ? (
              <div className="mt-4 p-3 sm:p-4 bg-green-50 border-4 border-green-500 rounded-lg">
                <p className="text-green-800 font-bold text-sm sm:text-base">Your chatbot is trained and ready!</p>
              </div>
            ) : (
              <div className="mt-4 p-3 sm:p-4 bg-blue-50 border-4 border-blue-500 rounded-lg">
                <p className="text-blue-800 font-bold text-sm sm:text-base">Not trained yet</p>
                <p className="text-blue-700 text-xs sm:text-sm mt-2">
                  The widget will appear on your site, but train your chatbot to enable AI responses. <Link href={`/websites/${websiteId}/training`} className="underline font-bold">Add training content</Link>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Overview Cards */}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="neo-card bg-white p-6">
            <h3 className="text-sm font-bold text-gray-600 mb-2">TRAINING STATUS</h3>
            {latestRunStatus ? (
              <>
                <p className="text-2xl font-bold capitalize mb-2">{latestRunStatus}</p>
                <p className="text-sm text-gray-600">
                  {trainingCount || 0} training items
                </p>
              </>
            ) : (
              <p className="text-2xl font-bold">Not Trained</p>
            )}
          </div>

          <div className="neo-card bg-white p-6">
            <h3 className="text-sm font-bold text-gray-600 mb-2">CONVERSATIONS</h3>
            <p className="text-2xl font-bold">{conversationsCount || 0}</p>
            <p className="text-sm text-gray-600">Total conversations</p>
          </div>

          <div className="neo-card bg-white p-6">
            <h3 className="text-sm font-bold text-gray-600 mb-2">WIDGET STATUS</h3>
            <p className="text-2xl font-bold">
              {latestRunStatus === 'completed' ? 'Ready' : 'Not Ready'}
            </p>
            <p className="text-sm text-gray-600">
              {latestRunStatus === 'completed' 
                ? 'Widget is live' 
                : 'Train your bot first'}
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
