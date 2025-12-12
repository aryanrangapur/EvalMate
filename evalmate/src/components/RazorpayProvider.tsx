'use client'

import { ReactNode } from 'react'

interface RazorpayProviderProps {
  children: ReactNode
}

export function RazorpayProvider({ children }: RazorpayProviderProps) {
  // Razorpay provider is handled by the useRazorpay hook
  // This component ensures Razorpay is loaded when needed
  return <>{children}</>
}
