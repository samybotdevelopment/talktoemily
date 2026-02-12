// This file contains database-specific types generated from Supabase schema
// These should match the SQL schema exactly

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
        }
      }
      organizations: {
        Row: {
          id: string
          name: string
          plan: 'free' | 'pro'
          max_websites: number
          is_wg_linked: boolean
          credits_balance: number
          created_at: string
          wg_user_id: string | null
          wg_plan: 'free' | 'essential' | 'entrepreneur' | 'agency' | null
          onboarding_completed_at: string | null
        }
        Insert: {
          id?: string
          name: string
          plan?: 'free' | 'pro'
          max_websites?: number
          is_wg_linked?: boolean
          credits_balance?: number
          created_at?: string
          wg_user_id?: string | null
          wg_plan?: 'free' | 'essential' | 'entrepreneur' | 'agency' | null
          onboarding_completed_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          plan?: 'free' | 'pro'
          max_websites?: number
          is_wg_linked?: boolean
          credits_balance?: number
          created_at?: string
          wg_user_id?: string | null
          wg_plan?: 'free' | 'essential' | 'entrepreneur' | 'agency' | null
          onboarding_completed_at?: string | null
        }
      }
      memberships: {
        Row: {
          user_id: string
          org_id: string
          role: 'owner' | 'admin'
          created_at: string
        }
        Insert: {
          user_id: string
          org_id: string
          role?: 'owner' | 'admin'
          created_at?: string
        }
        Update: {
          user_id?: string
          org_id?: string
          role?: 'owner' | 'admin'
          created_at?: string
        }
      }
      websites: {
        Row: {
          id: string
          org_id: string
          domain: string
          display_name: string
          primary_color: string
          icon_url: string | null
          created_at: string
          widget_activated: boolean
          wg_website_id: string | null
          widget_activated_at: string | null
        }
        Insert: {
          id?: string
          org_id: string
          domain: string
          display_name: string
          primary_color?: string
          icon_url?: string | null
          created_at?: string
          widget_activated?: boolean
          wg_website_id?: string | null
          widget_activated_at?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          domain?: string
          display_name?: string
          primary_color?: string
          icon_url?: string | null
          created_at?: string
          widget_activated?: boolean
          wg_website_id?: string | null
          widget_activated_at?: string | null
        }
      }
      conversations: {
        Row: {
          id: string
          website_id: string
          agent_type: 'owner' | 'visitor'
          ai_mode: 'auto' | 'paused'
          created_at: string
        }
        Insert: {
          id?: string
          website_id: string
          agent_type?: 'owner' | 'visitor'
          ai_mode?: 'auto' | 'paused'
          created_at?: string
        }
        Update: {
          id?: string
          website_id?: string
          agent_type?: 'owner' | 'visitor'
          ai_mode?: 'auto' | 'paused'
          created_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender: 'user' | 'assistant' | 'human'
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          sender: 'user' | 'assistant' | 'human'
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          sender?: 'user' | 'assistant' | 'human'
          content?: string
          created_at?: string
        }
      }
      training_items: {
        Row: {
          id: string
          website_id: string
          title: string
          content: string
          source: 'manual' | 'wg'
          created_at: string
        }
        Insert: {
          id?: string
          website_id: string
          title: string
          content: string
          source?: 'manual' | 'wg'
          created_at?: string
        }
        Update: {
          id?: string
          website_id?: string
          title?: string
          content?: string
          source?: 'manual' | 'wg'
          created_at?: string
        }
      }
      training_runs: {
        Row: {
          id: string
          website_id: string
          status: 'idle' | 'running' | 'failed' | 'completed'
          started_at: string
          completed_at: string | null
          error_message: string | null
        }
        Insert: {
          id?: string
          website_id: string
          status?: 'idle' | 'running' | 'failed' | 'completed'
          started_at?: string
          completed_at?: string | null
          error_message?: string | null
        }
        Update: {
          id?: string
          website_id?: string
          status?: 'idle' | 'running' | 'failed' | 'completed'
          started_at?: string
          completed_at?: string | null
          error_message?: string | null
        }
      }
      usage_tracking: {
        Row: {
          id: string
          org_id: string
          training_runs_used: number
          ai_messages_used: number
          period_start: string
          period_end: string
        }
        Insert: {
          id?: string
          org_id: string
          training_runs_used?: number
          ai_messages_used?: number
          period_start?: string
          period_end?: string
        }
        Update: {
          id?: string
          org_id?: string
          training_runs_used?: number
          ai_messages_used?: number
          period_start?: string
          period_end?: string
        }
      }
      stripe_customers: {
        Row: {
          org_id: string
          stripe_customer_id: string
          stripe_subscription_id: string | null
          created_at: string
        }
        Insert: {
          org_id: string
          stripe_customer_id: string
          stripe_subscription_id?: string | null
          created_at?: string
        }
        Update: {
          org_id?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string | null
          created_at?: string
        }
      }
    }
  }
}
