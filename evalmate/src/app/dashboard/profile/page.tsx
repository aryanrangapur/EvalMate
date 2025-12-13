'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Navigation } from '@/components/Navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/supabase'
import { toast } from 'sonner'
import {
  User,
  Mail,
  Calendar,
  Star,
  CreditCard,
  Save,
  Loader2,
  Crown
} from 'lucide-react'

type UserProfile = Database['public']['Tables']['user_profiles']['Row']

export default function ProfilePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [fullName, setFullName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    totalPayments: 0,
  })

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
      return
    }

    if (user) {
      fetchProfile()
      fetchStats()
    }
  }, [user, loading, router])

  const fetchProfile = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single<UserProfile>()

      if (error) {
        console.error('Error fetching profile:', error)
        toast.error('Failed to load profile')
        return
      }

      setProfile(data)
      setFullName(data.full_name || '')
      setAvatarUrl(data.avatar_url || '')
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const fetchStats = async () => {
    if (!user) return

    try {
      // Fetch task stats
      const { data: tasks } = await supabase
        .from('tasks')
        .select('evaluation_status')
        .eq('user_id', user.id)

      const totalTasks = tasks?.length || 0
      const completedTasks = tasks?.filter((t: any) => t.evaluation_status === 'completed').length || 0

      // Fetch payment stats
      const { data: payments } = await supabase
        .from('payments')
        .select('amount')
        .eq('user_id', user.id)
        .eq('status', 'completed')

      const totalPayments = payments?.length || 0

      setStats({ totalTasks, completedTasks, totalPayments })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleSaveProfile = async () => {
    if (!user || !profile) return

    setIsSaving(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('user_profiles')
        .update({
          full_name: fullName || null,
          avatar_url: avatarUrl || null,
        })
        .eq('user_id', user.id)

      if (error) {
        console.error('Error updating profile:', error)
        toast.error('Failed to update profile')
        return
      }

      toast.success('Profile updated successfully')
      setIsEditing(false)
      fetchProfile()
    } catch (error) {
      console.error('Error:', error)
      toast.error('An error occurred')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setFullName(profile?.full_name || '')
    setAvatarUrl(profile?.avatar_url || '')
    setIsEditing(false)
  }

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase()
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (!user || !profile) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
          <p className="mt-2 text-gray-600">Manage your account settings and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Information Card */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar Section */}
                <div className="flex items-center space-x-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={avatarUrl || profile.avatar_url || ''} alt={user.email || ''} />
                    <AvatarFallback className="text-2xl">
                      {getInitials(user.email || 'U')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-semibold">
                      {profile.full_name || 'User'}
                    </h3>
                    <p className="text-sm text-gray-500">{user.email}</p>
                    {profile.premium_user && (
                      <Badge className="mt-2 bg-yellow-100 text-yellow-800">
                        <Crown className="h-3 w-3 mr-1" />
                        Premium Member
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Edit Form */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      disabled={!isEditing}
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={user.email || ''}
                      disabled
                      className="bg-gray-50"
                    />
                    <p className="text-xs text-gray-500">Email cannot be changed</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="avatarUrl">Avatar URL</Label>
                    <Input
                      id="avatarUrl"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      disabled={!isEditing}
                      placeholder="https://example.com/avatar.jpg"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2">
                  {!isEditing ? (
                    <Button onClick={() => setIsEditing(true)}>
                      <User className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  ) : (
                    <>
                      <Button onClick={handleSaveProfile} disabled={isSaving}>
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Save Changes
                      </Button>
                      <Button variant="outline" onClick={handleCancelEdit} disabled={isSaving}>
                        Cancel
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Account Statistics */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Account Statistics</CardTitle>
                <CardDescription>Your activity overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{stats.totalTasks}</div>
                    <div className="text-sm text-gray-500">Total Tasks</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{stats.completedTasks}</div>
                    <div className="text-sm text-gray-500">Completed</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{stats.totalPayments}</div>
                    <div className="text-sm text-gray-500">Payments</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Account Details Sidebar */}
          <div className="space-y-6">
            {/* Account Status */}
            <Card>
              <CardHeader>
                <CardTitle>Account Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Star className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">Membership</p>
                    <p className="text-sm text-gray-500">
                      {profile.premium_user ? 'Premium' : 'Free'}
                    </p>
                  </div>
                </div>

                {profile.premium_user && profile.premium_since && (
                  <div className="flex items-center space-x-3">
                    <Crown className="h-5 w-5 text-yellow-500" />
                    <div>
                      <p className="text-sm font-medium">Premium Since</p>
                      <p className="text-sm text-gray-500">
                        {formatDate(profile.premium_since)}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-3">
                  <CreditCard className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">Credits</p>
                    <p className="text-sm text-gray-500">{profile.credits_balance}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">Member Since</p>
                    <p className="text-sm text-gray-500">
                      {formatDate(profile.created_at)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Account Info */}
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Email Address</p>
                    <p className="text-sm text-gray-500 truncate">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">User ID</p>
                    <p className="text-sm text-gray-500 font-mono text-xs">
                      {user.id.substring(0, 8)}...
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Premium Upgrade Card (only show if not premium) */}
            {!profile.premium_user && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardHeader>
                  <CardTitle className="flex items-center text-yellow-900">
                    <Crown className="h-5 w-5 mr-2" />
                    Upgrade to Premium
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-yellow-800 mb-4">
                    Unlock full access to all features and detailed AI reports
                  </p>
                  <Button className="w-full bg-yellow-600 hover:bg-yellow-700 text-white">
                    Learn More
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
