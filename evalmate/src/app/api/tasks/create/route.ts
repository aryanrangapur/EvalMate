import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { user_id, title, description, code_content, language } = body

    if (!user_id || !title || !description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate payload size (sanity check)
    const totalSize = (title?.length || 0) + (description?.length || 0) + (code_content?.length || 0)
    console.log('📊 API route - Payload size:', {
      title: title?.length || 0,
      description: description?.length || 0,
      code: code_content?.length || 0,
      total: totalSize
    })

    // Supabase has a ~1MB limit for JSONB, but we'll allow up to 500KB to be safe
    if (totalSize > 500000) {
      return NextResponse.json(
        { error: 'Payload too large. Maximum size is 500KB.' },
        { status: 413 }
      )
    }

    // Basic UUID validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(user_id)) {
      return NextResponse.json(
        { error: 'Invalid user ID format' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Insert task using server-side client (handles large payloads better than client-side)
    // RLS policies will ensure user can only create tasks for themselves
    console.log('💾 Inserting task into database via API route...')
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id,
        title: title.trim(),
        description: description.trim(),
        code_content: code_content?.trim() || null,
        language: language || null,
        evaluation_status: 'pending'
      } as any)
      .select()
      .single()

    if (error) {
      console.error('❌ Database insert error:', error)
      return NextResponse.json(
        { error: 'Failed to create task', details: error.message, code: error.code },
        { status: 500 }
      )
    }

    console.log('✅ Task created successfully via API route:', (data as any).id)
    return NextResponse.json({ success: true, data }, { status: 200 })
  } catch (error: any) {
    console.error('❌ API route error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

