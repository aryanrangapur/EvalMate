'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Brain, Code, Star, ArrowRight, CheckCircle } from 'lucide-react'

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (user) {
    return null // Will redirect to dashboard
  }

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Brain className="h-8 w-8 text-black" />
              <span className="ml-2 text-xl font-bold text-black">EvalMate</span>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" asChild>
                <Link href="/auth/login" className="text-black hover:text-gray-600">Sign In</Link>
              </Button>
              <Button asChild>
                <Link href="/auth/signup" className="bg-black text-white hover:bg-gray-800">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-100/20 to-transparent"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-left max-w-4xl">
            <h1 className="text-4xl sm:text-6xl font-bold text-black mb-6 leading-tight">
              Get AI-Powered Feedback on Your
              <span className="text-gray-600 block">Coding Tasks</span>
            </h1>
            <p className="text-xl text-gray-700 mb-8">
              Submit your coding assignments and receive detailed evaluations, scores, and actionable suggestions
              from advanced AI to improve your programming skills.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" asChild className="bg-black text-white hover:bg-gray-800">
                <Link href="/auth/signup">
                  Start Evaluating <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="border-black text-black hover:bg-black/5">
                <Link href="/auth/login">Sign In</Link>
              </Button>
            </div>
          </div>
          <div className="absolute top-1/2 right-0 transform translate-y-[-50%] translate-x-[30%] w-96 h-96 bg-gray-100/20 rounded-full blur-3xl"></div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <Card className="bg-white border-gray-200">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold text-black mb-4">
                How It Works
              </CardTitle>
              <CardDescription className="text-lg text-gray-600">
                Simple steps to get expert-level feedback on your code
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="text-center p-6 border-r lg:border-r-gray-200 last:border-r-0">
                  <div className="mx-auto w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mb-6">
                    <Code className="h-8 w-8 text-gray-700" />
                  </div>
                  <h3 className="text-xl font-semibold text-black mb-2">1. Submit Your Task</h3>
                  <p className="text-gray-600">
                    Upload your coding assignment with a clear description of requirements and objectives.
                  </p>
                </div>

                <div className="text-center p-6 border-r lg:border-r-gray-200 last:border-r-0">
                  <div className="mx-auto w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mb-6">
                    <Brain className="h-8 w-8 text-gray-700" />
                  </div>
                  <h3 className="text-xl font-semibold text-black mb-2">2. AI Evaluation</h3>
                  <p className="text-gray-600">
                    Our advanced AI analyzes your code quality, problem-solving approach, and adherence to best practices.
                  </p>
                </div>

                <div className="text-center p-6">
                  <div className="mx-auto w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mb-6">
                    <Star className="h-8 w-8 text-gray-700" />
                  </div>
                  <h3 className="text-xl font-semibold text-black mb-2">3. Get Detailed Feedback</h3>
                  <p className="text-gray-600">
                    Receive comprehensive reports with scores, strengths, improvements, and actionable suggestions.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <div className="border-t border-gray-200 my-16"></div>

      {/* Benefits Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-white border-gray-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-3xl font-bold text-black">
                Why Choose EvalMate?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start space-x-4 p-4 rounded-lg hover:bg-gray-50 transition-colors">
                <CheckCircle className="h-6 w-6 text-black mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-black mb-2">Instant AI Feedback</h3>
                  <p className="text-gray-600">Get immediate, detailed evaluations without waiting for human reviewers.</p>
                </div>
              </div>

              <div className="flex items-start space-x-4 p-4 rounded-lg hover:bg-gray-50 transition-colors">
                <CheckCircle className="h-6 w-6 text-black mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-black mb-2">Comprehensive Analysis</h3>
                  <p className="text-gray-600">Detailed breakdown of strengths, weaknesses, and specific improvement suggestions.</p>
                </div>
              </div>

              <div className="flex items-start space-x-4 p-4 rounded-lg hover:bg-gray-50 transition-colors">
                <CheckCircle className="h-6 w-6 text-black mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-black mb-2">Multiple Languages</h3>
                  <p className="text-gray-600">Support for JavaScript, Python, Java, C++, and many other programming languages.</p>
                </div>
              </div>

              <div className="flex items-start space-x-4 p-4 rounded-lg hover:bg-gray-50 transition-colors">
                <CheckCircle className="h-6 w-6 text-black mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-black mb-2">Secure & Private</h3>
                  <p className="text-gray-600">Your code and evaluations are kept secure and private in our encrypted database.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <div className="border-t border-gray-200 my-16"></div>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-900 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Improve Your Coding Skills?
          </h2>
          <p className="text-xl text-gray-200 mb-8">
            Join thousands of developers who use EvalMate to get better at coding.
          </p>
          <Button size="lg" asChild className="bg-black text-white hover:bg-white hover:text-black border border-black hover:border-white">
            <Link href="/auth/signup">
              Get Started for Free <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 px-4 sm:px-6 lg:px-8 border-t border-gray-700">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center mb-4">
            <Brain className="h-6 w-6 mr-2" />
            <span className="text-lg font-semibold">EvalMate</span>
          </div>
          <p className="text-gray-400">
            © 2025 EvalMate. Empowering developers with AI-driven code evaluation.
          </p>
        </div>
      </footer>
    </div>
  )
}