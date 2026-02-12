# Emily AI Chatbot - Wonder George API Integration Guide

## Quick Reference

**Base URL (Production):** `https://wonder-george.com/api/external/chatbot`

**Authentication:** All requests require Bearer token in header:
```
Authorization: Bearer {API_KEY}
```

**API Key:** Will be provided separately (stored as `CHATBOT_API_KEY` environment variable)

---

## API Flow

### Step 1: Verify Customer

When a user opens Emily chat, verify they are a Wonder George customer:

**Endpoint:** `POST /check-customer`

**Request:**
```json
{
  "email": "customer@example.com"
}
```

**Response (Customer exists):**
```json
{
  "is_customer": true,
  "plan": "entrepreneur",
  "user_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (Not a customer):**
```json
{
  "is_customer": false,
  "plan": null,
  "user_id": null
}
```

**Plan Types:**
- `free` - Free plan (1 website, limited features)
- `essential` - Essential plan (1 website, more features)
- `entrepreneur` - Entrepreneur plan (1 website, all features)
- `agency` - Agency plan (5 websites, all features)

**Action:** Save the `user_id` for subsequent API calls.

---

### Step 2: Get Customer's Websites

Retrieve all websites for the customer to display as cards:

**Endpoint:** `GET /user-websites/{user_id}`

**Example:** `GET /user-websites/550e8400-e29b-41d4-a716-446655440000`

**Response:**
```json
{
  "websites": [
    {
      "website_url": "https://mybusiness.com",
      "website_name": "My Business Website",
      "website_id": "660e8400-e29b-41d4-a716-446655440000",
      "website_image_url": "https://cdn.example.com/hero.jpg"
    },
    {
      "website_url": "https://wonder-george.com/sites/second-site",
      "website_name": "Second Site",
      "website_id": "770e8400-e29b-41d4-a716-446655440000",
      "website_image_url": null
    }
  ]
}
```

**Action:** Display these as clickable cards. When user selects one, proceed to Step 3.

---

### Step 3: Fetch Website Content (for AI Context)

Get the full website content to train Emily on what the customer's website is about:

**Endpoint:** `GET /websites/{website_id}/content?user_id={user_id}`

**Example:** `GET /websites/660e8400-e29b-41d4-a716-446655440000/content?user_id=550e8400-e29b-41d4-a716-446655440000`

**Response:**
```json
{
  "website_content": {
    "pages": {
      "home": {
        "sections": [
          {
            "type": "Hero",
            "content": {
              "title": "Welcome to My Business",
              "subtitle": "We provide amazing services",
              "ctaText": "Get Started",
              "ctaHref": "?page=contact"
            }
          },
          {
            "type": "Features",
            "content": {
              "title": "Our Services",
              "items": [
                {
                  "title": "Service 1",
                  "description": "Description here"
                }
              ]
            }
          }
        ]
      },
      "about": { /* ... */ },
      "contact": { /* ... */ },
      "legal": { /* ... */ },
      "privacy": { /* ... */ }
    },
    "strategy": {
      "tone": "professional_friendly",
      "key_messages": ["Quality", "Trust", "Innovation"]
    }
  }
}
```

**Action:** 
- Use this content to understand the customer's business
- Use it as context for answering questions about their website
- Extract business name, services, contact info, etc.

---

### Step 4: Install Emily Widget on Website

Once the customer wants to add Emily to their website:

**Endpoint:** `POST /websites/{website_id}/script`

**Example:** `POST /websites/660e8400-e29b-41d4-a716-446655440000/script`

**Request:**
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "script": "<script>\n  window.EmilyChat = { websiteId: '660e8400-e29b-41d4-a716-446655440000' };\n</script>\n<script src=\"https://talktoemily.com/widget/emily-chat.js\"></script>",
  "status": true
}
```

**Important:** 
- `script` must include the FULL HTML with `<script>` tags
- Can include multiple script tags (config + widget loader)
- Use the `website_id` as the `websiteId` in your config
- Set `status: true` to activate, `status: false` to deactivate

**Response:**
```json
{
  "success": true,
  "message": "Chatbot script updated successfully"
}
```

**Action:** 
- The widget will appear on the customer's website immediately
- Users visiting the website will see Emily chat widget

---

## Error Handling

All errors follow this format:

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE"
}
```

### Common Error Codes:

| Status | Code | Meaning |
|--------|------|---------|
| 401 | `UNAUTHORIZED` | Invalid or missing API key |
| 403 | `FORBIDDEN` | User doesn't own this website |
| 404 | `NOT_FOUND` | Website or user not found |
| 400 | `BAD_REQUEST` | Invalid request parameters |
| 500 | `INTERNAL_ERROR` | Server error |

---

## Implementation Example (Pseudocode)

```javascript
// 1. User opens Emily chat
const userEmail = getCurrentUserEmail();

// 2. Check if they're a WG customer
const customerCheck = await fetch(`${BASE_URL}/check-customer`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ email: userEmail })
});

const customer = await customerCheck.json();

if (!customer.is_customer) {
  // Show message: "You need a Wonder George account first"
  return;
}

// 3. Get their websites
const websitesResponse = await fetch(`${BASE_URL}/user-websites/${customer.user_id}`, {
  headers: { 'Authorization': `Bearer ${API_KEY}` }
});

const { websites } = await websitesResponse.json();

// 4. Display website cards
displayWebsiteCards(websites);

// 5. When user selects a website
const selectedWebsiteId = await waitForUserSelection();

// 6. Fetch website content for AI context
const contentResponse = await fetch(
  `${BASE_URL}/websites/${selectedWebsiteId}/content?user_id=${customer.user_id}`,
  { headers: { 'Authorization': `Bearer ${API_KEY}` } }
);

const { website_content } = await contentResponse.json();

// 7. Initialize Emily with this context
initializeEmilyWithContext(website_content);

// 8. When user wants to install widget
async function installWidget() {
  const script = `<script>
  window.EmilyChat = { websiteId: '${selectedWebsiteId}' };
</script>
<script src="https://talktoemily.com/widget/emily-chat.js"></script>`;

  await fetch(`${BASE_URL}/websites/${selectedWebsiteId}/script`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      user_id: customer.user_id,
      script: script,
      status: true
    })
  });
  
  // Widget is now live on their website!
}
```

---

## Testing

### Test Credentials (Staging)
- Base URL: `https://staging.wonder-george.com/api/external/chatbot`
- Test with your own Wonder George account email

### Expected Flow
1. Enter email → Get back user_id and plan
2. Use user_id → Get list of websites
3. Select website → Get full content
4. Install widget → Widget appears on website

---

## Important Notes

1. **Always include the `user_id`** in content and script endpoints for security verification
2. **The `website_id` from Step 2** is what you use in Steps 3 and 4
3. **Script format:** Include full HTML with `<script>` tags, can be multiple tags
4. **Widget appears immediately** after successful API 4 call
5. **Deactivation:** Send `status: false` to API 4 to remove widget from website

---

## Support

For API issues or questions:
- Check error codes in response
- Verify API key is correct
- Ensure `user_id` matches `website_id` ownership
- All endpoints require proper Bearer token authentication

**Production API Key:** Will be provided separately via secure channel
