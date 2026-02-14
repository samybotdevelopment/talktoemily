'use client';

import { useState, useRef, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { setUserLocale } from '@/lib/locale';
import { locales, localeNames, type Locale } from '@/i18n';
import * as CountryFlags from 'country-flag-icons/react/3x2';

// Map locales to their country flag components
const flagComponents: Record<Locale, React.ComponentType<{ className?: string }>> = {
  en: CountryFlags.GB, // English - Great Britain flag
  fr: CountryFlags.FR, // French - France flag
  de: CountryFlags.DE, // German - Germany flag
  es: CountryFlags.ES, // Spanish - Spain flag
  it: CountryFlags.IT, // Italian - Italy flag
  pt: CountryFlags.PT, // Portuguese - Portugal flag
  nl: CountryFlags.NL, // Dutch - Netherlands flag
  da: CountryFlags.DK, // Danish - Denmark flag
  no: CountryFlags.NO, // Norwegian - Norway flag
  sv: CountryFlags.SE, // Swedish - Sweden flag
  pl: CountryFlags.PL, // Polish - Poland flag
  el: CountryFlags.GR, // Greek - Greece flag
  tr: CountryFlags.TR, // Turkish - Turkey flag
};

export function LanguageSwitcher() {
  const currentLocale = useLocale() as Locale;
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  async function handleLocaleChange(locale: Locale) {
    if (locale === currentLocale) {
      setIsOpen(false);
      return;
    }

    setIsPending(true);
    await setUserLocale(locale);
    setIsPending(false);
    setIsOpen(false);
    // The page will reload automatically due to middleware
  }

  const CurrentFlag = flagComponents[currentLocale];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
        aria-label="Select language"
      >
        <CurrentFlag className="w-5 h-5 rounded shadow-sm" />
        <span className="hidden sm:inline text-sm font-medium">
          {localeNames[currentLocale]}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 sm:w-64 bg-white rounded-lg shadow-lg border-4 border-black z-50 max-h-[70vh] overflow-y-auto">
          <div className="py-2">
            {locales.map((locale) => {
              const Flag = flagComponents[locale];
              const isSelected = locale === currentLocale;

              return (
                <button
                  key={locale}
                  onClick={() => handleLocaleChange(locale)}
                  disabled={isPending}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors disabled:opacity-50 ${
                    isSelected ? 'bg-fuchsia-50' : ''
                  }`}
                >
                  <Flag className="w-6 h-6 rounded shadow-sm flex-shrink-0" />
                  <span className={`text-sm font-medium ${isSelected ? 'text-fuchsia-primary' : 'text-gray-700'}`}>
                    {localeNames[locale]}
                  </span>
                  {isSelected && (
                    <svg
                      className="w-4 h-4 ml-auto text-fuchsia-primary flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

