import { createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const websiteId = searchParams.get('websiteId');

  if (!websiteId) {
    return NextResponse.json({ error: 'websiteId is required' }, { status: 400 });
  }

  try {
    const supabase = (await createServiceClient()) as any;

    const { data: website, error } = await supabase
      .from('websites')
      .select('display_name, primary_color, widget_style, widget_subtitle, widget_welcome_title, widget_welcome_message, is_active')
      .eq('id', websiteId)
      .single();

    if (error || !website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    // Check if bot is active
    if (!website.is_active) {
      return NextResponse.json({
        error: 'Bot is currently inactive',
        message: 'This chatbot is temporarily unavailable. Please contact the website owner.',
        isInactive: true
      }, { 
        status: 403,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    return NextResponse.json({
      websiteName: website.display_name,
      primaryColor: website.primary_color,
      widgetStyle: website.widget_style || 'modern',
      widgetSubtitle: website.widget_subtitle || 'We reply instantly',
      widgetWelcomeTitle: website.widget_welcome_title || 'Hi there! ðŸ‘‹',
      widgetWelcomeMessage: website.widget_welcome_message || 'How can we help you today?',
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  } catch (error) {
    console.error('Widget init error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

