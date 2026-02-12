import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { createPortalSession } from '@/lib/services/stripe.service';

export async function POST() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization and stripe customer
    const { data: memberships } = await supabase
      .from('memberships')
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    if (!memberships) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    const { data: stripeCustomer } = await supabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('org_id', memberships.org_id)
      .single();

    if (!stripeCustomer) {
      return NextResponse.json({ error: 'No Stripe customer found' }, { status: 404 });
    }

    // Create portal session
    const session = await createPortalSession(
      stripeCustomer.stripe_customer_id,
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/subscription`
    );

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Portal session error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create portal session' },
      { status: 500 }
    );
  }
}
