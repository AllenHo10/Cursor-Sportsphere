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

   Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from **Supabase → Project Settings → API**. To send email team invites, also set `SUPABASE_SERVICE_ROLE_KEY` (the `service_role` secret). Do not prefix it with `NEXT_PUBLIC_`.

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
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → `service_role` secret | Server-only: sending team invite emails via Supabase Auth |

Do not expose a `service_role` key to the browser. Never prefix it with `NEXT_PUBLIC_`. Row Level Security still applies to the anon client; the service role is used only to send Auth invite emails.

A production or Vercel build **fails** if either public variable is missing. Add `SUPABASE_SERVICE_ROLE_KEY` as a server-only Vercel env var (Production, Preview, and Development) so captains can email people who do not have an account yet.

## Auth redirects

Unauthenticated requests to `/dashboard`, `/teams`, `/profile`, and `/matches` (and nested routes) are sent to `/login?redirectTo=...`. Signed-in users hitting `/login` or `/signup` are sent to `/dashboard`. If they open `/signup?invite=...` while already signed in, they go through `/auth/confirm` so a matching email invite can be attached, then to `/teams`.

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
3. Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` for **Production**, **Preview**, and **Development**. The service role key must not use the `NEXT_PUBLIC_` prefix.
4. Deploy. Set the public variables **before** the first production build (or redeploy after adding them). `SUPABASE_SERVICE_ROLE_KEY` is server-only and can be added without a rebuild, but invite emails will fail until it is present.
5. In **Supabase → Authentication → URL Configuration**:
   - **Site URL**: `https://your-app.vercel.app` (custom domain if you use one)
   - **Redirect URLs**: include `https://your-app.vercel.app/**`, `https://your-app.vercel.app/auth/confirm`, and, if you use Preview deployments, `https://*-your-team.vercel.app/**`

Auth cookies are set by middleware on the Vercel hostname. After the Site URL is updated, sign in at the production origin and confirm `/dashboard` loads instead of redirecting back to login.
