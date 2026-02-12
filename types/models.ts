// Core application types

export type PlanType = 'free' | 'pro';
export type RoleType = 'owner' | 'admin';
export type AgentType = 'owner' | 'visitor';
export type AiMode = 'auto' | 'paused';
export type MessageSender = 'user' | 'assistant' | 'human';
export type TrainingSource = 'manual' | 'wg';
export type TrainingStatus = 'idle' | 'running' | 'failed' | 'completed';
export type WGPlanType = 'free' | 'essential' | 'entrepreneur' | 'agency';

export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  plan: PlanType;
  max_websites: number;
  is_wg_linked: boolean;
  credits_balance: number;
  created_at: string;
  wg_user_id?: string | null;
  wg_plan?: WGPlanType | null;
  onboarding_completed_at?: string | null;
  onboarding_state?: OnboardingState | null;
}

export interface Membership {
  user_id: string;
  org_id: string;
  role: RoleType;
}

export interface Website {
  id: string;
  org_id: string;
  domain: string;
  display_name: string;
  primary_color: string;
  icon_url: string | null;
  created_at: string;
  widget_activated?: boolean;
  wg_website_id?: string | null;
  widget_activated_at?: string | null;
}

// Wonder George Integration Types
export interface WGWebsite {
  website_url: string;
  website_name: string;
  website_id: string;
  website_image_url: string | null;
}

export interface WGWebsiteContent {
  pages: Record<string, any>;
  strategy?: {
    tone: string;
    key_messages: string[];
  };
}

export interface WGCustomerCheckResponse {
  is_customer: boolean;
  plan: WGPlanType | null;
  user_id: string | null;
}

export interface TrainingChunk {
  title: string;
  content: string;
}

export interface OnboardingState {
  step: number;
  selectedWebsite: WGWebsite | null;
  botName: string;
  primaryColor: string;
  trainingChunks: TrainingChunk[];
  currentQuestionSection: number;
  qaAnswers: { question: string; answer: string }[];
}

export interface Conversation {
  id: string;
  website_id: string;
  agent_type: AgentType;
  ai_mode: AiMode;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender: MessageSender;
  content: string;
  created_at: string;
}

export interface TrainingItem {
  id: string;
  website_id: string;
  title: string;
  content: string;
  source: TrainingSource;
  created_at: string;
}

export interface TrainingRun {
  id: string;
  website_id: string;
  status: TrainingStatus;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
}

export interface UsageTracking {
  id: string;
  org_id: string;
  training_runs_used: number;
  ai_messages_used: number;
  period_start: string;
  period_end: string;
}

export interface StripeCustomer {
  org_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
}

// API Response types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

// Qdrant types
export interface QdrantPayload {
  title: string;
  content: string;
  source: TrainingSource;
  created_at: string;
}

export interface SearchResult {
  title: string;
  content: string;
  score: number;
}

// Usage limits
export interface UsageLimits {
  training_runs: number;
  ai_messages: number;
}

export const FREE_LIMITS: UsageLimits = {
  training_runs: 1, // lifetime
  ai_messages: 50,  // lifetime
};

export const PRO_LIMITS: UsageLimits = {
  training_runs: 4, // per month
  ai_messages: -1,  // unlimited (with credits)
};
