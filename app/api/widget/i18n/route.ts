import { NextResponse } from 'next/server';
import enMessages from '@/messages/en.json';
import frMessages from '@/messages/fr.json';

const messages: Record<string, any> = {
  en: enMessages,
  fr: frMessages,
  // Other languages will use English as fallback for now
  de: enMessages,
  es: enMessages,
  it: enMessages,
  pt: enMessages,
  nl: enMessages,
  da: enMessages,
  no: enMessages,
  sv: enMessages,
  pl: enMessages,
  el: enMessages,
  tr: enMessages,
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const locale = searchParams.get('locale') || 'en';

  // Get widget translations for the requested locale
  const widgetTranslations = messages[locale]?.widget || messages.en.widget;

  return NextResponse.json({ translations: widgetTranslations });
}



