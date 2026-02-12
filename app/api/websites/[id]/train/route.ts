import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { trainChatbot } from '@/lib/training/trainer';
import { checkTrainingQuota } from '@/lib/services/usage.service';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: websiteId } = await context.params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get website and org
    const { data: website } = await supabase
      .from('websites')
      .select('org_id')
      .eq('id', websiteId)
      .single();

    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    // Check training quota
    const quotaCheck = await checkTrainingQuota(website.org_id);

    if (!quotaCheck.allowed) {
      return NextResponse.json({ error: quotaCheck.reason }, { status: 403 });
    }

    // Start training (this is a long-running process)
    await trainChatbot(websiteId, website.org_id);

    return NextResponse.json({ success: true, message: 'Training completed' });
  } catch (error: any) {
    console.error('Training error:', error);
    return NextResponse.json(
      { error: error.message || 'Training failed' },
      { status: 500 }
    );
  }
}
