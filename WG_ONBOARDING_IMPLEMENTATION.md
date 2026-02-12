# Wonder George Onboarding Flow - Implementation Summary

## Overview

Successfully implemented a complete onboarding flow for Wonder George customers that integrates with the WG API, provides a guided wizard experience, and automatically activates chatbot widgets on WG websites.

## Files Created (13 new files)

### Database
- `database/migrations/006_wg_integration.sql` - Migration adding WG fields to organizations and websites tables

### API Routes (5 files)
- `app/api/onboarding/status/route.ts` - Check onboarding status
- `app/api/onboarding/websites/route.ts` - Fetch WG websites
- `app/api/onboarding/content/route.ts` - Process WG website content
- `app/api/onboarding/process-document/route.ts` - Process uploaded documents
- `app/api/onboarding/complete/route.ts` - Complete onboarding flow
- `app/api/websites/[id]/widget-activation/route.ts` - Widget activation API

### UI Components
- `app/onboarding/page.tsx` - Multi-step onboarding wizard (7 steps)

### Library Functions
- `lib/training/content-processor.ts` - WG content and document processing utilities

## Files Modified (7 files)

### API Integration
- `lib/integrations/wg-api.ts` - Replaced placeholders with real WG API calls
  - `checkWGCustomer()` - Step 1 API
  - `getWGWebsites()` - Step 2 API
  - `getWGWebsiteContent()` - Step 3 API
  - `activateWGWidget()` - Step 4 API
  - `generateWidgetScript()` - Helper function

### Authentication Flow
- `app/api/auth/signup/route.ts` - Added WG customer check on signup
- `app/auth/signup/page.tsx` - Added redirect to onboarding for WG customers

### Dashboard & Settings
- `app/dashboard/page.tsx` - Added onboarding check and WG customer banner
- `app/websites/[id]/settings/page.tsx` - Pass widget activation props
- `app/websites/[id]/settings/SettingsClient.tsx` - Added widget activation toggle

### Middleware
- `lib/supabase/middleware.ts` - Added onboarding route protection

### Type Definitions
- `types/database.types.ts` - Updated with new WG fields
- `types/models.ts` - Added WG-specific types

### Environment
- `.env.example` - Added WG API configuration

## Key Features Implemented

### 1. Signup Integration
- Checks if user is a WG customer during signup
- Automatically links account with WG subscription
- Sets appropriate max_websites based on WG plan (agency = 5, others = 1)
- Redirects WG customers to onboarding, others to standard dashboard

### 2. Seven-Step Onboarding Wizard

**Step 1: Welcome Screen**
- Friendly greeting explaining free subscription for WG customers

**Step 2: Website Selection**
- Fetches websites from WG API
- Displays as cards with images/placeholders
- User selects which website to add chatbot to

**Step 3: Bot Customization**
- Name the bot (pre-filled with website name)
- Choose widget color (color picker)

**Step 4: Auto-Training Setup**
- Shows loading state while fetching WG website content
- Processes content into training chunks

**Step 5: Q&A Loop**
- Interactive questions to gather more context
- 4 default questions about products, customer questions, uniqueness, etc.
- Each answer creates a training chunk

**Step 6: Document Upload** (Optional)
- Upload .txt files
- GPT processes into semantic chunks
- Adds to training data

**Step 7: Review & Train**
- Display all training chunks
- Allow deletion of individual items
- "Train & Activate Widget" button
- Creates website, saves training items, trains bot, activates widget
- Marks onboarding as complete

### 3. Content Processing
- `processWGContent()` - Intelligently extracts content from WG JSON structure
  - Handles Hero, Features, Services, About, Contact sections
  - Extracts strategy/tone information
  - Creates meaningful chunk titles
- `chunkDocument()` - Uses GPT-4 to semantically chunk uploaded documents
- `generateContextualQuestions()` - Generate custom questions based on website content

