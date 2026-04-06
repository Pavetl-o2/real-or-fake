import { createClient } from '@supabase/supabase-js'

// Fallback placeholder keeps the build from throwing during static analysis.
// The real values must be set in .env.local before running.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = createClient<any>(supabaseUrl, supabaseAnonKey)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient<any>(url, key)
}
