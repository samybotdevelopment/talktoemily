import { NextResponse } from 'next/server';
import enMessages from '@/messages/en.json';
import frMessages from '@/messages/fr.json';
import deMessages from '@/messages/de.json';
import esMessages from '@/messages/es.json';
import itMessages from '@/messages/it.json';
import ptMessages from '@/messages/pt.json';
import nlMessages from '@/messages/nl.json';
import daMessages from '@/messages/da.json';
import noMessages from '@/messages/no.json';
import svMessages from '@/messages/sv.json';
import plMessages from '@/messages/pl.json';
import elMessages from '@/messages/el.json';
import trMessages from '@/messages/tr.json';

const messages: Record<string, any> = {
  en: enMessages,
  fr: frMessages,
  de: deMessages,
  es: esMessages,
  it: itMessages,
  pt: ptMessages,
  nl: nlMessages,
  da: daMessages,
  no: noMessages,
  sv: svMessages,
  pl: plMessages,
  el: elMessages,
  tr: trMessages,
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const locale = searchParams.get('locale') || 'en';

  // Get widget translations for the requested locale
  const widgetTranslations = messages[locale]?.widget || messages.en.widget;

  return NextResponse.json({ translations: widgetTranslations });
}