### 4. Widget Activation
- Settings page shows "Widget Status" section for WG websites
- Activate/Deactivate toggle
- Calls WG API to inject/remove Emily script
- Updates database with activation status and timestamp

### 5. Dashboard Enhancements
- Checks for incomplete onboarding, redirects if needed
- Shows prominent banner for WG customers
- Displays "WG LINKED" badge on plan card
- Shows unlimited (∞) for training runs and messages

### 6. Middleware Protection
- `/onboarding` route only accessible to authenticated WG customers
- Redirects if onboarding already completed
- Redirects non-WG customers to dashboard

## Database Schema Changes

### organizations table
```sql
- wg_user_id TEXT (WG user ID)
- wg_plan TEXT (free, essential, entrepreneur, agency)
- onboarding_completed_at TIMESTAMPTZ
```

### websites table
```sql
- widget_activated BOOLEAN
- wg_website_id TEXT (WG website ID for API calls)
- widget_activated_at TIMESTAMPTZ
```

## API Flow

1. **Signup**: `POST /api/auth/signup` → Checks WG customer status
2. **Onboarding Status**: `GET /api/onboarding/status` → Check if needed
3. **Get Websites**: `POST /api/onboarding/websites` → List WG websites
4. **Get Content**: `POST /api/onboarding/content` → Process WG content
5. **Process Doc**: `POST /api/onboarding/process-document` → Chunk document
6. **Complete**: `POST /api/onboarding/complete` → Create website, train, activate
7. **Toggle Widget**: `POST /api/websites/[id]/widget-activation` → Activate/deactivate

## Environment Variables

Add to `.env.local`:
```
CHATBOT_API_KEY=your_wg_api_key_here
WG_API_BASE_URL=https://wonder-george.com/api/external/chatbot
```

## Integration Points

### WG API Endpoints Used
1. `POST /check-customer` - Verify customer status
2. `GET /user-websites/{user_id}` - List websites
3. `GET /websites/{website_id}/content?user_id={user_id}` - Get content
4. `POST /websites/{website_id}/script` - Install/remove widget

### Emily Widget Script Format
```html
<script>
  window.EmilyChat = { websiteId: '{website_id}' };
</script>
<script src="{app_url}/widget/emily-chat.js"></script>
```

## User Flows

### WG Customer Signup
1. User signs up with WG email
2. Backend checks WG API
3. Account linked, redirected to `/onboarding`
4. Complete 7-step wizard
5. Bot trained and widget activated automatically
6. Redirect to dashboard with success message

### Non-WG Customer Signup
1. User signs up with non-WG email
2. Backend checks WG API (returns not a customer)
3. Account created with free plan
4. Redirected to standard dashboard
5. Can create websites via `/websites/new` (existing flow)

### Widget Management (WG Customers)
1. Navigate to website settings
2. See "Widget Status" section
3. Click "Activate" or "Deactivate"
4. API calls WG to inject/remove script
5. Status updates in real-time

## Testing Checklist

- [ ] Signup with WG customer email
- [ ] Signup with non-WG email
- [ ] Complete onboarding wizard all steps
- [ ] Upload document in step 6
- [ ] Skip Q&A and document steps
- [ ] Review and remove training chunks
- [ ] Verify widget activation on WG website
- [ ] Toggle widget on/off from settings
- [ ] Check dashboard banner for WG customers
- [ ] Verify unlimited usage limits
- [ ] Test onboarding route protection

## Notes

- WG API key must be configured in environment variables
- Training process same as standard flow (uses Qdrant, embeddings, etc.)
- Non-WG customers unaffected - existing flow preserved
- Widget activation is optional - can be toggled later from settings
- Onboarding can't be re-run once completed (onboarding_completed_at set)
- All WG data stored in existing tables (no new tables needed)

## Next Steps

1. Add WG API credentials to environment
2. Run database migration `006_wg_integration.sql`
3. Test with WG staging environment
4. Deploy to production
5. Monitor WG API integration logs
6. Consider adding retry logic for WG API failures
7. Add analytics to track onboarding completion rates
