'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Navigation } from '@/components/Navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/supabase'
import { Plus, FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react'

type Task = Database['public']['Tables']['tasks']['Row']

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    failed: 0,
  })

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/auth/login'
      return
    }

    if (user) {
      fetchTasks()
    }
  }, [user, loading])

  const fetchTasks = async () => {
    if (!user) {
      console.warn('No user found, skipping fetchTasks')
      return
    }

    console.log('🔍 Fetching tasks for user:', user.id)

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) {
        console.error('❌ Supabase error fetching tasks:', error)
        console.error('Error MESSAGE:', error.message)
        console.error('Error CODE:', error.code)
        console.error('Error DETAILS:', error.details)
        console.error('Error HINT:', error.hint)
        console.error('Full error object:', JSON.stringify(error, null, 2))
        return
      }

      console.log('✅ Successfully fetched tasks:', data?.length || 0, 'tasks')
      setTasks(data || [])
    } catch (networkError) {
      console.error('❌ Network error fetching tasks:', networkError)
    }

    // Calculate stats
    const { data: allTasks, error: statsError } = await supabase
      .from('tasks')
      .select('evaluation_status')
      .eq('user_id', user.id)

    if (!statsError && allTasks) {
      const stats = allTasks.reduce(
        (acc, task) => {
          acc.total++
          switch ((task as any).evaluation_status) {
            case 'completed':
              acc.completed++
              break
            case 'pending':
              acc.pending++
              break
            case 'failed':
              acc.failed++
              break
          }
          return acc
        },
        { total: 0, completed: 0, pending: 0, failed: 0 }
      )
      setStats(stats)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-500" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>
      case 'processing':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Processing</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="secondary">Pending</Badge>
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">Welcome back! Here's an overview of your tasks.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Submit a new task for AI evaluation</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/dashboard/tasks/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Submit New Task
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Tasks */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Tasks</CardTitle>
            <CardDescription>Your latest task submissions</CardDescription>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No tasks yet. Submit your first task to get started!</p>
                <Button asChild className="mt-4">
                  <Link href="/dashboard/tasks/new">Submit Task</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {tasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(task.evaluation_status)}
                      <div>
                        <h3 className="font-medium">{task.title}</h3>
                        <p className="text-sm text-gray-500">
                          {new Date(task.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(task.evaluation_status)}
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/tasks/${task.id}`}>View</Link>
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="pt-4">
                  <Button variant="outline" asChild>
                    <Link href="/dashboard/tasks">View All Tasks</Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
