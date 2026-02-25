'use client';

import { useState } from 'react';
import { TestChatWidget } from '@/components/TestChatWidget';
import { useTranslations } from 'next-intl';

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
  strictContextOnly: boolean;
  speakingStyle: string | null;
  customRules: string | null;
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
  strictContextOnly: initialStrictContextOnly,
  speakingStyle: initialSpeakingStyle,
  customRules: initialCustomRules,
}: SettingsClientProps) {
  const t = useTranslations('botSettings');
  const tCommon = useTranslations('common');
  const [displayName, setDisplayName] = useState(websiteName);
  const [domain, setDomain] = useState(websiteDomain);
  const [color, setColor] = useState(primaryColor);
  const [widgetStyle, setWidgetStyle] = useState<'modern' | 'neutral'>(initialStyle);
  const [widgetSubtitle, setWidgetSubtitle] = useState(initialSubtitle);
  const [widgetWelcomeTitle, setWidgetWelcomeTitle] = useState(initialWelcomeTitle);
  const [widgetWelcomeMessage, setWidgetWelcomeMessage] = useState(initialWelcomeMessage);
  const [strictContextOnly, setStrictContextOnly] = useState(initialStrictContextOnly);
  const [speakingStyle, setSpeakingStyle] = useState(initialSpeakingStyle || '');
  const [customRules, setCustomRules] = useState(initialCustomRules || '');
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [widgetActivated, setWidgetActivated] = useState(initialWidgetActivated);
  const [activating, setActivating] = useState(false);

  const handleDisplayNameChange = (value: string) => {
    setDisplayName(value);
    setHasChanges(true);
    setSaved(false);
  };

  const handleDomainChange = (value: string) => {
    setDomain(value);
    setHasChanges(true);
    setSaved(false);
  };

  const handleColorChange = (value: string) => {
    setColor(value);
    setHasChanges(true);
    setSaved(false);
  };

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

  const handleStrictContextChange = (checked: boolean) => {
    setStrictContextOnly(checked);
    setHasChanges(true);
    setSaved(false);
  };

  const handleSpeakingStyleChange = (value: string) => {
    setSpeakingStyle(value);
    setHasChanges(true);
    setSaved(false);
  };

  const handleCustomRulesChange = (value: string) => {
    setCustomRules(value);
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
          display_name: displayName,
          domain: domain,
          primary_color: color,
          widget_style: widgetStyle,
          widget_subtitle: widgetSubtitle,
          widget_welcome_title: widgetWelcomeTitle,
          widget_welcome_message: widgetWelcomeMessage,
          strict_context_only: strictContextOnly,
          speaking_style: speakingStyle || null,
          custom_rules: customRules || null,
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
      alert(t('toggleWidgetError'));
    } finally {
      setActivating(false);
    }
  };

  return (
    <>
      <main className="neo-container py-4 sm:py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold">{t('title')}</h1>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <button
                onClick={() => setShowPreview(true)}
                className="neo-button-secondary text-sm sm:text-base px-4 py-2 w-full sm:w-auto"
              >
                {t('preview')}
              </button>
              <button
                onClick={handleSaveAll}
                disabled={!hasChanges || saving}
                className={`neo-button-primary text-sm sm:text-base px-4 py-2 w-full sm:w-auto ${!hasChanges ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {saving ? t('saving') : saved ? t('saved') : t('saveChanges')}
              </button>
            </div>
          </div>

          {saved && (
            <div className="mb-6 p-4 bg-green-50 border-4 border-green-500 rounded-lg">
              <p className="text-green-800 font-bold">{t('settingsSaved')}</p>
            </div>
          )}

          {/* Widget Activation (WG customers only) */}
          {wgWebsiteId && (
            <div className="neo-card bg-white p-6 sm:p-8 mb-6">
              <h2 className="text-xl sm:text-2xl font-bold mb-4">{t('widgetStatusTitle')}</h2>
              <p className="text-sm text-gray-600 mb-6">
                {t('widgetStatusDescription')}
              </p>

              <div className="flex items-center justify-between p-4 bg-page rounded-lg border-2 border-black">
                <div>
                  <p className="font-bold">{t('widgetIs', { status: widgetActivated ? t('activeCheck') : t('inactive') })}</p>
                  <p className="text-sm text-gray-600">
                    {widgetActivated 
                      ? t('widgetVisibleOnSite')
                      : t('widgetHiddenFromSite')}
                  </p>
                </div>
                <button
                  onClick={handleToggleWidget}
                  disabled={activating}
                  className={`neo-button-${widgetActivated ? 'secondary' : 'primary'} px-6`}
                >
                  {activating 
                    ? t('processing') 
                    : widgetActivated 
                    ? t('deactivate') 
                    : t('activate')}
                </button>
              </div>
            </div>
          )}
          
          {/* Row 1: Bot Behavior + Widget Messages */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Bot Behavior Settings */}
            <div className="neo-card bg-white p-6 sm:p-8">
              <h2 className="text-xl sm:text-2xl font-bold mb-4">{t('botBehaviorTitle')}</h2>
              <p className="text-sm text-gray-600 mb-6">
                {t('botBehaviorDescription')}
              </p>

              <div className="space-y-6">
                {/* Strict Context Only */}
                <div className="p-4 border-2 border-gray-200 rounded-lg">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={strictContextOnly}
                      onChange={(e) => handleStrictContextChange(e.target.checked)}
                      className="mt-1 w-5 h-5 border-2 border-gray-300 rounded cursor-pointer accent-fuchsia-primary"
                    />
                    <div className="flex-1">
                      <div className="font-bold">{t('strictContextLabel')}</div>
                      <p className="text-sm text-gray-600 mt-1">
                        {t('strictContextDescription')}
                      </p>
                    </div>
                  </label>
                </div>

                {/* Speaking Style */}
                <div>
                  <label className="block text-sm font-bold mb-2">
                    {t('speakingStyleLabel')} <span className="text-gray-500 font-normal">{t('speakingStyleOptional')}</span>
                  </label>
                  <input
                    type="text"
                    value={speakingStyle}
                    onChange={(e) => handleSpeakingStyleChange(e.target.value)}
                    placeholder={t('speakingStylePlaceholder')}
                    className="neo-input w-full"
                    maxLength={150}
                  />
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-gray-500">
                      {t('speakingStyleHint')}
                    </p>
                    <span className="text-xs text-gray-400">{speakingStyle.length}/150</span>
                  </div>
                </div>

                {/* Custom Rules */}
                <div>
                  <label className="block text-sm font-bold mb-2">
                    {t('customRulesLabel')} <span className="text-gray-500 font-normal">{t('customRulesOptional')}</span>
                  </label>
                  <textarea
                    value={customRules}
                    onChange={(e) => handleCustomRulesChange(e.target.value)}
                    placeholder={t('customRulesPlaceholder')}
                    className="neo-input w-full min-h-[100px]"
                    maxLength={500}
                  />
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-gray-500">
                      {t('customRulesHint')}
                    </p>
                    <span className="text-xs text-gray-400">{customRules.length}/500</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Widget Messages */}
            <div className="neo-card bg-white p-6 sm:p-8">
              <h2 className="text-xl sm:text-2xl font-bold mb-4">{t('widgetMessagesTitle')}</h2>
              <p className="text-sm text-gray-600 mb-6">
                {t('widgetMessagesDescription')}
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2">{t('headerSubtitle')}</label>
                  <input
                    type="text"
                    value={widgetSubtitle}
                    onChange={(e) => handleSubtitleChange(e.target.value)}
                    placeholder={t('headerSubtitlePlaceholder')}
                    className="neo-input w-full"
                    maxLength={50}
                  />
                  <p className="text-xs text-gray-500 mt-1">{t('headerSubtitleHint')}</p>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">{t('welcomeTitle')}</label>
                  <input
                    type="text"
                    value={widgetWelcomeTitle}
                    onChange={(e) => handleWelcomeTitleChange(e.target.value)}
                    placeholder={t('welcomeTitlePlaceholder')}
                    className="neo-input w-full"
                    maxLength={50}
                  />
                  <p className="text-xs text-gray-500 mt-1">{t('welcomeTitleHint')}</p>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">{t('welcomeMessage')}</label>
                  <textarea
                    value={widgetWelcomeMessage}
                    onChange={(e) => handleWelcomeMessageChange(e.target.value)}
                    placeholder={t('welcomeMessagePlaceholder')}
                    className="neo-input w-full min-h-[80px]"
                    maxLength={200}
                  />
                  <p className="text-xs text-gray-500 mt-1">{t('welcomeMessageHint')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Basic Information + Widget Style */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Basic Information */}
            <div className="neo-card bg-white p-6 sm:p-8">
              <h2 className="text-xl sm:text-2xl font-bold mb-6">{t('basicInfoTitle')}</h2>
                
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2">{t('displayName')}</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => handleDisplayNameChange(e.target.value)}
                    className="neo-input w-full"
                    placeholder={t('displayNamePlaceholder')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">{t('domain')}</label>
                  <input
                    type="text"
                    value={domain}
                    onChange={(e) => handleDomainChange(e.target.value)}
                    className="neo-input w-full"
                    placeholder={t('domainPlaceholder')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">{t('primaryColor')}</label>
                  <div className="flex gap-2 sm:gap-4 items-center">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => handleColorChange(e.target.value)}
                      className="w-16 sm:w-24 h-12 border-4 border-black rounded-lg cursor-pointer flex-shrink-0"
                    />
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => handleColorChange(e.target.value)}
                      className="neo-input flex-1 min-w-0"
                      placeholder="#E91E63"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Widget Style */}
            <div className="neo-card bg-white p-6 sm:p-8">
              <h2 className="text-xl sm:text-2xl font-bold mb-4">{t('widgetStyleTitle')}</h2>
              <p className="text-sm text-gray-600 mb-6">
                {t('widgetStyleDescription')}
              </p>

              <div className="grid grid-cols-2 gap-4">
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
                      <div className="text-xs font-bold">{t('modernLabel')}</div>
                    </div>
                  </div>
                  <h3 className="font-bold mb-1">{t('modern')}</h3>
                  <p className="text-xs text-gray-600">
                    {t('modernDescription')}
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
                      <div className="text-xs font-bold">{t('neutralLabel')}</div>
                    </div>
                  </div>
                  <h3 className="font-bold mb-1">{t('neutral')}</h3>
                  <p className="text-xs text-gray-600">
                    {t('neutralDescription')}
                  </p>
                </button>
              </div>
            </div>
          </div>

          {/* Row 3: Danger Zone (Full Width) */}
          <div className="neo-card bg-white p-6 sm:p-8 mb-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 text-red-600">{t('dangerZone')}</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4">
              {t('dangerZoneDescription')}
            </p>
            <button className="border-4 border-red-500 bg-red-50 text-red-700 font-bold px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-red-100 transition-colors text-sm sm:text-base">
              {t('deleteChatbot')}
            </button>
          </div>
        </div>
      </main>

      {/* Preview Widget */}
      {showPreview && (
        <TestChatWidget
          websiteId={websiteId}
          websiteName={displayName}
          primaryColor={color}
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
