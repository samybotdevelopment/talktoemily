/**
 * Wonder George API Integration
 * 
 * Real implementation for WG chatbot API integration
 */

import { WGCustomerCheckResponse, WGWebsite, WGWebsiteContent } from '@/types/models';

const WG_API_BASE_URL = process.env.WG_API_BASE_URL || 'https://wonder-george.com/api/external/chatbot';
const CHATBOT_API_KEY = process.env.CHATBOT_API_KEY;

if (!CHATBOT_API_KEY) {
  console.warn('[WG API] CHATBOT_API_KEY not configured. WG integration will not work.');
}

/**
 * Check if user has active Wonder George subscription
 * API Step 1: POST /check-customer
 */
export async function checkWGCustomer(
  email: string
): Promise<WGCustomerCheckResponse> {
  if (!CHATBOT_API_KEY) {
    console.log(`[WG API] No API key configured, returning not a customer for: ${email}`);
    return {
      is_customer: false,
      plan: null,
      user_id: null,
    };
  }

  try {
    console.log(`[WG API] Checking customer status for: ${email}`);
    
    const response = await fetch(`${WG_API_BASE_URL}/check-customer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CHATBOT_API_KEY}`,
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[WG API] Check customer failed: ${response.status} ${errorText}`);
      throw new Error(`Failed to check WG customer status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`[WG API] Customer check result:`, data);
    
    return {
      is_customer: data.is_customer || false,
      plan: data.plan || null,
      user_id: data.user_id || null,
    };
  } catch (error) {
    console.error('[WG API] Error checking customer:', error);
    // Return false on error to allow signup to continue
    return {
      is_customer: false,
      plan: null,
      user_id: null,
    };
  }
}

/**
 * Get user's websites from Wonder George
 * API Step 2: GET /user-websites/{user_id}
 */
export async function getWGWebsites(
  wgUserId: string
): Promise<WGWebsite[]> {
  if (!CHATBOT_API_KEY) {
    throw new Error('WG API key not configured');
  }

  try {
    console.log(`[WG API] Fetching websites for user: ${wgUserId}`);
    
    const response = await fetch(`${WG_API_BASE_URL}/user-websites/${wgUserId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CHATBOT_API_KEY}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[WG API] Get websites failed: ${response.status} ${errorText}`);
      throw new Error(`Failed to fetch WG websites: ${response.status}`);
    }

    const data = await response.json();
    console.log(`[WG API] Fetched ${data.websites?.length || 0} websites`);
    
    return data.websites || [];
  } catch (error) {
    console.error('[WG API] Error fetching websites:', error);
    throw error;
  }
}

/**
 * Import website content from Wonder George
 * API Step 3: GET /websites/{website_id}/content?user_id={user_id}
 */
export async function getWGWebsiteContent(
  wgUserId: string,
  websiteId: string
): Promise<WGWebsiteContent> {
  if (!CHATBOT_API_KEY) {
    throw new Error('WG API key not configured');
  }

  try {
    console.log(`[WG API] Fetching content for website: ${websiteId}`);
    
    const response = await fetch(
      `${WG_API_BASE_URL}/websites/${websiteId}/content?user_id=${wgUserId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${CHATBOT_API_KEY}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[WG API] Get content failed: ${response.status} ${errorText}`);
      throw new Error(`Failed to fetch WG website content: ${response.status}`);
    }

    const data = await response.json();
    console.log(`[WG API] Fetched content for website ${websiteId}`);
    
    return data.website_content || { pages: {} };
  } catch (error) {
    console.error('[WG API] Error fetching website content:', error);
    throw error;
  }
}

/**
 * Install Emily widget on WG website
 * API Step 4: POST /websites/{website_id}/script
 */
export async function activateWGWidget(
  wgUserId: string,
  websiteId: string,
  scriptCode: string,
  activate: boolean = true
): Promise<void> {
  if (!CHATBOT_API_KEY) {
    throw new Error('WG API key not configured');
  }

  try {
    console.log(`[WG API] ${activate ? 'Activating' : 'Deactivating'} widget for website: ${websiteId}`);
    
    const response = await fetch(`${WG_API_BASE_URL}/websites/${websiteId}/script`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CHATBOT_API_KEY}`,
      },
      body: JSON.stringify({
        user_id: wgUserId,
        script: scriptCode,
        status: activate,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[WG API] Widget activation failed: ${response.status} ${errorText}`);
      throw new Error(`Failed to activate WG widget: ${response.status}`);
    }

    const data = await response.json();
    console.log(`[WG API] Widget ${activate ? 'activated' : 'deactivated'} successfully:`, data);
  } catch (error) {
    console.error('[WG API] Error activating widget:', error);
    throw error;
  }
}

/**
 * Generate Emily widget script code for a website
 */
export function generateWidgetScript(websiteId: string, appUrl: string): string {
  // Ensure HTTPS for production URLs to prevent Mixed Content errors
  if (!appUrl.startsWith('http://localhost') && !appUrl.startsWith('https://')) {
    console.warn(`⚠️ Widget URL should use HTTPS: ${appUrl}`);
  }
  
  return `<script>
  window.EmilyChat = { websiteId: '${websiteId}' };
</script>
<script src="${appUrl}/widget/emily-loader.js"></script>`;
}
