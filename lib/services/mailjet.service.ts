import Mailjet from 'node-mailjet';

const mailjet = new Mailjet({
  apiKey: process.env.MAILJET_API_KEY || '',
  apiSecret: process.env.MAILJET_API_SECRET || '',
});

interface EmailOptions {
  to: string;
  toName?: string;
  subject: string;
  textBody: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    const request = mailjet.post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: {
            Email: 'emily@talktoemily.com',
            Name: 'Emily',
          },
          To: [
            {
              Email: options.to,
              Name: options.toName || options.to,
            },
          ],
          Subject: options.subject,
          TextPart: options.textBody,
        },
      ],
    });

    await request;
    console.log(`Email sent successfully to ${options.to}`);
  } catch (error) {
    console.error('Failed to send email:', error);
    throw new Error('Failed to send email');
  }
}

export function getPaymentFailureEmail(
  attemptCount: number,
  customerName: string,
  daysRemaining: number
): { subject: string; body: string } {
  const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/settings`;

  // First attempt
  if (attemptCount === 1) {
    return {
      subject: "Oops! We couldn't process your payment",
      body: `Hey ${customerName},

Just wanted to give you a heads up – we tried to process your payment but it didn't go through. No worries though, these things happen!

Could you take a quick moment to update your payment details? We'll automatically retry over the next ${daysRemaining} days (this was attempt 1 of several).

👉 Update your payment method here: ${portalUrl}

If you think this is a mistake or need any help, just reply to this email – I'm here!

Thanks,
Emily 💙

---
Talk to Emily - Your AI Chatbot Platform
`,
    };
  }

  // Middle attempts (2-3)
  if (attemptCount <= 3) {
    return {
      subject: 'Quick reminder: Payment still pending',
      body: `Hey ${customerName},

Just checking in again – we're still having trouble processing your payment (attempt ${attemptCount}).

We'll keep trying for ${daysRemaining} more days, but I wanted to make sure you're aware. The sooner you update your payment info, the sooner we can get everything back on track!

👉 Update your payment method here: ${portalUrl}

Thanks for being awesome!

Emily 💙

---
Talk to Emily - Your AI Chatbot Platform
`,
    };
  }

  // Final attempts (4+)
  return {
    subject: '⚠️ Urgent: Please update your payment details',
    body: `Hey ${customerName},

I really need your help here – we've tried ${attemptCount} times to process your payment and it's still not going through.

${daysRemaining > 0 
  ? `We have about ${daysRemaining} day${daysRemaining > 1 ? 's' : ''} left before your subscription gets cancelled and your bots are deactivated.` 
  : 'This is our final attempt before your subscription gets cancelled.'}

Please update your payment method right away to keep your chatbots running:

👉 Update your payment method here: ${portalUrl}

If you're having any issues or want to chat about your subscription, just reply to this email. I'm here to help!

Emily 💙

---
Talk to Emily - Your AI Chatbot Platform
`,
  };
}

