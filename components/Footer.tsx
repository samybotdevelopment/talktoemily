'use client';

import { useTranslations } from 'next-intl';

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
            <a
              href="https://talktoemily.com/?page=legal"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-fuchsia-primary transition-colors font-medium"
            >
              {t('legal')}
            </a>
            <a
              href="https://talktoemily.com/?page=privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-fuchsia-primary transition-colors font-medium"
            >
              {t('privacy')}
            </a>
            <a
              href="https://talktoemily.com/?page=legal"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-fuchsia-primary transition-colors font-medium"
            >
              {t('terms')}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}





