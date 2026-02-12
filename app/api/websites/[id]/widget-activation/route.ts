import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { activateWGWidget, generateWidgetScript } from '@/lib/integrations/wg-api';
import { z } from 'zod';

const activationSchema = z.object({
  activate: z.boolean(),
});

/**
 * POST /api/websites/[id]/widget-activation
 * Activate or deactivate widget on WG website
 */
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

    const body = await request.json();
    const validatedData = activationSchema.parse(body);

    const serviceSupabase = await createServiceClient();

    // Get website with org info
    const { data: website } = await serviceSupabase
      .from('websites')
      .select('*, organizations(*)')
      .eq('id', websiteId)
      .single();

    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    const org = website.organizations as any;

    // Check if website is linked to WG
    if (!website.wg_website_id || !org.wg_user_id) {
      return NextResponse.json(
        { error: 'Website not linked to Wonder George' },
        { status: 400 }
      );
    }

    // Generate widget script
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://talktoemily.com';
    const scriptCode = generateWidgetScript(websiteId, appUrl);

    // Call WG API to activate/deactivate widget
    await activateWGWidget(
      org.wg_user_id,
      website.wg_website_id,
      scriptCode,
      validatedData.activate
    );

    // Update activation status in DB
    await serviceSupabase
      .from('websites')
      .update({
        widget_activated: validatedData.activate,
        widget_activated_at: validatedData.activate ? new Date().toISOString() : null,
      })
      .eq('id', websiteId);

    return NextResponse.json({
      success: true,
      activated: validatedData.activate,
      message: validatedData.activate
        ? 'Widget activated successfully'
        : 'Widget deactivated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
    }

    console.error('Widget activation error:', error);
    return NextResponse.json({ error: 'Failed to toggle widget' }, { status: 500 });
  }
}
