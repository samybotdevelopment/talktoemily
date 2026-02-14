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

/**
 * Add a contact to the Mailjet mailing list
 * Maps user locale to one of the 4 supported languages: FR, ES, DE, EN
 */
export async function addContactToMailingList(
  email: string,
  name: string,
  userLocale: string = 'en'
): Promise<void> {
  const listId = process.env.MAILJET_FREE_LIST_UID;

  if (!listId) {
    console.warn('MAILJET_FREE_LIST_UID not configured, skipping mailing list subscription');
    return;
  }

  // Map locale to one of the 4 supported languages
  const localeToLanguage: Record<string, string> = {
    fr: 'FR',
    es: 'ES',
    de: 'DE',
    // All other languages default to EN
  };

  const language = localeToLanguage[userLocale.toLowerCase()] || 'EN';

  try {
    // Add contact to Mailjet
    const contactRequest = mailjet
      .post('contact', { version: 'v3' })
      .request({
        Email: email,
        Name: name,
      });

    await contactRequest;
    console.log(`✅ Contact created/updated in Mailjet: ${email}`);

    // Add contact to the mailing list with language property
    const manageContactRequest = mailjet
      .post('contact', { version: 'v3' })
      .id(email)
      .action('managecontactslists')
      .request({
        ContactsLists: [
          {
            ListID: listId,
            Action: 'addnoforce', // addnoforce = add only if not already in list
          },
        ],
      });

    await manageContactRequest;
    console.log(`✅ Contact added to mailing list: ${email}`);

    // Update contact properties with language
    const updatePropertiesRequest = mailjet
      .put('contactdata', { version: 'v3' })
      .id(email)
      .request({
        Data: [
          {
            Name: 'language',
            Value: language,
          },
        ],
      });

    await updatePropertiesRequest;
    console.log(`✅ Contact language set to ${language} for ${email}`);
  } catch (error: any) {
    // Log but don't fail the signup if mailing list fails
    console.error('Failed to add contact to mailing list:', error);
    if (error.response) {
      console.error('Mailjet API error:', error.response.data);
    }
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


