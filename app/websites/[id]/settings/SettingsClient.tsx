'use client';

import { useState } from 'react';
import { TestChatWidget } from '@/components/TestChatWidget';

interface SettingsClientProps {
  websiteId: string;
  websiteName: string;
  websiteDomain: string;
  primaryColor: string;
  widgetStyle: 'modern' | 'neutral';
  widgetSubtitle: string;
  widgetWelcomeTitle: string;
  widgetWelcomeMessage: string;
  wgWebsiteId: string | null;
  widgetActivated: boolean;
}

export function SettingsClient({ 
  websiteId, 
  websiteName, 
  websiteDomain, 
  primaryColor, 
  widgetStyle: initialStyle,
  widgetSubtitle: initialSubtitle,
  widgetWelcomeTitle: initialWelcomeTitle,
  widgetWelcomeMessage: initialWelcomeMessage,
  wgWebsiteId,
  widgetActivated: initialWidgetActivated,
}: SettingsClientProps) {
  const [widgetStyle, setWidgetStyle] = useState<'modern' | 'neutral'>(initialStyle);
  const [widgetSubtitle, setWidgetSubtitle] = useState(initialSubtitle);
  const [widgetWelcomeTitle, setWidgetWelcomeTitle] = useState(initialWelcomeTitle);
  const [widgetWelcomeMessage, setWidgetWelcomeMessage] = useState(initialWelcomeMessage);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [widgetActivated, setWidgetActivated] = useState(initialWidgetActivated);
  const [activating, setActivating] = useState(false);

  const handleStyleChange = (newStyle: 'modern' | 'neutral') => {
    setWidgetStyle(newStyle);
    setHasChanges(true);
    setSaved(false);
  };

  const handleSubtitleChange = (value: string) => {
    setWidgetSubtitle(value);
    setHasChanges(true);
    setSaved(false);
  };

  const handleWelcomeTitleChange = (value: string) => {
    setWidgetWelcomeTitle(value);
    setHasChanges(true);
    setSaved(false);
  };

  const handleWelcomeMessageChange = (value: string) => {
    setWidgetWelcomeMessage(value);
    setHasChanges(true);
    setSaved(false);
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setSaved(false);
    
    try {
      const response = await fetch(`/api/websites/${websiteId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          widget_style: widgetStyle,
          widget_subtitle: widgetSubtitle,
          widget_welcome_title: widgetWelcomeTitle,
          widget_welcome_message: widgetWelcomeMessage,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update settings');
      }
      
      setHasChanges(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error updating settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleWidget = async () => {
    setActivating(true);
    
    try {
      const response = await fetch(`/api/websites/${websiteId}/widget-activation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activate: !widgetActivated,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to toggle widget');
      }
      
      setWidgetActivated(!widgetActivated);
    } catch (error) {
      console.error('Error toggling widget:', error);
      alert('Failed to toggle widget. Please try again.');
    } finally {
      setActivating(false);
    }
  };

  return (
    <>
      <main className="neo-container py-4 sm:py-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold">Chatbot Settings</h1>
            <div className="flex gap-2">
              <button
                onClick={() => setShowPreview(true)}
                className="neo-button-secondary text-sm sm:text-base px-4 py-2"
              >
                Preview
              </button>
              <button
                onClick={handleSaveAll}
                disabled={!hasChanges || saving}
                className={`neo-button-primary text-sm sm:text-base px-4 py-2 ${!hasChanges ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
              </button>
            </div>
          </div>

          {saved && (
            <div className="mb-6 p-4 bg-green-50 border-4 border-green-500 rounded-lg">
              <p className="text-green-800 font-bold">Settings saved successfully!</p>
            </div>
          )}

          {/* Widget Activation (WG customers only) */}
          {wgWebsiteId && (
            <div className="neo-card bg-white p-6 sm:p-8 mb-6">
              <h2 className="text-xl sm:text-2xl font-bold mb-4">Widget Status</h2>
              <p className="text-sm text-gray-600 mb-6">
                Control whether your chatbot widget is active on your Wonder George website
              </p>

              <div className="flex items-center justify-between p-4 bg-page rounded-lg border-2 border-black">
                <div>
                  <p className="font-bold">Widget is {widgetActivated ? 'Active ✓' : 'Inactive'}</p>
                  <p className="text-sm text-gray-600">
                    {widgetActivated 
                      ? 'Your chatbot is visible on your website'
                      : 'Your chatbot is hidden from your website'}
                  </p>
                </div>
                <button
                  onClick={handleToggleWidget}
                  disabled={activating}
                  className={`neo-button-${widgetActivated ? 'secondary' : 'primary'} px-6`}
                >
                  {activating 
                    ? 'Processing...' 
                    : widgetActivated 
                    ? 'Deactivate' 
                    : 'Activate'}
                </button>
              </div>
            </div>
          )}
          
          {/* Widget Style */}
          <div className="neo-card bg-white p-6 sm:p-8 mb-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-4">Widget Style</h2>
            <p className="text-sm text-gray-600 mb-6">
              Choose how your chat widget looks to visitors on your website
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              {/* Modern Style */}
              <button
                onClick={() => handleStyleChange('modern')}
                className={`p-4 sm:p-6 rounded-lg border-4 transition-all ${
                  widgetStyle === 'modern'
                    ? 'border-fuchsia-primary bg-fuchsia-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="aspect-video bg-gray-100 rounded-lg mb-3 flex items-center justify-center border-4 border-black">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-fuchsia-primary border-2 border-black rounded-lg mx-auto mb-2"></div>
                    <div className="text-xs font-bold">Bold & Neo-Brutalist</div>
                  </div>
                </div>
                <h3 className="font-bold mb-1">Modern</h3>
                <p className="text-xs text-gray-600">
                  Bold borders, strong shadows, standout design
                </p>
              </button>

              {/* Neutral Style */}
              <button
                onClick={() => handleStyleChange('neutral')}
                className={`p-4 sm:p-6 rounded-lg border-4 transition-all ${
                  widgetStyle === 'neutral'
                    ? 'border-fuchsia-primary bg-fuchsia-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="aspect-video bg-gray-100 rounded-lg mb-3 flex items-center justify-center border border-gray-200">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-fuchsia-primary rounded-lg mx-auto mb-2 shadow-md"></div>
                    <div className="text-xs font-bold">Clean & Minimal</div>
                  </div>
                </div>
                <h3 className="font-bold mb-1">Neutral</h3>
                <p className="text-xs text-gray-600">
                  Clean, subtle design like Intercom
                </p>
              </button>
            </div>
          </div>

          {/* Widget Messages */}
          <div className="neo-card bg-white p-6 sm:p-8 mb-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-4">Widget Messages</h2>
            <p className="text-sm text-gray-600 mb-6">
              Customize the messages visitors see when they open the chat widget
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">Header Subtitle</label>
                <input
                  type="text"
                  value={widgetSubtitle}
                  onChange={(e) => handleSubtitleChange(e.target.value)}
                  placeholder="We reply instantly"
                  className="neo-input w-full"
                  maxLength={50}
                />
                <p className="text-xs text-gray-500 mt-1">Shown under your bot name in the header</p>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">Welcome Title</label>
                <input
                  type="text"
                  value={widgetWelcomeTitle}
                  onChange={(e) => handleWelcomeTitleChange(e.target.value)}
                  placeholder="Hi there! 👋"
                  className="neo-input w-full"
                  maxLength={50}
                />
                <p className="text-xs text-gray-500 mt-1">First message when chat opens</p>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">Welcome Message</label>
                <textarea
                  value={widgetWelcomeMessage}
                  onChange={(e) => handleWelcomeMessageChange(e.target.value)}
                  placeholder="How can we help you today?"
                  className="neo-input w-full min-h-[80px]"
                  maxLength={200}
                />
                <p className="text-xs text-gray-500 mt-1">Subtitle shown below the welcome title</p>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="neo-card bg-white p-6 sm:p-8 mb-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-6">Basic Information</h2>
              
            <form>
              <div className="mb-6">
                <label className="block text-sm font-bold mb-2">Display Name</label>
                <input
                  type="text"
                  defaultValue={websiteName}
                  className="neo-input w-full"
                  disabled
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-bold mb-2">Domain</label>
                <input
                  type="text"
                  defaultValue={websiteDomain}
                  className="neo-input w-full"
                  disabled
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-bold mb-2">Primary Color</label>
                <div className="flex gap-4">
                  <input
                    type="color"
                    defaultValue={primaryColor}
                    className="w-24 h-12 border-4 border-black rounded-lg"
                    disabled
                  />
                  <input
                    type="text"
                    defaultValue={primaryColor}
                    className="neo-input flex-1"
                    disabled
                  />
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                Basic settings are view-only for now. Contact support to make changes.
              </p>
            </form>
          </div>

          {/* Danger Zone */}
          <div className="neo-card bg-white p-6 sm:p-8 mb-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 text-red-600">Danger Zone</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4">
              Deleting this chatbot will remove all training data, conversations, and settings. This action cannot be undone.
            </p>
            <button className="border-4 border-red-500 bg-red-50 text-red-700 font-bold px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-red-100 transition-colors text-sm sm:text-base">
              Delete Chatbot
            </button>
          </div>
        </div>
      </main>

      {/* Preview Widget */}
      {showPreview && (
        <TestChatWidget
          websiteId={websiteId}
          websiteName={websiteName}
          primaryColor={primaryColor}
          widgetStyle={widgetStyle}
          widgetSubtitle={widgetSubtitle}
          widgetWelcomeTitle={widgetWelcomeTitle}
          widgetWelcomeMessage={widgetWelcomeMessage}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  );
}
