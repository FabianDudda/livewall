import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/supabase'

export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  return createClient<Database>(supabaseUrl, supabaseAnonKey)
}

export { createServerClient as createClient }