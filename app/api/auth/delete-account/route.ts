import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: memberships } = await supabase
      .from('memberships')
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    if (!memberships) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const orgId = memberships.org_id;

    // Delete all data related to the organization (using service client for admin operations)
    
    // 1. Get all website IDs for this org
    const { data: websites } = await serviceClient
      .from('websites')
      .select('id')
      .eq('org_id', orgId);

    const websiteIds = websites?.map((w: any) => w.id) || [];

    // 2. Delete all messages (from conversations in websites of this org)
    if (websiteIds.length > 0) {
      const { data: conversations } = await serviceClient
        .from('conversations')
        .select('id')
        .in('website_id', websiteIds);

      if (conversations && conversations.length > 0) {
        const conversationIds = conversations.map((c: any) => c.id);
        await serviceClient
          .from('messages')
          .delete()
          .in('conversation_id', conversationIds);
      }

      // 3. Delete all conversations
      await serviceClient
        .from('conversations')
        .delete()
        .in('website_id', websiteIds);

      // 4. Delete all training runs
      await serviceClient
        .from('training_runs')
        .delete()
        .in('website_id', websiteIds);

      // 5. Delete all training items
      await serviceClient
        .from('training_items')
        .delete()
        .in('website_id', websiteIds);

      // 6. Delete all websites
      await serviceClient
        .from('websites')
        .delete()
        .in('id', websiteIds);
    }

    // 7. Delete usage tracking
    await serviceClient.from('usage_tracking').delete().eq('org_id', orgId);

    // 8. Delete Stripe customer data
    await serviceClient.from('stripe_customers').delete().eq('org_id', orgId);

    // 9. Delete memberships
    await serviceClient.from('memberships').delete().eq('org_id', orgId);

    // 10. Delete organization
    await serviceClient.from('organizations').delete().eq('id', orgId);

    // 11. Sign out the user first
    await supabase.auth.signOut();

    // 12. Delete user from auth using service client admin API
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
