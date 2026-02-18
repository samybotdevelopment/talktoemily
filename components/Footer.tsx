'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';

export function Footer() {
  const t = useTranslations('footer');
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t-4 border-black mt-auto">
      <div className="neo-container py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          {/* Copyright */}
          <div className="text-center md:text-left">
            <p className="text-sm text-gray-600">
              {t('copyright', { year: currentYear })} <span className="font-bold">{t('company')}</span>
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap justify-center items-center gap-6 text-sm">
            <a
              href="https://wondergeorge.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-fuchsia-primary transition-colors font-medium"
            >
              {t('wonderGeorge')}
            </a>
            <Link href="/legal" className="text-gray-600 hover:text-fuchsia-primary transition-colors font-medium">
              {t('legal')}
            </Link>
            <Link href="/privacy" className="text-gray-600 hover:text-fuchsia-primary transition-colors font-medium">
              {t('privacy')}
            </Link>
            <Link href="/terms" className="text-gray-600 hover:text-fuchsia-primary transition-colors font-medium">
              {t('terms')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}





