// FIXED COMPONENT - All issues resolved:
// 1. Added proper imports and TypeScript types
// 2. Added proper prop types and default values
// 3. Added error handling and loading states
// 4. Optimized performance with React.memo
// 5. Improved accessibility with proper ARIA labels
// 6. Used proper semantic HTML and CSS classes

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Clock, AlertCircle } from 'lucide-react'

interface Task {
  id: string
  title: string
  description: string
  evaluation_status: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: string
}

interface TaskCardProps {
  task: Task
  onClick?: () => void
  isLoading?: boolean
}

export const TaskCard = React.memo<TaskCardProps>(({
  task,
  onClick,
  isLoading = false
}) => {
  // Error handling for missing task data
  if (!task) {
    return (
      <Card className="opacity-50">
        <CardContent className="py-8">
          <div className="text-center text-gray-500">
            Task data unavailable
          </div>
        </CardContent>
      </Card>
    )
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

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </CardHeader>
        <CardContent>
          <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`View details for task: ${task.title}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.()
        }
      }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg truncate">{task.title}</CardTitle>
          {getStatusIcon(task.evaluation_status)}
        </div>
        <CardDescription className="line-clamp-2">
          {task.description || 'No description provided'}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getStatusBadge(task.evaluation_status)}
            <span className="text-sm text-gray-500">
              {new Date(task.created_at).toLocaleDateString()}
            </span>
          </div>
          <Button variant="outline" size="sm">
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  )
})

TaskCard.displayName = 'TaskCard'
