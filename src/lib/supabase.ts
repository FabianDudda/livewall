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
          image_display_duration: number | null
          upload_header_gradient: string | null
          livewall_background_gradient: string | null
          ordering_mode: string | null
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
          image_display_duration?: number | null
          upload_header_gradient?: string | null
          livewall_background_gradient?: string | null  
          ordering_mode?: string | null
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
          image_display_duration?: number | null
          upload_header_gradient?: string | null
          livewall_background_gradient?: string | null
          ordering_mode?: string | null
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
          created_at: string
          hashtag: string | null
        }
        Insert: {
          id?: string
          event_id: string
          title: string
          created_at?: string
          hashtag?: string | null
        }
        Update: {
          id?: string
          event_id?: string
          title?: string
          created_at?: string
          hashtag?: string | null
        }
      }
    }
  }
}