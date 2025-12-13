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

## Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **React 19.2.1** - UI library
- **TypeScript 5** - Type-safe development
- **Tailwind CSS 4** - Utility-first styling
- **ShadCN UI** - Pre-built accessible components
- **Lucide React** - Icon library
- **Next Themes** - Theme management
- **Sonner** - Toast notifications

### Backend & Database
- **Supabase** - PostgreSQL database with built-in auth
- **Supabase Edge Functions** - Serverless functions (Deno runtime)
- **Row Level Security (RLS)** - Database access policies

### AI & Integrations
- **Groq SDK** - Fast LLM inference API
- **Llama 3 8B** - Code evaluation model
- **Razorpay** - Payment gateway integration

### Development Tools
- **ESLint 9** - Code linting
- **TypeScript Compiler** - Type checking
- **Turbopack** - Fast bundler

## Getting Started

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager
- Supabase account
- Groq API account
- Razorpay account (for payment features)

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

3. Set up environment variables:

Create a `.env.local` file in the `evalmate` directory with the following variables:

```env
# ========================================
# EvalMate Environment Configuration
# ========================================

# ----------------------------------
# SUPABASE CONFIGURATION
# ----------------------------------
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# ----------------------------------
# GROQ AI CONFIGURATION
# ----------------------------------
GROQ_API_KEY=your_groq_api_key

# ----------------------------------
# RAZORPAY PAYMENT CONFIGURATION
# ----------------------------------
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# ----------------------------------
# NEXT.JS CONFIGURATION
# ----------------------------------
NEXTAUTH_SECRET=your_random_secret_key
NEXTAUTH_URL=http://localhost:3000
```

4. Set up the Supabase database:

Execute the SQL schema in your Supabase project (found in `supabase-schema.sql`):
- Creates tables: `user_profiles`, `tasks`, `payments`
- Sets up Row Level Security policies
- Creates necessary indexes and triggers

5. Deploy Supabase Edge Functions:

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Deploy functions
supabase functions deploy evaluate-task
supabase functions deploy create-razorpay-order
supabase functions deploy verify-razorpay-payment
supabase functions deploy razorpay-webhook
```

6. Start the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser.

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

## Database Schema

### Tables

#### user_profiles
Stores extended user information beyond Supabase Auth.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to auth.users |
| full_name | TEXT | User's full name |
| avatar_url | TEXT | Profile picture URL |
| credits_balance | INTEGER | Available credits (default: 0) |
| premium_user | BOOLEAN | Premium status (default: false) |
| premium_since | TIMESTAMP | Premium upgrade timestamp |
| created_at | TIMESTAMP | Account creation time |
| updated_at | TIMESTAMP | Last update time |

#### tasks
Stores coding task submissions and AI evaluations.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to auth.users |
| title | TEXT | Task title (required) |
| description | TEXT | Task description (required) |
| code_content | TEXT | Submitted code |
| language | TEXT | Programming language |
| ai_evaluation | JSONB | AI evaluation results |
| evaluation_status | ENUM | Status: pending/processing/completed/failed |
| report_unlocked | BOOLEAN | Premium report access (default: false) |
| created_at | TIMESTAMP | Submission time |
| updated_at | TIMESTAMP | Last update time |

#### payments
Tracks payment transactions.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to auth.users |
| task_id | UUID | Foreign key to tasks |
| stripe_payment_id | TEXT | Razorpay payment ID |
| amount | INTEGER | Amount in paisa (₹999 = 99900) |
| currency | TEXT | Currency code (default: 'inr') |
| status | ENUM | Status: pending/completed/failed/refunded |
| created_at | TIMESTAMP | Payment creation time |
| updated_at | TIMESTAMP | Last update time |

### Security
All tables use Row Level Security (RLS) to ensure users can only access their own data.

## API Routes

### POST /api/tasks/create
Creates a new coding task submission.

**Request Body:**
```json
{
  "title": "Task title",
  "description": "Task description",
  "code_content": "// Your code here",
  "language": "javascript"
}
```

**Response:**
```json
{
  "id": "uuid",
  "title": "Task title",
  "evaluation_status": "pending"
}
```

## Supabase Edge Functions

### evaluate-task
Evaluates a coding task using Groq AI.

**Endpoint:** POST `/evaluate-task`

**Request:**
```json
{
  "taskId": "uuid"
}
```

**Response:**
```json
{
  "score": 8,
  "strengths": ["Clean code", "Good naming"],
  "improvements": ["Add error handling"],
  "feedback": "Overall well-written code...",
  "suggestions": ["Consider using async/await"]
}
```

### create-razorpay-order
Creates a Razorpay payment order for unlocking premium reports.

**Endpoint:** POST `/create-razorpay-order`

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "taskId": "uuid"
}
```

**Response:**
```json
{
  "orderId": "order_xxx",
  "amount": 99900,
  "currency": "INR"
}
```

### verify-razorpay-payment
Verifies payment and upgrades user to premium.

**Endpoint:** POST `/verify-razorpay-payment`

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "razorpay_payment_id": "pay_xxx",
  "razorpay_order_id": "order_xxx",
  "razorpay_signature": "signature_xxx",
  "task_id": "uuid"
}
```

## Available Scripts

In the `evalmate` directory:

```bash
# Development
npm run dev              # Start development server on http://localhost:3000

# Production
npm run build            # Create production build
npm start                # Start production server

