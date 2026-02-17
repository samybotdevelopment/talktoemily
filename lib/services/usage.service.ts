import { createServiceClient } from '@/lib/supabase/server';
import { FREE_LIMITS, PRO_LIMITS, UsageLimits } from '@/types/models';

/**
 * Get usage limits for an organization based on plan
 */
export function getUsageLimits(
  plan: 'free' | 'pro',
  isWgLinked: boolean
): UsageLimits {
  if (isWgLinked) {
    return {
      training_runs: -1, // unlimited training runs
      ai_messages: -1,   // unlimited messages (with credits)
    };
  }

  return plan === 'pro' ? PRO_LIMITS : FREE_LIMITS;
}

/**
 * Get current usage for an organization
 */
export async function getCurrentUsage(orgId: string) {
  const supabase = (await createServiceClient()) as any;

  // Get current period (month)
  const periodStart = new Date();
  periodStart.setDate(1);
  periodStart.setHours(0, 0, 0, 0);

  const periodEnd = new Date(periodStart);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  // Get or create usage tracking record
  let { data: usage, error } = await supabase
    .from('usage_tracking')
    .select('*')
    .eq('org_id', orgId)
    .eq('period_start', periodStart.toISOString())
    .single();

  if (error && error.code === 'PGRST116') {
    // Record doesn't exist, create it
    const { data: newUsage, error: insertError } = await supabase
      .from('usage_tracking')
      .insert({
        org_id: orgId,
        training_runs_used: 0,
        ai_messages_used: 0,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      throw new Error('Failed to create usage tracking record');
    }

    usage = newUsage;
  } else if (error) {
    throw new Error('Failed to get usage tracking');
  }

  return usage!;
}

/**
 * Check if organization can perform training
 */
export async function checkTrainingQuota(orgId: string): Promise<{
  allowed: boolean;
  reason?: string;
  current: number;
  limit: number;
}> {
  const supabase = (await createServiceClient()) as any;

  // Get organization
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('plan, is_wg_linked')
    .eq('id', orgId)
    .single();

  if (orgError || !org) {
    throw new Error('Organization not found');
  }

  const limits = getUsageLimits(org.plan, org.is_wg_linked);

  // Unlimited training for WG-linked or limits = -1
  if (limits.training_runs === -1) {
    return { allowed: true, current: 0, limit: -1 };
  }

  // For free plan, check lifetime usage (all time)
  if (org.plan === 'free') {
    const { data: allUsage, error: usageError } = await supabase
      .from('usage_tracking')
      .select('training_runs_used')
      .eq('org_id', orgId);

    if (usageError) {
      throw new Error('Failed to get usage');
    }

    const totalUsed = allUsage?.reduce((sum: number, u: any) => sum + u.training_runs_used, 0) || 0;

    if (totalUsed >= limits.training_runs) {
      return {
        allowed: false,
        reason: 'Free trial training limit reached. Upgrade to Pro for more training runs.',
        current: totalUsed,
        limit: limits.training_runs,
      };
    }

    return { allowed: true, current: totalUsed, limit: limits.training_runs };
  }

  // For Pro plan, check monthly usage
  const usage = await getCurrentUsage(orgId);

  if (usage.training_runs_used >= limits.training_runs) {
    return {
      allowed: false,
      reason: 'Monthly training limit reached. Limit resets at start of next month.',
      current: usage.training_runs_used,
      limit: limits.training_runs,
    };
  }

  return {
    allowed: true,
    current: usage.training_runs_used,
    limit: limits.training_runs,
  };
}

/**
 * Check if organization can send AI messages
 */
export async function checkMessageQuota(orgId: string): Promise<{
  allowed: boolean;
  reason?: string;
  current: number;
  limit: number;
}> {
  const supabase = (await createServiceClient()) as any;

  // Get organization
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('plan, is_wg_linked, credits_balance, frozen_credits')
    .eq('id', orgId)
    .single();

  if (orgError || !org) {
    throw new Error('Organization not found');
  }

  const limits = getUsageLimits(org.plan, org.is_wg_linked);

  // For Free plan: Only usable credits are up to 50 (frozen credits are locked)
  const FREE_PLAN_CREDIT_LIMIT = 50;
  const usableCredits = org.plan === 'free' 
    ? Math.min(org.credits_balance, FREE_PLAN_CREDIT_LIMIT)
    : org.credits_balance;

  // Unlimited messages for pro/WG-linked (but need credits)
  if (limits.ai_messages === -1) {
    if (usableCredits <= 0) {
      return {
        allowed: false,
        reason: org.plan === 'free' && org.frozen_credits > 0
          ? `Free plan credit limit reached (${FREE_PLAN_CREDIT_LIMIT} max). Upgrade to unlock ${org.frozen_credits} frozen credits.`
          : 'No credits remaining. Please purchase more credits.',
        current: 0,
        limit: usableCredits,
      };
    }
    return { allowed: true, current: 0, limit: -1 };
  }

  // For free plan, check lifetime usage
  const { data: allUsage, error: usageError } = await supabase
    .from('usage_tracking')
    .select('ai_messages_used')
    .eq('org_id', orgId);

  if (usageError) {
    throw new Error('Failed to get usage');
  }

  const totalUsed = allUsage?.reduce((sum: number, u: any) => sum + u.ai_messages_used, 0) || 0;

  if (totalUsed >= limits.ai_messages) {
    return {
      allowed: false,
      reason: 'Free trial message limit reached. Upgrade to Pro for unlimited messages.',
      current: totalUsed,
      limit: limits.ai_messages,
    };
  }

  return { allowed: true, current: totalUsed, limit: limits.ai_messages };
}

/**
 * Increment training run usage
 */
export async function incrementTrainingUsage(orgId: string): Promise<void> {
  const supabase = (await createServiceClient()) as any;
  const usage = await getCurrentUsage(orgId);

  const { error } = await supabase
    .from('usage_tracking')
    .update({
      training_runs_used: usage.training_runs_used + 1,
    })
    .eq('id', usage.id);

  if (error) {
    throw new Error('Failed to increment training usage');
  }
}

/**
 * Increment AI message usage
 */
export async function incrementMessageUsage(orgId: string): Promise<void> {
  const supabase = (await createServiceClient()) as any;
  const usage = await getCurrentUsage(orgId);

  const { error } = await supabase
    .from('usage_tracking')
    .update({
      ai_messages_used: usage.ai_messages_used + 1,
    })
    .eq('id', usage.id);

  if (error) {
    throw new Error('Failed to increment message usage');
  }
}

/**
 * Deduct credits from organization
 */
export async function deductCredits(orgId: string, amount: number): Promise<void> {
  const supabase = (await createServiceClient()) as any;

  const { data: org, error: fetchError } = await supabase
    .from('organizations')
    .select('credits_balance')
    .eq('id', orgId)
    .single();

  if (fetchError || !org) {
    throw new Error('Organization not found');
  }

  const newBalance = Math.max(0, org.credits_balance - amount);

  const { error } = await supabase
    .from('organizations')
    .update({ credits_balance: newBalance })
    .eq('id', orgId);

  if (error) {
    throw new Error('Failed to deduct credits');
  }
}

/**
 * Add credits to organization
 */
export async function addCredits(orgId: string, amount: number): Promise<void> {
  const supabase = (await createServiceClient()) as any;

  const { data: org, error: fetchError } = await supabase
    .from('organizations')
    .select('credits_balance')
    .eq('id', orgId)
    .single();

  if (fetchError || !org) {
    throw new Error('Organization not found');
  }

  const newBalance = org.credits_balance + amount;

  const { error } = await supabase
    .from('organizations')
    .update({ credits_balance: newBalance })
    .eq('id', orgId);

  if (error) {
    throw new Error('Failed to add credits');
  }
}
