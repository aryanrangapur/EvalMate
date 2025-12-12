'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestDbPage() {
  const [results, setResults] = useState<string[]>([])

  const addLog = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  useEffect(() => {
    testDatabaseConnection()
  }, [])

  const testDatabaseConnection = async () => {
    addLog('🔄 Starting database connection test...')

    try {
      // Test 1: Basic connection
      addLog('📡 Testing basic Supabase connection...')
      const { data: healthData, error: healthError } = await supabase
        .from('user_profiles')
        .select('count')
        .limit(1)
        .single()

      if (healthError) {
        addLog(`❌ Connection test failed: ${healthError.message}`)
        addLog(`Error code: ${healthError.code}`)
        addLog(`Error details: ${JSON.stringify(healthError.details)}`)
      } else {
        addLog('✅ Basic connection successful')
      }

      // Test 2: Authentication status
      addLog('🔐 Checking authentication status...')
      const { data: authData, error: authError } = await supabase.auth.getSession()

      if (authError) {
        addLog(`❌ Auth check failed: ${authError.message}`)
      } else {
        addLog(`✅ Auth check successful: ${authData.session ? 'Logged in' : 'Not logged in'}`)
        if (authData.session?.user) {
          addLog(`👤 User: ${authData.session.user.email}`)
        }
      }

      // Test 3: Try to list tables (this should fail due to RLS, but shows if DB is reachable)
      addLog('📋 Testing table access...')
      const { data: tableData, error: tableError } = await supabase
        .from('tasks')
        .select('*')
        .limit(1)

      if (tableError) {
        addLog(`⚠️ Table access blocked (expected due to RLS): ${tableError.message}`)
        addLog(`Error code: ${tableError.code}`)
      } else {
        addLog('✅ Table access successful (unexpected - RLS might be disabled)')
      }

    } catch (error: any) {
      addLog(`💥 Unexpected error: ${error.message}`)
    }

    addLog('🏁 Database test completed')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🧪 Database Connection Test</h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Results</h2>
          <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
            {results.map((result, index) => (
              <div key={index} className="mb-1">{result}</div>
            ))}
            {results.length === 0 && <div>Running tests...</div>}
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded">
          <h3 className="font-semibold text-blue-800 mb-2">What this test checks:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• ✅ Supabase connection is working</li>
            <li>• ✅ Environment variables are loaded</li>
            <li>• ✅ Database is reachable</li>
            <li>• ⚠️ RLS policies are blocking access (expected)</li>
            <li>• 🔐 Authentication status</li>
          </ul>
        </div>

        <div className="mt-6 text-center">
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
