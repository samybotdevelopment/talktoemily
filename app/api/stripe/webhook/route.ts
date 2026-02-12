import { NextResponse } from 'next/server';
import { constructWebhookEvent } from '@/lib/services/stripe.service';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    const event = constructWebhookEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    const supabase = await createServiceClient();

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        const customerId = subscription.customer as string;

        // Get org from customer ID
        const { data: stripeCustomer } = await supabase
          .from('stripe_customers')
          .select('org_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (stripeCustomer) {
          // Update subscription ID
          await supabase
            .from('stripe_customers')
            .update({ stripe_subscription_id: subscription.id })
            .eq('org_id', stripeCustomer.org_id);

          // Upgrade to Pro
          await supabase
            .from('organizations')
            .update({
              plan: 'pro',
              max_websites: 5,
            })
            .eq('id', stripeCustomer.org_id);

          console.log(`Upgraded org ${stripeCustomer.org_id} to Pro`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        const customerId = subscription.customer as string;

        // Get org from customer ID
        const { data: stripeCustomer } = await supabase
          .from('stripe_customers')
          .select('org_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (stripeCustomer) {
          // Downgrade to Free
          await supabase
            .from('organizations')
            .update({
              plan: 'free',
              max_websites: 1,
            })
            .eq('id', stripeCustomer.org_id);

          // Clear subscription ID
          await supabase
            .from('stripe_customers')
            .update({ stripe_subscription_id: null })
            .eq('org_id', stripeCustomer.org_id);

          console.log(`Downgraded org ${stripeCustomer.org_id} to Free`);
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

      default:
        console.log(`Unhandled event type: ${event.type}`);
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
