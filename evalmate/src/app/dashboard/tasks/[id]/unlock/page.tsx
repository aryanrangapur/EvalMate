'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Navigation } from '@/components/Navigation'
import { PaymentForm } from '@/components/PaymentForm'
import { REPORT_PRICE } from '@/lib/razorpay'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function UnlockReportPage() {
  const { id } = useParams()
  const { user, loading: authLoading } = useAuth()
  const [pageLoading, setPageLoading] = useState(true)
  const [canProceed, setCanProceed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkTaskEligibility = useCallback(async () => {
    if (!id || !user) return

    console.log('🔍 Checking task eligibility:', { taskId: id, userId: user.id })

    try {
      // Check if task exists and belongs to user
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('id, title, user_id')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (taskError || !task) {
        console.error('❌ Task not found or access denied:', { taskError, task })
        setError('Task not found or you do not have permission to access it')
        toast.error('Task not found or you do not have permission to access it')
        return
      }

      // Check if user is already premium
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('premium_user')
        .eq('user_id', user.id)
        .single()

      if ((profile as any)?.premium_user) {
        toast.info('You are already a premium user!')
        window.location.href = `/dashboard/tasks/${id}`
        return
      }

      console.log('✅ Task eligibility check passed')
      setCanProceed(true)
    } catch (error: any) {
      console.error('Error checking task:', error)
      setError('Failed to load task. Please try again.')
      toast.error('Failed to load task')
    } finally {
      setPageLoading(false)
    }
  }, [id, user])

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return

    // If no user after auth loads, redirect to login
    if (!user) {
      window.location.href = '/auth/login'
      return
    }

    // If we have user and id, check eligibility
    if (id && user) {
      checkTaskEligibility()
    }
  }, [id, user, authLoading, checkTaskEligibility])

  const handlePaymentSuccess = () => {
    // Use window.location for reliable navigation
    window.location.href = `/dashboard/tasks/${id}`
  }

  const handlePaymentCancel = () => {
    window.location.href = `/dashboard/tasks/${id}`
  }

  // Show loading while auth is initializing or page is loading
  if (authLoading || pageLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <span>Loading...</span>
          </div>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{error}</p>
            <Link
              href="/dashboard"
              className="inline-flex items-center text-blue-600 hover:text-blue-800"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Show payment form if can proceed
  if (!canProceed) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">Unable to proceed with payment.</p>
            <Link
              href={`/dashboard/tasks/${id}`}
              className="inline-flex items-center text-blue-600 hover:text-blue-800"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Task
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href={`/dashboard/tasks/${id}`} className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Task
          </Link>
        </div>

        <div className="flex justify-center">
          <PaymentForm
            taskId={id as string}
            amount={REPORT_PRICE}
            onSuccess={handlePaymentSuccess}
            onCancel={handlePaymentCancel}
          />
        </div>
      </div>
    </div>
  )
}
