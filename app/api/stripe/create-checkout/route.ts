import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { createCustomer, createSubscriptionCheckout } from '@/lib/services/stripe.service';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { priceId } = await request.json();

    if (!priceId) {
      return NextResponse.json({ error: 'Price ID required' }, { status: 400 });
    }

    // Get user's organization
    const { data: memberships } = (await supabase
      .from('memberships')
      .select('org_id, organizations(*)')
      .eq('user_id', user.id)
      .single()) as any;

    if (!memberships) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    const org = memberships.organizations as any;

    // Check if customer exists
    let { data: stripeCustomer } = (await supabase
      .from('stripe_customers')
      .select('*')
      .eq('org_id', org.id)
      .single()) as any;

    // Create Stripe customer if doesn't exist
    if (!stripeCustomer) {
      const customer = await createCustomer(user.email!, org.name, org.id);

      const { data: newCustomer } = (await supabase
      .from('stripe_customers')
        .insert({
          org_id: org.id,
          stripe_customer_id: customer.id,
        } as any)
        .select()
      .single()) as any;

      stripeCustomer = newCustomer;
    }

    if (!stripeCustomer) {
      return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
    }

    // Create checkout session
    const session = await createSubscriptionCheckout(
      stripeCustomer.stripe_customer_id,
      priceId,
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/subscription?success=true`,
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/subscription?canceled=true`
    );

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
