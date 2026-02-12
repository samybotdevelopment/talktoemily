'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SignOutButton } from './SignOutButton';

interface ChatbotNav {
  websiteId: string;
  websiteName: string;
  websiteColor?: string;
}

interface HeaderProps {
  userName?: string;
  orgName?: string;
  showAuth?: boolean;
  chatbotNav?: ChatbotNav;
}

export function Header({ userName, orgName, showAuth = false, chatbotNav }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (path: string) => pathname?.startsWith(path);
  const isExactPath = (path: string) => pathname === path;

  return (
    <>
      <header className="bg-white border-b-4 border-black sticky top-0 z-50">
        <nav className="neo-container">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo */}
            <Link href={showAuth ? "/dashboard" : "/"} className="flex items-center gap-2">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-fuchsia-primary border-4 border-black rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl sm:text-2xl">E</span>
              </div>
              <div className="hidden sm:block">
                <div className="font-bold text-xl">Emily</div>
                {orgName && <div className="text-xs text-gray-600">{orgName}</div>}
              </div>
            </Link>

            {/* Desktop Navigation */}
            {showAuth ? (
              <>
                <div className="hidden md:flex items-center gap-6">
                  {chatbotNav ? (
                    <>
                      <Link 
                        href={`/websites/${chatbotNav.websiteId}`}
                        className={`font-bold hover:text-fuchsia-primary transition-colors ${isExactPath(`/websites/${chatbotNav.websiteId}`) ? 'text-fuchsia-primary' : ''}`}
                      >
                        Overview
                      </Link>
                      <Link 
                        href={`/websites/${chatbotNav.websiteId}/training`}
                        className={`font-bold hover:text-fuchsia-primary transition-colors ${isActive(`/websites/${chatbotNav.websiteId}/training`) ? 'text-fuchsia-primary' : ''}`}
                      >
                        Training
                      </Link>
                      <Link 
                        href={`/websites/${chatbotNav.websiteId}/conversations`}
                        className={`font-bold hover:text-fuchsia-primary transition-colors ${isActive(`/websites/${chatbotNav.websiteId}/conversations`) ? 'text-fuchsia-primary' : ''}`}
                      >
                        Conversations
                      </Link>
                      <Link 
                        href={`/websites/${chatbotNav.websiteId}/settings`}
                        className={`font-bold hover:text-fuchsia-primary transition-colors ${isActive(`/websites/${chatbotNav.websiteId}/settings`) ? 'text-fuchsia-primary' : ''}`}
                      >
                        Settings
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link 
                        href="/dashboard" 
                        className={`font-bold hover:text-fuchsia-primary transition-colors ${isActive('/dashboard') && !pathname?.includes('/websites') ? 'text-fuchsia-primary' : ''}`}
                      >
                        Dashboard
                      </Link>
                      <Link 
                        href="/settings/subscription" 
                        className={`font-bold hover:text-fuchsia-primary transition-colors ${isActive('/settings') ? 'text-fuchsia-primary' : ''}`}
                      >
                        Settings
                      </Link>
                    </>
                  )}
                </div>

                {/* User Menu on Desktop */}
                <div className="hidden md:flex items-center gap-4">
                  {userName && (
                    <div className="text-sm">
                      <div className="text-gray-600">Signed in as</div>
                      <div className="font-bold">{userName}</div>
                    </div>
                  )}
                  <SignOutButton />
                </div>

                {/* Mobile Hamburger */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Toggle menu"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {mobileMenuOpen ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    ) : (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M4 6h16M4 12h16M4 18h16"
                      />
                    )}
                  </svg>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2 sm:gap-4">
                <Link href="/auth/login" className="neo-button-secondary text-sm sm:text-base px-3 py-2 sm:px-6 sm:py-3">
                  Sign In
                </Link>
                <Link href="/auth/signup" className="neo-button-primary text-sm sm:text-base px-3 py-2 sm:px-6 sm:py-3">
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </nav>
      </header>

      {/* Mobile Full-Page Menu */}
      {showAuth && mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-white md:hidden">
          <div className="flex flex-col h-full p-8 pt-24">
            <div className="flex flex-col gap-6">
              {chatbotNav ? (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-2xl font-bold py-4 border-b-4 border-black hover:text-fuchsia-primary"
                  >
                    ← Back to Dashboard
                  </Link>
                  <div className="mb-4">
                    <div className="flex items-center gap-3 mb-6">
                      <div
                        className="w-12 h-12 rounded-lg border-4 border-black flex items-center justify-center font-bold text-xl"
                        style={{ backgroundColor: chatbotNav.websiteColor || '#E91E63' }}
                      >
                        {chatbotNav.websiteName[0]}
                      </div>
                      <div className="font-bold text-lg">{chatbotNav.websiteName}</div>
                    </div>
                  </div>
                  <Link
                    href={`/websites/${chatbotNav.websiteId}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`text-2xl font-bold py-4 border-b-4 border-black ${isExactPath(`/websites/${chatbotNav.websiteId}`) ? 'text-fuchsia-primary' : ''}`}
                  >
                    Overview
                  </Link>
                  <Link
                    href={`/websites/${chatbotNav.websiteId}/training`}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`text-2xl font-bold py-4 border-b-4 border-black ${isActive(`/websites/${chatbotNav.websiteId}/training`) ? 'text-fuchsia-primary' : ''}`}
                  >
                    Training
                  </Link>
                  <Link
                    href={`/websites/${chatbotNav.websiteId}/conversations`}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`text-2xl font-bold py-4 border-b-4 border-black ${isActive(`/websites/${chatbotNav.websiteId}/conversations`) ? 'text-fuchsia-primary' : ''}`}
                  >
                    Conversations
                  </Link>
                  <Link
                    href={`/websites/${chatbotNav.websiteId}/settings`}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`text-2xl font-bold py-4 border-b-4 border-black ${isActive(`/websites/${chatbotNav.websiteId}/settings`) ? 'text-fuchsia-primary' : ''}`}
                  >
                    Settings
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`text-3xl font-bold py-4 border-b-4 border-black ${isActive('/dashboard') && !pathname?.includes('/websites') ? 'text-fuchsia-primary' : ''}`}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/settings/subscription"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`text-3xl font-bold py-4 border-b-4 border-black ${isActive('/settings') ? 'text-fuchsia-primary' : ''}`}
                  >
                    Settings
                  </Link>
                </>
              )}
            </div>

            <div className="mt-auto">
              {userName && (
                <div className="mb-6 p-6 neo-card bg-gray-50">
                  <div className="text-sm text-gray-600">Signed in as</div>
                  <div className="font-bold">{userName}</div>
                  {orgName && <div className="text-sm text-gray-600">{orgName}</div>}
                </div>
              )}
              <form action="/auth/signout" method="post" className="w-full">
                <button
                  type="submit"
                  className="neo-button-secondary w-full"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
