import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getWGWebsites } from '@/lib/integrations/wg-api';

/**
 * POST /api/onboarding/websites
 * Get WG websites for current user
 */
export async function POST(request: Request) {
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
    const { data: memberships } = (await serviceSupabase
      .from('memberships')
      .select('org_id, organizations(*)')
      .eq('user_id', user.id)
      .single()) as any;

    if (!memberships) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const org = memberships.organizations as any;

    if (!org.is_wg_linked || !org.wg_user_id) {
      return NextResponse.json({ error: 'Not a WG customer' }, { status: 403 });
    }

    // Fetch websites from WG API
    const websites = await getWGWebsites(org.wg_user_id);

    return NextResponse.json({
      success: true,
      websites,
    });
  } catch (error) {
    console.error('Error fetching WG websites:', error);
    return NextResponse.json({ error: 'Failed to fetch websites' }, { status: 500 });
  }
}

