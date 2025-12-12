// Razorpay configuration
export const RAZORPAY_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_placeholder'
export const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret'

export const REPORT_PRICE = 99900 // ₹999 in paisa (Indian currency)

export interface PaymentIntent {
  id: string
  client_secret: string
  amount: number
  currency: string
}
