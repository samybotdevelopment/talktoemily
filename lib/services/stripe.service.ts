import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
});

/**
 * Create a Stripe customer
 */
export async function createCustomer(
  email: string,
  name: string,
  orgId: string
): Promise<Stripe.Customer> {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        org_id: orgId,
      },
    });

    return customer;
  } catch (error) {
    console.error('Failed to create Stripe customer:', error);
    throw new Error('Failed to create customer');
  }
}

/**
 * Create a checkout session for subscription
 */
export async function createSubscriptionCheckout(
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session> {
  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      automatic_tax: {
        enabled: true,
      },
      tax_id_collection: {
        enabled: true, // Show VAT number field for B2B
      },
      customer_update: {
        address: 'auto',
        name: 'auto',
      },
      billing_address_collection: 'required', // Always collect address for tax
    });

    return session;
  } catch (error) {
    console.error('Failed to create subscription checkout:', error);
    throw new Error('Failed to create checkout session');
  }
}

/**
 * Create a checkout session for credit purchase
 */
export async function createCreditsCheckout(
  customerId: string,
  credits: number,
  amount: number,
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session> {
  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `${credits.toLocaleString()} AI Credits`,
              description: `${credits.toLocaleString()} AI message exchanges for your chatbot`,
            },
            unit_amount: Math.round(amount * 100), // Convert euros to cents
            tax_behavior: 'exclusive', // Price excludes tax, Stripe will add it
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      automatic_tax: {
        enabled: true,
      },
      tax_id_collection: {
        enabled: true, // Show VAT number field, auto-apply reverse charge for valid B2B
      },
      customer_update: {
        address: 'auto', // Automatically save billing address to customer
        name: 'auto', // Automatically save business name for tax ID collection
      },
      billing_address_collection: 'required', // Always collect address for tax
      invoice_creation: {
        enabled: true, // Create invoice for this payment (shows in customer portal)
        invoice_data: {
          description: `${credits.toLocaleString()} AI Credits`,
          metadata: {
            credits: credits.toString(),
            type: 'credits_purchase',
          },
        },
      },
      metadata: {
        credits: credits.toString(),
        type: 'credits_purchase',
      },
    });

    return session;
  } catch (error: any) {
    console.error('Failed to create credits checkout:', error);
    console.error('Stripe error details:', {
      type: error.type,
      message: error.message,
      code: error.code,
      raw: error.raw,
    });
    throw error;
  }
}

/**
 * Create a payment intent for credits purchase
 */
export async function createPaymentIntent(
  amount: number,
  customerId: string,
  metadata?: Record<string, string>
): Promise<Stripe.PaymentIntent> {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Convert to cents
      currency: 'usd',
      customer: customerId,
      metadata: metadata || {},
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return paymentIntent;
  } catch (error) {
    console.error('Failed to create payment intent:', error);
    throw new Error('Failed to create payment intent');
  }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  try {
    const subscription = await stripe.subscriptions.cancel(subscriptionId);
    return subscription;
  } catch (error) {
    console.error('Failed to cancel subscription:', error);
    throw new Error('Failed to cancel subscription');
  }
}

/**
 * Update subscription
 */
export async function updateSubscription(
  subscriptionId: string,
  priceId: string
): Promise<Stripe.Subscription> {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    const updatedSubscription = await stripe.subscriptions.update(
      subscriptionId,
      {
        items: [
          {
            id: subscription.items.data[0].id,
            price: priceId,
          },
        ],
        proration_behavior: 'create_prorations',
      }
    );

    return updatedSubscription;
  } catch (error) {
    console.error('Failed to update subscription:', error);
    throw new Error('Failed to update subscription');
  }
}

/**
 * Create customer portal session
 */
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return session;
  } catch (error) {
    console.error('Failed to create portal session:', error);
    throw new Error('Failed to create portal session');
  }
}

/**
 * Retrieve customer by ID
 */
export async function getCustomer(
  customerId: string
): Promise<Stripe.Customer> {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    
    if (customer.deleted) {
      throw new Error('Customer was deleted');
    }
    
    return customer as Stripe.Customer;
  } catch (error) {
    console.error('Failed to retrieve customer:', error);
    throw new Error('Failed to retrieve customer');
  }
}

/**
 * Retrieve subscription by ID
 */
export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription;
  } catch (error) {
    console.error('Failed to retrieve subscription:', error);
    throw new Error('Failed to retrieve subscription');
  }
}

/**
 * Verify webhook signature
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
): Stripe.Event {
  try {
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    console.error('Failed to verify webhook signature:', error);
    throw new Error('Invalid webhook signature');
  }
}

/**
 * Process webhook event
 */
export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
    case 'invoice.payment_succeeded':
    case 'checkout.session.completed':
    case 'charge.succeeded':
      // These will be handled by API routes
      break;
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}

export { stripe };
