import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { createSubscriptionCheckout, createCustomer } from '@/lib/services/stripe.service';
import { z } from 'zod';

const subscribeSchema = z.object({
  plan: z.enum(['starter', 'pro']),
});

// Price IDs from environment variables
const PRICE_IDS = {
  starter: process.env.EMILY_STARTER_EUR_PRICE_ID!,
  pro: process.env.EMILY_PRO_EUR_PRICE_ID!,
};

export async function POST(request: NextRequest) {
  try {
    const supabase = (await createClient()) as any;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { plan } = subscribeSchema.parse(body);

    // Get user's organization
    const serviceSupabase = (await createServiceClient()) as any;
    const { data: membership } = (await serviceSupabase
      .from('memberships')
      .select('org_id, organizations(*)')
      .eq('user_id', user.id)
      .single()) as any;

    if (!membership) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const org = membership.organizations as any;

    // Block WG customers from subscribing
    if (org.is_wg_linked) {
      return NextResponse.json(
        { error: 'Wonder George customers cannot purchase subscriptions' },
        { status: 403 }
      );
    }

    // Check if trying to downgrade
    const planOrder = { free: 0, starter: 1, pro: 2 };
    const currentOrder = planOrder[org.plan as keyof typeof planOrder] || 0;
    const targetOrder = planOrder[plan];

    if (currentOrder >= targetOrder) {
      return NextResponse.json(
        { error: 'Downgrades are not allowed. Contact support if you need to downgrade.' },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    const { data: stripeCustomer } = (await serviceSupabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('org_id', org.id)
      .single()) as any;

    let stripeCustomerId = stripeCustomer?.stripe_customer_id;

    if (!stripeCustomerId) {
      const customer = await createCustomer(user.email!, org.name, org.id);
      stripeCustomerId = customer.id;

      // Save in stripe_customers table
      await serviceSupabase
        .from('stripe_customers')
        .insert({
          org_id: org.id,
          stripe_customer_id: stripeCustomerId,
        } as any);
    }

    // Get price ID
    const priceId = PRICE_IDS[plan];
    if (!priceId) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Create checkout session
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const session = await createSubscriptionCheckout(
      stripeCustomerId,
      priceId,
      `${appUrl}/settings/subscription?success=true&plan=${plan}`,
      `${appUrl}/settings/subscription?canceled=true`
    );

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating subscription checkout:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}


