'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Navigation } from '@/components/Navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { ArrowLeft, Upload, Code } from 'lucide-react'
import Link from 'next/link'

const PROGRAMMING_LANGUAGES = [
  'javascript',
  'typescript',
  'python',
  'java',
  'cpp',
  'c',
  'csharp',
  'php',
  'ruby',
  'go',
  'rust',
  'swift',
  'kotlin',
  'scala',
  'html',
  'css',
  'sql',
  'bash',
  'other'
]

export default function NewTaskPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    codeContent: '',
    language: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      console.error('❌ No user found for task submission')
      toast.error('You must be logged in to submit a task')
      return
    }

    console.log('👤 User authenticated:', user.id, user.email)

    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error('Please fill in all required fields')
      return
    }

    setLoading(true)

    try {
      console.log('📝 Submitting task for user:', user.id)
      console.log('👤 User object:', user)
      console.log('🔐 User authenticated?', !!user)

      // Check if user profile exists first
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, premium_user')
        .eq('user_id', user.id)
        .single()

      console.log('👤 User profile check:', { profile, profileError })

      if (profileError) {
        console.error('❌ User profile error:', profileError)
        toast.error('User profile not found. Please try logging out and back in.')
        return
      }

      console.log('📋 Task data:', {
        title: formData.title.trim(),
        description: formData.description.trim().substring(0, 50) + '...',
        hasCode: !!formData.codeContent.trim(),
        language: formData.language
      })

      // Check if user has a valid session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      console.log('🔑 Session check:', { hasSession: !!sessionData.session, sessionError })

      if (!sessionData.session) {
        console.error('❌ No active session')
        toast.error('Session expired. Please log in again.')
        return
      }

      // Create the task with a timeout
      console.log('💾 Inserting task into database...')
      console.log('📊 Insert data:', {
        user_id: user.id,
        title: formData.title.trim(),
        description_length: formData.description.trim().length,
        code_length: formData.codeContent.trim().length,
        language: formData.language
      })

      const { data, error } = await Promise.race([
        supabase
          .from('tasks')
          .insert({
            user_id: user.id,
            title: formData.title.trim(),
            description: formData.description.trim(),
            code_content: formData.codeContent.trim(),
            language: formData.language || null,
            evaluation_status: 'pending'
          } as any)
          .select()
          .single(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Database operation timed out after 15 seconds')), 15000)
        )
      ]) as any

      console.log('📥 Database response received:', { hasData: !!data, hasError: !!error })

      if (error) {
        console.error('❌ Database insert failed:', error)
        throw error
      }

      if (!data) {
        console.error('❌ No data returned from insert')
        throw new Error('No data returned from database insert')
      }

      console.log('✅ Task created successfully:', { id: (data as any).id, title: (data as any).title })
      console.log('✅ Task submitted successfully:', data)

      toast.success('Task submitted successfully! AI evaluation will begin shortly.')
      router.push(`/dashboard/tasks/${(data as any).id}`)
    } catch (error: any) {
      console.error('❌ Error submitting task:', error)
      console.error('Error type:', typeof error)
      console.error('Error keys:', Object.keys(error || {}))

      const errorMessage = error?.message || 'Failed to submit task'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/dashboard" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Upload className="h-5 w-5 mr-2" />
              Submit New Task
            </CardTitle>
            <CardDescription>
              Upload your coding task for AI-powered evaluation and feedback
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Task Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Implement a React Todo App"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Task Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what the task involves, what you're trying to achieve, and any specific requirements..."
                  rows={4}
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">Programming Language</Label>
                <Select value={formData.language} onValueChange={(value) => handleInputChange('language', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a programming language (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROGRAMMING_LANGUAGES.map((lang) => (
                      <SelectItem key={lang} value={lang}>
                        {lang.charAt(0).toUpperCase() + lang.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="codeContent">Code Content</Label>
                <Textarea
                  id="codeContent"
                  placeholder="Paste your code here for evaluation (optional)"
                  rows={12}
                  value={formData.codeContent}
                  onChange={(e) => handleInputChange('codeContent', e.target.value)}
                  className="font-mono text-sm"
                />
                <p className="text-sm text-gray-500">
                  <Code className="h-4 w-4 inline mr-1" />
                  Include your code to get more detailed feedback
                </p>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">What happens next?</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Our AI will analyze your task and code</li>
                  <li>• You'll receive a score and detailed feedback</li>
                  <li>• Unlock the full report with payment for comprehensive insights</li>
                </ul>
              </div>

              <div className="flex justify-end space-x-4">
                <Button type="button" variant="outline" asChild>
                  <Link href="/dashboard">Cancel</Link>
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Submitting...' : 'Submit Task'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
