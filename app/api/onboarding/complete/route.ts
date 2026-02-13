import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { activateWGWidget, generateWidgetScript } from '@/lib/integrations/wg-api';
import { trainChatbot } from '@/lib/training/trainer';
import { z } from 'zod';

const completeSchema = z.object({
  website_data: z.object({
    display_name: z.string(),
    domain: z.string(),
    primary_color: z.string(),
    wg_website_id: z.string().optional(),
  }),
  training_chunks: z.array(
    z.object({
      title: z.string(),
      content: z.string(),
    })
  ),
});

/**
 * POST /api/onboarding/complete
 * Complete onboarding: create website, add training items, train, activate widget
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

    const body = await request.json();
    const validatedData = completeSchema.parse(body);

    const serviceSupabase = await createServiceClient();

    // Get user's organization
    const { data: memberships } = await serviceSupabase
      .from('memberships')
      .select('org_id, organizations(*)')
      .eq('user_id', user.id)
      .single();

    if (!memberships) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const org = memberships.organizations as any;

    // Step 1: Create website
    const { data: website, error: websiteError } = await serviceSupabase
      .from('websites')
      .insert({
        org_id: org.id,
        domain: validatedData.website_data.domain,
        display_name: validatedData.website_data.display_name,
        primary_color: validatedData.website_data.primary_color,
        wg_website_id: validatedData.website_data.wg_website_id || null,
        widget_activated: false,
      })
      .select()
      .single();

    if (websiteError || !website) {
      console.error('Website creation error:', websiteError);
      return NextResponse.json({ error: 'Failed to create website' }, { status: 500 });
    }

    // Step 2: Insert all training items
    const trainingItems = validatedData.training_chunks.map(chunk => ({
      website_id: website.id,
      title: chunk.title,
      content: chunk.content,
      source: (org.is_wg_linked ? 'wg' : 'manual') as const,
    }));

    const { error: itemsError } = await serviceSupabase
      .from('training_items')
      .insert(trainingItems);

    if (itemsError) {
      console.error('Training items error:', itemsError);
      // Cleanup: delete website
      await serviceSupabase.from('websites').delete().eq('id', website.id);
      return NextResponse.json({ error: 'Failed to add training items' }, { status: 500 });
    }

    // Step 3: Train the chatbot
    try {
      await trainChatbot(website.id, org.id);
    } catch (trainingError) {
      console.error('Training error:', trainingError);
      // Don't delete website, just return error
      return NextResponse.json(
        { error: 'Website created but training failed. You can retry training from the dashboard.' },
        { status: 500 }
      );
    }

    // Step 4: Activate widget on WG website (WG customers only)
    if (org.is_wg_linked && org.wg_user_id && validatedData.website_data.wg_website_id) {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://talktoemily.com';
        const scriptCode = generateWidgetScript(website.id, appUrl);

        await activateWGWidget(
          org.wg_user_id,
          validatedData.website_data.wg_website_id,
          scriptCode,
          true
        );

        // Update widget activation status
        await serviceSupabase
          .from('websites')
          .update({
            widget_activated: true,
            widget_activated_at: new Date().toISOString(),
          })
          .eq('id', website.id);
      } catch (widgetError) {
        console.error('Widget activation error:', widgetError);
        // Don't fail the whole flow, widget can be activated later
      }
    }

    // Step 5: Mark onboarding as completed and clear state
    await serviceSupabase
      .from('organizations')
      .update({
        onboarding_completed_at: new Date().toISOString(),
        onboarding_state: null,
      })
      .eq('id', org.id);

    return NextResponse.json({
      success: true,
      website_id: website.id,
      message: 'Onboarding completed successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
    }

    console.error('Error completing onboarding:', error);
    return NextResponse.json({ error: 'Failed to complete onboarding' }, { status: 500 });
  }
}
