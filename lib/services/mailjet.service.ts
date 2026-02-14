import Mailjet from 'node-mailjet';
import { getTranslations } from 'next-intl/server';

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
    const t = await getTranslations('email');
    
    const request = mailjet.post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: {
            Email: 'emily@talktoemily.com',
            Name: t('fromName'),
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

export async function getPaymentFailureEmail(
  attemptCount: number,
  customerName: string,
  daysRemaining: number
): Promise<{ subject: string; body: string }> {
  const t = await getTranslations('email.paymentFailure');
  const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/settings`;

  // First attempt
  if (attemptCount === 1) {
    const subject = t('attempt1.subject');
    const body = [
      t('attempt1.greeting', { customerName }),
      '',
      t('attempt1.intro'),
      '',
      t('attempt1.action', { daysRemaining }),
      '',
      t('attempt1.cta', { portalUrl }),
      '',
      t('attempt1.help'),
      '',
      t('attempt1.closing'),
      t('attempt1.signature'),
      '',
      '---',
      (await getTranslations('email'))('footer'),
    ].join('\n');

    return { subject, body };
  }

  // Middle attempts (2-3)
  if (attemptCount <= 3) {
    const subject = t('attempt2to3.subject');
    const body = [
      t('attempt2to3.greeting', { customerName }),
      '',
      t('attempt2to3.intro', { attemptCount }),
      '',
      t('attempt2to3.action', { daysRemaining }),
      '',
      t('attempt2to3.cta', { portalUrl }),
      '',
      t('attempt2to3.closing'),
      t('attempt2to3.signature'),
      '',
      '---',
      (await getTranslations('email'))('footer'),
    ].join('\n');

    return { subject, body };
  }

  // Final attempts (4+)
  const subject = t('attempt4plus.subject');
  const urgentMessage = daysRemaining > 0
    ? t('attempt4plus.urgentWithDays', {
        daysRemaining,
        plural: daysRemaining > 1 ? 's' : '',
      })
    : t('attempt4plus.urgentFinal');

  const body = [
    t('attempt4plus.greeting', { customerName }),
    '',
    t('attempt4plus.intro', { attemptCount }),
    '',
    urgentMessage,
    '',
    t('attempt4plus.action'),
    '',
    t('attempt4plus.cta', { portalUrl }),
    '',
    t('attempt4plus.help'),
    '',
    t('attempt4plus.signature'),
    '',
    '---',
    (await getTranslations('email'))('footer'),
  ].join('\n');

  return { subject, body };
}


