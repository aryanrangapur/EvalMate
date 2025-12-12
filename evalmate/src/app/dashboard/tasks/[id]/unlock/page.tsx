'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [canProceed, setCanProceed] = useState(false)

  useEffect(() => {
    if (id && user) {
      checkTaskEligibility()
    }
  }, [id, user])

  const checkTaskEligibility = async () => {
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

      console.log('📋 Task check result:', {
        taskFound: !!task,
        taskError,
        taskData: task ? { id: (task as any).id, title: (task as any).title, user_id: (task as any).user_id } : null
      })

      if (taskError || !task) {
        console.error('❌ Task not found or access denied:', { taskError, task })
        toast.error('Task not found or you do not have permission to access it')
        router.push('/dashboard')
        return
      }

      // Check if user is already premium
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('premium_user')
        .eq('user_id', user.id)
        .single()

      console.log('👤 Premium check result:', {
        profileFound: !!profile,
        profileError,
        isPremium: (profile as any)?.premium_user
      })

      if (profileError) {
        console.error('Error checking premium status:', profileError)
        // Continue anyway - let payment process handle it
      }

      if ((profile as any)?.premium_user) {
        toast.info('You are already a premium user!')
        router.push(`/dashboard/tasks/${id}`)
        return
      }

      console.log('✅ Task eligibility check passed')
      setCanProceed(true)
    } catch (error: any) {
      console.error('Error checking task:', error)
      toast.error('Failed to load task')
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentSuccess = async () => {
    // Payment verification and report unlocking is now handled directly in PaymentForm
    // Just redirect to show the unlocked report
    router.push(`/dashboard/tasks/${id}`)
  }

  const handlePaymentCancel = () => {
    router.push(`/dashboard/tasks/${id}`)
  }

  if (loading) {
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

  if (!canProceed) {
    return null
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
