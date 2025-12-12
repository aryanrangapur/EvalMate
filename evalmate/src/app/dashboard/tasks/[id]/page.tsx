'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Navigation } from '@/components/Navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/supabase'
import { toast } from 'sonner'
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  AlertCircle,
  Star,
  ThumbsUp,
  Target,
  Lightbulb,
  Lock,
  CreditCard
} from 'lucide-react'
import Link from 'next/link'

type Task = Database['public']['Tables']['tasks']['Row']

interface AIEvaluation {
  score: number
  strengths: string[]
  improvements: string[]
  feedback: string
  suggestions: string[]
}

export default function TaskDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const router = useRouter()
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [evaluating, setEvaluating] = useState(false)
  const [isPremium, setIsPremium] = useState(false)

  useEffect(() => {
    if (id && user) {
      fetchTask()
    }
  }, [id, user])

  const checkPremiumStatus = async () => {
    if (!user) return false

    try {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('premium_user')
        .eq('user_id', user.id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // Profile doesn't exist, try to create it
          console.log('User profile not found, creating...')
          const { error: insertError } = await supabase
            .from('user_profiles')
            .insert({
              user_id: user.id,
              full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
              avatar_url: user.user_metadata?.avatar_url || null,
              premium_user: false
            } as any)

          if (insertError) {
            console.error('Failed to create user profile:', insertError)
          } else {
            console.log('User profile created successfully')
          }
          return false // New profile is not premium
        } else {
          console.error('Error checking premium status:', error)
          return false
        }
      }

      return (profile as any)?.premium_user || false
    } catch (error) {
      console.error('Error fetching premium status:', error)
      return false
    }
  }

  const fetchTask = async () => {
    if (!id || !user) return

    try {
      // Check premium status first
      const premiumStatus = await checkPremiumStatus()
      setIsPremium(premiumStatus)

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          toast.error('Task not found')
          router.push('/dashboard')
          return
        }
        throw error
      }

      setTask(data)
    } catch (error: any) {
      console.error('Error fetching task:', error)
      toast.error('Failed to load task')
    } finally {
      setLoading(false)
    }
  }

  const checkPaymentStatus = async (taskId: string) => {
    try {
      if (!user?.id) return false

      const { data: payment, error } = await supabase
        .from('payments')
        .select('*')
        .eq('task_id', taskId)
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .single()

      if (payment && !error) {
        console.log('💰 Payment found, unlocking report...')
        // Update the task to show unlocked status
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: updateError } = await (supabase as any)
          .from('tasks')
          .update({
            report_unlocked: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', taskId)
          .eq('user_id', user.id)

        if (!updateError) {
          // Refresh the task data
          await fetchTask()
          toast.success('Report unlocked! Payment verified.')
        }
      }
    } catch (error) {
      // Silent fail - payment status check is optional
      console.log('Payment status check completed (no payment found or error)')
    }
  }

  const startEvaluation = async () => {
    if (!task) {
      console.error('No task available for evaluation')
      return
    }

    console.log('Starting AI evaluation for task:', task.id)
    setEvaluating(true)

    try {
      // Prepare the request body
      const requestBody = { taskId: task.id }
      console.log('Sending request body:', requestBody)

      // Call the Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('evaluate-task', {
        body: requestBody
      })

      console.log('Edge function response:', { data, error })

      if (error) {
        console.error('Edge function returned error:', error)
        throw error
      }

      console.log('AI evaluation completed successfully:', data)
      toast.success('AI evaluation completed!')
      // Refresh the task data
      await fetchTask()
    } catch (error: any) {
      console.error('Error starting evaluation:', error)
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        details: error.details
      })
      toast.error(`Failed to start AI evaluation: ${error.message || 'Unknown error'}`)
    } finally {
      setEvaluating(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'processing':
        return <Clock className="h-5 w-5 text-blue-500" />
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-500" />
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

  const renderStars = (score: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-5 w-5 ${i < Math.floor(score / 2) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">Loading task...</div>
        </div>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">Task not found</div>
        </div>
      </div>
    )
  }

  const evaluation = task.ai_evaluation as AIEvaluation | null

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

        <div className="space-y-6">
          {/* Task Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(task.evaluation_status)}
                  <div>
                    <CardTitle className="text-xl">{task.title}</CardTitle>
                    <CardDescription>
                      Submitted on {new Date(task.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                </div>
                {getStatusBadge(task.evaluation_status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Description</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{task.description}</p>
                </div>

                {task.language && (
                  <div>
                    <h3 className="font-medium mb-2">Programming Language</h3>
                    <Badge variant="outline">{task.language}</Badge>
                  </div>
                )}

                {task.code_content && (
                  <div>
                    <h3 className="font-medium mb-2">Code Submitted</h3>
                    <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                      <code>{task.code_content}</code>
                    </pre>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Evaluation Section */}
          {task.evaluation_status === 'pending' && (
            <Card>
              <CardHeader>
                <CardTitle>AI Evaluation</CardTitle>
                <CardDescription>
                  Get detailed feedback on your task submission
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={startEvaluation} disabled={evaluating}>
                  {evaluating ? 'Evaluating...' : 'Start AI Evaluation'}
                </Button>
              </CardContent>
            </Card>
          )}

          {task.evaluation_status === 'processing' && (
            <Card>
              <CardContent className="py-8">
                <div className="text-center">
                  <Clock className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">AI Evaluation in Progress</h3>
                  <p className="text-gray-600">
                    Our AI is analyzing your task. This usually takes 1-2 minutes.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {task.evaluation_status === 'completed' && evaluation && (
            <div className="space-y-6">
              {/* Premium Badge */}
              {/* Score Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Star className="h-5 w-5 mr-2" />
                    Evaluation Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      {renderStars(evaluation.score)}
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-1">
                      {evaluation.score}/10
                    </div>
                    <p className="text-gray-600">
                      {evaluation.score >= 8 ? 'Excellent work!' :
                       evaluation.score >= 6 ? 'Good job!' :
                       evaluation.score >= 4 ? 'Decent effort' :
                       'Needs improvement'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Feedback */}
              <Card>
                <CardHeader>
                  <CardTitle>Overall Feedback</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 leading-relaxed">
                    {typeof evaluation.feedback === 'string'
                      ? evaluation.feedback
                      : JSON.stringify(evaluation.feedback, null, 2)}
                  </p>
                  {isPremium && (
                    <div className="mt-4 text-sm text-gray-600 italic">
                      This evaluation includes industry best practices, code maintainability, performance implications, and scalability analysis.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Strengths */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-green-700">
                    <ThumbsUp className="h-5 w-5 mr-2" />
                    Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {evaluation.strengths.map((strength, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>
                          {typeof strength === 'string'
                            ? strength
                            : JSON.stringify(strength, null, 2)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Areas for Improvement */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-orange-700">
                    <Target className="h-5 w-5 mr-2" />
                    Areas for Improvement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {evaluation.improvements.map((improvement, index) => (
                      <li key={index} className="flex items-start">
                        <AlertCircle className="h-4 w-4 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>
                          {typeof improvement === 'string'
                            ? improvement
                            : JSON.stringify(improvement, null, 2)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Suggestions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-blue-700">
                    <Lightbulb className="h-5 w-5 mr-2" />
                    Actionable Suggestions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-4">
                    {evaluation.suggestions.map((suggestion, index) => {
                      // Handle both string and object formats
                      let title = '';
                      let description = '';

                      if (typeof suggestion === 'string') {
                        title = suggestion;
                      } else if (typeof suggestion === 'object' && suggestion !== null) {
                        // Handle object format { id, solution, description }
                        const suggObj = suggestion as any;
                        title = suggObj.solution || suggObj.title || `Suggestion ${index + 1}`;
                        description = suggObj.description || '';
                      } else {
                        title = `Suggestion ${index + 1}`;
                      }

                      return (
                        <li key={index} className="border-b border-gray-100 pb-3 last:border-b-0">
                          <div className="flex items-start">
                            <div className="h-6 w-6 bg-blue-500 rounded-full mr-3 mt-0.5 flex-shrink-0 flex items-center justify-center">
                              <span className="text-white text-xs font-bold">{index + 1}</span>
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 mb-1">{title}</div>
                              {description && (
                                <div className="text-sm text-gray-600">{description}</div>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>

              {/* Premium Advanced Analysis - AI Generated */}
              {isPremium && task.ai_evaluation && (task.ai_evaluation as any).premiumInsights && (
                <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
                  <CardHeader>
                    <CardTitle className="flex items-center text-purple-800">
                      <Target className="h-5 w-5 mr-2" />
                      Premium Advanced Analysis
                    </CardTitle>
                    <CardDescription className="text-purple-700">
                      Deep-dive technical analysis with industry benchmarks and expert recommendations
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {(() => {
                      const insights = (task.ai_evaluation as any).premiumInsights;
                      const codeQuality = insights.codeQuality || 0;
                      const industryAvg = insights.industryAverage || 72;
                      const topPerformers = insights.topPerformers || 95;

                      return (
                        <>
                          {/* Code Quality Metrics */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white p-4 rounded-lg border border-purple-200">
                              <h4 className="font-semibold text-purple-900 mb-2">Architecture</h4>
                              <p className="text-sm text-purple-700 whitespace-pre-wrap">
                                {insights.architecture || 'Analysis not available'}
                              </p>
                            </div>
                            <div className="bg-white p-4 rounded-lg border border-purple-200">
                              <h4 className="font-semibold text-purple-900 mb-2">Performance</h4>
                              <p className="text-sm text-purple-700 whitespace-pre-wrap">
                                {insights.performance || 'Analysis not available'}
                              </p>
                            </div>
                            <div className="bg-white p-4 rounded-lg border border-purple-200">
                              <h4 className="font-semibold text-purple-900 mb-2">Security</h4>
                              <p className="text-sm text-purple-700 whitespace-pre-wrap">
                                {insights.security || 'Analysis not available'}
                              </p>
                            </div>
                          </div>

                          {/* Industry Benchmarks */}
                          <div className="bg-white p-6 rounded-lg border border-purple-200">
                            <h4 className="font-semibold text-purple-900 mb-4 flex items-center">
                              Industry Benchmarks Comparison
                            </h4>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-sm">Your Code Quality</span>
                                <div className="flex items-center">
                                  <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                                    <div 
                                      className="bg-green-500 h-2 rounded-full" 
                                      style={{width: `${codeQuality}%`}}
                                    ></div>
                                  </div>
                                  <span className="text-sm font-medium">{codeQuality}%</span>
                                </div>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm">Industry Average</span>
                                <div className="flex items-center">
                                  <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                                    <div 
                                      className="bg-yellow-400 h-2 rounded-full" 
                                      style={{width: `${industryAvg}%`}}
                                    ></div>
                                  </div>
                                  <span className="text-sm font-medium">{industryAvg}%</span>
                                </div>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm">Top Performers</span>
                                <div className="flex items-center">
                                  <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                                    <div 
                                      className="bg-purple-500 h-2 rounded-full" 
                                      style={{width: `${topPerformers}%`}}
                                    ></div>
                                  </div>
                                  <span className="text-sm font-medium">{topPerformers}%</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Expert Recommendations */}
                          {insights.expertRecommendations && (
                            <div className="bg-white p-6 rounded-lg border border-purple-200">
                              <h4 className="font-semibold text-purple-900 mb-4 flex items-center">
                                Expert Recommendations
                              </h4>
                              <div className="space-y-4">
                                {insights.expertRecommendations.immediate && insights.expertRecommendations.immediate.length > 0 && (
                                  <div className="border-l-4 border-green-400 pl-4">
                                    <h5 className="font-medium text-green-900">Immediate Improvements</h5>
                                    <ul className="text-sm text-green-800 mt-1 space-y-1">
                                      {insights.expertRecommendations.immediate.map((rec: string, idx: number) => (
                                        <li key={idx}>• {rec}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {insights.expertRecommendations.future && insights.expertRecommendations.future.length > 0 && (
                                  <div className="border-l-4 border-blue-400 pl-4">
                                    <h5 className="font-medium text-blue-900">Future Enhancements</h5>
                                    <ul className="text-sm text-blue-800 mt-1 space-y-1">
                                      {insights.expertRecommendations.future.map((rec: string, idx: number) => (
                                        <li key={idx}>• {rec}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Learning Path */}
                          {insights.learningPath && (
                            <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-6 rounded-lg border border-purple-300">
                              <h4 className="font-semibold text-purple-900 mb-4 flex items-center">
                                Personalized Learning Path
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {insights.learningPath.nextSkills && insights.learningPath.nextSkills.length > 0 && (
                                  <div>
                                    <h5 className="font-medium text-purple-800 mb-2">Next Skills to Learn</h5>
                                    <ul className="text-sm text-purple-700 space-y-1">
                                      {insights.learningPath.nextSkills.map((skill: string, idx: number) => (
                                        <li key={idx}>○ {skill}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {insights.learningPath.resources && insights.learningPath.resources.length > 0 && (
                                  <div>
                                    <h5 className="font-medium text-purple-800 mb-2">Recommended Resources</h5>
                                    <ul className="text-sm text-purple-700 space-y-1">
                                      {insights.learningPath.resources.map((resource: string, idx: number) => (
                                        <li key={idx}>• {resource}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Corrected Code */}
                          {insights.correctedCode && (
                            <div className="bg-white p-6 rounded-lg border border-purple-200">
                              <h4 className="font-semibold text-purple-900 mb-4 flex items-center">
                                Corrected Code (Production-Ready)
                              </h4>
                              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                                <pre className="text-sm whitespace-pre-wrap font-mono">
                                  <code>{insights.correctedCode}</code>
                                </pre>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}

              {/* Payment Section */}
              {!isPremium && (
                <Card className="border-yellow-200 bg-yellow-50">
                  <CardHeader>
                    <CardTitle className="flex items-center text-yellow-800">
                      <Lock className="h-5 w-5 mr-2" />
                      Upgrade to Premium
                    </CardTitle>
                    <CardDescription className="text-yellow-700">
                      Get unlimited AI evaluations, detailed code reviews, personalized learning recommendations, and premium features for all your tasks
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold text-yellow-900">₹999</p>
                        <p className="text-sm text-yellow-700">One-time account upgrade</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={async () => {
                            try {
                              await fetchTask()
                              toast.info('Checked payment status')
                            } catch (error) {
                              toast.error('Failed to check status')
                            }
                          }}
                        >
                          Check Status
                        </Button>
                        <Button asChild className="bg-yellow-600 hover:bg-yellow-700">
                          <Link href={`/dashboard/tasks/${id}/unlock`}>
                            <CreditCard className="h-4 w-4 mr-2" />
                            Upgrade to Premium
                          </Link>
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-yellow-700">
                      Already paid? Click "Check Status" to refresh your report access.
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {task.evaluation_status === 'failed' && (
            <Card>
              <CardContent className="py-8">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Evaluation Failed</h3>
                  <p className="text-gray-600 mb-4">
                    Something went wrong during the AI evaluation. Please try again.
                  </p>
                  <Button onClick={startEvaluation}>
                    Retry Evaluation
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
