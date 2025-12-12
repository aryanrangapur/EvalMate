'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error?: any }>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // Function to ensure user profile exists
  const ensureUserProfile = async (user: User) => {
    try {
      // Check if profile exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (checkError && checkError.code === 'PGRST116') {
        // Profile doesn't exist, create it
        console.log('Creating user profile for:', user.id)
        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: user.id,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
            avatar_url: user.user_metadata?.avatar_url || null,
            premium_user: false
          } as any)

        if (insertError) {
          console.error('Failed to create user profile:', insertError)
        } else {
          console.log('User profile created successfully')
        }
      } else if (existingProfile) {
        console.log('User profile already exists')
      }
    } catch (error) {
      console.error('Error ensuring user profile:', error)
    }
  }

  useEffect(() => {
    // Check if Supabase is properly configured
    const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL &&
                                 process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
                                 process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder.supabase.co'

    if (!isSupabaseConfigured) {
      console.warn('Supabase not configured. Authentication features will be disabled.')
      setLoading(false)
      return
    }

    // Add a small delay to ensure supabase is fully initialized
    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.error('Error getting session:', error)
        } else {
          setSession(session)
          setUser(session?.user ?? null)
          if (session?.user) {
            await ensureUserProfile(session.user)
          }
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error)
      }
      setLoading(false)
    }

    // Use setTimeout to ensure this runs after the component mounts
    const timeoutId = setTimeout(initializeAuth, 0)

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event, session?.user?.id)

        setSession(session)
        setUser(session?.user ?? null)

        // Handle different auth events
        if (event === 'SIGNED_IN' && session?.user) {
          await ensureUserProfile(session.user)
          // User successfully signed in, they'll be redirected by the page logic
        } else if (event === 'SIGNED_OUT') {
          // User signed out, redirect to login
          if (typeof window !== 'undefined' && window.location.pathname !== '/auth/login') {
            window.location.href = '/auth/login'
          }
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          await ensureUserProfile(session.user)
        }

        setLoading(false)
      }
    )

    return () => {
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [])

  const signUp = async (email: string, password: string, fullName?: string) => {
    const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL &&
                                 process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
                                 process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder.supabase.co'

    if (!isSupabaseConfigured) {
      return { error: { message: 'Authentication is not configured. Please set up environment variables.' } }
    }

    // DEVELOPMENT MODE: Skip email confirmation for testing
    const isDevelopment = process.env.NODE_ENV === 'development'

    console.log('Starting signup process for:', email, 'Development mode:', isDevelopment)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        // Skip email confirmation in development
        ...(isDevelopment && { captchaToken: undefined })
      },
    })

    console.log('Supabase signup result:', { user: !!data.user, session: !!data.session, error })

    if (error) {
      console.error('Signup error:', error)
      return { error }
    }

    // User profile creation is handled by the database trigger
    // No manual fallback needed

    // Signup successful - profile creation handled by database trigger

    // If signup successful but needs email confirmation
    if (data.user && !data.session) {
      return {
        success: true,
        message: 'Please check your email and click the confirmation link to complete your registration.'
      }
    }

    return { error: null }
  }

  const signIn = async (email: string, password: string) => {
    const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL &&
                                 process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
                                 process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder.supabase.co'

    if (!isSupabaseConfigured) {
      return { error: { message: 'Authentication is not configured. Please set up environment variables.' } }
    }

    console.log('Attempting sign-in for:', email)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    console.log('Sign-in result:', { user: !!data.user, session: !!data.session, error })

    if (error) {
      console.log('Sign-in error:', error)

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
            message: 'No account found with this email. Please sign up first.',
            code: 'user_not_found'
          }
        }
      }

      // For development mode, if it's any auth error, assume user needs to sign up
      if (process.env.NODE_ENV === 'development') {
        return {
          error: {
            message: 'Account not found or not confirmed. Please sign up first.',
            code: 'user_not_found'
          }
        }
      }

      return { error }
    }

    return { error: null }
  }

  const signOut = async () => {
    const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL &&
                                 process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
                                 process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder.supabase.co'

    if (!isSupabaseConfigured) {
      return
    }

    await supabase.auth.signOut()
  }

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
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
