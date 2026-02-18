import Link from 'next/link';

export default function EmailVerifiedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-page px-4">
      <div className="neo-card bg-white p-6 sm:p-8 w-full max-w-md text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg 
              className="w-8 h-8 text-green-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M5 13l4 4L19 7" 
              />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-4">Email Verified!</h1>
          <p className="text-sm sm:text-base text-gray-600 mb-6">
            Your email has been successfully verified. You can now sign in to your account.
          </p>
        </div>
        <Link href="/auth/login" className="neo-button-primary block w-full">
          Sign In
        </Link>
      </div>
    </div>
  );
}

