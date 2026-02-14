import { createClient, createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orgId } = await context.params;
    const body = await request.json();
    const { plan } = body;

    if (!plan || !['starter', 'pro'].includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid plan. Must be "starter" or "pro"' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Grant plan using service client
    const serviceSupabase = await createServiceClient();

    // Determine max_websites and monthly credits
    const maxWebsites = plan === 'starter' ? 1 : 5;
    const monthlyCredits = plan === 'starter' ? 100 : 250;

    // Get current org data
    const { data: org } = await serviceSupabase
      .from('organizations')
      .select('credits_balance, frozen_credits, plan')
      .eq('id', orgId)
      .single();

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Unfreeze credits if upgrading from Free
    const isUpgradingFromFree = org.plan === 'free';
    let unfrozenCredits = 0;
    if (isUpgradingFromFree && org.frozen_credits > 0) {
      unfrozenCredits = org.frozen_credits;
    }

    // Update organization
    const { error: updateError } = await serviceSupabase
      .from('organizations')
      .update({
        plan,
        max_websites: maxWebsites,
        credits_balance: org.credits_balance + unfrozenCredits + monthlyCredits,
        frozen_credits: 0,
      })
      .eq('id', orgId);

    if (updateError) {
      throw updateError;
    }

    // Reactivate inactive bots if upgrading
    if (isUpgradingFromFree) {
      const { data: inactiveBots } = await serviceSupabase
        .from('websites')
        .select('id')
        .eq('org_id', orgId)
        .eq('is_active', false)
        .order('created_at', { ascending: true });

      if (inactiveBots && inactiveBots.length > 0) {
        const { data: activeBots } = await serviceSupabase
          .from('websites')
          .select('id')
          .eq('org_id', orgId)
          .eq('is_active', true);

        const currentActiveCount = activeBots?.length || 0;
        const availableSlots = maxWebsites - currentActiveCount;
        const botsToReactivate = Math.min(availableSlots, inactiveBots.length);

        if (botsToReactivate > 0) {
          const idsToReactivate = inactiveBots.slice(0, botsToReactivate).map(b => b.id);
          
          await serviceSupabase
            .from('websites')
            .update({ is_active: true })
            .in('id', idsToReactivate);
        }
      }
    }

    console.log(`✅ Admin granted ${plan} plan to org ${orgId} (credits: +${monthlyCredits + unfrozenCredits})`);

    return NextResponse.json({
      success: true,
      message: `Successfully granted ${plan} plan`,
      creditsAdded: monthlyCredits + unfrozenCredits,
    });
  } catch (error: any) {
    console.error('Error granting plan:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to grant plan' },
      { status: 500 }
    );
  }
}

