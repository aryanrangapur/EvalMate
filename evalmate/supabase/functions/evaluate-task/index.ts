import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { evaluateTask } from './ai.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let requestBody: any = null
  let taskId: string | null = null

  try {
    // Parse request body once at the beginning with defensive check
    try {
      requestBody = await req.json()
    } catch (jsonError) {
      console.error('Failed to parse JSON body:', jsonError)
      return new Response(
        JSON.stringify({ error: 'Invalid or missing JSON body', details: 'Request body must be valid JSON' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Received request body:', requestBody)
    taskId = requestBody?.taskId

    if (!taskId) {
      console.error('Missing taskId in request body:', requestBody)
      return new Response(
        JSON.stringify({ error: 'Task ID is required', details: 'Request body must contain taskId field' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Processing task:', taskId)

    // Create a Supabase client with the service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch the task
    console.log('Looking for task with ID:', taskId)
    const { data: task, error: fetchError } = await supabaseClient
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single()

    console.log('Task query result:', { task: task ? 'FOUND' : 'NOT FOUND', error: fetchError })

    if (fetchError) {
      console.error('Database error when fetching task:', fetchError)
      return new Response(
        JSON.stringify({
          error: 'Database error',
          details: fetchError.message,
          code: fetchError.code
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!task) {
      console.error('Task not found in database. Available tasks:')
      // List all tasks for debugging
      const { data: allTasks } = await supabaseClient
        .from('tasks')
        .select('id, title, created_at')
        .limit(5)

      console.log('Recent tasks:', allTasks)

      return new Response(
        JSON.stringify({
          error: 'Task not found',
          details: `No task found with ID: ${taskId}`,
          availableTasks: allTasks?.map(t => ({ id: t.id, title: t.title })) || []
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Update task status to processing
    await supabaseClient
      .from('tasks')
      .update({ evaluation_status: 'processing' })
      .eq('id', taskId)

    // Perform AI evaluation
    const evaluation = await evaluateTask(
      task.title,
      task.description,
      task.code_content || undefined,
      task.language || undefined
    )

    // Update task with evaluation results
    const { error: updateError } = await supabaseClient
      .from('tasks')
      .update({
        evaluation_status: 'completed',
        ai_evaluation: evaluation,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)

    if (updateError) {
      throw updateError
    }

    return new Response(
      JSON.stringify({ success: true, evaluation }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Error evaluating task:', error)

    // Update task status to failed if we have a task ID
    if (taskId) {
      try {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )
        await supabaseClient
          .from('tasks')
          .update({ evaluation_status: 'failed' })
          .eq('id', taskId)
        console.log(`Updated task ${taskId} status to failed`)
      } catch (updateError) {
        console.error('Error updating task status to failed:', updateError)
      }
    }

    return new Response(
      JSON.stringify({ error: 'Failed to evaluate task', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
