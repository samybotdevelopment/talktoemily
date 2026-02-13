import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { createPortalSession, createCustomer } from '@/lib/services/stripe.service';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const serviceSupabase = await createServiceClient();
    const { data: membership } = await serviceSupabase
      .from('memberships')
      .select('org_id, organizations(*)')
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const org = membership.organizations as any;

    // Get or create Stripe customer
    const { data: stripeCustomer } = await serviceSupabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('org_id', org.id)
      .single();

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
        });
    }

    // Create portal session
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const session = await createPortalSession(
      stripeCustomerId,
      `${appUrl}/settings`
    );

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    );
  }
}
