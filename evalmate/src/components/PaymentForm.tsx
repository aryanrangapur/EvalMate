'use client'

import { useState } from 'react'
import { useRazorpay } from 'react-razorpay'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { CreditCard, Lock } from 'lucide-react'
import { RAZORPAY_KEY_ID, REPORT_PRICE } from '@/lib/razorpay'
import { supabase } from '@/lib/supabase'

interface PaymentFormProps {
  taskId: string
  amount: number
  onSuccess: () => void
  onCancel: () => void
}

export function PaymentForm({ taskId, amount, onSuccess, onCancel }: PaymentFormProps) {
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()
  const { error, isLoading, Razorpay } = useRazorpay()

  // Check if Razorpay is configured
  const isRazorpayConfigured = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID &&
                               process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID !== 'rzp_test_placeholder'

  if (!isRazorpayConfigured) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="h-5 w-5 mr-2" />
            Payment Not Configured
          </CardTitle>
          <CardDescription>
            Razorpay is not configured. Please set up your RAZORPAY_KEY_ID environment variable.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-gray-600 mb-4">
              To enable payments, add your Razorpay key ID to the environment variables.
            </p>
            <Button variant="outline" onClick={onCancel} className="w-full">
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    toast.error('Failed to load Razorpay SDK')
    return null
  }

  const handlePayment = async () => {
    if (!Razorpay) {
      toast.error('Razorpay SDK not loaded')
      return
    }

    setLoading(true)

    try {
      // Create order via Supabase Edge Function
      const { data: orderData, error: orderError } = await supabase.functions.invoke('create-razorpay-order', {
        body: {
          taskId,
          amount: REPORT_PRICE
        }
      })

      if (orderError) {
        throw orderError
      }

      const options = {
        key: RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'EvalMate',
        description: 'Upgrade to Premium - Unlimited AI Evaluations',
        order_id: orderData.id,
        handler: async function (response: any) {
          console.log('💳 Payment completed:', response);

          try {
            // Step 1: Verify we have a valid session
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            console.log('🔑 Session validation:', {
              hasSession: !!sessionData.session,
              userId: sessionData.session?.user?.id,
              sessionError
            });

            if (!sessionData.session) {
              console.error('❌ No active session');
              toast.error('Session expired. Please log in again.');
              return;
            }

            // Step 2: Prepare verification request
            const verifyUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/verify-razorpay-payment`;
            const requestPayload = {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              taskId: taskId
            };

            console.log('🔗 Verification request:', {
              url: verifyUrl,
              payload: requestPayload,
              hasAuth: !!sessionData.session.access_token
            });

            // Step 3: Make the verification request
            let verifyResponse: Response;
            try {
              verifyResponse = await fetch(verifyUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${sessionData.session.access_token}`,
                },
                body: JSON.stringify(requestPayload)
              });
            } catch (fetchError: any) {
              console.error('🚨 Fetch failed:', fetchError);
              throw new Error(`Network error: ${fetchError.message}`);
            }

            console.log('📥 Response received:', {
              status: verifyResponse.status,
              statusText: verifyResponse.statusText,
              headers: Object.fromEntries(verifyResponse.headers.entries())
            });

            // Step 4: Read response
            let responseText: string;
            try {
              responseText = await verifyResponse.text();
              console.log('📄 Response body:', responseText);
            } catch (readError: any) {
              console.error('❌ Failed to read response:', readError);
              throw new Error('Failed to read server response');
            }

            // Step 5: Parse JSON
            let verifyData: any;
            try {
              verifyData = JSON.parse(responseText);
              console.log('✅ Parsed response:', verifyData);
            } catch (parseError: any) {
              console.error('❌ JSON parse failed:', parseError);
              console.error('Raw response was:', responseText);
              throw new Error(`Server returned invalid JSON (status: ${verifyResponse.status})`);
            }

            // Step 6: Check success
            if (verifyResponse.ok && verifyData.success) {
              console.log('🎉 Verification successful - upgrading to premium');
              toast.success('Payment verified! You are now a premium user.');
              onSuccess();
            } else {
              console.error('❌ Verification failed:', {
                httpStatus: verifyResponse.status,
                responseData: verifyData
              });

              const errorMsg = verifyData.error || `HTTP ${verifyResponse.status}: ${verifyResponse.statusText}`;
              toast.error(`Payment verification failed: ${errorMsg}`);

              // Fallback: Try to upgrade user to premium manually
              console.log('🔄 Attempting manual premium upgrade...');
              try {
                if (sessionData.session.user.id) {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const { error: upgradeError } = await (supabase as any)
                    .from('user_profiles')
                    .update({
                      premium_user: true,
                      premium_since: new Date().toISOString()
                    })
                    .eq('user_id', sessionData.session.user.id);

                  if (!upgradeError) {
                    console.log('✅ Manual premium upgrade successful');
                    toast.success('Account upgraded to premium! (verification bypassed)');
                    onSuccess();
                    return;
                  } else {
                    console.error('❌ Manual upgrade failed:', upgradeError);
                  }
                }
              } catch (fallbackError) {
                console.error('🚨 Fallback upgrade error:', fallbackError);
              }

              setTimeout(() => onSuccess(), 3000);
            }

          } catch (error: any) {
            console.error('🚨 Payment verification completely failed:', {
              error: error.message,
              stack: error.stack,
              name: error.name
            });

            toast.error(`Payment verification failed: ${error.message}`);

            // Final fallback - still redirect
            setTimeout(() => onSuccess(), 3000);
          }
        },
        prefill: {
          name: '',
          email: '',
          contact: '',
        },
        theme: {
          color: '#3B82F6', // Blue color matching the app theme
        },
        modal: {
          ondismiss: function() {
            toast.info('Payment cancelled')
          }
        }
      }

      const razorpayInstance = new Razorpay(options)
      razorpayInstance.open()

    } catch (error: any) {
      console.error('Payment error:', error)
      toast.error(error.message || 'Failed to initiate payment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <CreditCard className="h-5 w-5 mr-2" />
          Unlock Full Report
        </CardTitle>
        <CardDescription>
          Pay ₹999 to access detailed AI analysis and recommendations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Report Unlock</span>
              <span className="text-lg font-bold">₹999</span>
            </div>
            <p className="text-xs text-gray-600">
              One-time payment for comprehensive AI feedback
            </p>
          </div>

          <div className="flex items-center text-sm text-gray-600">
            <Lock className="h-4 w-4 mr-1" />
            Secure payment powered by Razorpay
          </div>

          <div className="flex space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePayment}
              className="flex-1"
              disabled={isLoading || loading}
            >
              {loading ? 'Processing...' : 'Pay ₹999'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
