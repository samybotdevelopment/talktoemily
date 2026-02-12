'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface TrainingItem {
  id: string;
  title: string;
  content: string;
  source: 'manual' | 'wg';
  created_at: string;
}

export default function TrainingPage() {
  const params = useParams();
  const router = useRouter();
  const websiteId = params.id as string;

  const [trainingItems, setTrainingItems] = useState<TrainingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    fetchTrainingItems();
  }, [websiteId]);

  const fetchTrainingItems = async () => {
    try {
      const response = await fetch(`/api/websites/${websiteId}/training-items`);
      const data = await response.json();
      if (response.ok) {
        setTrainingItems(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch training items:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/websites/${websiteId}/training-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add training item');
      }

      setTitle('');
      setContent('');
      setSuccess('Training item added!');
      fetchTrainingItems();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this training item?')) return;

    try {
      const response = await fetch(`/api/websites/${websiteId}/training-items/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete item');
      }

      setSuccess('Item deleted');
      fetchTrainingItems();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError(null);
    } catch (err: any) {
      setError('Failed to access microphone. Please allow microphone access.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to transcribe audio');
      }

      setContent((prev) => (prev ? `${prev}\n\n${data.text}` : data.text));
      setSuccess('Audio transcribed! Edit and add a title.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleTrain = async () => {
    if (!confirm('Start training? This will rebuild your chatbot with all current training items.')) {
      return;
    }

    setIsTraining(true);
    setError(null);

    try {
      const response = await fetch(`/api/websites/${websiteId}/train`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Training failed');
      }

      setSuccess('Training completed successfully!');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsTraining(false);
    }
  };

  return (
    <main className="neo-container py-4 sm:py-8">
      {error && (
        <div className="bg-red-50 border-4 border-red-500 rounded-lg p-4 mb-6">
          <p className="text-red-800 font-semibold">{error}</p>
        </div>
      )}

        {success && (
          <div className="bg-green-50 border-4 border-green-500 rounded-lg p-4 mb-6">
            <p className="text-green-800 font-semibold">{success}</p>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Add Training Item Form */}
          <div>
            <div className="neo-card bg-white p-6 mb-6">
              <h2 className="text-2xl font-bold mb-4">Add Training Content</h2>

              <form onSubmit={handleAddItem}>
                <div className="mb-4">
                  <label className="block text-sm font-bold mb-2">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="neo-input w-full"
                    placeholder="What is this about?"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-bold mb-2">Content</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="neo-input w-full min-h-[200px]"
                    placeholder="Enter your training content here..."
                    required
                  />
                </div>

                <div className="flex gap-4">
                  <button type="submit" className="neo-button-primary flex-1">
                    Add Item
                  </button>
                  
                  {isRecording ? (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="neo-button-secondary bg-red-500 text-white border-red-700"
                    >
                      ⏹ Stop
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="neo-button-secondary"
                      disabled={isTranscribing}
                    >
                      🎤 {isTranscribing ? 'Transcribing...' : 'Record'}
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="neo-card bg-white p-6">
              <h3 className="font-bold mb-2">How to train your bot</h3>
              <ol className="text-sm space-y-2 text-gray-600 list-decimal list-inside">
                <li>Add training items with text or voice</li>
                <li>Each item should cover one topic clearly</li>
                <li>Click "Train Chatbot" when ready</li>
                <li>Training rebuilds your bot's knowledge</li>
              </ol>
            </div>
          </div>

          {/* Training Items List */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">
                Training Items ({trainingItems.length})
              </h2>
              <button
                onClick={handleTrain}
                disabled={isTraining || trainingItems.length === 0}
                className="neo-button-primary"
              >
                {isTraining ? 'Training...' : 'Train Chatbot'}
              </button>
            </div>

            {loading ? (
              <div className="neo-card bg-white p-12 text-center">
                <p>Loading...</p>
              </div>
            ) : trainingItems.length === 0 ? (
              <div className="neo-card bg-white p-12 text-center">
                <div className="text-5xl mb-4">📝</div>
                <h3 className="text-xl font-bold mb-2">No training items yet</h3>
                <p className="text-gray-600">Add your first training item to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {trainingItems.map((item) => (
                  <div key={item.id} className="neo-card bg-white p-6">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-bold">{item.title}</h3>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600 hover:text-red-800 font-bold"
                      >
                        Delete
                      </button>
                    </div>
                    <p className="text-gray-700 text-sm mb-2 whitespace-pre-wrap">
                      {item.content.length > 200 
                        ? `${item.content.substring(0, 200)}...` 
                        : item.content}
                    </p>
                    <div className="flex gap-2 text-xs">
                      <span className="px-2 py-1 bg-gray-100 rounded font-bold">
                        {item.source}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
  );
}
