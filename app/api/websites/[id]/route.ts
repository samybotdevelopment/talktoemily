import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { deleteCollection } from '@/lib/services/qdrant.service';

export async function GET(
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

    const { data: website, error } = await supabase
      .from('websites')
      .select('*')
      .eq('id', websiteId)
      .single();

    if (error || !website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    return NextResponse.json({ website });
  } catch (error) {
    console.error('Error fetching website:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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

    const { data: memberships, error: membershipError } = await supabase
      .from('memberships')
      .select('org_id')
      .eq('user_id', user.id);

    if (membershipError) {
      console.error('Failed to load memberships:', membershipError);
      return NextResponse.json({ error: 'Failed to verify access' }, { status: 500 });
    }

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    const orgIds = memberships.map((membership: { org_id: string }) => membership.org_id);

    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('id')
      .eq('id', websiteId)
      .in('org_id', orgIds)
      .single();

    if (websiteError || !website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    const { error: deleteError } = await supabase.from('websites').delete().eq('id', websiteId);

    if (deleteError) {
      console.error('Failed to delete website:', deleteError);
      return NextResponse.json({ error: 'Failed to delete website' }, { status: 500 });
    }

    // Best-effort cleanup of associated vector collection.
    await deleteCollection(websiteId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting website:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
