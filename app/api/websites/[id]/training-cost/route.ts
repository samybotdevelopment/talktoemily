import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(
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

    // Get website and training count
    const { data: website } = await supabase
      .from('websites')
      .select('org_id, training_count')
      .eq('id', websiteId)
      .single();

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
    const { data: org } = await supabase
      .from('organizations')
      .select('credits_balance, plan')
      .eq('id', website.org_id)
      .single();

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const isFreeTraining = website.training_count === 0;
    const creditCost = isFreeTraining ? 0 : itemCount;
    
    // Determine usable credits (respect frozen credits for Free plan)
    const usableCredits = org.plan === 'free' 
      ? Math.min(org.credits_balance, 50) 
      : org.credits_balance;

    const hasEnoughCredits = isFreeTraining || usableCredits >= creditCost;

    return NextResponse.json({
      itemCount,
      creditCost,
      creditsBalance: usableCredits,
      isFreeTraining,
      hasEnoughCredits,
      trainingCount: website.training_count,
    });
  } catch (error: any) {
    console.error('Error getting training cost:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get training cost' },
      { status: 500 }
    );
  }
}



