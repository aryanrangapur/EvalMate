import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ['@supabase/supabase-js'],
  turbopack: {},
  // Exclude Supabase Edge Functions from Next.js build
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'https://deno.land/std@0.168.0/http/server.ts': 'commonjs https://deno.land/std@0.168.0/http/server.ts',
        'https://esm.sh/razorpay@2.9.2': 'commonjs https://esm.sh/razorpay@2.9.2',
      });
    }
    return config;
  },
};

export default nextConfig;