# Quality Checks
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues
npm run type-check       # TypeScript type checking
npm test                 # Run all checks (lint + type-check + build)
```

## Features in Detail

### AI Evaluation System

The AI evaluation system analyzes code submissions using the following criteria:

- **Code Quality**: Readability, organization, naming conventions
- **Best Practices**: Language-specific conventions and patterns
- **Problem Solving**: Approach to solving the given task
- **Error Handling**: Proper error management and edge cases
- **Performance**: Efficiency and optimization
- **Documentation**: Code comments and clarity

**Evaluation Response Structure:**
```typescript
{
  score: number,          // 1-10 quality score
  strengths: string[],    // What was done well
  improvements: string[], // Areas needing work
  feedback: string,       // Overall assessment
  suggestions: string[]   // Specific recommendations
}
```

### Premium Features

- **Report Unlocking**: One-time payment of ₹999 to unlock full detailed reports
- **Account Upgrade**: Payment upgrades user to premium status across all tasks
- **Secure Payments**: Razorpay integration with payment verification
- **Instant Access**: Immediate report access after successful payment

### Supported Programming Languages

JavaScript, Python, Java, C++, C, C#, Go, Rust, TypeScript, Ruby, PHP, Swift, Kotlin, Scala, R, Dart, HTML/CSS, SQL, Shell Script

## Development

### Environment Setup

1. **Supabase Setup**:
   - Create a new Supabase project
   - Run the database schema from `supabase-schema.sql`
   - Get your project URL and anon key from Settings > API
   - Get your service role key (keep this secret!)

2. **Groq API Setup**:
   - Sign up at [groq.com](https://groq.com)
   - Generate an API key
   - Add to `.env.local`

3. **Razorpay Setup**:
   - Create account at [razorpay.com](https://razorpay.com)
   - Get test/live API keys from Dashboard
   - Configure webhook URL for payment confirmations

### Database Migrations

To update the database schema:

1. Make changes to your local Supabase instance
2. Generate migration:
   ```bash
   supabase db diff -f migration_name
   ```
3. Apply migration:
   ```bash
   supabase db push
   ```

### Testing

**Manual Testing Checklist:**
- [ ] User registration and login
- [ ] Task submission with code
- [ ] AI evaluation completion
- [ ] Payment flow (use Razorpay test mode)
- [ ] Premium report access after payment
- [ ] Task deletion
- [ ] Profile management

## Deployment

### Vercel Deployment (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables in project settings
4. Deploy

### Environment Variables for Production

Ensure all environment variables are set in your deployment platform:
- Update `NEXTAUTH_URL` to your production domain
- Use production Razorpay keys
- Use production Supabase credentials

### Edge Functions Deployment

```bash
# Deploy all functions
supabase functions deploy evaluate-task
supabase functions deploy create-razorpay-order
supabase functions deploy verify-razorpay-payment
supabase functions deploy razorpay-webhook

# Set environment variables for edge functions
supabase secrets set GROQ_API_KEY=your_key
supabase secrets set RAZORPAY_KEY_ID=your_key
supabase secrets set RAZORPAY_KEY_SECRET=your_secret
```

## Troubleshooting

### Common Issues

**Issue: Tasks stuck in "pending" status**
- Check if Edge Function `evaluate-task` is deployed
- Verify GROQ_API_KEY is set correctly
- Check Supabase function logs for errors

**Issue: Payment not processing**
- Verify Razorpay keys are correct (test/live mode)
- Check webhook configuration in Razorpay dashboard
- Ensure edge functions have proper CORS headers

**Issue: Authentication errors**
- Verify Supabase URL and anon key
- Check if email confirmation is required
- Ensure RLS policies are correctly set

**Issue: Build failures**
- Run `npm run type-check` to find TypeScript errors
- Clear `.next` directory and rebuild
- Check for missing environment variables

## Security Considerations

- **Never commit `.env.local` or `.env` files**
- **Use Row Level Security (RLS)** for all database access
- **Validate user input** on both client and server
- **Use service role key only in Edge Functions**, never in client code
- **Implement rate limiting** for API endpoints in production
- **Sanitize code submissions** to prevent XSS attacks
- **Use HTTPS** in production

## Performance Optimization

- **Code splitting**: Next.js automatic code splitting
- **Image optimization**: Use Next.js Image component
- **Database indexing**: Indexes on user_id, task_id, created_at
- **Edge Functions**: Fast serverless execution near users
- **Caching**: Implement Redis for frequently accessed data (future enhancement)

## Future Enhancements

- [ ] Real-time collaboration on code submissions
- [ ] Code comparison with best practices
- [ ] Integration with GitHub repositories
- [ ] Support for test case validation
- [ ] Team/organization accounts
- [ ] API access for enterprise users
- [ ] Mobile application (React Native)
- [ ] Code execution and testing sandbox
- [ ] Plagiarism detection
- [ ] Learning path recommendations

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m 'Add some feature'`
4. Push to branch: `git push origin feature/your-feature`
5. Submit a pull request

### Code Style

- Follow existing TypeScript/React patterns
- Use meaningful variable and function names
- Add comments for complex logic
- Run `npm run lint:fix` before committing
- Ensure `npm test` passes

## License

This project is private and proprietary. All rights reserved.

## Support

For issues, questions, or feature requests:
- Create an issue in the GitHub repository
- Contact: your-email@example.com

## Acknowledgments

- **Supabase** - Backend infrastructure
- **Groq** - AI inference API
- **Razorpay** - Payment processing
- **Vercel** - Hosting platform
- **ShadCN UI** - Component library
- **Next.js Team** - Amazing framework

---

Built with by Aryan Rangapur | © 2025 EvalMate
