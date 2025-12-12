import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🔔 Razorpay webhook received!')
  console.log('Method:', req.method)
  console.log('URL:', req.url)
  console.log('Headers:', Object.fromEntries(req.headers.entries()))

  // Handle test requests
  if (req.method === 'GET') {
    return new Response(JSON.stringify({
      status: 'Webhook endpoint is active',
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    let body
    try {
      body = await req.json()
    } catch (parseError) {
      console.error('Failed to parse webhook JSON:', parseError)
      return new Response('Invalid JSON', { status: 400 })
    }

    console.log('Webhook body received:', JSON.stringify(body, null, 2))
    const event = body.event
    console.log('Event type:', event)

    // Handle different possible event types
    if (event === 'payment.captured' || event === 'payment.captured') {
      console.log('Processing payment.captured event')

      // Razorpay webhook structure
      const paymentEntity = body.payload?.payment?.entity

      if (!paymentEntity) {
        console.error('Invalid webhook structure - no payment entity found')
        console.log('Full body:', body)
        return new Response('Invalid webhook structure', { status: 400 })
      }

      console.log('Payment captured:', paymentEntity.id)
      console.log('Payment amount:', paymentEntity.amount)
      console.log('Payment status:', paymentEntity.status)
      console.log('Payment notes:', paymentEntity.notes)

      // Extract taskId and userId from notes
      let notes = {}
      if (paymentEntity.notes && typeof paymentEntity.notes === "object") {
        notes = paymentEntity.notes
      }
      
      const taskId = notes.task_id || notes.taskId
      const userId = notes.user_id || notes.userId
      
      console.log("Parsed notes:", notes)
      console.log("taskId:", taskId, "userId:", userId)
      
      if (!taskId || !userId) {
        console.error("Missing metadata — webhook cannot unlock report")
        return new Response("Missing metadata", { status: 400 })
      }
      

      // Record the payment
      console.log('Recording payment in database...')
      const { error: paymentError } = await supabaseClient
        .from('payments')
        .insert({
          user_id: userId,
          task_id: taskId,
          stripe_payment_id: paymentEntity.id, // Using stripe_payment_id field for Razorpay ID
          amount: paymentEntity.amount,
          currency: paymentEntity.currency,
          status: 'completed',
        })

      if (paymentError) {
        console.error('Error recording payment:', paymentError)
        return new Response('Error recording payment', { status: 500 })
      }
      console.log('Payment recorded successfully')

      // Unlock the report
      console.log('Unlocking report for task:', taskId, 'user:', userId)
      const { error: unlockError } = await supabaseClient
        .from('tasks')
        .update({ report_unlocked: true })
        .eq('id', taskId)
        .eq('user_id', userId)

      if (unlockError) {
        console.error('Error unlocking report:', unlockError)
        return new Response('Error unlocking report', { status: 500 })
      }

      console.log('Report unlocked successfully for task:', taskId)
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response('Webhook error', { status: 500 })
  }
})
