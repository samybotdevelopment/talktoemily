import { createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkWGCustomer } from '@/lib/integrations/wg-api';
import { sendVerificationEmail } from '@/lib/services/mailjet.service';

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  orgName: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = signupSchema.parse(body);

    const supabase = (await createServiceClient()) as any;

    // Check if user already exists
    const { data: existingUser } = (await supabase
      .from('users')
      .select('id')
      .eq('email', validatedData.email)
      .single()) as any;

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 400 }
      );
    }

    // Check if they're a Wonder George customer
    const wgCustomer = await checkWGCustomer(validatedData.email);
    const isWGCustomer = wgCustomer.is_customer;

    // Determine plan and max websites based on WG status
    let plan: 'free' | 'pro' = 'free';
    let maxWebsites = 1;
    
    if (isWGCustomer && wgCustomer.plan) {
      // WG customers get agency plan if they have agency tier
      maxWebsites = wgCustomer.plan === 'agency' ? 5 : 1;
    }

    // Create user with admin client (bypasses RLS)
    const { data: authData, error: signUpError } = await supabase.auth.admin.createUser({
      email: validatedData.email,
      password: validatedData.password,
      email_confirm: false, // Require email verification
      user_metadata: {
        org_name: validatedData.orgName,
      },
    });

    if (signUpError || !authData.user) {
      console.error('Signup error:', signUpError);
      return NextResponse.json(
        { error: signUpError?.message || 'Failed to create user' },
        { status: 400 }
      );
    }

    // Generate verification link and send email via Mailjet
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.talktoemily.com';
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'signup',
      email: validatedData.email,
      options: {
        redirectTo: `${appUrl}/auth/callback`,
      },
    });

    if (linkError || !linkData.properties?.action_link) {
      console.error('Failed to generate verification link:', linkError);
      // Continue with signup - user can request new verification email
    } else {
      // Send verification email via Mailjet
      try {
        await sendVerificationEmail(
          validatedData.email,
          linkData.properties.action_link,
          validatedData.orgName
        );
      } catch (emailError) {
        console.error('Failed to send verification email via Mailjet:', emailError);
        // Don't fail signup - user can request new verification email
      }
    }

    // Create organization (bypasses RLS with service role)
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: validatedData.orgName,
        plan,
        max_websites: maxWebsites,
        is_wg_linked: isWGCustomer,
        credits_balance: 50, // All new users get 50 credits on signup
        wg_user_id: isWGCustomer ? wgCustomer.user_id : null,
        wg_plan: isWGCustomer ? wgCustomer.plan : null,
        onboarding_completed_at: null, // Will be set when onboarding completes
      } as any)
      .select()
      .single();

    if (orgError || !org) {
      console.error('Org creation error:', orgError);
      // Cleanup: delete the user if org creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: 'Failed to create organization' },
        { status: 500 }
      );
    }

    // Create membership (bypasses RLS with service role)
    const { error: membershipError } = await supabase
      .from('memberships')
      .insert({
        user_id: authData.user.id,
        org_id: (org as any).id,
        role: 'owner',
      } as any);

    if (membershipError) {
      console.error('Membership creation error:', membershipError);
      // Cleanup
      await supabase.auth.admin.deleteUser(authData.user.id);
      await supabase.from('organizations').delete().eq('id', (org as any).id);
      return NextResponse.json(
        { error: 'Failed to create membership' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Account created successfully. Please check your email to verify your account.',
      requiresEmailVerification: true,
      is_wg_customer: isWGCustomer,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: (error as any).errors }, { status: 400 });
    }

    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

