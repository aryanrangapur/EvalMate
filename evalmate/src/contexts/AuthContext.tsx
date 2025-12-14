'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error?: any; success?: boolean; message?: string }>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Maximum time to wait for auth initialization (in ms)
const AUTH_TIMEOUT = 5000

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // Function to ensure user profile exists (runs in background, non-blocking)
  const ensureUserProfile = useCallback(async (userId: string, metadata?: any) => {
    try {
      const { data: existingProfile, error: checkError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', userId)
        .single()

      if (checkError && checkError.code === 'PGRST116') {
        console.log('Creating user profile for:', userId)
        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: userId,
            full_name: metadata?.full_name || metadata?.name || '',
            avatar_url: metadata?.avatar_url || null,
            premium_user: false
          } as any)

        if (insertError) {
          console.error('Failed to create user profile:', insertError)
        } else {
          console.log('User profile created successfully')
        }
      }
    } catch (error) {
      console.error('Error ensuring user profile:', error)
    }
  }, [])

  // Refresh session manually
  const refreshSession = useCallback(async () => {
    try {
      const { data: { session: newSession }, error } = await supabase.auth.getSession()
      if (!error && newSession) {
        setSession(newSession)
        setUser(newSession.user)
      }
    } catch (error) {
      console.error('Error refreshing session:', error)
    }
  }, [])

  useEffect(() => {
    // Check if Supabase is properly configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    const isSupabaseConfigured = supabaseUrl &&
                                 supabaseKey &&
                                 supabaseUrl !== 'https://placeholder.supabase.co'

    if (!isSupabaseConfigured) {
      console.warn('Supabase not configured. Authentication features will be disabled.')
      setLoading(false)
      return
    }

    let isMounted = true
    let authTimeoutId: NodeJS.Timeout

    // Initialize auth
    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession()

        if (!isMounted) return

        if (error) {
          console.error('Error getting session:', error)
        } else {
          setSession(initialSession)
          setUser(initialSession?.user ?? null)

          // Create profile in background (don't block loading)
          if (initialSession?.user) {
            ensureUserProfile(initialSession.user.id, initialSession.user.user_metadata)
          }
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    // Set a timeout to prevent infinite loading
    authTimeoutId = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('Auth initialization timed out, proceeding anyway')
        setLoading(false)
      }
    }, AUTH_TIMEOUT)

    // Initialize auth immediately
    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!isMounted) return

        console.log('Auth event:', event)

        // Update state immediately (don't block on profile creation)
        setSession(newSession)
        setUser(newSession?.user ?? null)
        setLoading(false)

        // Handle profile creation in background
        if (event === 'SIGNED_IN' && newSession?.user) {
          ensureUserProfile(newSession.user.id, newSession.user.user_metadata)
        }
      }
    )

    return () => {
      isMounted = false
      clearTimeout(authTimeoutId)
      subscription.unsubscribe()
    }
  }, [ensureUserProfile, loading])

  const signUp = async (email: string, password: string, fullName?: string) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    const isSupabaseConfigured = supabaseUrl &&
                                 supabaseKey &&
                                 supabaseUrl !== 'https://placeholder.supabase.co'

    if (!isSupabaseConfigured) {
      return { error: { message: 'Authentication is not configured. Please set up environment variables.' } }
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        console.error('Signup error:', error)
        return { error }
      }

      // If signup successful but needs email confirmation
      if (data.user && !data.session) {
        return {
          success: true,
          message: 'Please check your email and click the confirmation link to complete your registration.'
        }
      }

      return { error: null }
    } catch (error) {
      console.error('Signup exception:', error)
      return { error: { message: 'An unexpected error occurred during signup' } }
    }
  }

  const signIn = async (email: string, password: string) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    const isSupabaseConfigured = supabaseUrl &&
                                 supabaseKey &&
                                 supabaseUrl !== 'https://placeholder.supabase.co'

    if (!isSupabaseConfigured) {
      return { error: { message: 'Authentication is not configured. Please set up environment variables.' } }
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        // Handle specific auth errors
        if (error.message.includes('Email not confirmed')) {
          return {
            error: {
              message: 'Please check your email and click the confirmation link before signing in.',
              code: 'email_not_confirmed'
            }
          }
        }
        if (error.message.includes('Invalid login credentials') ||
            error.message.includes('User not found') ||
            error.message.includes('user_not_found')) {
          return {
            error: {
              message: 'Invalid email or password. Please try again or sign up.',
              code: 'invalid_credentials'
            }
          }
        }
        return { error }
      }

      return { error: null }
    } catch (error) {
      console.error('SignIn exception:', error)
      return { error: { message: 'An unexpected error occurred during sign in' } }
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      // Clear state immediately
      setUser(null)
      setSession(null)
    } catch (error) {
      console.error('SignOut error:', error)
      // Still clear state even if signOut fails
      setUser(null)
      setSession(null)
    }
  }

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    refreshSession,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
