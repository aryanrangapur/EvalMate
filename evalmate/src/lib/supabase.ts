import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

// Validate environment variables
if (typeof window === 'undefined') {
  // Only log on server-side to avoid console spam in browser
  console.log('🔧 Supabase Environment Check:')
  console.log('- NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ SET' : '❌ NOT SET')
  console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ SET' : '❌ NOT SET')
  console.log('- Actual URL:', supabaseUrl)
  console.log('- Key length:', supabaseAnonKey?.length || 0)
}

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMsg = '❌ Supabase environment variables not found! Required: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
  console.error(errorMsg)
  if (typeof window === 'undefined') {
    throw new Error(errorMsg)
  }
}

if (supabaseUrl === 'https://placeholder.supabase.co' || supabaseAnonKey === 'placeholder-key') {
  const errorMsg = '❌ Supabase is using placeholder values. Please set proper environment variables.'
  console.error(errorMsg)
  if (typeof window === 'undefined') {
    throw new Error(errorMsg)
  }
}

// Create the supabase client
let _supabase: ReturnType<typeof createClient<Database>> | null = null

export const supabase = (() => {
  if (!_supabase) {
    _supabase = createClient<Database>(
      supabaseUrl || 'https://placeholder.supabase.co',
      supabaseAnonKey || 'placeholder-key',
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true
        }
      }
    )
  }
  return _supabase
})()

// Server-side client for API routes
export const createServerSupabaseClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for server-side operations')
  }

  const key: string = serviceRoleKey!

  return createClient<Database>(supabaseUrl as string, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}
