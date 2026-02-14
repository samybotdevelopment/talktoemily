import Link from 'next/link';
import { Header } from '@/components/Header';
import { getTranslations } from 'next-intl/server';

export default async function Home() {
  const t = await getTranslations('landing');
  const tCommon = await getTranslations('common');
  
  return (
    <div className="flex-1 flex flex-col bg-page">
      <Header showAuth={false} />
      
      <div className="flex-1 flex items-center justify-center px-4 py-12 sm:py-20">
        <div className="neo-container text-center">
          <h1 className="text-4xl sm:text-6xl font-bold mb-6">
            {t('title', { name: t('titleName') }).split(t('titleName'))[0]}
            <span className="text-fuchsia-primary">{t('titleName')}</span>
          </h1>
          <p className="text-lg sm:text-2xl text-gray-600 mb-12 max-w-2xl mx-auto">
            {t('subtitle')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link href="/auth/signup" className="neo-button-primary w-full sm:w-auto">
              {tCommon('getStartedFree')}
            </Link>
            <Link href="/auth/login" className="neo-button-secondary w-full sm:w-auto">
              {tCommon('signIn')}
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="neo-card bg-white p-6">
              <h3 className="text-xl font-bold mb-2">{t('features.easyTraining.title')}</h3>
              <p className="text-gray-600">
                {t('features.easyTraining.description')}
              </p>
            </div>

            <div className="neo-card bg-white p-6">
              <h3 className="text-xl font-bold mb-2">{t('features.instantAnswers.title')}</h3>
              <p className="text-gray-600">
                {t('features.instantAnswers.description')}
              </p>
            </div>

            <div className="neo-card bg-white p-6">
              <h3 className="text-xl font-bold mb-2">{t('features.customizable.title')}</h3>
              <p className="text-gray-600">
                {t('features.customizable.description')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

