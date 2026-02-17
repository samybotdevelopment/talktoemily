import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = (await createClient()) as any;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceSupabase = (await createServiceClient()) as any;

    // Get user's organization
    const { data: membership } = (await serviceSupabase
      .from('memberships')
      .select('org_id, organizations(*)')
      .eq('user_id', user.id)
      .single()) as any;

    if (!membership) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const org = membership.organizations as any;

    // Clear onboarding state
    await (serviceSupabase
      .from('organizations') as any)
      .update({ onboarding_state: null })
      .eq('id', org.id);

    // Find and delete any incomplete websites (no onboarding_completed_at)
    const { data: incompleteWebsites } = (await serviceSupabase
      .from('websites')
      .select('id')
      .eq('org_id', org.id)
      .is('onboarding_completed_at', null)) as any;

    if (incompleteWebsites && incompleteWebsites.length > 0) {
      // Delete incomplete websites (cascade will delete related training_items, etc.)
      await serviceSupabase
        .from('websites')
        .delete()
        .in('id', incompleteWebsites.map((w: any) => w.id));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error canceling bot creation:', error);
    return NextResponse.json(
      { error: 'Failed to cancel bot creation' },
      { status: 500 }
    );
  }
}


