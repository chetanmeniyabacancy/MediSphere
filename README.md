# Hackathon 2026

Minimal Next.js 14 app (App Router) with Supabase: list products and add test records.

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project

## 1. Create the `products` table in Supabase

In the Supabase Dashboard, open **SQL Editor** and run:

```sql
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- Optional: allow anonymous read/write for testing (tighten in production)
alter table products enable row level security;

create policy "Allow all for products"
  on products for all
  using (true)
  with check (true);
```

## 2. Environment variables

Copy the example file and fill in your Supabase values:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

- **NEXT_PUBLIC_SUPABASE_URL** – Supabase project URL  
  **Dashboard → Project Settings → API → Project URL**
- **NEXT_PUBLIC_SUPABASE_ANON_KEY** – Supabase anon (public) key  
  **Dashboard → Project Settings → API → Project API keys → anon public**

Example:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

For **Vercel**: add the same variables in **Project → Settings → Environment Variables** (or in the deploy flow as in the Build & Output settings screen).

## 3. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## 4. Test the Supabase connection

1. **UI**: On the home page you should see either:
   - “No products yet” and no error, or  
   - A list of products  
   If you see “Error loading products: …”, check `.env.local` and that the `products` table and RLS policy exist.

2. **Add a row**: Click **Add Test Product**. A new row should appear in the list. That confirms both read and write work.

3. **Supabase Dashboard**: In **Table Editor → products** you should see the same rows.

## Deploy on Vercel

1. Push the repo to GitHub and import the project in Vercel.
2. Add **NEXT_PUBLIC_SUPABASE_URL** and **NEXT_PUBLIC_SUPABASE_ANON_KEY** in Vercel (Settings → Environment Variables or during deploy).
3. Deploy. Build command: `npm run build`. Output: default Next.js (no override needed).

## Tech stack

- Next.js 14 (App Router)
- TypeScript
- Supabase (`@supabase/supabase-js`)
