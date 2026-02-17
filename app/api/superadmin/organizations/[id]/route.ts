import { createClient, createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orgId } = await context.params;
    const supabase = (await createClient()) as any;

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
    const serviceSupabase = (await createServiceClient()) as any;

    // Get organization details
    const { data: org, error: orgError } = (await serviceSupabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single()) as any;

    if (orgError || !org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Get all users in this org
    const { data: users } = await serviceSupabase
      .from('users')
      .select('id, email, created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    // Get all websites
    const { data: websites } = (await serviceSupabase
      .from('websites')
      .select('id, display_name, domain, is_active, training_count, created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })) as any;

    // Get Stripe customer info
    const { data: stripeCustomer } = (await serviceSupabase
      .from('stripe_customers')
      .select('*')
      .eq('org_id', orgId)
      .single()) as any;

    // Get conversation and message counts
    const { count: conversationCount } = await serviceSupabase
      .from('conversations')
      .select('id', { count: 'exact', head: true })
      .in('website_id', websites?.map((w: any) => w.id) || []);

    const { count: messageCount } = await serviceSupabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .in('conversation_id', 
        (await serviceSupabase
          .from('conversations')
          .select('id')
          .in('website_id', websites?.map((w: any) => w.id) || [])
        ).data?.map((c: any) => c.id) || []
      );

    // Get recent training runs
    const { data: recentTrainings } = await serviceSupabase
      .from('training_runs')
      .select('id, website_id, status, created_at, completed_at')
      .in('website_id', websites?.map((w: any) => w.id) || [])
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      organization: org,
      users: users || [],
      websites: websites || [],
      stripeCustomer: stripeCustomer || null,
      stats: {
        conversationCount: conversationCount || 0,
        messageCount: messageCount || 0,
        websiteCount: websites?.length || 0,
        userCount: users?.length || 0,
      },
      recentTrainings: recentTrainings || [],
    });
  } catch (error: any) {
    console.error('Error fetching organization details:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch organization' },
      { status: 500 }
    );
  }
}

