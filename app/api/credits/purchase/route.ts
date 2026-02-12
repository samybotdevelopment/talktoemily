import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { createPaymentIntent } from '@/lib/services/stripe.service';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, credits } = await request.json();

    if (!amount || !credits) {
      return NextResponse.json({ error: 'Amount and credits required' }, { status: 400 });
    }

    // Get user's organization
    const { data: memberships } = await supabase
      .from('memberships')
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    if (!memberships) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    // Get stripe customer
    const { data: stripeCustomer } = await supabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('org_id', memberships.org_id)
      .single();

    if (!stripeCustomer) {
      return NextResponse.json({ error: 'No Stripe customer found' }, { status: 404 });
    }

    // Create payment intent
    const paymentIntent = await createPaymentIntent(
      amount,
      stripeCustomer.stripe_customer_id,
      {
        type: 'credits',
        org_id: memberships.org_id,
        credits: credits.toString(),
      }
    );

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (error: any) {
    console.error('Payment intent error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
