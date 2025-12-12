#!/bin/bash

echo "🚀 Deploying Supabase Edge Functions..."

# Deploy evaluate-task function
echo "📤 Deploying evaluate-task function..."
supabase functions deploy evaluate-task

# Deploy create-razorpay-order function
echo "📤 Deploying create-razorpay-order function..."
supabase functions deploy create-razorpay-order

# Deploy razorpay-webhook function
echo "📤 Deploying razorpay-webhook function..."
supabase functions deploy razorpay-webhook

echo "✅ All functions deployed successfully!"
echo ""
echo "🔧 Next steps:"
echo "1. Set environment variables in Supabase Dashboard:"
echo "   - Go to Project Settings → Edge Functions"
echo "   - Add: GROQ_API_KEY, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET"
echo ""
echo "2. Test the application!"
