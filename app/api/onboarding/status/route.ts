import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { OnboardingState } from '@/types/models';

/**
 * GET /api/onboarding/status
 * Check if onboarding is needed for current user and return saved state
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceSupabase = await createServiceClient();

    // Get user's organization
    const { data: memberships } = (await serviceSupabase
      .from('memberships')
      .select('org_id, organizations(*)')
      .eq('user_id', user.id)
      .single()) as any;

    if (!memberships) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const org = memberships.organizations as any;

    return NextResponse.json({
      needs_onboarding: !org.onboarding_completed_at,
      wg_user_id: org.wg_user_id,
      is_wg_linked: org.is_wg_linked,
      onboarding_completed_at: org.onboarding_completed_at,
      onboarding_state: org.onboarding_state || null,
    });
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 });
  }
}

/**
 * POST /api/onboarding/status
 * Save onboarding state for current user
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceSupabase = await createServiceClient();

    // Get user's organization
    const { data: memberships } = (await serviceSupabase
      .from('memberships')
      .select('org_id, organizations(*)')
      .eq('user_id', user.id)
      .single()) as any;

    if (!memberships) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const org = memberships.organizations as any;

    // Parse request body
    const body = await request.json();
    const state: OnboardingState = body.state;

    // Save state to database
    const { error } = await (serviceSupabase
      .from('organizations') as any)
      .update({ onboarding_state: state })
      .eq('id', org.id);

    if (error) {
      console.error('Error saving onboarding state:', error);
      return NextResponse.json({ error: 'Failed to save state' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Onboarding state saved',
    });
  } catch (error) {
    console.error('Error saving onboarding state:', error);
    return NextResponse.json({ error: 'Failed to save state' }, { status: 500 });
  }
}