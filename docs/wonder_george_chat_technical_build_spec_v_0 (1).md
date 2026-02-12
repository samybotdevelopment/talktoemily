# Wonder George Chat (WGC)

**Technical Build Specification – v0.1**  
**Purpose:** Feed this document to Codex / Cursor / Continue to generate the initial codebase.

---

## 1. Product Overview

Wonder George Chat (WGC) is a standalone SaaS chat platform.

v0.1 focuses on:
- Internal **Owner Assistant** (replaces Support Board)
- Architecture ready for future **Visitor Chatbot**
- Manual + voice-based training (no PDFs, no crawling)
- Optional deep integration with Wonder George (WG)

### Free Trial Rules

- All users can test WGC **for free**
- Free trial includes:
  - **1 training run total (lifetime)**
  - **50 AI messages total (lifetime)**
- Once limits are reached, usage is blocked until payment

### Wonder George Users

- Users with an active Wonder George subscription:
  - Bypass all free-trial limits
  - Do **not** pay a WGC subscription
  - Still consume AI credits

No commercial/marketing pages are required.

---

## 2. Core Principles (DO NOT VIOLATE)

- One chatbot = one website
- One website = one Qdrant collection
- Training always **rebuilds the entire collection**
- No partial updates, no diffs
- No frontend access to Qdrant
- All AI calls go through backend
- Keep it boring and deterministic

---

## 3. Tech Stack

### Frontend
- Next.js (App Router)
- Tailwind CSS
- Deployed on Vercel

### Backend
- Next.js API routes
- Server-only OpenAI usage
- Server-only Qdrant access

### Auth
- Supabase Auth (Chat product only)
- Email magic link or email/password

### Databases
- Supabase Postgres (Chat data)
- Qdrant (Vector DB, self-hosted)

### AI
- OpenAI embeddings: `text-embedding-3-small`
- OpenAI chat model (configurable)

---

## 4. User & Org Model

### User
- id
- email
- created_at

### Organization
- id
- name
- plan: `free | pro`
- max_websites: `1 | 5`
- is_wg_linked: boolean
- created_at

### Membership
- user_id
- org_id
- role: `owner | admin`

---

## 5. Website Model

### Website
- id
- org_id
- domain
- display_name
- primary_color
- icon_url
- created_at

Rules:
- One chatbot per website
- Training is scoped to website

---

## 6. Conversation Model

### Conversation
- id
- website_id
- agent_type: `owner | visitor`
- ai_mode: `auto | paused`
- created_at

### Message
- id
- conversation_id
- sender: `user | assistant | human`
- content
- created_at

v0.1:
- Only `agent_type = owner`
- Human sender allowed only when `ai_mode = paused`

---

## 7. Training Model (CRITICAL)

### Training Item

A training item represents **one semantic chunk**.

Fields:
- id
- website_id
- title
- content
- created_at

Rules:
- Each training item = ONE embedding
- No further chunking
- Embedding text format:

```
<TITLE>\n\n<CONTENT>
```

### Training Run
- website_id
- status: `idle | running | failed | completed`
- last_trained_at

Limits:
- Max 4 training runs / month

---

## 8. Training Flow (IMPLEMENT EXACTLY)

1. User edits/adds training items (free)
2. User clicks **Train chatbot**
3. Backend validates training quota
4. Backend sets status = running
5. Backend loads ALL training items
6. Backend embeds each item (OpenAI)
7. Backend deletes Qdrant collection
8. Backend creates new collection
9. Backend inserts all vectors
10. Backend marks training complete

On failure:
- Keep old collection
- Mark status = failed

---

## 9. Qdrant Configuration

### Collection
- Name: `website_<website_id>`
- Vector size: 1536
- Distance: Cosine

### Payload per point
```
{
  title: string,
  content: string,
  source: "manual" | "wg",
  created_at: timestamp
}
```

---

## 10. Chat AI Flow

### AI Response Pipeline

1. User sends message
2. Embed user message
3. Search Qdrant collection (top 3–5)
4. Extract payload.content
5. Build prompt
6. Send to LLM
7. Stream response
8. Store assistant message

### AI MUST NOT:
- Execute actions
- Modify WG state
- Invent features

---

## 11. System Prompt (Owner Assistant)

```
You are the Wonder George Assistant.

You help website owners understand and use the Wonder George platform.

You answer clearly, concisely, and accurately.

You do not invent features.
You do not perform actions.
If information is missing, ask a clarification question.
```

---

## 12. WG Integration (Optional, v0.1)

### WG Subscription Check (MANDATORY LOGIC)

Instead of API keys or SSO, WGC verifies Wonder George access via WG APIs.

Flow:
1. WGC sends the user's **email** to WG API
2. WG API responds with:
   - has_active_subscription: boolean
   - websites: list of websites owned by the user

If `has_active_subscription = true`:
- WGC marks the org as `is_wg_linked = true`
- Free-trial limits are disabled
- Subscription price is forced to 0

### WG Website Content Import

WG-only feature.

Flow:
1. WGC calls WG API with:
   - user email
   - website_id
2. WG API returns structured website content (JSONB)
3. Each page becomes **one training item**:
   - title = page title
   - content = concatenated section text
   - source = `wg`

No crawling.
No parsing.

---

## 13. UI Pages (v0.1)

### Auth
- Login
- Signup

### App
- Dashboard (websites + conversations)
- Website settings
- Training page (text + voice input)
- Conversation page
- Subscription page (logic only)
- Credits page (logic only)

No marketing pages.

---

## 14. Explicit Non-Goals

- No PDFs
- No external website crawling
- No social integrations
- No action execution
- No visitor widget UI

---

## 15. Future Extensions (DO NOT IMPLEMENT)

- Visitor chatbot widget
- WG feature activation via chat
- Ecommerce / booking actions
- WP export plugin
- Multi-language training management

---

## 16. Success Criteria

- Deterministic answers
- No hallucinated features
- Training is fast and reliable
- System easy to debug
- Qdrant data can always be rebuilt

---

**END OF SPEC**

