# SportSphere

Volleyball team coordination: profiles, teams, match challenges, and notifications. Built with Next.js 15 (App Router) and Supabase.

## Prerequisites

- Node.js 18.18 or later
- npm
- A [Supabase](https://supabase.com) project
- [Supabase CLI](https://supabase.com/docs/guides/cli) (optional, for applying migrations)

## Local setup

1. Clone the repo and install dependencies:

   ```bash
   npm install
   ```

2. Copy the env template and add your project keys:

   ```bash
   cp .env.example .env.local
   ```

   On Windows PowerShell: `Copy-Item .env.example .env.local`

   Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from **Supabase → Project Settings → API**.

3. Apply database migrations to your Supabase project (from the repo root, after `supabase link`):

   ```bash
   npx supabase db push
   ```

4. Start the app:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Environment variables

These values are **public** (`NEXT_PUBLIC_*`) and are inlined at **build time**. Changing them requires a new build or Vercel redeploy.

| Variable | Where to get it | Used by |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL | Browser client, server client, middleware |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → `anon` / publishable key | Browser client, server client, middleware |

Do not add a `service_role` key to this app or to Vercel. The client only uses the anon key plus Row Level Security.

A production or Vercel build **fails** if either variable is missing.

## Auth redirects

Unauthenticated requests to `/dashboard`, `/teams`, `/profile`, and `/matches` (and nested routes) are sent to `/login?redirectTo=...`. Signed-in users hitting `/login` or `/signup` are sent to `/dashboard`.

Confirm this against a production server:

```bash
npm run build
npm start
```

Then, without a session:

- `/dashboard` → `/login?redirectTo=/dashboard`
- `/teams` → `/login?redirectTo=/teams`
- `/login` and `/signup` stay on those pages

## Deploy on Vercel

1. Push the repo to GitHub and [import it in Vercel](https://vercel.com/new).
2. Framework preset: **Next.js** (auto-detected). Build command `next build`, output as default.
3. Add the same two environment variables for **Production**, **Preview**, and **Development**.
4. Deploy. Because the variables are public, set them **before** the first production build (or redeploy after adding them).
5. In **Supabase → Authentication → URL Configuration**:
   - **Site URL**: `https://your-app.vercel.app` (custom domain if you use one)
   - **Redirect URLs**: include `https://your-app.vercel.app/**` and, if you use Preview deployments, `https://*-your-team.vercel.app/**`

Auth cookies are set by middleware on the Vercel hostname. After the Site URL is updated, sign in at the production origin and confirm `/dashboard` loads instead of redirecting back to login.
