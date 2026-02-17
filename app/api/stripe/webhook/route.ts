// @ts-nocheck - Temporary: complex Supabase type inference issues
import { NextResponse } from 'next/server';
import { constructWebhookEvent } from '@/lib/services/stripe.service';
import { createServiceClient } from '@/lib/supabase/server';
import { sendEmail, getPaymentFailureEmail } from '@/lib/services/mailjet.service';

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    // Allow test events in development without signature verification
    let event;
    if (process.env.NODE_ENV === 'development' && signature === 'test_signature') {
      console.log('âš ï¸ Development mode: Accepting test event without signature verification');
      event = JSON.parse(body);
    } else {
      event = constructWebhookEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    }

    const supabase = (await createServiceClient()) as any;

    console.log('ðŸ“¨ Stripe webhook received:', event.type);

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        const customerId = subscription.customer as string;
        const priceId = subscription.items.data[0]?.price?.id;

        console.log('ðŸ’³ Subscription event:', { customerId, priceId, status: subscription.status });

        // Determine plan from price ID
        let plan = 'free';
        let maxWebsites = 1;
        let monthlyCredits = 0;

        console.log('ðŸ” Checking price ID:', priceId);
        console.log('ðŸ” EMILY_STARTER_EUR_PRICE_ID:', process.env.EMILY_STARTER_EUR_PRICE_ID);
        console.log('ðŸ” EMILY_PRO_EUR_PRICE_ID:', process.env.EMILY_PRO_EUR_PRICE_ID);

        if (priceId === process.env.EMILY_STARTER_EUR_PRICE_ID) {
          plan = 'starter';
          maxWebsites = 1;
          monthlyCredits = 100;
          console.log('âœ… Matched STARTER plan');
        } else if (priceId === process.env.EMILY_PRO_EUR_PRICE_ID) {
          plan = 'pro';
          maxWebsites = 5;
          monthlyCredits = 250;
          console.log('âœ… Matched PRO plan');
        } else {
          console.warn('âš ï¸ Price ID did not match any plan, defaulting to FREE');
        }

        // Get org from stripe_customers table
        const { data: stripeCustomer } = await supabase
          .from('stripe_customers')
          .select('org_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (stripeCustomer && subscription.status === 'active') {
          // Update stripe_customers table with subscription details
          await supabase
            .from('stripe_customers')
            .update({
              stripe_subscription_id: subscription.id,
              subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              subscription_cancel_at_period_end: subscription.cancel_at_period_end || false,
            })
            .eq('org_id', stripeCustomer.org_id);

          // Log cancellation status changes
          if (subscription.cancel_at_period_end) {
            console.log(`âš ï¸ Subscription will be canceled at period end: ${new Date(subscription.current_period_end * 1000).toISOString()}`);
          } else if (event.type === 'customer.subscription.updated') {
            // Check if this is a reactivation (cancel_at_period_end was true, now false)
            console.log(`ðŸ”„ Subscription reactivated for org ${stripeCustomer.org_id}`);
          }

          // Get current org data BEFORE updating (to check if upgrading from free)
          const { data: org } = await supabase
            .from('organizations')
            .select('credits_balance, plan, frozen_credits')
            .eq('id', stripeCustomer.org_id)
            .single();

          // Check if upgrading from Free (need to reactivate bots and unfreeze credits)
          const isUpgradingFromFree = org?.plan === 'free' && plan !== 'free';

          // Unfreeze credits if upgrading from Free
          let unfrozenCredits = 0;
          if (isUpgradingFromFree && org && org.frozen_credits > 0) {
            unfrozenCredits = org.frozen_credits;
            console.log(`ðŸ”“ Unfreezing ${unfrozenCredits} credits`);
          }

          // Update organization plan and limits
          await supabase
            .from('organizations')
            .update({
              plan,
              max_websites: maxWebsites,
              ...(unfrozenCredits > 0 && {
                credits_balance: (org?.credits_balance || 0) + unfrozenCredits,
                frozen_credits: 0,
              }),
            })
            .eq('id', stripeCustomer.org_id);

          // Reactivate deactivated bots if upgrading from Free
          if (isUpgradingFromFree) {
            console.log(`ðŸ”„ Upgrading from Free to ${plan} - checking for inactive bots...`);
            
            // Get inactive bots
            const { data: inactiveBots } = await supabase
              .from('websites')
              .select('id, display_name')
              .eq('org_id', stripeCustomer.org_id)
              .eq('is_active', false)
              .order('created_at', { ascending: true });

            if (inactiveBots && inactiveBots.length > 0) {
              console.log(`ðŸ“‹ Found ${inactiveBots.length} inactive bot(s)`);
              
              // Calculate how many bots we can reactivate
              const { data: activeBots } = await supabase
                .from('websites')
                .select('id')
                .eq('org_id', stripeCustomer.org_id)
                .eq('is_active', true);

              const currentActiveCount = activeBots?.length || 0;
              const availableSlots = maxWebsites - currentActiveCount;
              const botsToReactivate = Math.min(availableSlots, inactiveBots.length);

              console.log(`âœ… Can reactivate ${botsToReactivate} bot(s) (current active: ${currentActiveCount}, max: ${maxWebsites})`);

              if (botsToReactivate > 0) {
                const idsToReactivate = inactiveBots.slice(0, botsToReactivate).map(b => b.id);
                
                await supabase
                  .from('websites')
                  .update({ is_active: true })
                  .in('id', idsToReactivate);

                console.log(`âœ… Reactivated ${botsToReactivate} bot(s): ${inactiveBots.slice(0, botsToReactivate).map(b => b.display_name).join(', ')}`);
              }
            } else {
              console.log(`â„¹ï¸ No inactive bots found`);
            }
          }

          // Grant monthly credits on:
          // 1. New subscription (customer.subscription.created with active status)
          // 2. Renewal (billing_reason = 'subscription_cycle')
          // 3. Upgrading from free to paid (subscription.updated where old plan was free)
          const shouldGrantCredits = 
            event.type === 'customer.subscription.created' ||
            subscription.billing_reason === 'subscription_cycle' ||
            isUpgradingFromFree;

          if (shouldGrantCredits && monthlyCredits > 0) {
            // Get CURRENT balance (after unfreezing, if applicable)
            const { data: currentOrg } = await supabase
              .from('organizations')
              .select('credits_balance')
              .eq('id', stripeCustomer.org_id)
              .single();

            const currentBalance = currentOrg?.credits_balance || 0;
            const newBalance = currentBalance + monthlyCredits;
            
            await supabase
              .from('organizations')
              .update({ credits_balance: newBalance })
              .eq('id', stripeCustomer.org_id);

            console.log(`âœ… Upgraded org ${stripeCustomer.org_id} to ${plan} and granted ${monthlyCredits} credits. New balance: ${newBalance} (unfroze: ${unfrozenCredits}, granted: ${monthlyCredits})`);
          } else {
            console.log(`âœ… Updated org ${stripeCustomer.org_id} subscription to ${plan} (no credits granted)`);
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        const customerId = subscription.customer as string;

        // Get org from stripe_customers table
        const { data: stripeCustomer } = await supabase
          .from('stripe_customers')
          .select('org_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (stripeCustomer) {
          // Get current credits before downgrading
          const { data: org } = await supabase
            .from('organizations')
            .select('credits_balance, frozen_credits')
            .eq('id', stripeCustomer.org_id)
            .single();

          // Clear subscription data in stripe_customers table
          await supabase
            .from('stripe_customers')
            .update({
              stripe_subscription_id: null,
              subscription_current_period_end: null,
              subscription_cancel_at_period_end: false,
            })
            .eq('org_id', stripeCustomer.org_id);

          // Freeze excess credits (Free plan limit is 50)
          const FREE_PLAN_CREDIT_LIMIT = 50;
          const currentBalance = org?.credits_balance || 0;
          const creditsToFreeze = Math.max(0, currentBalance - FREE_PLAN_CREDIT_LIMIT);
          const newBalance = Math.min(currentBalance, FREE_PLAN_CREDIT_LIMIT);

          // Downgrade to Free and freeze excess credits
          await supabase
            .from('organizations')
            .update({
              plan: 'free',
              max_websites: 1,
              credits_balance: newBalance,
              frozen_credits: creditsToFreeze,
            })
            .eq('id', stripeCustomer.org_id);

          if (creditsToFreeze > 0) {
            console.log(`â„ï¸ Froze ${creditsToFreeze} credits (balance: ${currentBalance} â†’ ${newBalance}, frozen: ${creditsToFreeze})`);
          }

          // Deactivate excess bots (keep only the oldest one active)
          const { data: websites } = await supabase
            .from('websites')
            .select('id, display_name, created_at')
            .eq('org_id', stripeCustomer.org_id)
            .eq('is_active', true)
            .order('created_at', { ascending: true });

          if (websites && websites.length > 1) {
            // Keep the first (oldest) bot active, deactivate the rest
            const botsToDeactivate = websites.slice(1).map(w => w.id);
            
            await supabase
              .from('websites')
              .update({ is_active: false })
              .in('id', botsToDeactivate);

            console.log(`â¬‡ï¸ Downgraded org ${stripeCustomer.org_id} to Free and deactivated ${botsToDeactivate.length} bots`);
          } else {
            console.log(`â¬‡ï¸ Downgraded org ${stripeCustomer.org_id} to Free`);
          }
        }
        break;
      }

      case 'checkout.session.completed': {
        const session = event.data.object as any;
        
        console.log('ðŸŽ‰ Checkout session completed:', {
          sessionId: session.id,
          customerId: session.customer,
          metadata: session.metadata,
          mode: session.mode,
        });
        
        // Check if this is a credits purchase
        if (session.metadata?.type === 'credits_purchase' && session.metadata?.credits) {
          const credits = parseInt(session.metadata.credits);
          const customerId = session.customer as string;
          
          console.log(`ðŸ’° Processing credit purchase: ${credits} credits for customer ${customerId}`);
          
          if (credits > 0) {
            // Get org from stripe_customers table
            const { data: stripeCustomer } = await supabase
              .from('stripe_customers')
              .select('org_id')
              .eq('stripe_customer_id', customerId)
              .single();

            if (stripeCustomer) {
              const { data: org } = await supabase
                .from('organizations')
                .select('credits_balance')
                .eq('id', stripeCustomer.org_id)
                .single();

              if (org) {
                const newBalance = (org.credits_balance || 0) + credits;
                
                await supabase
                  .from('organizations')
                  .update({ credits_balance: newBalance })
                  .eq('id', stripeCustomer.org_id);

                console.log(`âœ… Added ${credits} credits to org ${stripeCustomer.org_id}. New balance: ${newBalance}`);
              }
            } else {
              console.error('âŒ Organization not found for customer:', customerId);
            }
          }
        }
        break;
      }

      case 'charge.succeeded': {
        const charge = event.data.object as any;
        
        // Check if this is a credits purchase (has metadata)
        if (charge.metadata?.type === 'credits' && charge.metadata?.org_id) {
          const credits = parseInt(charge.metadata.credits || '0');
          
          if (credits > 0) {
            const { data: org } = await supabase
              .from('organizations')
              .select('credits_balance')
              .eq('id', charge.metadata.org_id)
              .single();

            if (org) {
              await supabase
                .from('organizations')
                .update({ credits_balance: org.credits_balance + credits })
                .eq('id', charge.metadata.org_id);

              console.log(`Added ${credits} credits to org ${charge.metadata.org_id}`);
            }
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        const customerId = invoice.customer as string;
        const attemptCount = invoice.attempt_count || 1;
        
        console.log(`ðŸ’³ Payment failed for customer ${customerId}, attempt ${attemptCount}`);

        // Get org and user info from stripe_customers table
        const { data: stripeCustomer } = await supabase
          .from('stripe_customers')
          .select('org_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (stripeCustomer) {
          // Get user email from organizations table
          const { data: org } = await supabase
            .from('organizations')
            .select(`
              id,
              users!inner(email)
            `)
            .eq('id', stripeCustomer.org_id)
            .single();

          if (org && org.users && Array.isArray(org.users) && org.users.length > 0) {
            const userEmail = org.users[0].email;
            
            // Calculate days remaining (Stripe retries over ~7 days, typically 4 attempts)
            // Attempt 1: Day 0 (7 days left)
            // Attempt 2: Day 3 (4 days left)
            // Attempt 3: Day 5 (2 days left)
            // Attempt 4: Day 7 (0 days left)
            const daysRemaining = Math.max(0, 7 - Math.floor((attemptCount - 1) * 2.5));

            // Get customer name (use email prefix if no name)
            const customerName = userEmail.split('@')[0];

            const { subject, body } = await getPaymentFailureEmail(
              attemptCount,
              customerName,
              daysRemaining
            );

            try {
              await sendEmail({
                to: userEmail,
                toName: customerName,
                subject,
                textBody: body,
              });

              console.log(`âœ… Payment failure email sent to ${userEmail} (attempt ${attemptCount})`);
            } catch (emailError) {
              console.error(`âŒ Failed to send payment failure email:`, emailError);
            }
          } else {
            console.error('âŒ Could not find user email for org:', stripeCustomer.org_id);
          }
        } else {
          console.error('âŒ Could not find org for customer:', customerId);
        }
        break;
      }

      default:
        console.log(`â„¹ï¸  Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 400 }
    );
  }
}

