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
      tasks: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          user_id: string
          title: string
          description: string
          code_content: string | null
          language: string | null
          ai_evaluation: Json | null
          evaluation_status: 'pending' | 'processing' | 'completed' | 'failed'
          report_unlocked: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id: string
          title: string
          description: string
          code_content?: string | null
          language?: string | null
          ai_evaluation?: Json | null
          evaluation_status?: 'pending' | 'processing' | 'completed' | 'failed'
          report_unlocked?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id?: string
          title?: string
          description?: string
          code_content?: string | null
          language?: string | null
          ai_evaluation?: Json | null
          evaluation_status?: 'pending' | 'processing' | 'completed' | 'failed'
          report_unlocked?: boolean
        }
      }
      payments: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          user_id: string
          task_id: string
          stripe_payment_id: string
          amount: number
          currency: string
          status: 'pending' | 'completed' | 'failed' | 'refunded'
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id: string
          task_id: string
          stripe_payment_id: string
          amount: number
          currency: string
          status?: 'pending' | 'completed' | 'failed' | 'refunded'
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id?: string
          task_id?: string
          stripe_payment_id?: string
          amount?: number
          currency?: string
          status?: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded'
        }
      }
      user_profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          user_id: string
          full_name: string | null
          avatar_url: string | null
          credits_balance: number
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id: string
          full_name?: string | null
          avatar_url?: string | null
          credits_balance?: number
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id?: string
          full_name?: string | null
          avatar_url?: string | null
          credits_balance?: number
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
