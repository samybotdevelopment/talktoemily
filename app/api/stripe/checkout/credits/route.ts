import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { createCreditsCheckout, createCustomer } from '@/lib/services/stripe.service';
import { z } from 'zod';

const purchaseSchema = z.object({
  credits: z.number().int().positive(),
  amount: z.number().positive(),
});

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
    const { credits, amount } = purchaseSchema.parse(body);

    // Validate credit pack (must match our predefined packs)
    const validPacks = [
      { credits: 500, amount: 9 },
      { credits: 5000, amount: 49 },
      { credits: 50000, amount: 299 },
    ];

    const isValidPack = validPacks.some(
      (pack) => pack.credits === credits && pack.amount === amount
    );

    if (!isValidPack) {
      return NextResponse.json({ error: 'Invalid credit pack' }, { status: 400 });
    }

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
    
    console.log('ðŸ¢ Organization:', { id: org.id, name: org.name, stripe_customer_id: org.stripe_customer_id });

    // Check if user has active subscription
    const hasActiveSubscription = 
      org.plan === 'starter' || 
      org.plan === 'pro' || 
      (org.is_wg_linked && org.wg_plan !== 'free');

    if (!hasActiveSubscription) {
      return NextResponse.json(
        { error: 'Active subscription required to purchase credits' },
        { status: 403 }
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

      console.log('ðŸ†• Created new Stripe customer:', stripeCustomerId);

      // Save in stripe_customers table
      await serviceSupabase
        .from('stripe_customers')
        .insert({
          org_id: org.id,
          stripe_customer_id: stripeCustomerId,
        } as any);

      console.log('âœ… Saved stripe_customer to stripe_customers table');
    }

    // Create checkout session
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const session = await createCreditsCheckout(
      stripeCustomerId,
      credits,
      amount,
      `${appUrl}/settings/credits?success=true&credits=${credits}`,
      `${appUrl}/settings/credits?canceled=true`
    );

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}


