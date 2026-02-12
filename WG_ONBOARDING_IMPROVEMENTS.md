# Wonder George Onboarding Improvements - Implementation Summary

## Overview

Successfully implemented three major improvements to the Wonder George customer onboarding flow:

1. **Automatic Progress Restoration** - Users who don't complete onboarding are automatically returned to their last step
2. **Looping Q&A Sections** - Restructured training questions into 4 looping sections with title/content format
3. **Enhanced Document Processing** - TXT documents are processed by LLM to always return title/content chunks for VDB

## Changes Made

### 1. Database Schema (New Migration)

**File**: `database/migrations/007_onboarding_state.sql`

- Added `onboarding_state` JSONB column to `organizations` table
- Stores complete onboarding progress (step, selections, training data)
- Automatically cleared when onboarding completes
- Indexed with GIN for efficient JSON queries

### 2. Type Definitions

**File**: `types/models.ts`

Updated `Organization` interface to include:
```typescript
onboarding_state?: OnboardingState | null;
```

Updated `OnboardingState` interface to include:
```typescript
currentQuestionSection: number;
qaAnswers: { question: string; answer: string }[];
```

### 3. API Routes

**File**: `app/api/onboarding/status/route.ts`

**GET endpoint**: Now returns saved `onboarding_state` along with status
- Allows frontend to restore exact onboarding position

**POST endpoint**: New endpoint to save onboarding state
- Saves state to database whenever user makes progress
- State includes: step, website selection, bot config, training chunks, Q&A progress

**File**: `app/api/onboarding/complete/route.ts`

- Updated to clear `onboarding_state` when onboarding completes
- Ensures users won't be redirected back to onboarding

### 4. Content Processing

**File**: `lib/training/content-processor.ts`

Updated `chunkDocument()` function:
- Modified GPT-4 prompt to enforce title/content format
- System message emphasizes "MUST return chunks with both title and content"
- Updated JSON parsing to handle `title` and `content` fields
- Added filter to ensure both fields are present and non-empty
- Better fallback handling if GPT response is malformed

### 5. Onboarding Page - Complete Rewrite

**File**: `app/onboarding/page.tsx`

**New Features**:

#### Progress Persistence
- `loadOnboardingState()` - Loads saved state on mount
- `saveOnboardingState()` - Saves state whenever it changes
- `useEffect` hook auto-saves on state changes (step, selections, training data)

#### Restructured Q&A Flow (Step 5)
Replaced single sequential question flow with **4 looping sections**:

1. **Product and Services Questions**
   - Title: "Product and Services Questions"
   - User enters multiple title/content pairs
   
2. **Questions Customers Typically Ask**
   - Title: "Questions Customers Typically Ask"
   - Allows multiple entries
   
3. **What Makes Your Business Unique**
   - Title: "What Makes Your Business Unique"
   - Multiple unique selling points
   
4. **Additional Information**
   - Title: "Additional Information"
   - Any other relevant business info

**Each Section**:
- Shows section title as `# {Title}` (heading format)
- Requires both **Title** and **Content** fields
- "Save" button adds entry and **clears form**
- "Next Section" button moves to next section (was "Skip")
- User can add multiple entries per section
- All entries saved as training chunks with title/content format

#### Updated UI Flow
```
Step 1: Welcome
Step 2: Website Selection
Step 3: Bot Customization (name, color)
Step 4: Pull Website Content
Step 5: Q&A Looping Sections (4 sections, multiple entries each)
Step 6: Document Upload (optional, with LLM processing note)
Step 7: Review & Train
```

### 6. Dashboard Redirect

**File**: `app/dashboard/page.tsx`

Added onboarding check:
```typescript
if (org.is_wg_linked && !org.onboarding_completed_at) {
  redirect('/onboarding');
}
```

WG customers with incomplete onboarding are **automatically redirected** back to continue where they left off.

## User Experience Improvements

