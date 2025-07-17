import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Types for our database schema
export type Database = {
  public: {
    Tables: {
      events: {
        Row: {
          id: string
          name: string
          event_code: string
          cover_image_url: string | null
          auto_approval: boolean
          password_protected: boolean
          password: string | null
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          name: string
          event_code: string
          cover_image_url?: string | null
          auto_approval?: boolean
          password_protected?: boolean
          password?: string | null
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          name?: string
          event_code?: string
          cover_image_url?: string | null
          auto_approval?: boolean
          password_protected?: boolean
          password?: string | null
          created_at?: string
          updated_at?: string
          user_id?: string
        }
      }
      uploads: {
        Row: {
          id: string
          event_id: string
          file_url: string
          file_type: string
          uploader_name: string | null
          comment: string | null
          challenge_id: string | null
          approved: boolean
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          file_url: string
          file_type: string
          uploader_name?: string | null
          comment?: string | null
          challenge_id?: string | null
          approved?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          file_url?: string
          file_type?: string
          uploader_name?: string | null
          comment?: string | null
          challenge_id?: string | null
          approved?: boolean
          created_at?: string
        }
      }
      challenges: {
        Row: {
          id: string
          event_id: string
          title: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          title: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          title?: string
          description?: string | null
          created_at?: string
        }
      }
    }
  }
}