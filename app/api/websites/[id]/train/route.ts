import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { trainChatbot } from '@/lib/training/trainer';
import { checkTrainingQuota } from '@/lib/services/usage.service';

export async function POST(
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

    // Get website, org, and training count
    const { data: website } = (await supabase
      .from('websites')
      .select('org_id, training_count')
      .eq('id', websiteId)
      .single()) as any;

    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    // Check training quota (retraining limits)
    const quotaCheck = await checkTrainingQuota(website.org_id);

    if (!quotaCheck.allowed) {
      return NextResponse.json({ error: quotaCheck.reason }, { status: 403 });
    }

    // Count training items to calculate credit cost
    const { data: trainingItems } = await supabase
      .from('training_items')
      .select('id')
      .eq('website_id', websiteId);

    const itemCount = trainingItems?.length || 0;

    if (itemCount === 0) {
      return NextResponse.json(
        { error: 'No training items found. Add some content before training.' },
        { status: 400 }
      );
    }

    const isFreeTraining = website.training_count === 0;
    const creditCost = isFreeTraining ? 0 : itemCount; // 1 credit per item, first training is free

    // If not free training, check and deduct credits
    if (!isFreeTraining) {
      const serviceSupabase = (await createServiceClient()) as any;
      
      // Get current credits
      const { data: org } = (await serviceSupabase
      .from('organizations')
        .select('credits_balance, plan')
        .eq('id', website.org_id)
      .single()) as any;

      if (!org) {
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
      }

      // Determine usable credits (respect frozen credits for Free plan)
      const usableCredits = org.plan === 'free' 
        ? Math.min(org.credits_balance, 50) 
        : org.credits_balance;

      if (usableCredits < creditCost) {
        return NextResponse.json(
          {
            error: 'Insufficient credits',
            required: creditCost,
            available: usableCredits,
          },
          { status: 402 } // 402 Payment Required
        );
      }

      // Deduct credits
      const { error: deductError } = await serviceSupabase
        .from('organizations')
        .update({
          credits_balance: org.credits_balance - creditCost,
        } as any)
        .eq('id', website.org_id);

      if (deductError) {
        console.error('Failed to deduct credits:', deductError);
        return NextResponse.json(
          { error: 'Failed to deduct credits' },
          { status: 500 }
        );
      }

      console.log(`✅ Deducted ${creditCost} credits for training (${itemCount} items)`);
    } else {
      console.log(`🎉 First training is free (${itemCount} items)`);
    }

    // Increment training count
    const { error: countError } = await supabase
      .from('websites')
      .update({
        training_count: website.training_count + 1,
      } as any)
      .eq('id', websiteId);

    if (countError) {
      console.error('Failed to increment training count:', countError);
    }

    // Start training (this is a long-running process)
    await trainChatbot(websiteId, website.org_id);

    return NextResponse.json({
      success: true,
      message: 'Training completed',
      creditsUsed: creditCost,
      isFreeTraining,
    });
  } catch (error: any) {
    console.error('Training error:', error);
    return NextResponse.json(
      { error: error.message || 'Training failed' },
      { status: 500 }
    );
  }
}
