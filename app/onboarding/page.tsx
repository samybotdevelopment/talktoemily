'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { WGWebsite, TrainingChunk, OnboardingState } from '@/types/models';
import confetti from 'canvas-confetti';
import { useTranslations } from 'next-intl';

const QUESTION_SECTIONS = [
  {
    id: 'products',
    titleKey: 'productsTitle',
    questionKey: 'productsQuestion',
    placeholderKey: 'productsPlaceholder',
  },
  {
    id: 'customer-questions',
    titleKey: 'customerQuestionsTitle',
    questionKey: 'customerQuestionsQuestion',
    placeholderKey: 'customerQuestionsPlaceholder',
  },
  {
    id: 'unique',
    titleKey: 'uniqueTitle',
    questionKey: 'uniqueQuestion',
    placeholderKey: 'uniquePlaceholder',
  },
  {
    id: 'additional',
    titleKey: 'additionalTitle',
    questionKey: 'additionalQuestion',
    placeholderKey: 'additionalPlaceholder',
  },
];

export default function OnboardingPage() {
  const t = useTranslations('onboarding');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isWGLinked, setIsWGLinked] = useState<boolean | null>(null);
  const [documentProcessed, setDocumentProcessed] = useState(false);
  const [isCreatingAdditionalBot, setIsCreatingAdditionalBot] = useState(false);
  const [showAllWebsitesUsedModal, setShowAllWebsitesUsedModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // State for each step
  const [websites, setWebsites] = useState<WGWebsite[]>([]);
  const [existingBotWebsiteIds, setExistingBotWebsiteIds] = useState<string[]>([]); // WG website IDs with bots
  const [selectedWebsite, setSelectedWebsite] = useState<WGWebsite | null>(null);
  const [websiteName, setWebsiteName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [botName, setBotName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#E91E63');
  const [trainingChunks, setTrainingChunks] = useState<TrainingChunk[]>([]);
  const [currentQuestionSection, setCurrentQuestionSection] = useState(0);
  const [currentSectionTitle, setCurrentSectionTitle] = useState('');
  const [currentSectionContent, setCurrentSectionContent] = useState('');
  const [qaAnswers, setQAAnswers] = useState<{ question: string; answer: string }[]>([]);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [animatedCount, setAnimatedCount] = useState(0);
  const [sectionTransition, setSectionTransition] = useState(false);
  const [expandedChunk, setExpandedChunk] = useState<number | null>(null);
  const [editingChunk, setEditingChunk] = useState<{ index: number; title: string; content: string } | null>(null);
  const previousCountRef = useRef(0);

  // Load saved onboarding state on mount
  useEffect(() => {
    loadOnboardingState();
  }, []);

  const loadOnboardingState = async () => {
    try {
      const response = await fetch('/api/onboarding/status');
      const data = await response.json();

      setIsWGLinked(data.is_wg_linked);
      
      // Check if this is creating an additional bot (org already completed onboarding)
      setIsCreatingAdditionalBot(!!data.onboarding_completed_at);

      if (data.onboarding_state) {
        const state: OnboardingState = data.onboarding_state;
        // Restore state
        setStep(state.step);
        setSelectedWebsite(state.selectedWebsite);
        setWebsiteName(state.websiteName || '');
        setWebsiteUrl(state.websiteUrl || '');
        setBotName(state.botName);
        setPrimaryColor(state.primaryColor);
        setTrainingChunks(state.trainingChunks);
        setCurrentQuestionSection(state.currentQuestionSection);
        setQAAnswers(state.qaAnswers || []);
      }
    } catch (error) {
      console.error('Error loading onboarding state:', error);
    }
  };

  const saveOnboardingState = async () => {
    try {
      const state: OnboardingState = {
        step,
        selectedWebsite,
        websiteName,
        websiteUrl,
        botName,
        primaryColor,
        trainingChunks,
        currentQuestionSection,
        qaAnswers,
      };

      await fetch('/api/onboarding/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state }),
      });
    } catch (error) {
      console.error('Error saving onboarding state:', error);
    }
  };

  // Save state only when step changes (not on every keystroke)
  useEffect(() => {
    if (step > 1) {
      saveOnboardingState();
    }
  }, [step, currentQuestionSection]); // Only save when navigating between steps

  // Initialize animated count when loading state
  useEffect(() => {
    setAnimatedCount(trainingChunks.length);
    previousCountRef.current = trainingChunks.length;
  }, []);

  // Step 2: Fetch websites (WG only)
  useEffect(() => {
    if (step === 2 && isWGLinked && websites.length === 0) {
      fetchWebsites();
    }
  }, [step, isWGLinked]);

  const fetchWebsites = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/onboarding/websites', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch websites');
      }

      setWebsites(data.websites);
      
      // Fetch existing bots to grey out websites with bots
      const existingBotsResponse = await fetch('/api/websites');
      if (existingBotsResponse.ok) {
        const existingBotsData = await existingBotsResponse.json();
        // API returns { data: [...] }
        const existingBots = existingBotsData.data || [];
        const usedWgWebsiteIds = existingBots
          .filter((bot: any) => bot.wg_website_id)
          .map((bot: any) => bot.wg_website_id);
        setExistingBotWebsiteIds(usedWgWebsiteIds);
        console.log('🔍 Existing bots:', existingBots);
        console.log('🔍 Used WG website IDs:', usedWgWebsiteIds);
        
        // Check if all WG websites already have bots
        if (isCreatingAdditionalBot && data.websites.length > 0 && usedWgWebsiteIds.length === data.websites.length) {
          setShowAllWebsitesUsedModal(true);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Fetch website content
  const fetchWebsiteContent = async () => {
    if (!selectedWebsite) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/onboarding/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wg_website_id: selectedWebsite.website_id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch content');
      }

      setTrainingChunks(data.chunks);
      setStep(5);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Upload document handler
  const handleDocumentUpload = async (file: File) => {
    setLoading(true);
    setError(null);
    setDocumentProcessed(false);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/onboarding/process-document', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process document');
      }

      setTrainingChunks([...trainingChunks, ...data.chunks]);
      setDocumentProcessed(true);
      
      // Trigger confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Cancel bot creation (for additional bots only)
  const handleCancelBotCreation = () => {
    setShowCancelModal(true);
  };

  const confirmCancelBotCreation = async () => {
    try {
      setLoading(true);
      
      // Call API to clear state and delete incomplete bot
      const response = await fetch('/api/onboarding/cancel', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to cancel bot creation');
      }

      setShowCancelModal(false);
      router.push('/dashboard');
    } catch (error) {
      console.error('Error canceling bot creation:', error);
      setError('Failed to cancel bot creation');
      setShowCancelModal(false);
    } finally {
      setLoading(false);
    }
  };

  // Handle all websites used modal
  const handleAllWebsitesUsed = () => {
    setShowAllWebsitesUsedModal(false);
    router.push('/dashboard');
  };

  // Complete onboarding
  const completeOnboarding = async () => {
    // Validation: WG customers need selectedWebsite, non-WG need websiteName
    if (isWGLinked && !selectedWebsite) return;
    if (!isWGLinked && !websiteName) return;

    setLoading(true);
    setError(null);

    try {
      const website_data = isWGLinked
        ? {
            display_name: botName,
            domain: selectedWebsite!.website_url,
            primary_color: primaryColor,
            wg_website_id: selectedWebsite!.website_id,
          }
        : {
            display_name: botName,
            domain: websiteUrl || websiteName,
            primary_color: primaryColor,
          };

      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          website_data,
          training_chunks: trainingChunks,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete onboarding');
      }

      // Redirect to the new website's overview page
      router.push(`/websites/${data.website_id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle saving training content in Q&A section
  const handleSaveTrainingContent = () => {
    if (currentSectionTitle.trim() && currentSectionContent.trim()) {
      const currentSection = QUESTION_SECTIONS[currentQuestionSection];
      
      const newChunks = [
        ...trainingChunks,
        { title: currentSectionTitle, content: currentSectionContent },
      ];
      
      setTrainingChunks(newChunks);
      
      setQAAnswers([
        ...qaAnswers,
        { question: t(`${currentSection.questionKey}`), answer: `${currentSectionTitle}: ${currentSectionContent}` },
      ]);
      
      // Trigger confetti animation
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#E91E63', '#FF69B4', '#FFB6C1', '#FFC0CB'],
      });
      
      // Show success message and animate count
      setShowSaveSuccess(true);
      previousCountRef.current = animatedCount;
      
      // Animate the count from previous to new
      const startCount = trainingChunks.length;
      const endCount = newChunks.length;
      const duration = 500; // ms
      const steps = 20;
      const increment = (endCount - startCount) / steps;
      let currentStep = 0;
      
      const timer = setInterval(() => {
        currentStep++;
        if (currentStep >= steps) {
          setAnimatedCount(endCount);
          clearInterval(timer);
        } else {
          setAnimatedCount(Math.floor(startCount + increment * currentStep));
        }
      }, duration / steps);
      
      // Hide success message after 2 seconds
      setTimeout(() => {
        setShowSaveSuccess(false);
      }, 2000);
      
      // Clear form
      setCurrentSectionTitle('');
      setCurrentSectionContent('');
    }
  };

  // Handle moving to next section
  const handleNextSection = () => {
    // Trigger section transition animation
    setSectionTransition(true);
    
    setTimeout(() => {
      if (currentQuestionSection < QUESTION_SECTIONS.length - 1) {
        setCurrentQuestionSection(currentQuestionSection + 1);
    } else {
        // Move to next step (document upload)
      setStep(6);
        setDocumentProcessed(false); // Reset document processing state
      }
      
      // Reset transition after animation
      setTimeout(() => {
        setSectionTransition(false);
      }, 100);
    }, 300);
  };

  const removeChunk = (index: number) => {
    setTrainingChunks(trainingChunks.filter((_, i) => i !== index));
    setExpandedChunk(null);
    setEditingChunk(null);
  };

  const startEditingChunk = (index: number) => {
    setEditingChunk({
      index,
      title: trainingChunks[index].title,
      content: trainingChunks[index].content,
    });
  };

  const saveChunkEdit = () => {
    if (editingChunk) {
      const updatedChunks = [...trainingChunks];
      updatedChunks[editingChunk.index] = {
        title: editingChunk.title,
        content: editingChunk.content,
      };
      setTrainingChunks(updatedChunks);
      setEditingChunk(null);
    }
  };

  const cancelChunkEdit = () => {
    setEditingChunk(null);
  };

  return (
    <div className="min-h-screen bg-page">
      <header className="bg-white border-b-4 border-black">
        <div className="neo-container py-6">
          <h1 className="text-3xl font-bold">{t('welcomeTitle')}</h1>
          <p className="text-gray-600 mt-2">{t('welcomeSubtitle')}</p>
        </div>
      </header>

      <main className="neo-container py-8">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {[1, 2, 3, 4, 5, 6, 7].map((s: any) => (
              <div key={s} className="flex items-center flex-1 last:flex-initial">
                <div
                  className={`w-10 h-10 rounded-full border-4 border-black flex items-center justify-center font-bold ${
                    s <= step ? 'bg-fuchsia-primary text-white' : 'bg-white'
                  }`}
                >
                  {s}
                </div>
                {s < 7 && (
                  <div
                    className={`flex-1 h-1 ${s < step ? 'bg-fuchsia-primary' : 'bg-gray-300'}`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="max-w-2xl mx-auto mb-6">
            <div className="bg-red-50 border-4 border-red-500 rounded-lg p-4">
              <p className="text-red-800 font-semibold">{error}</p>
            </div>
          </div>
        )}

        <div className="max-w-2xl mx-auto">
          {/* Step 1: Welcome */}
          {step === 1 && (
            <div className="neo-card bg-white p-8 text-center">
              <div className="text-6xl mb-6">👋</div>
              <h2 className="text-3xl font-bold mb-4">{t('step1.title')}</h2>
              {isWGLinked ? (
                <>
              <p className="text-lg text-gray-700 mb-4">
                {t('step1.wgSubscription')}
              </p>
              <p className="text-gray-600 mb-8">
                {t('step1.wgCongrats')}
              </p>
                </>
              ) : (
                <>
                  <p className="text-lg text-gray-700 mb-4">
                    {t('step1.regularIntro')}
                  </p>
                  <p className="text-gray-600 mb-8">
                    {t('step1.regularDescription')}
                  </p>
                </>
              )}
              <button onClick={() => setStep(2)} className="neo-button-primary text-lg px-8 py-4">
                {t('step1.getStarted')} →
              </button>
            </div>
          )}

          {/* Step 2: Website Selection (WG only) */}
          {step === 2 && isWGLinked && (
            <div className="neo-card bg-white p-8">
              <h2 className="text-2xl font-bold mb-4">{t('step2.chooseWebsite')}</h2>
              <p className="text-gray-600 mb-6">
                {t('step2.chooseWebsiteDescription')}
              </p>

              {loading ? (
                <div className="text-center py-12">
                  <p className="text-gray-600">{t('step2.loadingWebsites')}</p>
                </div>
              ) : websites.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600">{t('step2.noWebsites')}</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {websites.map((website: any) => {
                    const hasExistingBot = existingBotWebsiteIds.includes(website.website_id);
                    
                    return (
                    <button
                      key={website.website_id}
                      onClick={() => {
                          if (!hasExistingBot) {
                        setSelectedWebsite(website);
                        setBotName(website.website_name);
                        setStep(3);
                          }
                        }}
                        disabled={hasExistingBot}
                        className={`neo-card p-6 text-left transition-transform ${
                          hasExistingBot
                            ? 'opacity-50 cursor-not-allowed bg-gray-100'
                            : 'hover:scale-[1.02]'
                        } ${
                        selectedWebsite?.website_id === website.website_id
                          ? 'border-fuchsia-primary'
                          : ''
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {website.website_image_url ? (
                          <img
                            src={website.website_image_url}
                            alt={website.website_name}
                            className="w-16 h-16 rounded-lg border-2 border-black object-cover"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-lg border-2 border-black bg-fuchsia-primary flex items-center justify-center text-white font-bold text-2xl">
                            {website.website_name[0]}
                          </div>
                        )}
                          <div className="flex-1">
                          <h3 className="text-xl font-bold">{website.website_name}</h3>
                          <p className="text-sm text-gray-600">{website.website_url}</p>
                            {hasExistingBot && (
                              <p className="text-sm font-bold text-fuchsia-primary mt-1">
                                ✓ {t('step2.chatbotAlreadyCreated')}
                              </p>
                            )}
                        </div>
                      </div>
                    </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Business Info (Non-WG customers) */}
          {step === 2 && !isWGLinked && (
            <div className="neo-card bg-white p-8">
              <h2 className="text-2xl font-bold mb-4">{t('step2.businessInfo')}</h2>
              <p className="text-gray-600 mb-6">
                {t('step2.businessInfoDescription')}
              </p>

              <div className="mb-6">
                <label className="block text-sm font-bold mb-2">{t('step2.businessName')}</label>
                <input
                  type="text"
                  value={websiteName}
                  onChange={(e) => {
                    setWebsiteName(e.target.value);
                    if (!botName) setBotName(e.target.value);
                  }}
                  className="neo-input w-full"
                  placeholder={t('step2.businessNamePlaceholder')}
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-bold mb-2">{t('step2.websiteUrl')}</label>
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="neo-input w-full"
                  placeholder={t('step2.websiteUrlPlaceholder')}
                />
              </div>

              <div className="flex gap-4">
                <button onClick={() => setStep(1)} className="neo-button-secondary">
                  ← {tCommon('back')}
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!websiteName}
                  className="neo-button-primary flex-1"
                >
                  {tCommon('continue')} →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Bot Customization */}
          {step === 3 && ((isWGLinked && selectedWebsite) || (!isWGLinked && websiteName)) && (
            <div className="neo-card bg-white p-8">
              <h2 className="text-2xl font-bold mb-4">{t('step3.title')}</h2>
              <p className="text-gray-600 mb-6">{t('step3.description')}</p>

              <div className="mb-6">
                <label className="block text-sm font-bold mb-2">{t('step3.botName')}</label>
                <input
                  type="text"
                  value={botName}
                  onChange={(e) => setBotName(e.target.value)}
                  className="neo-input w-full"
                  placeholder={t('step3.botNamePlaceholder')}
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-bold mb-2">{t('step3.widgetColor')}</label>
                <div className="flex gap-4 items-center">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-24 h-12 border-4 border-black rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="neo-input flex-1"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button onClick={() => setStep(2)} className="neo-button-secondary">
                  ← {tCommon('back')}
                </button>
                <button
                  onClick={() => setStep(isWGLinked ? 4 : 5)}
                  disabled={!botName}
                  className="neo-button-primary flex-1"
                >
                  {tCommon('continue')} →
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Auto-Training Setup (WG Only) */}
          {step === 4 && isWGLinked && (
            <div className="neo-card bg-white p-8 text-center">
              <h2 className="text-2xl font-bold mb-4">{t('step4.title', { botName })}</h2>
              <p className="text-gray-600 mb-8">
                {t('step4.description')}
              </p>

              {loading ? (
                <div className="py-12">
                  <div className="animate-spin text-6xl mb-4">⚙️</div>
                  <p className="text-gray-600">{t('step4.loading')}</p>
                </div>
              ) : (
                <button onClick={fetchWebsiteContent} className="neo-button-primary text-lg px-8">
                  {t('step4.button')} →
                </button>
              )}
            </div>
          )}

          {/* Step 5: Q&A Loop - Looping Sections */}
          {step === 5 && (
            <div className={`neo-card bg-white p-8 transition-all duration-300 ${
              sectionTransition ? 'opacity-0 translate-x-10' : 'opacity-100 translate-x-0'
            }`}>
              <h2 className="text-2xl font-bold mb-2">
                {t(`${QUESTION_SECTIONS[currentQuestionSection].titleKey}`)}
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                {t('step5.sectionProgress', { current: currentQuestionSection + 1, total: QUESTION_SECTIONS.length })}
              </p>
              <p className="text-gray-600 mb-6">
                {t('step5.description')}
              </p>

              <div className="mb-6">
                <label className="block text-sm font-bold mb-2">{t('step5.title')}</label>
                <input
                  type="text"
                  value={currentSectionTitle}
                  onChange={(e) => setCurrentSectionTitle(e.target.value)}
                  className="neo-input w-full mb-4"
                  placeholder={t('step5.titlePlaceholder')}
                />

                <label className="block text-sm font-bold mb-2">{t('step5.content')}</label>
                <textarea
                  value={currentSectionContent}
                  onChange={(e) => setCurrentSectionContent(e.target.value)}
                  className="neo-input w-full min-h-[200px]"
                  placeholder={t(`${QUESTION_SECTIONS[currentQuestionSection].placeholderKey}`)}
                />
              </div>

              {/* Show added items for current section */}
              {trainingChunks.length > 0 && (
                <div className={`mb-6 p-6 bg-gradient-to-r from-fuchsia-50 to-pink-50 rounded-lg border-4 border-fuchsia-primary relative overflow-hidden transition-all duration-300 ${
                  showSaveSuccess ? 'scale-105 shadow-2xl' : 'scale-100'
                }`}>
                  {showSaveSuccess && (
                    <div className="absolute inset-0 bg-fuchsia-primary/10 animate-pulse"></div>
                  )}
                  <div className="relative z-10 text-center">
                    <p className="text-sm font-bold text-gray-600 mb-2">
                      {t('step5.totalItems')}
                    </p>
                    <p className={`text-3xl font-bold text-fuchsia-primary transition-all duration-300 ${
                      showSaveSuccess ? 'scale-110' : ''
                    }`}>
                      {animatedCount || trainingChunks.length}
                    </p>
                    {showSaveSuccess && (
                      <p className="text-sm font-bold text-green-600 mt-2 animate-pulse">
                        {t('step5.savedSuccess')}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={handleSaveTrainingContent}
                  disabled={!currentSectionTitle.trim() || !currentSectionContent.trim()}
                  className="neo-button-secondary flex-1 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {tCommon('save')}
                </button>
                <button
                  onClick={handleNextSection}
                  className="neo-button-primary flex-1 transition-transform hover:scale-105"
                >
                  {t('step5.nextSection')} →
                </button>
              </div>
            </div>
          )}

          {/* Step 6: Document Upload */}
          {step === 6 && (
            <div className="neo-card bg-white p-8">
              <h2 className="text-2xl font-bold mb-4">{t('step6.title')}</h2>
              <p className="text-gray-600 mb-6">
                {t('step6.description')}
              </p>

              <div className="mb-6 border-4 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept=".txt"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleDocumentUpload(file);
                  }}
                  className="hidden"
                  id="document-upload"
                />
                <label htmlFor="document-upload" className="cursor-pointer">
                  <div className="text-5xl mb-4">📄</div>
                  <p className="font-bold mb-2">{t('step6.uploadPrompt')}</p>
                  <p className="text-sm text-gray-600">{t('step6.uploadHint')}</p>
                </label>
              </div>

              {loading && (
                <div className="text-center py-4">
                  <div className="animate-spin text-4xl mb-2">⚙️</div>
                  <p className="text-gray-600">{t('step6.processing')}</p>
                </div>
              )}

              {documentProcessed && !loading && (
                <div className="text-center py-4">
                  <div className="text-5xl mb-2 text-green-600">✓</div>
                  <p className="text-green-600 font-bold">{t('step6.processedSuccess')}</p>
                </div>
              )}

              <div className="flex gap-4">
                <button onClick={() => setStep(5)} className="neo-button-secondary">
                  ← {tCommon('back')}
                </button>
                <button onClick={() => setStep(7)} className="neo-button-primary flex-1">
                  {t('step6.continueToReview')} →
                </button>
              </div>
            </div>
          )}

          {/* Step 7: Review & Train */}
          {step === 7 && (
            <div className="neo-card bg-white p-8">
              <h2 className="text-2xl font-bold mb-4">{t('step7.title')}</h2>
              <p className="text-gray-600 mb-6">
                {t('step7.description', { count: trainingChunks.length })}
              </p>

              <div className="mb-6 space-y-3">
                {trainingChunks.map((chunk, index) => (
                  <div key={index} className="border-2 border-gray-200 rounded-lg overflow-hidden">
                    {/* Accordion Header */}
                    <button
                      onClick={() => setExpandedChunk(expandedChunk === index ? null : index)}
                      className="w-full p-4 text-left hover:bg-gray-50 transition-colors flex justify-between items-center"
                    >
                      <h3 className="font-bold text-lg flex-1">{chunk.title}</h3>
                      <span className="text-gray-400 text-xl">
                        {expandedChunk === index ? '−' : '+'}
                      </span>
                    </button>

                    {/* Accordion Content */}
                    {expandedChunk === index && (
                      <div className="p-4 border-t-2 border-gray-200 bg-gray-50">
                        {editingChunk?.index === index ? (
                          // Edit Mode
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-bold mb-2">{t('step7.title')}</label>
                              <input
                                type="text"
                                value={editingChunk.title}
                                onChange={(e) => setEditingChunk({ ...editingChunk, title: e.target.value })}
                                className="neo-input w-full"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-bold mb-2">{t('step7.content')}</label>
                              <textarea
                                value={editingChunk.content}
                                onChange={(e) => setEditingChunk({ ...editingChunk, content: e.target.value })}
                                className="neo-input w-full min-h-[150px]"
                              />
                            </div>
                            <div className="flex gap-3">
                              <button
                                onClick={saveChunkEdit}
                                className="neo-button-primary flex-1"
                              >
                                {t('step7.saveChanges')}
                              </button>
                              <button
                                onClick={cancelChunkEdit}
                                className="neo-button-secondary flex-1"
                              >
                                {tCommon('cancel')}
                              </button>
                            </div>
                          </div>
                        ) : (
                          // View Mode
                          <div>
                            <p className="text-sm text-gray-700 mb-4 whitespace-pre-wrap">
                              {chunk.content}
                            </p>
                            <div className="flex gap-3">
                              <button
                                onClick={() => startEditingChunk(index)}
                                className="neo-button-secondary text-sm px-4 py-2"
                              >
                                {tCommon('edit')}
                              </button>
                      <button
                        onClick={() => removeChunk(index)}
                                className="text-red-600 hover:text-red-800 font-bold text-sm px-4 py-2 border-2 border-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        {tCommon('delete')}
                      </button>
                    </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin text-6xl mb-4">⚙️</div>
                  <p className="text-gray-600 font-bold">
                    {t('step7.training')}
                  </p>
                </div>
              ) : (
                <div className="flex gap-4">
                  <button onClick={() => setStep(6)} className="neo-button-secondary">
                    ← {tCommon('back')}
                  </button>
                  <button
                    onClick={completeOnboarding}
                    disabled={trainingChunks.length === 0}
                    className="neo-button-primary flex-1 text-lg"
                  >
                    {t('step7.launch')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cancel Button (for additional bots only) */}
        {isCreatingAdditionalBot && step > 1 && (
          <div className="max-w-2xl mx-auto mt-6">
            <button
              onClick={handleCancelBotCreation}
              className="neo-button-secondary w-full"
            >
              {t('cancelBotCreation')}
            </button>
          </div>
        )}
      </main>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="neo-card bg-white p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">{t('cancelModal.title')}</h2>
            <p className="text-gray-700 mb-6">
              {t('cancelModal.description')}
            </p>
            <div className="flex gap-4">
              <button
                onClick={confirmCancelBotCreation}
                className="neo-button-secondary flex-1"
              >
                {t('cancelModal.confirm')}
              </button>
              <button
                onClick={() => setShowCancelModal(false)}
                className="neo-button-primary flex-1"
              >
                {t('cancelModal.continue')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* All Websites Used Modal */}
      {showAllWebsitesUsedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="neo-card bg-white p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">{t('allWebsitesModal.title')}</h2>
            <p className="text-gray-700 mb-6">
              {t('allWebsitesModal.description')}
            </p>
            <button
              onClick={handleAllWebsitesUsed}
              className="neo-button-primary w-full"
            >
              {t('allWebsitesModal.ok')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
