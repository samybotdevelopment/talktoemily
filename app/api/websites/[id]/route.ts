import { createClient, createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { deleteCollection } from '@/lib/services/qdrant.service';
import { activateWGWidget } from '@/lib/integrations/wg-api';

/**
 * DELETE /api/websites/[id]
 * Delete a website/bot and all associated data
 */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: websiteId } = await context.params;
    const supabase = (await createClient()) as any;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceSupabase = (await createServiceClient()) as any;

    // Verify user owns this website
    const { data: website } = await serviceSupabase
      .from('websites')
      .select('*, organizations(id)')
      .eq('id', websiteId)
      .single();

    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    // Verify user is member of the org
    const { data: membership } = await serviceSupabase
      .from('memberships')
      .select('*')
      .eq('user_id', user.id)
      .eq('org_id', (website.organizations as any).id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Deactivate WG widget if this is a WG-linked website
    if (website.wg_website_id && (website.organizations as any).wg_user_id) {
      try {
        await activateWGWidget(
          (website.organizations as any).wg_user_id,
          website.wg_website_id,
          '',
          false // Deactivate
        );
        console.log(`✅ Deactivated WG widget for website ${websiteId}`);
      } catch (error) {
        console.error('Error deactivating WG widget:', error);
        // Continue even if WG deactivation fails
      }
    }

    // Delete Qdrant collection
    try {
      await deleteCollection(websiteId);
      console.log(`✅ Deleted Qdrant collection for website ${websiteId}`);
    } catch (error) {
      console.error('Error deleting Qdrant collection:', error);
      // Continue even if Qdrant deletion fails
    }

    // Delete website (cascade will handle training_items, training_runs, conversations, messages)
    const { error: deleteError } = await serviceSupabase
      .from('websites')
      .delete()
      .eq('id', websiteId);

    if (deleteError) {
      console.error('Error deleting website:', deleteError);
      return NextResponse.json({ error: 'Failed to delete website' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Website and all associated data deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting website:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

