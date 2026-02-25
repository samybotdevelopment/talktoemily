import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

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

    // Get website and training count
    const { data: website } = (await supabase
      .from('websites')
      .select('org_id, training_count')
      .eq('id', websiteId)
      .single()) as any;

    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    // Count training items
    const { data: trainingItems } = await supabase
      .from('training_items')
      .select('id')
      .eq('website_id', websiteId);

    const itemCount = trainingItems?.length || 0;

    // Get organization credits
    const { data: org } = (await supabase
      .from('organizations')
      .select('credits_balance, plan, is_wg_linked')
      .eq('id', website.org_id)
      .single()) as any;

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const isFreeTraining = website.training_count === 0;
    const creditCost = isFreeTraining ? 0 : itemCount;
    
    // Determine usable credits
    // Free plan users have frozen credits (max 50 usable) UNLESS they're WG linked
    const usableCredits = (org.plan === 'free' && !org.is_wg_linked)
      ? Math.min(org.credits_balance, 50) 
      : org.credits_balance;

    const hasEnoughCredits = isFreeTraining || usableCredits >= creditCost;

    return NextResponse.json({
      itemCount,
      creditCost,
      creditsBalance: org.credits_balance, // Show actual balance
      usableCredits, // Send usable credits for validation
      isFreeTraining,
      hasEnoughCredits,
      trainingCount: website.training_count,
      isWgLinked: org.is_wg_linked,
    });
  } catch (error: any) {
    console.error('Error getting training cost:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get training cost' },
      { status: 500 }
    );
  }
}




