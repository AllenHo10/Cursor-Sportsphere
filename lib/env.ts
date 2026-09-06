function requirePublicEnv(
  name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  value: string | undefined
): string {
  if (!value) {
    throw new Error(
      `Missing ${name}. Set it in .env.local for local development, or in Vercel → Settings → Environment Variables (Production, Preview, and Development), then redeploy.`
    );
  }

  return value;
}

/**
 * Public Supabase values must be read as static `process.env.NEXT_PUBLIC_*`
 * lookups so Next.js can inline them into client and Edge middleware bundles.
 */
export const supabaseUrl = requirePublicEnv(
  "NEXT_PUBLIC_SUPABASE_URL",
  process.env.NEXT_PUBLIC_SUPABASE_URL
);

export const supabaseAnonKey = requirePublicEnv(
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
