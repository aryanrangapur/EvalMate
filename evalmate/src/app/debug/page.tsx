'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export default function DebugPage() {
  const [envVars, setEnvVars] = useState<Record<string, string>>({})
  const [debugOutput, setDebugOutput] = useState<string>('')
  const { user } = useAuth()

  useEffect(() => {
    // Only check client-accessible environment variables (NEXT_PUBLIC_*)
    // Server-only variables cannot be checked from the browser
    setEnvVars({
      'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET (hidden)' : 'NOT SET',
      'NEXT_PUBLIC_RAZORPAY_KEY_ID': process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'NOT SET',
      'NEXTAUTH_URL': process.env.NEXTAUTH_URL || 'NOT SET',
      // Server-only variables (cannot be checked from browser)
      'SUPABASE_SERVICE_ROLE_KEY': '⚠️ Server-only (check server logs)',
      'GROQ_API_KEY': '⚠️ Server-only (check server logs)',
      'RAZORPAY_KEY_SECRET': '⚠️ Server-only (check server logs)',
      'NEXTAUTH_SECRET': '⚠️ Server-only (check server logs)',
    })
  }, [])

  // Server-side rendering shows loading
  if (Object.keys(envVars).length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">🔧 Environment Variables Debug</h1>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-center text-gray-600">Loading environment variables...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🔧 Environment Variables Debug</h1>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Current Environment Variables</h2>

          <div className="space-y-3">
            {Object.entries(envVars).map(([key, value]) => (
              <div key={key} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <code className="font-mono text-sm">{key}</code>
                <span className={`px-2 py-1 rounded text-sm ${
                  value === 'NOT SET' ? 'bg-red-100 text-red-800' :
                  value.includes('SET') ? 'bg-green-100 text-green-800' :
                  value.includes('Server-only') ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Database Tasks Check</h2>
          <div className="mb-4">
            <button
              onClick={async () => {
                if (!user) {
                  setDebugOutput('Please log in first to check tasks.')
                  return
                }
                setDebugOutput('Fetching tasks...')
                try {
                  const { data, error } = await supabase
                    .from('tasks')
                    .select('id, title, evaluation_status, created_at')
                    .eq('user_id', user.id)
                    .limit(10)
                  if (error) {
                    setDebugOutput(`Error fetching tasks: ${JSON.stringify(error, null, 2)}`)
                  } else {
                    setDebugOutput(`Found ${data?.length || 0} tasks:\n${JSON.stringify(data, null, 2)}`)
                  }
                } catch (err: any) {
                  setDebugOutput('Network error: ' + err.message)
                }
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mr-2"
            >
              Check Tasks in Database
            </button>

            <button
              onClick={async () => {
                setDebugOutput('Testing database tables...')
                try {
                  const results = []

                  // Check user_profiles table
                  const { error: profileError } = await supabase
                    .from('user_profiles')
                    .select('count')
                    .limit(1)
                  results.push(`user_profiles: ${profileError ? 'ERROR - ' + profileError.message : 'OK'}`)

                  // Check tasks table
                  const { error: taskError } = await supabase
                    .from('tasks')
                    .select('count')
                    .limit(1)
                  results.push(`tasks: ${taskError ? 'ERROR - ' + taskError.message : 'OK'}`)

                  // Check payments table
                  const { error: paymentError } = await supabase
                    .from('payments')
                    .select('count')
                    .limit(1)
                  results.push(`payments: ${paymentError ? 'ERROR - ' + paymentError.message : 'OK'}`)

                  // Check auth.users (should always exist)
                  const { count: userCount, error: authError } = await supabase
                    .from('auth.users')
                    .select('*', { count: 'exact', head: true })
                  results.push(`auth.users: ${authError ? 'ERROR - ' + authError.message : 'OK (count: ' + (userCount || 0) + ')'}`)

                  setDebugOutput('Database Check Results:\n' + results.join('\n'))
                } catch (err: any) {
                  setDebugOutput('Database test error: ' + err.message)
                }
              }}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 mr-2"
            >
              Test Database Tables
            </button>

            <button
              onClick={async () => {
                setDebugOutput('Running manual profile creation...')
                try {
                  // Get current user
                  const { data: { user }, error: userError } = await supabase.auth.getUser()

                  if (userError || !user) {
                    setDebugOutput('ERROR: No authenticated user found. Please sign in first.')
                    return
                  }

                  // Check if profile exists
                  const { data: existingProfile, error: checkError } = await supabase
                    .from('user_profiles')
                    .select('id')
                    .eq('user_id', user.id)
                    .single()

                  if (existingProfile) {
                    setDebugOutput('Profile already exists for user: ' + user.id)
                    return
                  }

                  // Create profile manually
                  const { error: insertError } = await supabase
                    .from('user_profiles')
                    .insert({
                      user_id: user.id,
                      full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'Test User',
                      avatar_url: user.user_metadata?.avatar_url || null,
                      premium_user: false
                    } as any)

                  if (insertError) {
                    setDebugOutput('ERROR creating profile: ' + JSON.stringify(insertError, null, 2))
                  } else {
                    setDebugOutput('SUCCESS: Profile created for user ' + user.id)
                  }
                } catch (err: any) {
                  setDebugOutput('Manual creation error: ' + err.message)
                }
              }}
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
            >
              Create Profile Manually
            </button>
          </div>

          {debugOutput && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Debug Output</h3>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto whitespace-pre-wrap">
                {debugOutput}
              </pre>
            </div>
          )}

          <h2 className="text-xl font-semibold mb-4 mt-8">Next Steps</h2>
          <ul className="space-y-2 text-gray-700">
            <li>✅ <strong>Client variables (NEXT_PUBLIC_*):</strong> Check if they're "SET" in the table above</li>
            <li>⚠️ <strong>Server variables:</strong> Check server console/logs for "🔧 Supabase Environment Check:" messages</li>
            <li>🔧 If any variables are missing, add them to your .env.local file</li>
            <li>🔄 Restart the development server after adding variables</li>
            <li>🔍 Check browser console for Supabase connection success messages</li>
            <li>✅ Verify your Supabase project URL and keys are correct</li>
            <li>📋 <strong>Check tasks:</strong> Use the button above to see what tasks exist in your database</li>
          </ul>

          <div className="mt-4 p-3 bg-blue-50 rounded">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Variables marked "Server-only" can only be verified by checking the server console/logs
              where Next.js starts. They cannot be accessed from the browser for security reasons.
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <a
            href="/"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            Back to Home
          </a>
        </div>
      </div>
    </div>
  )
}
