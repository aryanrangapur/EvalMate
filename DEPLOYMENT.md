# EvalMate Production Deployment Guide

Complete guide to deploy EvalMate to production using Vercel, Supabase, and Razorpay.

---

## Table of Contents
1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Supabase Configuration](#supabase-configuration)
3. [Razorpay Configuration](#razorpay-configuration)
4. [Vercel Deployment](#vercel-deployment)
5. [Post-Deployment Testing](#post-deployment-testing)
6. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

### ✅ Before You Start

- [ ] Ensure you have a GitHub account
- [ ] Ensure you have a Vercel account (free tier is fine)
- [ ] Your Supabase project is ready
- [ ] You have a Razorpay account (test or live)
- [ ] Your code is committed to GitHub
- [ ] All environment variables are documented

---

## 1. Supabase Configuration

### Step 1.1: Set Up Production Database

#### Execute Database Schema
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy the contents of `evalmate/supabase-schema.sql`
6. Paste and click **Run**

**Important**: This will create all necessary tables, RLS policies, and triggers.

#### Verify Tables Created
Navigate to **Table Editor** and confirm you see:
- `user_profiles`
- `tasks`
- `payments`

### Step 1.2: Deploy Supabase Edge Functions

#### Install Supabase CLI
```bash
# Install via npm
npm install -g supabase

# Verify installation
supabase --version
```

#### Login to Supabase
```bash
supabase login
```
This will open a browser for authentication.

#### Link Your Project
```bash
cd evalmate
supabase link --project-ref YOUR_PROJECT_REF
```

**Find your project ref**:
- Go to Supabase Dashboard → Project Settings → General
- Copy the "Reference ID"

#### Deploy Edge Functions
```bash
# Deploy all functions
supabase functions deploy evaluate-task
supabase functions deploy create-razorpay-order
supabase functions deploy verify-razorpay-payment
supabase functions deploy razorpay-webhook
```

#### Set Environment Variables for Edge Functions
```bash
# Set GROQ API key
supabase secrets set GROQ_API_KEY=your_groq_api_key_here

# Set Razorpay keys (use LIVE keys for production)
supabase secrets set RAZORPAY_KEY_ID=your_razorpay_key_id
supabase secrets set RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Verify secrets are set
supabase secrets list
```

### Step 1.3: Configure Authentication Settings

1. Go to **Authentication** → **Providers** in Supabase Dashboard
2. Enable **Email** provider
3. Configure email templates (optional but recommended):
   - **Confirm signup**: Customize the email template
   - **Reset password**: Customize the email template

4. Go to **Authentication** → **URL Configuration**
   - Set **Site URL**: `https://your-domain.vercel.app`
   - Add **Redirect URLs**:
     - `https://your-domain.vercel.app/auth/callback`
     - `http://localhost:3000/auth/callback` (for local testing)

5. Go to **Authentication** → **Email Auth**
   - **Disable** "Confirm email" if you want users to login immediately (recommended for MVP)
   - **OR** keep it enabled for production security

### Step 1.4: Get Supabase Credentials

You'll need these for Vercel:

1. **NEXT_PUBLIC_SUPABASE_URL**
   - Dashboard → Project Settings → API
   - Copy "Project URL"

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - Dashboard → Project Settings → API
   - Copy "anon public" key

3. **SUPABASE_SERVICE_ROLE_KEY**
   - Dashboard → Project Settings → API
   - Copy "service_role" key (⚠️ **Keep this secret!**)

---

## 2. Razorpay Configuration

### Step 2.1: Create Razorpay Account

1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Sign up or login
3. Complete KYC verification (required for live mode)

### Step 2.2: Get API Keys

#### For Testing (Test Mode)
1. In Razorpay Dashboard, ensure you're in **Test Mode** (toggle at top)
2. Go to **Settings** → **API Keys**
3. Click **Generate Test Key**
4. Copy:
   - **Key Id**: `rzp_test_...`
   - **Key Secret**: Click "Show" and copy

#### For Production (Live Mode)
1. Switch to **Live Mode** (toggle at top)
2. Complete KYC if not done
3. Go to **Settings** → **API Keys**
4. Click **Generate Live Key**
5. Copy:
   - **Key Id**: `rzp_live_...`
   - **Key Secret**: Click "Show" and copy

⚠️ **IMPORTANT**:
- Start with TEST mode for initial deployment
- Switch to LIVE mode only after thorough testing

### Step 2.3: Configure Webhook (Important!)

1. In Razorpay Dashboard → **Settings** → **Webhooks**
2. Click **Create New Webhook**
3. Set webhook URL:
   ```
   https://YOUR_SUPABASE_PROJECT_REF.supabase.co/functions/v1/razorpay-webhook
   ```
4. Select events to track:
   - ✅ `payment.captured`
   - ✅ `payment.failed`
5. Set **Secret**: Use a strong random string (save this!)
6. Click **Create Webhook**

**Get your Supabase Function URL**:
- Format: `https://<project-ref>.supabase.co/functions/v1/razorpay-webhook`
- Find project-ref in Supabase Dashboard → Project Settings

### Step 2.4: Set Webhook Secret in Supabase

```bash
supabase secrets set RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here
```

---

## 3. Vercel Deployment

### Step 3.1: Push Code to GitHub

```bash
# Initialize git if not already done
cd /path/to/EvalMate
git init

# Add all files
git add .

# Commit
git commit -m "Production deployment ready"

# Create repository on GitHub (https://github.com/new)
# Then link and push:
git remote add origin https://github.com/YOUR_USERNAME/evalmate.git
git branch -M main
git push -u origin main
```

### Step 3.2: Import Project to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New** → **Project**
3. Click **Import Git Repository**
4. Select your GitHub repository (`evalmate`)
5. Vercel will auto-detect Next.js

### Step 3.3: Configure Project Settings

#### Root Directory
- Set **Root Directory**: `evalmate`
- This is important since your Next.js app is in the `evalmate` folder

#### Framework Preset
- Should auto-detect as **Next.js**
- Leave as default

### Step 3.4: Add Environment Variables

Click **Environment Variables** and add:

```env
# ========================================
# SUPABASE CONFIGURATION
# ========================================
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# ========================================
# GROQ AI CONFIGURATION
# ========================================
GROQ_API_KEY=your_groq_api_key_here

# ========================================
# RAZORPAY CONFIGURATION
# ========================================
# Use TEST keys initially, switch to LIVE after testing
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_or_live_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# ========================================
# NEXT.JS CONFIGURATION
# ========================================
NEXTAUTH_SECRET=generate_random_32_char_string
NEXTAUTH_URL=https://your-app-name.vercel.app
```

**Generate NEXTAUTH_SECRET**:
```bash
# Use this command to generate a secure random string
openssl rand -base64 32
```

**Important**:
- Set these for **Production** environment
- You can also set for **Preview** and **Development** if needed

### Step 3.5: Deploy

1. Click **Deploy**
2. Wait for build to complete (2-5 minutes)
3. Vercel will provide a URL: `https://your-app-name.vercel.app`

---

## 4. Post-Deployment Configuration

### Step 4.1: Update Supabase URLs

1. Go back to **Supabase Dashboard**
2. **Authentication** → **URL Configuration**
3. Update **Site URL** to your Vercel URL:
   ```
   https://your-app-name.vercel.app
   ```
4. Add to **Redirect URLs**:
   ```
   https://your-app-name.vercel.app/auth/callback
   ```

### Step 4.2: Update NEXTAUTH_URL in Vercel

If you didn't set it earlier or need to update:

1. Go to **Vercel Dashboard** → Your Project
2. **Settings** → **Environment Variables**
3. Find `NEXTAUTH_URL`
4. Update to your actual deployment URL:
   ```
   https://your-app-name.vercel.app
   ```
5. **Redeploy** for changes to take effect

### Step 4.3: Verify Edge Functions

Test each edge function:

```bash
# Test evaluate-task
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/evaluate-task \
  -H 'Content-Type: application/json' \
  -d '{"taskId": "test-id"}'

# Should return error if task doesn't exist (that's expected)
```

---

## 5. Post-Deployment Testing

### Test Checklist

#### ✅ Authentication
- [ ] Sign up with a new email
- [ ] Login with credentials
- [ ] Logout
- [ ] Password reset (if email enabled)

#### ✅ Task Management
- [ ] Create a new task
- [ ] View task details
- [ ] Start AI evaluation
- [ ] Check evaluation completes successfully
- [ ] Delete a task

#### ✅ Payment Flow (Test Mode)
- [ ] Click "Upgrade to Premium" on a task
- [ ] Razorpay modal opens
- [ ] Complete test payment using test card:
  ```
  Card: 4111 1111 1111 1111
  CVV: Any 3 digits
  Expiry: Any future date
  ```
- [ ] Payment success redirects correctly
- [ ] Premium status is updated
- [ ] Full report is unlocked

#### ✅ Premium Features
- [ ] Premium insights are visible after payment
- [ ] Corrected code is shown
- [ ] Learning path is displayed
- [ ] Benchmarks are visible

#### ✅ Profile Page
- [ ] Profile page loads correctly
- [ ] Can edit name and avatar
- [ ] Stats are accurate
- [ ] Premium badge shows (if premium)

---

## 6. Switching to Production Mode

### When to Switch
- ✅ All tests pass in test mode
- ✅ You've completed multiple test transactions
- ✅ UI/UX is finalized
- ✅ No critical bugs

### Step 6.1: Activate Razorpay Live Mode

1. Complete KYC in Razorpay Dashboard
2. Wait for approval (1-2 business days)
3. Generate **Live API Keys**
4. Update webhook for live mode

### Step 6.2: Update Environment Variables

In Vercel:
1. Go to **Environment Variables**
2. Update Razorpay keys to LIVE:
   ```
   NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_...
   RAZORPAY_KEY_SECRET=your_live_secret
   ```
3. **Redeploy** application

### Step 6.3: Update Supabase Secrets

```bash
supabase secrets set RAZORPAY_KEY_ID=rzp_live_...
supabase secrets set RAZORPAY_KEY_SECRET=your_live_secret
```

### Step 6.4: Test Live Payment

1. Make a REAL payment (₹1-10 for testing)
2. Verify it appears in Razorpay Dashboard
3. Verify webhook triggers correctly
4. Verify premium upgrade works

---

## 7. Domain Configuration (Optional)

### Add Custom Domain

1. In Vercel Dashboard → **Settings** → **Domains**
2. Add your custom domain: `evalmate.com`
3. Update DNS records:
   - **Type**: CNAME
   - **Name**: www
   - **Value**: cname.vercel-dns.com

4. Update URLs in:
   - Supabase Authentication URLs
   - `NEXTAUTH_URL` environment variable
   - Razorpay webhook URL

---

## 8. Monitoring & Maintenance

### Set Up Monitoring

#### Vercel Analytics
1. Enable in Vercel Dashboard → **Analytics**
2. Monitor page views, performance, errors

#### Supabase Monitoring
1. Dashboard → **Reports**
2. Check database usage, API requests
3. Monitor edge function logs

#### Error Tracking
Consider adding:
- **Sentry** for error tracking
- **LogRocket** for session replay
- **PostHog** for product analytics

### Regular Maintenance

#### Weekly
- [ ] Check Supabase logs for errors
- [ ] Review Razorpay transactions
- [ ] Check Vercel deployment health

#### Monthly
- [ ] Review database usage (upgrade plan if needed)
- [ ] Check API rate limits
- [ ] Update dependencies:
  ```bash
  npm update
  npm audit fix
  ```

---

## 9. Troubleshooting

### Common Issues

#### Issue: "Authentication redirect error"
**Solution**:
- Check Supabase Authentication → URL Configuration
- Ensure redirect URLs include your Vercel domain
- Clear browser cookies and try again

#### Issue: "Payment not completing"
**Solution**:
- Check Razorpay webhook is configured correctly
- Verify edge function URL is accessible
- Check Supabase function logs for errors
- Ensure RAZORPAY_KEY_SECRET matches in Supabase and Vercel

#### Issue: "AI Evaluation failing"
**Solution**:
- Check GROQ_API_KEY is set in Supabase secrets
- Verify edge function `evaluate-task` is deployed
- Check Supabase function logs
- Ensure you haven't hit Groq API rate limits

#### Issue: "Environment variables not working"
**Solution**:
- After changing env vars, **REDEPLOY** in Vercel
- Check env vars are set for correct environment (Production/Preview)
- Verify no typos in variable names

#### Issue: "Database RLS policy errors"
**Solution**:
- Ensure RLS policies are created in Supabase
- Check user is authenticated
- Verify user_id matches in queries

---

## 10. Backup & Recovery

### Database Backups

Supabase automatically backs up your database. To manually export:

1. Supabase Dashboard → **Database** → **Backups**
2. Click **Create Backup**
3. Download when ready

### Code Backup

```bash
# Tag production releases
git tag -a v1.0.0 -m "Production release v1.0.0"
git push origin v1.0.0
```

---

## 11. Cost Estimation

### Free Tier Limits

**Vercel Free**:
- Unlimited deployments
- 100GB bandwidth/month
- Serverless functions: 100GB-hours

**Supabase Free**:
- 500MB database
- 1GB file storage
- 2GB bandwidth
- 500K Edge Function invocations

**Groq**:
- Check current free tier limits
- Monitor usage

**Razorpay**:
- 2% + GST transaction fee
- No setup fees

### When to Upgrade

Upgrade when you exceed:
- Database size > 500MB
- API requests > 500K/month
- Users > 1000 active/month

---

## 12. Security Checklist

Before going live:

- [ ] All environment variables use production values
- [ ] SUPABASE_SERVICE_ROLE_KEY is kept secret (never exposed to client)
- [ ] RLS policies are enabled on all tables
- [ ] Webhook secrets are strong and unique
- [ ] HTTPS is enforced (Vercel does this automatically)
- [ ] Email verification is enabled (optional but recommended)
- [ ] Rate limiting is considered for API routes
- [ ] Input validation is in place
- [ ] SQL injection prevention via Supabase client
- [ ] XSS prevention via React (automatic)

---

## 13. Final Deployment Command Reference

### Quick Deploy Checklist

```bash
# 1. Deploy Edge Functions
supabase functions deploy evaluate-task
supabase functions deploy create-razorpay-order
supabase functions deploy verify-razorpay-payment
supabase functions deploy razorpay-webhook

# 2. Set Supabase Secrets
supabase secrets set GROQ_API_KEY=xxx
supabase secrets set RAZORPAY_KEY_ID=xxx
supabase secrets set RAZORPAY_KEY_SECRET=xxx
supabase secrets set RAZORPAY_WEBHOOK_SECRET=xxx

# 3. Git Push
git add .
git commit -m "Production ready"
git push origin main

# 4. Vercel will auto-deploy
# Monitor at: https://vercel.com/dashboard
```

---

## Support & Resources

- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Razorpay Docs**: https://razorpay.com/docs
- **Next.js Docs**: https://nextjs.org/docs

---

**🎉 Congratulations! Your EvalMate app should now be live!**

Access it at: `https://your-app-name.vercel.app`

---

## Quick Reference URLs

Replace `YOUR_PROJECT_REF` with your actual Supabase project reference:

- **Supabase Dashboard**: https://supabase.com/dashboard
- **Edge Functions URL**: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/`
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Razorpay Dashboard**: https://dashboard.razorpay.com/

---

**Last Updated**: December 2025
**Version**: 1.0.0
