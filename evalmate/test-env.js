// Simple Node.js script to test environment variables
console.log('🔧 Environment Variables Test');
console.log('================================');

const envVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'GROQ_API_KEY',
  'NEXT_PUBLIC_RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL'
];

envVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅ SET' : '❌ NOT SET';
  console.log(`${varName}: ${status}`);
  if (value) {
    if (varName.includes('KEY') || varName.includes('SECRET')) {
      console.log(`  Value starts with: ${value.substring(0, 10)}...`);
    } else {
      console.log(`  Value: ${value}`);
    }
  }
});

console.log('\n📝 Instructions:');
console.log('1. If any variables show "❌ NOT SET", add them to your .env.local file');
console.log('2. Make sure .env.local is in the evalmate/ folder');
console.log('3. Restart the development server after adding variables');
console.log('4. Check that Supabase URL starts with https:// and ends with .supabase.co');
