-- =====================================================
-- CLEAN SCHEMA FOR AI TASK EVALUATION APP
-- DO NOT MODIFY SUPABASE AUTH TABLES/FUNCTIONS
-- =====================================================

-- Enable UUID extension (required for UUID generation)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clean slate - drop our custom tables only
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;
DROP TYPE IF EXISTS evaluation_status CASCADE;

-- =====================================================
-- CREATE CUSTOM TYPES
-- =====================================================

CREATE TYPE evaluation_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- =====================================================
-- CREATE TABLES
-- =====================================================

-- User profiles table (extends Supabase auth.users)
CREATE TABLE user_profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    credits_balance INTEGER DEFAULT 0,
    premium_user BOOLEAN DEFAULT FALSE,
    premium_since TIMESTAMP WITH TIME ZONE
);

-- Tasks table
CREATE TABLE tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    code_content TEXT,
    language TEXT,
    ai_evaluation JSONB,
    evaluation_status evaluation_status DEFAULT 'pending',
    report_unlocked BOOLEAN DEFAULT FALSE
);

-- Payments table
CREATE TABLE payments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    stripe_payment_id TEXT UNIQUE NOT NULL, -- Razorpay payment ID
    amount INTEGER NOT NULL, -- Amount in paisa
    currency TEXT DEFAULT 'inr',
    status payment_status DEFAULT 'pending'
);

-- =====================================================
-- CREATE INDEXES
-- =====================================================

CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_evaluation_status ON tasks(evaluation_status);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_task_id ON payments(task_id);
CREATE INDEX idx_payments_stripe_payment_id ON payments(stripe_payment_id);

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- User profiles policies
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Tasks policies
CREATE POLICY "Users can view their own tasks" ON tasks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tasks" ON tasks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks" ON tasks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks" ON tasks
    FOR DELETE USING (auth.uid() = user_id);

-- Payments policies
CREATE POLICY "Users can view their own payments" ON payments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own payments" ON payments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- FUNCTIONS AND TRIGGERS (SAFE FOR SUPABASE AUTH)
-- =====================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Function to handle user profile creation on signup (SAFE - doesn't interfere with auth)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (user_id, full_name, avatar_url, premium_user)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
        NEW.raw_user_meta_data->>'avatar_url',
        FALSE
    );
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Failed to create user profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile on user signup (SAFE)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at (SAFE - only our tables)
CREATE TRIGGER handle_updated_at_user_profiles
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_updated_at_tasks
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_updated_at_payments
    BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- =====================================================
-- MANUAL PROFILE CREATION (for testing/debugging)
-- =====================================================

-- Function to manually create missing user profiles
CREATE OR REPLACE FUNCTION public.create_missing_profiles()
RETURNS TEXT AS $$
DECLARE
    user_record RECORD;
    profile_count INTEGER := 0;
BEGIN
    -- Loop through all users in auth.users
    FOR user_record IN SELECT id, raw_user_meta_data FROM auth.users LOOP
        -- Check if profile exists
        IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE user_id = user_record.id) THEN
            -- Create profile
            INSERT INTO user_profiles (user_id, full_name, avatar_url, premium_user)
            VALUES (
                user_record.id,
                COALESCE(user_record.raw_user_meta_data->>'full_name', user_record.raw_user_meta_data->>'name', ''),
                user_record.raw_user_meta_data->>'avatar_url',
                FALSE
            );
            profile_count := profile_count + 1;
        END IF;
    END LOOP;

    RETURN 'Created ' || profile_count || ' missing user profiles';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
