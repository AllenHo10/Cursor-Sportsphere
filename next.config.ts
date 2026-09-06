import type { NextConfig } from "next";

const requiredPublicEnv = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

for (const name of requiredPublicEnv) {
  if (!process.env[name]) {
    throw new Error(
      `Missing ${name}. Add it to .env.local for local builds, or set it in Vercel → Settings → Environment Variables before deploying.`
    );
  }
}

const nextConfig: NextConfig = {};

export default nextConfig;
