'use client';

import { useRouter } from 'next/navigation';

interface TrainingCostModalProps {
  itemCount: number;
  creditsBalance: number;
  isFreeTraining: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function TrainingCostModal({
  itemCount,
  creditsBalance,
  isFreeTraining,
  onClose,
  onConfirm,
}: TrainingCostModalProps) {
  const router = useRouter();
  const cost = itemCount; // 1 credit per item
  const hasEnoughCredits = creditsBalance >= cost;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="neo-card bg-white p-8 max-w-md w-full">
          {isFreeTraining ? (
            // Free Training
            <>
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">🎉</div>
                <h3 className="text-2xl font-bold mb-2">First Training is Free!</h3>
                <p className="text-gray-600">
                  Your first training is on us. You have{' '}
                  <span className="font-bold">{itemCount} training item{itemCount !== 1 ? 's' : ''}</span>{' '}
                  ready to go.
                </p>
              </div>

              <div className="neo-card bg-green-50 border-4 border-green-500 p-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="font-bold">Cost:</span>
                  <span className="text-xl font-bold text-green-600">FREE</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="neo-button-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  className="neo-button-primary flex-1"
                >
                  Start Training
                </button>
              </div>
            </>
          ) : hasEnoughCredits ? (
            // Has Enough Credits
            <>
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">⚙️</div>
                <h3 className="text-2xl font-bold mb-2">Confirm Training</h3>
                <p className="text-gray-600">
                  You have <span className="font-bold">{itemCount} training item{itemCount !== 1 ? 's' : ''}</span>.
                  Training costs 1 credit per item.
                </p>
              </div>

              <div className="space-y-3 mb-6">
                <div className="neo-card bg-gray-50 p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Training items:</span>
                    <span className="font-bold">{itemCount}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Cost (1 credit/item):</span>
                    <span className="font-bold">{cost} credits</span>
                  </div>
                  <div className="border-t-2 border-gray-300 my-2" />
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Your balance:</span>
                    <span className="font-bold">{creditsBalance} credits</span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-gray-600">After training:</span>
                    <span className="font-bold text-green-600">
                      {creditsBalance - cost} credits
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="neo-button-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  className="neo-button-primary flex-1"
                >
                  Confirm & Train
                </button>
              </div>
            </>
          ) : (
            // Not Enough Credits
            <>
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">💳</div>
                <h3 className="text-2xl font-bold mb-2 text-red-600">
                  Not Enough Credits
                </h3>
                <p className="text-gray-600">
                  You need <span className="font-bold">{cost} credits</span> to train your bot,
                  but you only have <span className="font-bold">{creditsBalance} credits</span>.
                </p>
              </div>

              <div className="neo-card bg-red-50 border-4 border-red-500 p-4 mb-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Training items:</span>
                    <span className="font-bold">{itemCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Required credits:</span>
                    <span className="font-bold">{cost}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Your balance:</span>
                    <span className="font-bold">{creditsBalance}</span>
                  </div>
                  <div className="border-t-2 border-red-300 my-2" />
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-red-600">Missing:</span>
                    <span className="font-bold text-red-600">
                      {cost - creditsBalance} credits
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="neo-button-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={() => router.push('/settings/credits')}
                  className="neo-button-primary flex-1"
                >
                  Purchase Credits
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}