### Requirement 1: Auto-Resume Onboarding ✅
- When WG user logs back in before completing first bot creation
- Dashboard automatically redirects to `/onboarding`
- Onboarding page loads saved state from database
- User continues from exact step where they left off
- All selections, training data, and Q&A progress restored

### Requirement 2: Looping Q&A Sections ✅
- 4 distinct training sections after importing website content
- Each section presented with `# Title` heading
- Each entry requires **Title** and **Content**
- Form clears after saving each entry
- Buttons: "Save" (add entry) and "Next Section" (move to next)
- Users can add as many entries as needed per section
- All entries become title/content training chunks

### Requirement 3: Document Processing ✅
- TXT upload triggers LLM processing
- GPT-4 prompt enforces title/content format
- Returns array of chunks: `[{ title, content }, ...]`
- Chunks suitable for VDB (vector database) ingestion
- UI notes that "LLM will extract title and content chunks automatically"

## Technical Details

### State Persistence Flow

1. User makes progress in onboarding
2. `useEffect` triggers `saveOnboardingState()`
3. State saved to `organizations.onboarding_state` via API
4. User logs out or closes browser
5. User logs back in → Dashboard checks `onboarding_completed_at`
6. If incomplete, redirects to `/onboarding`
7. Onboarding page calls `loadOnboardingState()`
8. All React state restored from database
9. User continues from exact position

### Q&A Section Data Structure

```typescript
currentQuestionSection: number;  // 0-3 (index of current section)
currentSectionTitle: string;     // Current entry title (cleared on save)
currentSectionContent: string;   // Current entry content (cleared on save)
qaAnswers: Array<{               // All saved Q&A entries
  question: string;              // Section question
  answer: string;                // "{title}: {content}"
}>;
trainingChunks: Array<{          // Training data for VDB
  title: string;
  content: string;
}>;
```

### Document Processing Flow

1. User uploads .txt file in Step 6
2. File sent to `/api/onboarding/process-document`
3. Server reads file content
4. Calls `chunkDocument(text)` with GPT-4
5. GPT-4 returns: `[{ title, content }, ...]`
6. Chunks added to `trainingChunks` array
7. All chunks available in Step 7 review

## Migration Instructions

To apply the database changes:

```bash
# Run the migration against your Supabase database
psql $DATABASE_URL -f database/migrations/007_onboarding_state.sql
```

Or via Supabase dashboard:
1. Go to SQL Editor
2. Copy contents of `database/migrations/007_onboarding_state.sql`
3. Run query

## Testing Checklist

- [ ] New WG signup → completes onboarding → no redirect
- [ ] New WG signup → partial onboarding → logout → login → resumes at correct step
- [ ] Step 5 Q&A sections → can add multiple entries per section
- [ ] Step 5 form clears after "Save" button
- [ ] Step 5 "Next Section" button moves to next section
- [ ] Step 6 document upload → shows processing message
- [ ] Step 7 review → all training chunks have title and content
- [ ] Complete onboarding → redirect to dashboard
- [ ] Return to dashboard → no automatic redirect (completed state)
- [ ] All training chunks stored with title/content in database

## Files Modified/Created

### Created (2 files)
- `database/migrations/007_onboarding_state.sql`
- `WG_ONBOARDING_IMPROVEMENTS.md` (this file)

### Modified (5 files)
- `types/models.ts` - Added onboarding_state to Organization and OnboardingState
- `app/api/onboarding/status/route.ts` - Added state save/restore endpoints
- `app/api/onboarding/complete/route.ts` - Clear state on completion
- `lib/training/content-processor.ts` - Enhanced document chunking
- `app/onboarding/page.tsx` - Complete rewrite with all new features
- `app/dashboard/page.tsx` - Added onboarding redirect check

## Next Steps

1. Run the database migration (`007_onboarding_state.sql`)
2. Test the complete onboarding flow
3. Verify state persistence across sessions
4. Test document upload chunking
5. Verify all training data has title/content format


