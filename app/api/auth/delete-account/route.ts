import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = (await createClient()) as any;
    const serviceClient = (await createServiceClient()) as any;

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: memberships, error: membershipError } = (await supabase
      .from('memberships')
      .select('org_id')
      .eq('user_id', user.id)
      .single()) as any;

    if (!memberships || membershipError) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const orgId = (memberships as { org_id: string }).org_id;

    // Check if there are any bots (websites) still on the account
    const { data: websites, error: websitesError } = await supabase
      .from('websites')
      .select('id, display_name')
      .eq('org_id', orgId);

    if (websitesError) {
      return NextResponse.json(
        { error: 'Failed to check for existing bots' },
        { status: 500 }
      );
    }

    // If there are any bots, prevent deletion
    if (websites && websites.length > 0) {
      return NextResponse.json(
        { 
          error: 'Please delete all bots before deleting your account',
          hasBots: true,
          botCount: websites.length
        },
        { status: 400 }
      );
    }

    // Delete all data related to the organization (using service client for admin operations)
    // At this point, there are no websites to delete since we checked above

    // 2. Delete usage tracking
    await serviceClient.from('usage_tracking').delete().eq('org_id', orgId);

    // 3. Delete Stripe customer data
    await serviceClient.from('stripe_customers').delete().eq('org_id', orgId);

    // 4. Delete memberships
    await serviceClient.from('memberships').delete().eq('org_id', orgId);

    // 5. Delete organization
    await serviceClient.from('organizations').delete().eq('id', orgId);

    // 6. Sign out the user first
    await supabase.auth.signOut();

    // 7. Delete user from auth using service client admin API
    try {
      await serviceClient.auth.admin.deleteUser(user.id);
    } catch (error) {
      console.error('Error deleting auth user:', error);
      // Auth user deletion failed but data is cleaned up - account is effectively deleted
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}

