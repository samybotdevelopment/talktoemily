import Link from 'next/link';

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-page px-4">
      <div className="neo-card bg-white p-6 sm:p-8 w-full max-w-md text-center">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4">Authentication Error</h1>
        <p className="text-sm sm:text-base text-gray-600 mb-6">
          There was a problem verifying your email. The link may have expired or already been used.
        </p>
        <div className="space-y-4">
          <Link href="/auth/login" className="neo-button-primary block">
            Back to Login
          </Link>
          <Link href="/auth/signup" className="neo-button-secondary block">
            Create New Account
          </Link>
        </div>
      </div>
    </div>
  );
}
