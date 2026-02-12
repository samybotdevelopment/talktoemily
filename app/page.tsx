import Link from 'next/link';
import { Header } from '@/components/Header';

export default function Home() {
  return (
    <div className="min-h-screen bg-page">
      <Header showAuth={false} />
      
      <div className="flex items-center justify-center px-4 py-12 sm:py-20">
        <div className="neo-container text-center">
          <h1 className="text-4xl sm:text-6xl font-bold mb-6">
            Talk to <span className="text-fuchsia-primary">Emily</span>
          </h1>
          <p className="text-lg sm:text-2xl text-gray-600 mb-12 max-w-2xl mx-auto">
            AI-powered chat assistant for your website. Train it with your content, 
            deploy it in minutes.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link href="/auth/signup" className="neo-button-primary w-full sm:w-auto">
              Get Started Free
            </Link>
            <Link href="/auth/login" className="neo-button-secondary w-full sm:w-auto">
              Sign In
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="neo-card bg-white p-6">
              <h3 className="text-xl font-bold mb-2">Easy Training</h3>
              <p className="text-gray-600">
                Train your chatbot with text or voice. No technical knowledge required.
              </p>
            </div>

            <div className="neo-card bg-white p-6">
              <h3 className="text-xl font-bold mb-2">Instant Answers</h3>
              <p className="text-gray-600">
                AI-powered responses using your knowledge base. Fast and accurate.
              </p>
            </div>

            <div className="neo-card bg-white p-6">
              <h3 className="text-xl font-bold mb-2">Customizable</h3>
              <p className="text-gray-600">
                Match your brand with custom colors and styling options.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

