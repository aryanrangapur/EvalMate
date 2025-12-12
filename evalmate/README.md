# EvalMate - AI Task Evaluator

A full-stack SaaS application that provides AI-powered feedback on coding tasks using Next.js, Supabase, and Groq AI.

## Features

- 🔐 **Authentication**: Email/password signup and login
- 📝 **Task Submission**: Upload coding tasks with descriptions and code
- 🤖 **AI Evaluation**: Groq-powered analysis providing scores and feedback
- 💳 **Payment Integration**: Stripe-powered payment system to unlock full reports
- 📊 **Dashboard**: View task history and evaluation results
- 🎨 **Modern UI**: Built with Next.js, Tailwind CSS, and ShadCN UI

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS, ShadCN UI
- **Backend**: Supabase (Database, Auth, Edge Functions)
- **AI**: Groq API (Llama 3)
- **Payments**: Stripe
- **Deployment**: Vercel/Netlify

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Groq API key
- Stripe account

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd evalmate
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file in the root directory:

   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # Groq AI
   GROQ_API_KEY=your_groq_api_key

   # Stripe
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   STRIPE_SECRET_KEY=your_stripe_secret_key
   STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

   # Next.js
   NEXTAUTH_SECRET=your_nextauth_secret
   NEXTAUTH_URL=http://localhost:3000
   ```

4. **Set up Supabase**

   - Create a new Supabase project
   - Run the SQL schema from `supabase-schema.sql` in the Supabase SQL editor
   - Deploy the Edge Functions:
     ```bash
     supabase functions deploy evaluate-task
     supabase functions deploy create-payment-intent
     supabase functions deploy stripe-webhook
     ```

5. **Configure Stripe**

   - Create products and prices in your Stripe dashboard
   - Set up webhooks pointing to your Supabase Edge Function
   - Update webhook events to include `payment_intent.succeeded`

6. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
evalmate/
├── src/
│   ├── app/                    # Next.js app router
│   │   ├── auth/              # Authentication pages
│   │   ├── dashboard/         # Protected dashboard pages
│   │   └── api/               # API routes
│   ├── components/            # Reusable React components
│   │   ├── ui/               # ShadCN UI components
│   │   └── Navigation.tsx    # Main navigation
│   ├── contexts/             # React contexts
│   ├── lib/                  # Utility functions
│   └── types/                # TypeScript type definitions
├── supabase/
│   └── functions/            # Supabase Edge Functions
└── public/                   # Static assets
```

## Database Schema

The application uses the following main tables:

- `user_profiles`: Extended user information
- `tasks`: User-submitted coding tasks
- `payments`: Payment records for report unlocks

All tables include Row Level Security (RLS) policies.

## API Endpoints

### Supabase Edge Functions

- `evaluate-task`: Processes AI evaluation requests
- `create-payment-intent`: Creates Stripe payment intents
- `stripe-webhook`: Handles Stripe webhook events

## Deployment

### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push

### Manual Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```

## Code Quality

This project demonstrates good coding practices:

- **TypeScript**: Full type safety throughout the application
- **Error Handling**: Comprehensive error handling in all async operations
- **Security**: Input validation, RLS policies, secure payment processing
- **Performance**: React.memo, caching, optimized queries
- **Accessibility**: ARIA labels, semantic HTML, keyboard navigation

## Broken Code Examples

The project includes intentionally broken code examples that were fixed:

- `src/components/BrokenTaskCard.tsx`: Fixed component with proper TypeScript, error handling, and accessibility
- `src/lib/brokenApi.ts`: Fixed API functions with proper error handling, caching, and security
- `src/lib/poorlyWritten.ts`: Refactored complex function into smaller, testable functions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the MIT License.