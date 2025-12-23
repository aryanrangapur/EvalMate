# EvalMate

An AI-powered SaaS platform that provides instant, comprehensive feedback on coding tasks. Submit your code assignments and receive detailed AI-generated evaluations including scores, strengths, weaknesses, and actionable improvement suggestions.

## Features

### Core Functionality
- **AI-Powered Code Evaluation**: Leverages Groq's Llama 3 8B model for intelligent code analysis
- **Instant Feedback**: Get detailed evaluations within seconds of submission
- **Multi-Language Support**: Supports 19+ programming languages including JavaScript, Python, Java, C++, Go, Rust, and more
- **Comprehensive Reports**: Detailed breakdown with:
  - Quality scores (1-10 scale)
  - Identified strengths
  - Areas for improvement
  - Specific actionable suggestions
  - Best practices feedback

### User Experience
- **Secure Authentication**: Email/password authentication via Supabase Auth
- **User Dashboard**: Track all submissions with real-time status updates
- **Task Management**: Create, view, and delete coding tasks
- **Payment Integration**: Premium reports unlocked via Razorpay (₹999/report)
- **Profile Management**: User avatars, premium status, and account management
- **Responsive Design**: Modern UI with dark/light theme support

### Security & Performance
- **Row Level Security (RLS)**: Database-level access control
- **Encrypted Storage**: Secure code and evaluation storage
- **Fast AI Processing**: 30-second maximum evaluation time
- **Real-time Updates**: Live task status tracking
- **Error Handling**: Graceful degradation and comprehensive error management


### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/EvalMate.git
cd EvalMate/evalmate
```

2. Install dependencies:
```bash
npm install
```


3. Set up the Supabase database:

Execute the SQL schema in your Supabase project (found in `supabase-schema.sql`):
- Creates tables: `user_profiles`, `tasks`, `payments`
- Sets up Row Level Security policies
- Creates necessary indexes and triggers

4. Deploy Supabase Edge Functions

5. Start the development server:
```bash
npm run dev
```


## Project Structure

```
evalmate/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── api/                      # API routes
│   │   │   └── tasks/create/         # Task creation endpoint
│   │   ├── auth/                     # Authentication pages
│   │   │   ├── login/                # Login page
│   │   │   ├── signup/               # Signup page
│   │   │   └── callback/             # OAuth callback
│   │   ├── dashboard/                # Protected dashboard
│   │   │   ├── page.tsx              # Dashboard home
│   │   │   └── tasks/                # Task management
│   │   │       ├── page.tsx          # All tasks list
│   │   │       ├── new/              # Create new task
│   │   │       └── [id]/             # Task detail & unlock
│   │   ├── layout.tsx                # Root layout with providers
│   │   └── page.tsx                  # Landing page
│   │
│   ├── components/                   # React components
│   │   ├── ui/                       # ShadCN UI components
│   │   ├── Navigation.tsx            # App navigation
│   │   ├── PaymentForm.tsx           # Razorpay integration
│   │   └── RazorpayProvider.tsx      # Payment provider
│   │
│   ├── contexts/                     # React Context
│   │   └── AuthContext.tsx           # Authentication state
│   │
│   ├── lib/                          # Utility libraries
│   │   ├── supabase.ts               # Supabase client
│   │   ├── ai.ts                     # Groq AI integration
│   │   ├── razorpay.ts               # Payment config
│   │   └── utils.ts                  # Helper functions
│   │
│   └── types/
│       └── supabase.ts               # Database types
│
├── supabase/
│   └── functions/                    # Edge Functions (Deno)
│       ├── evaluate-task/            # AI evaluation
│       ├── create-razorpay-order/    # Create payment order
│       ├── verify-razorpay-payment/  # Verify payment
│       └── razorpay-webhook/         # Payment webhook
│
├── public/                           # Static assets
├── package.json                      # Dependencies
├── next.config.ts                    # Next.js config
├── tailwind.config.ts                # Tailwind config
└── tsconfig.json                     # TypeScript config
```






## License

This project is private and proprietary. All rights reserved.




---

Built with by Aryan Rangapur | © 2025 EvalMate


