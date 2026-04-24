// Supabase clients (server-side only — imported by API routes)

import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Lazy initialization to avoid crashing during Next.js build
let _supabase: SupabaseClient | null = null
let _supabaseClient: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    if (!supabaseUrl || !supabaseServiceRole) {
      throw new Error('Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)')
    }
    _supabase = createClient(supabaseUrl, supabaseServiceRole, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }
  return _supabase
}

export function getSupabaseClient(): SupabaseClient {
  if (!_supabaseClient) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)')
    }
    _supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
  }
  return _supabaseClient
}

// Backward-compatible exports (lazy getters)
export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return (getSupabase() as any)[prop]
  }
})

export const supabaseClient = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return (getSupabaseClient() as any)[prop]
  }
})
