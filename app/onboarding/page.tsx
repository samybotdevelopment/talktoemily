'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { WGWebsite, TrainingChunk, OnboardingState } from '@/types/models';
import confetti from 'canvas-confetti';

const QUESTION_SECTIONS = [
  {
    id: 'products',
    title: 'Product and Services Questions',
    question: 'Tell us about your products or services',
    placeholder: 'Describe what you offer, key features, pricing, etc.',
  },
  {
    id: 'customer-questions',
    title: 'Questions Customers Typically Ask',
    question: 'What questions do customers typically ask you?',
    placeholder: 'Common questions your customers have...',
  },
  {
    id: 'unique',
    title: 'What Makes Your Business Unique',
    question: 'What makes your business unique?',
    placeholder: 'What sets you apart from competitors...',
  },
  {
    id: 'additional',
    title: 'Additional Information',
    question: "Is there anything you'd like the chatbot to know about your business?",
    placeholder: 'Any other important information...',
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for each step
  const [websites, setWebsites] = useState<WGWebsite[]>([]);
  const [selectedWebsite, setSelectedWebsite] = useState<WGWebsite | null>(null);
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

      if (data.onboarding_state) {
        const state: OnboardingState = data.onboarding_state;
        // Restore state
        setStep(state.step);
        setSelectedWebsite(state.selectedWebsite);
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

  // Save state whenever it changes (debounced in practice)
  useEffect(() => {
    if (step > 1) {
      saveOnboardingState();
    }
  }, [step, selectedWebsite, botName, primaryColor, trainingChunks, currentQuestionSection, qaAnswers]);

  // Initialize animated count when loading state
  useEffect(() => {
    setAnimatedCount(trainingChunks.length);
    previousCountRef.current = trainingChunks.length;
  }, []);

  // Step 2: Fetch websites
  useEffect(() => {
    if (step === 2 && websites.length === 0) {
      fetchWebsites();
    }
  }, [step]);

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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Complete onboarding
  const completeOnboarding = async () => {
    if (!selectedWebsite) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          website_data: {
            display_name: botName,
            domain: selectedWebsite.website_url,
            primary_color: primaryColor,
            wg_website_id: selectedWebsite.website_id,
          },
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
        { question: currentSection.question, answer: `${currentSectionTitle}: ${currentSectionContent}` },
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
          <h1 className="text-3xl font-bold">Welcome to Emily</h1>
          <p className="text-gray-600 mt-2">Let's set up your chatbot</p>
        </div>
      </header>

      <main className="neo-container py-8">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {[1, 2, 3, 4, 5, 6, 7].map((s) => (
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
              <h2 className="text-3xl font-bold mb-4">Welcome to Talk to Emily!</h2>
              <p className="text-lg text-gray-700 mb-4">
                You have a Wonder George subscription, so your Emily subscription is free of
                charge.
              </p>
              <p className="text-gray-600 mb-8">
                Congratulations! Let's create your first chatbot.
              </p>
              <button onClick={() => setStep(2)} className="neo-button-primary text-lg px-8 py-4">
                Get Started →
              </button>
            </div>
          )}

          {/* Step 2: Website Selection */}
          {step === 2 && (
            <div className="neo-card bg-white p-8">
              <h2 className="text-2xl font-bold mb-4">Choose Your Website</h2>
              <p className="text-gray-600 mb-6">
                Select the website you want to add your chatbot to
              </p>

              {loading ? (
                <div className="text-center py-12">
                  <p className="text-gray-600">Loading your websites...</p>
                </div>
              ) : websites.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600">No websites found</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {websites.map((website) => (
                    <button
                      key={website.website_id}
                      onClick={() => {
                        setSelectedWebsite(website);
                        setBotName(website.website_name);
                        setStep(3);
                      }}
                      className={`neo-card p-6 text-left hover:scale-[1.02] transition-transform ${
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
                        <div>
                          <h3 className="text-xl font-bold">{website.website_name}</h3>
                          <p className="text-sm text-gray-600">{website.website_url}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Bot Customization */}
          {step === 3 && selectedWebsite && (
            <div className="neo-card bg-white p-8">
              <h2 className="text-2xl font-bold mb-4">Customize Your Bot</h2>
              <p className="text-gray-600 mb-6">Name your bot and choose a color</p>

              <div className="mb-6">
                <label className="block text-sm font-bold mb-2">Bot Name</label>
                <input
                  type="text"
                  value={botName}
                  onChange={(e) => setBotName(e.target.value)}
                  className="neo-input w-full"
                  placeholder="My Website Assistant"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-bold mb-2">Widget Color</label>
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
                  ← Back
                </button>
                <button
                  onClick={() => setStep(4)}
                  disabled={!botName}
                  className="neo-button-primary flex-1"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Auto-Training Setup */}
          {step === 4 && (
            <div className="neo-card bg-white p-8 text-center">
              <h2 className="text-2xl font-bold mb-4">Let's start training {botName}</h2>
              <p className="text-gray-600 mb-8">
                We'll pull data from your website to train your chatbot
              </p>

              {loading ? (
                <div className="py-12">
                  <div className="animate-spin text-6xl mb-4">⚙️</div>
                  <p className="text-gray-600">Pulling data from your website...</p>
                </div>
              ) : (
                <button onClick={fetchWebsiteContent} className="neo-button-primary text-lg px-8">
                  Pull Website Content →
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
                {QUESTION_SECTIONS[currentQuestionSection].title}
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Section {currentQuestionSection + 1} of {QUESTION_SECTIONS.length}
              </p>
              <p className="text-gray-600 mb-6">
                Add training content for this section. You can add multiple entries.
              </p>

              <div className="mb-6">
                <label className="block text-sm font-bold mb-2">Title</label>
                <input
                  type="text"
                  value={currentSectionTitle}
                  onChange={(e) => setCurrentSectionTitle(e.target.value)}
                  className="neo-input w-full mb-4"
                  placeholder="Enter a title for this content..."
                />

                <label className="block text-sm font-bold mb-2">Content</label>
                <textarea
                  value={currentSectionContent}
                  onChange={(e) => setCurrentSectionContent(e.target.value)}
                  className="neo-input w-full min-h-[200px]"
                  placeholder={QUESTION_SECTIONS[currentQuestionSection].placeholder}
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
                      Total Training Items Added
                    </p>
                    <p className={`text-3xl font-bold text-fuchsia-primary transition-all duration-300 ${
                      showSaveSuccess ? 'scale-110' : ''
                    }`}>
                      {animatedCount || trainingChunks.length}
                    </p>
                    {showSaveSuccess && (
                      <p className="text-sm font-bold text-green-600 mt-2 animate-pulse">
                        Saved successfully
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
                  Save
                </button>
                <button
                  onClick={handleNextSection}
                  className="neo-button-primary flex-1 transition-transform hover:scale-105"
                >
                  Next Section →
                </button>
              </div>
            </div>
          )}

          {/* Step 6: Document Upload */}
          {step === 6 && (
            <div className="neo-card bg-white p-8">
              <h2 className="text-2xl font-bold mb-4">Upload a Document (Optional)</h2>
              <p className="text-gray-600 mb-6">
                Upload a .txt file with more information to train your bot. The AI will automatically extract title and content chunks.
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
                  <p className="font-bold mb-2">Click to upload .txt file</p>
                  <p className="text-sm text-gray-600">The LLM will extract title and content chunks automatically</p>
                </label>
              </div>

              {loading && (
                <div className="text-center py-4">
                  <div className="animate-spin text-4xl mb-2">⚙️</div>
                  <p className="text-gray-600">Processing document...</p>
                </div>
              )}

              <div className="flex gap-4">
                <button onClick={() => setStep(5)} className="neo-button-secondary">
                  ← Back
                </button>
                <button onClick={() => setStep(7)} className="neo-button-primary flex-1">
                  Continue to Review →
                </button>
              </div>
            </div>
          )}

          {/* Step 7: Review & Train */}
          {step === 7 && (
            <div className="neo-card bg-white p-8">
              <h2 className="text-2xl font-bold mb-4">Review & Train</h2>
              <p className="text-gray-600 mb-6">
                You have {trainingChunks.length} training items. Review and start training.
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
                              <label className="block text-sm font-bold mb-2">Title</label>
                              <input
                                type="text"
                                value={editingChunk.title}
                                onChange={(e) => setEditingChunk({ ...editingChunk, title: e.target.value })}
                                className="neo-input w-full"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-bold mb-2">Content</label>
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
                                Save Changes
                              </button>
                              <button
                                onClick={cancelChunkEdit}
                                className="neo-button-secondary flex-1"
                              >
                                Cancel
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
                                Edit
                              </button>
                              <button
                                onClick={() => removeChunk(index)}
                                className="text-red-600 hover:text-red-800 font-bold text-sm px-4 py-2 border-2 border-red-600 rounded-lg hover:bg-red-50 transition-colors"
                              >
                                Delete
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
                    Training your bot... This may take 1-2 minutes
                  </p>
                </div>
              ) : (
                <div className="flex gap-4">
                  <button onClick={() => setStep(6)} className="neo-button-secondary">
                    ← Back
                  </button>
                  <button
                    onClick={completeOnboarding}
                    disabled={trainingChunks.length === 0}
                    className="neo-button-primary flex-1 text-lg"
                  >
                    Launch AI Training
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
