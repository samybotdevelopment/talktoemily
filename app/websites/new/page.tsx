'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewWebsitePage() {
  const [domain, setDomain] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#E91E63');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/websites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain,
          display_name: displayName,
          primary_color: primaryColor,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create website');
      }

      router.push(`/websites/${data.data.id}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-page">
      <header className="bg-white border-b-4 border-black">
        <div className="neo-container py-6">
          <Link href="/dashboard" className="text-gray-600 hover:text-black mb-4 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold">Create New Chatbot</h1>
          <p className="text-gray-600 mt-2">Set up an AI assistant for your website</p>
        </div>
      </header>

      <main className="neo-container py-8">
        <div className="max-w-2xl mx-auto">
          <div className="neo-card bg-white p-8">
            {error && (
              <div className="bg-red-50 border-4 border-red-500 rounded-lg p-4 mb-6">
                <p className="text-red-800 font-semibold">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label htmlFor="displayName" className="block text-sm font-bold mb-2">
                  Chatbot Name
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="neo-input w-full"
                  placeholder="My Website Assistant"
                  required
                />
                <p className="text-sm text-gray-600 mt-1">
                  A friendly name for your chatbot
                </p>
              </div>

              <div className="mb-6">
                <label htmlFor="domain" className="block text-sm font-bold mb-2">
                  Website Domain
                </label>
                <input
                  id="domain"
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="neo-input w-full"
                  placeholder="example.com"
                  required
                />
                <p className="text-sm text-gray-600 mt-1">
                  The website where this chatbot will be embedded
                </p>
              </div>

              <div className="mb-6">
                <label htmlFor="primaryColor" className="block text-sm font-bold mb-2">
                  Primary Color
                </label>
                <div className="flex gap-4 items-center">
                  <input
                    id="primaryColor"
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
                    placeholder="#E91E63"
                  />
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  This color will be used in your chat widget
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="neo-button-primary flex-1"
                >
                  {loading ? 'Creating...' : 'Create Chatbot'}
                </button>
                <Link href="/dashboard" className="neo-button-secondary">
                  Cancel
                </Link>
              </div>
            </form>
          </div>

          <div className="mt-6 neo-card bg-white p-6">
            <h3 className="font-bold mb-2">What happens next?</h3>
            <ul className="text-sm space-y-2 text-gray-600">
              <li>✓ Your chatbot will be created</li>
              <li>✓ Train it with your content (text or voice)</li>
              <li>✓ Get the embed code to add to your website</li>
              <li>✓ Your visitors can chat with your AI assistant</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
