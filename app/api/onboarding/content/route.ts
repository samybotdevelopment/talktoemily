import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getWGWebsiteContent } from '@/lib/integrations/wg-api';
import { processWGContent } from '@/lib/training/content-processor';
import { z } from 'zod';

const contentSchema = z.object({
  wg_website_id: z.string(),
});

/**
 * POST /api/onboarding/content
 * Get and process WG website content into training chunks
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

    const body = await request.json();
    const validatedData = contentSchema.parse(body);

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

    // Fetch website content from WG API
    const websiteContent = await getWGWebsiteContent(org.wg_user_id, validatedData.wg_website_id);

    // Process into training chunks
    const chunks = processWGContent(websiteContent);

    return NextResponse.json({
      success: true,
      chunks,
      count: chunks.length,
    });
  } catch (error) {
    console.error('Error processing WG content:', error);
    return NextResponse.json({ error: 'Failed to process content' }, { status: 500 });
  }
}

