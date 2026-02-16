'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SignOutButton } from './SignOutButton';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useTranslations } from 'next-intl';

interface HeaderProps {
  userName?: string;
  orgName?: string;
  showAuth?: boolean;
}

export function Header({ userName, orgName, showAuth = false }: HeaderProps) {
  const t = useTranslations('navigation');
  const tHeader = useTranslations('header');
  const tAuth = useTranslations('auth');
  const tCommon = useTranslations('common');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (path: string) => pathname?.startsWith(path);

  return (
    <>
      <header className="bg-white border-b-4 border-black sticky top-0 z-50">
        <nav className="neo-container">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo */}
            <Link href={showAuth ? "/dashboard" : "/"} className="flex items-center">
              <img 
                src="/Emily_wide_logo.png" 
                alt="Emily" 
                className="h-8 sm:h-10 w-auto"
              />
              {orgName && <div className="ml-3 text-xs text-gray-600 hidden sm:block">{orgName}</div>}
            </Link>

            {/* Desktop Navigation */}
            {showAuth ? (
              <>
                <div className="hidden md:flex items-center gap-6">
                  <Link 
                    href="/dashboard" 
                    className={`font-bold hover:text-fuchsia-primary transition-colors ${isActive('/dashboard') ? 'text-fuchsia-primary' : ''}`}
                  >
                    {t('dashboard')}
                  </Link>
                  <Link 
                    href="/settings/subscription" 
                    className={`font-bold hover:text-fuchsia-primary transition-colors ${isActive('/settings/subscription') ? 'text-fuchsia-primary' : ''}`}
                  >
                    {t('subscription')}
                  </Link>
                  <Link 
                    href="/settings/credits" 
                    className={`font-bold hover:text-fuchsia-primary transition-colors ${isActive('/settings/credits') ? 'text-fuchsia-primary' : ''}`}
                  >
                    {t('credits')}
                  </Link>
                  <Link 
                    href="/settings" 
                    className={`font-bold hover:text-fuchsia-primary transition-colors ${isActive('/settings') && !pathname?.includes('/subscription') && !pathname?.includes('/credits') ? 'text-fuchsia-primary' : ''}`}
                  >
                    {tHeader('settings')}
                  </Link>
                </div>

                {/* User Menu on Desktop */}
                <div className="hidden md:flex items-center gap-4">
                  <LanguageSwitcher />
                  {userName && (
                    <div className="text-sm">
                      <div className="text-gray-600">{tHeader('signedInAs')}</div>
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
                <LanguageSwitcher />
                <Link href="/auth/login" className="neo-button-secondary text-sm sm:text-base px-3 py-2 sm:px-6 sm:py-3">
                  {tAuth('login.title')}
                </Link>
                <Link href="/auth/signup" className="neo-button-primary text-sm sm:text-base px-3 py-2 sm:px-6 sm:py-3">
                  {tCommon('getStarted')}
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
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className={`text-3xl font-bold py-4 border-b-4 border-black ${isActive('/dashboard') ? 'text-fuchsia-primary' : ''}`}
              >
                {t('dashboard')}
              </Link>
              <Link
                href="/settings/subscription"
                onClick={() => setMobileMenuOpen(false)}
                className={`text-3xl font-bold py-4 border-b-4 border-black ${isActive('/settings/subscription') ? 'text-fuchsia-primary' : ''}`}
              >
                {t('subscription')}
              </Link>
              <Link
                href="/settings/credits"
                onClick={() => setMobileMenuOpen(false)}
                className={`text-3xl font-bold py-4 border-b-4 border-black ${isActive('/settings/credits') ? 'text-fuchsia-primary' : ''}`}
              >
                {t('credits')}
              </Link>
              <Link
                href="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className={`text-3xl font-bold py-4 border-b-4 border-black ${isActive('/settings') && !pathname?.includes('/subscription') && !pathname?.includes('/credits') ? 'text-fuchsia-primary' : ''}`}
              >
                {tHeader('settings')}
              </Link>
            </div>

            <div className="mt-auto">
              {/* Language Switcher in Mobile Menu */}
              <div className="mb-6">
                <LanguageSwitcher />
              </div>
              
              {userName && (
                <div className="mb-6 p-6 neo-card bg-gray-50">
                  <div className="text-sm text-gray-600">{tHeader('signedInAs')}</div>
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
                  {tAuth('signOut')}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
