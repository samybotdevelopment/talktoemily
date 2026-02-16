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

    // Get all metrics
    const [
      orgsResult,
      usersResult,
      conversationsResult,
      messagesResult,
      payingCustomersResult,
    ] = await Promise.all([
      // Total organizations
      serviceSupabase.from('organizations').select('id', { count: 'exact', head: true }),
      
      // Total users
      serviceSupabase.from('users').select('id', { count: 'exact', head: true }),
      
      // Total conversations
      serviceSupabase.from('conversations').select('id', { count: 'exact', head: true }),
      
      // Total messages
      serviceSupabase.from('messages').select('id', { count: 'exact', head: true }),
      
      // Paying customers (active subscriptions)
      serviceSupabase
        .from('stripe_customers')
        .select('stripe_subscription_id, subscription_cancel_at_period_end')
        .not('stripe_subscription_id', 'is', null),
    ]);

    // Calculate MRR and current month revenue
    const { data: allCustomers } = await serviceSupabase
      .from('stripe_customers')
      .select('stripe_subscription_id, org_id')
      .not('stripe_subscription_id', 'is', null);

    let activeMRR = 0;
    let payingCount = 0;

    if (allCustomers) {
      // Get org plans to calculate MRR
      const orgIds = allCustomers.map(c => c.org_id);
      const { data: orgs } = await serviceSupabase
        .from('organizations')
        .select('id, plan, wg_plan')
        .in('id', orgIds);

      const planPrices: Record<string, number> = {
        'starter': 9.99,
        'pro': 19.99,
      };

      orgs?.forEach(org => {
        const plan = org.wg_plan || org.plan;
        if (plan === 'starter' || plan === 'pro') {
          activeMRR += planPrices[plan] || 0;
          payingCount++;
        }
      });
    }

    // Calculate current month revenue (approximate based on active subs)
    const currentMonthRevenue = activeMRR;

    return NextResponse.json({
      totalOrganizations: orgsResult.count || 0,
      totalUsers: usersResult.count || 0,
      payingCustomers: payingCount,
      totalConversations: conversationsResult.count || 0,
      totalMessages: messagesResult.count || 0,
      currentMonthRevenue: Math.round(currentMonthRevenue * 100) / 100,
      activeMRR: Math.round(activeMRR * 100) / 100,
    });
  } catch (error: any) {
    console.error('Error fetching superadmin stats:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}

