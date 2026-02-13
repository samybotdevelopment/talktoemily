'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function DeleteAccountButton() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/delete-account', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete account');
      }

      router.push('/auth/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsDeleting(false);
    }
  };

  return (
    <div>
      {error && (
        <div className="mb-4 p-4 bg-red-100 border-2 border-red-600 rounded-lg text-red-700 font-bold">
          {error}
        </div>
      )}
      <button
        onClick={handleDeleteAccount}
        disabled={isDeleting}
        className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg border-2 border-red-900 transition-colors"
      >
        {isDeleting ? 'Deleting Account...' : 'Delete Account'}
      </button>
      <p className="text-sm text-gray-600 mt-2">
        This action will permanently delete your account and all associated data.
      </p>
    </div>
  );
}
