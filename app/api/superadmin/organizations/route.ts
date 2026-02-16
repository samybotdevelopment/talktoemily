import { createClient, createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userData } = (await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()) as any;

    if (!userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Use service client to bypass RLS and see ALL data
    const serviceSupabase = await createServiceClient();

    // Get query params
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    // Get all organizations with their user data and stats
    let query = serviceSupabase
      .from('organizations')
      .select(`
        id,
        name,
        plan,
        wg_plan,
        credits_balance,
        frozen_credits,
        max_websites,
        created_at,
        users!inner(
          id,
          email
        )
      `)
      .order('created_at', { ascending: false });

    // Apply search filter if provided
    if (search) {
      query = query.or(`name.ilike.%${search}%,users.email.ilike.%${search}%`);
    }

    const { data: organizations, error } = await query;

    if (error) throw error;

    // Get additional stats for each org (website count, Stripe info)
    const orgsWithStats = await Promise.all(
      (organizations || []).map(async (org) => {
        // Get website count
        const { count: websiteCount } = await serviceSupabase
          .from('websites')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', org.id);

        // Get Stripe customer info
        const { data: stripeCustomer } = (await serviceSupabase
      .from('stripe_customers')
          .select('stripe_customer_id, stripe_subscription_id, subscription_cancel_at_period_end, subscription_current_period_end')
          .eq('org_id', org.id)
      .single()) as any;

        // Determine effective plan (WG plan overrides regular plan)
        const effectivePlan = org.wg_plan || org.plan;

        return {
          ...org,
          websiteCount: websiteCount || 0,
          stripeCustomerId: stripeCustomer?.stripe_customer_id || null,
          hasActiveSubscription: !!stripeCustomer?.stripe_subscription_id,
          subscriptionCancelAtPeriodEnd: stripeCustomer?.subscription_cancel_at_period_end || false,
          subscriptionCurrentPeriodEnd: stripeCustomer?.subscription_current_period_end || null,
          effectivePlan,
        };
      })
    );

    return NextResponse.json({ organizations: orgsWithStats });
  } catch (error: any) {
    console.error('Error fetching organizations:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch organizations' },
      { status: 500 }
    );
  }
}

