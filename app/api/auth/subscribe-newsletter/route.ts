import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { addContactToMailingList } from '@/lib/services/mailjet.service';
import { cookies } from 'next/headers';

/**
 * Subscribe the current user to the Mailjet mailing list
 * Called after signup or can be called manually
 */
export async function POST(request: Request) {
  try {
    const supabase = (await createClient()) as any;

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user locale from cookie or default to 'en'
    const cookieStore = await cookies();
    const locale = cookieStore.get('NEXT_LOCALE')?.value || 'en';

    // Get user's email and name
    const email = user.email!;
    const name = user.user_metadata?.name || email.split('@')[0];

    // Add to mailing list
    await addContactToMailingList(email, name, locale);

    return NextResponse.json({ success: true, message: 'Subscribed to newsletter' });
  } catch (error) {
    console.error('Error subscribing to newsletter:', error);
    return NextResponse.json(
      { error: 'Failed to subscribe to newsletter' },
      { status: 500 }
    );
  }
}






