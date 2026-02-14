import { createClient, createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orgId } = await context.params;
    const body = await request.json();
    const { credits } = body;

    if (!credits || typeof credits !== 'number' || credits <= 0) {
      return NextResponse.json(
        { error: 'Invalid credits amount. Must be a positive number' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Grant credits using service client
    const serviceSupabase = await createServiceClient();

    // Get current credits
    const { data: org } = await serviceSupabase
      .from('organizations')
      .select('credits_balance')
      .eq('id', orgId)
      .single();

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const newBalance = org.credits_balance + credits;

    // Update credits
    const { error: updateError } = await serviceSupabase
      .from('organizations')
      .update({
        credits_balance: newBalance,
      })
      .eq('id', orgId);

    if (updateError) {
      throw updateError;
    }

    console.log(`✅ Admin granted ${credits} credits to org ${orgId} (new balance: ${newBalance})`);

    return NextResponse.json({
      success: true,
      message: `Successfully granted ${credits} credits`,
      newBalance,
    });
  } catch (error: any) {
    console.error('Error granting credits:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to grant credits' },
      { status: 500 }
    );
  }
}

